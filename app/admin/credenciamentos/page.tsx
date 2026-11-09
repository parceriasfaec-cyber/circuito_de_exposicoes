import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import RankingCidades, { empateNaVaga } from "@/components/RankingCidades";
import { ANO_CREDENCIAMENTO, diaMes, formatarCpf, lerPrazo, municipiosDisponiveis, resultadoCidades } from "@/lib/credenciamento";
import { lerVotacao, sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData } from "@/lib/texto";
import { encerrarVotacao, liberarVotacao } from "../actions";
import { salvarPrazo, salvarVagas } from "./actions";
import BotaoExcluir from "./BotaoExcluir";

export const dynamic = "force-dynamic";

type Linha = {
  id: string;
  municipio: string;
  instituicao: string;
  responsavel: string;
  funcao: string;
  cpf: string;
  email: string;
  periodo1_inicio: Date;
  periodo1_fim: Date;
  periodo2_inicio: Date;
  periodo2_fim: Date;
  criado_em: Date;
};

export default async function Credenciamentos({ searchParams }: { searchParams: Promise<{ excluido?: string; prazo?: string; vagas?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;

  const linhas = await sql()<Linha[]>`
    select c.id, m.nome municipio, c.instituicao, c.responsavel, c.funcao, c.cpf, c.email,
           c.periodo1_inicio, c.periodo1_fim, c.periodo2_inicio, c.periodo2_fim, c.criado_em
    from credenciamentos c join municipios m on m.codigo = c.municipio_codigo
    where c.ano = ${ANO_CREDENCIAMENTO}
    order by c.criado_em`;
  const disponiveis = (await municipiosDisponiveis()).length;
  const { prazo, aberto, apresentacao } = await lerPrazo();
  const votacao = await lerVotacao();
  const votacaoCidades = votacao.aberta && votacao.modo === "cidades";
  const resultado = await resultadoCidades();
  const vagas = resultado.vagas;
  const periodo = (i: Date, f: Date) => `${formatarData(i)} a ${formatarData(f)}`;

  return (
    <>
      <CabecalhoAdmin
        titulo={`Credenciamento ${ANO_CREDENCIAMENTO}`}
        subtitulo="Municípios que se cadastraram para sediar uma etapa do Circuito. Cada município só pode se credenciar uma vez."
      />

      {params.excluido && <div className="ok">Credenciamento excluído. O município voltou para a lista do formulário.</div>}
      {params.prazo && <div className="ok">Datas do credenciamento salvas.</div>}

      <section className="bloco prazo-cred">
        <h2 className="bloco-titulo"><Icone nome="calendario" tamanho={22} /> Prazo e apresentações</h2>
        <form action={salvarPrazo} className="prazo-form">
          <div>
            <label htmlFor="prazo">Aceitar cadastros até o dia</label>
            <input id="prazo" name="prazo" type="date" defaultValue={prazo ?? ""} />
          </div>
          <div>
            <label htmlFor="apresentacao">Dia das apresentações</label>
            <input id="apresentacao" name="apresentacao" type="date" defaultValue={apresentacao ?? ""} />
          </div>
          <button className="botao">Salvar datas</button>
        </form>
        <p className={aberto ? "status-aberta" : "status-fechada"} style={{ margin: "10px 0 0", fontWeight: 800 }}>
          {!prazo
            ? "Sem prazo definido: o formulário está aberto."
            : aberto
              ? `Formulário aberto até ${diaMes(prazo, true)} (fim do dia). Essa data aparece no quadro "Fique atento!".`
              : `Formulário encerrado: o prazo terminou em ${diaMes(prazo, true)}.`}
        </p>
        <p className="suave" style={{ margin: "6px 0 0" }}>As duas datas aparecem no quadro "Fique atento!" do formulário. Para reabrir o credenciamento, escolha um prazo novo; deixe em branco para ficar sem prazo.</p>
      </section>

      <section className="bloco">
        <h2 className="bloco-titulo"><Icone nome="trofeu" tamanho={22} /> Votação das cidades</h2>
        <p className="suave" style={{ marginTop: 0 }}>
          No dia das apresentações, cada produtor do Circuito escolhe <strong>2 cidades</strong> pelo celular. Ele entra do mesmo jeito
          da votação das exposições: documento ou nome, mais o código do dia mostrado no telão.
        </p>
        {params.vagas && <div className="ok">Número de vagas salvo.</div>}
        <div className="prazo-form" style={{ marginBottom: 14 }}>
          <form action={salvarVagas} className="prazo-form">
            <div>
              <label htmlFor="vagas">Cidades que entram no Circuito {ANO_CREDENCIAMENTO}</label>
              <input id="vagas" name="vagas" type="number" min={1} max={50} defaultValue={vagas ?? ""} placeholder="Ex.: 3" className="campo-numero" />
            </div>
            <button className="botao secundario">Salvar vagas</button>
          </form>
          {votacaoCidades ? (
            <form action={encerrarVotacao}><button className="botao perigo">■ Encerrar votação das cidades</button></form>
          ) : (
            <form action={liberarVotacao}>
              <input type="hidden" name="modo" value="cidades" />
              <button className="botao" disabled={linhas.length < 2}>▶ Liberar votação das cidades</button>
            </form>
          )}
          <Link className="botao secundario" href="/telao" target="_blank"><Icone nome="olho" tamanho={16} /> Tela do telão</Link>
        </div>
        <p className={votacaoCidades ? "status-aberta" : "status-fechada"} style={{ margin: "0 0 4px", fontWeight: 800 }}>
          {votacaoCidades
            ? `Votação das cidades liberada. Código do dia: ${votacao.codigo_do_dia}.`
            : votacao.aberta
              ? "Agora está liberada a votação das exposições. Ao liberar a das cidades, ela é encerrada e sai um código novo."
              : linhas.length < 2
                ? "Para liberar a votação, é preciso ter pelo menos 2 cidades credenciadas."
                : "Votação das cidades fechada."}
        </p>
        <p className="suave" style={{ margin: "0 0 14px" }}>
          {resultado.votantes} {resultado.votantes === 1 ? "produtor votou" : "produtores votaram"}.
          {resultado.vagas ? ` As ${resultado.vagas} mais votadas aparecem como classificadas.` : " Defina as vagas para marcar as classificadas."}
        </p>
        {empateNaVaga(resultado.ranking, resultado.vagas) && (
          <div className="aviso-mini" style={{ marginBottom: 12 }}>Há empate na última vaga. A organização precisa decidir o desempate.</div>
        )}
        <RankingCidades ranking={resultado.ranking} vagas={resultado.vagas} />
      </section>

      <div className="barra">
        <span className="suave">
          Link do formulário: <Link href="/credenciamento" target="_blank"><strong>/credenciamento</strong></Link>
        </span>
        <Link className="botao secundario pequeno" href="/credenciamento" target="_blank">
          <Icone nome="olho" tamanho={16} /> Abrir formulário
        </Link>
      </div>

      {linhas.length === 0 ? (
        <div className="cartao"><p style={{ margin: 0 }}>Nenhum município se credenciou ainda.</p></div>
      ) : (
        <div className="tabela">
          <table className="tabela-org">
            <thead>
              <tr>
                <th><span><Icone nome="local" tamanho={18} /> Município</span></th>
                <th><span><Icone nome="usuario" tamanho={18} /> Responsável</span></th>
                <th><span><Icone nome="calendario" tamanho={18} /> Períodos</span></th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="nome">{l.municipio}</div>
                    <div className="doc">{l.instituicao}</div>
                  </td>
                  <td>
                    <div className="nome">{l.responsavel}</div>
                    <div className="doc">{l.funcao} · CPF {formatarCpf(l.cpf)}</div>
                    <div className="doc"><a href={`mailto:${l.email}`}>{l.email}</a></div>
                  </td>
                  <td>
                    <div>01: {periodo(l.periodo1_inicio, l.periodo1_fim)}</div>
                    <div>02: {periodo(l.periodo2_inicio, l.periodo2_fim)}</div>
                    <div className="doc">
                      Enviado em {l.criado_em.toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}><BotaoExcluir id={l.id} municipio={l.municipio} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rodape-tabela">
        <span className="total"><Icone nome="trofeu" tamanho={20} /> {linhas.length} {linhas.length === 1 ? "município credenciado" : "municípios credenciados"}</span>
        <span className="suave">{disponiveis} municípios ainda disponíveis</span>
      </div>
    </>
  );
}
