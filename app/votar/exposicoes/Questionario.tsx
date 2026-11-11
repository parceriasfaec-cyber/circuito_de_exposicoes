"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { nomeCurto } from "@/lib/texto";
import { NOTAS, ROTULO_NOTA, partesPergunta } from "@/lib/escala";
import { avaliarTudo, type EstadoAvaliacao } from "../actions";

export type ExposicaoQuestionario = {
  id: string;
  nome: string;
  periodo: string;
  perguntas: { ordem: number; texto: string }[];
};

const curto = nomeCurto;

/**
 * Uma aba por exposição. Todas as respostas ficam no mesmo formulário e são enviadas juntas no final,
 * para não existir avaliação pela metade.
 */
export default function Questionario({ exposicoes }: { exposicoes: ExposicaoQuestionario[] }) {
  const [estado, acao, enviando] = useActionState<EstadoAvaliacao, FormData>(avaliarTudo, {});
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [ativa, setAtiva] = useState(0);
  const [mostrarFaltas, setMostrarFaltas] = useState(false);
  const [aviso, setAviso] = useState("");
  const topoRef = useRef<HTMLDivElement>(null);

  const respondidasDe = (e: ExposicaoQuestionario) => e.perguntas.filter((p) => respostas[`${e.id}_${p.ordem}`]).length;
  const completa = (e: ExposicaoQuestionario) => respondidasDe(e) === e.perguntas.length;
  const tudoCompleto = exposicoes.every(completa);
  const ultima = ativa === exposicoes.length - 1;

  function irPara(i: number) {
    setAtiva(i);
    setAviso("");
    setMostrarFaltas(false);
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * Leva o produtor até a primeira pergunta sem resposta (começando pela exposição aberta),
   * rola a tela até ela, põe o cursor nas notas e destaca em vermelho o que falta.
   */
  function irParaFalta(soDaAtiva = false) {
    const ordem = soDaAtiva ? [ativa] : [ativa, ...exposicoes.map((_, i) => i).filter((i) => i !== ativa)];
    for (const i of ordem) {
      const e = exposicoes[i];
      const p = e.perguntas.find((q) => !respostas[`${e.id}_${q.ordem}`]);
      if (!p) continue;
      setMostrarFaltas(true);
      setAtiva(i);
      setAviso(`Falta responder a pergunta ${p.ordem}${exposicoes.length > 1 ? ` de ${curto(e.nome)}` : ""}.`);
      setTimeout(() => {
        const alvo = document.getElementById(`p_${e.id}_${p.ordem}`);
        alvo?.scrollIntoView({ behavior: "smooth", block: "center" });
        alvo?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      }, 80);
      return true;
    }
    return false;
  }

  // Ao terminar as perguntas de uma exposição, vai para a próxima que ainda falta.
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
              {/* "EXPOAGRO (Crateús)": nome do evento em cima e a cidade embaixo, sem cortar */}
              <span className="aba-exp-nome">{curto(e.nome).replace(/\s*\(.*\)$/, "")}</span>
              {/\(.*\)$/.test(e.nome) && <span className="aba-exp-cidade">{e.nome.match(/\((.*)\)$/)![1]}</span>}
              <span className="aba-exp-status">{feita ? "✓" : `${respondidasDe(e)}/${e.perguntas.length}`}</span>
            </button>
          );
        })}
      </div>

      {/* Legenda das notas, uma vez só, logo abaixo das abas */}
      <ul className="legenda-notas" aria-label="O que significa cada nota">
        <li><strong>1</strong> = muito ruim</li>
        <li><strong>2</strong> = ruim</li>
        <li><strong>3</strong> = regular</li>
        <li><strong>4</strong> = bom</li>
        <li><strong>5</strong> = excelente</li>
      </ul>

      {exposicoes.map((e, i) => (
        <section key={e.id} className="painel-exp" hidden={i !== ativa} role="tabpanel">
          <div className="painel-exp-topo">
            <span className="questionario-num">Você está avaliando · Exposição {i + 1} de {exposicoes.length}</span>
            <h3>{e.nome}</h3>
            <div className="painel-exp-periodo">{e.periodo}</div>
          </div>

          {e.perguntas.map((p) => {
            const chave = `${e.id}_${p.ordem}`;
            const { titulo, pergunta } = partesPergunta(p.texto);
            return (
              <fieldset key={chave} id={`p_${chave}`} className={`pergunta${mostrarFaltas && !respostas[chave] ? " falta" : ""}`}>
                <legend>
                  {titulo ? (
                    <>
                      <strong className="pergunta-titulo">{p.ordem}. {titulo}</strong>
                      <span className="pergunta-sub">{pergunta}</span>
                    </>
                  ) : (
                    <>{p.ordem}. {pergunta}</>
                  )}
                </legend>
                <div className="notas">
                  {NOTAS.map((n) => (
                    <label key={n} title={ROTULO_NOTA[n]}>
                      <input
                        type="radio"
                        name={`nota_${chave}`}
                        value={n}
                        onChange={() => {
                          ultimaResposta.current = chave;
                          setAviso("");
                          setRespostas((r) => ({ ...r, [chave]: n }));
                        }}
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
                <div className="escala"><span>1 = muito ruim</span><span>5 = excelente</span></div>
                {mostrarFaltas && !respostas[chave] && <div className="falta-aviso">Escolha uma nota de 1 a 5</div>}
              </fieldset>
            );
          })}

          <div className="navegar-exp">
            <button type="button" className="botao secundario" disabled={i === 0} onClick={() => irPara(i - 1)}>
              ← Anterior
            </button>
            {!ultima && (
              <button type="button" className="botao" onClick={() => { if (!irParaFalta(true)) irPara(i + 1); }}>
                Próxima exposição →
              </button>
            )}
          </div>
        </section>
      ))}

      <div className="envio-fixo">
        {aviso && <div className="erro" role="alert" style={{ marginTop: 0, marginBottom: 10 }}>{aviso}</div>}
        {estado.erro && !aviso && <div className="erro" role="alert" style={{ marginTop: 0, marginBottom: 10 }}>{estado.erro}</div>}
        <button
          className={`botao cheio entrar${tudoCompleto ? "" : " incompleto"}`}
          style={{ marginTop: 0 }}
          disabled={enviando}
          onClick={(ev) => {
            if (tudoCompleto) return;
            ev.preventDefault();
            irParaFalta();
          }}
        >
          {enviando
            ? "Enviando..."
            : tudoCompleto
              ? `Enviar avaliação ${exposicoes.length === 1 ? "" : `das ${exposicoes.length} exposições`}`
              : `Ver o que falta responder (${exposicoes.filter((e) => !completa(e)).length} de ${exposicoes.length} ${exposicoes.length === 1 ? "exposição" : "exposições"})`}
        </button>
      </div>
    </form>
  );
}
