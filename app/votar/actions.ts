"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AVISO_SO_PRESENTES, avaliouAlgumaExposicao, lerVotacao, podeAvaliarPorPresenca, sql, type Votacao } from "@/lib/db";
import { encerrarSessaoProdutor, iniciarSessaoProdutor, produtorDaSessao, segredoConfigurado } from "@/lib/sessao";
import { soDigitos } from "@/lib/texto";
import { QTD_PERGUNTAS } from "@/lib/escala";

export type EstadoEntrada = { erro?: string };

const MAX_ERROS = 8; // erros de código por IP
const JANELA_MIN = 15;

async function ipDoCliente() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
}

type Destino = "inicio" | "avaliar" | "votar";
const lerDestino = (form: FormData): Destino => {
  const d = String(form.get("destino") ?? "");
  return d === "avaliar" || d === "votar" ? d : "inicio";
};

/** Confere se a votação do destino está liberada e o limite de IDs errados por IP (evita ficar chutando números). */
async function conferirLiberada(destino: Destino): Promise<{ erro: string } | { votacao: Votacao & { codigo_do_dia: string }; ip: string }> {
  const votacao = await lerVotacao();
  if (destino === "avaliar" && !votacao.exposicoes_aberta) return { erro: "A avaliação das exposições não está liberada agora." };
  if (destino === "votar" && !votacao.cidades_aberta) return { erro: "A votação das cidades não está liberada agora." };
  if (!votacao.aberta || !votacao.codigo_do_dia) return { erro: "A votação não está liberada agora." };
  if (!segredoConfigurado()) return { erro: "O sistema ainda está sendo configurado. Procure a organização." };

  const ip = await ipDoCliente();
  const [{ erros }] = await sql()<{ erros: number }[]>`
    select count(*)::int erros from tentativas_codigo
    where ip = ${ip} and quando > now() - make_interval(mins => ${JANELA_MIN})`;
  if (erros >= MAX_ERROS) return { erro: `Muitas tentativas com ID errado. Espere ${JANELA_MIN} minutos e tente de novo.` };
  // O código do dia continua valendo por dentro: a sessão acaba quando a votação fecha ou o código muda.
  return { votacao: { ...votacao, codigo_do_dia: votacao.codigo_do_dia }, ip };
}

/** Só entra quem está na lista de alguma exposição do ciclo ativo; depois vai para o destino escolhido. */
async function concluirEntrada(produtorId: string, votacao: Votacao & { codigo_do_dia: string }, destino: Destino): Promise<EstadoEntrada> {
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int n from participacoes pa
    join exposicoes e on e.id = pa.exposicao_id
    join ciclos c on c.id = e.ciclo_id and c.ativo
    where pa.produtor_id = ${produtorId}`;
  if (n === 0) return { erro: "Você não está na lista de participantes das exposições deste ano. Procure a organização." };
  if (destino === "avaliar" && !(await podeAvaliarPorPresenca(produtorId, votacao))) return { erro: AVISO_SO_PRESENTES };
  if (destino === "votar" && votacao.cidades_quem === "avaliaram" && !(await avaliouAlgumaExposicao(produtorId))) {
    return { erro: "A votação das cidades é só para quem fez a avaliação de alguma exposição deste ano." };
  }

  await iniciarSessaoProdutor(produtorId, votacao.codigo_do_dia);
  redirect(destino === "avaliar" ? "/avaliar" : destino === "votar" ? "/votar" : "/");
}

/** Entrada só com o ID de 5 números do expositor (entregue pela organização). */
export async function entrar(_: EstadoEntrada, form: FormData): Promise<EstadoEntrada> {
  const destino = lerDestino(form);
  const r = await conferirLiberada(destino);
  if ("erro" in r) return r;

  const codigo = soDigitos(String(form.get("id_expositor") ?? ""));
  if (codigo.length !== 5) return { erro: "Digite o seu ID, com 5 números." };
  const [p] = await sql()<{ id: string }[]>`select id from produtores where codigo = ${codigo}`;
  if (!p) {
    await sql()`insert into tentativas_codigo (ip) values (${r.ip})`;
    return { erro: "ID não encontrado. Confira os 5 números ou procure a organização." };
  }
  return concluirEntrada(p.id, r.votacao, destino);
}

export async function sair() {
  await encerrarSessaoProdutor();
  redirect("/");
}

export type EstadoAvaliacao = { erro?: string };

/**
 * Recebe as notas de TODAS as exposições do produtor de uma vez e grava tudo numa única transação:
 * ou ficam todas avaliadas, ou nenhuma. Assim não existe avaliação pela metade.
 */
export async function avaliarTudo(_: EstadoAvaliacao, form: FormData): Promise<EstadoAvaliacao> {
  const s = await produtorDaSessao();
  if (!s) redirect("/avaliar");
  if (!(await podeAvaliarPorPresenca(s.produtorId, await lerVotacao()))) return { erro: AVISO_SO_PRESENTES };

  const db = sql();
  const pendentes = await db<{ exposicao_id: string }[]>`
    select pa.exposicao_id
    from participacoes pa
    join exposicoes e on e.id = pa.exposicao_id
    join ciclos c on c.id = e.ciclo_id and c.ativo
    left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
    where pa.produtor_id = ${s.produtorId} and a.produtor_id is null`;
  if (pendentes.length === 0) redirect("/avaliar?ja=1");

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
    if (err.code === "23505") redirect("/avaliar?ja=1");
    if (err.message?.includes("fechada")) return { erro: "A avaliação foi encerrada." };
    console.error(e);
    return { erro: "Não foi possível salvar. Nada foi gravado. Tente de novo." };
  }
  redirect("/avaliar?ok=1");
}
