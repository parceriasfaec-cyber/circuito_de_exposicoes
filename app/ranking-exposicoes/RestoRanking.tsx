"use client";

import { useState, type ReactNode } from "react";

/** Mostra o pódio; a seta troca para a lista das demais etapas (e volta), sem estourar a altura da tela. */
export default function RestoRanking({ total, podio, children }: { total: number; podio: ReactNode; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      {aberto ? null : podio}
      {total > 0 && (
        <button type="button" className={`tx-mais${aberto ? " aberto" : ""}`} onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
          {aberto ? "Voltar ao pódio" : `Ver demais etapas (${total})`}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      )}
      {aberto && children}
    </>
  );
}
