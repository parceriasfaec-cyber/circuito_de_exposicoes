"use client";

import Icone from "@/components/Icone";
import { limparInicioFim } from "../actions";

/** Apaga o início e o fim mostrados (só o registro do horário; as avaliações continuam). */
export default function BotaoLimpar() {
  return (
    <form
      action={limparInicioFim}
      onSubmit={(e) => {
        if (!confirm("Apagar o início e o fim da avaliação? As avaliações já feitas não são apagadas.")) e.preventDefault();
      }}
      className="horario-limpar"
    >
      <button className="botao-detalhes perigo"><Icone nome="lixeira" tamanho={16} /> Excluir início e fim</button>
    </form>
  );
}
