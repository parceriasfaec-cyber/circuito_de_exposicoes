"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import Icone from "@/components/Icone";
import type { CidadeRanking, VotanteCidade } from "@/lib/credenciamento";


const INTERVALO = 10; // segundos entre as atualizações
const pts = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Medidor em meia-lua com a porcentagem de quem já votou. */
function Medidor({ pct }: { pct: number }) {
  const r = 80, comp = Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 200 116" className="aovivo-medidor" role="img" aria-label={`${pct.toFixed(1)}% votaram`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e1e6df" strokeWidth="26" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#1d5e2c" strokeWidth="26" strokeDasharray={`${(comp * p) / 100} ${comp}`} />
      <text x="100" y="96" textAnchor="middle" className="aovivo-medidor-num">{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</text>
    </svg>
  );
}

export default function RankingAoVivo({
  ano, aberta, ranking, vagas, votantes, totalVotos, elegiveis, listaVotantes,
}: {
  ano: number; aberta: boolean; ranking: CidadeRanking[]; vagas: number | null;
  votantes: number; totalVotos: number; elegiveis: number; listaVotantes: VotanteCidade[];
}) {
  const router = useRouter();
  const [falta, setFalta] = useState(INTERVALO);
  const [ativo, setAtivo] = useState(true);
  // Exposição escolhida para ver quem votou nela (a atualização automática pausa enquanto a janela está aberta).
  const [aberto, setAberto] = useState<string | null>(null);
  const escolhida = ranking.find((r) => r.credenciamento_id === aberto) ?? null;
  const deles = listaVotantes.filter((v) => v.credenciamento_id === aberto);

  // Atualiza sozinho: a cada INTERVALO segundos busca os números de novo, sem recarregar a página.
  useEffect(() => {
    if (!ativo || aberto) return;
    const t = setInterval(() => {
      setFalta((s) => {
        if (s <= 1) { router.refresh(); return INTERVALO; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ativo, aberto, router]);

  // Fecha a janela com Esc
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberto]);

  const max = Math.max(1, ...ranking.map((r) => r.votos));
  const pct = elegiveis > 0 ? (votantes / elegiveis) * 100 : 0;
  // A linha de corte entra depois da última cidade classificada (posição dentro das vagas).
  const ultimaClassificada = vagas ? ranking.reduce((i, r, idx) => (r.votos > 0 && r.posicao <= vagas ? idx : i), -1) : -1;

  return (
    <div className="aovivo">
      <section className="aovivo-ranking">
        <header className="aovivo-cab">
          <h1>Ranking das exposições <span>(Top 10 · tempo real)</span></h1>
          <button type="button" className="aovivo-status" onClick={() => setAtivo((a) => !a)} title={ativo ? "Pausar a atualização" : "Retomar a atualização"}>
            <Icone nome="atualizar" tamanho={18} />
            {aberto ? "Pausado enquanto vê os votantes" : ativo ? <>Ativado · próxima atualização: {falta}s</> : "Pausado (clique para retomar)"}
          </button>
        </header>
        {!aberta && <p className="aovivo-aviso">A votação das exposições está fechada. Os números abaixo são os registrados até agora.</p>}
        {ranking.length === 0 ? (
          <p className="aovivo-vazio">Nenhum município marcado como “Se apresentou” ainda.</p>
        ) : (
          <div className="aovivo-grade">
            {ranking.map((r, i) => {
              const classificada = vagas !== null && r.votos > 0 && r.posicao <= vagas;
              return (
                <Fragment key={r.credenciamento_id}>
                  <button type="button" className={`aovivo-cidade${classificada ? " classificada" : ""}`} onClick={() => setAberto(r.credenciamento_id)} title={`Ver quem votou em ${r.municipio}`}>
                    <span className="aovivo-pos">{r.posicao}º</span>
                    <div className="aovivo-info">
                      <div className="aovivo-linha">
                        <strong>{r.municipio}</strong>
                        {classificada && <span className="selo-classificada">Classificada</span>}
                        <span className="aovivo-votos">{r.votos} {r.votos === 1 ? "voto" : "votos"} <small>({pts(r.pontos)} pts)</small></span>
                      </div>
                      <div className="aovivo-barra"><span style={{ width: `${(r.votos / max) * 100}%` }} /></div>
                    </div>
                  </button>
                  {i === ultimaClassificada && i < ranking.length - 1 && (
                    <div className="aovivo-corte"><span>Linha de corte · Circuito {ano}</span></div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
        <div className="aovivo-desempate">
          <strong>Como é feito o desempate</strong>
          <p>Com o mesmo número de votos, fica na frente quem soma mais pontos. Cada voto vale conforme quantas exposições o expositor participou no Circuito de {ano - 1}:</p>
          <div className="aovivo-pesos">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span key={n}><b>{n}</b> {n === 1 ? "exposição" : "exposições"} = {(n <= 1 ? 1 : 1 + n / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</span>
            ))}
          </div>
        </div>
      </section>

      {escolhida && (
        <div className="aovivo-janela-fundo" onClick={() => setAberto(null)}>
          <div className="aovivo-janela" role="dialog" aria-modal="true" aria-label={`Votantes de ${escolhida.municipio}`} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>{escolhida.municipio}</h2>
                <span>{escolhida.posicao}º lugar · {escolhida.votos} {escolhida.votos === 1 ? "voto" : "votos"} · {pts(escolhida.pontos)} pontos</span>
              </div>
              <button type="button" onClick={() => setAberto(null)} aria-label="Fechar">×</button>
            </header>
            {deles.length === 0 ? (
              <p className="aovivo-janela-vazio">Ninguém votou nesta exposição ainda.</p>
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

      <aside className="aovivo-lado">
        <header className="aovivo-cab"><h2>Monitoramento de participação</h2></header>
        <div className="aovivo-numeros">
          <div><span>Expositores que votaram</span><strong>{votantes}</strong></div>
          <div><span>Votos registrados</span><strong>{totalVotos}</strong></div>
          <div><span>Podem votar</span><strong>{elegiveis}</strong></div>
        </div>
        <div className="aovivo-quorum">
          <Medidor pct={pct} />
          <span>Quórum de votação</span>
        </div>
      </aside>
    </div>
  );
}
