import { redirect } from "next/navigation";

/** Endereço antigo da avaliação: agora é /avaliar. */
export default async function Antigo({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = new URLSearchParams(await searchParams).toString();
  redirect(`/avaliar${q ? `?${q}` : ""}`);
}
