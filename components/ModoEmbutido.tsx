"use client";

import { useEffect } from "react";

/** Quando a página está aberta dentro de uma janela (iframe), esconde o menu e avisa a página de fora ao salvar. */
export default function ModoEmbutido({ salvo = false }: { salvo?: boolean }) {
  useEffect(() => {
    if (window.self === window.top) return;
    document.documentElement.classList.add("embutido");
    if (salvo) window.parent.postMessage({ tipo: "produtor-salvo" }, window.location.origin);
  }, [salvo]);
  return null;
}
