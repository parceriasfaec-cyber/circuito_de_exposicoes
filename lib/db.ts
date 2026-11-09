import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

function criar() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("DATABASE_URL (ou SUPABASE_DB_URL) não configurada");
  return postgres(url, {
    prepare: false, // necessário no pooler de transação do Supabase
    max: 3,
    idle_timeout: 20,
    connection: { search_path: "exposicao_cearense" },
  });
}

export function sql() {
  if (!globalThis.__sql) globalThis.__sql = criar();
  return globalThis.__sql;
}

export type Votacao = {
  aberta: boolean;
  codigo_do_dia: string | null;
  aberta_em: Date | null;
  fechada_em: Date | null;
  /** Qual votação o código do dia libera: a das exposições ou a das cidades credenciadas. */
  modo: "exposicoes" | "cidades";
};

export async function lerVotacao(): Promise<Votacao> {
  const [v] = await sql()<Votacao[]>`
    select aberta, codigo_do_dia, aberta_em, fechada_em, modo
    from exposicao_cearense.votacao where id = 1`;
  return v ?? { aberta: false, codigo_do_dia: null, aberta_em: null, fechada_em: null, modo: "exposicoes" };
}
