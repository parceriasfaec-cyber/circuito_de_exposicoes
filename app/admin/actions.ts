"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { conferirSenha } from "@/lib/senha";
import { ehAdmin, iniciarSessaoAdmin, sairAdmin, segredoConfigurado } from "@/lib/sessao";

export type EstadoLogin = { erro?: string };

// hash qualquer, só para gastar o mesmo tempo quando o usuário não existe
const HASH_FALSO = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

export async function entrarAdmin(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const usuario = String(form.get("usuario") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!usuario || !senha) return { erro: "Digite o usuário e a senha." };
  if (!segredoConfigurado()) {
    return { erro: "O servidor ainda não está configurado: falta a variável SUPABASE_DB_URL no Vercel." };
  }

  const db = sql();
  const [a] = await db<{ id: string; senha_hash: string }[]>`
    select id, senha_hash from exposicao_cearense.administradores
    where lower(usuario) = lower(${usuario}) and ativo`;
  const ok = await conferirSenha(senha, a?.senha_hash ?? HASH_FALSO);
  if (!a || !ok) {
    await new Promise((r) => setTimeout(r, 600));
    return { erro: "Usuário ou senha incorretos." };
  }
  await db`update exposicao_cearense.administradores set ultimo_acesso = now() where id = ${a.id}`;
  await iniciarSessaoAdmin(a.id);
  redirect("/admin");
}

export async function sair() {
  await sairAdmin();
  redirect("/admin");
}

async function exigirAdmin() {
  if (!(await ehAdmin())) redirect("/admin");
}

/**
 * Libera a votação com um código novo. O formulário manda modo=cidades para a votação das cidades credenciadas
 * e quem=avaliaram para deixar votar só quem avaliou alguma exposição.
 */
export async function liberarVotacao(form?: FormData) {
  await exigirAdmin();
  const modo = form?.get("modo") === "cidades" ? "cidades" : "exposicoes";
  const quem = modo === "cidades" && form?.get("quem") === "avaliaram" ? "avaliaram" : "todos";
  const codigo = String(randomInt(0, 10000)).padStart(4, "0");
  await sql()`
    update exposicao_cearense.votacao
    set aberta = true, codigo_do_dia = ${codigo}, aberta_em = now(), fechada_em = null, modo = ${modo}, cidades_quem = ${quem}
    where id = 1`;
  revalidatePath("/admin");
  revalidatePath("/admin/proximo");
}

/** Muda quem pode votar nas cidades com a votação já aberta, sem gerar código novo. Votos já feitos continuam valendo. */
export async function alterarQuemVota(form: FormData) {
  await exigirAdmin();
  const quem = form.get("quem") === "avaliaram" ? "avaliaram" : "todos";
  await sql()`update exposicao_cearense.votacao set cidades_quem = ${quem} where id = 1`;
  revalidatePath("/admin/proximo");
  redirect("/admin/proximo?quem=1");
}

export async function encerrarVotacao() {
  await exigirAdmin();
  await sql()`update exposicao_cearense.votacao set aberta = false, fechada_em = now() where id = 1`;
  revalidatePath("/admin");
  revalidatePath("/admin/proximo");
}
