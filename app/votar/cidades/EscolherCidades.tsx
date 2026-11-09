"use client";

import { useActionState, useState } from "react";
import { votarCidades, type EstadoVotoCidades } from "./actions";

type Cidade = { id: string; municipio: string; instituicao: string };
const ESCOLHAS = 2;

export default function EscolherCidades({ cidades }: { cidades: Cidade[] }) {
  const [estado, acao, enviando] = useActionState<EstadoVotoCidades, FormData>(votarCidades, {});
  const [marcadas, setMarcadas] = useState<string[]>([]);

  function alternar(id: string) {
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.length < ESCOLHAS ? [...m, id] : m));
  }
  const faltam = ESCOLHAS - marcadas.length;

  return (
    <form action={acao}>
      <div className="cidades-lista" role="group" aria-label="Cidades credenciadas">
        {cidades.map((c) => {
          const marcada = marcadas.includes(c.id);
          const travada = !marcada && marcadas.length >= ESCOLHAS;
          return (
            <label key={c.id} className={`cidade-opcao${marcada ? " marcada" : ""}${travada ? " travada" : ""}`}>
              <input type="checkbox" name="cidade" value={c.id} checked={marcada} disabled={travada} onChange={() => alternar(c.id)} />
              <span className="cidade-marca" aria-hidden="true">{marcada ? "✓" : ""}</span>
              <span className="cidade-texto">
                <strong>{c.municipio}</strong>
                <small>{c.instituicao}</small>
              </span>
            </label>
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
