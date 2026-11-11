/** Fotos disponíveis para as exposições (arquivos em public/exposicoes). */
export const FOTOS = [
  { id: "boi-branco", rotulo: "Boi branco" },
  { id: "ovelha", rotulo: "Ovelha" },
  { id: "boi-vermelho", rotulo: "Boi vermelho" },
  { id: "cavalo", rotulo: "Cavalo" },
  { id: "milho", rotulo: "Plantação" },
  { id: "expo-itapipoca", rotulo: "Logo ExpoITA (Itapipoca)" },
  { id: "expo-brejo-santo", rotulo: "Logo Expo Brejo (Brejo Santo)" },
  { id: "expo-morada-nova", rotulo: "Logo Exponova (Morada Nova)" },
  { id: "expo-quixada", rotulo: "Logo 46ª Expoece (Quixadá)" },
  { id: "expo-crateus", rotulo: "Logo Expo Agro (Crateús)" },
  { id: "expo-crato", rotulo: "Logo Expocrato (Crato)" },
  { id: "expo-expoece", rotulo: "Logo Expoece 70 anos" },
] as const;

export type FotoId = (typeof FOTOS)[number]["id"];

export function ehFoto(x: string): x is FotoId {
  return FOTOS.some((f) => f.id === x);
}
