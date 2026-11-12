"use server";

import { anoCredenciamento } from "@/lib/credenciamento";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";

const UUID = /^[0-9a-f-]{36}$/i;

export type ResultadoPresenca =
  | { ok: true; jaEstava: boolean; id: string; nome: string; municipio: string; codigo: string; hora: string; marcadoEm: string }
  | { ok: false; erro: string };

const hora = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" });

/** Marca a presença na hora: pelo ID de 5 dígitos (digitado) ou pelo expositor escolhido na busca por nome. */
export async function marcarPresenca(cicloId: string, quem: { codigo?: string; id?: string }): Promise<ResultadoPresenca> {
  if (!(await ehAdmin())) return { ok: false, erro: "Sua sessão expirou. Entre de novo no painel." };
  if (!UUID.test(cicloId)) return { ok: false, erro: "Escolha o ciclo." };
  const codigo = (quem.codigo ?? "").replace(/\D/g, "");
  if (!quem.id && !/^\d{5}$/.test(codigo)) return { ok: false, erro: "O ID tem 5 números. Confira e digite de novo." };
  if (quem.id && !UUID.test(quem.id)) return { ok: false, erro: "Expositor não encontrado." };

  const db = sql();
  const [p] = quem.id
    ? await db<{ id: string; nome: string; municipio: string; codigo: string }[]>`select id, nome, municipio, codigo from produtores where id = ${quem.id}`
    : await db<{ id: string; nome: string; municipio: string; codigo: string }[]>`select id, nome, municipio, codigo from produtores where codigo = ${codigo}`;
  if (!p) return { ok: false, erro: `Nenhum expositor com o ID ${codigo}. Confira o número ou busque pelo nome.` };

  const [novo] = await db<{ marcado_em: Date }[]>`
    insert into presencas (ciclo_id, produtor_id) values (${cicloId}, ${p.id})
    on conflict do nothing returning marcado_em`;
  const [r] = novo
    ? [novo]
    : await db<{ marcado_em: Date }[]>`select marcado_em from presencas where ciclo_id = ${cicloId} and produtor_id = ${p.id}`;

  return { ok: true, jaEstava: !novo, id: p.id, nome: p.nome, municipio: p.municipio, codigo: p.codigo, hora: hora(r.marcado_em), marcadoEm: new Date(r.marcado_em).toISOString() };
}

/** Já avaliou alguma exposição do ciclo ou já votou nos municípios: a presença dele não pode mais ser tirada. */
const AVALIOU_NO_CICLO = (cicloId: string, ano: number) => sql()`
  (exists (select 1 from avaliacoes a join exposicoes e on e.id = a.exposicao_id
           where a.produtor_id = presencas.produtor_id and e.ciclo_id = ${cicloId})
   or exists (select 1 from votos_cidades v where v.produtor_id = presencas.produtor_id and v.ano = ${ano}))`;

/** Tira a presença de todos no ciclo (botão "Desmarcar todos"), menos de quem já avaliou ou votou nos municípios. */
export async function desmarcarTodasPresencas(cicloId: string): Promise<{ ok: boolean; mantidos: number }> {
  if (!(await ehAdmin())) return { ok: false, mantidos: 0 };
  if (!UUID.test(cicloId)) return { ok: false, mantidos: 0 };
  const ano = await anoCredenciamento();
  await sql()`delete from presencas where ciclo_id = ${cicloId} and not ${AVALIOU_NO_CICLO(cicloId, ano)}`;
  const [{ n }] = await sql()<{ n: number }[]>`select count(*)::int n from presencas where ciclo_id = ${cicloId}`;
  return { ok: true, mantidos: n };
}

/** Desfaz uma presença marcada por engano. */
export async function desmarcarPresenca(cicloId: string, produtorId: string): Promise<{ ok: boolean; erro?: string }> {
  if (!(await ehAdmin())) return { ok: false, erro: "Sua sessão expirou. Entre de novo no painel." };
  if (!UUID.test(cicloId) || !UUID.test(produtorId)) return { ok: false, erro: "Expositor não encontrado." };
  const ano = await anoCredenciamento();
  const apagadas = await sql()`
    delete from presencas where ciclo_id = ${cicloId} and produtor_id = ${produtorId} and not ${AVALIOU_NO_CICLO(cicloId, ano)}`;
  if (apagadas.count === 0) return { ok: false, erro: "Este expositor já avaliou ou votou nos municípios: a presença dele não pode ser desmarcada." };
  return { ok: true };
}
