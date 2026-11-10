import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { formatarMedia, partesPergunta } from "@/lib/escala";
import { ehAdmin } from "@/lib/sessao";
import { nomeCurto } from "@/lib/texto";
import BotaoPdf, { ImprimirAoAbrir } from "./BotaoPdf";

export const dynamic = "force-dynamic";

type Ranking = { exposicao_id: string; posicao: number; nome: string; questionarios: number; pontos: number; media_produtor: number | null };
type Pergunta = { ordem: number; texto: string; exp: number | null; circuito: number | null; pontos: number | null };

const fmt = (n: number | null) => (n === null ? "—" : formatarMedia(n));
const sinal = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatarMedia(Math.abs(n))}`;

/**
 * Diagnóstico da exposição que ficou em último lugar (entre as que receberam avaliação):
 * posição, distância para a penúltima e, pergunta por pergunta, a nota dela comparada com a média do Circuito.
 */
export default async function Diagnostico({ searchParams }: { searchParams: Promise<{ ciclo?: string; exp?: string; todas?: string; imprimir?: string }> }) {
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
  const todas = params.todas === "1" || params.exp === "";
  const arquivoTodas = `Avaliação por Circuito - todas - ${ciclo?.nome ?? "Circuito"}`;
  const ehUltima = alvo.exposicao_id === ultima.exposicao_id;

  return (
    <>
      <CabecalhoAdmin
        titulo="Avaliação por Circuito"
        subtitulo={ehUltima ? "A exposição que ficou em último lugar, a que sai do Circuito, e por que ela ficou atrás das outras." : "Por que esta exposição ficou nesta posição."}
      />


      <form className="diag-escolha nao-imprimir" method="get">
        {params.ciclo && <input type="hidden" name="ciclo" value={params.ciclo} />}
        <label htmlFor="exp">Ver o diagnóstico de</label>
        <select id="exp" name="exp" defaultValue={todas ? "" : alvo.exposicao_id}>
          <option value="">Todas as exposições</option>
          {avaliadas.map((r) => (
            <option key={r.exposicao_id} value={r.exposicao_id}>
              {r.posicao}º · {nomeCurto(r.nome)}{r.exposicao_id === ultima.exposicao_id ? " (última)" : ""}
            </option>
          ))}
        </select>
        <button className="botao secundario pequeno">Ver</button>
        <div className="diag-pdfs">
          {!todas && <BotaoPdf rotulo="PDF desta exposição" arquivo={`Avaliação ${nomeCurto(alvo.nome)} - ${ciclo?.nome ?? "Circuito"}`} />}
          <BotaoPdf
            rotulo="PDF de todas as exposições"
            arquivo={arquivoTodas}
            secundario={!todas}
            href={todas ? undefined : `/admin/diagnostico?${new URLSearchParams({ ...(params.ciclo ? { ciclo: params.ciclo } : {}), todas: "1", imprimir: "1" })}`}
          />
        </div>
      </form>
      {todas && params.imprimir === "1" && <ImprimirAoAbrir arquivo={arquivoTodas} />}

      {todas ? (
        avaliadas.map((r, k) => (
          <div key={r.exposicao_id} className={k > 0 ? "diag-pagina" : undefined}>
            <Relatorio alvo={r} avaliadas={avaliadas} ranking={ranking} cid={cid} cicloNome={ciclo?.nome ?? ""} todas />
          </div>
        ))
      ) : (
        <Relatorio alvo={alvo} avaliadas={avaliadas} ranking={ranking} cid={cid} cicloNome={ciclo?.nome ?? ""} />
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

/** Diagnóstico de uma exposição: posição, números e comparação pergunta a pergunta. */
async function Relatorio({ alvo, avaliadas, ranking, cid, cicloNome, todas = false }: {
  alvo: Ranking; avaliadas: Ranking[]; ranking: Ranking[]; cid: string; cicloNome: string; todas?: boolean;
}) {
  const db = sql();
  const ultima = avaliadas[avaliadas.length - 1];
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
           (sum(r.nota) filter (where q.exposicao_id = ${alvo.exposicao_id}))::int pontos,
           avg(r.nota)::float circuito
    from respostas r
    join perguntas q on q.id = r.pergunta_id
    join exposicoes e on e.id = q.exposicao_id
    where e.ciclo_id = ${cid}
    group by q.ordem order by q.ordem`;

  const comparadas = perguntas
    .filter((p) => p.exp !== null && p.circuito !== null)
    .map((p) => ({ ...p, titulo: partesPergunta(p.texto).titulo || `Pergunta ${p.ordem}`, dif: (p.exp as number) - (p.circuito as number) }));
  const fracos = [...comparadas].sort((a, b) => a.dif - b.dif).filter((p) => p.dif < 0).slice(0, 3);
  const fortes = [...comparadas].sort((a, b) => b.dif - a.dif).filter((p) => p.dif > 0).slice(0, 2);
  const maiorDif = Math.max(0.5, ...comparadas.map((p) => Math.abs(p.dif)));
  const poucas = alvo.questionarios < 3;


  return (
    <>
      {/* Cabeçalho do relatório impresso, com as logos (repete em cada exposição) */}
      <div className="diag-impresso so-imprimir">
        <div className="diag-impresso-logos">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marcas/sistema-cor.png" alt="Sistema FAEC, SENAR Ceará e Sindicato Rural" width={900} height={331} />
          <span className="diag-impresso-sep" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marcas/logo-circuito-largo.png" alt="Circuito Cearense de Exposição" width={953} height={394} />
        </div>
        <div className="diag-impresso-texto">
          <strong>Avaliação por Circuito</strong>
          <span>{cicloNome} · gerado em {new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" }).replace(",", " às")}</span>
        </div>
      </div>
      <section className="diag-destaque">
        <div className="diag-posicao">
          <span>{alvo.posicao}º</span>
          <small>de {ranking.length}</small>
        </div>
        <div className="diag-destaque-corpo">
          <span className="diag-etiqueta">{ehUltima ? "Sai do Circuito · última colocada entre as avaliadas" : todas ? `${alvo.posicao}º lugar no Circuito` : "Exposição escolhida"}</span>
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
              <tr><th>Pergunta</th><th className="num">Esta exposição</th><th className="num">Média do Circuito</th><th>Diferença</th><th className="num">Total de pontos</th></tr>
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
                    <td className="num"><strong>{p.pontos ?? 0}</strong></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="diag-total">
                <td>Total</td>
                <td className="num"><strong>{fmt(alvo.media_produtor)}</strong></td>
                <td className="num">{formatarMedia(mediaCircuito)}</td>
                <td><small className={(alvo.media_produtor ?? 0) < mediaCircuito ? "diag-neg" : "diag-pos"}>{sinal((alvo.media_produtor ?? 0) - mediaCircuito)}</small></td>
                <td className="num"><strong>{comparadas.reduce((n, p) => n + (p.pontos ?? 0), 0)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="suave" style={{ margin: "10px 0 0" }}>Notas de 1 (muito ruim) a 5 (excelente). Em vermelho, as perguntas em que a exposição mais ficou abaixo da média.</p>
      </section>


    </>
  );
}
