"use client";

import { useState } from "react";
import Paginacao, { paginar } from "./Paginacao";
import type { CidadeRanking } from "@/lib/credenciamento";

/**
 * Ranking das cidades por número de votos. Com vagas definidas, as cidades com posição dentro das vagas
 * aparecem como classificadas (empate na última vaga classifica as empatadas e precisa ser decidido pela organização).
 */
export default function RankingCidades({
  ranking,
  vagas,
  porPagina,
}: {
  ranking: CidadeRanking[];
  vagas: number | null;
  /** Com valor, mostra a lista em páginas. Sem valor, mostra todas. */
  porPagina?: number;
}) {
  const [pagina, setPagina] = useState(0);
  if (ranking.length === 0) return <p className="suave">Nenhuma cidade credenciada.</p>;
  const max = Math.max(1, ...ranking.map((r) => r.votos));
  const { atual, itens: visiveis } = porPagina ? paginar(ranking, pagina, porPagina) : { atual: 0, itens: ranking };
  return (
    <>
    <div className="ranking-cidades">
      {visiveis.map((r) => {
        const classificada = vagas !== null && r.votos > 0 && r.posicao <= vagas;
        return (
          <div key={r.municipio} className={`ranking-cidade${classificada ? " classificada" : ""}`}>
            <span className="pos">{r.posicao}º</span>
            <div>
              <span className="nome">{r.municipio}</span>
              {classificada && <span className="selo-classificada">Classificada</span>}
              <div className="suave" style={{ fontSize: "0.85rem" }}>{r.instituicao}</div>
              <div className="barra-votos"><span style={{ width: `${(r.votos / max) * 100}%` }} /></div>
            </div>
            <span className="votos">{r.votos} {r.votos === 1 ? "voto" : "votos"}</span>
          </div>
        );
      })}
    </div>
    {porPagina && <Paginacao pagina={atual} porPagina={porPagina} total={ranking.length} aoMudar={setPagina} rotulo="Páginas do ranking" />}
    </>
  );
}
