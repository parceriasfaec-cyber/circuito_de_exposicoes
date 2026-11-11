"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icone, { type NomeIcone } from "@/components/Icone";
import { sair } from "./actions";

type Item = { href: string; rotulo: string; icone: NomeIcone; novaAba?: boolean; exato?: boolean };

/** Dois blocos: a avaliação das exposições do ciclo atual e as exposições do próximo ano (credenciamento e votação das cidades). */
const grupos = (ano: number): { titulo: string; itens: Item[] }[] => [
  {
    titulo: "Avaliação das exposições",
    itens: [
      { href: "/admin", rotulo: "Painel", icone: "painel", exato: true },
      { href: "/admin/horario", rotulo: "Prazo e horário", icone: "calendario" },
      { href: "/admin/ciclos", rotulo: "Ciclos", icone: "calendario" },
      { href: "/admin/exposicoes", rotulo: "Exposições", icone: "trofeu" },
      { href: "/admin/produtores", rotulo: "Expositores", icone: "usuarios" },
      { href: "/admin/perguntas", rotulo: "Perguntas", icone: "documento" },
      { href: "/admin/avaliacoes", rotulo: "Quem já avaliou", icone: "prancheta" },
      { href: "/admin/diagnostico", rotulo: "Avaliação por Circuito", icone: "alerta" },
    ],
  },
  {
    titulo: `Exposições ${ano}`,
    itens: [
      { href: "/admin/proximo", rotulo: `Painel ${ano}`, icone: "grafico", exato: true },
      { href: "/admin/proximo/credenciados", rotulo: "Credenciados", icone: "local" },
      { href: "/admin/proximo/prazos", rotulo: "Prazos", icone: "calendario" },
    ],
  },
  {
    titulo: "",
    itens: [{ href: "/telao", rotulo: "Tela do telão", icone: "olho", novaAba: true }],
  },
];

export default function MenuLateral({ anoProximo }: { anoProximo: number }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);

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
        {grupos(anoProximo).map((g, n) => (
          <div key={n} className="lateral-grupo">
            {g.titulo && <span className="lateral-grupo-titulo">{g.titulo}</span>}
            {g.itens.map((i) => {
              const ativo = i.exato ? caminho === i.href : caminho.startsWith(i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={ativo ? "ativo" : undefined}
                  target={i.novaAba ? "_blank" : undefined}
                  onClick={() => setAberto(false)}
                >
                  <Icone nome={i.icone} tamanho={20} />
                  {i.rotulo}
                </Link>
              );
            })}
          </div>
        ))}
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
