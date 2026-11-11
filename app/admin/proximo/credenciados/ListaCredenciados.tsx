"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import Icone from "@/components/Icone";
import Paginacao, { paginar } from "@/components/Paginacao";
import { normalizar } from "@/lib/texto";
import { definirApresentacao } from "../actions";
import BotaoExcluir from "../BotaoExcluir";

export type LinhaCredenciado = {
  id: string;
  municipio: string;
  instituicao: string;
  responsavel: string;
  funcao: string;
  cpf: string;
  telefone: string;
  telefoneDigitos: string | null;
  email: string;
  periodo1: string;
  periodo2: string;
  enviado: string;
  apresentou: boolean;
};

type Filtro = "todos" | "faltam" | "apresentaram";
const POR_PAGINA = 15;

/**
 * Lista dos credenciados com busca e filtros. O botão "Apresentou" muda na hora, sem recarregar a página,
 * para marcar rápido no dia das apresentações mesmo com muitos municípios.
 */
export default function ListaCredenciados({ linhas }: { linhas: LinhaCredenciado[] }) {
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() => Object.fromEntries(linhas.map((l) => [l.id, l.apresentou])));
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pagina, setPagina] = useState(0);
  const [, iniciar] = useTransition();

  const apresentaram = linhas.filter((l) => marcados[l.id]).length;
  const contagem: Record<Filtro, number> = { todos: linhas.length, faltam: linhas.length - apresentaram, apresentaram };

  const visiveis = useMemo(() => {
    const q = normalizar(busca);
    return linhas.filter((l) => {
      if (filtro === "faltam" && marcados[l.id]) return false;
      if (filtro === "apresentaram" && !marcados[l.id]) return false;
      return !q || normalizar(`${l.municipio} ${l.instituicao} ${l.responsavel}`).includes(q);
    });
  }, [linhas, busca, filtro, marcados]);
  const { atual, itens: daPagina } = paginar(visiveis, pagina, POR_PAGINA);

  function alternar(l: LinhaCredenciado) {
    const novo = !marcados[l.id];
    setErro("");
    setMarcados((m) => ({ ...m, [l.id]: novo }));
    setSalvando((s) => ({ ...s, [l.id]: true }));
    iniciar(async () => {
      try {
        const r = await definirApresentacao(l.id, novo);
        if (!r.ok) throw new Error();
      } catch {
        setMarcados((m) => ({ ...m, [l.id]: !novo }));
        setErro(`Não foi possível salvar ${l.municipio}. Tente de novo.`);
      } finally {
        setSalvando((s) => ({ ...s, [l.id]: false }));
      }
    });
  }

  const FILTROS: { id: Filtro; rotulo: string }[] = [
    { id: "todos", rotulo: "Todos" },
    { id: "faltam", rotulo: "Faltam apresentar" },
    { id: "apresentaram", rotulo: "Apresentaram" },
  ];

  return (
    <>
      <p style={{ margin: "0 0 12px", fontWeight: 700 }}>
        No dia das apresentações, marque a caixa de <strong>Apresentação</strong> do município (salva na hora).
        Só quem apresentou entra na votação das cidades: {apresentaram} de {linhas.length}.
      </p>

      <div className="barra">
        <div className="filtros">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" className={`filtro${filtro === f.id ? " ativo" : ""}`} onClick={() => { setFiltro(f.id); setPagina(0); }}>
              {f.rotulo} <span className="filtro-num">{contagem[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="busca-campo" style={{ maxWidth: 420 }}>
          <Icone nome="busca" tamanho={20} />
          <input type="text" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(0); }} placeholder="Buscar município, prefeitura ou responsável..." />
        </div>
      </div>

      {erro && <div className="erro" role="alert" style={{ marginTop: 0, marginBottom: 12 }}>{erro}</div>}

      {visiveis.length === 0 ? (
        <div className="cartao"><p style={{ margin: 0 }}>Nenhum município encontrado.</p></div>
      ) : (
        <div className="tabela">
          <table className="tabela-org">
            <thead>
              <tr>
                <th><span><Icone nome="local" tamanho={18} /> Município</span></th>
                <th><span><Icone nome="usuario" tamanho={18} /> Responsável</span></th>
                <th><span><Icone nome="calendario" tamanho={18} /> Períodos</span></th>
                <th style={{ textAlign: "center" }}><span style={{ justifyContent: "center" }}><Icone nome="apresentacao" tamanho={18} /> Apresentação</span></th>
                <th style={{ textAlign: "center" }}><span style={{ justifyContent: "center" }}><Icone nome="engrenagem" tamanho={18} /> Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {daPagina.map((l) => {
                const sim = marcados[l.id];
                return (
                  <tr key={l.id} className={sim ? "linha-apresentou" : undefined}>
                    <td>
                      <div className="nome">{l.municipio}</div>
                      <div className="doc">{l.instituicao}</div>
                    </td>
                    <td>
                      <div className="nome">{l.responsavel}</div>
                      <div className="doc">{l.funcao}{l.cpf ? ` · CPF ${l.cpf}` : ""}</div>
                      <div className="doc">
                        {l.telefoneDigitos && <><a href={`tel:${l.telefoneDigitos}`}>{l.telefone}</a> · </>}
                        <a href={`mailto:${l.email}`}>{l.email}</a>
                      </div>
                    </td>
                    <td>
                      <div className="periodo-linha">01: {l.periodo1}</div>
                      <div className="periodo-linha">02: {l.periodo2}</div>
                      <div className="doc">Enviado em {l.enviado}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <label className={`marcar-apresentou${sim ? " sim" : ""}`} title={sim ? "Apresentou (clique para desmarcar)" : "Marque quando o município fizer a apresentação"}>
                        <input
                          type="checkbox"
                          checked={sim}
                          disabled={salvando[l.id]}
                          onChange={() => alternar(l)}
                          aria-label={`${l.municipio} fez a apresentação`}
                        />
                        <span className="marcar-apresentou-caixa" aria-hidden="true"><Icone nome="check" tamanho={18} /></span>
                      </label>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div className="acoes-linha">
                        <Link href={`/admin/proximo/credenciados/${l.id}`} className="botao-icone" title={`Editar ${l.municipio}`} aria-label={`Editar ${l.municipio}`}>
                          <Icone nome="lapis" tamanho={20} />
                        </Link>
                        <BotaoExcluir id={l.id} municipio={l.municipio} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={atual} porPagina={POR_PAGINA} total={visiveis.length} aoMudar={setPagina} rotulo="Páginas dos credenciados" />
    </>
  );
}
