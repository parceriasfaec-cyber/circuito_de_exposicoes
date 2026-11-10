"use client";

/** Botões de página (Anterior · 1 2 3 · Próxima) com a contagem "1–15 de 93". Some quando há uma página só. */
export default function Paginacao({
  pagina,
  porPagina,
  total,
  aoMudar,
  rotulo = "Páginas",
}: {
  pagina: number;
  porPagina: number;
  total: number;
  aoMudar: (p: number) => void;
  rotulo?: string;
}) {
  const paginas = Math.ceil(total / porPagina);
  if (paginas <= 1) return null;
  return (
    <nav className="paginacao" aria-label={rotulo}>
      <button type="button" className="botao secundario pequeno" disabled={pagina === 0} onClick={() => aoMudar(pagina - 1)}>
        ‹ Anterior
      </button>
      <div className="paginacao-numeros">
        {Array.from({ length: paginas }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`paginacao-num${i === pagina ? " ativa" : ""}`}
            aria-current={i === pagina ? "page" : undefined}
            onClick={() => aoMudar(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <span className="suave">
        {pagina * porPagina + 1}–{Math.min((pagina + 1) * porPagina, total)} de {total}
      </span>
      <button type="button" className="botao secundario pequeno" disabled={pagina === paginas - 1} onClick={() => aoMudar(pagina + 1)}>
        Próxima ›
      </button>
    </nav>
  );
}

/** Página válida e fatia da lista para essa página. */
export function paginar<T>(lista: T[], pagina: number, porPagina: number) {
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const atual = Math.min(pagina, paginas - 1);
  return { atual, itens: lista.slice(atual * porPagina, (atual + 1) * porPagina) };
}
