"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Ciclo = { id: string; nome: string; ativo: boolean };

/** Escolhe de qual ciclo (ano) a tela mostra os dados. Guarda a escolha no endereço (?ciclo=). */
export default function SeletorCiclo({ ciclos, atual }: { ciclos: Ciclo[]; atual: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();

  return (
    <label className="seletor-ciclo">
      <span>Ciclo</span>
      <select
        value={atual}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          sp.set("ciclo", e.target.value);
          sp.delete("pagina");
          router.push(`${caminho}?${sp}`);
        }}
      >
        {ciclos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}{c.ativo ? " (ativo)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
