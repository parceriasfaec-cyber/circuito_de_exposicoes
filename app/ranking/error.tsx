"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Se a consulta ao banco falhar, o telão não fica com a tela de erro: tenta de novo sozinho em 4 s. */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => { router.refresh(); reset(); }, 4000);
    return () => clearTimeout(t);
  }, [reset, router]);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f4a24", color: "#fff", font: "600 20px system-ui" }}>
      Atualizando os números…
    </div>
  );
}
