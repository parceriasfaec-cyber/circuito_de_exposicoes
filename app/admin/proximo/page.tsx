import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import RankingCidades from "@/components/RankingCidades";
import { anoCredenciamento, diaMes, empateNaVaga, lerPrazo, resultadoCidades, votantesPorCidade } from "@/lib/credenciamento";
import { lerVotacao, sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { alterarQuemVota, encerrarVotacao, liberarVotacao } from "../actions";
import { salvarVagas } from "./actions";

export const dynamic = "force-dynamic";

/** Painel das exposições do próximo ano: credenciados, apresentações e votação das cidades. */
export default async function PainelProximoAno({ searchParams }: { searchParams: Promise<{ vagas?: string; quem?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const ano = await anoCredenciamento();
  const params = await searchParams;

  const [t] = await sql()<{ credenciados: number; apresentaram: number }[]>`
    select count(*)::int credenciados, count(*) filter (where apresentou)::int apresentaram
    from credenciamentos where ano = ${ano}`;
  const { prazo, aberto, apresentacao } = await lerPrazo(ano);
  const votacao = await lerVotacao();
  const votacaoCidades = votacao.cidades_aberta;
  const [resultado, votantes] = await Promise.all([resultadoCidades(ano), votantesPorCidade(ano)]);
  const [p] = await sql()<{ produtores: number; avaliaram: number; presentes: number }[]>`
    select count(distinct pa.produtor_id)::int produtores,
           count(distinct pa.produtor_id) filter (where exists (
             select 1 from avaliacoes a join exposicoes e2 on e2.id = a.exposicao_id
             where a.produtor_id = pa.produtor_id and e2.ciclo_id = c.id))::int avaliaram,
           (select count(*)::int from presencas pr join ciclos c2 on c2.id = pr.ciclo_id and c2.ativo) presentes
    from participacoes pa join exposicoes e on e.id = pa.exposicao_id join ciclos c on c.id = e.ciclo_id and c.ativo`;
  const regras = [votacao.cidades_quem === "avaliaram" ? "quem avaliou" : null, votacao.cidades_so_presentes ? "quem está presente" : null].filter(Boolean);
  const quemVota = regras.length ? `Só ${regras.join(" e ")}` : `Todos os expositores (${p.produtores})`;

  return (
    <>
      <CabecalhoAdmin
        titulo={`Painel ${ano}`}
        subtitulo={`Credenciamento, apresentações e votação das cidades que vão sediar as exposições de ${ano}.`}
      />

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-icone"><Icone nome="local" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Municípios credenciados</div>
            <div className="kpi-valor">{t.credenciados}</div>
            <div className="kpi-nota">
              {!prazo ? "Formulário aberto, sem prazo" : aberto ? `Cadastros até ${diaMes(prazo, true)}` : `Encerrado em ${diaMes(prazo, true)}`}
            </div>
          </div>
          <div className="kpi-acao">
            <Link className="botao secundario pequeno" href="/admin/proximo/credenciados"><Icone nome="olho" tamanho={16} /> Ver lista</Link>
          </div>
        </div>

        <div className="kpi">
          <span className="kpi-icone claro"><Icone nome="checkCirculo" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Fizeram a apresentação</div>
            <div className="kpi-valor">{t.apresentaram} de {t.credenciados}</div>
            <div className="kpi-nota">{apresentacao ? `Apresentações em ${diaMes(apresentacao, true)}` : "Dia das apresentações a definir"}</div>
          </div>
          <div className="kpi-acao">
            <Link className="botao secundario pequeno" href="/admin/proximo/credenciados"><Icone nome="lapis" tamanho={16} /> Marcar</Link>
          </div>
        </div>

        <div className="kpi">
          <span className="kpi-icone"><Icone nome="usuarios" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Votação das cidades</div>
            <div className={`kpi-valor ${votacaoCidades ? "status-aberta" : "status-fechada"}`}>{votacaoCidades ? "Liberada" : "Fechada"}</div>
            <div className="kpi-nota">{votacaoCidades ? quemVota : "Libere no dia das apresentações"}</div>
          </div>
        </div>

        <div className="kpi destaque">
          <span className="kpi-icone"><Icone nome="grafico" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Expositores que votaram</div>
            <div className="kpi-valor">{resultado.votantes}</div>
            <div className="kpi-nota">Cada um escolhe 2 cidades</div>
          </div>
          <div className="kpi-acao">
            <Link className="botao secundario pequeno" href="/admin/proximo" prefetch={false}><Icone nome="atualizar" tamanho={16} /> Atualizar</Link>
          </div>
        </div>
      </div>

      <section className="bloco">
        <h2 className="bloco-titulo"><Icone nome="trofeu" tamanho={22} /> Votação das cidades</h2>

        {params.vagas && <div className="ok">Número de vagas salvo.</div>}
        {params.quem && <div className="ok">Quem pode votar foi alterado.</div>}

        {/* Os campos ficam juntos no cartão, mas cada um pertence ao seu formulário (atributo form). */}
        <form id="form-vagas" action={salvarVagas} hidden />
        {votacaoCidades ? (
          <form id="form-quem" action={alterarQuemVota} hidden />
        ) : (
          <form id="form-quem" action={liberarVotacao} hidden>
            <input type="hidden" name="modo" value="cidades" />
          </form>
        )}
        <form id="form-encerrar" action={encerrarVotacao} hidden>
          <input type="hidden" name="modo" value="cidades" />
        </form>

        <div className="vc2">
          {/* ---------- Controles ---------- */}
          <div className="vc2-controle">
            <div className={`vc2-status${votacaoCidades ? " aberta" : ""}`}>
              <span className="vc2-status-ponto" aria-hidden="true" />
              <div>
                <strong>{votacaoCidades ? "Votação liberada" : "Votação fechada"}</strong>
                <small>
                  {votacaoCidades
                    ? `Podem votar: ${quemVota.toLowerCase()}`
                    : t.apresentaram < 2
                      ? "Marque pelo menos 2 municípios como Apresentou"
                      : "Escolha quem pode votar e libere"}
                </small>
              </div>
            </div>
            {votacaoCidades ? (
              <button className="botao vc2-principal" form="form-encerrar"><span className="vc-quadrado" aria-hidden="true" /> Encerrar votação</button>
            ) : (
              <button className="botao vc2-principal" form="form-quem" disabled={t.apresentaram < 2}>▶ Liberar votação</button>
            )}

            <div className="vc2-grupo">
              <label htmlFor="vagas" className="vc2-rotulo">Cidades que entram no Circuito {ano}</label>
              <div className="vc2-linha">
                <input id="vagas" name="vagas" form="form-vagas" type="number" min={1} max={50} defaultValue={resultado.vagas ?? ""} placeholder="Ex.: 2" className="vc2-numero" />
                <button className="botao secundario pequeno" form="form-vagas">Salvar</button>
              </div>
            </div>

            <fieldset className="vc2-grupo">
              <legend className="vc2-rotulo">Quem pode votar</legend>
              <label className="vc2-check">
                <input type="checkbox" name="quem" value="avaliaram" form="form-quem" defaultChecked={votacao.cidades_quem === "avaliaram"} />
                Só quem avaliou as exposições <span className="suave">({p.avaliaram})</span>
              </label>
              <label className="vc2-check">
                <input type="checkbox" name="presentes" value="1" form="form-quem" defaultChecked={votacao.cidades_so_presentes} />
                Só quem está presente <span className="suave">({p.presentes})</span>
              </label>
              <small className="suave">Sem marcar nada, todos votam ({p.produtores}).</small>
              {votacaoCidades && <button className="botao secundario pequeno" form="form-quem">Salvar quem pode votar</button>}
            </fieldset>

            <p className="vc2-nota">
              Entram na votação só os municípios marcados como Apresentou:{" "}
              <Link href="/admin/proximo/credenciados"><strong>{t.apresentaram} de {t.credenciados}</strong></Link>
            </p>

            <div className="vc2-atalhos">
              <Link className="botao secundario pequeno" href="/telao" target="_blank"><Icone nome="olho" tamanho={16} /> Tela do telão</Link>
              <Link className="botao secundario pequeno" href="/ranking" target="_blank"><Icone nome="trofeu" tamanho={16} /> Ranking ao vivo</Link>
            </div>
          </div>

          {/* ---------- Resultado ---------- */}
          <div className="vc2-resultado">
            <div className="vc2-res-topo">
              <strong>Resultado</strong>
              <span className="suave">{resultado.vagas ? `As ${resultado.vagas} mais votadas ficam classificadas` : "Defina as vagas para marcar as classificadas"}</span>
            </div>
            {empateNaVaga(resultado.ranking, resultado.vagas) && (
              <div className="aviso-mini" style={{ marginBottom: 10 }}>Empate na última vaga mesmo depois do desempate. A organização decide.</div>
            )}
            {resultado.ranking.length === 0 ? (
              <p className="suave">Nenhum município marcado como Apresentou ainda.</p>
            ) : (
              <RankingCidades ranking={resultado.ranking} vagas={resultado.vagas} porPagina={10} votantes={votantes} />
            )}
            <p className="vc2-nota">Desempate: mais pontos na frente. Cada voto vale de 1,0 a 1,9 conforme as exposições de quem votou.</p>
          </div>
        </div>
      </section>
    </>
  );
}

