import { redirect } from "next/navigation";
import AtualizarSozinho from "@/components/AtualizarSozinho";
import Icone from "@/components/Icone";
import PaginaPublica from "@/components/PaginaPublica";
import { type Progresso } from "@/components/ParticipacaoExposicoes";
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

/** "EXPOCECE (Quixadá)" -> { evento: "EXPOCECE", cidade: "Quixadá" } */
const separar = (nome: string) => {
  const curto = nomeCurto(nome);
  const m = curto.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { evento: m[1], cidade: m[2] } : { evento: curto, cidade: "" };
};
const MEDIA_MAX = 50;

/** Tela do telão: pódio e lista do ranking das avaliações das etapas, e participantes por etapa (atualiza sozinha). */
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
  const [{ presentes }] = await db<{ presentes: number }[]>`select count(*)::int presentes from presencas where ciclo_id = ${cid}`;

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

  const avaliadas = ranking.filter((r) => r.media_produtor !== null);
  const podio = avaliadas.slice(0, 3);
  const resto = ranking.filter((r) => !podio.includes(r));
  // Ordem do pódio na tela: 2º, 1º, 3º
  const ordemPodio = [podio[1], podio[0], podio[2]].map((r, i) => (r ? { r, lugar: [2, 1, 3][i] } : null));

  const lista = [...progresso].sort((a, b) => b.na_lista - a.na_lista || a.nome.localeCompare(b.nome));
  const maior = Math.max(1, ...lista.map((p) => p.na_lista));

  return (
    <PaginaPublica>
      <AtualizarSozinho segundos={15} />
      <div className="tx">
        {/* ---------- Ranking ---------- */}
        <section className="tx-card">
          <h1 className="tx-titulo">
            <span className="tx-ic"><Icone nome="trofeu" tamanho={22} /></span>
            Ranking das Avaliações das Etapas do Circuito Cearense de Exposição {ano}
          </h1>

          <div className="tx-podio">
            {ordemPodio.map((item, i) =>
              item ? (
                <div key={item.r.nome} className={`tx-degrau lugar-${item.lugar}`}>
                  <span className="tx-podio-cidade">{separar(item.r.nome).cidade}</span>
                  <strong className="tx-podio-nome">{separar(item.r.nome).evento}</strong>
                  <span className="tx-podio-media">{formatarMedia(item.r.media_produtor)}</span>
                  <div className="tx-bloco">
                    <span className={`tx-medalha m${item.lugar}`}>{item.lugar}</span>
                  </div>
                </div>
              ) : (
                <div key={`vazio-${i}`} className="tx-degrau vazio" />
              ),
            )}
          </div>

          <ol className="tx-lista">
            {resto.map((r) => {
              const { evento, cidade } = separar(r.nome);
              const d = desempate(r);
              const sem = r.media_produtor === null;
              return (
                <li key={r.nome} className={sem ? "sem" : undefined}>
                  <span className="tx-pos">{r.posicao}º</span>
                  <div className="tx-item">
                    <div className="tx-linha1">
                      <span className="tx-nome"><strong>{evento}</strong>{cidade && <> · {cidade}</>}</span>
                      {sem ? <span className="tx-aguardando">Aguardando avaliações</span> : <strong className="tx-media">{formatarMedia(r.media_produtor)}</strong>}
                    </div>
                    {!sem && (
                      <div className="tx-linha2">
                        <div className="tx-barra"><span style={{ width: `${Math.min(100, ((r.media_produtor ?? 0) / MEDIA_MAX) * 100)}%` }} /></div>
                        <span className="tx-info">{r.pontos.toLocaleString("pt-BR")} pts · {r.questionarios} aval.</span>
                        {d && d !== "total" && <span className="tx-chip">P{d.pergunta} {formatarMedia(d.nota)}</span>}
                        {d === "total" && <span className="tx-chip">Empate</span>}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------- Participantes ---------- */}
        <section className="tx-card">
          <h2 className="tx-titulo">
            <span className="tx-ic"><Icone nome="usuarios" tamanho={22} /></span>
            Participantes por Etapa do Circuito
          </h2>
          <div className="tx-kpis">
            <div><Icone nome="usuarios" tamanho={20} /><strong>{t.produtores}</strong><small>Participantes</small></div>
            <div><Icone nome="escudo" tamanho={20} /><strong>{presentes}</strong><small>Presentes</small></div>
            <div><Icone nome="checkCirculo" tamanho={20} /><strong>{t.completos}</strong><small>Avaliaram tudo</small></div>
          </div>
          <ul className="tx-part">
            {lista.map((p) => (
              <li key={p.nome}>
                <div className="tx-part-linha">
                  <strong>{separar(p.nome).evento}</strong>
                  <span><b>{p.responderam}</b> de {p.na_lista} avaliaram</span>
                </div>
                <div className="tx-part-barra">
                  <span className="total" style={{ width: `${(p.na_lista / maior) * 100}%` }} />
                  <span className="aval" style={{ width: `${(p.responderam / maior) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <ul className="tx-legenda">
            <li><span className="ponto total" /> Participantes</li>
            <li><span className="ponto aval" /> Avaliaram</li>
          </ul>
        </section>
      </div>
    </PaginaPublica>
  );
}
