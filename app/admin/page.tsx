import Link from "next/link";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { FaixaTitulo, LogoCircuito } from "@/components/Marca";
import { lerVotacao, sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { encerrarVotacao, liberarVotacao } from "./actions";
import Login from "./Login";

export const dynamic = "force-dynamic";

type Progresso = { nome: string; na_lista: number; responderam: number };
type Ranking = { posicao: number; nome: string; questionarios: number; pontuacao_final: number };
type Dia = { dia: string; quantidade: number };

const TZ = "America/Fortaleza";
const curto = (nome: string) => nome.replace("Exposição Agropecuária de ", "");
const dataHora = (d: Date | null) =>
  d ? d.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).replace(",", " às") : "—";

export default async function Admin() {
  if (!(await ehAdmin())) {
    return (
      <>
        <LogoCircuito compacto />
        <FaixaTitulo>Painel do Organizador</FaixaTitulo>
        <div className="estreito" style={{ maxWidth: 520 }}>
          <p className="intro">Entre com o seu usuário e senha para liberar a votação e acompanhar os resultados.</p>
          <Login />
        </div>
      </>
    );
  }

  const db = sql();
  // Uma consulta de cada vez, para não ocupar várias conexões do pooler ao mesmo tempo.
  const votacao = await lerVotacao();
  const progresso = await db<Progresso[]>`select nome, na_lista::int, responderam::int from v_progresso order by nome`;
  const ranking = await db<Ranking[]>`select posicao::int, nome, questionarios::int, pontuacao_final::int from v_ranking order by posicao, nome`;
  const [t] = await db<{ produtores: number; questionarios: number; respondidos: number; completos: number }[]>`
    select (select count(*)::int from produtores where exists (select 1 from participacoes x where x.produtor_id = produtores.id)) produtores,
           (select count(*)::int from participacoes) questionarios,
           (select count(*)::int from avaliacoes) respondidos,
           (select count(*)::int from (
              select pa.produtor_id from participacoes pa
              left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
              group by pa.produtor_id having count(a.produtor_id) = count(*)) c) completos`;
  const dias = await db<Dia[]>`
    select to_char((enviada_em at time zone ${TZ})::date, 'YYYY-MM-DD') dia, count(*)::int quantidade
    from avaliacoes group by 1 order by 1`;

  const agora = new Date();
  const pct = t.questionarios ? Math.round((t.respondidos / t.questionarios) * 1000) / 10 : 0;

  return (
    <>
      <CabecalhoAdmin titulo="Painel do Organizador" subtitulo="Acompanhe a votação e o ranking das exposições." />

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-icone"><Icone nome="usuarios" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Votação</div>
            <div className={`kpi-valor ${votacao.aberta ? "status-aberta" : "status-fechada"}`}>{votacao.aberta ? "Liberada" : "Fechada"}</div>
            <div className="kpi-nota">
              {votacao.aberta ? `Liberada em ${dataHora(votacao.aberta_em)}` : `Encerrada em ${dataHora(votacao.fechada_em)}`}
            </div>
          </div>
          <div className="kpi-acao">
            {votacao.aberta ? (
              <form action={encerrarVotacao}><button className="botao perigo pequeno">■ Encerrar votação</button></form>
            ) : (
              <form action={liberarVotacao}><button className="botao pequeno">▶ Liberar votação</button></form>
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
            <div className="kpi-rotulo">Questionários respondidos</div>
            <div className="kpi-valor">{t.respondidos} de {t.questionarios}</div>
            <div className="kpi-nota">{t.completos} de {t.produtores} produtores já avaliaram tudo</div>
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
            <table className="tabela-simples">
              <thead>
                <tr><th>Posição</th><th>Exposição</th><th className="num">Questionários</th><th className="num">Pontuação final</th></tr>
              </thead>
              <tbody>
                {ranking.map((r) => {
                  const medalha = r.pontuacao_final > 0 && r.posicao <= 3 ? ["ouro", "prata", "bronze"][r.posicao - 1] : null;
                  return (
                    <tr key={r.nome}>
                      <td className="posicao">
                        {medalha ? <span className={`medalha ${medalha}`}>★</span> : <span className="medalha vazia" />}
                        {r.posicao}º
                      </td>
                      <td title={r.nome}><strong>{curto(r.nome)}</strong></td>
                      <td className="num">{r.questionarios}</td>
                      <td className="num"><strong>{r.pontuacao_final.toLocaleString("pt-BR")}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="suave" style={{ margin: "10px 0 0" }}>A pontuação final é a soma de todas as notas recebidas (sem média).</p>
        </section>

        <div className="coluna-graficos">
          <section className="bloco">
            <h2 className="bloco-titulo claro"><Icone nome="grafico" tamanho={22} /> Resumo da Votação</h2>
            <Rosca respondidos={t.respondidos} total={t.questionarios} pct={pct} />
          </section>
          <section className="bloco">
            <h2 className="bloco-titulo claro"><Icone nome="grafico" tamanho={22} /> Evolução das Respostas</h2>
            <Evolucao dias={dias} />
          </section>
        </div>
      </div>

      <section className="bloco">
        <h2 className="bloco-titulo"><Icone nome="checkCirculo" tamanho={22} /> Progresso por Exposição</h2>
        <div className="tabela">
          <table className="tabela-simples">
            <thead>
              <tr><th>Exposição</th><th className="num">Na lista</th><th className="num">Responderam</th><th className="num">Faltam</th><th style={{ width: "28%" }}>Andamento</th></tr>
            </thead>
            <tbody>
              {progresso.map((p) => {
                const v = p.na_lista ? Math.round((p.responderam / p.na_lista) * 100) : 0;
                return (
                  <tr key={p.nome}>
                    <td title={p.nome}><strong>{curto(p.nome)}</strong></td>
                    <td className="num">{p.na_lista}</td>
                    <td className="num">{p.responderam}</td>
                    <td className="num">{p.na_lista - p.responderam}</td>
                    <td>
                      <div className="andamento">
                        <div className="progresso-barra"><span style={{ width: `${v}%` }} /></div>
                        <span className="andamento-num">{v}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Rosca({ respondidos, total, pct }: { respondidos: number; total: number; pct: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const fracao = total ? respondidos / total : 0;
  return (
    <div className="rosca">
      <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label={`${pct}% respondido`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e6ece3" strokeWidth="22" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="#2a7a3b" strokeWidth="22" strokeLinecap="butt"
          strokeDasharray={`${c * fracao} ${c}`} transform="rotate(-90 70 70)"
        />
        <text x="70" y="70" textAnchor="middle" className="rosca-pct">{pct.toLocaleString("pt-BR")}%</text>
        <text x="70" y="90" textAnchor="middle" className="rosca-rot">respondido</text>
      </svg>
      <ul className="legenda">
        <li><span className="ponto cheio" /> Respondidos <strong>{respondidos}</strong></li>
        <li><span className="ponto" /> Pendentes <strong>{total - respondidos}</strong></li>
      </ul>
    </div>
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
