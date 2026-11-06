"use client";

import { useActionState } from "react";
import { entrarAdmin, type EstadoLogin } from "./actions";

export default function Login() {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrarAdmin, {});
  return (
    <form action={acao} className="cartao">
      <label htmlFor="usuario">Usuário</label>
      <input id="usuario" name="usuario" type="text" autoComplete="username" autoCapitalize="none" />
      <label htmlFor="senha">Senha</label>
      <input id="senha" name="senha" type="password" autoComplete="current-password" />
      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}
      <button className="botao cheio" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}
