import { sql } from "./db";

export type Ciclo = { id: string; ano: number; nome: string; ativo: boolean };

export async function listarCiclos(): Promise<Ciclo[]> {
  return sql()<Ciclo[]>`select id, ano, nome, ativo from exposicao_cearense.ciclos order by ano desc`;
}

export async function cicloAtivo(): Promise<Ciclo | null> {
  const [c] = await sql()<Ciclo[]>`select id, ano, nome, ativo from exposicao_cearense.ciclos where ativo`;
  return c ?? null;
}

/** Ciclo escolhido na tela (?ciclo=id). Sem escolha, o ciclo ativo; sem ativo, o mais recente. */
export async function cicloEscolhido(id?: string): Promise<{ ciclo: Ciclo | null; ciclos: Ciclo[] }> {
  const ciclos = await listarCiclos();
  const ciclo =
    (id && ciclos.find((c) => c.id === id)) || ciclos.find((c) => c.ativo) || ciclos[0] || null;
  return { ciclo, ciclos };
}
