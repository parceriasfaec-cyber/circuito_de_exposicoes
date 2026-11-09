"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { anoCredenciamento } from "@/lib/credenciamento";
import { ehAdmin } from "@/lib/sessao";

/** Define até que dia o formulário aceita cadastros (vazio = sem prazo). */
export async function salvarPrazo(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const prazo = String(form.get("prazo") ?? "").trim();
  const apresentacao = String(form.get("apresentacao") ?? "").trim();
  const data = /^\d{4}-\d{2}-\d{2}$/;
  if ((prazo && !data.test(prazo)) || (apresentacao && !data.test(apresentacao))) redirect("/admin/proximo/prazos");
  const ano = await anoCredenciamento();
  await sql()`insert into credenciamento_config (ano, prazo, data_apresentacao) values (${ano}, ${prazo || null}, ${apresentacao || null})
             on conflict (ano) do update set prazo = excluded.prazo, data_apresentacao = excluded.data_apresentacao`;
  revalidatePath("/credenciamento");
  redirect("/admin/proximo/prazos?ok=1");
}

/** Quantas cidades entram no Circuito (vazio = sem número definido). */
export async function salvarVagas(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const txt = String(form.get("vagas") ?? "").trim();
  const n = Number(txt);
  const vagas = txt && Number.isInteger(n) && n >= 1 && n <= 50 ? n : null;
  const ano = await anoCredenciamento();
  await sql()`insert into credenciamento_config (ano, vagas) values (${ano}, ${vagas})
             on conflict (ano) do update set vagas = excluded.vagas`;
  revalidatePath("/telao");
  revalidatePath("/admin/proximo");
  redirect("/admin/proximo?vagas=1");
}

/** Remove um credenciamento: o município volta para a lista do formulário público. */
export async function excluirCredenciamento(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/proximo/credenciados");
  await sql()`delete from credenciamentos where id = ${id}`;
  revalidatePath("/credenciamento");
  redirect("/admin/proximo/credenciados?excluido=1");
}

/** Marca se o município fez a apresentação. Só quem apresentou entra na votação das cidades. */
export async function marcarApresentacao(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/proximo/credenciados");
  const apresentou = form.get("apresentou") === "sim";
  await sql()`update credenciamentos set apresentou = ${apresentou} where id = ${id}`;
  revalidatePath("/telao");
  redirect("/admin/proximo/credenciados?marcado=1");
}
