"use client";

import { useState } from "react";

/** Mostra as 3 primeiras exposições; o botão "+N" abre as demais e "−" recolhe. */
export default function ChipsExposicoes({ exposicoes, limite = 3 }: { exposicoes: string[]; limite?: number }) {
  const [aberto, setAberto] = useState(false);
  const visiveis = aberto ? exposicoes : exposicoes.slice(0, limite);
  const resto = exposicoes.length - limite;
  return (
    <div className={`prod-chips${aberto ? " aberto" : ""}`}>
      {visiveis.map((e, i) => <span key={i} className="prod-chip">{e}</span>)}
      {resto > 0 && (
        <button type="button" className="prod-mais-chip" onClick={() => setAberto(!aberto)} aria-expanded={aberto} title={aberto ? "Mostrar menos" : `Mostrar mais ${resto}`}>
          {aberto ? "−" : `+${resto}`}
        </button>
      )}
    </div>
  );
}
