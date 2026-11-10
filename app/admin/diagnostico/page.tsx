import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { formatarMedia, partesPergunta } from "@/lib/escala";
import { ehAdmin } from "@/lib/sessao";
import { nomeCurto } from "@/lib/texto";
import BotaoPdf from "./BotaoPdf";

export const dynamic = "force-dynamic";

type Ranking = { exposicao_id: string; posicao: number; nome: string; questionarios: number; pontos: number; media_produtor: number | null };
type Pergunta = { ordem: number; texto: string; exp: number | null; circuito: number | null };

const fmt = (n: number | null) => (n === null ? "—" : formatarMedia(n));
const sinal = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatarMedia(Math.abs(n))}`;

/**
 * Diagnóstico da exposição que ficou em último lugar (entre as que receberam avaliação):
 * posição, distância para a penúltima e, pergunta por pergunta, a nota dela comparada com a média do Circuito.
 */
export default async function Diagnostico({ searchParams }: { searchParams: Promise<{ ciclo?: string; exp?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const { ciclo } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";
  const db = sql();

  const ranking = await db<Ranking[]>`
    select exposicao_id, posicao::int, nome, questionarios::int, pontos::int, media_produtor::float
    from v_ranking where ciclo_id = ${cid} order by posicao, nome`;
  const avaliadas = ranking.filter((r) => r.questionarios > 0 && r.media_produtor !== null);
  const semAvaliacao = ranking.filter((r) => r.questionarios === 0);

  if (avaliadas.length === 0) {
    return (
      <>
        <CabecalhoAdmin titulo="Avaliação por Circuito" subtitulo="A exposição que ficou em último lugar e por quê." />
        <div className="cartao"><p style={{ margin: 0 }}>Nenhuma exposição recebeu avaliação ainda.</p></div>
      </>
    );
  }

  const ultima = avaliadas[avaliadas.length - 1];
  const alvo = avaliadas.find((r) => r.exposicao_id === params.exp) ?? ultima;
  const ehUltima = alvo.exposicao_id === ultima.exposicao_id;
  const empatadasNoFim = avaliadas.filter((r) => r.posicao === ultima.posicao);
  const idx = avaliadas.indexOf(alvo);
  const acima = idx > 0 ? avaliadas[idx - 1] : null;
  const mediaCircuito = avaliadas.reduce((s, r) => s + (r.media_produtor ?? 0), 0) / avaliadas.length;

  const [prog] = await db<{ na_lista: number; responderam: number }[]>`
    select na_lista::int, responderam::int from v_progresso where ciclo_id = ${cid} and nome = ${alvo.nome}`;

  const perguntas = await db<Pergunta[]>`
    select q.ordem, min(q.texto) texto,
           (avg(r.nota) filter (where q.exposicao_id = ${alvo.exposicao_id}))::float exp,
           avg(r.nota)::float circuito
    from respostas r
    join perguntas q on q.id = r.pergunta_id
    join exposicoes e on e.id = q.exposicao_id
    where e.ciclo_id = ${cid}
    group by q.ordem order by q.ordem`;
  const notas = await db<{ nota: number; n: number }[]>`
    select r.nota::int nota, count(*)::int n from respostas r join perguntas q on q.id = r.pergunta_id
    where q.exposicao_id = ${alvo.exposicao_id} group by r.nota`;
  const totalNotas = notas.reduce((s, x) => s + x.n, 0);

  const comparadas = perguntas
    .filter((p) => p.exp !== null && p.circuito !== null)
    .map((p) => ({ ...p, titulo: partesPergunta(p.texto).titulo || `Pergunta ${p.ordem}`, dif: (p.exp as number) - (p.circuito as number) }));
  const fracos = [...comparadas].sort((a, b) => a.dif - b.dif).filter((p) => p.dif < 0).slice(0, 3);
  const fortes = [...comparadas].sort((a, b) => b.dif - a.dif).filter((p) => p.dif > 0).slice(0, 2);
  const maiorDif = Math.max(0.5, ...comparadas.map((p) => Math.abs(p.dif)));
  const poucas = alvo.questionarios < 3;

  return (
    <>
      <CabecalhoAdmin
        titulo="Avaliação por Circuito"
        subtitulo={ehUltima ? "A exposição que ficou em último lugar, a que sai do Circuito, e por que ela ficou atrás das outras." : "Por que esta exposição ficou nesta posição."}
      />

      <div className="diag-impresso so-imprimir">
        <strong>Circuito Cearense de Exposição · Avaliação por Circuito</strong>
        <span>{ciclo?.nome ?? ""} · gerado em {new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" }).replace(",", " às")}</span>
      </div>

      <form className="diag-escolha nao-imprimir" method="get">
        {params.ciclo && <input type="hidden" name="ciclo" value={params.ciclo} />}
        <label htmlFor="exp">Ver o diagnóstico de</label>
        <select id="exp" name="exp" defaultValue={alvo.exposicao_id}>
          {avaliadas.map((r) => (
            <option key={r.exposicao_id} value={r.exposicao_id}>
              {r.posicao}º · {nomeCurto(r.nome)}{r.exposicao_id === ultima.exposicao_id ? " (última)" : ""}
            </option>
          ))}
        </select>
        <button className="botao secundario pequeno">Ver</button>
        <BotaoPdf arquivo={`Avaliação ${nomeCurto(alvo.nome)} - ${ciclo?.nome ?? "Circuito"}`} />
      </form>

      <section className="diag-destaque">
        <div className="diag-posicao">
          <span>{alvo.posicao}º</span>
          <small>de {ranking.length}</small>
        </div>
        <div className="diag-destaque-corpo">
          <span className="diag-etiqueta">{ehUltima ? "Sai do Circuito · última colocada entre as avaliadas" : "Exposição escolhida"}</span>
          <h2>{alvo.nome}</h2>
          <div className="diag-numeros">
            <div><strong>{fmt(alvo.media_produtor)}</strong><small>média (de 10 a 50)</small></div>
            <div><strong>{formatarMedia(mediaCircuito)}</strong><small>média das exposições</small></div>
            <div><strong>{alvo.questionarios}</strong><small>{alvo.questionarios === 1 ? "avaliação" : "avaliações"}{prog ? ` de ${prog.na_lista} na lista` : ""}</small></div>
            {acima && (
              <div>
                <strong className={(alvo.media_produtor ?? 0) < (acima.media_produtor ?? 0) ? "diag-neg" : undefined}>
                  {sinal((alvo.media_produtor ?? 0) - (acima.media_produtor ?? 0))}
                </strong>
                <small>para {nomeCurto(acima.nome)} ({acima.posicao}º)</small>
              </div>
            )}
          </div>
        </div>
      </section>

      {poucas && (
        <div className="aviso-mini diag-aviso">
          <Icone nome="alerta" tamanho={18} /> Atenção: só {alvo.questionarios} {alvo.questionarios === 1 ? "produtor avaliou" : "produtores avaliaram"} esta exposição.
          Com tão poucas avaliações, a posição pode mudar muito. Vale esperar mais respostas antes de decidir.
        </div>
      )}
      {ehUltima && empatadasNoFim.length > 1 && (
        <div className="aviso-mini diag-aviso">
          Empate no último lugar: {empatadasNoFim.map((r) => nomeCurto(r.nome)).join(" e ")} têm a mesma posição. A organização precisa decidir.
        </div>
      )}

      <section className="bloco">
        <h2 className="bloco-titulo"><Icone nome="grafico" tamanho={22} /> Diagnóstico</h2>
        <div className="diag-resumo">
          {fracos.length > 0 ? (
            <p>
              <strong>{nomeCurto(alvo.nome)}</strong> ficou abaixo da média do Circuito principalmente em{" "}
              {fracos.map((p, i) => (
                <span key={p.ordem}>
                  {i > 0 && (i === fracos.length - 1 ? " e " : ", ")}
                  <strong>{p.titulo.toLowerCase()}</strong> ({fmt(p.exp)} contra {fmt(p.circuito)})
                </span>
              ))}
              .
            </p>
          ) : (
            <p>Esta exposição não ficou abaixo da média do Circuito em nenhuma pergunta.</p>
          )}
          {fortes.length > 0 && (
            <p>
              Pontos fortes: {fortes.map((p, i) => (
                <span key={p.ordem}>{i > 0 && " e "}<strong>{p.titulo.toLowerCase()}</strong> ({fmt(p.exp)})</span>
              ))}
              .
            </p>
          )}
        </div>

        <div className="tabela">
          <table className="tabela-simples diag-tabela">
            <thead>
              <tr><th>Pergunta</th><th className="num">Esta exposição</th><th className="num">Média do Circuito</th><th>Diferença</th></tr>
            </thead>
            <tbody>
              {comparadas.map((p) => {
                const fraco = fracos.some((f) => f.ordem === p.ordem);
                const forte = fortes.some((f) => f.ordem === p.ordem);
                return (
                  <tr key={p.ordem} className={fraco ? "diag-fraco" : forte ? "diag-forte" : undefined}>
                    <td><span className="diag-num">{p.ordem}</span> {p.titulo}</td>
                    <td className="num"><strong>{fmt(p.exp)}</strong></td>
                    <td className="num">{fmt(p.circuito)}</td>
                    <td>
                      <div className="diag-barra">
                        <span className="diag-barra-meio" />
                        <span
                          className={`diag-barra-valor ${p.dif < 0 ? "neg" : "pos"}`}
                          style={{ width: `${(Math.abs(p.dif) / maiorDif) * 50}%`, [p.dif < 0 ? "right" : "left"]: "50%" }}
                        />
                      </div>
                      <small className={p.dif < 0 ? "diag-neg" : "diag-pos"}>{sinal(p.dif)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="suave" style={{ margin: "10px 0 0" }}>Notas de 1 (muito ruim) a 5 (excelente). Em vermelho, as perguntas em que a exposição mais ficou abaixo da média.</p>
      </section>

      {totalNotas > 0 && (
        <section className="bloco">
          <h2 className="bloco-titulo"><Icone nome="prancheta" tamanho={22} /> Como foram as notas</h2>
          <div className="diag-notas">
            {[1, 2, 3, 4, 5].map((n) => {
              const q = notas.find((x) => x.nota === n)?.n ?? 0;
              const pct = Math.round((q / totalNotas) * 100);
              return (
                <div key={n} className="diag-nota">
                  <span className="diag-nota-rotulo">Nota {n}</span>
                  <div className="diag-nota-barra"><span className={`n${n}`} style={{ width: `${pct}%` }} /></div>
                  <span className="diag-nota-pct">{pct}% <small>({q})</small></span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {semAvaliacao.length > 0 && (
        <p className="suave">
          {semAvaliacao.map((r) => nomeCurto(r.nome)).join(" e ")} {semAvaliacao.length === 1 ? "ainda não recebeu" : "ainda não receberam"} nenhuma avaliação e
          não {semAvaliacao.length === 1 ? "entra" : "entram"} nesta análise. Veja em <Link href="/admin">Painel</Link>.
        </p>
      )}
    </>
  );
}
