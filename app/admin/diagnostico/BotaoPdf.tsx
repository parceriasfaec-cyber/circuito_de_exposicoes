"use client";

import { useEffect } from "react";
import Icone from "@/components/Icone";

/** Abre a janela de impressão com o nome do arquivo já preenchido (o usuário escolhe "Salvar como PDF"). */
function imprimir(arquivo: string) {
  const antes = document.title;
  document.title = arquivo;
  window.print();
  document.title = antes;
}

/**
 * Botão de PDF. Com `href`, leva para a página com todas as exposições, que já abre a impressão sozinha;
 * sem `href`, imprime a página atual.
 */
export default function BotaoPdf({ arquivo, rotulo, href, secundario }: { arquivo: string; rotulo: string; href?: string; secundario?: boolean }) {
  const classe = `botao com-icone pequeno nao-imprimir${secundario ? " secundario" : ""}`;
  if (href) {
    return <a className={classe} href={href}><Icone nome="documento" tamanho={18} /> {rotulo}</a>;
  }
  return (
    <button type="button" className={classe} onClick={() => imprimir(arquivo)}>
      <Icone nome="documento" tamanho={18} /> {rotulo}
    </button>
  );
}

/** Na página com todas as exposições aberta pelo botão "PDF de todas", abre a impressão assim que carrega. */
export function ImprimirAoAbrir({ arquivo }: { arquivo: string }) {
  useEffect(() => {
    let cancelado = false;
    // Espera as imagens (logos e fotos das exposições) carregarem para não saírem em branco no PDF.
    const carregadas = Promise.all(
      Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((ok) => { i.onload = i.onerror = ok; })),
    );
    const t = setTimeout(() => {
      Promise.race([carregadas, new Promise((ok) => setTimeout(ok, 4000))]).then(() => { if (!cancelado) imprimir(arquivo); });
    }, 600);
    return () => { cancelado = true; clearTimeout(t); };
  }, [arquivo]);
  return null;
}
