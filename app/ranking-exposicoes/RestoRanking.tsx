"use client";

import { useState, type ReactNode } from "react";

/** Esconde as demais etapas; uma seta mostra ou recolhe a lista. */
export default function RestoRanking({ total, children }: { total: number; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  if (total === 0) return null;
  return (
    <>
      <button type="button" className={`tx-mais${aberto ? " aberto" : ""}`} onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
        {aberto ? "Ocultar demais etapas" : `Ver demais etapas (${total})`}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {aberto && children}
    </>
  );
}
