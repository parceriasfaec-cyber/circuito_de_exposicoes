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

  // Só quem está na lista de alguma exposição do ciclo ativo.
  const todos = await sql()<Linha[]>`
    select p.id, p.nome, p.municipio from produtores p
    where exists (
      select 1 from participacoes pa
      join exposicoes e on e.id = pa.exposicao_id
      join ciclos c on c.id = e.ciclo_id and c.ativo
      where pa.produtor_id = p.id)
    order by p.nome, p.municipio`;
  const contagem = new Map<string, number>();
  for (const p of todos) contagem.set(normalizar(p.nome), (contagem.get(normalizar(p.nome)) ?? 0) + 1);

  const achados = todos
    .filter((p) => normalizar(p.nome).startsWith(q))
    .slice(0, 12)
    .map((p) => ({ ...p, repetido: (contagem.get(normalizar(p.nome)) ?? 0) > 1 }));

  return NextResponse.json(achados);
}
