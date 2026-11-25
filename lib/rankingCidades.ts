import { resultadoCidades, votantesPorCidade } from "./credenciamento";
import { cacheCurto, sql, tentar, type Votacao } from "./db";

/**
 * Dados do ranking das cidades para as telas ao vivo (/ranking e /ranking-classico).
 * Uma só consulta vale por 8 s para todas as abas abertas neste servidor; se falhar, devolve o último resultado bom.
 * As consultas rodam UMA DE CADA VEZ (o pooler do Supabase não gosta de várias ao mesmo tempo) e o tempo de cada etapa
 * vai para o log da Vercel quando passa de 1,5 s ou quando a consulta para: "ranking parado em: <etapa>".
 * O total de votos sai da própria lista de votantes (uma linha por voto), sem uma consulta a mais.
 */
export function dadosRankingCidades(ano: number, votacao: Votacao) {
  const chave = `rank-cidades:${ano}:${votacao.cidades_quem}:${votacao.cidades_so_presentes}`;
  return cacheCurto(chave, 8000, () =>
    tentar(async () => {
      const inicio = Date.now();
      const marcas: string[] = [];
      let etapa = "início";
      // Se uma etapa não terminar em 3 s, registra qual é (a causa da lentidão aparece no log).
      const alarme = setTimeout(() => console.error(`ranking parado em: ${etapa} (${Date.now() - inicio} ms)`), 3000);
      const medir = async <T,>(nome: string, f: () => Promise<T>): Promise<T> => {
        etapa = nome;
        const t = Date.now();
        try {
          return await f();
        } finally {
          marcas.push(`${nome}=${Date.now() - t}ms`);
        }
      };
      try {
        const { ranking, vagas, votantes } = await medir("resultado", () => resultadoCidades(ano));
        const listaVotantes = await medir("votantes", () => votantesPorCidade(ano));
        // Quem pode votar, pela regra definida no painel (todos, só quem avaliou e/ou só quem está presente)
        const [{ elegiveis }] = await medir("elegiveis", () => sql()<{ elegiveis: number }[]>`
          select count(distinct pa.produtor_id)::int elegiveis
          from participacoes pa join exposicoes e on e.id = pa.exposicao_id join ciclos c on c.id = e.ciclo_id and c.ativo
          where (${votacao.cidades_quem !== "avaliaram"} or exists (
                   select 1 from avaliacoes a join exposicoes e2 on e2.id = a.exposicao_id
                   where a.produtor_id = pa.produtor_id and e2.ciclo_id = c.id))
            and (${!votacao.cidades_so_presentes} or exists (
                   select 1 from presencas pr where pr.produtor_id = pa.produtor_id and pr.ciclo_id = c.id))`);
        // Total de presentes (credenciados no evento) do ciclo ativo
        const [{ presentes }] = await medir("presentes", () => sql()<{ presentes: number }[]>`
          select count(*)::int presentes from presencas pr join ciclos c on c.id = pr.ciclo_id and c.ativo`);
        return { ranking, vagas, votantes, listaVotantes, totalVotos: listaVotantes.length, elegiveis, presentes };
      } finally {
        clearTimeout(alarme);
        if (Date.now() - inicio > 1500) console.error(`ranking lento: ${marcas.join(" ")} total=${Date.now() - inicio}ms`);
      }
    }, 5000),
  );
}
