import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Linha = { id: string; nome: string; municipio: string; local: string | null; data_inicio: Date; data_fim: Date; participantes: number; avaliacoes: number };

export default async function Exposicoes({ searchParams }: { searchParams: Promise<{ ok?: string; excluida?: string; ciclo?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const lista = await sql()<Linha[]>`
    select e.id, e.nome, e.municipio, e.local, e.data_inicio, e.data_fim,
           (select count(*)::int from participacoes p where p.exposicao_id = e.id) participantes,
           (select count(*)::int from avaliacoes a where a.exposicao_id = e.id) avaliacoes
    from exposicoes e where e.ciclo_id = ${cid} order by e.data_inicio, e.nome`;

  return (
    <>
      <CabecalhoAdmin titulo="Exposições" subtitulo="Cadastre as exposições do Circuito. Cada nova exposição já vem com as 5 perguntas padrão." ciclos={ciclos} ciclo={ciclo} />

      {params.ok && <div className="ok">Exposição salva.</div>}
      {params.excluida && <div className="ok">Exposição excluída.</div>}

      <div className="barra">
        <span className="total" style={{ flex: "none" }}><Icone nome="trofeu" tamanho={20} /> {lista.length} exposições no {ciclo?.nome ?? "ciclo"}</span>
        <Link href={`/admin/exposicoes/nova?ciclo=${cid}`} className="botao com-icone">+ Nova exposição</Link>
      </div>

      <table className="tabela-org">
        <thead>
          <tr>
            <th><span><Icone nome="trofeu" tamanho={18} /> Exposição</span></th>
            <th><span><Icone nome="local" tamanho={18} /> Município</span></th>
            <th>Período</th>
            <th className="num">Participantes</th>
            <th className="num">Avaliações</th>
            <th style={{ textAlign: "center" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((e) => (
            <tr key={e.id}>
              <td className="c-produtor">
                <div className="nome">{e.nome}</div>
                {e.local && <div className="doc">{e.local}</div>}
              </td>
              <td className="c-municipio"><span className="municipio"><Icone nome="local" tamanho={16} />{e.municipio}</span></td>
              <td className="c-exposicoes">{formatarData(e.data_inicio)} a {formatarData(e.data_fim)}</td>
              <td className="num c-exposicoes">{e.participantes}</td>
              <td className="num c-exposicoes">{e.avaliacoes}</td>
              <td className="c-acoes" style={{ textAlign: "center" }}>
                <Link href={`/admin/exposicoes/${e.id}`} className="botao-detalhes">Editar</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
