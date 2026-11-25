import { redirect } from "next/navigation";
import PaginaPublica from "@/components/PaginaPublica";
import { anoCredenciamento } from "@/lib/credenciamento";
import { lerVotacaoCache } from "@/lib/db";
import { dadosRankingCidades } from "@/lib/rankingCidades";
import { ehAdmin } from "@/lib/sessao";
import RankingPodio from "./RankingPodio";

export const dynamic = "force-dynamic";

/** Esconde o nome: cada palavra mostra só a primeira letra (ex.: "Adriel Mourao" -> "A***** M*****"). */
const esconderNome = (nome: string) =>
  nome.split(" ").filter(Boolean).map((p) => p[0] + "*".repeat(Math.max(1, p.length - 1))).join(" ");

/** Tela separada do ranking das cidades em tempo real (para projetar): top 10, linha de corte e participação. */
export default async function RankingTempoReal() {
  if (!(await ehAdmin())) redirect("/admin");
  const ano = await anoCredenciamento();
  const votacao = await lerVotacaoCache();

  const { ranking, vagas, votantes, listaVotantes, totalVotos, elegiveis, presentes } = await dadosRankingCidades(ano, votacao);

  return (
    <PaginaPublica>
      <RankingPodio
        ano={ano}
        aberta={votacao.cidades_aberta}
        ranking={ranking.filter((r) => r.posicao <= 10 || (vagas !== null && r.posicao <= vagas)).slice(0, Math.max(10, vagas ?? 0))}
        vagas={vagas}
        votantes={votantes}
        totalVotos={totalVotos}
        elegiveis={elegiveis}
        presentes={presentes}
        listaVotantes={listaVotantes.map((v) => ({ ...v, nome: esconderNome(v.nome), municipio: "" }))}
      />
    </PaginaPublica>
  );
}
