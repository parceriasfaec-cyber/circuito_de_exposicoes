"use client";

import { useEffect, useMemo, useState } from "react";
import Icone from "@/components/Icone";
import Paginacao, { paginar } from "@/components/Paginacao";
import { normalizar } from "@/lib/texto";
import { desmarcarPresenca, desmarcarTodasPresencas, marcarPresenca } from "./actions";

export type Expositor = {
  id: string;
  codigo: string;
  nome: string;
  empresa: string | null;
  municipio: string;
  presente: boolean;
  hora: string | null;
  marcado_em: Date | null;
  total_exposicoes: number;
  avaliadas: number;
  votou_cidades: boolean;
  exposicoes: string | null;
};

type Filtro = "todos" | "presentes" | "faltam";
export type FiltroAval = "todos" | "avaliou" | "nao";

/** Já avaliou alguma exposição ou já votou nos municípios: a presença não pode mais ser desmarcada. */
const presencaFixa = (e: { avaliadas: number; votou_cidades: boolean }) => e.avaliadas > 0 || e.votou_cidades;
const avaliou = (e:{ total_exposicoes: number; avaliadas: number }) => e.total_exposicoes > 0 && e.avaliadas >= e.total_exposicoes;

const POR_PAGINA = 20;

/** Lista com todos os expositores do ciclo: busca por ID, nome ou município e um toque marca (ou desmarca) a presença. */
export default function MarcarPresenca({ cicloId, expositores: doServidor, avalInicial = "todos" }: { cicloId: string; expositores: Expositor[]; avalInicial?: FiltroAval }) {
  // Cópia local: a linha, o contador e os filtros mudam na hora, sem recarregar a página.
  const [expositores, setExpositores] = useState(doServidor);
  useEffect(() => setExpositores(doServidor), [doServidor]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [filtroAval, setFiltroAval] = useState<FiltroAval>(avalInicial);
  const [pagina, setPagina] = useState(0);
  const [salvando, setSalvando] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const presentes = expositores.filter((e) => e.presente).length;
  const total = expositores.length;
  const pct = total ? Math.round((presentes / total) * 100) : 0;

  const visiveis = useMemo(() => {
    const q = normalizar(busca);
    return expositores.filter(
      (e) =>
        (filtro === "todos" || (filtro === "presentes") === e.presente) &&
        (filtroAval === "todos" || (filtroAval === "avaliou") === avaliou(e)) &&
        (!q || normalizar(`${e.codigo} ${e.nome} ${e.empresa ?? ""} ${e.municipio}`).includes(q)),
    );
  }, [expositores, busca, filtro, filtroAval]);
  const avaliaram = expositores.filter(avaliou).length;
  const { atual, itens: daPagina } = paginar(visiveis, pagina, POR_PAGINA);

  const atualizar = (id: string, dados: Partial<Expositor>) =>
    setExpositores((lista) => lista.map((x) => (x.id === id ? { ...x, ...dados } : x)));
  const ocupar = (id: string, sim: boolean) =>
    setSalvando((s) => {
      const n = new Set(s);
      if (sim) n.add(id);
      else n.delete(id);
      return n;
    });

  async function alternar(e: Expositor) {
    if (salvando.has(e.id)) return;
    setErro(null);
    ocupar(e.id, true);
    try {
      if (e.presente) {
        const r = await desmarcarPresenca(cicloId, e.id);
        if (r.ok) atualizar(e.id, { presente: false, hora: null, marcado_em: null });
        else setErro(r.erro ?? "Não foi possível desmarcar.");
      } else {
        const r = await marcarPresenca(cicloId, { id: e.id });
        if (r.ok) atualizar(e.id, { presente: true, hora: r.hora, marcado_em: new Date(r.marcadoEm) });
        else setErro(r.erro);
      }
    } catch {
      setErro("Não foi possível salvar. Confira a internet e toque de novo.");
    } finally {
      ocupar(e.id, false);
    }
  }

  async function desmarcarTodos() {
    const fixos = expositores.filter((x) => x.presente && presencaFixa(x)).length;
    const tirar = presentes - fixos;
    if (tirar === 0) {
      setErro("Todos os presentes já avaliaram ou votaram nos municípios: a presença deles não pode ser desmarcada.");
      return;
    }
    if (!confirm(`Tirar a presença de ${tirar} expositor${tirar > 1 ? "es" : ""}?${fixos ? ` ${fixos} já avali${fixos > 1 ? "aram" : "ou"} ou vot${fixos > 1 ? "aram" : "ou"} nos municípios e continua${fixos > 1 ? "m" : ""} presente${fixos > 1 ? "s" : ""}.` : ""}`)) return;
    const antes = expositores;
    setErro(null);
    setExpositores((lista) => lista.map((x) => (presencaFixa(x) ? x : { ...x, presente: false, hora: null, marcado_em: null })));
    try {
      const r = await desmarcarTodasPresencas(cicloId);
      if (!r.ok) throw new Error();
    } catch {
      setExpositores(antes);
      setErro("Não foi possível desmarcar. Confira a internet e tente de novo.");
    }
  }

  return (
    <div className="pres">
      {/* Resumo no topo: presença (clicar filtra; clicar de novo mostra todos) e avaliação */}
      <div className="cartao pres-resumo">
        <span className="pres-resumo-icone" aria-hidden="true"><Icone nome="usuarios" tamanho={40} /></span>
        <div className="pres-resumo-total">
          <span className="pres-resumo-titulo">Presença dos Expositores</span>
          <span className="pres-resumo-num"><strong>{presentes}</strong> / {total}</span>
          <div className="pres-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="pres-resumo-aval pres-resumo-pres">
          <span className="pres-resumo-titulo"><Icone nome="escudo" tamanho={18} /> Presença</span>
        <div className="pres-resumo-grupo" role="group" aria-label="Filtro da presença">
          <button type="button" aria-pressed={filtro === "presentes"} className={`pres-chip verde${filtro === "presentes" ? " ativo" : ""}`} onClick={() => { setFiltro(filtro === "presentes" ? "todos" : "presentes"); setPagina(0); }}>
            <span className="pres-chip-ic"><Icone nome="check" tamanho={16} /></span><span>Presentes<strong>{presentes}</strong></span>
          </button>
          <button type="button" aria-pressed={filtro === "faltam"} className={`pres-chip cinza${filtro === "faltam" ? " ativo" : ""}`} onClick={() => { setFiltro(filtro === "faltam" ? "todos" : "faltam"); setPagina(0); }}>
            <span className="pres-chip-ic"><Icone nome="relogio" tamanho={16} /></span><span>Pendentes<strong>{total - presentes}</strong></span>
          </button>
        </div>
        </div>
        <div className="pres-resumo-aval">
          <span className="pres-resumo-titulo"><Icone nome="grafico" tamanho={18} /> Avaliação</span>
          <div className="pres-resumo-grupo" role="group" aria-label="Filtro da avaliação">
            <button type="button" aria-pressed={filtroAval === "todos"} className={`pres-chip escuro${filtroAval === "todos" ? " ativo" : ""}`} onClick={() => { setFiltroAval("todos"); setPagina(0); }}>
              <span className="pres-chip-ic"><Icone nome="usuarios" tamanho={16} /></span><span>Todos<strong>{total}</strong></span>
            </button>
            <button type="button" aria-pressed={filtroAval === "avaliou"} className={`pres-chip verde${filtroAval === "avaliou" ? " ativo" : ""}`} onClick={() => { setFiltroAval(filtroAval === "avaliou" ? "todos" : "avaliou"); setPagina(0); }}>
              <span className="pres-chip-ic"><Icone nome="check" tamanho={16} /></span><span>Avaliou<strong>{avaliaram}</strong></span>
            </button>
            <button type="button" aria-pressed={filtroAval === "nao"} className={`pres-chip laranja${filtroAval === "nao" ? " ativo" : ""}`} onClick={() => { setFiltroAval(filtroAval === "nao" ? "todos" : "nao"); setPagina(0); }}>
              <span className="pres-chip-ic"><Icone nome="alerta" tamanho={16} /></span><span>Não avaliou<strong>{total - avaliaram}</strong></span>
            </button>
          </div>
        </div>
      </div>

      <div className="pres-barra-busca">
        <input
          className="pres-busca"
          type="search"
          placeholder="Buscar por ID, nome, empresa ou município..."
          value={busca}
          onChange={(ev) => { setBusca(ev.target.value); setPagina(0); }}
          autoFocus
        />
        {presentes > 0 && (
          <button type="button" className="filtro desmarcar-todos" onClick={desmarcarTodos}>Desmarcar todos</button>
        )}
      </div>

      {erro && <div className="erro" role="alert">{erro}</div>}

      <div className="prod-quadro">
        <table className="tabela-org pres-tabela">
          <thead>
            <tr>
              <th className="centro">ID</th>
              <th><span><Icone nome="usuario" tamanho={18} /> Expositor</span></th>
              <th className="centro"><span><Icone nome="trofeu" tamanho={18} /> Exposições</span></th>
              <th className="centro"><span><Icone nome="prancheta" tamanho={18} /> Avaliação</span></th>
              <th className="centro"><span><Icone nome="local" tamanho={18} /> Votação Municípios</span></th>
              <th className="centro"><span><Icone nome="escudo" tamanho={18} /> Status de Presença</span></th>
              <th className="centro">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={7} className="suave" style={{ textAlign: "center", padding: 24 }}>Ninguém encontrado.</td></tr>
            )}
            {daPagina.map((e) => (
              <tr key={e.id} className={e.presente ? "presente" : undefined}>
                <td className="centro"><span className="prod-id">{e.codigo}</span></td>
                <td>
                  <div className="nome">{e.nome}</div>
                  {e.empresa && <div className="prod-empresa">{e.empresa}</div>}
                </td>
                <td className="centro">
                  <span className={`prod-total${e.total_exposicoes === 0 ? " zero" : ""}`} title={e.exposicoes ?? "Nenhuma exposição neste ciclo"}>
                    {e.total_exposicoes}
                  </span>
                </td>
                <td className="centro">
                  {avaliou(e) ? (
                    <span className="pres-status-ic avaliou" title="Avaliou" aria-label="Avaliou" role="img"><Icone nome="check" tamanho={18} /></span>
                  ) : (
                    <span className="pres-status-ic nao-avaliou" title="Não avaliou" aria-label="Não avaliou" role="img"><Icone nome="alerta" tamanho={18} /></span>
                  )}
                </td>
                <td className="centro">
                  {e.votou_cidades ? (
                    <span className="pres-status-ic avaliou" title="Votou nos municípios" aria-label="Votou nos municípios" role="img"><Icone nome="check" tamanho={18} /></span>
                  ) : (
                    <span className="pres-status-ic sem-voto" title="Ainda não votou nos municípios" aria-label="Ainda não votou nos municípios" role="img">–</span>
                  )}
                </td>
                <td className="centro">
                  {e.presente ? (
                    <span className="pres-status-ic presente" title={e.hora ? `Presente · marcado às ${e.hora}` : "Presente"} aria-label={e.hora ? `Presente, marcado às ${e.hora}` : "Presente"} role="img">
                      <Icone nome="check" tamanho={18} />
                    </span>
                  ) : (
                    <span className="pres-status-ic pendente" title="Pendente" aria-label="Pendente" role="img"><Icone nome="relogio" tamanho={18} /></span>
                  )}
                </td>
                <td className="centro">
                  <button
                    type="button"
                    className={`pres-acao${e.presente ? " desfazer" : ""}`}
                    onClick={() => alternar(e)}
                    disabled={salvando.has(e.id) || (e.presente && presencaFixa(e))}
                    title={e.presente ? (presencaFixa(e) ? (e.avaliadas > 0 ? "Já avaliou: a presença não pode ser desmarcada" : "Já votou nos municípios: a presença não pode ser desmarcada") : "Desfazer presença") : "Marcar presença"}
                    aria-label={`${e.presente ? "Desfazer presença de" : "Marcar presença de"} ${e.nome}`}
                  >
                    <Icone nome={e.presente ? "atualizar" : "usuarioMais"} tamanho={22} />
                  </button>
                  <a
                    className="pres-acao editar"
                    href={`/admin/avaliacoes/${e.id}?ciclo=${cicloId}`}
                    title="Ver a avaliação (notas de cada exposição)"
                    aria-label={`Ver a avaliação de ${e.nome}`}
                  >
                    <Icone nome="olho" tamanho={20} />
                  </a>
                  <a
                    className="pres-acao editar"
                    href={`/admin/produtores/${e.id}?ciclo=${cicloId}`}
                    target="_blank"
                    rel="noopener"
                    title="Editar cadastro (abre em outra aba)"
                    aria-label={`Editar cadastro de ${e.nome}`}
                  >
                    <Icone nome="lapis" tamanho={20} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={atual} porPagina={POR_PAGINA} total={visiveis.length} aoMudar={setPagina} rotulo="Páginas da presença" />
    </div>
  );
}
