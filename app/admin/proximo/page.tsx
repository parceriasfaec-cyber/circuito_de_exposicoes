import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import RankingCidades, { empateNaVaga } from "@/components/RankingCidades";
import { anoCredenciamento, diaMes, lerPrazo, resultadoCidades } from "@/lib/credenciamento";
import { lerVotacao, sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { encerrarVotacao, liberarVotacao } from "../actions";
import { salvarVagas } from "./actions";

export const dynamic = "force-dynamic";

/** Painel das exposições do próximo ano: credenciados, apresentações e votação das cidades. */
export default async function PainelProximoAno({ searchParams }: { searchParams: Promise<{ vagas?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const ano = await anoCredenciamento();
  const params = await searchParams;

  const [t] = await sql()<{ credenciados: number; apresentaram: number }[]>`
    select count(*)::int credenciados, count(*) filter (where apresentou)::int apresentaram
    from credenciamentos where ano = ${ano}`;
  const { prazo, aberto, apresentacao } = await lerPrazo(ano);
  const votacao = await lerVotacao();
  const votacaoCidades = votacao.aberta && votacao.modo === "cidades";
  const resultado = await resultadoCidades(ano);
  const [p] = await sql()<{ produtores: number; avaliaram: number }[]>`
    select count(distinct pa.produtor_id)::int produtores,
           count(distinct pa.produtor_id) filter (where exists (
             select 1 from avaliacoes a join exposicoes e2 on e2.id = a.exposicao_id
             where a.produtor_id = pa.produtor_id and e2.ciclo_id = c.id))::int avaliaram
    from participacoes pa join exposicoes e on e.id = pa.exposicao_id join ciclos c on c.id = e.ciclo_id and c.ativo`;
  const quemVota = votacao.cidades_quem === "avaliaram" ? `Só quem avaliou (${p.avaliaram})` : `Todos os produtores (${p.produtores})`;

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
            <div className="kpi-nota">{votacaoCidades ? `Código do dia: ${votacao.codigo_do_dia} · ${quemVota}` : "Libere no dia das apresentações"}</div>
          </div>
        </div>

        <div className="kpi destaque">
          <span className="kpi-icone"><Icone nome="grafico" tamanho={30} /></span>
          <div className="kpi-corpo">
            <div className="kpi-rotulo">Produtores que votaram</div>
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
        <p className="suave" style={{ marginTop: 0 }}>
          No dia das apresentações, cada produtor do Circuito escolhe <strong>2 cidades</strong> pelo celular. Ele lê o QR Code do telão e
          entra do mesmo jeito da votação das exposições: documento ou nome, mais o código do dia.
        </p>
        <p style={{ margin: "0 0 12px", fontWeight: 700 }}>
          Só entram na votação os municípios marcados como <strong>Apresentou</strong> em{" "}
          <Link href="/admin/proximo/credenciados">Credenciados</Link>: {t.apresentaram} de {t.credenciados}.
        </p>
        {params.vagas && <div className="ok">Número de vagas salvo.</div>}
        <div className="prazo-form" style={{ marginBottom: 14 }}>
          <form action={salvarVagas} className="prazo-form">
            <div>
              <label htmlFor="vagas">Cidades que entram no Circuito {ano}</label>
              <input id="vagas" name="vagas" type="number" min={1} max={50} defaultValue={resultado.vagas ?? ""} placeholder="Ex.: 3" className="campo-numero" />
            </div>
            <button className="botao secundario">Salvar vagas</button>
          </form>
          {votacaoCidades ? (
            <form action={encerrarVotacao}><button className="botao perigo">■ Encerrar votação das cidades</button></form>
          ) : (
            <form action={liberarVotacao} className="liberar-cidades">
              <input type="hidden" name="modo" value="cidades" />
              <fieldset className="quem-vota">
                <legend>Quem pode votar nas cidades</legend>
                <label>
                  <input type="radio" name="quem" value="todos" defaultChecked={votacao.cidades_quem !== "avaliaram"} />
                  Todos os produtores <span className="suave">({p.produtores})</span>
                </label>
                <label>
                  <input type="radio" name="quem" value="avaliaram" defaultChecked={votacao.cidades_quem === "avaliaram"} />
                  Só quem fez a avaliação das exposições <span className="suave">({p.avaliaram})</span>
                </label>
              </fieldset>
              <button className="botao" disabled={t.apresentaram < 2}>▶ Liberar votação das cidades</button>
            </form>
          )}
          <Link className="botao secundario" href="/telao" target="_blank"><Icone nome="olho" tamanho={16} /> Tela do telão</Link>
        </div>
        <p className={votacaoCidades ? "status-aberta" : "status-fechada"} style={{ margin: "0 0 4px", fontWeight: 800 }}>
          {votacaoCidades
            ? `Votação das cidades liberada. Código do dia: ${votacao.codigo_do_dia}. Podem votar: ${quemVota.toLowerCase()}.`
            : votacao.aberta
              ? "Agora está liberada a votação das exposições. Ao liberar a das cidades, ela é encerrada e sai um código novo."
              : t.apresentaram < 2
                ? "Para liberar a votação, marque em Credenciados pelo menos 2 municípios que fizeram a apresentação."
                : "Votação das cidades fechada."}
        </p>
        <p className="suave" style={{ margin: "0 0 14px" }}>
          {resultado.vagas ? `As ${resultado.vagas} mais votadas aparecem como classificadas.` : "Defina as vagas para marcar as classificadas."}
        </p>
        {empateNaVaga(resultado.ranking, resultado.vagas) && (
          <div className="aviso-mini" style={{ marginBottom: 12 }}>Há empate na última vaga. A organização precisa decidir o desempate.</div>
        )}
        {resultado.ranking.length === 0 ? (
          <p className="suave">Nenhum município marcado como Apresentou ainda.</p>
        ) : (
          <RankingCidades ranking={resultado.ranking} vagas={resultado.vagas} />
        )}
      </section>
    </>
  );
}
