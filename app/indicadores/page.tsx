import AtualizarSozinho from "@/components/AtualizarSozinho";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { anoCredenciamento } from "@/lib/credenciamento";
import { cacheCurto, lerVotacaoCache, sql, tentar } from "@/lib/db";
import { formatarMedia } from "@/lib/escala";
import { dadosRankingCidades } from "@/lib/rankingCidades";
import { nomeCurto } from "@/lib/texto";
import MapaCircuito, { type EtapaMapa } from "./MapaCircuito";
import "./indicadores.css";

export const dynamic = "force-dynamic";

type Etapa = { exposicao_id: string; posicao: number; nome: string; questionarios: number; media_produtor: number | null };

type LinhaMapa = { id: string; nome: string; municipio: string; data_inicio: Date; data_fim: Date; posicao: number | null; media: number | null; avaliacoes: number; participantes: number };
const dm = (d: Date) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

const pts = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const votosTxt = (n: number) => `${n} ${n === 1 ? "voto" : "votos"}`;

/** Painel de indicadores para o celular: página aberta, somente totais (sem nomes de participantes). */
export default async function Indicadores() {
  const ano = await anoCredenciamento();
  const votacao = await lerVotacaoCache();
  const { ciclo } = await cicloEscolhido(undefined);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const [cidades, etapas, linhasMapa, [{ produtores }]] = await Promise.all([
    dadosRankingCidades(ano, votacao),
    cacheCurto(`ind-etapas:${cid}`, 8000, () => tentar(() => sql()<Etapa[]>`
      select exposicao_id, posicao::int, nome, questionarios::int, media_produtor::float
      from v_ranking where ciclo_id = ${cid} order by posicao, nome`)),
    cacheCurto(`ind-mapa:${cid}`, 8000, () => tentar(() => sql()<LinhaMapa[]>`
      select e.id, e.nome, e.municipio, e.data_inicio, e.data_fim, r.posicao::int posicao, r.media_produtor::float media,
             coalesce(r.questionarios, 0)::int avaliacoes,
             (select count(*)::int from participacoes p where p.exposicao_id = e.id) participantes
      from exposicoes e left join v_ranking r on r.exposicao_id = e.id and r.ciclo_id = e.ciclo_id
      where e.ciclo_id = ${cid} order by e.data_inicio, e.nome`)),
    // Expositores distintos que participam de alguma etapa do circuito (cada um conta uma vez só).
    cacheCurto(`ind-prod:${cid}`, 8000, () => tentar(() => sql()<{ produtores: number }[]>`
      select count(distinct pa.produtor_id)::int produtores
      from participacoes pa join exposicoes e on e.id = pa.exposicao_id where e.ciclo_id = ${cid}`)),
  ]);

  // Etapa "atual": a que está acontecendo hoje; se nenhuma, a última que já terminou.
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });
  const emCurso = linhasMapa.findIndex((l) => iso(l.data_inicio) <= hoje && hoje <= iso(l.data_fim));
  const ultima = linhasMapa.reduce((a, l, i) => (iso(l.data_fim) < hoje ? i : a), -1);
  const iAtual = emCurso >= 0 ? emCurso : ultima;
  const mapa: EtapaMapa[] = linhasMapa.map((l, i) => ({
    id: l.id, nome: nomeCurto(l.nome), municipio: l.municipio,
    periodo: iso(l.data_inicio) === iso(l.data_fim) ? dm(l.data_inicio) : `${dm(l.data_inicio)} a ${dm(l.data_fim)}`,
    posicao: l.media === null ? null : l.posicao, media: l.media === null ? null : formatarMedia(l.media),
    avaliacoes: l.avaliacoes, participantes: l.participantes, atual: i === iAtual,
  }));

  const { ranking, vagas, votantes, totalVotos, elegiveis, presentes } = cidades;
  const pct = elegiveis > 0 ? Math.min(100, (votantes / elegiveis) * 100) : 0;
  const nVagas = Math.min(3, Math.max(1, vagas ?? 2));
  const podio = ranking.filter((r) => r.votos > 0).slice(0, nVagas);
  const maxVotos = Math.max(1, ...podio.map((r) => r.votos));
  const avaliadas = etapas.filter((e) => e.media_produtor !== null).slice(0, 3);
  const totalAval = etapas.reduce((s, e) => s + e.questionarios, 0);
  const anoCircuito = ciclo?.ano ?? ano - 1; // ano do circuito em andamento (o "ano" acima é o do próximo circuito)
  const horaAgora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });
  // Próxima etapa: a que ainda não começou (a mais próxima); mostra quantos dias faltam.
  const proxima = linhasMapa.find((l) => iso(l.data_inicio) > hoje);
  const diasFaltam = proxima ? Math.round((Date.parse(iso(proxima.data_inicio)) - Date.parse(hoje)) / 86400000) : 0;
  // Linha de corte: diferença entre o último classificado e o primeiro fora.
  const ultimoClass = podio[podio.length - 1];
  const primeiroFora = ranking.find((r) => !podio.includes(r));
  const dif = ultimoClass && primeiroFora ? ultimoClass.votos - primeiroFora.votos : null;
  const medalha = ["ouro", "prata", "bronze"];

  return (
    <div className="ind">
      <AtualizarSozinho segundos={20} />
      <header className="ind-capa">
        <div className="ind-capa-sombra" />
        <div className="ind-capa-texto">
          <span className="ind-selo">Painel ao vivo</span>
          <h1>Circuito Cearense<br />de Exposição {anoCircuito}</h1>
        </div>
      </header>

      <main className="ind-corpo">
        <div className={`ind-status ${votacao.cidades_aberta ? "aberta" : "fechada"}`}>
          <i aria-hidden="true" />
          <strong>{votacao.cidades_aberta ? "Votação dos municípios aberta" : "Votação dos municípios encerrada"}</strong>
          <span>Atualizado às {horaAgora}</span>
        </div>
        <section className="ind-kpis" aria-label="Indicadores gerais">
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="checkCirculo" tamanho={20} /></span><strong>{votantes}</strong><small>Expositores que votaram</small></div>
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="trofeu" tamanho={20} /></span><strong>{totalVotos}</strong><small>Votos nos municípios</small></div>
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="usuarios" tamanho={20} /></span><strong>{presentes}</strong><small>Presentes no evento</small></div>
          <div className="ind-kpi"><span className="ind-ic"><Icone nome="checkCirculo" tamanho={20} /></span><strong>{totalAval}</strong><small>Avaliações das etapas</small></div>
          <div className="ind-kpi ind-kpi-destaque"><span className="ind-ic"><Icone nome="usuarios" tamanho={20} /></span><strong>{produtores}</strong><small>Participantes em todas as etapas do Circuito</small></div>
        </section>

        {proxima && (
          <section className="ind-prox">
            <div className="ind-prox-dias"><strong>{diasFaltam}</strong><small>{diasFaltam === 1 ? "dia" : "dias"}</small></div>
            <div className="ind-prox-txt">
              <small>Próxima etapa</small>
              <strong>{nomeCurto(proxima.nome)}</strong>
              <span>{proxima.municipio} · {iso(proxima.data_inicio) === iso(proxima.data_fim) ? dm(proxima.data_inicio) : `${dm(proxima.data_inicio)} a ${dm(proxima.data_fim)}`}</span>
            </div>
          </section>
        )}

        <section className="ind-card ind-card-mapa">
          <h2><span className="ind-ic p"><Icone nome="local" tamanho={16} /></span>Mapa do Circuito</h2>
          <MapaCircuito etapas={mapa} />
          <p className="ind-dica">Toque num marcador para ver os dados da etapa. Use dois dedos para aproximar.</p>
        </section>

        <section className="ind-card">
          <h2>Participação na votação</h2>
          <div className="ind-meta"><strong>{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong><span>{votantes} de {elegiveis} expositores aptos</span></div>
          <div className="ind-trilho"><div className="ind-preench" style={{ width: `${pct}%` }} /></div>
        </section>

        <section className="ind-card">
          <h2><span className="ind-ic p"><Icone nome="trofeu" tamanho={16} /></span>Municípios — classificados</h2>
          {podio.length === 0 && <p className="ind-vazio">Ainda não há votos.</p>}
          <ol className="ind-lista">
            {podio.map((r, i) => (
              <li key={r.credenciamento_id}>
                <span className={`ind-medalha ${medalha[i]}`}>{r.posicao}º</span>
                <div className="ind-item">
                  <div className="ind-linha"><strong>{r.municipio}</strong><span>{votosTxt(r.votos)} <small>({pts(r.pontos)} pts)</small></span></div>
                  <div className="ind-barra"><i style={{ width: `${(r.votos / maxVotos) * 100}%` }} /></div>
                </div>
              </li>
            ))}
          </ol>
          {podio.length > 0 && (
            <div className="ind-corte"><span>Linha de corte · Circuito {ano}</span></div>
          )}
          {dif !== null && ultimoClass && primeiroFora && (
            <p className="ind-corte-nota">
              {dif > 0
                ? <>{ultimoClass.municipio} está <b>{dif} {dif === 1 ? "voto" : "votos"}</b> à frente de {primeiroFora.municipio}, o primeiro fora da linha.</>
                : <>{ultimoClass.municipio} e {primeiroFora.municipio} estão <b>empatados em votos</b>; o desempate considera os pontos.</>}
            </p>
          )}
          {ranking.length > podio.length && (
            <details className="ind-mais">
              <summary>Ver demais municípios ({ranking.length - podio.length})</summary>
              <ol className="ind-lista" start={podio.length + 1}>
                {ranking.filter((r) => !podio.includes(r)).map((r) => (
                  <li key={r.credenciamento_id}>
                    <span className="ind-medalha">{r.posicao}º</span>
                    <div className="ind-item">
                      <div className="ind-linha"><strong>{r.municipio}</strong><span>{votosTxt(r.votos)} <small>({pts(r.pontos)} pts)</small></span></div>
                      <div className="ind-barra"><i style={{ width: `${(r.votos / maxVotos) * 100}%` }} /></div>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>

        <section className="ind-card">
          <h2><span className="ind-ic p"><Icone nome="trofeu" tamanho={16} /></span>Etapas mais bem avaliadas</h2>
          {avaliadas.length === 0 && <p className="ind-vazio">Aguardando avaliações.</p>}
          <ol className="ind-lista">
            {avaliadas.map((e, i) => (
              <li key={e.exposicao_id}>
                <span className={`ind-medalha ${medalha[i]}`}>{e.posicao}º</span>
                <div className="ind-item">
                  <div className="ind-linha"><strong>{nomeCurto(e.nome)}</strong><span>{formatarMedia(e.media_produtor)}</span></div>
                  <small className="ind-sub">{e.questionarios} {e.questionarios === 1 ? "avaliação" : "avaliações"}</small>
                </div>
              </li>
            ))}
          </ol>
          {etapas.length > avaliadas.length && (
            <details className="ind-mais">
              <summary>Ver demais etapas ({etapas.length - avaliadas.length})</summary>
              <ol className="ind-lista">
                {etapas.filter((e) => !avaliadas.includes(e)).map((e) => (
                  <li key={e.exposicao_id}>
                    <span className="ind-medalha">{e.media_produtor === null ? "–" : `${e.posicao}º`}</span>
                    <div className="ind-item">
                      <div className="ind-linha"><strong>{nomeCurto(e.nome)}</strong><span>{formatarMedia(e.media_produtor)}</span></div>
                      <small className="ind-sub">{e.media_produtor === null ? "Aguardando avaliações" : `${e.questionarios} ${e.questionarios === 1 ? "avaliação" : "avaliações"}`}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>

        <footer className="ind-rodape">Sistema FAEC/SENAR · Atualiza automaticamente</footer>
      </main>
    </div>
  );
}
