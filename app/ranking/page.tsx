import { redirect } from "next/navigation";
import PaginaPublica from "@/components/PaginaPublica";
import { anoCredenciamento, resultadoCidades, votantesPorCidade } from "@/lib/credenciamento";
import { lerVotacao, sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import RankingAoVivo from "./RankingAoVivo";

export const dynamic = "force-dynamic";

/** Tela separada do ranking das cidades em tempo real (para projetar): top 10, linha de corte e participação. */
export default async function RankingTempoReal() {
  if (!(await ehAdmin())) redirect("/admin");
  const ano = await anoCredenciamento();
  const votacao = await lerVotacao();
  const db = sql();

  const [{ ranking, vagas, votantes }, listaVotantes, [{ total_votos }], [{ elegiveis }]] = await Promise.all([
    resultadoCidades(ano),
    votantesPorCidade(ano),
    db<{ total_votos: number }[]>`select count(*)::int total_votos from votos_cidades where ano = ${ano}`,
    // Quem pode votar, pela regra definida no painel (todos, só quem avaliou e/ou só quem está presente)
    db<{ elegiveis: number }[]>`
      select count(distinct pa.produtor_id)::int elegiveis
      from participacoes pa join exposicoes e on e.id = pa.exposicao_id join ciclos c on c.id = e.ciclo_id and c.ativo
      where (${votacao.cidades_quem !== "avaliaram"} or exists (
               select 1 from avaliacoes a join exposicoes e2 on e2.id = a.exposicao_id
               where a.produtor_id = pa.produtor_id and e2.ciclo_id = c.id))
        and (${!votacao.cidades_so_presentes} or exists (
               select 1 from presencas pr where pr.produtor_id = pa.produtor_id and pr.ciclo_id = c.id))`,
  ]);

  return (
    <PaginaPublica>
      <RankingAoVivo
        ano={ano}
        aberta={votacao.cidades_aberta}
        ranking={ranking.filter((r) => r.posicao <= 10 || (vagas !== null && r.posicao <= vagas)).slice(0, Math.max(10, vagas ?? 0))}
        vagas={vagas}
        votantes={votantes}
        totalVotos={total_votos}
        elegiveis={elegiveis}
        listaVotantes={listaVotantes}
      />
    </PaginaPublica>
  );
}
