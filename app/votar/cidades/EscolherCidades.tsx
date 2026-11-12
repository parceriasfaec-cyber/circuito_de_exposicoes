"use client";

import { useActionState, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { votarCidades, type EstadoVotoCidades } from "./actions";

type Cidade = { id: string; municipio: string; instituicao: string };
const ESCOLHAS = 2;

/**
 * Escolha dos 2 municípios: contador no topo, busca por nome e a lista com todos os municípios,
 * compacta, que rola dentro do quadro; o botão de enviar fica sempre à vista.
 */
export default function EscolherCidades({ cidades }: { cidades: Cidade[] }) {
  const [estado, acao, enviando] = useActionState<EstadoVotoCidades, FormData>(votarCidades, {});
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [busca, setBusca] = useState("");

  function alternar(id: string) {
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.length < ESCOLHAS ? [...m, id] : m));
  }
  const faltam = ESCOLHAS - marcadas.length;
  const porId = useMemo(() => new Map(cidades.map((c) => [c.id, c])), [cidades]);

  const visiveis = useMemo(() => {
    const q = normalizar(busca);
    return q ? cidades.filter((c) => normalizar(c.municipio).includes(q)) : cidades;
  }, [cidades, busca]);

  return (
    <form action={acao} className="form-cidades">
      {/* As escolhidas vão como campos escondidos: continuam no voto mesmo se a busca esconder a cidade. */}
      {marcadas.map((id) => <input key={id} type="hidden" name="cidade" value={id} />)}

      <div className="cidades-contador" aria-live="polite">
        <span className="cidades-contador-icone" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>
        </span>
        <div className="cidades-contador-corpo">
          <span>Exposições selecionadas</span>
          <div className="cidades-contador-barra"><span style={{ width: `${(marcadas.length / ESCOLHAS) * 100}%` }} /></div>
        </div>
        <div className="cidades-contador-num">
          <strong>{marcadas.length} / {ESCOLHAS}</strong>
          <small>{faltam === 0 ? "Pronto para enviar" : `Falta${faltam > 1 ? "m" : ""} ${faltam} voto${faltam > 1 ? "s" : ""}`}</small>
        </div>
        <div className="cidades-escolhidas-linha">
          {marcadas.length === 0 ? (
            <span className="cidades-escolhidas-vazio">Toque nas exposições da lista para escolher.</span>
          ) : (
            marcadas.map((id, i) => {
              const c = porId.get(id);
              return c ? (
                <button key={id} type="button" className="cidade-chip" onClick={() => alternar(id)} aria-label={`Tirar ${c.municipio}`} title="Tocar para tirar">
                  <span className="cidade-chip-num">{i + 1}</span>
                  {c.municipio}
                  <span className="cidade-chip-x" aria-hidden="true">×</span>
                </button>
              ) : null;
            })
          )}
          {marcadas.length > 0 && <span className="cidades-escolhidas-dica">Errou? Toque no × para tirar.</span>}
        </div>
      </div>

      <div className="cidades-busca">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar município..." aria-label="Buscar município" autoComplete="off" />
      </div>

      <div className="cidades-filtros">
        <span className="cidades-total">{cidades.length} opções</span>
      </div>

      <div className="cidades-lista linhas" role="group" aria-label="Municípios credenciados">
        {visiveis.length === 0 && <p className="suave" style={{ margin: "12px 14px" }}>Nenhum município encontrado.</p>}
        {visiveis.map((c) => {
          const marcada = marcadas.includes(c.id);
          const travada = !marcada && marcadas.length >= ESCOLHAS;
          return (
            <button
              key={c.id}
              type="button"
              className={`cidade-linha${marcada ? " marcada" : ""}${travada ? " travada" : ""}`}
              aria-pressed={marcada}
              disabled={travada}
              onClick={() => alternar(c.id)}
            >
              <span className="cidade-caixa" aria-hidden="true">{marcada ? "✓" : ""}</span>
              <span className="cidade-linha-texto">
                <strong>{c.municipio}</strong>
                <small>{c.instituicao}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="envio-fixo cidades-envio">
        {estado.erro && <div className="erro" role="alert" style={{ marginTop: 0, marginBottom: 10 }}>{estado.erro}</div>}
        <div className="cidades-envio-linha">
          <span className="cidades-envio-aviso">
            {faltam === 0 ? "Tudo certo! Toque em Enviar." : `Você ainda pode escolher mais ${faltam} município${faltam > 1 ? "s" : ""}.`}
          </span>
          <button className="botao" disabled={faltam > 0 || enviando}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
            {enviando ? "Enviando..." : "Enviar meu voto"}
          </button>
        </div>
      </div>
    </form>
  );
}
