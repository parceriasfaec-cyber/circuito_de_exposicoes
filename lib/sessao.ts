import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { lerVotacao, sql } from "./db";

const COOKIE_PRODUTOR = "produtor";
const COOKIE_ADMIN = "admin";

function segredo() {
  const s = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET (ou SECRET_KEY) não configurado (mínimo 16 caracteres)");
  return s;
}

function assinar(valor: string) {
  const mac = createHmac("sha256", segredo()).update(valor).digest("base64url");
  return `${valor}.${mac}`;
}

function verificar(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const valor = token.slice(0, i);
  const esperado = Buffer.from(assinar(valor));
  const recebido = Buffer.from(token);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  return valor;
}

const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** Sessão do produtor: vale só para a votação liberada naquele momento (aberta_em). */
export async function iniciarSessaoProdutor(produtorId: string, abertaEm: Date) {
  (await cookies()).set(COOKIE_PRODUTOR, assinar(`${produtorId}|${abertaEm.getTime()}`), { ...base, maxAge: 60 * 60 * 12 });
}

export async function lerSessaoProdutor(): Promise<{ produtorId: string; abertaEm: number } | null> {
  const v = verificar((await cookies()).get(COOKIE_PRODUTOR)?.value);
  if (!v) return null;
  const [produtorId, t] = v.split("|");
  return { produtorId, abertaEm: Number(t) };
}

/** Produtor logado, desde que a votação continue liberada (a mesma liberação do login). */
export async function produtorDaSessao() {
  const s = await lerSessaoProdutor();
  if (!s) return null;
  const v = await lerVotacao();
  if (!v.aberta || !v.aberta_em || v.aberta_em.getTime() !== s.abertaEm) return null;
  return s;
}

export async function encerrarSessaoProdutor() {
  (await cookies()).delete(COOKIE_PRODUTOR);
}

export async function iniciarSessaoAdmin(adminId: string) {
  (await cookies()).set(COOKIE_ADMIN, assinar(`${adminId}|${Date.now()}`), { ...base, maxAge: 60 * 60 * 12 });
}

/** Administrador logado (e ainda ativo no banco), ou null. */
export async function adminLogado(): Promise<{ id: string; nome: string; usuario: string } | null> {
  const v = verificar((await cookies()).get(COOKIE_ADMIN)?.value);
  if (!v) return null;
  const [id, t] = v.split("|");
  if (Date.now() - Number(t) > 12 * 60 * 60 * 1000) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [a] = await sql()<{ id: string; nome: string; usuario: string }[]>`
    select id, nome, usuario from exposicao_cearense.administradores where id = ${id} and ativo`;
  return a ?? null;
}

export async function ehAdmin() {
  return (await adminLogado()) !== null;
}

export async function sairAdmin() {
  (await cookies()).delete(COOKIE_ADMIN);
}
