import { redirect } from "next/navigation";

/** Endereço antigo da votação das cidades: agora é /votar. */
export default async function Antigo({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = new URLSearchParams(await searchParams).toString();
  redirect(`/votar${q ? `?${q}` : ""}`);
}
