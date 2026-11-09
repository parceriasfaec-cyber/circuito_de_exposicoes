"use client";

import { excluirCredenciamento } from "./actions";

export default function BotaoExcluir({ id, municipio }: { id: string; municipio: string }) {
  return (
    <form
      action={excluirCredenciamento}
      onSubmit={(e) => {
        if (!confirm(`Excluir o credenciamento de ${municipio}? O município volta para a lista do formulário.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="botao-detalhes perigo">Excluir</button>
    </form>
  );
}
