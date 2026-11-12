"use client";

import { useActionState } from "react";
import type { Municipio } from "@/lib/credenciamento";
import { maiusculaInicial } from "@/lib/texto";

/** Telefone com máscara enquanto digita: (85) 99999-9999 */
const mascaraTelefone = (e: React.ChangeEvent<HTMLInputElement>) => {
  const d = e.currentTarget.value.replace(/\D/g, "").slice(0, 11);
  e.currentTarget.value =
    d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10
      ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** Ao sair do campo: primeira letra de cada palavra em maiúscula e as demais em minúscula. */
const ajustar = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.value = maiusculaInicial(e.currentTarget.value);
};
import { credenciar, type EstadoCredenciamento } from "./actions";

/** Valores já preenchidos (usado ao editar um credenciado no painel). */
export type ValoresCredenciamento = {
  municipio: number;
  instituicao: string;
  responsavel: string;
  funcao: string;
  cpf: string;
  telefone: string;
  email: string;
  periodo1_inicio: string;
  periodo1_fim: string;
  periodo2_inicio: string;
  periodo2_fim: string;
};

type Acao = (estado: EstadoCredenciamento, form: FormData) => Promise<EstadoCredenciamento>;

/** O mesmo formulário serve para o credenciamento público e para a edição no painel (com id, valores e outra ação). */
export default function FormCredenciamento({
  municipios,
  ano,
  acao: acaoServidor = credenciar,
  id,
  valores,
  textoBotao = "Enviar credenciamento",
}: {
  municipios: Municipio[];
  ano: number;
  acao?: Acao;
  id?: string;
  valores?: ValoresCredenciamento;
  textoBotao?: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoCredenciamento, FormData>(acaoServidor, {});
  const v = valores;
  const min = `${ano}-01-01`;
  const max = `${ano}-12-31`;

  return (
    <form action={acao} className="form-credenciamento">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="cred-campos">
        <div>
          <label htmlFor="municipio">Município que deseja participar</label>
          <select id="municipio" name="municipio" required defaultValue={v ? String(v.municipio) : ""} title="Só aparecem os municípios que ainda não participam do Circuito e ainda não se credenciaram.">
            <option value="" disabled>Escolha o município</option>
            {municipios.map((m) => (
              <option key={m.codigo} value={m.codigo}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="instituicao">Promotor do Evento</label>
          <input id="instituicao" name="instituicao" type="text" maxLength={150} required placeholder="Ex.: Prefeitura Municipal ou associação" defaultValue={v?.instituicao} onBlur={ajustar} autoCapitalize="words" />
        </div>
        <div>
          <label htmlFor="responsavel">Nome do responsável</label>
          <input id="responsavel" name="responsavel" type="text" maxLength={150} autoComplete="name" required defaultValue={v?.responsavel} onBlur={ajustar} autoCapitalize="words" />
        </div>
        <div>
          <label htmlFor="funcao">Função</label>
          <input id="funcao" name="funcao" type="text" maxLength={100} required placeholder="Ex.: Secretário de Agricultura" defaultValue={v?.funcao} onBlur={ajustar} autoCapitalize="words" />
        </div>
        <div>
          <label htmlFor="cpf">CPF</label>
          <input id="cpf" name="cpf" type="text" inputMode="numeric" maxLength={14} autoComplete="off" required={!id} placeholder="Só os números" defaultValue={v?.cpf ?? ""} />
        </div>
        <div>
          <label htmlFor="telefone">Telefone / WhatsApp</label>
          <input id="telefone" name="telefone" type="tel" inputMode="tel" maxLength={16} autoComplete="tel" required placeholder="(85) 99999-9999" defaultValue={v?.telefone} onChange={mascaraTelefone} />
        </div>
        <div className="campo-inteiro">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" maxLength={150} autoComplete="email" required placeholder="nome@exemplo.com" defaultValue={v?.email} />
        </div>

        {(["1", "2"] as const).map((n) => (
          <fieldset key={n} className="periodo">
            <legend>Período 0{n} que deseja participar</legend>
            <div className="periodo-datas">
              <div>
                <label htmlFor={`periodo${n}_inicio`}>Início</label>
                <input id={`periodo${n}_inicio`} name={`periodo${n}_inicio`} type="date" min={min} max={max} required defaultValue={v?.[`periodo${n}_inicio`]} />
              </div>
              <div>
                <label htmlFor={`periodo${n}_fim`}>Fim</label>
                <input id={`periodo${n}_fim`} name={`periodo${n}_fim`} type="date" min={min} max={max} required defaultValue={v?.[`periodo${n}_fim`]} />
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
        {enviando ? "Salvando..." : textoBotao}
      </button>
    </form>
  );
}
