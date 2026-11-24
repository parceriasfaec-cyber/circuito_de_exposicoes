"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Busca os números de novo a cada `segundos`, sem recarregar a página (telas de telão). */
export default function AtualizarSozinho({ segundos = 20 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) router.refresh(); }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
