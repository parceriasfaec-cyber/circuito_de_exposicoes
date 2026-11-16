import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { anoCredenciamento } from "@/lib/credenciamento";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { documentoCompleto, normalizar } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Linha = { id: string; codigo: string; nome: string; empresa: string | null; municipio: string; atividade: string | null; tipo_documento: string | null; documento: string | null; exposicoes: string[] | null; avaliadas: number; presente: boolean; votou_cidades: boolean };
const POR_PAGINA = 25;

export default async function Produtores({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string; ok?: string; excluido?: string; ciclo?: string; total?: string; exp?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const busca = (params.q ?? "").trim();
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";
  const ano = await anoCredenciamento();

  const todos = await sql()<Linha[]>`
    select (select count(*)::int from avaliacoes av join exposicoes ev on ev.id = av.exposicao_id where av.produtor_id = p.id and ev.ciclo_id = ${cid}) avaliadas,
           exists (select 1 from presencas pr where pr.produtor_id = p.id and pr.ciclo_id = ${cid}) presente,
           exists (select 1 from votos_cidades vc where vc.produtor_id = p.id and vc.ano = ${ano}) votou_cidades, p.id, p.codigo, p.nome, p.empresa, p.municipio, p.atividade, p.tipo_documento, p.documento,
           array_remove(array_agg(regexp_replace(e.nome, '^Exposição (Agropecuária )?(de|do|da) ', '') order by e.data_inicio), null) exposicoes
    from produtores p
    left join participacoes pa on pa.produtor_id = p.id
    left join exposicoes e on e.id = pa.exposicao_id and e.ciclo_id = ${cid}
    group by p.id order by p.nome, p.municipio`;
  const nomesExposicoes = (await sql()<{ nome: string }[]>`
    select regexp_replace(nome, '^Exposição (Agropecuária )?(de|do|da) ', '') nome
    from exposicoes where ciclo_id = ${cid} order by data_inicio, nome`).map((e) => e.nome);

  const q = normalizar(busca);
  const achados = q ? todos.filter((l) => normalizar(`${l.codigo} ${l.nome} ${l.empresa ?? ""} ${l.municipio} ${l.documento ?? ""} ${l.atividade ?? ""} ${(l.exposicoes ?? []).join(" ")}`).includes(q)) : todos;
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

      <details className="prod-filtros-caixa" open={expEscolhida !== null || totalEscolhido !== null}>
        <summary>Filtros{expEscolhida !== null || totalEscolhido !== null ? " (ativos)" : ""}</summary>
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

      </details>

      <div className="prod-quadro">
        <div className="prod-topo">
          <h2 className="prod-titulo"><Icone nome="usuarios" tamanho={28} /> Expositores Cadastrados</h2>
          <form className="prod-busca" action="/admin/produtores">
            {params.ciclo && <input type="hidden" name="ciclo" value={params.ciclo} />}
            {totalEscolhido !== null && <input type="hidden" name="total" value={totalEscolhido} />}
            {expEscolhida && <input type="hidden" name="exp" value={expEscolhida} />}
            <Icone nome="busca" tamanho={20} />
            <input type="text" name="q" defaultValue={busca} placeholder="Pesquisar expositor ou exposição..." aria-label="Pesquisar por expositor ou exposição" />
            {busca && <Link href={`/admin/produtores${params.ciclo ? `?ciclo=${params.ciclo}` : ""}`} className="prod-limpar" title="Limpar busca">×</Link>}
          </form>
          <a
            href={`/admin/produtores/excel?${new URLSearchParams({ ciclo: cid, ...(busca ? { q: busca } : {}), ...(expEscolhida ? { exp: expEscolhida } : {}), ...(totalEscolhido !== null ? { total: String(totalEscolhido) } : {}) })}`}
            className="botao secundario com-icone" download
            title={busca || expEscolhida || totalEscolhido !== null ? "Baixa só os expositores do filtro escolhido" : "Baixa todos os expositores"}
          ><Icone nome="documento" tamanho={18} /> Excel</a>
          <Link href={`/admin/produtores/novo?ciclo=${cid}`} className="botao com-icone"><span className="prod-mais">+</span> Novo Expositor</Link>
        </div>
        <table className="tabela-org prod-tabela">
          <thead>
            <tr>
              <th>ID</th>
              <th aria-label="Foto" />
              <th>Expositor</th>
              <th>Município</th>
              <th className="centro">Exposições</th>
              <th>Avaliação</th>
              <th>Votação Municípios</th>
              <th>Presença</th>
              <th className="direita">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={9} className="suave" style={{ textAlign: "center", padding: 24 }}>Nenhum expositor encontrado.</td></tr>
            )}
            {visiveis.map((l) => {
              const exps = l.exposicoes ?? [];
              const concluida = exps.length > 0 && l.avaliadas >= exps.length;
              return (
                <tr key={l.id}>
                  <td className="c-id"><span className="prod-id">{l.codigo}</span></td>
                  <td className="c-foto"><span className="prod-avatar" aria-hidden="true"><Icone nome="usuario" tamanho={18} /></span></td>
                  <td className="c-produtor"><span className="nome">{l.nome}</span></td>
                  <td className="c-municipio">{l.municipio === "Não informado" ? <span className="suave">—</span> : <span className="prod-mun"><Icone nome="local" tamanho={16} /> {l.municipio}</span>}</td>
                  <td className="c-exposicoes centro">
                    <span className={`prod-total${exps.length === 0 ? " zero" : ""}`} title={exps.length > 0 ? exps.join(", ") : "Nenhuma neste ciclo"}>{exps.length}</span>
                  </td>
                  <td>
                    {exps.length === 0 ? <span className="suave">—</span> : concluida
                      ? <span className="prod-status ok"><Icone nome="checkCirculo" tamanho={18} /> Concluída</span>
                      : <span className="prod-status pend"><Icone nome="relogio" tamanho={18} /> Pendente</span>}
                  </td>
                  <td>
                    {l.votou_cidades
                      ? <span className="prod-status ok"><Icone nome="checkCirculo" tamanho={18} /> Concluída</span>
                      : <span className="prod-status nao"><Icone nome="prancheta" tamanho={18} /> Não iniciada</span>}
                  </td>
                  <td>
                    {l.presente
                      ? <span className="prod-presenca ok"><Icone nome="checkCirculo" tamanho={20} /> Presente</span>
                      : <span className="prod-presenca ausente"><Icone nome="relogio" tamanho={20} /> Ausente</span>}
                  </td>
                  <td className="c-acoes">
                    <div className="prod-acoes">
                      <Link href={`/admin/avaliacoes/${l.id}?ciclo=${cid}`} className="botao-detalhes so-icone" title="Ver avaliação" aria-label={`Ver avaliação de ${l.nome}`}><Icone nome="olho" tamanho={16} /></Link>
                      <Link href={`/admin/produtores/${l.id}?ciclo=${cid}`} className="botao-detalhes so-icone" title="Editar" aria-label={`Editar ${l.nome}`}><Icone nome="lapis" tamanho={16} /></Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="rodape-tabela">
          <span className="prod-legenda">
            <span><i className="ponto ok" /> Concluída</span>
            <span><i className="ponto pend" /> Pendente</span>
            <span><i className="ponto nao" /> Não iniciada</span>
          </span>
          <nav className="paginas" aria-label="Páginas">
            {pagina > 1 ? <Link href={url(pagina - 1)} aria-label="Página anterior"><Icone nome="esquerda" tamanho={14} /></Link> : <span className="desligado"><Icone nome="esquerda" tamanho={14} /></span>}
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) =>
              n === pagina ? <span key={n} className="atual">{n}</span> : <Link key={n} href={url(n)}>{n}</Link>,
            )}
            {pagina < paginas ? <Link href={url(pagina + 1)} aria-label="Próxima página"><Icone nome="direita" tamanho={14} /></Link> : <span className="desligado"><Icone nome="direita" tamanho={14} /></span>}
          </nav>
          <span className="total">{filtrados.length === 0 ? "Nenhum registro" : `Mostrando ${(pagina - 1) * POR_PAGINA + 1} a ${Math.min(pagina * POR_PAGINA, filtrados.length)} de ${filtrados.length} registros`}</span>
        </div>
      </div>
    </>
  );
}
