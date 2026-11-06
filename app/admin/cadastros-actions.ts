"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { cnpjValido, cpfValido, soDigitos } from "@/lib/texto";

export type EstadoForm = { erro?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim().replace(/\s+/g, " ");

async function exigirAdmin() {
  if (!(await ehAdmin())) redirect("/admin");
}

/* ------------------------------ Exposições ------------------------------ */

export async function salvarExposicao(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const id = texto(form, "id");
  const cicloId = texto(form, "ciclo_id");
  const nome = texto(form, "nome");
  const municipio = texto(form, "municipio");
  const local = texto(form, "local") || null;
  const inicio = texto(form, "data_inicio");
  const fim = texto(form, "data_fim");
  const perguntas = [1, 2, 3, 4, 5].map((i) => texto(form, `pergunta_${i}`));

  if (!nome || !municipio) return { erro: "Preencha o nome e o município." };
  if (!id && !UUID.test(cicloId)) return { erro: "Escolha o ciclo da exposição." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return { erro: "Preencha as datas de início e fim." };
  if (fim < inicio) return { erro: "A data de fim não pode ser antes da data de início." };
  if (id && perguntas.some((p) => !p)) return { erro: "As 5 perguntas precisam ter texto." };

  const db = sql();
  try {
    if (id) {
      if (!UUID.test(id)) return { erro: "Exposição inválida." };
      await db.begin(async (tx) => {
        await tx`update exposicoes set nome = ${nome}, municipio = ${municipio}, local = ${local},
                 data_inicio = ${inicio}, data_fim = ${fim} where id = ${id}`;
        for (let i = 0; i < 5; i++) {
          await tx`update perguntas set texto = ${perguntas[i]} where exposicao_id = ${id} and ordem = ${i + 1}`;
        }
      });
    } else {
      // As 5 perguntas padrão são copiadas pelo próprio banco (gatilho) ao criar a exposição.
      await db`insert into exposicoes (ciclo_id, nome, municipio, local, data_inicio, data_fim)
               values (${cicloId}, ${nome}, ${municipio}, ${local}, ${inicio}, ${fim})`;
    }
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { erro: "Já existe uma exposição com esse nome neste ciclo." };
    console.error(e);
    return { erro: "Não foi possível salvar." };
  }
  revalidatePath("/admin");
  redirect(`/admin/exposicoes?ok=1${UUID.test(cicloId) ? `&ciclo=${cicloId}` : ""}`);
}

export async function excluirExposicao(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  if (!UUID.test(id)) redirect("/admin/exposicoes");
  const db = sql();
  const [{ n }] = await db<{ n: number }[]>`select count(*)::int n from avaliacoes where exposicao_id = ${id}`;
  if (n > 0) redirect(`/admin/exposicoes/${id}?erro=avaliada`);
  await db`delete from exposicoes where id = ${id}`;
  revalidatePath("/admin");
  redirect("/admin/exposicoes?excluida=1");
}

/* ------------------------------ Produtores ------------------------------ */

export async function salvarProdutor(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const id = texto(form, "id");
  const nome = texto(form, "nome");
  const municipio = texto(form, "municipio");
  const atividade = texto(form, "atividade") || null;
  let tipo: string | null = texto(form, "tipo_documento") || null;
  let documento: string | null = texto(form, "documento") || null;
  const exposicoes = form.getAll("exposicoes").map(String).filter((x) => UUID.test(x));
  const cicloProd = texto(form, "ciclo_id");

  if (!nome || !municipio) return { erro: "Preencha o nome completo e o município." };
  if (nome.split(" ").length < 2) return { erro: "Use o nome completo (nome e sobrenome)." };
  if (!tipo) documento = null;
  if (tipo && !documento) return { erro: "Digite o número do documento ou escolha \"Sem documento\"." };
  if (tipo === "CPF") {
    documento = soDigitos(documento!);
    if (!cpfValido(documento)) return { erro: "CPF inválido. Confira os números." };
  } else if (tipo === "CNPJ") {
    documento = soDigitos(documento!);
    if (!cnpjValido(documento)) return { erro: "CNPJ inválido. Confira os números." };
  } else if (tipo && tipo !== "OUTRO") {
    tipo = null;
    documento = null;
  }
  if (!UUID.test(cicloProd)) return { erro: "Ciclo inválido." };

  const db = sql();
  try {
    await db.begin(async (tx) => {
      // Mesmo nome no mesmo município só com documento, para o produtor conseguir se identificar.
      const [{ iguais }] = await tx<{ iguais: number }[]>`
        select count(*)::int iguais from produtores
        where lower(nome) = lower(${nome}) and lower(municipio) = lower(${municipio})
          and id <> coalesce(${id || null}::uuid, '00000000-0000-0000-0000-000000000000')`;
      if (iguais > 0 && !documento) throw new Error("HOMONIMO");

      let produtorId = id;
      if (id) {
        if (!UUID.test(id)) throw new Error("INVALIDO");
        await tx`update produtores set nome = ${nome}, municipio = ${municipio}, atividade = ${atividade},
                 tipo_documento = ${tipo}, documento = ${documento} where id = ${id}`;
      } else {
        const [novo] = await tx<{ id: string }[]>`
          insert into produtores (nome, municipio, atividade, tipo_documento, documento)
          values (${nome}, ${municipio}, ${atividade}, ${tipo}, ${documento}) returning id`;
        produtorId = novo.id;
      }

      // Participações: não deixa tirar uma exposição que já foi avaliada.
      // Só mexe nas exposições do ciclo desta tela; as dos outros anos ficam como estão.
      const avaliadas = await tx<{ exposicao_id: string }[]>`
        select a.exposicao_id from avaliacoes a join exposicoes e on e.id = a.exposicao_id
        where a.produtor_id = ${produtorId} and e.ciclo_id = ${cicloProd}`;
      const travadas = new Set(avaliadas.map((a) => a.exposicao_id));
      const manter = Array.from(new Set([...exposicoes, ...travadas]));
      await tx`delete from participacoes pa using exposicoes e
               where e.id = pa.exposicao_id and e.ciclo_id = ${cicloProd}
                 and pa.produtor_id = ${produtorId} and not (pa.exposicao_id = any(${manter}::uuid[]))`;
      await tx`insert into participacoes (produtor_id, exposicao_id)
               select ${produtorId}::uuid, x from unnest(${manter}::uuid[]) x
               where exists (select 1 from exposicoes e where e.id = x and e.ciclo_id = ${cicloProd})
               on conflict do nothing`;
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.message === "HOMONIMO")
      return { erro: "Já existe um produtor com esse nome nesse município. Informe um documento para diferenciar os dois." };
    if (err.code === "23505") return { erro: "Esse documento já está cadastrado para outro produtor." };
    console.error(e);
    return { erro: "Não foi possível salvar." };
  }
  revalidatePath("/admin");
  redirect(`/admin/produtores?ok=1&ciclo=${cicloProd}`);
}

export async function excluirProdutor(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  if (!UUID.test(id)) redirect("/admin/produtores");
  const db = sql();
  const [{ n }] = await db<{ n: number }[]>`select count(*)::int n from avaliacoes where produtor_id = ${id}`;
  if (n > 0) redirect(`/admin/produtores/${id}?erro=avaliou`);
  await db`delete from produtores where id = ${id}`;
  revalidatePath("/admin");
  redirect("/admin/produtores?excluido=1");
}

/* ------------------------------ Ciclos ------------------------------ */

export async function criarCiclo(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const ano = Number(texto(form, "ano"));
  const copiarDe = texto(form, "copiar_de");
  const ativar = form.get("ativar") === "on";
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return { erro: "Digite um ano válido, por exemplo 2027." };
  if (copiarDe && !UUID.test(copiarDe)) return { erro: "Ciclo de origem inválido." };

  const db = sql();
  let novoId = "";
  try {
    await db.begin(async (tx) => {
      if (ativar) {
        await tx`update ciclos set ativo = false where ativo`;
        await tx`update votacao set aberta = false, fechada_em = now() where id = 1 and aberta`;
      }
      const [c] = await tx<{ id: string }[]>`
        insert into ciclos (ano, nome, ativo) values (${ano}, ${"Circuito " + ano}, ${ativar}) returning id`;
      novoId = c.id;
      if (copiarDe) {
        // Copia as exposições do outro ciclo, com as datas no novo ano. As perguntas padrão entram pelo gatilho.
        await tx`
          insert into exposicoes (ciclo_id, nome, municipio, local, data_inicio, data_fim)
          select ${novoId}::uuid, e.nome, e.municipio, e.local,
                 (e.data_inicio + make_interval(years => ${ano} - extract(year from e.data_inicio)::int))::date,
                 (e.data_fim + make_interval(years => ${ano} - extract(year from e.data_inicio)::int))::date
          from exposicoes e where e.ciclo_id = ${copiarDe}`;
      }
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { erro: `Já existe o ciclo de ${ano}.` };
    console.error(e);
    return { erro: "Não foi possível criar o ciclo." };
  }
  revalidatePath("/admin");
  redirect(`/admin/ciclos?ok=1`);
}

export async function ativarCiclo(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  if (!UUID.test(id)) redirect("/admin/ciclos");
  const db = sql();
  await db.begin(async (tx) => {
    await tx`update ciclos set ativo = false where ativo and id <> ${id}`;
    await tx`update ciclos set ativo = true where id = ${id}`;
    // Ao trocar de ciclo a votação é encerrada; o organizador libera de novo no evento.
    await tx`update votacao set aberta = false, fechada_em = now() where id = 1 and aberta`;
  });
  revalidatePath("/admin");
  redirect("/admin/ciclos?ativado=1");
}
