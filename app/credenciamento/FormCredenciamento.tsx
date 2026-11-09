"use client";

import { useActionState } from "react";
import type { Municipio } from "@/lib/credenciamento";
import { credenciar, type EstadoCredenciamento } from "./actions";

export default function FormCredenciamento({ municipios, ano }: { municipios: Municipio[]; ano: number }) {
  const [estado, acao, enviando] = useActionState<EstadoCredenciamento, FormData>(credenciar, {});
  const min = `${ano}-01-01`;
  const max = `${ano}-12-31`;

  return (
    <form action={acao} className="form-credenciamento">
      <label htmlFor="municipio">Município que deseja participar</label>
      <select id="municipio" name="municipio" required defaultValue="">
        <option value="" disabled>Escolha o município</option>
        {municipios.map((m) => (
          <option key={m.codigo} value={m.codigo}>{m.nome}</option>
        ))}
      </select>
      <p className="dica">Só aparecem os municípios que ainda não participam do Circuito e ainda não se credenciaram.</p>

      <label htmlFor="instituicao">Nome da prefeitura ou associação</label>
      <input id="instituicao" name="instituicao" type="text" maxLength={150} required placeholder="Ex.: Prefeitura Municipal de ..." />

      <label htmlFor="responsavel">Nome do responsável</label>
      <input id="responsavel" name="responsavel" type="text" maxLength={150} autoComplete="name" required />

      <div className="form-grade">
        <div>
          <label htmlFor="cpf">CPF</label>
          <input id="cpf" name="cpf" type="text" inputMode="numeric" maxLength={14} autoComplete="off" required placeholder="Só os números" />
        </div>
        <div>
          <label htmlFor="funcao">Função</label>
          <input id="funcao" name="funcao" type="text" maxLength={100} required placeholder="Ex.: Secretário de Agricultura" />
        </div>
      </div>

      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" maxLength={150} autoComplete="email" required />

      {(["1", "2"] as const).map((n) => (
        <fieldset key={n} className="periodo">
          <legend>Período 0{n} que deseja participar</legend>
          <div className="form-grade">
            <div>
              <label htmlFor={`periodo${n}_inicio`}>Início</label>
              <input id={`periodo${n}_inicio`} name={`periodo${n}_inicio`} type="date" min={min} max={max} required />
            </div>
            <div>
              <label htmlFor={`periodo${n}_fim`}>Fim</label>
              <input id={`periodo${n}_fim`} name={`periodo${n}_fim`} type="date" min={min} max={max} required />
            </div>
          </div>
        </fieldset>
      ))}

      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}
      <button className="botao cheio" disabled={enviando}>{enviando ? "Enviando..." : "Enviar credenciamento"}</button>
    </form>
  );
}
