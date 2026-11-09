"use client";

import { useActionState } from "react";
import type { Municipio } from "@/lib/credenciamento";
import { maiusculaInicial } from "@/lib/texto";

/** Ao sair do campo: primeira letra de cada palavra em maiúscula e as demais em minúscula. */
const ajustar = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.value = maiusculaInicial(e.currentTarget.value);
};
import { credenciar, type EstadoCredenciamento } from "./actions";

export default function FormCredenciamento({ municipios, ano }: { municipios: Municipio[]; ano: number }) {
  const [estado, acao, enviando] = useActionState<EstadoCredenciamento, FormData>(credenciar, {});
  const min = `${ano}-01-01`;
  const max = `${ano}-12-31`;

  return (
    <form action={acao} className="form-credenciamento">
      <div className="cred-campos">
        <div>
          <label htmlFor="municipio">Município que deseja participar</label>
          <select id="municipio" name="municipio" required defaultValue="" title="Só aparecem os municípios que ainda não participam do Circuito e ainda não se credenciaram.">
            <option value="" disabled>Escolha o município</option>
            {municipios.map((m) => (
              <option key={m.codigo} value={m.codigo}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="instituicao">Prefeitura ou associação</label>
          <input id="instituicao" name="instituicao" type="text" maxLength={150} required placeholder="Ex.: Prefeitura Municipal de ..." onBlur={ajustar} autoCapitalize="words" />
        </div>
        <div>
          <label htmlFor="responsavel">Nome do responsável</label>
          <input id="responsavel" name="responsavel" type="text" maxLength={150} autoComplete="name" required onBlur={ajustar} autoCapitalize="words" />
        </div>
        <div>
          <label htmlFor="funcao">Função</label>
          <input id="funcao" name="funcao" type="text" maxLength={100} required placeholder="Ex.: Secretário de Agricultura" onBlur={ajustar} autoCapitalize="words" />
        </div>
        <div>
          <label htmlFor="cpf">CPF</label>
          <input id="cpf" name="cpf" type="text" inputMode="numeric" maxLength={14} autoComplete="off" required placeholder="Só os números" />
        </div>
        <div>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" maxLength={150} autoComplete="email" required />
        </div>

        {(["1", "2"] as const).map((n) => (
          <fieldset key={n} className="periodo">
            <legend>Período 0{n} que deseja participar</legend>
            <div className="periodo-datas">
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
      </div>
      <p className="dica">Na lista só aparecem municípios que ainda não estão no Circuito nem se credenciaram.</p>

      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}
      <button className="botao cheio cred-enviar" disabled={enviando}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 2 2 10.5l7.2 2.6L19 6l-7.6 8.8V22l3.9-5.1 4.4 3.1z" />
        </svg>
        {enviando ? "Enviando..." : "Enviar credenciamento"}
      </button>
    </form>
  );
}
