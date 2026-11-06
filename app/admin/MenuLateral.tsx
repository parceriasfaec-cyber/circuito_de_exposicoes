"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icone, { type NomeIcone } from "@/components/Icone";

const ITENS: { href: string; rotulo: string; icone: NomeIcone; novaAba?: boolean }[] = [
  { href: "/admin", rotulo: "Painel", icone: "painel" },
  { href: "/admin/exposicoes", rotulo: "Exposições", icone: "trofeu" },
  { href: "/admin/produtores", rotulo: "Produtores", icone: "usuarios" },
  { href: "/admin/avaliacoes", rotulo: "Quem já avaliou", icone: "prancheta" },
  { href: "/telao", rotulo: "Tela do telão", icone: "olho", novaAba: true },
];

export default function MenuLateral() {
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
        {ITENS.map((i) => {
          const ativo = i.href === "/admin" ? caminho === "/admin" : caminho.startsWith(i.href);
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
      </nav>

      <div className="lateral-marcas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marcas/faec-branca.png" alt="FAEC - Federação da Agricultura e Pecuária do Ceará" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marcas/senar-branca.png" alt="SENAR Ceará" />
      </div>
    </aside>
  );
}
