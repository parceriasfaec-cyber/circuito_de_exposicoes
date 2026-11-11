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
  /** Alguma das duas está aberta (avaliação das exposições ou votação das cidades). */
  aberta: boolean;
  exposicoes_aberta: boolean;
  cidades_aberta: boolean;
  /** Mesmo código para as duas; só muda quando muda a data. */
  codigo_do_dia: string | null;
  /** Última vez que alguma das duas foi liberada (o código do dia vale para essa data). */
  aberta_em: Date | null;
  /** Quando cada uma começou (a última vez que passou de fechada para aberta). */
  exposicoes_aberta_em: Date | null;
  cidades_aberta_em: Date | null;
  /** Programado no Painel: a avaliação das exposições abre / fecha sozinha nestes horários. */
  exposicoes_abrir_em: Date | null;
  exposicoes_fechar_em: Date | null;
  exposicoes_fechada_em: Date | null;
  cidades_fechada_em: Date | null;
  /** Na votação das cidades: todos os produtores ou só quem avaliou alguma exposição do ciclo ativo. */
  cidades_quem: "todos" | "avaliaram";
  /** Avaliação das exposições só para quem teve a presença marcada no evento (ciclo ativo). */
  exposicoes_so_presentes: boolean;
};

export async function lerVotacao(): Promise<Votacao> {
  // Abre ou fecha a avaliação se chegou um horário programado no Painel.
  await sql()`select exposicao_cearense.aplicar_horarios()`;
  const [v] = await sql()<Votacao[]>`
    select (exposicoes_aberta or cidades_aberta) aberta, exposicoes_aberta, cidades_aberta, codigo_do_dia, aberta_em,
           exposicoes_aberta_em, cidades_aberta_em, exposicoes_abrir_em, exposicoes_fechar_em, exposicoes_fechada_em, cidades_fechada_em, cidades_quem, exposicoes_so_presentes
    from exposicao_cearense.votacao where id = 1`;
  return (
    v ?? {
      aberta: false, exposicoes_aberta: false, cidades_aberta: false, codigo_do_dia: null, aberta_em: null,
      exposicoes_aberta_em: null, cidades_aberta_em: null, exposicoes_abrir_em: null, exposicoes_fechar_em: null, exposicoes_fechada_em: null, cidades_fechada_em: null, cidades_quem: "todos", exposicoes_so_presentes: false,
    }
  );
}

/** O expositor teve a presença marcada no evento do ciclo ativo? */
export async function estaPresente(produtorId: string): Promise<boolean> {
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int n from exposicao_cearense.presencas pr
    join exposicao_cearense.ciclos c on c.id = pr.ciclo_id and c.ativo
    where pr.produtor_id = ${produtorId}`;
  return n > 0;
}

/** Pode avaliar as exposições? Sempre, a não ser que o painel exija presença e ela não esteja marcada. */
export async function podeAvaliarPorPresenca(produtorId: string, votacao: Votacao): Promise<boolean> {
  return !votacao.exposicoes_so_presentes || (await estaPresente(produtorId));
}

export const AVISO_SO_PRESENTES = "A avaliação das exposições é só para quem teve a presença marcada no evento. Procure a organização.";

/** O produtor fez a avaliação de pelo menos uma exposição do ciclo ativo? */
export async function avaliouAlgumaExposicao(produtorId: string): Promise<boolean> {
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int n from exposicao_cearense.avaliacoes a
    join exposicao_cearense.exposicoes e on e.id = a.exposicao_id
    join exposicao_cearense.ciclos c on c.id = e.ciclo_id and c.ativo
    where a.produtor_id = ${produtorId}`;
  return n > 0;
}
