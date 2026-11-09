/** Questionário: 10 perguntas, cada uma com nota de 1 (muito ruim) a 5 (excelente). A pontuação é a média. */
export const QTD_PERGUNTAS = 10;
export const NOTAS = [1, 2, 3, 4, 5] as const;
export const ROTULO_NOTA: Record<number, string> = { 1: "Muito ruim", 2: "Ruim", 3: "Regular", 4: "Bom", 5: "Excelente" };

/** "4,30" */
export const formatarMedia = (m: number | string | null | undefined) =>
  m === null || m === undefined ? "—" : Number(m).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Separa "Título: pergunta" em duas partes (o texto salvo no banco usa esse formato). */
export function partesPergunta(texto: string) {
  const i = texto.indexOf(": ");
  return i > 0 && i < 80 ? { titulo: texto.slice(0, i), pergunta: texto.slice(i + 2) } : { titulo: "", pergunta: texto };
}
