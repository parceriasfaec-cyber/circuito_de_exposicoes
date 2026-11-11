"use client";

import { useActionState } from "react";
import Icone from "@/components/Icone";
import { entrar, type EstadoEntrada } from "./actions";

/** Entrada do expositor: só o ID de 5 números que a organização entrega. */
export default function Identificacao({ destino }: { destino: "inicio" | "avaliar" | "votar" }) {
  const [estado, acao, enviando] = useActionState<EstadoEntrada, FormData>(entrar, {});

  return (
    <form action={acao} className="form-voto">
      <input type="hidden" name="destino" value={destino} />

      <div className="campo-icone">
        <span className="bolha"><Icone nome="usuarioCheio" tamanho={30} /></span>
        <div>
          <label htmlFor="id_expositor">Seu ID</label>
          <input
            id="id_expositor"
            name="id_expositor"
            className="campo-id"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            autoComplete="off"
            placeholder="5 números"
            required
            onInput={(e) => (e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 5))}
          />
        </div>
      </div>

      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}

      <button className="botao cheio entrar" disabled={enviando}>
        <Icone nome="entrar" tamanho={26} /> {enviando ? "Conferindo..." : "Entrar"}
      </button>

      <p className="nota-info">
        <i className="i">i</i>
        <span>Digite o <strong>ID de 5 números</strong> que você recebeu da organização. Não sabe o seu ID? Procure a organização.</span>
      </p>
    </form>
  );
}
