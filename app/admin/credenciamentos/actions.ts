"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";

/** Define até que dia o formulário aceita cadastros (vazio = sem prazo). */
export async function salvarPrazo(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const prazo = String(form.get("prazo") ?? "").trim();
  const apresentacao = String(form.get("apresentacao") ?? "").trim();
  const data = /^\d{4}-\d{2}-\d{2}$/;
  if ((prazo && !data.test(prazo)) || (apresentacao && !data.test(apresentacao))) redirect("/admin/credenciamentos");
  await sql()`update credenciamento_config set prazo = ${prazo || null}, data_apresentacao = ${apresentacao || null} where id = 1`;
  revalidatePath("/credenciamento");
  redirect("/admin/credenciamentos?prazo=1");
}

/** Quantas cidades entram no Circuito (vazio = sem número definido). */
export async function salvarVagas(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const txt = String(form.get("vagas") ?? "").trim();
  const n = Number(txt);
  const vagas = txt && Number.isInteger(n) && n >= 1 && n <= 50 ? n : null;
  await sql()`update credenciamento_config set vagas = ${vagas} where id = 1`;
  revalidatePath("/telao");
  redirect("/admin/credenciamentos?vagas=1");
}

/** Remove um credenciamento: o município volta para a lista do formulário público. */
export async function excluirCredenciamento(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/credenciamentos");
  await sql()`delete from credenciamentos where id = ${id}`;
  revalidatePath("/credenciamento");
  redirect("/admin/credenciamentos?excluido=1");
}
