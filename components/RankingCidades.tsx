import type { CidadeRanking } from "@/lib/credenciamento";

/**
 * Ranking das cidades por número de votos. Com vagas definidas, as cidades com posição dentro das vagas
 * aparecem como classificadas (empate na última vaga classifica as empatadas e precisa ser decidido pela organização).
 */
export default function RankingCidades({ ranking, vagas }: { ranking: CidadeRanking[]; vagas: number | null }) {
  if (ranking.length === 0) return <p className="suave">Nenhuma cidade credenciada.</p>;
  const max = Math.max(1, ...ranking.map((r) => r.votos));
  return (
    <div className="ranking-cidades">
      {ranking.map((r) => {
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
  );
}

/** Há empate na última vaga? (duas ou mais cidades na mesma posição ocupando a fronteira das vagas) */
export function empateNaVaga(ranking: CidadeRanking[], vagas: number | null) {
  if (!vagas) return false;
  const dentro = ranking.filter((r) => r.votos > 0 && r.posicao <= vagas);
  return dentro.length > vagas;
}
