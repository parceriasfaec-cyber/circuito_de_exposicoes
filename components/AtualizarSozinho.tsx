"use client";

import { useAtualizar } from "./useAtualizar";

/** Busca os números de novo a cada `segundos`, sem recarregar a página (telas de telão). */
export default function AtualizarSozinho({ segundos = 20 }: { segundos?: number }) {
  useAtualizar(segundos);
  return null;
}
