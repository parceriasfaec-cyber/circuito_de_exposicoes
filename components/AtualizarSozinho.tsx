"use client";

import { useEffect, useState } from "react";
import { useAtualizar } from "./useAtualizar";

/** Busca os números de novo a cada `segundos` (telas de telão) e mostra um botão discreto para atualizar na hora. */
export default function AtualizarSozinho({ segundos = 20 }: { segundos?: number }) {
  const { atualizar, pendente } = useAtualizar(segundos);
  const [hora, setHora] = useState("");
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (!pendente) setManual(false);
    if (!pendente) setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [pendente]);
  return (
    <button type="button" className={`atu-btn${pendente && manual ? " girando" : ""}`} onClick={() => { setManual(true); atualizar(); }} title="Atualizar agora" aria-label="Atualizar agora">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
      </svg>
      {hora && <span>{hora}</span>}
    </button>
  );
}
