"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { avaliarTudo, type EstadoAvaliacao } from "../actions";

const NOTAS = [5, 6, 7, 8, 9, 10];

export type ExposicaoQuestionario = {
  id: string;
  nome: string;
  periodo: string;
  perguntas: { ordem: number; texto: string }[];
};

const curto = (nome: string) => nome.replace("Exposição Agropecuária de ", "");

/**
 * Uma aba por exposição. Todas as respostas ficam no mesmo formulário e são enviadas juntas no final,
 * para não existir avaliação pela metade.
 */
export default function Questionario({ exposicoes }: { exposicoes: ExposicaoQuestionario[] }) {
  const [estado, acao, enviando] = useActionState<EstadoAvaliacao, FormData>(avaliarTudo, {});
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [ativa, setAtiva] = useState(0);
  const topoRef = useRef<HTMLDivElement>(null);

  const respondidasDe = (e: ExposicaoQuestionario) => e.perguntas.filter((p) => respostas[`${e.id}_${p.ordem}`]).length;
  const completa = (e: ExposicaoQuestionario) => respondidasDe(e) === e.perguntas.length;
  const tudoCompleto = exposicoes.every(completa);
  const ultima = ativa === exposicoes.length - 1;

  function irPara(i: number) {
    setAtiva(i);
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Ao terminar as 5 perguntas de uma exposição, vai para a próxima que ainda falta.
  const ultimaResposta = useRef<string | null>(null);
  useEffect(() => {
    const e = exposicoes[ativa];
    if (!e || !ultimaResposta.current?.startsWith(e.id) || !completa(e)) return;
    ultimaResposta.current = null;
    const proxima = exposicoes.findIndex((x, i) => i !== ativa && !completa(x));
    if (proxima >= 0) setTimeout(() => irPara(proxima), 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respostas]);

  return (
    <form action={acao}>
      <div ref={topoRef} className="abas-exp" role="tablist" aria-label="Exposições">
        {exposicoes.map((e, i) => {
          const feita = completa(e);
          return (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={i === ativa}
              className={`aba-exp${i === ativa ? " ativa" : ""}${feita ? " feita" : ""}`}
              onClick={() => irPara(i)}
            >
              <span className="aba-exp-nome">{curto(e.nome)}</span>
              <span className="aba-exp-status">{feita ? "✓" : `${respondidasDe(e)}/${e.perguntas.length}`}</span>
            </button>
          );
        })}
      </div>

      {exposicoes.map((e, i) => (
        <section key={e.id} className="painel-exp" hidden={i !== ativa} role="tabpanel">
          <div className="painel-exp-topo">
            <span className="questionario-num">Exposição {i + 1} de {exposicoes.length}</span>
            <h3>{e.nome}</h3>
            <div className="suave">{e.periodo}</div>
          </div>

          {e.perguntas.map((p) => {
            const chave = `${e.id}_${p.ordem}`;
            return (
              <fieldset key={chave} className="pergunta">
                <legend>{p.ordem}. {p.texto}</legend>
                <div className="notas">
                  {NOTAS.map((n) => (
                    <label key={n}>
                      <input
                        type="radio"
                        name={`nota_${chave}`}
                        value={n}
                        onChange={() => {
                          ultimaResposta.current = chave;
                          setRespostas((r) => ({ ...r, [chave]: n }));
                        }}
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
                <div className="escala"><span>ruim</span><span>excelente</span></div>
              </fieldset>
            );
          })}

          <div className="navegar-exp">
            <button type="button" className="botao secundario" disabled={i === 0} onClick={() => irPara(i - 1)}>
              ← Anterior
            </button>
            {!ultima && (
              <button type="button" className="botao" onClick={() => irPara(i + 1)}>
                Próxima exposição →
              </button>
            )}
          </div>
        </section>
      ))}

      <div className="envio-fixo">
        {estado.erro && <div className="erro" role="alert" style={{ marginTop: 0, marginBottom: 10 }}>{estado.erro}</div>}
        <button className="botao cheio entrar" style={{ marginTop: 0 }} disabled={!tudoCompleto || enviando}>
          {enviando
            ? "Enviando..."
            : tudoCompleto
              ? `Enviar avaliação ${exposicoes.length === 1 ? "" : `das ${exposicoes.length} exposições`}`
              : `Faltam ${exposicoes.filter((e) => !completa(e)).length} de ${exposicoes.length} exposições`}
        </button>
      </div>
    </form>
  );
}
