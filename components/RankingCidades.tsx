"use client";

import { useEffect, useState } from "react";
import Paginacao, { paginar } from "./Paginacao";
import type { CidadeRanking, VotanteCidade } from "@/lib/credenciamento";

const pts = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const votosTxt = (n: number) => `${n} ${n === 1 ? "voto" : "votos"}`;

/**
 * Ranking das cidades por número de votos; empate nos votos é desfeito pela pontuação de quem votou.
 * Com vagas definidas, as cidades com posição dentro das vagas aparecem como classificadas
 * (se ainda houver empate na última vaga, as empatadas aparecem classificadas e a organização decide).
 * Com `votantes` (só no painel), cada cidade vira um botão: clicando, abre a janela com quem votou nela.
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
  useEffect(() => {
    if (!aberta) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setAberta(null);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberta]);
  if (ranking.length === 0) return <p className="suave">Nenhuma cidade credenciada.</p>;
  const { atual, itens: visiveis } = porPagina ? paginar(ranking, pagina, porPagina) : { atual: 0, itens: ranking };
  // Votos iguais em mais de uma cidade: mostra a pontuação para explicar o desempate.
  const votosRepetidos = new Set(ranking.filter((r, _, l) => r.votos > 0 && l.filter((o) => o.votos === r.votos).length > 1).map((r) => r.votos));
  const escolhida = ranking.find((r) => r.credenciamento_id === aberta) ?? null;
  const deles = votantes?.filter((v) => v.credenciamento_id === aberta) ?? [];

  return (
    <>
    <div className={`ranking-cidades${votantes ? " clicavel" : ""}`}>
      {visiveis.map((r) => {
        const classificada = vagas !== null && r.votos > 0 && r.posicao <= vagas;
        const conteudo = (
          <>
            <span className="pos">{r.posicao}º</span>
            <span className="nome-linha">
              <span className="nome">{r.municipio}</span>
              {classificada && <span className="selo-classificada">Classificada</span>}
            </span>
            <span className="votos">
              {votosTxt(r.votos)}
              {(votantes || votosRepetidos.has(r.votos)) && r.votos > 0 && (
                <span className="pontos-cidade" title="Desempate: cada voto vale de 1,0 a 1,9 conforme as exposições de quem votou">{pts(r.pontos)} pts</span>
              )}
            </span>
          </>
        );
        return votantes ? (
          <button key={r.credenciamento_id} type="button" className={`ranking-cidade${classificada ? " classificada" : ""}`}
            onClick={() => setAberta(r.credenciamento_id)} title={`Ver quem votou em ${r.municipio}`}>
            {conteudo}
          </button>
        ) : (
          <div key={r.credenciamento_id} className={`ranking-cidade${classificada ? " classificada" : ""}`}>{conteudo}</div>
        );
      })}
    </div>
    {porPagina && <Paginacao pagina={atual} porPagina={porPagina} total={ranking.length} aoMudar={setPagina} rotulo="Páginas do ranking" />}

    {escolhida && (
      <div className="aovivo-janela-fundo" onClick={() => setAberta(null)}>
        <div className="aovivo-janela" role="dialog" aria-modal="true" aria-label={`Votantes de ${escolhida.municipio}`} onClick={(e) => e.stopPropagation()}>
          <header>
            <div>
              <h2>{escolhida.municipio}</h2>
              <span>{escolhida.posicao}º lugar · {votosTxt(escolhida.votos)} · {pts(escolhida.pontos)} pontos</span>
            </div>
            <button type="button" onClick={() => setAberta(null)} aria-label="Fechar">×</button>
          </header>
          {deles.length === 0 ? (
            <p className="aovivo-janela-vazio">Ninguém votou neste município ainda.</p>
          ) : (
            <table>
              <thead><tr><th>ID</th><th>Expositor</th><th>Município</th><th className="centro">Exposições</th><th className="centro">Pontos</th></tr></thead>
              <tbody>
                {deles.map((v) => (
                  <tr key={v.codigo}><td>{v.codigo}</td><td>{v.nome}</td><td>{v.municipio}</td><td className="centro">{v.exposicoes}</td><td className="centro"><b>{pts(v.peso)}</b></td></tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Total</td><td className="centro"><b>{pts(deles.reduce((s, v) => s + v.peso, 0))}</b></td></tr></tfoot>
            </table>
          )}
        </div>
      </div>
    )}
    </>
  );
}
