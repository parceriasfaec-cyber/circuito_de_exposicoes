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

export type CidadeRanking = { posicao: number; municipio: string; instituicao: string; votos: number };

/** Resultado da votação das cidades: ranking, vagas definidas no painel e quantos produtores já votaram. */
export async function resultadoCidades(ano: number) {
  const db = sql();
  const ranking = await db<CidadeRanking[]>`
    select posicao::int, municipio, instituicao, votos::int from v_ranking_cidades
    where ano = ${ano} order by posicao, municipio`;
  const [c] = await db<{ vagas: number | null; votantes: number }[]>`
    select (select vagas from credenciamento_config where ano = ${ano}) vagas,
           (select count(distinct produtor_id)::int from votos_cidades where ano = ${ano}) votantes`;
  return { ranking, vagas: c?.vagas ?? null, votantes: c?.votantes ?? 0 };
}

/** 12345678901 -> 123.456.789-01 */
export const formatarCpf = (c: string) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

/** 85999999999 -> (85) 99999-9999 */
export const formatarTelefone = (t: string) =>
  t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t;
