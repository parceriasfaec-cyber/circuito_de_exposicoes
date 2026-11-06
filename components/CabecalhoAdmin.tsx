import { Suspense } from "react";
import { sair } from "@/app/admin/actions";
import type { Ciclo } from "@/lib/ciclo";
import { adminLogado } from "@/lib/sessao";
import Icone from "./Icone";
import SeletorCiclo from "./SeletorCiclo";

/** Faixa do topo das telas do organizador: título, subtítulo, seletor de ciclo e quem está logado. */
export default async function CabecalhoAdmin({
  titulo,
  subtitulo,
  ciclos,
  ciclo,
}: {
  titulo: string;
  subtitulo?: string;
  ciclos?: Ciclo[];
  ciclo?: Ciclo | null;
}) {
  const admin = await adminLogado();
  return (
    <header className="admin-cab">
      <div className="admin-cab-texto">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      <div className="admin-cab-dir">
        {ciclos && ciclo && (
          <Suspense>
            <SeletorCiclo ciclos={ciclos} atual={ciclo.id} />
          </Suspense>
        )}
        {admin && (
          <details className="usuario-menu">
            <summary>
              <Icone nome="usuario" tamanho={18} />
              Olá, {admin.nome.split(" ")[0]}
            </summary>
            <div className="usuario-menu-lista">
              <div className="suave" style={{ padding: "4px 10px 8px" }}>{admin.nome}<br />usuário: {admin.usuario}</div>
              <form action={sair}><button className="link" style={{ padding: "4px 10px" }}>Sair</button></form>
            </div>
          </details>
        )}
      </div>
      <svg className="admin-cab-onda" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M120 120 C 220 100, 300 70, 400 20 L400 120 Z" fill="#7cc242" opacity="0.35" />
        <path d="M200 120 C 280 105, 340 85, 400 55 L400 120 Z" fill="#2a7a3b" opacity="0.55" />
      </svg>
    </header>
  );
}
