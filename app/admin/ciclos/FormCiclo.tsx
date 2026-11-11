"use client";

import { useActionState } from "react";
import { criarCiclo, type EstadoForm } from "../cadastros-actions";

export default function FormCiclo({ ciclos }: { ciclos: { id: string; nome: string; exposicoes: number }[] }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(criarCiclo, {});
  const proximoAno = new Date().getFullYear() + 1;

  return (
    <form action={acao}>
      <div className="form-grade">
        <div>
          <label htmlFor="ano">Ano do ciclo</label>
          <input id="ano" name="ano" type="text" inputMode="numeric" maxLength={4} defaultValue={proximoAno} required />
        </div>
        <div>
          <label htmlFor="copiar_de">Copiar as exposições de</label>
          <select id="copiar_de" name="copiar_de" defaultValue={ciclos[0]?.id ?? ""}>
            <option value="">Não copiar (começar vazio)</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} ({c.exposicoes} exposições)</option>
            ))}
          </select>
        </div>
      </div>
      <p className="suave" style={{ margin: "8px 0 0" }}>
        Ao copiar, as exposições vêm com o mesmo nome, município e local, e as datas passam para o novo ano. Os expositores
        não são copiados: marque de novo, no cadastro de cada um, as exposições em que participou neste ano.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "var(--texto)" }}>
        <input type="checkbox" name="ativar" style={{ width: 18, height: 18, accentColor: "var(--verde)" }} />
        Já deixar este ciclo como ativo (encerra a votação atual)
      </label>

      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}

      <div className="acoes-form">
        <button className="botao" disabled={salvando}>{salvando ? "Criando..." : "Criar ciclo"}</button>
      </div>
    </form>
  );
}
