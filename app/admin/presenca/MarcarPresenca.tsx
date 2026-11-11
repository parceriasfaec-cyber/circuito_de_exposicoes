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
  exposicoes: string | null;
};

type Filtro = "todos" | "presentes" | "faltam";
export type FiltroAval = "todos" | "avaliou" | "nao";

const avaliou = (e: { total_exposicoes: number; avaliadas: number }) => e.total_exposicoes > 0 && e.avaliadas >= e.total_exposicoes;

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
        await desmarcarPresenca(cicloId, e.id);
        atualizar(e.id, { presente: false, hora: null, marcado_em: null });
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
    if (!confirm(`Tirar a presença dos ${presentes} expositores marcados?`)) return;
    const antes = expositores;
    setErro(null);
    setExpositores((lista) => lista.map((x) => ({ ...x, presente: false, hora: null, marcado_em: null })));
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
      <div className="cartao pres-cabeca">
        <div className="pres-contador">
          <span className="pres-numero">{presentes}</span>
          <span>de {total} expositores presentes · {pct}%</span>
          <div className="pres-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        </div>
        <input
          className="pres-busca"
          type="search"
          placeholder="Buscar por ID, nome, empresa ou município..."
          value={busca}
          onChange={(ev) => { setBusca(ev.target.value); setPagina(0); }}
          autoFocus
        />
        <div className="pres-filtros" role="tablist">
          {([["todos", `Todos (${total})`], ["presentes", `Presentes (${presentes})`], ["faltam", `Faltam (${total - presentes})`]] as const).map(([f, rotulo]) => (
            <button key={f} type="button" role="tab" aria-selected={filtro === f} className={`filtro${filtro === f ? " ativo" : ""}`} onClick={() => { setFiltro(f); setPagina(0); }}>
              {rotulo}
            </button>
          ))}
          {presentes > 0 && (
            <button type="button" className="filtro desmarcar-todos" onClick={desmarcarTodos}>Desmarcar todos</button>
          )}
        </div>
        <div className="pres-filtros" role="tablist" aria-label="Filtro da avaliação">
          <span className="pres-filtros-rotulo"><Icone nome="prancheta" tamanho={18} /> Avaliação:</span>
          {([["todos", `Todos (${total})`], ["avaliou", `Avaliou (${avaliaram})`], ["nao", `Não avaliou (${total - avaliaram})`]] as const).map(([f, rotulo]) => (
            <button key={f} type="button" role="tab" aria-selected={filtroAval === f} className={`filtro${filtroAval === f ? " ativo" : ""}`} onClick={() => { setFiltroAval(f); setPagina(0); }}>
              {rotulo}
            </button>
          ))}
        </div>
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
              <th className="centro"><span><Icone nome="escudo" tamanho={18} /> Status de Presença</span></th>
              <th className="centro">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={6} className="suave" style={{ textAlign: "center", padding: 24 }}>Ninguém encontrado.</td></tr>
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
                    <span className="pres-aval avaliou"><Icone nome="check" tamanho={16} /> Avaliou</span>
                  ) : (
                    <span className="pres-aval nao"><Icone nome="alerta" tamanho={16} /> Não avaliou</span>
                  )}
                </td>
                <td className="centro">
                  {e.presente ? (
                    <span className="pres-status presente" title={e.hora ? `Marcado às ${e.hora}` : undefined}>
                      <Icone nome="check" tamanho={18} /> Presente{e.hora ? <small>{e.hora}</small> : null}
                    </span>
                  ) : (
                    <span className="pres-status pendente"><Icone nome="relogio" tamanho={18} /> Pendente</span>
                  )}
                </td>
                <td className="centro">
                  <button
                    type="button"
                    className={`pres-acao${e.presente ? " desfazer" : ""}`}
                    onClick={() => alternar(e)}
                    disabled={salvando.has(e.id)}
                    title={e.presente ? "Desfazer presença" : "Marcar presença"}
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
