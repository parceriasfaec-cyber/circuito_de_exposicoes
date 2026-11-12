"use client";

import Icone from "@/components/Icone";
import { excluirCredenciamento } from "./actions";

export default function BotaoExcluir({ id, municipio, votos = 0 }: { id: string; municipio: string; votos?: number }) {
  if (votos > 0) {
    return (
      <button type="button" className="botao-icone perigo" disabled title={`${municipio} já recebeu ${votos} voto${votos > 1 ? "s" : ""}: não pode ser excluído`} aria-label={`${municipio} já recebeu votos e não pode ser excluído`}>
        <Icone nome="lixeira" tamanho={20} />
      </button>
    );
  }
  return (
    <form
      action={excluirCredenciamento}
      onSubmit={(e) => {
        if (!confirm(`Excluir o credenciamento de ${municipio}? O município volta para a lista do formulário.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="botao-icone perigo" title={`Excluir ${municipio}`} aria-label={`Excluir ${municipio}`}>
        <Icone nome="lixeira" tamanho={20} />
      </button>
    </form>
  );
}
