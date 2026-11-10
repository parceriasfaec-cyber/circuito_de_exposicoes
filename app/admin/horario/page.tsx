import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { lerVotacao } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { programarHorarios } from "../actions";
import BotaoLimpar from "./BotaoLimpar";

export const dynamic = "force-dynamic";

const TZ = "America/Fortaleza";
const dataHora = (d: Date | null) =>
  d ? d.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).replace(",", " às") : "—";

/** Date -> "2026-12-12T08:00" na hora de Fortaleza, para o campo datetime-local. */
const paraCampo = (d: Date | null) => {
  if (!d) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** Prazo e horário da avaliação das exposições: abre e fecha sozinha nos horários marcados. */
export default async function HorarioAvaliacao({ searchParams }: { searchParams: Promise<{ horario?: string; horario_erro?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const votacao = await lerVotacao();

  const aberta = votacao.exposicoes_aberta;
  const temHorario = Boolean(votacao.exposicoes_abrir_em || votacao.exposicoes_fechar_em);

  return (
    <>
      <CabecalhoAdmin titulo="Prazo e horário" subtitulo="Marque quando a avaliação das exposições abre e fecha. Ela abre e fecha sozinha (hora de Fortaleza)." />

      {params.horario === "ok" && <div className="ok">Horário salvo.</div>}
      {params.horario === "limpo" && <div className="ok">Horários apagados. Abrir e fechar agora só pelos botões do Painel.</div>}
      {params.horario === "historico" && <div className="ok">Início e fim excluídos.</div>}
      {params.horario_erro && <div className="erro" role="alert">{params.horario_erro}</div>}

      {/* Situação agora, em destaque */}
      <div className={`hr-situacao ${aberta ? "aberta" : "fechada"}`}>
        <span className="hr-situacao-ponto" aria-hidden="true" />
        <div className="hr-situacao-texto">
          <strong>{aberta ? "A avaliação está aberta" : "A avaliação está fechada"}</strong>
          <span>
            {aberta
              ? votacao.exposicoes_aberta_em ? `Desde ${dataHora(votacao.exposicoes_aberta_em)}` : "Liberada pelo Painel"
              : votacao.exposicoes_fechada_em
                ? `${votacao.exposicoes_aberta_em ? `De ${dataHora(votacao.exposicoes_aberta_em)} até` : "Fechou em"} ${dataHora(votacao.exposicoes_fechada_em)}`
                : "Ainda não foi liberada"}
          </span>
          {votacao.exposicoes_abrir_em && <span>Abre sozinha: <strong>{dataHora(votacao.exposicoes_abrir_em)}</strong></span>}
          {votacao.exposicoes_fechar_em && <span>Fecha sozinha: <strong>{dataHora(votacao.exposicoes_fechar_em)}</strong></span>}
        </div>
        {temHorario && (
          <a href="#programar" className="botao-detalhes"><Icone nome="lapis" tamanho={16} /> Editar horário</a>
        )}
        {!aberta && (votacao.exposicoes_aberta_em || votacao.exposicoes_fechada_em) && <BotaoLimpar />}
      </div>

      <form action={programarHorarios} className="bloco hr-form" id="programar">
        <h2 className="bloco-titulo"><Icone nome="calendario" tamanho={22} /> Programar horário</h2>
        <div className="hr-passos">
          <div className="hr-passo">
            <span className="hr-num">1</span>
            <div className="hr-passo-corpo">
              <label htmlFor="abrir">Abre em</label>
              <input
                id="abrir" name="abrir" type="datetime-local"
                defaultValue={paraCampo(aberta ? votacao.exposicoes_aberta_em : votacao.exposicoes_abrir_em)}
              />
              <small>
                {aberta
                  ? "Já está aberta. Pode corrigir o horário de início; se puser um horário futuro, ela fecha agora e abre nesse horário."
                  : "Deixe vazio para abrir pelo botão Liberar."}
              </small>
            </div>
          </div>
          <div className="hr-passo">
            <span className="hr-num">2</span>
            <div className="hr-passo-corpo">
              <label htmlFor="fechar">Fecha em</label>
              <input id="fechar" name="fechar" type="datetime-local" defaultValue={paraCampo(votacao.exposicoes_fechar_em)} />
              <small>Deixe vazio para fechar pelo botão Encerrar.</small>
            </div>
          </div>
        </div>
        <div className="hr-rodape">
          <span className="hr-marcado">
            {temHorario ? (
              <>
                {votacao.exposicoes_abrir_em && <>Abre sozinha: <strong>{dataHora(votacao.exposicoes_abrir_em)}</strong></>}
                {votacao.exposicoes_abrir_em && votacao.exposicoes_fechar_em && " · "}
                {votacao.exposicoes_fechar_em && <>Fecha sozinha: <strong>{dataHora(votacao.exposicoes_fechar_em)}</strong></>}
              </>
            ) : "Nenhum horário marcado."}
          </span>
          <div className="hr-botoes">
            {temHorario && <button className="botao secundario" name="acao" value="limpar">Apagar horários</button>}
            <button className="botao" name="acao" value="salvar">Salvar horário</button>
          </div>
        </div>
      </form>
    </>
  );
}
