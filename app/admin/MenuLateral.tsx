"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icone, { type NomeIcone } from "@/components/Icone";
import { sair } from "./actions";

type Item = { href: string; rotulo: string; icone: NomeIcone; novaAba?: boolean; exato?: boolean };

type Grupo = { id: string; titulo: string; icone: NomeIcone; itens: Item[] };

/** Início solto no topo e quatro grupos recolhíveis: etapas e expositores, avaliações, votação dos municípios e telas públicas. */
const inicio: Item = { href: "/admin", rotulo: "Painel do Organizador", icone: "painel", exato: true };
const grupos: Grupo[] = [
  {
    id: "circuito", titulo: "Circuito e Expositores", icone: "trofeu",
    itens: [
      { href: "/admin/exposicoes", rotulo: "Etapas do Circuito", icone: "trofeu" },
      { href: "/admin/produtores", rotulo: "Expositores", icone: "usuarios" },
      { href: "/admin/presenca", rotulo: "Presença no evento", icone: "check" },
      { href: "/admin/ciclos", rotulo: "Anos do Circuito", icone: "calendario" },
    ],
  },
  {
    id: "avaliacoes", titulo: "Avaliações", icone: "prancheta",
    itens: [
      { href: "/admin/horario", rotulo: "Horário da Avaliação", icone: "relogio" },
      { href: "/admin/perguntas", rotulo: "Perguntas", icone: "documento" },
      { href: "/admin/diagnostico", rotulo: "Resultado das Etapas", icone: "grafico" },
      { href: "/ranking-exposicoes", rotulo: "Ranking das Avaliações", icone: "estrela", novaAba: true },
    ],
  },
  {
    id: "votacao", titulo: "Votação dos Municípios", icone: "urna",
    itens: [
      { href: "/admin/proximo", rotulo: "Painel de Votação", icone: "grafico", exato: true },
      { href: "/admin/proximo/credenciados", rotulo: "Credenciados", icone: "escudo" },
      { href: "/admin/proximo/prazos", rotulo: "Prazos do Credenciamento", icone: "calendario" },
      { href: "/ranking", rotulo: "Ranking dos Municípios", icone: "estrela", novaAba: true },
    ],
  },
  {
    id: "telas", titulo: "Telas públicas", icone: "olho",
    itens: [
      { href: "/telao", rotulo: "Tela do telão", icone: "olho", novaAba: true },
      { href: "/indicadores", rotulo: "Indicadores no celular", icone: "grafico", novaAba: true },
    ],
  },
];

const CHAVE = "menu-organizador-grupos";
const ativoEm = (i: Item, caminho: string) => (i.exato ? caminho === i.href : caminho.startsWith(i.href));

export default function MenuLateral({ anoProximo }: { anoProximo: number }) {
  void anoProximo;
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Por padrão só o grupo da página atual fica aberto; depois lembramos o que a pessoa abriu ou fechou.
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { setAbertos(JSON.parse(localStorage.getItem(CHAVE) ?? "{}")); } catch { /* sem armazenamento */ }
  }, []);
  useEffect(() => {
    const atual = grupos.find((g) => g.itens.some((i) => !i.novaAba && ativoEm(i, caminho)));
    if (atual) setAbertos((o) => (o[atual.id] ? o : { ...o, [atual.id]: true }));
  }, [caminho]);

  const alternar = (id: string, estaAberto: boolean) => {
    const novo = { ...abertos, [id]: !estaAberto };
    setAbertos(novo);
    try { localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch { /* sem armazenamento */ }
  };

  return (
    <aside className={`lateral${aberto ? " aberto" : ""}`}>
      <div className="lateral-topo">
        <Link href="/admin" className="lateral-marca" aria-label="Circuito Cearense de Exposição">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marcas/logo-circuito-largo.png" alt="Circuito Cearense de Exposição" width={953} height={394} />
        </Link>
        <button type="button" className="lateral-botao" onClick={() => setAberto((a) => !a)} aria-label="Abrir menu" aria-expanded={aberto}>
          <span /><span /><span />
        </button>
      </div>

      <nav className="lateral-menu">
        <div className="lateral-grupo">
          <Link href={inicio.href} className={ativoEm(inicio, caminho) ? "ativo" : undefined} onClick={() => setAberto(false)}>
            <Icone nome={inicio.icone} tamanho={20} />
            {inicio.rotulo}
          </Link>
        </div>
        {grupos.map((g) => {
          const estaAberto = !!abertos[g.id];
          const temAtivo = g.itens.some((i) => !i.novaAba && ativoEm(i, caminho));
          return (
            <div key={g.id} className={`lateral-grupo lateral-sanfona${estaAberto ? " aberto" : ""}${temAtivo ? " com-ativo" : ""}`}>
              <button type="button" className="lateral-cab" onClick={() => alternar(g.id, estaAberto)} aria-expanded={estaAberto} aria-controls={`menu-${g.id}`}>
                <span className="lateral-cab-ic"><Icone nome={g.icone} tamanho={18} /></span>
                <span className="lateral-cab-txt">{g.titulo}</span>
                <svg className="lateral-seta" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <div id={`menu-${g.id}`} className="lateral-sub" hidden={!estaAberto}>
                {g.itens.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={!i.novaAba && ativoEm(i, caminho) ? "ativo" : undefined}
                    target={i.novaAba ? "_blank" : undefined}
                    onClick={() => setAberto(false)}
                  >
                    <Icone nome={i.icone} tamanho={18} />
                    {i.rotulo}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        <div className="lateral-grupo">
          <form action={sair}>
            <button type="submit" className="lateral-sair">
              <Icone nome="sair" tamanho={20} />
              Sair
            </button>
          </form>
        </div>
      </nav>

      <div className="lateral-marcas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sistema" src="/marcas/sistema-todo-branco.png" alt="Sistema FAEC, SENAR Ceará e Sindicato Rural" width={900} height={331} />
      </div>
    </aside>
  );
}
