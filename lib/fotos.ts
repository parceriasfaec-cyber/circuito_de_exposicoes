/** Fotos disponíveis para as exposições (arquivos em public/exposicoes). */
export const FOTOS = [
  { id: "boi-branco", rotulo: "Boi branco" },
  { id: "ovelha", rotulo: "Ovelha" },
  { id: "boi-vermelho", rotulo: "Boi vermelho" },
  { id: "cavalo", rotulo: "Cavalo" },
  { id: "milho", rotulo: "Plantação" },
] as const;

export type FotoId = (typeof FOTOS)[number]["id"];

export function ehFoto(x: string): x is FotoId {
  return FOTOS.some((f) => f.id === x);
}
