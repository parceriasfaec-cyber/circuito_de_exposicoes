import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Linha = { id: string; nome: string; municipio: string; local: string | null; responsavel: string | null; data_inicio: Date; data_fim: Date; participantes: number; avaliacoes: number };

export default async function Exposicoes({ searchParams }: { searchParams: Promise<{ ok?: string; excluida?: string; ciclo?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const lista = await sql()<Linha[]>`
    select e.id, e.nome, e.municipio, e.local, e.responsavel, e.data_inicio, e.data_fim,
           (select count(*)::int from participacoes p where p.exposicao_id = e.id) participantes,
           (select count(*)::int from avaliacoes a where a.exposicao_id = e.id) avaliacoes
    from exposicoes e where e.ciclo_id = ${cid} order by e.data_inicio, e.nome`;

  return (
    <>
      <CabecalhoAdmin titulo="Exposições" subtitulo="Cadastre as exposições do Circuito. Cada nova exposição já vem com as 10 perguntas padrão." ciclos={ciclos} ciclo={ciclo} />

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
            <th><span><Icone nome="calendario" tamanho={18} /> Período</span></th>
            <th className="centro"><span><Icone nome="usuarios" tamanho={18} /> Participantes</span></th>
            <th className="centro"><span><Icone nome="estrela" tamanho={18} /> Avaliações</span></th>
            <th className="centro"><span><Icone nome="engrenagem" tamanho={18} /> Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {lista.map((e) => (
            <tr key={e.id}>
              <td className="c-produtor">
                <div className="nome">{e.nome}</div>
                {e.responsavel && <div className="doc">Responsável: {e.responsavel}</div>}
                {e.local && <div className="doc">{e.local}</div>}
              </td>
              <td className="c-municipio"><span className="municipio"><Icone nome="local" tamanho={16} />{e.municipio}</span></td>
              <td className="c-exposicoes"><span className="rotulo-celular"><Icone nome="calendario" tamanho={16} /></span>{formatarData(e.data_inicio)} a {formatarData(e.data_fim)}</td>
              <td className="centro c-exposicoes"><span className="rotulo-celular"><Icone nome="usuarios" tamanho={16} /> Participantes:</span>{e.participantes}</td>
              <td className="centro c-exposicoes"><span className="rotulo-celular"><Icone nome="estrela" tamanho={16} /> Avaliações:</span>{e.avaliacoes}</td>
              <td className="centro c-acoes">
                <Link href={`/admin/exposicoes/${e.id}`} className="botao-detalhes"><Icone nome="lapis" tamanho={16} /> Editar</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
