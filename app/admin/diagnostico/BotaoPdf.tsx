"use client";

import Icone from "@/components/Icone";

/**
 * Gera o PDF da avaliação da exposição escolhida: abre a janela de impressão já com o nome do arquivo
 * (escolha "Salvar como PDF"). A página impressa esconde menu e botões e mantém as cores.
 */
export default function BotaoPdf({ arquivo }: { arquivo: string }) {
  return (
    <button
      type="button"
      className="botao com-icone diag-pdf nao-imprimir"
      onClick={() => {
        const antes = document.title;
        document.title = arquivo;
        window.print();
        document.title = antes;
      }}
    >
      <Icone nome="documento" tamanho={18} /> Gerar PDF
    </button>
  );
}
