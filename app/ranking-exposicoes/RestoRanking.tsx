import type { ReactNode } from "react";

/** Ranking das etapas: o pódio e a lista das demais etapas aparecem juntos na tela (sem botão para alternar). */
export default function RestoRanking({ podio, children }: { total?: number; podio: ReactNode; children: ReactNode }) {
  return (
    <>
      {podio}
      {children}
    </>
  );
}
