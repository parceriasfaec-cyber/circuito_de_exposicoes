"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

/**
 * Atualiza os números da tela a cada `segundos`, sem recarregar. Não pede outra atualização enquanto a anterior ainda
 * não terminou (evita empilhar pedidos quando o servidor está lento) e para quando a aba está escondida.
 * Devolve `atualizar` (atualização manual) e `pendente` (true enquanto busca).
 */
export function useAtualizar(segundos: number, ativo = true) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const ocupado = useRef(false);
  ocupado.current = pendente;
  const atualizar = useCallback(() => {
    if (ocupado.current) return;
    iniciar(() => router.refresh());
  }, [router]);
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => {
      if (document.hidden || ocupado.current) return;
      iniciar(() => router.refresh());
    }, segundos * 1000);
    return () => clearInterval(t);
  }, [ativo, segundos, router]);
  return { atualizar, pendente };
}
