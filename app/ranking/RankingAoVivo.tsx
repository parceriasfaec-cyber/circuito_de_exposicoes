"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import Icone from "@/components/Icone";
import type { CidadeRanking } from "@/lib/credenciamento";

export type UltimoVoto = { nome: string; municipio: string; hora: string };

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
  ano, aberta, ranking, vagas, votantes, totalVotos, elegiveis, ultimos,
}: {
  ano: number; aberta: boolean; ranking: CidadeRanking[]; vagas: number | null;
  votantes: number; totalVotos: number; elegiveis: number; ultimos: UltimoVoto[];
}) {
  const router = useRouter();
  const [falta, setFalta] = useState(INTERVALO);
  const [ativo, setAtivo] = useState(true);

  // Atualiza sozinho: a cada INTERVALO segundos busca os números de novo, sem recarregar a página.
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => {
      setFalta((s) => {
        if (s <= 1) { router.refresh(); return INTERVALO; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ativo, router]);

  const max = Math.max(1, ...ranking.map((r) => r.votos));
  const pct = elegiveis > 0 ? (votantes / elegiveis) * 100 : 0;
  // A linha de corte entra depois da última cidade classificada (posição dentro das vagas).
  const ultimaClassificada = vagas ? ranking.reduce((i, r, idx) => (r.votos > 0 && r.posicao <= vagas ? idx : i), -1) : -1;

  return (
    <div className="aovivo">
      <section className="aovivo-ranking">
        <header className="aovivo-cab">
          <h1>Ranking das cidades <span>(Top 10 · tempo real)</span></h1>
          <button type="button" className="aovivo-status" onClick={() => setAtivo((a) => !a)} title={ativo ? "Pausar a atualização" : "Retomar a atualização"}>
            <Icone nome="atualizar" tamanho={18} />
            {ativo ? <>Ativado · próxima atualização: {falta}s</> : "Pausado (clique para retomar)"}
          </button>
        </header>
        {!aberta && <p className="aovivo-aviso">A votação das cidades está fechada. Os números abaixo são os registrados até agora.</p>}
        {ranking.length === 0 ? (
          <p className="aovivo-vazio">Nenhum município marcado como “Se apresentou” ainda.</p>
        ) : (
          <div className="aovivo-grade">
            {ranking.map((r, i) => {
              const classificada = vagas !== null && r.votos > 0 && r.posicao <= vagas;
              return (
                <Fragment key={r.credenciamento_id}>
                  <div className={`aovivo-cidade${classificada ? " classificada" : ""}`}>
                    <span className="aovivo-pos">{r.posicao}º</span>
                    <div className="aovivo-info">
                      <div className="aovivo-linha">
                        <strong>{r.municipio}</strong>
                        {classificada && <span className="selo-classificada">Classificada</span>}
                        <span className="aovivo-votos">{r.votos} {r.votos === 1 ? "voto" : "votos"} <small>({pts(r.pontos)} pts)</small></span>
                      </div>
                      <div className="aovivo-barra"><span style={{ width: `${(r.votos / max) * 100}%` }} /></div>
                    </div>
                  </div>
                  {i === ultimaClassificada && i < ranking.length - 1 && (
                    <div className="aovivo-corte"><span>Linha de corte · Circuito {ano}</span></div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
        <p className="aovivo-nota">Empate nos votos: fica na frente a cidade com mais pontos (cada voto vale de 1,0 a 1,9 conforme as exposições de quem votou).</p>
      </section>

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
        <div className="aovivo-ultimos">
          <h3><Icone nome="relogio" tamanho={18} /> Últimos expositores a votar</h3>
          {ultimos.length === 0 ? (
            <p className="suave">Ninguém votou ainda.</p>
          ) : (
            <ul>
              {ultimos.map((u, i) => (
                <li key={`${u.nome}-${i}`}><span className="hora">{u.hora}</span><span className="nome">{u.nome}</span><span className="mun">{u.municipio}</span></li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
