"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icone from "@/components/Icone";
import type { CidadeRanking, VotanteCidade } from "@/lib/credenciamento";

const INTERVALO = 10; // segundos entre as atualizações
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
  ano, aberta, ranking, vagas, votantes, totalVotos, elegiveis, listaVotantes,
}: {
  ano: number; aberta: boolean; ranking: CidadeRanking[]; vagas: number | null;
  votantes: number; totalVotos: number; elegiveis: number; listaVotantes: VotanteCidade[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<string | null>(null);
  const escolhida = ranking.find((r) => r.credenciamento_id === aberto) ?? null;
  const deles = listaVotantes.filter((v) => v.credenciamento_id === aberto);

  useEffect(() => {
    if (aberto) return;
    const t = setInterval(() => router.refresh(), INTERVALO * 1000);
    return () => clearInterval(t);
  }, [aberto, router]);
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
      <section className="tp-card">
        <h1 className="tp-titulo">
          <span className="tp-ic"><Icone nome="trofeu" tamanho={22} /></span>
          Ranking dos municípios para a etapa do Circuito Cearense de Exposição {ano}
        </h1>
        {!aberta && <p className="tp-aviso">A votação está fechada. Os números são os registrados até agora.</p>}

        <div className={`tp-podio n${ordem.length}`}>
          {ordem.length === 0 && <p className="tp-vazio">Ainda não há votos.</p>}
          {ordem.map((r) => {
            const lugar = podio.indexOf(r) + 1;
            return (
              <button key={r.credenciamento_id} type="button" className={`tp-degrau lugar-${lugar}`} onClick={() => setAberto(r.credenciamento_id)} title={`Ver quem votou em ${r.municipio}`}>
                <span className="tp-selo">Classificada</span>
                <strong className="tp-podio-nome">{r.municipio}</strong>
                <span className="tp-podio-votos">{votosTxt(r.votos)}</span>
                <span className="tp-podio-pts">{pts(r.pontos)} pts</span>
                <span className="tp-bloco"><span className={`tp-medalha m${lugar}`}>{lugar}º</span></span>
              </button>
            );
          })}
        </div>

        <div className="tp-corte"><span>Linha de corte · Circuito {ano}</span></div>

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
        <p className="tp-nota"><b>Desempate:</b> com os mesmos votos, fica na frente quem soma mais pontos (cada voto vale de 1,0 a 1,9 conforme as exposições do expositor em {ano - 1}).</p>
      </section>

      <aside className="tp-card tp-lado">
        <h2 className="tp-titulo">
          <span className="tp-ic"><Icone nome="usuarios" tamanho={22} /></span>
          Monitoramento de participação
        </h2>
        <div className="tp-kpis">
          <div><Icone nome="checkCirculo" tamanho={20} /><strong>{votantes}</strong><small>Expositores que votaram</small></div>
          <div><Icone nome="urna" tamanho={20} /><strong>{totalVotos}</strong><small>Votos registrados</small></div>
          <div><Icone nome="usuarios" tamanho={20} /><strong>{elegiveis}</strong><small>Podem votar</small></div>
        </div>
        <div className="tp-quorum">
          <Medidor pct={pct} />
          <span>Quórum de votação</span>
        </div>
      </aside>

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
