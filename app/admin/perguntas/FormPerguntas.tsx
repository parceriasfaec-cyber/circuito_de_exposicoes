"use client";

import { useActionState } from "react";
import { salvarPerguntasCiclo, type EstadoForm } from "../cadastros-actions";

export default function FormPerguntas({ cicloId, perguntas, temRespostas }: { cicloId: string; perguntas: string[]; temRespostas: boolean }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(salvarPerguntasCiclo, {});
  return (
    <form action={acao}>
      <input type="hidden" name="ciclo_id" value={cicloId} />
      <p className="suave" style={{ marginTop: 0 }}>
        O texto salvo aqui vale para todas as exposições deste ciclo e também para as exposições novas que forem cadastradas.
      </p>
      {temRespostas && (
        <div className="aviso-mini">Este ciclo já tem respostas. Mude só a escrita, sem mudar o sentido da pergunta, para não misturar resultados.</div>
      )}
      {perguntas.map((p, i) => (
        <div key={i}>
          <label htmlFor={`pergunta_${i + 1}`}>Pergunta {i + 1}</label>
          <input id={`pergunta_${i + 1}`} name={`pergunta_${i + 1}`} type="text" defaultValue={p} required />
        </div>
      ))}
      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}
      <div className="acoes-form">
        <button className="botao" disabled={salvando}>{salvando ? "Salvando..." : "Salvar perguntas"}</button>
      </div>
    </form>
  );
}
