"use client";

import { useActionState, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { votarCidades, type EstadoVotoCidades } from "./actions";

type Cidade = { id: string; municipio: string; instituicao: string };
const ESCOLHAS = 2;

/**
 * Escolha das 2 cidades. Com muitas cidades, o produtor digita o nome para filtrar a lista;
 * as escolhidas ficam no topo (com X para tirar) e o botão de enviar fica sempre à vista.
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

      <div className="cidades-escolhidas" aria-live="polite">
        {Array.from({ length: ESCOLHAS }, (_, i) => {
          const c = porId.get(marcadas[i]);
          return c ? (
            <button key={c.id} type="button" className="cidade-escolhida" onClick={() => alternar(c.id)} aria-label={`Tirar ${c.municipio}`}>
              <span className="cidade-escolhida-num">{i + 1}</span>
              <strong>{c.municipio}</strong>
              <span className="cidade-escolhida-x" aria-hidden="true">×</span>
            </button>
          ) : (
            <div key={`vazia-${i}`} className="cidade-escolhida vazia">
              <span className="cidade-escolhida-num">{i + 1}</span>
              {i === 0 ? "1ª cidade" : "2ª cidade"}
            </div>
          );
        })}
      </div>

      <div className="cidades-busca">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Digite o nome da cidade (${cidades.length} cidades)`}
          aria-label="Buscar cidade"
          autoComplete="off"
        />
        {busca && (
          <button type="button" className="link" onClick={() => setBusca("")}>
            Limpar
          </button>
        )}
      </div>

      <div className="cidades-lista compacta" role="group" aria-label="Cidades credenciadas">
        {visiveis.length === 0 && <p className="suave" style={{ margin: "8px 0" }}>Nenhuma cidade com esse nome.</p>}
        {visiveis.map((c) => {
          const marcada = marcadas.includes(c.id);
          const travada = !marcada && marcadas.length >= ESCOLHAS;
          return (
            <button
              key={c.id}
              type="button"
              className={`cidade-opcao${marcada ? " marcada" : ""}${travada ? " travada" : ""}`}
              aria-pressed={marcada}
              disabled={travada}
              title={c.instituicao}
              onClick={() => alternar(c.id)}
            >
              <span className="cidade-marca" aria-hidden="true">{marcada ? "✓" : ""}</span>
              <strong>{c.municipio}</strong>
            </button>
          );
        })}
      </div>

      <div className="envio-fixo">
        {estado.erro && <div className="erro" role="alert" style={{ marginTop: 0, marginBottom: 10 }}>{estado.erro}</div>}
        <button className="botao cheio entrar" style={{ marginTop: 0 }} disabled={faltam > 0 || enviando}>
          {enviando ? "Enviando..." : faltam > 0 ? `Escolha mais ${faltam} ${faltam === 1 ? "cidade" : "cidades"}` : "Enviar meu voto"}
        </button>
      </div>
    </form>
  );
}
