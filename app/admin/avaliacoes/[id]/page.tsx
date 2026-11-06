import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData, mascararDocumento } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Exp = {
  id: string;
  nome: string;
  data_inicio: Date;
  data_fim: Date;
  nota_total: number | null;
  enviada_em: Date | null;
  respostas: { ordem: number; texto: string; nota: number | null }[];
};

const classeNota = (n: number) => (n <= 6 ? "baixa" : n <= 8 ? "media" : "");

export default async function DetalheProdutor({ params }: { params: Promise<{ id: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = sql();
  const [p] = await db<{ nome: string; municipio: string; atividade: string | null; tipo_documento: string | null; documento: string | null }[]>`
    select nome, municipio, atividade, tipo_documento, documento from produtores where id = ${id}`;
  if (!p) notFound();

  const exposicoes = await db<Exp[]>`
    select e.id, e.nome, e.data_inicio, e.data_fim, a.nota_total, a.enviada_em,
           coalesce((
             select json_agg(json_build_object('ordem', q.ordem, 'texto', q.texto, 'nota', r.nota) order by q.ordem)
             from perguntas q
             left join respostas r on r.pergunta_id = q.id and r.produtor_id = pa.produtor_id and r.exposicao_id = e.id
             where q.exposicao_id = e.id
           ), '[]') respostas
    from participacoes pa
    join exposicoes e on e.id = pa.exposicao_id
    left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
    where pa.produtor_id = ${id}
    order by e.data_inicio`;

  const avaliou = exposicoes.some((e) => e.nota_total !== null);
  const enviada = exposicoes.find((e) => e.enviada_em)?.enviada_em ?? null;

  return (
    <>
      <CabecalhoAdmin titulo={p.nome} subtitulo="Detalhes da avaliação do produtor." />

      <div className="barra">
        <Link href="/admin/avaliacoes" className="acao-link"><Icone nome="voltar" tamanho={18} /> Voltar para Quem já avaliou</Link>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="kpi">
          <span className="kpi-icone"><Icone nome="usuario" tamanho={28} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Produtor</div>
            <div className="kpi-valor menor">{p.nome}</div>
            <div className="kpi-nota">{mascararDocumento(p.tipo_documento, p.documento)}{p.atividade ? ` · ${p.atividade}` : ""}</div>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi-icone claro"><Icone nome="local" tamanho={28} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Município</div>
            <div className="kpi-valor menor">{p.municipio}</div>
          </div>
        </div>
        <div className={`kpi${avaliou ? " destaque" : ""}`}>
          <span className="kpi-icone"><Icone nome={avaliou ? "checkCirculo" : "alerta"} tamanho={28} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Situação</div>
            <div className={`kpi-valor menor ${avaliou ? "status-aberta" : "status-fechada"}`}>{avaliou ? "Concluído" : "Não avaliou"}</div>
            <div className="kpi-nota">
              {avaliou && enviada
                ? `Enviada em ${enviada.toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" })}`
                : `${exposicoes.length} ${exposicoes.length === 1 ? "exposição" : "exposições"} para avaliar`}
            </div>
          </div>
        </div>
      </div>

      {exposicoes.map((e) => (
        <section key={e.id} className="bloco">
          <h2 className="bloco-titulo">
            <Icone nome="trofeu" tamanho={22} /> {e.nome}
            <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.95rem" }}>
              {e.nota_total !== null ? `${e.nota_total} de 50 pontos` : "Pendente"}
            </span>
          </h2>
          <p className="suave" style={{ margin: "0 0 8px" }}>{formatarData(e.data_inicio)} a {formatarData(e.data_fim)}</p>
          <div className="tabela">
            <table className="tabela-simples notas-tabela">
              <thead>
                <tr><th style={{ width: 40 }}>#</th><th>Pergunta</th><th style={{ width: 90, textAlign: "center" }}>Nota</th></tr>
              </thead>
              <tbody>
                {e.respostas.map((r) => (
                  <tr key={r.ordem}>
                    <td>{r.ordem}</td>
                    <td>{r.texto}</td>
                    <td className="nota">
                      {r.nota !== null ? <span className={`nota-pill ${classeNota(r.nota)}`}>{r.nota}</span> : <span className="suave">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
