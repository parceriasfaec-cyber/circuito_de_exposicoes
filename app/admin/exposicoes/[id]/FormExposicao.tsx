"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FOTOS } from "@/lib/fotos";
import { salvarExposicao, type EstadoForm } from "../../cadastros-actions";

type Dados = { id: string; ciclo_id: string; foto: string; nome: string; municipio: string; local: string; responsavel: string; data_inicio: string; data_fim: string; perguntas: string[] };

export default function FormExposicao({ dados, avaliacoes }: { dados: Dados; avaliacoes: number }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(salvarExposicao, {});
  const nova = !dados.id;

  return (
    <form action={acao} className="bloco" style={{ paddingTop: 6 }}>
      <input type="hidden" name="id" value={dados.id} />
      <input type="hidden" name="ciclo_id" value={dados.ciclo_id} />
      <div className="form-grade">
        <div style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="nome">Nome da exposição</label>
          <input id="nome" name="nome" type="text" defaultValue={dados.nome} placeholder="Exposição de ..." required />
        </div>
        <div>
          <label htmlFor="municipio">Município</label>
          <input id="municipio" name="municipio" type="text" defaultValue={dados.municipio} required />
        </div>
        <div>
          <label htmlFor="local">Local (opcional)</label>
          <input id="local" name="local" type="text" defaultValue={dados.local} placeholder="Parque de Exposições ..." />
        </div>
        <div>
          <label htmlFor="responsavel">Responsável / gestor</label>
          <input id="responsavel" name="responsavel" type="text" defaultValue={dados.responsavel} placeholder="Ex.: Dr. Darlan" />
        </div>
        <div>
          <label htmlFor="data_inicio">Início</label>
          <input id="data_inicio" name="data_inicio" type="date" defaultValue={dados.data_inicio} required />
        </div>
        <div>
          <label htmlFor="data_fim">Fim</label>
          <input id="data_fim" name="data_fim" type="date" defaultValue={dados.data_fim} required />
        </div>
      </div>

      <h3 style={{ margin: "22px 0 4px", color: "var(--verde-escuro)" }}>Foto da exposição</h3>
      <p className="suave" style={{ margin: 0 }}>Aparece no painel, em Progresso por Exposição.</p>
      <div className="escolher-foto">
        <label>
          <input type="radio" name="foto" value="" defaultChecked={!dados.foto} />
          <span className="foto-opcao sem">Sem foto</span>
        </label>
        {FOTOS.map((f) => (
          <label key={f.id} title={f.rotulo}>
            <input type="radio" name="foto" value={f.id} defaultChecked={dados.foto === f.id} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="foto-opcao" src={`/exposicoes/${f.id}.png`} alt={f.rotulo} width={160} height={160} />
          </label>
        ))}
      </div>

      {!nova && (
        <>
          <h3 style={{ margin: "22px 0 4px", color: "var(--verde-escuro)" }}>Perguntas desta exposição</h3>
          {avaliacoes > 0 && (
            <div className="aviso-mini">Já existem {avaliacoes} avaliações. Mudar o texto agora vale para as próximas respostas; as notas já dadas continuam ligadas à mesma pergunta.</div>
          )}
          {dados.perguntas.map((p, i) => (
            <div key={i}>
              <label htmlFor={`pergunta_${i + 1}`}>Pergunta {i + 1}</label>
              <input id={`pergunta_${i + 1}`} name={`pergunta_${i + 1}`} type="text" defaultValue={p} required />
            </div>
          ))}
        </>
      )}

      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}

      <div className="acoes-form">
        <button className="botao" disabled={salvando}>{salvando ? "Salvando..." : nova ? "Cadastrar exposição" : "Salvar alterações"}</button>
        <Link href="/admin/exposicoes" className="link">Cancelar</Link>
      </div>
    </form>
  );
}
