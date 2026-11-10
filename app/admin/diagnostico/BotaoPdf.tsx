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
    const t = setTimeout(() => imprimir(arquivo), 600);
    return () => clearTimeout(t);
  }, [arquivo]);
  return null;
}
