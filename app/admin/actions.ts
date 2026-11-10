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
 * Libera a avaliação das exposições (modo=exposicoes) ou a votação das cidades (modo=cidades, com quem=todos|avaliaram).
 * As duas são independentes e podem ficar abertas juntas. O código do dia é o mesmo para as duas e só muda quando
 * muda a data (Fortaleza): liberar de novo no mesmo dia mantém o mesmo código.
 */
export async function liberarVotacao(form?: FormData) {
  await exigirAdmin();
  const cidades = form?.get("modo") === "cidades";
  const quem = form?.get("quem") === "avaliaram" ? "avaliaram" : "todos";
  const novo = String(randomInt(0, 10000)).padStart(4, "0");
  await sql()`
    update exposicao_cearense.votacao
    set codigo_do_dia = case
          when codigo_do_dia ~ '^[0-9]{4}$'
           and (aberta_em at time zone 'America/Fortaleza')::date = (now() at time zone 'America/Fortaleza')::date
          then codigo_do_dia else ${novo} end,
        aberta_em = now(),
        exposicoes_aberta = exposicoes_aberta or ${!cidades},
        cidades_aberta = cidades_aberta or ${cidades},
        cidades_quem = case when ${cidades} then ${quem} else cidades_quem end,
        aberta = true, fechada_em = null
    where id = 1`;
  revalidatePath("/admin");
  revalidatePath("/admin/proximo");
}

/** Muda quem pode votar nas cidades com a votação já aberta, sem mudar o código. Votos já feitos continuam valendo. */
export async function alterarQuemVota(form: FormData) {
  await exigirAdmin();
  const quem = form.get("quem") === "avaliaram" ? "avaliaram" : "todos";
  await sql()`update exposicao_cearense.votacao set cidades_quem = ${quem} where id = 1`;
  revalidatePath("/admin/proximo");
  redirect("/admin/proximo?quem=1");
}

/** Encerra só a avaliação das exposições (modo=exposicoes) ou só a votação das cidades (modo=cidades). */
export async function encerrarVotacao(form?: FormData) {
  await exigirAdmin();
  const cidades = form?.get("modo") === "cidades";
  await sql()`
    update exposicao_cearense.votacao
    set exposicoes_aberta = exposicoes_aberta and ${cidades},
        exposicoes_fechada_em = case when ${!cidades} then now() else exposicoes_fechada_em end,
        cidades_aberta = cidades_aberta and ${!cidades},
        cidades_fechada_em = case when ${cidades} then now() else cidades_fechada_em end,
        aberta = (exposicoes_aberta and ${cidades}) or (cidades_aberta and ${!cidades}),
        fechada_em = now()
    where id = 1`;
  revalidatePath("/admin");
  revalidatePath("/admin/proximo");
}
