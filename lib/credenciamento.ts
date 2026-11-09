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

/** 12345678901 -> 123.456.789-01 */
export const formatarCpf = (c: string) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
