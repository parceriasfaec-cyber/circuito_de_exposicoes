"use client";

import { useState } from "react";

/** Botão para mandar o link do painel pelo WhatsApp (ou pelo menu de compartilhar do celular). */
export default function Compartilhar({ titulo }: { titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const url = () => `${window.location.origin}/indicadores`;

  const compartilhar = async () => {
    const link = url();
    const texto = `${titulo} — acompanhe ao vivo:`;
    try {
      if (navigator.share) { await navigator.share({ title: titulo, text: texto, url: link }); return; }
    } catch { return; } // a pessoa fechou o menu
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`, "_blank", "noopener");
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url()); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão */ }
  };

  return (
    <div className="ind-comp">
      <button type="button" className="ind-comp-zap" onClick={compartilhar}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.2-.4.700-1.300.1-.2 0-.3 0-.5l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.200c0 1.300.9 2.500 1 2.700.1.2 1.800 2.800 4.400 3.900 1.600.7 2.300.8 3.100.6.500-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.2-1.200-.1-.1-.3-.2-.5-.3z" /></svg>
        Compartilhar no WhatsApp
      </button>
      <button type="button" className="ind-comp-copiar" onClick={copiar}>{copiado ? "Link copiado ✓" : "Copiar link"}</button>
    </div>
  );
}
