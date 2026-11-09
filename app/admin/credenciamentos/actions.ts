"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";

/** Remove um credenciamento: o município volta para a lista do formulário público. */
export async function excluirCredenciamento(form: FormData) {
  if (!(await ehAdmin())) redirect("/admin");
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/credenciamentos");
  await sql()`delete from credenciamentos where id = ${id}`;
  revalidatePath("/credenciamento");
  redirect("/admin/credenciamentos?excluido=1");
}
