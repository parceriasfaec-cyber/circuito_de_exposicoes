"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Icone from "@/components/Icone";
import Paginacao, { paginar } from "@/components/Paginacao";
import { CAMPOS_BUSCA, casaBusca, documentoCompleto, type CampoBusca } from "@/lib/texto";
import { desmarcarPresenca, desmarcarTodasPresencas, marcarPresenca } from "./actions";

export type Expositor = {
  id: string;
  codigo: string;
  nome: string;
  empresa: string | null;
  municipio: string;
  tipo_documento: string | null;
  documento: string | null;
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
  const router = useRouter();
  const [atualizando, iniciarAtualizar] = useTransition();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const editandoRef = useRef<string | null>(null);
  const [destaqueId, setDestaqueId] = useState<string | null>(null);
  useEffect(() => { editandoRef.current = editandoId; }, [editandoId]);
  // Depois de salvar, rola até o expositor editado e deixa a linha destacada por uns segundos.
  useEffect(() => {
    if (!destaqueId) return;
    const t0 = setTimeout(() => document.getElementById(`exp-${destaqueId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
    const t1 = setTimeout(() => setDestaqueId(null), 4000);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [destaqueId]);
  // Atualiza a lista com o que veio do servidor (depois de salvar o cadastro na janela).
  useEffect(() => { setExpositores(doServidor); }, [doServidor]);
  // A janela de edição avisa quando o cadastro é salvo: fecha e recarrega os dados, mantendo a busca.
  useEffect(() => {
    function aoReceber(ev: MessageEvent) {
      if (ev.origin !== window.location.origin || ev.data?.tipo !== "produtor-salvo") return;
      if (editandoRef.current) setDestaqueId(editandoRef.current);
      setEditandoId(null);
      router.refresh();
    }
    function aoTecla(ev: KeyboardEvent) { if (ev.key === "Escape") setEditandoId(null); }
    window.addEventListener("message", aoReceber);
    window.addEventListener("keydown", aoTecla);
    return () => { window.removeEventListener("message", aoReceber); window.removeEventListener("keydown", aoTecla); };
  }, [router]);
  useEffect(() => setExpositores(doServidor), [doServidor]);
  const [busca, setBusca] = useState("");
  const [campoBusca, setCampoBusca] = useState<CampoBusca>("todos");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [filtroAval, setFiltroAval] = useState<FiltroAval>(avalInicial);
  const [pagina, setPagina] = useState(0);
  const [salvando, setSalvando] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const presentes = expositores.filter((e) => e.presente).length;
  const total = expositores.length;
  const pct = total ? Math.round((presentes / total) * 100) : 0;

  const visiveis = useMemo(() => {
    return expositores.filter(
      (e) =>
        (filtro === "todos" || (filtro === "presentes") === e.presente) &&
        (filtroAval === "todos" || (filtroAval === "avaliou") === avaliou(e)) &&
        casaBusca(campoBusca, busca, e),
    );
  }, [expositores, busca, campoBusca, filtro, filtroAval]);
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
          placeholder="Buscar por ID, nome, CPF, empresa ou município..."
          value={busca}
          onChange={(ev) => { setBusca(ev.target.value); setPagina(0); }}
          autoFocus
        />
        <div className="campos-busca" role="group" aria-label="Buscar em">
          {CAMPOS_BUSCA.map((c) => (
            <button key={c.id} type="button" className={`campo-busca${campoBusca === c.id ? " ativo" : ""}`} aria-pressed={campoBusca === c.id} onClick={() => { setCampoBusca(c.id); setPagina(0); }}>{c.rotulo}</button>
          ))}
        </div>
        <button type="button" className={`btn-atualizar${atualizando ? " girando" : ""}`} onClick={() => iniciarAtualizar(() => router.refresh())} disabled={atualizando} title="Atualizar a lista" aria-label="Atualizar a lista">
          <Icone nome="atualizar" tamanho={18} />
        </button>
        {presentes > 0 && (
          <button type="button" className="filtro desmarcar-todos" onClick={desmarcarTodos}>Desmarcar todos</button>
        )}
      </div>

      {erro && <div className="erro" role="alert">{erro}</div>}

      <div className="prod-quadro">
        <table className="tabela-org pres-tabela">
          <thead>
            <tr>
              <th aria-label="Foto" />
              <th>Expositor</th>
              <th className="centro">ID</th>
              <th className="centro"><span><Icone nome="trofeu" tamanho={18} /> Exposições</span></th>
              <th className="centro"><span><Icone nome="prancheta" tamanho={18} /> Avaliação das Etapas</span></th>
              <th className="centro"><span><Icone nome="local" tamanho={18} /> Votação Municípios</span></th>
              <th className="centro"><span><Icone nome="escudo" tamanho={18} /> Status de Presença</span></th>
              <th className="centro">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={8} className="suave" style={{ textAlign: "center", padding: 24 }}>Ninguém encontrado.</td></tr>
            )}
            {daPagina.map((e) => (
              <tr key={e.id} id={`exp-${e.id}`} className={`${e.presente ? "presente" : ""}${destaqueId === e.id ? " linha-destaque" : ""}`.trim() || undefined}>
                <td className="pres-avatar-cel"><span className="pres-avatar" aria-hidden="true"><Icone nome="usuario" tamanho={18} /></span></td>
                <td>
                  <div className="nome">{e.nome}</div>
                  <div className="doc">{documentoCompleto(e.tipo_documento, e.documento)}</div>
                  {e.empresa && <div className="prod-empresa">{e.empresa}</div>}
                </td>
                <td className="centro"><span className="prod-id">{e.codigo}</span></td>
                <td className="centro">
                  <span className={`prod-total${e.total_exposicoes === 0 ? " zero" : ""}`} title={e.exposicoes ?? "Nenhuma exposição neste ciclo"}>
                    {e.total_exposicoes}
                  </span>
                </td>
                <td className="centro">
                  {avaliou(e) ? (
                    <span className="pres-pill concl" title="Avaliou"><Icone nome="checkCirculo" tamanho={18} /> Concluída</span>
                  ) : (
                    <span className="pres-pill pend" title="Não avaliou"><Icone nome="relogio" tamanho={18} /> Pendente</span>
                  )}
                </td>
                <td className="centro">
                  {e.votou_cidades ? (
                    <span className="pres-pill concl" title="Votou nos municípios"><Icone nome="checkCirculo" tamanho={18} /> Concluída</span>
                  ) : (
                    <span className="pres-pill nao" title="Ainda não votou nos municípios"><Icone nome="prancheta" tamanho={18} /> Não iniciada</span>
                  )}
                </td>
                <td className="centro">
                  {e.presente ? (
                    <span className="pres-txt sim" title={e.hora ? `Presente · marcado às ${e.hora}` : "Presente"}><Icone nome="checkCirculo" tamanho={20} /> Presente</span>
                  ) : (
                    <span className="pres-txt ausente" title="Ausente"><Icone nome="relogio" tamanho={20} /> Ausente</span>
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
                    href={`/admin/produtores/${e.id}?ciclo=${cicloId}&voltar=presenca`}
                    onClick={(ev) => { if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return; ev.preventDefault(); setEditandoId(e.id); }}
                    title="Editar cadastro (abre aqui mesmo)"
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

      {editandoId && (
        <div className="modal-edicao" role="dialog" aria-modal="true" aria-label="Editar expositor" onClick={() => setEditandoId(null)}>
          <div className="modal-edicao-caixa" onClick={(ev) => ev.stopPropagation()}>
            <button type="button" className="modal-edicao-fechar" onClick={() => setEditandoId(null)} aria-label="Fechar">× Fechar</button>
            <iframe className="modal-edicao-quadro" title="Editar expositor" src={`/admin/produtores/${editandoId}?ciclo=${cicloId}&voltar=presenca`} />
          </div>
        </div>
      )}
    </div>
  );
}
