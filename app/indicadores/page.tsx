import { redirect } from "next/navigation";
import AtualizarSozinho from "@/components/AtualizarSozinho";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { anoCredenciamento } from "@/lib/credenciamento";
import { cacheCurto, lerVotacaoCache, sql, tentar } from "@/lib/db";
import { formatarMedia } from "@/lib/escala";
import { dadosRankingCidades } from "@/lib/rankingCidades";
import { ehAdmin } from "@/lib/sessao";
import { nomeCurto } from "@/lib/texto";
import "./indicadores.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Indicadores · Circuito Cearense de Exposição" };

type Etapa = { exposicao_id: string; posicao: number; nome: string; questionarios: number; media_produtor: number | null };

const pts = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const votosTxt = (n: number) => `${n} ${n === 1 ? "voto" : "votos"}`;

/** Painel de indicadores para o celular (somente totais, sem nomes de participantes). */
export default async function Indicadores() {
  if (!(await ehAdmin())) redirect("/admin");
  const ano = await anoCredenciamento();
  const votacao = await lerVotacaoCache();
  const { ciclo } = await cicloEscolhido(undefined);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const [cidades, etapas] = await Promise.all([
    dadosRankingCidades(ano, votacao),
    cacheCurto(`ind-etapas:${cid}`, 8000, () => tentar(() => sql()<Etapa[]>`
      select exposicao_id, posicao::int, nome, questionarios::int, media_produtor::float
      from v_ranking where ciclo_id = ${cid} order by posicao, nome`)),
  ]);

  const { ranking, vagas, votantes, totalVotos, elegiveis, presentes } = cidades;
  const pct = elegiveis > 0 ? Math.min(100, (votantes / elegiveis) * 100) : 0;
  const nVagas = Math.min(3, Math.max(1, vagas ?? 2));
  const podio = ranking.filter((r) => r.votos > 0).slice(0, nVagas);
  const maxVotos = Math.max(1, ...podio.map((r) => r.votos));
  const avaliadas = etapas.filter((e) => e.media_produtor !== null).slice(0, 3);
  const totalAval = etapas.reduce((s, e) => s + e.questionarios, 0);
  const medalha = ["ouro", "prata", "bronze"];

  return (
    <div className="ind">
      <AtualizarSozinho segundos={20} />
      <header className="ind-capa">
        <div className="ind-capa-sombra" />
        <div className="ind-capa-texto">
          <span className="ind-selo">Painel ao vivo</span>
          <h1>Circuito Cearense<br />de Exposição {ano}</h1>
        </div>
      </header>

      <main className="ind-corpo">
        <section className="ind-kpis" aria-label="Indicadores gerais">
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="checkCirculo" tamanho={20} /></span><strong>{votantes}</strong><small>Expositores que votaram</small></div>
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="trofeu" tamanho={20} /></span><strong>{totalVotos}</strong><small>Votos nos municípios</small></div>
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="usuarios" tamanho={20} /></span><strong>{presentes}</strong><small>Presentes no evento</small></div>
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="checkCirculo" tamanho={20} /></span><strong>{totalAval}</strong><small>Avaliações das etapas</small></div>
        </section>

        <section className="ind-card">
          <h2>Participação na votação</h2>
          <div className="ind-meta"><strong>{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong><span>{votantes} de {elegiveis} expositores aptos</span></div>
          <div className="ind-trilho"><div className="ind-preench" style={{ width: `${pct}%` }} /></div>
        </section>

        <section className="ind-card">
          <h2><span className="ind-ic p"><Icone nome="trofeu" tamanho={16} /></span>Municípios — classificados</h2>
          {podio.length === 0 && <p className="ind-vazio">Ainda não há votos.</p>}
          <ol className="ind-lista">
            {podio.map((r, i) => (
              <li key={r.credenciamento_id}>
                <span className={`ind-medalha ${medalha[i]}`}>{r.posicao}º</span>
                <div className="ind-item">
                  <div className="ind-linha"><strong>{r.municipio}</strong><span>{votosTxt(r.votos)} <small>({pts(r.pontos)} pts)</small></span></div>
                  <div className="ind-barra"><i style={{ width: `${(r.votos / maxVotos) * 100}%` }} /></div>
                </div>
              </li>
            ))}
          </ol>
          {ranking.length > podio.length && (
            <details className="ind-mais">
              <summary>Ver demais municípios ({ranking.length - podio.length})</summary>
              <ol className="ind-lista" start={podio.length + 1}>
                {ranking.filter((r) => !podio.includes(r)).map((r) => (
                  <li key={r.credenciamento_id}>
                    <span className="ind-medalha">{r.posicao}º</span>
                    <div className="ind-item">
                      <div className="ind-linha"><strong>{r.municipio}</strong><span>{votosTxt(r.votos)} <small>({pts(r.pontos)} pts)</small></span></div>
                      <div className="ind-barra"><i style={{ width: `${(r.votos / maxVotos) * 100}%` }} /></div>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>

        <section className="ind-card">
          <h2><span className="ind-ic p"><Icone nome="trofeu" tamanho={16} /></span>Etapas mais bem avaliadas</h2>
          {avaliadas.length === 0 && <p className="ind-vazio">Aguardando avaliações.</p>}
          <ol className="ind-lista">
            {avaliadas.map((e, i) => (
              <li key={e.exposicao_id}>
                <span className={`ind-medalha ${medalha[i]}`}>{e.posicao}º</span>
                <div className="ind-item">
                  <div className="ind-linha"><strong>{nomeCurto(e.nome)}</strong><span>{formatarMedia(e.media_produtor)}</span></div>
                  <small className="ind-sub">{e.questionarios} {e.questionarios === 1 ? "avaliação" : "avaliações"}</small>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="ind-rodape">Sistema FAEC/SENAR · Atualiza automaticamente</footer>
      </main>
    </div>
  );
}
