"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarProdutor, type EstadoForm } from "../../cadastros-actions";
import { nomeCurto } from "@/lib/texto";

type Dados = {
  id: string;
  nome: string;
  municipio: string;
  atividade: string;
  tipo_documento: string;
  documento: string;
  participa: string[];
  avaliadas: string[];
};

const ATIVIDADES = [
  "Bovinocultura de leite", "Bovinocultura de corte", "Caprinocultura", "Ovinocultura", "Equinocultura",
  "Avicultura", "Suinocultura", "Apicultura", "Agricultura familiar", "Fruticultura",
];

export default function FormProdutor({ dados, exposicoes, cicloId, cicloNome }: { dados: Dados; exposicoes: { id: string; nome: string }[]; cicloId: string; cicloNome: string }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(salvarProdutor, {});
  const [tipo, setTipo] = useState(dados.tipo_documento);
  const novo = !dados.id;
  const avaliadas = new Set(dados.avaliadas);
  const participa = new Set(dados.participa);

  return (
    // Depois de enviar, o React limpa o formulário e os campos voltam ao valor inicial; o tipo de documento volta junto.
    <form action={acao} className="bloco" style={{ paddingTop: 6 }} onReset={() => setTipo(dados.tipo_documento)}>
      <input type="hidden" name="id" value={dados.id} />
      <input type="hidden" name="ciclo_id" value={cicloId} />
      <div className="form-grade">
        <div style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="nome">Nome completo</label>
          <input id="nome" name="nome" type="text" defaultValue={dados.nome} required />
        </div>
        <div>
          <label htmlFor="municipio">Município</label>
          <input id="municipio" name="municipio" type="text" defaultValue={dados.municipio} required />
        </div>
        <div>
          <label htmlFor="atividade">Atividade</label>
          <select id="atividade" name="atividade" defaultValue={dados.atividade}>
            <option value="">—</option>
            {Array.from(new Set([...ATIVIDADES, dados.atividade].filter(Boolean))).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tipo_documento">Documento</label>
          <select id="tipo_documento" name="tipo_documento" defaultValue={dados.tipo_documento} onChange={(e) => setTipo(e.target.value)}>
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="OUTRO">Outro documento</option>
            <option value="">Sem documento</option>
          </select>
        </div>
        {tipo && (
          <div>
            <label htmlFor="documento">Número</label>
            <input id="documento" name="documento" type="text" inputMode={tipo === "OUTRO" ? "text" : "numeric"} defaultValue={dados.documento} required />
          </div>
        )}
      </div>
      {!tipo && <p className="suave" style={{ marginTop: 8 }}>Sem documento, o produtor se identifica escolhendo o próprio nome na lista (e o município, se houver nome igual).</p>}

      <h3 style={{ margin: "22px 0 4px", color: "var(--verde-escuro)" }}>Exposições em que participou no {cicloNome}</h3>
      <p className="suave" style={{ margin: 0 }}>O produtor só avalia as exposições marcadas aqui.</p>
      <div className="marcar">
        {exposicoes.map((e) => {
          const travada = avaliadas.has(e.id);
          return (
            <label key={e.id} className={travada ? "travado" : undefined} title={travada ? "Já avaliada: não pode ser desmarcada" : undefined}>
              <input type="checkbox" name="exposicoes" value={e.id} defaultChecked={participa.has(e.id) || travada} disabled={travada} />
              {nomeCurto(e.nome)}
              {travada && <span className="suave"> (avaliada)</span>}
            </label>
          );
        })}
      </div>

      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}

      <div className="acoes-form">
        <button className="botao" disabled={salvando}>{salvando ? "Salvando..." : novo ? "Cadastrar produtor" : "Salvar alterações"}</button>
        <Link href="/admin/produtores" className="link">Cancelar</Link>
      </div>
    </form>
  );
}
