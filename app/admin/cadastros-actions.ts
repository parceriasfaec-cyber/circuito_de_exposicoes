"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { ehFoto } from "@/lib/fotos";
import { cnpjValido, cpfValido, nomeProprio, soDigitos } from "@/lib/texto";
import { QTD_PERGUNTAS } from "@/lib/escala";

export type EstadoForm = {
  erro?: string;
  /** Outro produtor com o mesmo nome e município: o formulário oferece juntar os dois cadastros. */
  homonimo?: { id: string; nome: string; municipio: string; exposicoes: string[] };
};

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
  const fotoTxt = texto(form, "foto");
  const foto = ehFoto(fotoTxt) ? fotoTxt : null;
  const nome = texto(form, "nome");
  const municipio = texto(form, "municipio");
  const local = texto(form, "local") || null;
  const responsavel = texto(form, "responsavel") || null;
  const inicio = texto(form, "data_inicio");
  const fim = texto(form, "data_fim");
  const perguntas = Array.from({ length: QTD_PERGUNTAS }, (_, i) => texto(form, `pergunta_${i + 1}`));

  if (!nome || !municipio) return { erro: "Preencha o nome e o município." };
  if (!id && !UUID.test(cicloId)) return { erro: "Escolha o ciclo da exposição." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return { erro: "Preencha as datas de início e fim." };
  if (fim < inicio) return { erro: "A data de fim não pode ser antes da data de início." };
  if (id && perguntas.some((p) => !p)) return { erro: `As ${QTD_PERGUNTAS} perguntas precisam ter texto.` };

  const db = sql();
  let salvaId = id;
  try {
    if (id) {
      if (!UUID.test(id)) return { erro: "Exposição inválida." };
      await db.begin(async (tx) => {
        await tx`update exposicoes set nome = ${nome}, municipio = ${municipio}, local = ${local}, responsavel = ${responsavel}, foto = ${foto},
                 data_inicio = ${inicio}, data_fim = ${fim} where id = ${id}`;
        for (let i = 0; i < QTD_PERGUNTAS; i++) {
          await tx`update perguntas set texto = ${perguntas[i]} where exposicao_id = ${id} and ordem = ${i + 1}`;
        }
      });
    } else {
      // As perguntas padrão são copiadas pelo próprio banco (gatilho) ao criar a exposição.
      const [nova] = await db<{ id: string }[]>`insert into exposicoes (ciclo_id, nome, municipio, local, responsavel, foto, data_inicio, data_fim)
               values (${cicloId}, ${nome}, ${municipio}, ${local}, ${responsavel}, ${foto}, ${inicio}, ${fim}) returning id`;
      salvaId = nova.id;
    }
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { erro: "Já existe uma exposição com esse nome neste ciclo." };
    console.error(e);
    return { erro: "Não foi possível salvar." };
  }
  revalidatePath("/admin");
  // Continua no registro que está sendo editado.
  redirect(`/admin/exposicoes/${salvaId}?ok=${Date.now()}`);
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
  const nome = nomeProprio(texto(form, "nome"));
  const municipio = texto(form, "municipio");
  const empresa = texto(form, "empresa").replace(/\s+/g, " ") || null;
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
  let salvoId = id;
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
        await tx`update produtores set nome = ${nome}, empresa = ${empresa}, municipio = ${municipio}, atividade = ${atividade},
                 tipo_documento = ${tipo}, documento = ${documento} where id = ${id}`;
      } else {
        const [novo] = await tx<{ id: string }[]>`
          insert into produtores (nome, empresa, municipio, atividade, tipo_documento, documento)
          values (${nome}, ${empresa}, ${municipio}, ${atividade}, ${tipo}, ${documento}) returning id`;
        produtorId = novo.id;
        salvoId = novo.id;
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
    if (err.message === "HOMONIMO") {
      const [h] = await db<{ id: string; nome: string; municipio: string; exposicoes: string[] | null }[]>`
        select p.id, p.nome, p.municipio,
               array_remove(array_agg(e.nome order by e.data_inicio), null) exposicoes
        from produtores p
        left join participacoes pa on pa.produtor_id = p.id
        left join exposicoes e on e.id = pa.exposicao_id and e.ciclo_id = ${cicloProd}
        where lower(p.nome) = lower(${nome}) and lower(p.municipio) = lower(${municipio})
          and p.id <> coalesce(${id || null}::uuid, '00000000-0000-0000-0000-000000000000')
        group by p.id limit 1`;
      return {
        erro: "Já existe um produtor com esse nome nesse município. Se for a mesma pessoa, junte os dois cadastros; se não, informe um documento para diferenciar.",
        homonimo: h ? { id: h.id, nome: h.nome, municipio: h.municipio, exposicoes: h.exposicoes ?? [] } : undefined,
      };
    }
    if (err.code === "23505") return { erro: "Esse documento já está cadastrado para outro produtor." };
    console.error(e);
    return { erro: "Não foi possível salvar." };
  }
  revalidatePath("/admin");
  // Continua no registro que está sendo editado.
  redirect(`/admin/produtores/${salvoId}?ok=${Date.now()}&ciclo=${cicloProd}`);
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
        await tx`update votacao set aberta = false, fechada_em = now(), exposicoes_aberta = false, cidades_aberta = false, exposicoes_fechada_em = now(), cidades_fechada_em = now() where id = 1 and (aberta or exposicoes_aberta or cidades_aberta)`;
      }
      const [c] = await tx<{ id: string }[]>`
        insert into ciclos (ano, nome, ativo) values (${ano}, ${"Circuito " + ano}, ${ativar}) returning id`;
      novoId = c.id;
      if (copiarDe) {
        // Copia as exposições do outro ciclo, com as datas no novo ano. As perguntas padrão entram pelo gatilho.
        await tx`
          insert into exposicoes (ciclo_id, nome, municipio, local, responsavel, foto, data_inicio, data_fim)
          select ${novoId}::uuid, e.nome, e.municipio, e.local, e.responsavel, e.foto,
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
    await tx`update votacao set aberta = false, fechada_em = now(), exposicoes_aberta = false, cidades_aberta = false, exposicoes_fechada_em = now(), cidades_fechada_em = now() where id = 1 and (aberta or exposicoes_aberta or cidades_aberta)`;
  });
  revalidatePath("/admin");
  redirect("/admin/ciclos?ativado=1");
}

/* ------------------------------ Perguntas do ciclo ------------------------------ */

export async function salvarPerguntasCiclo(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const cicloId = texto(form, "ciclo_id");
  const perguntas = Array.from({ length: QTD_PERGUNTAS }, (_, i) => texto(form, `pergunta_${i + 1}`));
  if (!UUID.test(cicloId)) return { erro: "Ciclo inválido." };
  if (perguntas.some((p) => p.length < 5)) return { erro: `As ${QTD_PERGUNTAS} perguntas precisam ter texto.` };

  const db = sql();
  await db.begin(async (tx) => {
    for (let i = 0; i < QTD_PERGUNTAS; i++) {
      await tx`update perguntas q set texto = ${perguntas[i]}
               from exposicoes e where e.id = q.exposicao_id and e.ciclo_id = ${cicloId} and q.ordem = ${i + 1}`;
      // vale também para as próximas exposições cadastradas
      await tx`update perguntas_padrao set texto = ${perguntas[i]} where ordem = ${i + 1}`;
    }
  });
  revalidatePath("/admin");
  redirect(`/admin/perguntas?ok=1&ciclo=${cicloId}`);
}

/**
 * Junta dois cadastros da mesma pessoa: as exposições do cadastro "origem" passam para o "destino"
 * (que fica), o documento é aproveitado se o destino não tiver, e a origem é apagada.
 * Não junta se a origem já enviou avaliação (para não mexer em votos).
 */
export async function juntarProdutores(form: FormData) {
  await exigirAdmin();
  const origem = texto(form, "origem");
  const destino = texto(form, "destino");
  if (!UUID.test(origem) || !UUID.test(destino) || origem === destino) redirect("/admin/produtores");
  const db = sql();
  const [{ n }] = await db<{ n: number }[]>`select count(*)::int n from avaliacoes where produtor_id = ${origem}`;
  if (n > 0) redirect(`/admin/produtores/${origem}?erro=juntar-avaliou`);
  await db.begin(async (tx) => {
    const [o] = await tx<{ tipo_documento: string | null; documento: string | null; atividade: string | null; empresa: string | null }[]>`
      select tipo_documento, documento, atividade, empresa from produtores where id = ${origem}`;
    if (!o) return;
    await tx`insert into participacoes (produtor_id, exposicao_id)
             select ${destino}::uuid, exposicao_id from participacoes where produtor_id = ${origem}
             on conflict do nothing`;
    await tx`delete from produtores where id = ${origem}`;
    await tx`update produtores set
               tipo_documento = coalesce(tipo_documento, ${o.tipo_documento}),
               documento = coalesce(documento, ${o.documento}),
               atividade = coalesce(atividade, ${o.atividade}),
               empresa = coalesce(empresa, ${o.empresa})
             where id = ${destino}`;
  });
  revalidatePath("/admin");
  redirect(`/admin/produtores/${destino}?juntado=1`);
}
