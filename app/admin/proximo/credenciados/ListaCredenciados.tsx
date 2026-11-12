"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import Icone from "@/components/Icone";
import Paginacao, { paginar } from "@/components/Paginacao";
import { normalizar } from "@/lib/texto";
import { definirApresentacao, desmarcarTodasApresentacoes } from "../actions";
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
  /** Votos recebidos na votação das cidades: com voto, não pode excluir nem desmarcar a apresentação. */
  votos: number;
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
        if (!r.ok) throw new Error(r.erro);
      } catch (e) {
        setMarcados((m) => ({ ...m, [l.id]: !novo }));
        setErro(e instanceof Error && e.message ? `${l.municipio}: ${e.message}` : `Não foi possível salvar ${l.municipio}. Tente de novo.`);
      } finally {
        setSalvando((s) => ({ ...s, [l.id]: false }));
      }
    });
  }

  function desmarcarTodos() {
    const comVoto = linhas.filter((l) => marcados[l.id] && l.votos > 0).length;
    const tirar = apresentaram - comVoto;
    if (tirar === 0) { setErro("Todos os marcados já receberam votos: a apresentação deles não pode ser desmarcada."); return; }
    if (!confirm(`Desmarcar a apresentação de ${tirar} município${tirar > 1 ? "s" : ""}? Eles saem da votação das cidades até serem marcados de novo.${comVoto ? ` ${comVoto} já ${comVoto > 1 ? "receberam" : "recebeu"} votos e continua${comVoto > 1 ? "m" : ""} marcado${comVoto > 1 ? "s" : ""}.` : ""}`)) return;
    const antes = marcados;
    setErro("");
    setMarcados(Object.fromEntries(linhas.map((l) => [l.id, l.votos > 0 ? marcados[l.id] : false])));
    iniciar(async () => {
      try {
        const r = await desmarcarTodasApresentacoes();
        if (!r.ok) throw new Error();
      } catch {
        setMarcados(antes);
        setErro("Não foi possível desmarcar. Tente de novo.");
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
          {apresentaram > 0 && (
            <button type="button" className="filtro desmarcar-todos" onClick={desmarcarTodos}>Desmarcar todos</button>
          )}
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
          <table className="tabela-org tabela-cred">
            <thead>
              <tr>
                <th><span><Icone nome="local" tamanho={18} /> Município</span></th>
                <th><span><Icone nome="usuario" tamanho={18} /> Responsável</span></th>
                <th><span><Icone nome="calendario" tamanho={18} /> Períodos Sugeridos</span></th>
                <th style={{ textAlign: "center" }}><span style={{ justifyContent: "center" }}><Icone nome="apresentacao" tamanho={18} /> Se apresentou?</span></th>
                <th style={{ textAlign: "center" }}><span style={{ justifyContent: "center" }}><Icone nome="engrenagem" tamanho={18} /> Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {daPagina.map((l) => {
                const sim = marcados[l.id];
                const travado = l.votos > 0;
                return (
                  <tr key={l.id} className={sim ? "linha-apresentou" : undefined}>
                    <td>
                      <div className="cred-municipio">
                        <Icone nome="local" tamanho={22} className="cred-pino" />
                        <div>
                          <div className="nome cred-nome-municipio">{l.municipio}</div>
                          <div className="doc">{l.instituicao}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="nome" title={`${l.funcao}${l.cpf ? ` · CPF ${l.cpf}` : ""}`}>{l.responsavel}</div>
                      {l.telefone && (
                        <div className="cred-linha">
                          <Icone nome="telefone" tamanho={16} />
                          {l.telefoneDigitos ? <a href={`tel:${l.telefoneDigitos}`}>{l.telefone}</a> : <span>{l.telefone}</span>}
                        </div>
                      )}
                      <div className="cred-linha">
                        <Icone nome="email" tamanho={16} />
                        <a href={`mailto:${l.email}`}>{l.email}</a>
                      </div>
                    </td>
                    <td>
                      <div className="cred-linha periodo-linha"><Icone nome="calendario" tamanho={16} /> 01: {l.periodo1}</div>
                      <div className="cred-linha periodo-linha"><Icone nome="calendario" tamanho={16} /> 02: {l.periodo2}</div>
                      <div className="cred-linha cred-enviado"><span className="cred-ponto" aria-hidden="true" /> Enviado em {l.enviado}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <label className={`marcar-apresentou${sim ? " sim" : ""}`} title={sim ? (travado ? `Já recebeu ${l.votos} voto${l.votos > 1 ? "s" : ""}: não pode desmarcar` : "Apresentou (clique para desmarcar)") : "Marque quando o município fizer a apresentação"}>
                        <input
                          type="checkbox"
                          checked={sim}
                          disabled={salvando[l.id] || (sim && travado)}
                          onChange={() => alternar(l)}
                          aria-label={`${l.municipio} fez a apresentação`}
                        />
                        <span className="marcar-apresentou-caixa" aria-hidden="true"><Icone nome="check" tamanho={18} /></span>
                      </label>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div className="acoes-linha">
                        <Link href={`/admin/proximo/credenciados/${l.id}`} className="botao-icone editar" title={`Editar ${l.municipio}`} aria-label={`Editar ${l.municipio}`}>
                          <Icone nome="lapis" tamanho={20} />
                        </Link>
                        <BotaoExcluir id={l.id} municipio={l.municipio} votos={l.votos} />
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
