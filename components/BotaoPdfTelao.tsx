"use client";

import Icone from "@/components/Icone";

/** Abre a impressão em A4 horizontal; no diálogo, escolha "Salvar como PDF". */
export default function BotaoPdfTelao({ arquivo = "cartaz-qrcode-circuito" }: { arquivo?: string }) {
  function baixar() {
    const estilo = document.createElement("style");
    estilo.textContent = "@page { size: A4 landscape; margin: 0; }";
    document.head.appendChild(estilo);
    const antes = document.title;
    document.title = arquivo;
    const limpar = () => {
      estilo.remove();
      document.title = antes;
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    window.print();
  }
  return (
    <button type="button" className="botao com-icone pequeno nao-imprimir telao-pdf" onClick={baixar} title="Baixar o cartaz em PDF, na horizontal">
      <Icone nome="documento" tamanho={18} /> Baixar PDF (horizontal)
    </button>
  );
}
