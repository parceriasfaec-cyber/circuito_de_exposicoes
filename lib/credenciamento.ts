import { sql } from "./db";
import { normalizar } from "./texto";

/** Ano do Circuito para o qual os municípios estão se credenciando. */
export const ANO_CREDENCIAMENTO = 2027;

export type Municipio = { codigo: number; nome: string };

/**
 * Municípios que ainda podem se credenciar: saem os que já têm exposição no Circuito do ano anterior
 * e os que já se credenciaram para o ano do credenciamento.
 */
export async function municipiosDisponiveis(): Promise<Municipio[]> {
  const db = sql();
  const todos = await db<Municipio[]>`
    select m.codigo, m.nome from municipios m
    where not exists (
      select 1 from credenciamentos c where c.municipio_codigo = m.codigo and c.ano = ${ANO_CREDENCIAMENTO}
    )
    order by m.nome`;
  const jaParticipam = await db<{ municipio: string }[]>`
    select distinct e.municipio from exposicoes e
    join ciclos c on c.id = e.ciclo_id and c.ano = ${ANO_CREDENCIAMENTO - 1}`;
  const fora = new Set(jaParticipam.map((p) => normalizar(p.municipio)));
  return todos.filter((m) => !fora.has(normalizar(m.nome)));
}

/** Data de hoje em Fortaleza, no formato 2026-11-09. */
export const hojeFortaleza = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });

/**
 * Prazo definido no painel (ex.: "2026-11-05") e se o formulário ainda aceita cadastros.
 * Aceita até o fim do dia do prazo; sem prazo definido, fica aberto.
 */
export async function lerPrazo(): Promise<{ prazo: string | null; aberto: boolean }> {
  const [c] = await sql()<{ prazo: string | null }[]>`select to_char(prazo, 'YYYY-MM-DD') prazo from credenciamento_config where id = 1`;
  const prazo = c?.prazo ?? null;
  return { prazo, aberto: !prazo || hojeFortaleza() <= prazo };
}

/** "2026-11-05" -> "05/11" (ou "05/11/2026" com ano) */
export const diaMes = (iso: string, comAno = false) => {
  const [a, m, d] = iso.split("-");
  return comAno ? `${d}/${m}/${a}` : `${d}/${m}`;
};

/** 12345678901 -> 123.456.789-01 */
export const formatarCpf = (c: string) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
