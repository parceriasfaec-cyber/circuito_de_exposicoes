import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import FormPerguntas from "./FormPerguntas";

export const dynamic = "force-dynamic";

type Linha = {
  ordem: number;
  texto: string;
  textos: number;
  respostas: number;
  media: number | null;
  dist: Record<string, number> | null;
};

const NOTAS = [5, 6, 7, 8, 9, 10];

export default async function Perguntas({ searchParams }: { searchParams: Promise<{ ciclo?: string; ok?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  // As perguntas são as mesmas em todas as exposições do ciclo: mostra uma vez, com as notas de todas juntas.
  const linhas = await sql()<Linha[]>`
    select q.ordem,
           mode() within group (order by q.texto) texto,
           count(distinct q.texto)::int textos,
           count(r.nota)::int respostas,
           round(avg(r.nota), 2)::float media,
           (select json_object_agg(n, c) from (
              select r2.nota n, count(*) c from respostas r2
              join perguntas q2 on q2.id = r2.pergunta_id
              join exposicoes e2 on e2.id = q2.exposicao_id
              where e2.ciclo_id = ${cid} and q2.ordem = q.ordem group by r2.nota) d) dist
    from perguntas q
    join exposicoes e on e.id = q.exposicao_id and e.ciclo_id = ${cid}
    left join respostas r on r.pergunta_id = q.id
    group by q.ordem order by q.ordem`;

  const totalRespostas = linhas.reduce((n, l) => n + l.respostas, 0);

  return (
    <>
      <CabecalhoAdmin
        titulo="Perguntas da avaliação"
        subtitulo="As mesmas 5 perguntas valem para todas as exposições do ciclo. Veja a média de cada uma."
        ciclos={ciclos}
        ciclo={ciclo}
      />

      {params.ok && <div className="ok">Perguntas salvas para todas as exposições do {ciclo?.nome}.</div>}

      {linhas.length === 0 ? (
        <div className="cartao"><p style={{ margin: 0 }}>Este ciclo ainda não tem exposições. Cadastre em Exposições.</p></div>
      ) : (
        <>
          <div className="perguntas-lista">
            {linhas.map((l) => {
              const maior = Math.max(1, ...NOTAS.map((n) => l.dist?.[n] ?? 0));
              return (
                <section key={l.ordem} className="pergunta-cartao">
                  <div className="pergunta-num">{l.ordem}</div>
                  <div className="pergunta-corpo">
                    <p className="pergunta-texto">{l.texto}</p>
                    {l.textos > 1 && (
                      <p className="aviso-mini" style={{ marginTop: 6 }}>Atenção: esta pergunta tem textos diferentes em algumas exposições.</p>
                    )}
                    <div className="pergunta-dist" aria-label="Quantas vezes cada nota foi dada">
                      {NOTAS.map((n) => {
                        const c = l.dist?.[n] ?? 0;
                        return (
                          <div key={n} className="dist-col" title={`Nota ${n}: ${c} ${c === 1 ? "vez" : "vezes"}`}>
                            <span className="dist-qtd">{c}</span>
                            <span className="dist-barra"><span style={{ height: `${(c / maior) * 100}%` }} /></span>
                            <span className="dist-nota">{n}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pergunta-media">
                    <span className="rotulo">Média</span>
                    <strong>{l.media !== null ? l.media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}</strong>
                    <span className="suave">{l.respostas} {l.respostas === 1 ? "resposta" : "respostas"}</span>
                  </div>
                </section>
              );
            })}
          </div>
          <p className="suave">
            Notas de 5 (ruim) a 10 (excelente). {totalRespostas > 0 ? `Total de ${totalRespostas} respostas no ${ciclo?.nome}.` : "Ainda não há respostas neste ciclo."}
          </p>

          <section className="bloco" style={{ paddingTop: 6 }}>
            <h2 style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}><Icone nome="prancheta" tamanho={20} /> Editar as perguntas</h2>
            <FormPerguntas cicloId={cid} perguntas={linhas.map((l) => l.texto)} temRespostas={totalRespostas > 0} />
          </section>
        </>
      )}
    </>
  );
}
