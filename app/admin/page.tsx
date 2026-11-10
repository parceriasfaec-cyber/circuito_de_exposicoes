import Link from "next/link";
import { nomeCurto } from "@/lib/texto";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { FaixaTitulo } from "@/components/Marca";
import { cicloEscolhido } from "@/lib/ciclo";
import { lerVotacao, sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarMedia } from "@/lib/escala";
import { encerrarVotacao, liberarVotacao } from "./actions";
import Login from "./Login";

export const dynamic = "force-dynamic";

type Progresso = { nome: string; foto: string | null; na_lista: number; responderam: number };
type Ranking = {
  posicao: number;
  nome: string;
  questionarios: number;
  media: number | null;
  media_p2: number | null;
  media_p5: number | null;
  media_p9: number | null;
  pontos: number;
  media_produtor: number | null;
};
type Dia = { dia: string; quantidade: number };

const TZ = "America/Fortaleza";
const curto = nomeCurto;
const dataHora = (d: Date | null) =>
  d ? d.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).replace(",", " às") : "—";

export default async function Admin({ searchParams }: { searchParams: Promise<{ ciclo?: string }> }) {
  if (!(await ehAdmin())) {
    return (
      <>
        <FaixaTitulo>Painel do Organizador</FaixaTitulo>
        <div className="estreito" style={{ maxWidth: 520 }}>
          <p className="intro">Entre com o seu usuário e senha para liberar a votação e acompanhar os resultados.</p>
          <Login />
        </div>
      </>
    );
  }

  const params = await searchParams;
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const db = sql();
  // Uma consulta de cada vez, para não ocupar várias conexões do pooler ao mesmo tempo.
  const votacao = await lerVotacao();
  const progresso = await db<Progresso[]>`
    select nome, foto, na_lista::int, responderam::int from v_progresso where ciclo_id = ${cid} order by nome`;
  const ranking = await db<Ranking[]>`
    select posicao::int, nome, questionarios::int, media::float, media_p2::float, media_p5::float, media_p9::float, pontos::int, media_produtor::float
    from v_ranking where ciclo_id = ${cid} order by posicao, nome`;
  // Exposições com a mesma média: mostra embaixo a pergunta que decidiu o desempate (a primeira entre 2, 5 e 9 com notas diferentes).
  const desempate = (r: Ranking): { pergunta: number; nota: number | null } | "total" | null => {
    if (r.media_produtor === null) return null;
    const grupo = ranking.filter((x) => x.media_produtor === r.media_produtor);
    if (grupo.length < 2) return null;
    for (const [pergunta, campo] of [[2, "media_p2"], [5, "media_p5"], [9, "media_p9"]] as const) {
      if (new Set(grupo.map((x) => x[campo])).size > 1) return { pergunta, nota: r[campo] };
    }
    return "total";
  };
  const [t] = await db<{ produtores: number; questionarios: number; respondidos: number; completos: number }[]>`
    with pa as (
      select pa.* from participacoes pa join exposicoes e on e.id = pa.exposicao_id where e.ciclo_id = ${cid}
    )
    select (select count(distinct produtor_id)::int from pa) produtores,
           (select count(*)::int from pa) questionarios,
           (select count(*)::int from avaliacoes a join pa on pa.produtor_id = a.produtor_id and pa.exposicao_id = a.exposicao_id) respondidos,
           (select count(*)::int from (
              select pa.produtor_id from pa
              left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
              group by pa.produtor_id having count(a.produtor_id) = count(*)) c) completos`;
  const dias = await db<Dia[]>`
    select to_char((a.enviada_em at time zone ${TZ})::date, 'YYYY-MM-DD') dia, count(*)::int quantidade
    from avaliacoes a join exposicoes e on e.id = a.exposicao_id
    where e.ciclo_id = ${cid} group by 1 order by 1`;

  const agora = new Date();

  return (
    <>
      <CabecalhoAdmin titulo="Painel do Organizador" subtitulo="Acompanhe a votação e o ranking das exposições." ciclos={ciclos} ciclo={ciclo} />

      {ciclo && !ciclo.ativo && (
        <div className="aviso-ciclo">
          Você está vendo o <strong>{ciclo.nome}</strong>, que não é o ciclo ativo. A votação mostrada abaixo vale para o ciclo
          ativo. Para trocar, vá em <Link href="/admin/ciclos">Ciclos</Link>.
        </div>
      )}
      {!ciclo && <div className="aviso-ciclo">Nenhum ciclo cadastrado. Crie um em <Link href="/admin/ciclos">Ciclos</Link>.</div>}

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-icone"><Icone nome="usuarios" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Avaliação das exposições</div>
            <div className={`kpi-valor ${votacao.exposicoes_aberta ? "status-aberta" : "status-fechada"}`}>{votacao.exposicoes_aberta ? "Liberada" : "Fechada"}</div>
            <div className="kpi-nota">
              {votacao.exposicoes_aberta ? (
                <>
                  {votacao.exposicoes_aberta_em && <div>Início: {dataHora(votacao.exposicoes_aberta_em)}</div>}
                  {votacao.exposicoes_fechar_em && <div><strong>Fecha sozinha: {dataHora(votacao.exposicoes_fechar_em)}</strong></div>}
                  <div>Link: /avaliar{votacao.cidades_aberta ? " · cidades também aberta" : ""}</div>
                </>
              ) : votacao.exposicoes_fechada_em ? (
                <>
                  {votacao.exposicoes_aberta_em && votacao.exposicoes_aberta_em < votacao.exposicoes_fechada_em && (
                    <div>Início: {dataHora(votacao.exposicoes_aberta_em)}</div>
                  )}
                  <div>Fim: {dataHora(votacao.exposicoes_fechada_em)}</div>
                  {votacao.exposicoes_abrir_em && <div><strong>Abre sozinha: {dataHora(votacao.exposicoes_abrir_em)}</strong></div>}
                </>
              ) : votacao.exposicoes_abrir_em ? (
                <div><strong>Abre sozinha: {dataHora(votacao.exposicoes_abrir_em)}</strong></div>
              ) : "Ainda não foi liberada"}
            </div>
          </div>
          <div className="kpi-acao">
            {votacao.exposicoes_aberta ? (
              <form action={encerrarVotacao}><input type="hidden" name="modo" value="exposicoes" /><button className="botao perigo pequeno">■ Encerrar avaliação</button></form>
            ) : (
              <form action={liberarVotacao}><input type="hidden" name="modo" value="exposicoes" /><button className="botao pequeno">▶ Liberar avaliação</button></form>
            )}
          </div>
        </div>

        <div className="kpi">
          <span className="kpi-icone claro"><Icone nome="prancheta" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Código do dia</div>
            <div className="kpi-valor codigo-kpi">{votacao.aberta ? votacao.codigo_do_dia : "----"}</div>
          </div>
          <div className="kpi-acao">
            {votacao.aberta && (
              <Link className="botao secundario pequeno" href="/telao" target="_blank"><Icone nome="olho" tamanho={16} /> Tela do telão</Link>
            )}
          </div>
        </div>

        <div className="kpi">
          <span className="kpi-icone"><Icone nome="checkCirculo" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Produtores que já avaliaram</div>
            <div className="kpi-valor">{t.completos} de {t.produtores}</div>
            <div className="kpi-nota">Avaliaram todas as exposições de que participaram</div>
          </div>
          <div className="kpi-acao">
            <Link className="botao secundario pequeno" href="/admin/avaliacoes"><Icone nome="olho" tamanho={16} /> Ver quem já avaliou</Link>
          </div>
        </div>

        <div className="kpi destaque">
          <span className="kpi-icone"><Icone nome="grafico" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Última atualização</div>
            <div className="kpi-valor menor">{dataHora(agora)}</div>
          </div>
          <div className="kpi-acao">
            <Link className="botao secundario pequeno" href="/admin" prefetch={false}><Icone nome="atualizar" tamanho={16} /> Atualizar</Link>
          </div>
        </div>
      </div>

      <div className="painel-grade">
        <section className="bloco">
          <h2 className="bloco-titulo"><Icone nome="trofeu" tamanho={22} /> Ranking das Exposições</h2>
          <div className="tabela">
            <table className="tabela-simples ranking-exposicoes">
              <thead>
                <tr><th>Posição</th><th>Exposição</th><th className="num">Questionários</th><th className="num">Pontos</th><th className="num">Média</th></tr>
              </thead>
              <tbody>
                {ranking.map((r) => {
                  const medalha = r.media_produtor !== null && r.posicao <= 3 ? ["ouro", "prata", "bronze"][r.posicao - 1] : null;
                  return (
                    <tr key={r.nome}>
                      <td className="posicao">
                        {medalha ? <span className={`medalha ${medalha}`}>★</span> : <span className="medalha vazia" />}
                        {r.posicao}º
                      </td>
                      <td title={r.nome}><strong>{curto(r.nome)}</strong></td>
                      <td className="num">{r.questionarios}</td>
                      <td className="num pontos">{r.questionarios ? r.pontos.toLocaleString("pt-BR") : "—"}</td>
                      <td className="num">
                        <strong>{formatarMedia(r.media_produtor)}</strong>
                        {(() => {
                          const d = desempate(r);
                          if (!d) return null;
                          return (
                            <div className="desempate-linha">
                              {d === "total" ? "Empate total: a organização decide" : `Desempate · pergunta ${d.pergunta}: ${formatarMedia(d.nota)}`}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="suave" style={{ margin: "10px 0 0" }}>
            Pontos é a soma de todas as notas recebidas. Média = pontos ÷ número de produtores que avaliaram (de 10 a 50 por
            produtor). A classificação é pela média. Em caso de empate, vence a maior
            média, nesta ordem, na pergunta 2 (infraestrutura e acomodação dos animais), na pergunta 5 (apoio aos
            tratadores) e na pergunta 9 (atendimento e suporte durante o evento).
          </p>
        </section>

        <div className="coluna-graficos">
          <section className="bloco">
            <h2 className="bloco-titulo claro"><Icone nome="usuarios" tamanho={22} /> Participantes por Exposição</h2>
            <Participacao progresso={progresso} produtores={t.produtores} completos={t.completos} />
          </section>
          <section className="bloco">
            <h2 className="bloco-titulo claro"><Icone nome="grafico" tamanho={22} /> Evolução das Respostas</h2>
            <Evolucao dias={dias} />
          </section>
        </div>
      </div>

      <section className="bloco">
        <h2 className="bloco-titulo"><Icone nome="checkCirculo" tamanho={22} /> Progresso por Exposição</h2>
        {progresso.length === 0 ? (
          <p className="suave">Nenhuma exposição neste ciclo.</p>
        ) : (
          <div className="progresso-cartoes">
            {[...progresso]
              .map((p) => ({ ...p, v: p.na_lista ? Math.round((p.responderam / p.na_lista) * 100) : 0 }))
              .sort((a, b) => b.v - a.v || a.nome.localeCompare(b.nome))
              .map((p) => {
                const nome = curto(p.nome);
                const iniciais = nome.split(" ").filter((x) => x.length > 2).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || nome.slice(0, 2).toUpperCase();
                return (
                  <div key={p.nome} className="progresso-cartao" title={`${p.nome}: ${p.responderam} de ${p.na_lista} responderam`}>
                    {p.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="progresso-foto" src={`/exposicoes/${p.foto}.png`} alt="" width={160} height={160} />
                    ) : (
                      <span className="progresso-foto">{iniciais}</span>
                    )}
                    <div className="progresso-info">
                      <strong>{nome}</strong>
                      <div className="andamento">
                        <div className="progresso-barra escura"><span style={{ width: `${p.v}%` }} /></div>
                        <span className="andamento-num">{p.v}%</span>
                      </div>
                      <small className="suave">{p.responderam} de {p.na_lista} responderam</small>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </>
  );
}

/**
 * Total de produtores do ciclo e, para cada exposição, a barra do total de participantes
 * com a parte de quem já fez a avaliação (o tamanho da barra acompanha o número de participantes).
 */
function Participacao({ progresso, produtores, completos }: { progresso: Progresso[]; produtores: number; completos: number }) {
  const lista = [...progresso].sort((a, b) => b.na_lista - a.na_lista || a.nome.localeCompare(b.nome));
  const maior = Math.max(1, ...lista.map((p) => p.na_lista));
  return (
    <div className="part">
      <div className="part-topo">
        <div><strong>{produtores}</strong><small>produtores no ciclo</small></div>
        <div><strong>{completos}</strong><small>já avaliaram tudo</small></div>
      </div>
      <ul className="part-legenda">
        <li><span className="ponto part-cor-total" /> Participantes</li>
        <li><span className="ponto part-cor-aval" /> Avaliaram</li>
      </ul>
      {lista.length === 0 ? (
        <p className="suave" style={{ margin: 0 }}>Nenhuma exposição neste ciclo.</p>
      ) : (
        <GraficoParticipacao lista={lista} />
      )}
    </div>
  );
}

/** Barras lado a lado por exposição: total de participantes (verde claro) e quantos avaliaram (verde escuro). */
function GraficoParticipacao({ lista }: { lista: Progresso[] }) {
  const grupo = 64, barra = 24, m = { e: 34, d: 8, t: 26, b: 84 };
  const L = m.e + m.d + grupo * lista.length;
  const A = 300;
  const max = Math.max(1, ...lista.map((p) => p.na_lista));
  const passo = max <= 10 ? 2 : max <= 50 ? 10 : max <= 100 ? 20 : 50;
  const teto = Math.ceil(max / passo) * passo;
  const y = (v: number) => A - m.b - (v / teto) * (A - m.t - m.b);
  const marcas = Array.from({ length: teto / passo + 1 }, (_, k) => k * passo);
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="part-grafico" role="img" aria-label="Participantes e avaliações por exposição">
      {marcas.map((v) => (
        <g key={v}>
          <line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} stroke="#e6ece3" />
          <text x={m.e - 6} y={y(v) + 4} textAnchor="end" className="eixo">{v}</text>
        </g>
      ))}
      {lista.map((p, k) => {
        const x0 = m.e + k * grupo + (grupo - 2 * barra - 4) / 2;
        const pct = p.na_lista ? Math.round((p.responderam / p.na_lista) * 100) : 0;
        const nome = curto(p.nome);
        return (
          <g key={p.nome}>
            <title>{`${p.nome}: ${p.na_lista} participantes, ${p.responderam} avaliaram (${pct}%)`}</title>
            <rect x={x0} y={y(p.na_lista)} width={barra} height={y(0) - y(p.na_lista)} rx="4" fill="#a9cf94" />
            <text x={x0 + barra / 2} y={y(p.na_lista) - 6} textAnchor="middle" className="valor">{p.na_lista}</text>
            <rect x={x0 + barra + 4} y={y(p.responderam)} width={barra} height={Math.max(0, y(0) - y(p.responderam))} rx="4" fill="#1d5e2c" />
            <text x={x0 + barra * 1.5 + 4} y={y(p.responderam) - 6} textAnchor="middle" className="valor escuro">{p.responderam}</text>
            <text
              x={x0 + barra + 2} y={y(0) + 14} textAnchor="end" className="eixo nome"
              transform={`rotate(-40 ${x0 + barra + 2} ${y(0) + 14})`}
            >
              {nome.length > 16 ? `${nome.slice(0, 15)}…` : nome}
            </text>
          </g>
        );
      })}
      <line x1={m.e} x2={L - m.d} y1={y(0)} y2={y(0)} stroke="#b9c4b4" />
    </svg>
  );
}

function Evolucao({ dias }: { dias: Dia[] }) {
  if (dias.length === 0) return <p className="suave" style={{ margin: 0 }}>Ainda não há respostas.</p>;

  let acumulado = 0;
  const pontos = dias.map((d) => ({ dia: d.dia, total: (acumulado += d.quantidade) }));
  if (pontos.length === 1) pontos.unshift({ dia: "", total: 0 });

  const L = 560, A = 230, m = { e: 40, d: 24, t: 34, b: 30 };
  const max = Math.max(...pontos.map((p) => p.total), 1);
  const teto = Math.ceil(max / 5) * 5 || 5;
  const x = (i: number) => m.e + (i * (L - m.e - m.d)) / Math.max(pontos.length - 1, 1);
  const y = (v: number) => A - m.b - (v / teto) * (A - m.t - m.b);
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.total)}`).join(" ");
  const area = `${linha} L${x(pontos.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ultimo = pontos[pontos.length - 1];
  const rotulo = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="evolucao" role="img" aria-label={`Total acumulado de respostas: ${ultimo.total}`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={m.e} x2={L - m.d} y1={y(teto * f)} y2={y(teto * f)} stroke="#e6ece3" />
          <text x={m.e - 6} y={y(teto * f) + 4} textAnchor="end" className="eixo">{Math.round(teto * f)}</text>
        </g>
      ))}
      <path d={area} fill="#7cc242" opacity="0.18" />
      <path d={linha} fill="none" stroke="#2a7a3b" strokeWidth="3.5" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.total)} r="5.5" fill="#2a7a3b" />
          <text x={x(i)} y={A - 8} textAnchor="middle" className="eixo">{rotulo(p.dia)}</text>
        </g>
      ))}
      <g transform={`translate(${x(pontos.length - 1)},${y(ultimo.total) - 14})`}>
        <rect x="-22" y="-20" width="44" height="24" rx="8" fill="#1d5e2c" />
        <text x="0" y="-3" textAnchor="middle" className="balao">{ultimo.total}</text>
      </g>
    </svg>
  );
}
