/* Ícones de traço simples (24x24), usados nas telas do organizador. */

const caminhos: Record<string, React.ReactNode> = {
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  usuarios: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><circle cx="17" cy="9" r="2.8" /><path d="M16 14.6c3 0 5.5 1.7 5.5 4.9" /></>,
  prancheta: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M8.5 13l2.5 2.5 4.5-5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCirculo: <><circle cx="12" cy="12" r="9" /><path d="M7.5 12.5l3 3 6-6.5" /></>,
  proibido: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>,
  alerta: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16.5v.5" /></>,
  atualizar: <><path d="M20 11a8 8 0 0 0-14.3-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.3 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  busca: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  local: <><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  grafico: <><path d="M5 20V12" /><path d="M10 20V7" /><path d="M15 20v-9" /><path d="M20 20V4" /></>,
  trofeu: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4" /><path d="M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4" /><path d="M8.5 20h7" /><path d="M10 17h4v3h-4z" /></>,
  olho: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  voltar: <><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></>,
  esquerda: <path d="M15 5l-7 7 7 7" />,
  direita: <path d="M9 5l7 7-7 7" />,
  painel: <><rect x="3.5" y="3.5" width="7" height="8" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="5" rx="1.5" /><rect x="13.5" y="11.5" width="7" height="9" rx="1.5" /><rect x="3.5" y="14.5" width="7" height="6" rx="1.5" /></>,
  engrenagem: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  lapis: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  usuarioCheio: <><circle cx="12" cy="7.5" r="4.2" fill="currentColor" stroke="none" /><path d="M3.5 21c0-4.6 3.9-7.5 8.5-7.5s8.5 2.9 8.5 7.5z" fill="currentColor" stroke="none" /></>,
  calendario: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" strokeWidth="3" /></>,
  documento: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>,
  entrar: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M3 12h11" /><path d="M10 8l4 4-4 4" /></>,
  estrela:<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z" />,
};

export type NomeIcone = keyof typeof caminhos;

export default function Icone({ nome, tamanho = 20, className }: { nome: NomeIcone; tamanho?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {caminhos[nome]}
    </svg>
  );
}
