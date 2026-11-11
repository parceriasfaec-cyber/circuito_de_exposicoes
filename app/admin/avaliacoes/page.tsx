import { redirect } from "next/navigation";

/** "Quem já avaliou" virou parte da tela "Presença e avaliação". Links antigos vão para lá com o filtro equivalente. */
export default async function Avaliacoes({ searchParams }: { searchParams: Promise<{ filtro?: string; ciclo?: string }> }) {
  const { filtro, ciclo } = await searchParams;
  const sp = new URLSearchParams();
  if (ciclo) sp.set("ciclo", ciclo);
  if (filtro === "concluidos") sp.set("aval", "avaliou");
  if (filtro === "pendentes") sp.set("aval", "nao");
  const q = sp.toString();
  redirect(`/admin/presenca${q ? `?${q}` : ""}`);
}
