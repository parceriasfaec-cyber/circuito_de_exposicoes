"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icone from "@/components/Icone";
import { useAtualizar } from "@/components/useAtualizar";
import type { CidadeRanking, VotanteCidade } from "@/lib/credenciamento";

const INTERVALO = 20; // segundos entre as atualizações
const pts = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const votosTxt = (n: number) => `${n} ${n === 1 ? "voto" : "votos"}`;

/** Medidor em meia-lua com a porcentagem de quem já votou. */
function Medidor({ pct }: { pct: number }) {
  const r = 80, comp = Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 200 116" className="tp-medidor" role="img" aria-label={`${pct.toFixed(1)}% votaram`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e1e6df" strokeWidth="24" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#1d5e2c" strokeWidth="24" strokeLinecap="round" strokeDasharray={`${(comp * p) / 100} ${comp}`} />
      <text x="100" y="94" textAnchor="middle" className="tp-medidor-num">{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</text>
    </svg>
  );
}

/** Ranking das cidades no telão, em formato de pódio para as classificadas e lista para as demais. */
export default function RankingPodio({
  ano, aberta, ranking, vagas, votantes, totalVotos, elegiveis, presentes, listaVotantes,
}: {
  ano: number; aberta: boolean; ranking: CidadeRanking[]; vagas: number | null;
  votantes: number; totalVotos: number; elegiveis: number; presentes: number; listaVotantes: VotanteCidade[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<string | null>(null);
  const [verResto, setVerResto] = useState(false); // as demais cidades só aparecem quando a pessoa clica
  const escolhida = ranking.find((r) => r.credenciamento_id === aberto) ?? null;
  const deles = listaVotantes.filter((v) => v.credenciamento_id === aberto);

  const { atualizar, pendente } = useAtualizar(INTERVALO, !aberto);
  const [hora, setHora] = useState("");
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (!pendente) setManual(false);
    if (!pendente) setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [pendente]);
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberto]);

  const max = Math.max(1, ...ranking.map((r) => r.votos));
  const pct = elegiveis > 0 ? (votantes / elegiveis) * 100 : 0;
  // Pódio: as que estão dentro das vagas (com voto); no máximo 3. Ordem na tela: 2º, 1º, 3º.
  const nVagas = Math.min(3, Math.max(1, vagas ?? 2));
  const podio = ranking.filter((r) => r.votos > 0).slice(0, nVagas);
  const resto = ranking.filter((r) => !podio.includes(r));
  const ordem = podio.length === 3 ? [podio[1], podio[0], podio[2]] : podio.length === 2 ? [podio[1], podio[0]] : podio;

  return (
    <div className="tp">
      <button type="button" className={`atu-btn${pendente && manual ? " girando" : ""}`} onClick={() => { setManual(true); atualizar(); }} title="Atualizar agora" aria-label="Atualizar agora">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
        {hora && <span>{hora}</span>}
      </button>
      <h1 className="tx-geral">Votação das cidades para o Circuito Cearense de Exposição {ano}</h1>
      <section className="tp-card">
        <h2 className="tp-titulo">
          <span className="tp-ic"><Icone nome="trofeu" tamanho={22} /></span>
          Ranking dos municípios
        </h2>
        {!aberta && <p className="tp-aviso">A votação está fechada. Os números são os registrados até agora.</p>}

        {!verResto && (
        <div className={`tp-podio n${ordem.length}`}>
          {ordem.length === 0 && <p className="tp-vazio">Ainda não há votos.</p>}
          {ordem.map((r) => {
            const lugar = Math.min(3, r.posicao);
            const empatada = r.votos > 0 && ranking.filter((x) => x.posicao === r.posicao).length > 1;
            return (
              <button key={r.credenciamento_id} type="button" className={`tp-degrau lugar-${lugar}`} onClick={() => setAberto(r.credenciamento_id)} title={`Ver quem votou em ${r.municipio}`}>
                <span className="tp-selo">Classificada</span>
                {empatada && <span className="tp-empate">Empate</span>}
                <strong className="tp-podio-nome">{r.municipio}</strong>
                <span className="tp-podio-votos">{votosTxt(r.votos)}</span>
                <span className="tp-podio-pts">{pts(r.pontos)} pts</span>
                <span className="tp-bloco"><span className={`tp-medalha m${lugar}`}>{lugar}º</span></span>
              </button>
            );
          })}
        </div>

        )}

        {!verResto && <div className="tp-corte"><span>Linha de corte · Circuito {ano}</span></div>}

        {resto.length > 0 && (
          <button type="button" className={`tx-mais${verResto ? " aberto" : ""}`} onClick={() => setVerResto((v) => !v)} aria-expanded={verResto}>
            {verResto ? "Voltar ao pódio" : `Ver demais municípios (${resto.length})`}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        )}

        {verResto && (
        <ol className="tp-lista">
          {resto.map((r) => (
            <li key={r.credenciamento_id}>
              <button type="button" onClick={() => setAberto(r.credenciamento_id)} title={`Ver quem votou em ${r.municipio}`} className={r.votos === 0 ? "sem" : undefined}>
                <span className="tp-pos">{r.posicao}º</span>
                <span className="tp-item">
                  <span className="tp-linha1">
                    <strong>{r.municipio}</strong>
                    <span><b>{votosTxt(r.votos)}</b> <small>({pts(r.pontos)} pts)</small></span>
                  </span>
                  <span className="tp-barra"><span style={{ width: `${(r.votos / max) * 100}%` }} /></span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        )}
      </section>

      <aside className="tp-card tp-lado">
        <h2 className="tp-titulo">
          <span className="tp-ic"><Icone nome="usuarios" tamanho={22} /></span>
          Monitoramento de participação
        </h2>
        <div className="tp-kpis">
          <div><Icone nome="checkCirculo" tamanho={20} /><strong>{votantes}</strong><small>Expositores que votaram</small></div>
          <div><Icone nome="urna" tamanho={20} /><strong>{totalVotos}</strong><small>Votos registrados</small></div>
          <div><Icone nome="usuarios" tamanho={20} /><strong>{presentes}</strong><small>Total de Presentes</small></div>
        </div>
        <div className="tp-quorum">
          <Medidor pct={pct} />
          <span>Quórum de votação</span>
        </div>
      </aside>

      <p className="tx-nota">
        <strong>Como é o desempate:</strong> com os mesmos votos, fica na frente quem soma mais pontos. Cada voto vale de 1,0 a 1,9 conforme as exposições do expositor em {ano - 1}. Persistindo o empate, fica na frente quem tem votos de produtores com mais exposições; se ainda assim empatar, a organização decide.
      </p>

      {escolhida && (
        <div className="aovivo-janela-fundo" onClick={() => setAberto(null)}>
          <div className="aovivo-janela" role="dialog" aria-modal="true" aria-label={`Votantes de ${escolhida.municipio}`} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>{escolhida.municipio}</h2>
                <span>{escolhida.posicao}º lugar · {votosTxt(escolhida.votos)} · {pts(escolhida.pontos)} pontos</span>
              </div>
              <button type="button" onClick={() => setAberto(null)} aria-label="Fechar">×</button>
            </header>
            {deles.length === 0 ? (
              <p className="aovivo-janela-vazio">Ninguém votou neste município ainda.</p>
            ) : (
              <table>
                <thead><tr><th>ID</th><th>Expositor</th><th className="centro">Exposições em {ano - 1}</th><th className="centro">Pontos</th></tr></thead>
                <tbody>
                  {deles.map((v) => (
                    <tr key={v.codigo}><td>{v.codigo}</td><td>{v.nome}</td><td className="centro">{v.exposicoes}</td><td className="centro"><b>{pts(v.peso)}</b></td></tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Total</td><td className="centro"><b>{pts(deles.reduce((s, v) => s + v.peso, 0))}</b></td></tr></tfoot>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
