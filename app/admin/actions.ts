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
        exposicoes_aberta_em = case when ${!cidades} and not exposicoes_aberta then now() else exposicoes_aberta_em end,
        cidades_aberta_em = case when ${cidades} and not cidades_aberta then now() else cidades_aberta_em end,
        exposicoes_abrir_em = case when ${!cidades} then null else exposicoes_abrir_em end,
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

/** "2026-12-12T08:00" digitado no Painel (hora de Fortaleza, UTC-3, sem horário de verão) -> Date. */
function horaFortaleza(v: FormDataEntryValue | null): Date | null | "invalida" {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return "invalida";
  const d = new Date(`${s}:00-03:00`);
  return Number.isNaN(d.getTime()) ? "invalida" : d;
}

/**
 * Programa o horário em que a avaliação das exposições abre e/ou fecha sozinha.
 * Campo vazio = sem horário (abrir ou fechar continua pelo botão).
 */
export async function programarHorarios(form: FormData) {
  await exigirAdmin();
  if (form.get("acao") === "limpar") {
    await sql()`update exposicao_cearense.votacao set exposicoes_abrir_em = null, exposicoes_fechar_em = null where id = 1`;
    revalidatePath("/admin", "layout");
    redirect("/admin/horario?horario=limpo");
  }
  const abrir = horaFortaleza(form.get("abrir"));
  const fechar = horaFortaleza(form.get("fechar"));
  const erro = (m: string) => redirect(`/admin/horario?horario_erro=${encodeURIComponent(m)}`);
  if (abrir === "invalida" || fechar === "invalida") erro("Data ou hora inválida.");
  const a = abrir as Date | null;
  const f = fechar as Date | null;
  const agora = Date.now();
  const [v] = await sql()<{ aberta: boolean }[]>`select exposicoes_aberta aberta from exposicao_cearense.votacao where id = 1`;
  if (f && f.getTime() <= agora) erro("O horário de fechar já passou.");
  if (a && f && f <= a) erro("O horário de fechar precisa ser depois do de abrir.");

  if (v?.aberta) {
    // Já aberta: o início pode ser corrigido para um horário que já passou, ou mudado para o futuro
    // (aí a avaliação fecha agora e abre sozinha no novo horário).
    if (a && a.getTime() > agora) {
      await sql()`
        update exposicao_cearense.votacao
        set exposicoes_aberta = false, exposicoes_fechada_em = now(), aberta = cidades_aberta, fechada_em = now(),
            exposicoes_abrir_em = ${a}, exposicoes_fechar_em = ${f}
        where id = 1`;
    } else {
      await sql()`
        update exposicao_cearense.votacao
        set exposicoes_aberta_em = coalesce(${a}, exposicoes_aberta_em), exposicoes_abrir_em = null, exposicoes_fechar_em = ${f}
        where id = 1`;
    }
  } else {
    if (!a && !f) erro("Preencha o horário de abrir, o de fechar ou os dois.");
    if (a && a.getTime() <= agora - 60_000) erro("O horário de abrir já passou. Para abrir agora, use o botão Liberar avaliação.");
    await sql()`update exposicao_cearense.votacao set exposicoes_abrir_em = ${a}, exposicoes_fechar_em = ${f} where id = 1`;
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/horario?horario=ok");
}

/** Apaga o início e o fim registrados da avaliação das exposições (só quando ela está fechada). */
export async function limparInicioFim() {
  await exigirAdmin();
  await sql()`update exposicao_cearense.votacao set exposicoes_aberta_em = null, exposicoes_fechada_em = null where id = 1 and not exposicoes_aberta`;
  revalidatePath("/admin", "layout");
  redirect("/admin/horario?horario=historico");
}

/** Encerra só a avaliação das exposições (modo=exposicoes) ou só a votação das cidades (modo=cidades). */
export async function encerrarVotacao(form?: FormData) {
  await exigirAdmin();
  const cidades = form?.get("modo") === "cidades";
  await sql()`
    update exposicao_cearense.votacao
    set exposicoes_aberta = exposicoes_aberta and ${cidades},
        exposicoes_fechada_em = case when ${!cidades} then now() else exposicoes_fechada_em end,
        exposicoes_fechar_em = case when ${!cidades} then null else exposicoes_fechar_em end,
        cidades_aberta = cidades_aberta and ${!cidades},
        cidades_fechada_em = case when ${cidades} then now() else cidades_fechada_em end,
        aberta = (exposicoes_aberta and ${cidades}) or (cidades_aberta and ${!cidades}),
        fechada_em = now()
    where id = 1`;
  revalidatePath("/admin");
  revalidatePath("/admin/proximo");
}
