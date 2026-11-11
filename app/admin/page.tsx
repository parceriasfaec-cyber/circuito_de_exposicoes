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
import FormConfirmar from "./FormConfirmar";
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
                  {votacao.exposicoes_aberta_em && <div>Início: <strong>{dataHora(votacao.exposicoes_aberta_em)}</strong></div>}
                  <div>
                    Fim: {votacao.exposicoes_fechar_em ? <strong>{dataHora(votacao.exposicoes_fechar_em)}</strong> : <>ao clicar em Encerrar (<Link href="/admin/horario">marcar horário</Link>)</>}
                  </div>
                  {votacao.cidades_aberta && <div>Votação das cidades também aberta</div>}
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
                <>
                  <div>Abre sozinha: <strong>{dataHora(votacao.exposicoes_abrir_em)}</strong></div>
                  {votacao.exposicoes_fechar_em && <div>Fecha sozinha: <strong>{dataHora(votacao.exposicoes_fechar_em)}</strong></div>}
                  <div><Link href="/admin/horario">Alterar horário</Link></div>
                </>
              ) : "Ainda não foi liberada"}
            </div>
          </div>
          <div className="kpi-acao">
            {votacao.exposicoes_aberta ? (
              <FormConfirmar action={encerrarVotacao} mensagem={votacao.exposicoes_fechar_em ? `Encerrar agora? O horário marcado para fechar (${dataHora(votacao.exposicoes_fechar_em)}) será cancelado.` : null}>
                <input type="hidden" name="modo" value="exposicoes" /><button className="botao perigo pequeno">■ Encerrar avaliação</button>
              </FormConfirmar>
            ) : (
              <FormConfirmar action={liberarVotacao} mensagem={votacao.exposicoes_abrir_em ? `A avaliação já está programada para abrir sozinha em ${dataHora(votacao.exposicoes_abrir_em)}. Liberar agora mesmo assim?` : null}>
                <input type="hidden" name="modo" value="exposicoes" />
                <button className="botao pequeno">▶ {votacao.exposicoes_abrir_em ? "Liberar agora" : "Liberar avaliação"}</button>
              </FormConfirmar>
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
            <div className="kpi-rotulo">Expositores que já avaliaram</div>
            <div className="kpi-valor">{t.completos} de {t.produtores}</div>
            <div className="kpi-nota">Avaliaram todas as exposições de que participaram</div>
          </div>
          <div className="kpi-acao">
            <Link className="botao secundario pequeno" href="/admin/presenca?aval=avaliou"><Icone nome="olho" tamanho={16} /> Ver quem já avaliou</Link>
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
                    <tr key={r.nome} className={medalha ? `podio ${medalha}` : undefined}>
                      <td className="posicao">
                        {medalha ? <span className={`medalha ${medalha}`}>★</span> : <span className="medalha vazia" />}
                        {r.posicao}º
                      </td>
                      <td title={r.nome}><strong>{curto(r.nome)}</strong></td>
                      <td className="num">{r.questionarios}</td>
                      <td className="num pontos">{r.questionarios ? r.pontos.toLocaleString("pt-BR") : "—"}</td>
                      <td className="num">
                        <strong className={medalha ? `media-pill ${medalha}` : undefined}>{formatarMedia(r.media_produtor)}</strong>
                        {(() => {
                          const d = desempate(r);
                          if (!d) return null;
                          return (
                            <div className="desempate-linha">
                              {d === "total" ? "Empate total: a organização decide" : <>Desempate:<br />pergunta {d.pergunta} ({formatarMedia(d.nota)})</>}
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
          <p className="ranking-nota">
            <span className="ranking-nota-i" aria-hidden="true">i</span>
            <span>
              <strong>Pontos</strong> = soma das notas. <strong>Média</strong> = pontos ÷ expositores que avaliaram (de 10 a 50).
              No empate, vence a maior média na pergunta 2, depois na 5 e na 9.
            </span>
          </p>
        </section>

        <div className="coluna-graficos">
          <section className="bloco">
            <h2 className="bloco-titulo"><Icone nome="usuarios" tamanho={22} /> Participantes por Exposição</h2>
            <Participacao progresso={progresso} produtores={t.produtores} completos={t.completos} />
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
                      {/* "EXPOBREJO (Brejo Santo)": nome do evento em cima e a cidade, entre parênteses, embaixo */}
                      <strong>{nome.replace(/\s*\(.*\)$/, "")}</strong>
                      {/\(.*\)$/.test(nome) && <span className="progresso-cidade">{nome.match(/\(.*\)$/)![0]}</span>}
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
        <div>
          <span className="part-topo-icone"><Icone nome="usuarios" tamanho={30} /></span>
          <span><strong>{produtores}</strong><small>Total de Participantes</small></span>
        </div>
        <div>
          <span className="part-topo-icone redondo"><Icone nome="check" tamanho={22} /></span>
          <span><strong>{completos}</strong><small>já avaliaram tudo</small></span>
        </div>
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

/**
 * Barras deitadas por exposição: em cima o total de participantes (verde claro), embaixo quantos avaliaram
 * (verde escuro). O nome fica inteiro à esquerda.
 */
function GraficoParticipacao({ lista }: { lista: Progresso[] }) {
  const linha = 34, m = { e: 168, d: 36, t: 6, b: 30 };
  const L = 560;
  const A = m.t + m.b + linha * lista.length;
  const max = Math.max(1, ...lista.map((p) => p.na_lista));
  const passo = max <= 10 ? 2 : max <= 50 ? 10 : max <= 100 ? 20 : 50;
  const teto = Math.ceil(max / passo) * passo;
  const x = (v: number) => m.e + (v / teto) * (L - m.e - m.d);
  const marcas = Array.from({ length: teto / passo + 1 }, (_, k) => k * passo);
  const base = A - m.b;
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="part-grafico" role="img" aria-label="Participantes e avaliações por exposição">
      {marcas.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={m.t} y2={base} stroke="#eef2ec" />
          <line x1={x(v)} x2={x(v)} y1={base} y2={base + 5} stroke="#5b6b5b" />
          <text x={x(v)} y={base + 20} textAnchor="middle" className="eixo">{v}</text>
        </g>
      ))}
      {lista.map((p, k) => {
        const y0 = m.t + k * linha + 6;
        const pct = p.na_lista ? Math.round((p.responderam / p.na_lista) * 100) : 0;
        const nome = curto(p.nome);
        return (
          <g key={p.nome}>
            <title>{`${p.nome}: ${p.na_lista} participantes, ${p.responderam} avaliaram (${pct}%)`}</title>
            <text x={m.e - 12} y={y0 + 14} textAnchor="end" className="eixo nome">{nome.length > 24 ? `${nome.slice(0, 23)}…` : nome}</text>
            <rect x={m.e} y={y0} width={Math.max(3, x(p.na_lista) - m.e)} height="10" rx="5" fill="#a9cf94" />
            <text x={x(p.na_lista) + 6} y={y0 + 9} className="valor">{p.na_lista}</text>
            <rect x={m.e} y={y0 + 12} width={Math.max(3, x(p.responderam) - m.e)} height="10" rx="5" fill="#1d5e2c" />
            <text x={x(p.responderam) + 6} y={y0 + 21} className="valor escuro">{p.responderam}</text>
          </g>
        );
      })}
      <line x1={m.e} x2={m.e} y1={m.t} y2={base} stroke="#5b6b5b" strokeWidth="1.5" />
      <line x1={m.e} x2={L - m.d} y1={base} y2={base} stroke="#5b6b5b" strokeWidth="1.5" />
    </svg>
  );
}
