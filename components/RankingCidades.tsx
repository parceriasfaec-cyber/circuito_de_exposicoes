"use client";

import { useState } from "react";
import Paginacao, { paginar } from "./Paginacao";
import type { CidadeRanking, VotanteCidade } from "@/lib/credenciamento";

const pts = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Ranking das cidades por número de votos; empate nos votos é desfeito pela pontuação de quem votou.
 * Com vagas definidas, as cidades com posição dentro das vagas aparecem como classificadas
 * (se ainda houver empate na última vaga, as empatadas aparecem classificadas e a organização decide).
 * Com `votantes` (só no painel), cada cidade ganha o botão para ver quem votou nela.
 */
export default function RankingCidades({
  ranking,
  vagas,
  porPagina,
  votantes,
}: {
  ranking: CidadeRanking[];
  vagas: number | null;
  /** Com valor, mostra a lista em páginas. Sem valor, mostra todas. */
  porPagina?: number;
  votantes?: VotanteCidade[];
}) {
  const [pagina, setPagina] = useState(0);
  const [aberta, setAberta] = useState<string | null>(null);
  if (ranking.length === 0) return <p className="suave">Nenhuma cidade credenciada.</p>;
  const max = Math.max(1, ...ranking.map((r) => r.votos));
  const { atual, itens: visiveis } = porPagina ? paginar(ranking, pagina, porPagina) : { atual: 0, itens: ranking };
  // Votos iguais em mais de uma cidade: mostra a pontuação para explicar o desempate.
  const votosRepetidos = new Set(ranking.filter((r, _, l) => r.votos > 0 && l.filter((o) => o.votos === r.votos).length > 1).map((r) => r.votos));
  return (
    <>
    <div className="ranking-cidades">
      {visiveis.map((r) => {
        const classificada = vagas !== null && r.votos > 0 && r.posicao <= vagas;
        const deles = votantes?.filter((v) => v.credenciamento_id === r.credenciamento_id) ?? [];
        const mostrando = aberta === r.credenciamento_id;
        return (
          <div key={r.credenciamento_id} className={`ranking-cidade${classificada ? " classificada" : ""}`}>
            <span className="pos">{r.posicao}º</span>
            <div>
              <span className="nome">{r.municipio}</span>
              {classificada && <span className="selo-classificada">Classificada</span>}
              <div className="suave" style={{ fontSize: "0.85rem" }}>{r.instituicao}</div>
              <div className="barra-votos"><span style={{ width: `${(r.votos / max) * 100}%` }} /></div>
              {votantes && r.votos > 0 && (
                <button type="button" className="link-votantes" onClick={() => setAberta(mostrando ? null : r.credenciamento_id)} aria-expanded={mostrando}>
                  {mostrando ? "Esconder votantes" : `Ver votantes (${deles.length})`}
                </button>
              )}
              {mostrando && (
                <table className="votantes-cidade">
                  <thead>
                    <tr><th>ID</th><th>Expositor</th><th>Município</th><th className="centro">Exposições</th><th className="centro">Pontos</th></tr>
                  </thead>
                  <tbody>
                    {deles.map((v) => (
                      <tr key={v.codigo}>
                        <td>{v.codigo}</td>
                        <td>{v.nome}</td>
                        <td>{v.municipio}</td>
                        <td className="centro">{v.exposicoes}</td>
                        <td className="centro">{pts(v.peso)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <span className="votos">
              {r.votos} {r.votos === 1 ? "voto" : "votos"}
              {(votantes || votosRepetidos.has(r.votos)) && r.votos > 0 && (
                <span className="pontos-cidade" title="Desempate: cada voto vale de 1,0 a 1,9 conforme as exposições de quem votou">{pts(r.pontos)} pts</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
    {porPagina && <Paginacao pagina={atual} porPagina={porPagina} total={ranking.length} aoMudar={setPagina} rotulo="Páginas do ranking" />}
    </>
  );
}
