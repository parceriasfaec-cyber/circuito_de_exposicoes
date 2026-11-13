import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { documentoCompleto, normalizar } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Linha = { id: string; codigo: string; nome: string; empresa: string | null; municipio: string; atividade: string | null; tipo_documento: string | null; documento: string | null; exposicoes: string[] | null };
const POR_PAGINA = 25;

export default async function Produtores({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string; ok?: string; excluido?: string; ciclo?: string; total?: string; exp?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const busca = (params.q ?? "").trim();
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const todos = await sql()<Linha[]>`
    select p.id, p.codigo, p.nome, p.empresa, p.municipio, p.atividade, p.tipo_documento, p.documento,
           array_remove(array_agg(regexp_replace(e.nome, '^Exposição (Agropecuária )?(de|do|da) ', '') order by e.data_inicio), null) exposicoes
    from produtores p
    left join participacoes pa on pa.produtor_id = p.id
    left join exposicoes e on e.id = pa.exposicao_id and e.ciclo_id = ${cid}
    group by p.id order by p.nome, p.municipio`;
  const nomesExposicoes = (await sql()<{ nome: string }[]>`
    select regexp_replace(nome, '^Exposição (Agropecuária )?(de|do|da) ', '') nome
    from exposicoes where ciclo_id = ${cid} order by data_inicio, nome`).map((e) => e.nome);

  const q = normalizar(busca);
  const achados = q ? todos.filter((l) => normalizar(`${l.codigo} ${l.nome} ${l.empresa ?? ""} ${l.municipio} ${l.documento ?? ""} ${l.atividade ?? ""}`).includes(q)) : todos;
  const totalDe = (l: Linha) => l.exposicoes?.length ?? 0;
  // Filtro por exposição: quantos produtores (da busca) participaram de cada uma.
  const porExposicao = new Map<string, number>();
  for (const l of achados) for (const e of l.exposicoes ?? []) porExposicao.set(e, (porExposicao.get(e) ?? 0) + 1);
  const expEscolhida = params.exp && nomesExposicoes.includes(params.exp) ? params.exp : null;
  const naExposicao = expEscolhida ? achados.filter((l) => l.exposicoes?.includes(expEscolhida)) : achados;
  // Filtro pelo total de exposições: um botão para cada total que existe, com quantos produtores têm esse total.
  const porTotal = new Map<number, number>();
  for (const l of naExposicao) porTotal.set(totalDe(l), (porTotal.get(totalDe(l)) ?? 0) + 1);
  const totais = [...porTotal.keys()].sort((a, b) => a - b);
  const totalEscolhido = params.total !== undefined && /^\d+$/.test(params.total) ? Number(params.total) : null;
  const filtrados = totalEscolhido === null ? naExposicao : naExposicao.filter((l) => totalDe(l) === totalEscolhido);
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(params.pagina) || 1), paginas);
  const visiveis = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const url = (n: number, total: number | null = totalEscolhido, exp: string | null = expEscolhida) =>
    `/admin/produtores?${new URLSearchParams({ ...(busca ? { q: busca } : {}), ...(params.ciclo ? { ciclo: params.ciclo } : {}), ...(exp ? { exp } : {}), ...(total !== null ? { total: String(total) } : {}), ...(n > 1 ? { pagina: String(n) } : {}) })}`;

  const maiorTotal = Math.max(1, ...totais.map((t) => porTotal.get(t) ?? 0));
  return (
    <>
      <CabecalhoAdmin titulo="Expositores" subtitulo="Os expositores são os mesmos de um ano para o outro. Em cada ciclo, marque as exposições em que cada um esteve." ciclos={ciclos} ciclo={ciclo} />

      {params.ok && <div className="ok">Expositor salvo.</div>}
      {params.excluido && <div className="ok">Expositor excluído.</div>}

      <div className="barra">
        <form className="busca" action="/admin/produtores" style={{ flex: 1, marginBottom: 0 }}>
          {params.ciclo && <input type="hidden" name="ciclo" value={params.ciclo} />}
          {totalEscolhido !== null && <input type="hidden" name="total" value={totalEscolhido} />}
          {expEscolhida && <input type="hidden" name="exp" value={expEscolhida} />}
          <div className="busca-campo">
            <Icone nome="busca" tamanho={20} />
            <input type="text" name="q" defaultValue={busca} placeholder="Buscar por ID, nome, empresa, município, documento ou atividade..." />
          </div>
          <button className="botao com-icone"><Icone nome="busca" tamanho={18} /> Buscar</button>
          {busca && <Link href={`/admin/produtores${params.ciclo ? `?ciclo=${params.ciclo}` : ""}`} className="link">Limpar</Link>}
        </form>
        <a
          href={`/admin/produtores/excel?${new URLSearchParams({ ciclo: cid, ...(busca ? { q: busca } : {}), ...(expEscolhida ? { exp: expEscolhida } : {}), ...(totalEscolhido !== null ? { total: String(totalEscolhido) } : {}) })}`}
          className="botao secundario com-icone" download
          title={busca || expEscolhida || totalEscolhido !== null ? "Baixa só os expositores do filtro escolhido" : "Baixa todos os expositores"}
        ><Icone nome="documento" tamanho={18} /> Baixar Excel</a>
        <Link href={`/admin/produtores/novo?ciclo=${cid}`} className="botao com-icone">+ Novo expositor</Link>
      </div>

      <nav className="filtros prod-filtro" aria-label="Filtrar por exposição">
        <span className="prod-filtro-rotulo"><Icone nome="local" tamanho={18} /> Total de Participantes por Exposição:</span>
        <Link href={url(1, null, null)} className={`filtro${expEscolhida === null ? " ativo" : ""}`}>Todas <span className="filtro-num">{achados.length}</span></Link>
        {nomesExposicoes.map((e) => (
          <Link key={e} href={url(1, null, e)} className={`filtro${expEscolhida === e ? " ativo" : ""}`} title={`Expositores que participaram de ${e}`}>
            {e} <span className="filtro-num">{porExposicao.get(e) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <nav className="filtros prod-filtro prod-filtro-colunas" aria-label="Filtrar pelo total de exposições">
        <span className="prod-filtro-rotulo"><Icone nome="trofeu" tamanho={18} /> Participantes por Nº de Exposições:</span>
        <Link href={url(1, null)} className={`filtro filtro-col${totalEscolhido === null ? " ativo" : ""}`}>
          <span className="filtro-col-num">{naExposicao.length}</span>
          <span className="filtro-col-barra" style={{ height: 44 }} />
          <span className="filtro-col-rot">Todos</span>
        </Link>
        {totais.map((t) => (
          <Link key={t} href={url(1, t)} className={`filtro filtro-col${totalEscolhido === t ? " ativo" : ""}`} title={`Expositores com ${t} ${t === 1 ? "exposição" : "exposições"}`}>
            <span className="filtro-col-num">{porTotal.get(t)}</span>
            <span className="filtro-col-barra" style={{ height: Math.max(3, Math.round(((porTotal.get(t) ?? 0) / maiorTotal) * 44)) }} />
            <span className="filtro-col-rot">{t === 0 ? "Nenhuma" : t}</span>
          </Link>
        ))}
      </nav>

      <div className="prod-quadro">
        <table className="tabela-org prod-tabela">
          <thead>
            <tr>
              <th className="centro">ID</th>
              <th><span><Icone nome="usuario" tamanho={18} /> Expositor</span></th>
              <th><span><Icone nome="trofeu" tamanho={18} /> Exposições</span></th>
              <th className="centro">Total de Exposições</th>
              <th className="centro">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={5} className="suave" style={{ textAlign: "center", padding: 24 }}>Nenhum expositor encontrado.</td></tr>
            )}
            {visiveis.map((l) => {
              const exps = l.exposicoes ?? [];
              return (
                <tr key={l.id}>
                  <td className="c-id centro"><span className="prod-id">{l.codigo}</span></td>
                  <td className="c-produtor">
                    <div className="prod-pessoa">
                      <span className="prod-avatar" aria-hidden="true"><Icone nome="usuario" tamanho={20} /></span>
                      <div>
                        <div className="nome">{l.nome}</div>
                        {l.empresa && <div className="prod-empresa">{l.empresa}</div>}
                        <div className="doc">{documentoCompleto(l.tipo_documento, l.documento)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="c-exposicoes">
                    {exps.length > 0 ? (
                      <div className="prod-chips">{exps.map((e, i) => <span key={i} className="prod-chip">{e}</span>)}</div>
                    ) : <span className="suave">nenhuma neste ciclo</span>}
                  </td>
                  <td className="c-total centro">
                    <span className={`prod-total${exps.length === 0 ? " zero" : ""}`} title={`${exps.length} ${exps.length === 1 ? "exposição" : "exposições"}`}>{exps.length}</span>
                  </td>
                  <td className="c-acoes centro">
                    <Link href={`/admin/produtores/${l.id}?ciclo=${cid}`} className="botao-detalhes so-icone" title="Editar" aria-label={`Editar ${l.nome}`}><Icone nome="lapis" tamanho={18} /></Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="rodape-tabela">
          <span className="total"><Icone nome="grafico" tamanho={20} /> Total de expositores: {filtrados.length}</span>
          {paginas > 1 && (
            <nav className="paginas" aria-label="Páginas">
              {Array.from({ length: paginas }, (_, i) => i + 1).map((n) =>
                n === pagina ? <span key={n} className="atual">{n}</span> : <Link key={n} href={url(n)}>{n}</Link>,
              )}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
