"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { avaliouAlgumaExposicao, lerVotacao, sql, type Votacao } from "@/lib/db";
import { encerrarSessaoProdutor, iniciarSessaoProdutor, produtorDaSessao, segredoConfigurado } from "@/lib/sessao";
import { cnpjValido, cpfValido, soDigitos } from "@/lib/texto";
import { QTD_PERGUNTAS } from "@/lib/escala";

export type EstadoEntrada = { erro?: string };

const MAX_ERROS = 8; // erros de código por IP
const JANELA_MIN = 15;

async function ipDoCliente() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
}

/** Confere se a votação está liberada e o código do dia (com limite de erros por IP). */
async function conferirCodigo(form: FormData): Promise<{ erro: string } | { votacao: Votacao & { aberta_em: Date } }> {
  const votacao = await lerVotacao();
  if (!votacao.aberta || !votacao.aberta_em) return { erro: "A votação não está liberada agora." };
  if (!segredoConfigurado()) return { erro: "O sistema ainda está sendo configurado. Procure a organização." };

  const db = sql();
  const ip = await ipDoCliente();
  const [{ erros }] = await db<{ erros: number }[]>`
    select count(*)::int erros from tentativas_codigo
    where ip = ${ip} and quando > now() - make_interval(mins => ${JANELA_MIN})`;
  if (erros >= MAX_ERROS) return { erro: `Muitas tentativas com código errado. Espere ${JANELA_MIN} minutos e tente de novo.` };

  const codigo = soDigitos(String(form.get("codigo") ?? ""));
  if (codigo.length !== 4) return { erro: "Digite o código do dia, com 4 números, que aparece no telão." };
  if (codigo !== votacao.codigo_do_dia) {
    await db`insert into tentativas_codigo (ip) values (${ip})`;
    return { erro: "Código do dia incorreto. Confira o número que aparece no telão." };
  }
  return { votacao: { ...votacao, aberta_em: votacao.aberta_em } };
}

/** Só entra quem está na lista de alguma exposição do ciclo ativo; depois vai para a votação liberada. */
async function concluirEntrada(produtorId: string, votacao: Votacao & { aberta_em: Date }): Promise<EstadoEntrada> {
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int n from participacoes pa
    join exposicoes e on e.id = pa.exposicao_id
    join ciclos c on c.id = e.ciclo_id and c.ativo
    where pa.produtor_id = ${produtorId}`;
  if (n === 0) return { erro: "Você não está na lista de participantes das exposições deste ano. Procure a organização." };
  if (votacao.modo === "cidades" && votacao.cidades_quem === "avaliaram" && !(await avaliouAlgumaExposicao(produtorId))) {
    return { erro: "A votação das cidades é só para quem fez a avaliação de alguma exposição deste ano." };
  }

  await iniciarSessaoProdutor(produtorId, votacao.aberta_em);
  redirect(votacao.modo === "cidades" ? "/votar/cidades" : "/votar/exposicoes");
}

export async function entrar(_: EstadoEntrada, form: FormData): Promise<EstadoEntrada> {
  const r = await conferirCodigo(form);
  if ("erro" in r) return r;
  const votacao = r.votacao;
  const db = sql();

  const modo = String(form.get("modo") ?? "");
  let produtorId: string | null = null;

  if (modo === "documento") {
    const bruto = String(form.get("documento") ?? "").trim();
    if (!bruto) return { erro: "Digite o seu documento." };
    const dig = soDigitos(bruto);
    let linhas: { id: string }[];
    if (dig.length === 11 && /^[\d.\-\s]+$/.test(bruto)) {
      if (!cpfValido(dig)) return { erro: "Este CPF não é válido. Confira os números." };
      linhas = await db`select id from produtores where tipo_documento = 'CPF' and documento = ${dig}`;
    } else if (dig.length === 14 && /^[\d.\-/\s]+$/.test(bruto)) {
      if (!cnpjValido(dig)) return { erro: "Este CNPJ não é válido. Confira os números." };
      linhas = await db`select id from produtores where tipo_documento = 'CNPJ' and documento = ${dig}`;
    } else {
      linhas = await db`
        select id from produtores
        where tipo_documento = 'OUTRO' and upper(regexp_replace(documento, '\\s', '', 'g')) = upper(regexp_replace(${bruto}, '\\s', '', 'g'))`;
    }
    if (linhas.length !== 1) return { erro: "Não encontramos este documento na lista de participantes. Procure a organização." };
    produtorId = linhas[0].id;
  } else if (modo === "nome") {
    const id = String(form.get("produtor_id") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { erro: "Escolha o seu nome na lista." };
    const linhas = await db<{ id: string }[]>`select id from produtores where id = ${id}`;
    if (linhas.length !== 1) return { erro: "Escolha o seu nome na lista." };
    produtorId = linhas[0].id;
  } else {
    return { erro: "Escolha como quer se identificar." };
  }

  return concluirEntrada(produtorId, votacao);
}

export async function sair() {
  await encerrarSessaoProdutor();
  redirect("/votar");
}

export type EstadoAvaliacao = { erro?: string };

/**
 * Recebe as notas de TODAS as exposições do produtor de uma vez e grava tudo numa única transação:
 * ou ficam todas avaliadas, ou nenhuma. Assim não existe avaliação pela metade.
 */
export async function avaliarTudo(_: EstadoAvaliacao, form: FormData): Promise<EstadoAvaliacao> {
  const s = await produtorDaSessao();
  if (!s) redirect("/votar");

  const db = sql();
  const pendentes = await db<{ exposicao_id: string }[]>`
    select pa.exposicao_id
    from participacoes pa
    join exposicoes e on e.id = pa.exposicao_id
    join ciclos c on c.id = e.ciclo_id and c.ativo
    left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
    where pa.produtor_id = ${s.produtorId} and a.produtor_id is null`;
  if (pendentes.length === 0) redirect("/votar/exposicoes?ja=1");

  const envio: { exposicaoId: string; notas: number[] }[] = [];
  for (const { exposicao_id } of pendentes) {
    const notas: number[] = [];
    for (let i = 1; i <= QTD_PERGUNTAS; i++) {
      const n = Number(form.get(`nota_${exposicao_id}_${i}`));
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return { erro: "Responda todas as perguntas de todas as exposições, com nota de 1 a 5." };
      }
      notas.push(n);
    }
    envio.push({ exposicaoId: exposicao_id, notas });
  }

  try {
    await db.begin(async (tx) => {
      for (const e of envio) {
        await tx`select enviar_avaliacao(${s.produtorId}::uuid, ${e.exposicaoId}::uuid, ${e.notas}::smallint[])`;
      }
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "23505") redirect("/votar/exposicoes?ja=1");
    if (err.message?.includes("fechada")) return { erro: "A votação foi encerrada." };
    console.error(e);
    return { erro: "Não foi possível salvar. Nada foi gravado. Tente de novo." };
  }
  redirect("/votar/exposicoes?ok=1");
}
