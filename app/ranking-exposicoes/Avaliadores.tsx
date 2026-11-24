"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LinhaAval = { codigo: string; nome: string; media: string; hora: string };
export type Etapa = { titulo: string; sub: string; linhas: LinhaAval[] };

const Ctx = createContext<(id: string) => void>(() => {});

/** Guarda a etapa aberta e mostra a janela com quem avaliou (igual à do ranking dos municípios). */
export function AvaliadoresProvider({ etapas, children }: { etapas: Record<string, Etapa>; children: ReactNode }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const e = aberta ? etapas[aberta] : null;
  useEffect(() => {
    if (!aberta) return;
    const f = (ev: KeyboardEvent) => ev.key === "Escape" && setAberta(null);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberta]);
  return (
    <Ctx.Provider value={setAberta}>
      {children}
      {e && (
        <div className="aovivo-janela-fundo" onClick={() => setAberta(null)}>
          <div className="aovivo-janela" role="dialog" aria-modal="true" aria-label={`Avaliações de ${e.titulo}`} onClick={(ev) => ev.stopPropagation()}>
            <header>
              <div><h2>{e.titulo}</h2><span>{e.sub}</span></div>
              <button type="button" onClick={() => setAberta(null)} aria-label="Fechar">×</button>
            </header>
            {e.linhas.length === 0 ? (
              <p className="aovivo-janela-vazio">Ninguém avaliou esta etapa ainda.</p>
            ) : (
              <table>
                <thead><tr><th>ID</th><th>Avaliador</th><th className="centro">Média dada</th><th className="centro">Enviada às</th></tr></thead>
                <tbody>
                  {e.linhas.map((l, i) => (
                    <tr key={`${l.codigo}-${i}`}><td>{l.codigo}</td><td>{l.nome}</td><td className="centro"><b>{l.media}</b></td><td className="centro">{l.hora}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/** Envolve um item do ranking: ao clicar, abre a janela da etapa. */
export function Clicavel({ id, className, children, como = "div" }: { id: string; className?: string; children: ReactNode; como?: "div" | "li" }) {
  const abrir = useContext(Ctx);
  const props = { className: `${className ?? ""} clicavel`.trim(), onClick: () => abrir(id), role: "button" as const, tabIndex: 0, title: "Ver quem avaliou", onKeyDown: (ev: React.KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") abrir(id); } };
  return como === "li" ? <li {...props}>{children}</li> : <div {...props}>{children}</div>;
}
