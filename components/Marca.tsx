/* Elementos visuais do Circuito: topo, logo em texto, faixa de título, ícones e rodapé. */
import Icone, { type NomeIcone } from "./Icone";

export function IconeFolha({ tamanho = 40 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 14c10 0 17 6 18 22C14 34 6 27 6 14z" fill="#7cc242" />
      <path d="M42 8C30 8 21 16 24 36c11-3 18-12 18-28z" fill="#f28c28" />
      <path d="M9 18l15 18L40 12" fill="none" stroke="#1d5e2c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconeBoi({ tamanho = 44 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 14c-6 0-10 4-10 9 4-1 7-1 10 1" />
      <path d="M48 14c6 0 10 4 10 9-4-1-7-1-10 1" />
      <path d="M16 20c0-4 7-7 16-7s16 3 16 7l-2 12c-1 6-2 11-6 15-2 3-5 5-8 5s-6-2-8-5c-4-4-5-9-6-15z" />
      <path d="M8 26c3 4 6 5 9 5M56 26c-3 4-6 5-9 5" />
      <ellipse cx="32" cy="47" rx="7" ry="5" />
      <circle cx="29.5" cy="47" r="0.8" fill="currentColor" />
      <circle cx="34.5" cy="47" r="0.8" fill="currentColor" />
      <circle cx="25" cy="30" r="1.4" fill="currentColor" />
      <circle cx="39" cy="30" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconeUrna() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 32h44v22H10z" />
      <path d="M10 32l5-8h34l5 8" />
      <path d="M22 26l6-16 14 5-4 11" />
      <path d="M27 17l4 3 5-7" />
      <path d="M10 40h44" />
    </svg>
  );
}

export function IconeAlerta({ sucesso = false }: { sucesso?: boolean }) {
  return (
    <span className={`icone-alerta${sucesso ? " sucesso" : ""}`} aria-hidden="true">{sucesso ? "✓" : "!"}</span>
  );
}

export function Topo() {
  return (
    <header className="topo-claro">
      <div className="topo-claro-marcas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sistema" src="/marcas/sistema-cor.png" alt="Sistema FAEC, SENAR Ceará e Sindicato Rural" width={900} height={331} />
        <span className="topo-claro-sep" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="circuito" src="/marcas/logo-circuito-largo.png" alt="Circuito Cearense de Exposição" width={953} height={394} />
      </div>
      <span className="topo-claro-titulo">Circuito Cearense de Exposição Agropecuária</span>
      <svg className="topo-claro-onda" viewBox="0 0 900 200" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 150 C 260 140, 560 70, 900 0 L900 34 C 600 92, 300 148, 0 156 Z" fill="#7cc242" />
        <path d="M200 156 C 460 146, 700 90, 900 34 L900 70 C 720 110, 480 150, 200 156 Z" fill="#2a7a3b" />
      </svg>
    </header>
  );
}

export function LogoCircuito({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className={`logo-faixa${compacto ? " compacto" : ""}`}>
      <span className="logo-linha" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-img" src="/marcas/logo-circuito-largo.png" alt="Circuito Cearense de Exposição" width={953} height={394} />
      <span className="logo-linha" />
    </div>
  );
}

export function FaixaTitulo({ children, icone }: { children: React.ReactNode; icone?: NomeIcone }) {
  return (
    <h1 className="faixa-titulo">
      {icone && <Icone nome={icone} tamanho={30} />}
      {children}
    </h1>
  );
}

export function Aviso({ titulo, sucesso = false, children }: { titulo: string; sucesso?: boolean; children: React.ReactNode }) {
  return (
    <div className="aviso">
      <div className="aviso-urna"><IconeUrna /></div>
      <span className="aviso-sep" />
      <div className="aviso-texto">
        <div className="aviso-titulo"><IconeAlerta sucesso={sucesso} /><strong>{titulo}</strong></div>
        <div className="aviso-corpo">{children}</div>
      </div>
    </div>
  );
}

/** Cabeçalho das telas do organizador: logo à esquerda, ícone + título + subtítulo ao lado. */
export function CabecalhoPagina({ icone, titulo, subtitulo }: { icone: NomeIcone; titulo: string; subtitulo?: string }) {
  return (
    <div className="cab-pagina">
      <div className="cab-logo"><LogoCircuito compacto /></div>
      <span className="cab-sep" />
      <div className="cab-titulo">
        <span className="cab-icone"><Icone nome={icone} tamanho={34} /></span>
        <div>
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
      </div>
    </div>
  );
}

export function Rodape() {
  return (
    <footer className="rodape">
      <svg className="rodape-onda" viewBox="0 0 1600 140" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30 C 380 110, 900 120, 1600 20 L1600 140 L0 140 Z" fill="#a8d672" />
        <path d="M0 62 C 420 130, 980 128, 1600 48 L1600 140 L0 140 Z" fill="#7cc242" />
        <path d="M0 84 C 460 140, 1020 134, 1600 70 L1600 140 L0 140 Z" fill="#1d5e2c" />
      </svg>
      <div className="rodape-faixa">
        <span className="rodape-frase">Juntos pelo desenvolvimento do nosso campo.</span>
      </div>
    </footer>
  );
}
