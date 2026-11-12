import { cache } from "react";
import { sql } from "./db";
import { normalizar } from "./texto";

/**
 * Ano do Circuito para o qual os municípios estão se credenciando: o ano do ciclo ativo + 1.
 * Ao ativar um novo ciclo em Ciclos (ex.: 2027), o credenciamento passa sozinho para o ano seguinte (2028).
 */
export const anoCredenciamento = cache(async (): Promise<number> => {
  const [c] = await sql()<{ ano: number }[]>`select ano from ciclos where ativo`;
  return (c?.ano ?? Number(new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" }).slice(0, 4))) + 1;
});

export type Municipio = { codigo: number; nome: string };

/**
 * Municípios que ainda podem se credenciar: saem os que já têm exposição no Circuito do ano anterior
 * e os que já se credenciaram para o ano do credenciamento.
 */
export async function municipiosDisponiveis(ano: number): Promise<Municipio[]> {
  const db = sql();
  const todos = await db<Municipio[]>`
    select m.codigo, m.nome from municipios m
    where not exists (
      select 1 from credenciamentos c where c.municipio_codigo = m.codigo and c.ano = ${ano}
    )
    order by m.nome`;
  const jaParticipam = await db<{ municipio: string }[]>`
    select distinct e.municipio from exposicoes e
    join ciclos c on c.id = e.ciclo_id and c.ano = ${ano - 1}`;
  const fora = new Set(jaParticipam.map((p) => normalizar(p.municipio)));
  return todos.filter((m) => !fora.has(normalizar(m.nome)));
}

/** Data de hoje em Fortaleza, no formato 2026-11-09. */
export const hojeFortaleza = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });

/**
 * Prazo definido no painel (ex.: "2026-11-05") e se o formulário ainda aceita cadastros.
 * Aceita até o fim do dia do prazo; sem prazo definido, fica aberto.
 */
export async function lerPrazo(ano: number): Promise<{ prazo: string | null; aberto: boolean; apresentacao: string | null }> {
  const [c] = await sql()<{ prazo: string | null; apresentacao: string | null }[]>`
    select to_char(prazo, 'YYYY-MM-DD') prazo, to_char(data_apresentacao, 'YYYY-MM-DD') apresentacao
    from credenciamento_config where ano = ${ano}`;
  const prazo = c?.prazo ?? null;
  return { prazo, aberto: !prazo || hojeFortaleza() <= prazo, apresentacao: c?.apresentacao ?? null };
}

/** "2026-11-05" -> "05/11" (ou "05/11/2026" com ano) */
export const diaMes = (iso: string, comAno = false) => {
  const [a, m, d] = iso.split("-");
  return comAno ? `${d}/${m}/${a}` : `${d}/${m}`;
};

/**
 * Posição pelos votos; empate nos votos é desfeito pela pontuação de quem votou
 * (cada voto vale 1.0 a 1.9 conforme as exposições do produtor no Circuito: 9 = 1.9 ... 2 = 1.2, 1 = 1.0).
 */
export type CidadeRanking = { credenciamento_id: string; posicao: number; municipio: string; instituicao: string; votos: number; pontos: number };

/** Quem votou em cada município (só no painel). */
export type VotanteCidade = { credenciamento_id: string; codigo: string; nome: string; municipio: string; exposicoes: number; peso: number };

/** Peso do voto de um produtor conforme o número de exposições (mesma regra do banco). */
export const pesoVoto = (exposicoes: number) => (exposicoes <= 1 ? 1 : 1 + exposicoes / 10);

/** Há empate na última vaga? (duas ou mais cidades na mesma posição ocupando a fronteira das vagas) */
export function empateNaVaga(ranking: CidadeRanking[], vagas: number | null) {
  if (!vagas) return false;
  const dentro = ranking.filter((r) => r.votos > 0 && r.posicao <= vagas);
  return dentro.length > vagas;
}

/** Resultado da votação das cidades: ranking, vagas definidas no painel e quantos produtores já votaram. */
export async function resultadoCidades(ano: number) {
  const db = sql();
  const ranking = await db<CidadeRanking[]>`
    select credenciamento_id, posicao::int, municipio, instituicao, votos::int, pontos::float8 pontos from v_ranking_cidades
    where ano = ${ano} order by posicao, municipio`;
  const [c] = await db<{ vagas: number | null; votantes: number }[]>`
    select (select vagas from credenciamento_config where ano = ${ano}) vagas,
           (select count(distinct produtor_id)::int from votos_cidades where ano = ${ano}) votantes`;
  return { ranking, vagas: c?.vagas ?? null, votantes: c?.votantes ?? 0 };
}

/** Lista de quem votou em cada município, com as exposições do produtor no Circuito do ano anterior. */
export async function votantesPorCidade(ano: number): Promise<VotanteCidade[]> {
  const lista = await sql()<Omit<VotanteCidade, "peso">[]>`
    select v.credenciamento_id, p.codigo, p.nome, p.municipio,
           (select count(*)::int from participacoes pa
              join exposicoes e on e.id = pa.exposicao_id
              join ciclos ci on ci.id = e.ciclo_id and ci.ano = ${ano - 1}
            where pa.produtor_id = p.id) exposicoes
    from votos_cidades v join produtores p on p.id = v.produtor_id
    where v.ano = ${ano}
    order by exposicoes desc, p.nome`;
  return lista.map((x) => ({ ...x, peso: pesoVoto(x.exposicoes) }));
}

/** 12345678901 -> 123.456.789-01 */
export const formatarCpf = (c: string | null) => (c ?? "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

/** 85999999999 -> (85) 99999-9999 */
export const formatarTelefone = (t: string) =>
  t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t;
