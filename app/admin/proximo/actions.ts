"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { anoCredenciamento, municipiosDisponiveis } from "@/lib/credenciamento";
import { lerDadosCredenciamento } from "@/lib/dadosCredenciamento";
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

/** Marca ou desmarca a apresentação sem recarregar a página (usado pela lista de credenciados). */
export async function definirApresentacao(id: string, apresentou: boolean): Promise<{ ok: boolean }> {
  if (!(await ehAdmin())) return { ok: false };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await sql()`update credenciamentos set apresentou = ${apresentou} where id = ${id}`;
  revalidatePath("/telao");
  revalidatePath("/admin/proximo");
  return { ok: true };
}

/** Desmarca a apresentação de todos os credenciados do ano (botão "Desmarcar todos"). */
export async function desmarcarTodasApresentacoes(): Promise<{ ok: boolean }> {
  if (!(await ehAdmin())) return { ok: false };
  const ano = await anoCredenciamento();
  await sql()`update credenciamentos set apresentou = false where ano = ${ano} and apresentou`;
  revalidatePath("/telao");
  revalidatePath("/admin/proximo");
  return { ok: true };
}

export type EstadoEdicao = { erro?: string };

/** Salva a edição de um credenciado feita pelo organizador (mesmas regras do formulário público, sem olhar o prazo). */
export async function salvarCredenciado(_: EstadoEdicao, form: FormData): Promise<EstadoEdicao> {
  if (!(await ehAdmin())) redirect("/admin");
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { erro: "Credenciamento inválido." };
  const ano = await anoCredenciamento();
  const lido = lerDadosCredenciamento(form, ano);
  if ("erro" in lido) return lido;
  const d = lido.dados;

  const db = sql();
  const [atual] = await db<{ municipio_codigo: number }[]>`select municipio_codigo from credenciamentos where id = ${id} and ano = ${ano}`;
  if (!atual) return { erro: "Este credenciamento não existe mais." };
  // Trocar de município só para um que ainda esteja disponível (ou manter o mesmo).
  if (d.codigo !== atual.municipio_codigo && !(await municipiosDisponiveis(ano)).some((m) => m.codigo === d.codigo)) {
    return { erro: "Este município não está disponível. Escolha outro." };
  }

  try {
    await db`
      update credenciamentos set municipio_codigo = ${d.codigo}, responsavel = ${d.responsavel}, cpf = ${d.cpf},
             email = ${d.email}, telefone = ${d.telefone}, funcao = ${d.funcao}, instituicao = ${d.instituicao},
             periodo1_inicio = ${d.p1i}, periodo1_fim = ${d.p1f}, periodo2_inicio = ${d.p2i}, periodo2_fim = ${d.p2f}
      where id = ${id}`;
  } catch (e) {
    const err = e as { code?: string; constraint_name?: string };
    if (err.code === "23505" && err.constraint_name === "credenciamentos_cpf_ano_uk") {
      return { erro: "Este CPF já está em outro credenciamento. Cada pessoa só pode credenciar um município." };
    }
    if (err.code === "23505") return { erro: "Este município já está credenciado. Escolha outro." };
    console.error(e);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/credenciamento");
  redirect(`/admin/proximo/credenciados/${id}?ok=${Date.now()}`);
}
