"use server";

import { redirect } from "next/navigation";
import { anoCredenciamento } from "@/lib/credenciamento";
import { lerVotacao, motivoSemVotoCidades, sql } from "@/lib/db";
import { produtorDaSessao } from "@/lib/sessao";

export type EstadoVotoCidades = { erro?: string };

const UUID = /^[0-9a-f-]{36}$/i;

export async function votarCidades(_: EstadoVotoCidades, form: FormData): Promise<EstadoVotoCidades> {
  const s = await produtorDaSessao();
  if (!s) redirect("/votar");

  const ids = [...new Set(form.getAll("cidade").map(String))].filter((x) => UUID.test(x));
  if (ids.length !== 2) return { erro: "Escolha exatamente 2 exposições." };
  const votacao = await lerVotacao();
  if (!votacao.cidades_aberta) return { erro: "A votação das exposições foi encerrada." };
  const motivo = await motivoSemVotoCidades(s.produtorId, votacao);
  if (motivo) return { erro: motivo };
  const ano = await anoCredenciamento();

  try {
    await sql()`select votar_cidades(${s.produtorId}::uuid, ${ano}::smallint, ${ids}::uuid[])`;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "23505") redirect("/votar?ja=1");
    if (err.message?.includes("fechada")) return { erro: "A votação das exposições foi encerrada." };
    console.error(e);
    return { erro: "Não foi possível salvar o voto. Nada foi gravado. Tente de novo." };
  }
  redirect("/votar?ok=1");
}
