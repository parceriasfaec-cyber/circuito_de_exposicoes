import { NextResponse } from "next/server";
import { lerVotacao, sql } from "@/lib/db";
import { normalizar } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Linha = { id: string; nome: string; municipio: string };

/** Busca de nomes para quem não tem documento. Só responde com a votação liberada. */
export async function GET(req: Request) {
  const q = normalizar(new URL(req.url).searchParams.get("q") ?? "");
  if (q.length < 3) return NextResponse.json([]);

  const votacao = await lerVotacao();
  if (!votacao.aberta) return NextResponse.json([]);

  const todos = await sql()<Linha[]>`select id, nome, municipio from produtores order by nome, municipio`;
  const contagem = new Map<string, number>();
  for (const p of todos) contagem.set(normalizar(p.nome), (contagem.get(normalizar(p.nome)) ?? 0) + 1);

  const achados = todos
    .filter((p) => normalizar(p.nome).startsWith(q))
    .slice(0, 12)
    .map((p) => ({ ...p, repetido: (contagem.get(normalizar(p.nome)) ?? 0) > 1 }));

  return NextResponse.json(achados);
}
