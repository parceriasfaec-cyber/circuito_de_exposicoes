import Link from "next/link";
import { nomeCurto } from "@/lib/texto";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone, { type NomeIcone } from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { documentoCompleto, normalizar } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Item = { exposicao: string; avaliada: boolean; nota: number | null };
type Linha = {
  id: string;
  nome: string;
  municipio: string;
  tipo_documento: string | null;
  documento: string | null;
  total: number;
  avaliadas: number;
  itens: Item[];
};

const FILTROS: Record<string, { rotulo: string; icone: NomeIcone }> = {
  todos: { rotulo: "Todos", icone: "check" },
  concluidos: { rotulo: "Já avaliaram", icone: "estrela" },
  pendentes: { rotulo: "Ainda não avaliaram", icone: "proibido" },
};
type Filtro = keyof typeof FILTROS;
const POR_PAGINA = 25;

const curto = nomeCurto;

export default async function Avaliacoes({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string; pagina?: string; ciclo?: string }>;
}) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const filtro: Filtro = params.filtro && params.filtro in FILTROS ? params.filtro : "todos";
  const busca = (params.q ?? "").trim();
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const linhas = await sql()<Linha[]>`
    select p.id, p.nome, p.municipio, p.tipo_documento, p.documento,
           count(*)::int total,
           count(a.produtor_id)::int avaliadas,
           json_agg(json_build_object('exposicao', e.nome, 'avaliada', a.produtor_id is not null, 'nota', round(a.media * 10)::int)
                    order by e.data_inicio) itens
    from produtores p
    join participacoes pa on pa.produtor_id = p.id
    join exposicoes e on e.id = pa.exposicao_id and e.ciclo_id = ${cid}
    left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
    group by p.id
    order by p.nome, p.municipio`;

  // A avaliação é feita de uma vez só: o produtor avaliou (tudo) ou não avaliou.
  const concluido = (l: Linha) => l.avaliadas > 0;
  const contagem: Record<Filtro, number> = {
    todos: linhas.length,
    concluidos: linhas.filter(concluido).length,
    pendentes: linhas.filter((l) => !concluido(l)).length,
  };

  const q = normalizar(busca);
  const filtradas = linhas.filter((l) => {
    if (filtro === "concluidos" && !concluido(l)) return false;
    if (filtro === "pendentes" && concluido(l)) return false;
    if (q && !normalizar(`${l.nome} ${l.municipio} ${l.documento ?? ""}`).includes(q)) return false;
    return true;
  });

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(params.pagina) || 1), paginas);
  const visiveis = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const url = (mudar: { filtro?: Filtro; pagina?: number }) => {
    const sp = new URLSearchParams();
    sp.set("filtro", mudar.filtro ?? filtro);
    if (busca) sp.set("q", busca);
    if (params.ciclo) sp.set("ciclo", params.ciclo);
    if (mudar.pagina && mudar.pagina > 1) sp.set("pagina", String(mudar.pagina));
    return `/admin/avaliacoes?${sp}`;
  };

  return (
    <>
      <CabecalhoAdmin titulo="Quem já avaliou" subtitulo="Cada produtor avalia uma única vez as exposições em que participou." ciclos={ciclos} ciclo={ciclo} />

      <div className="barra">
        <div className="filtros">
          {(Object.keys(FILTROS) as Filtro[]).map((f) => (
            <Link key={f} href={url({ filtro: f })} className={`filtro${f === filtro ? " ativo" : ""}`}>
              <Icone nome={FILTROS[f].icone} tamanho={18} />
              {FILTROS[f].rotulo} <span className="filtro-num">{contagem[f]}</span>
            </Link>
          ))}
        </div>
        <Link href={url({ pagina })} className="acao-link" prefetch={false}>
          <Icone nome="atualizar" tamanho={18} /> Atualizar
        </Link>
      </div>

      <form className="busca" action="/admin/avaliacoes">
        <input type="hidden" name="filtro" value={filtro} />
        {params.ciclo && <input type="hidden" name="ciclo" value={params.ciclo} />}
        <div className="busca-campo">
          <Icone nome="busca" tamanho={20} />
          <input type="text" name="q" defaultValue={busca} placeholder="Buscar por nome, município ou documento..." />
        </div>
        <button className="botao com-icone"><Icone nome="busca" tamanho={18} /> Buscar</button>
        {busca && <Link href={`/admin/avaliacoes?filtro=${filtro}`} className="link">Limpar</Link>}
      </form>

      {visiveis.length === 0 ? (
        <div className="cartao"><p style={{ margin: 0 }}>Nenhum produtor encontrado.</p></div>
      ) : (
        <table className="tabela-org">
          <thead>
            <tr>
              <th><span><Icone nome="usuario" tamanho={18} /> Produtor</span></th>
              <th><span><Icone nome="local" tamanho={18} /> Município</span></th>
              <th><span><Icone nome="grafico" tamanho={18} /> Situação</span></th>
              <th><span><Icone nome="trofeu" tamanho={18} /> Exposições</span></th>
              <th style={{ textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => {
              const ok = concluido(l);
              return (
                <tr key={l.id}>
                  <td className="c-produtor">
                    <div className="nome">{l.nome}</div>
                    <div className="doc">{documentoCompleto(l.tipo_documento, l.documento)}</div>
                  </td>
                  <td className="c-municipio"><span className="municipio"><Icone nome="local" tamanho={16} />{l.municipio}</span></td>
                  <td className="c-situacao">
                    <span className={`situacao ${ok ? "concluido" : "pendente"}`}>
                      <Icone nome={ok ? "checkCirculo" : "alerta"} tamanho={20} />
                      <span>
                        {ok ? "Concluído" : "Não avaliou"}
                        <small>{ok ? "Todas avaliadas" : `0 de ${l.total}`}</small>
                      </span>
                    </span>
                  </td>
                  <td className="c-exposicoes">
                    <ul className="lista-exp">
                      {l.itens.map((i) => (
                        <li key={i.exposicao} className={i.avaliada ? "feito" : "falta"}>
                          {curto(i.exposicao)} - {i.avaliada ? `concluído (${i.nota} de 50 pontos)` : "pendente"}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="c-acoes" style={{ textAlign: "center" }}>
                    <Link href={`/admin/avaliacoes/${l.id}?ciclo=${cid}`} className="botao-detalhes">
                      <Icone nome="olho" tamanho={16} /> Ver detalhes
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="rodape-tabela">
        <span className="total">
          <Icone nome="grafico" tamanho={20} />
          Total de produtores: {filtradas.length}
          {filtradas.length !== linhas.length && <span className="suave" style={{ fontWeight: 600 }}> (de {linhas.length})</span>}
        </span>
        {paginas > 1 && (
          <nav className="paginas" aria-label="Páginas">
            {pagina > 1 ? (
              <Link href={url({ pagina: pagina - 1 })} aria-label="Página anterior"><Icone nome="esquerda" tamanho={18} /></Link>
            ) : (
              <span className="desligado"><Icone nome="esquerda" tamanho={18} /></span>
            )}
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) =>
              n === pagina ? <span key={n} className="atual">{n}</span> : <Link key={n} href={url({ pagina: n })}>{n}</Link>,
            )}
            {pagina < paginas ? (
              <Link href={url({ pagina: pagina + 1 })} aria-label="Próxima página"><Icone nome="direita" tamanho={18} /></Link>
            ) : (
              <span className="desligado"><Icone nome="direita" tamanho={18} /></span>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
