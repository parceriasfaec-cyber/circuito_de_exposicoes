import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { mascararDocumento, normalizar } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Linha = { id: string; nome: string; municipio: string; atividade: string | null; tipo_documento: string | null; documento: string | null; exposicoes: string[] | null };
const POR_PAGINA = 25;

export default async function Produtores({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string; ok?: string; excluido?: string; ciclo?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const busca = (params.q ?? "").trim();
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const todos = await sql()<Linha[]>`
    select p.id, p.nome, p.municipio, p.atividade, p.tipo_documento, p.documento,
           array_remove(array_agg(regexp_replace(e.nome, '^Exposição (Agropecuária )?(de|do|da) ', '') order by e.data_inicio), null) exposicoes
    from produtores p
    left join participacoes pa on pa.produtor_id = p.id
    left join exposicoes e on e.id = pa.exposicao_id and e.ciclo_id = ${cid}
    group by p.id order by p.nome, p.municipio`;

  const q = normalizar(busca);
  const filtrados = q ? todos.filter((l) => normalizar(`${l.nome} ${l.municipio} ${l.documento ?? ""} ${l.atividade ?? ""}`).includes(q)) : todos;
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(params.pagina) || 1), paginas);
  const visiveis = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const url = (n: number) => `/admin/produtores?${new URLSearchParams({ ...(busca ? { q: busca } : {}), ...(params.ciclo ? { ciclo: params.ciclo } : {}), ...(n > 1 ? { pagina: String(n) } : {}) })}`;

  return (
    <>
      <CabecalhoAdmin titulo="Produtores" subtitulo="Os produtores são os mesmos de um ano para o outro. Em cada ciclo, marque as exposições em que cada um esteve." ciclos={ciclos} ciclo={ciclo} />

      {params.ok && <div className="ok">Produtor salvo.</div>}
      {params.excluido && <div className="ok">Produtor excluído.</div>}

      <div className="barra">
        <form className="busca" action="/admin/produtores" style={{ flex: 1, marginBottom: 0 }}>
          {params.ciclo && <input type="hidden" name="ciclo" value={params.ciclo} />}
          <div className="busca-campo">
            <Icone nome="busca" tamanho={20} />
            <input type="text" name="q" defaultValue={busca} placeholder="Buscar por nome, município, documento ou atividade..." />
          </div>
          <button className="botao com-icone"><Icone nome="busca" tamanho={18} /> Buscar</button>
          {busca && <Link href="/admin/produtores" className="link">Limpar</Link>}
        </form>
        <Link href={`/admin/produtores/novo?ciclo=${cid}`} className="botao com-icone">+ Novo produtor</Link>
      </div>

      <table className="tabela-org">
        <thead>
          <tr>
            <th><span><Icone nome="usuario" tamanho={18} /> Produtor</span></th>
            <th><span><Icone nome="local" tamanho={18} /> Município</span></th>
            <th>Atividade</th>
            <th><span><Icone nome="trofeu" tamanho={18} /> Exposições</span></th>
            <th style={{ textAlign: "center" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((l) => (
            <tr key={l.id}>
              <td className="c-produtor">
                <div className="nome">{l.nome}</div>
                <div className="doc">{mascararDocumento(l.tipo_documento, l.documento)}</div>
              </td>
              <td className="c-municipio"><span className="municipio"><Icone nome="local" tamanho={16} />{l.municipio}</span></td>
              <td className="c-exposicoes">{l.atividade ?? <span className="suave">—</span>}</td>
              <td className="c-exposicoes">
                {l.exposicoes && l.exposicoes.length > 0 ? l.exposicoes.join(", ") : <span className="suave">nenhuma neste ciclo</span>}
              </td>
              <td className="c-acoes" style={{ textAlign: "center" }}>
                <Link href={`/admin/produtores/${l.id}?ciclo=${cid}`} className="botao-detalhes">Editar</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rodape-tabela">
        <span className="total"><Icone nome="grafico" tamanho={20} /> Total de produtores: {filtrados.length}</span>
        {paginas > 1 && (
          <nav className="paginas" aria-label="Páginas">
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) =>
              n === pagina ? <span key={n} className="atual">{n}</span> : <Link key={n} href={url(n)}>{n}</Link>,
            )}
          </nav>
        )}
      </div>
    </>
  );
}
