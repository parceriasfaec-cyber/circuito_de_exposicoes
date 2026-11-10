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

  return (
    <>
      <CabecalhoAdmin titulo="Prazo e horário" subtitulo="Quando a avaliação das exposições abre e quando fecha." />

      <section className="bloco horario-aval" id="horario">
        <h2 className="bloco-titulo"><Icone nome="calendario" tamanho={22} /> Horário da avaliação</h2>
        <p className="suave" style={{ margin: "6px 0 10px" }}>
          Marque quando a avaliação abre e quando fecha. Ela abre e fecha sozinha nesses horários (hora de Fortaleza). Os botões
          Liberar e Encerrar continuam funcionando a qualquer momento.
        </p>
        {params.horario === "ok" && <div className="ok">Horário salvo.</div>}
        {params.horario === "historico" && <div className="ok">Início e fim excluídos.</div>}
        {params.horario === "limpo" && <div className="ok">Horários apagados. Abrir e fechar agora só pelos botões.</div>}
        {params.horario_erro && <div className="erro" role="alert">{params.horario_erro}</div>}
        <form action={programarHorarios} className="horario-form">
          <div>
            <label htmlFor="abrir">Abrir em</label>
            <input id="abrir" name="abrir" type="datetime-local" defaultValue={paraCampo(votacao.exposicoes_abrir_em)} disabled={votacao.exposicoes_aberta} />
            {votacao.exposicoes_aberta && <small className="suave">Já está aberta.</small>}
          </div>
          <div>
            <label htmlFor="fechar">Fechar em</label>
            <input id="fechar" name="fechar" type="datetime-local" defaultValue={paraCampo(votacao.exposicoes_fechar_em)} />
          </div>
          <div className="horario-botoes">
            <button className="botao" name="acao" value="salvar">Salvar horário</button>
            {(votacao.exposicoes_abrir_em || votacao.exposicoes_fechar_em) && (
              <button className="botao secundario" name="acao" value="limpar">Apagar horários</button>
            )}
          </div>
        </form>
      </section>


      <section className="bloco">
        <h2 className="bloco-titulo"><Icone nome="prancheta" tamanho={22} /> Situação agora</h2>
        {/* Tudo numa linha: situação, início, fim, horários marcados e o botão de excluir. */}
        <div className="horario-linha">
          <strong className={votacao.exposicoes_aberta ? "status-aberta" : "status-fechada"}>
            {votacao.exposicoes_aberta ? "Aberta" : "Fechada"}
          </strong>
          {votacao.exposicoes_aberta_em && <span>Início: <strong>{dataHora(votacao.exposicoes_aberta_em)}</strong></span>}
          {!votacao.exposicoes_aberta && votacao.exposicoes_fechada_em && <span>Fim: <strong>{dataHora(votacao.exposicoes_fechada_em)}</strong></span>}
          {votacao.exposicoes_abrir_em && <span>Abre sozinha: <strong>{dataHora(votacao.exposicoes_abrir_em)}</strong></span>}
          {votacao.exposicoes_fechar_em && <span>Fecha sozinha: <strong>{dataHora(votacao.exposicoes_fechar_em)}</strong></span>}
          {!votacao.exposicoes_abrir_em && !votacao.exposicoes_fechar_em && <span className="suave">Nenhum horário marcado</span>}
          {!votacao.exposicoes_aberta && (votacao.exposicoes_aberta_em || votacao.exposicoes_fechada_em) && <BotaoLimpar />}
        </div>
      </section>
    </>
  );
}
