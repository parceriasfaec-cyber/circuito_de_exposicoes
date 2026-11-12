import { redirect } from "next/navigation";
import AtualizarSozinho from "@/components/AtualizarSozinho";
import Icone from "@/components/Icone";
import PaginaPublica from "@/components/PaginaPublica";
import Participacao, { type Progresso } from "@/components/ParticipacaoExposicoes";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { formatarMedia } from "@/lib/escala";
import { ehAdmin } from "@/lib/sessao";
import { nomeCurto } from "@/lib/texto";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking das Avaliações · Circuito Cearense de Exposição" };

type Ranking = {
  posicao: number; nome: string; questionarios: number; pontos: number;
  media_produtor: number | null; media_p2: number | null; media_p5: number | null; media_p9: number | null;
};

/** Tela do telão: ranking das avaliações das etapas do ciclo ativo e participantes por etapa, atualizando sozinha. */
export default async function RankingExposicoes() {
  if (!(await ehAdmin())) redirect("/admin");
  const { ciclo } = await cicloEscolhido(undefined);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";
  const db = sql();

  const progresso = await db<Progresso[]>`
    select nome, foto, na_lista::int, responderam::int from v_progresso where ciclo_id = ${cid} order by nome`;
  const ranking = await db<Ranking[]>`
    select posicao::int, nome, questionarios::int, pontos::int, media_produtor::float, media_p2::float, media_p5::float, media_p9::float
    from v_ranking where ciclo_id = ${cid} order by posicao, nome`;
  const [t] = await db<{ produtores: number; completos: number }[]>`
    with pa as (select pa.* from participacoes pa join exposicoes e on e.id = pa.exposicao_id where e.ciclo_id = ${cid})
    select (select count(distinct produtor_id)::int from pa) produtores,
           (select count(*)::int from (
              select pa.produtor_id from pa
              left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
              group by pa.produtor_id having count(a.produtor_id) = count(*)) c) completos`;

  // Mesma regra do painel: no empate de média, mostra a pergunta que decidiu (2, depois 5, depois 9).
  const desempate = (r: Ranking) => {
    if (r.media_produtor === null) return null;
    const grupo = ranking.filter((x) => x.media_produtor === r.media_produtor);
    if (grupo.length < 2) return null;
    for (const [pergunta, campo] of [[2, "media_p2"], [5, "media_p5"], [9, "media_p9"]] as const) {
      if (new Set(grupo.map((x) => x[campo])).size > 1) return { pergunta, nota: r[campo] };
    }
    return "total" as const;
  };
  const ano = ciclo?.ano ?? new Date().getFullYear();

  return (
    <PaginaPublica>
      <AtualizarSozinho segundos={15} />
      <div className="telao-expo">
        <section className="telao-expo-bloco">
          <h1 className="telao-expo-titulo"><span className="telao-expo-ic"><Icone nome="trofeu" tamanho={30} /></span>
            Ranking das Avaliações das Etapas do Circuito Cearense de Exposição {ano}</h1>
          <div className="telao-expo-corpo">
            <table className="tabela-simples ranking-exposicoes">
              <thead>
                <tr><th>Posição</th><th>Exposição</th><th className="num">Questionários</th><th className="num">Pontos</th><th className="num">Média</th></tr>
              </thead>
              <tbody>
                {ranking.map((r) => {
                  const medalha = r.media_produtor !== null && r.posicao <= 3 ? ["ouro", "prata", "bronze"][r.posicao - 1] : null;
                  const d = desempate(r);
                  return (
                    <tr key={r.nome} className={medalha ? `podio ${medalha}` : undefined}>
                      <td className="posicao">
                        {medalha ? <span className={`medalha ${medalha}`}>★</span> : <span className="medalha vazia" />}
                        {r.posicao}º
                      </td>
                      <td title={r.nome}><strong>{nomeCurto(r.nome)}</strong></td>
                      <td className="num">{r.questionarios}</td>
                      <td className="num pontos">{r.questionarios ? r.pontos.toLocaleString("pt-BR") : "—"}</td>
                      <td className="num">
                        <strong className={medalha ? `media-pill ${medalha}` : undefined}>{formatarMedia(r.media_produtor)}</strong>
                        {d && (
                          <div className="desempate-linha">
                            {d === "total" ? "Empate total: a organização decide" : <>Desempate:<br />pergunta {d.pergunta} ({formatarMedia(d.nota)})</>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="ranking-nota">
              <span className="ranking-nota-i" aria-hidden="true">i</span>
              <span>
                <strong>Pontos</strong> = soma das notas. <strong>Média</strong> = pontos ÷ expositores que avaliaram (de 10 a 50).
                No empate, vence a maior média na pergunta 2, depois na 5 e na 9.
              </span>
            </p>
          </div>
        </section>

        <section className="telao-expo-bloco">
          <h2 className="telao-expo-titulo"><span className="telao-expo-ic"><Icone nome="usuarios" tamanho={30} /></span>
            Participantes por Etapa do Circuito</h2>
          <div className="telao-expo-corpo">
            <Participacao progresso={progresso} produtores={t.produtores} completos={t.completos} />
          </div>
        </section>
      </div>
    </PaginaPublica>
  );
}
