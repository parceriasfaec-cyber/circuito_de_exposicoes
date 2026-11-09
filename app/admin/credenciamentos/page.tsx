import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { ANO_CREDENCIAMENTO, diaMes, formatarCpf, lerPrazo, municipiosDisponiveis } from "@/lib/credenciamento";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData } from "@/lib/texto";
import { salvarPrazo } from "./actions";
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

export default async function Credenciamentos({ searchParams }: { searchParams: Promise<{ excluido?: string; prazo?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;

  const linhas = await sql()<Linha[]>`
    select c.id, m.nome municipio, c.instituicao, c.responsavel, c.funcao, c.cpf, c.email,
           c.periodo1_inicio, c.periodo1_fim, c.periodo2_inicio, c.periodo2_fim, c.criado_em
    from credenciamentos c join municipios m on m.codigo = c.municipio_codigo
    where c.ano = ${ANO_CREDENCIAMENTO}
    order by c.criado_em`;
  const disponiveis = (await municipiosDisponiveis()).length;
  const { prazo, aberto } = await lerPrazo();
  const periodo = (i: Date, f: Date) => `${formatarData(i)} a ${formatarData(f)}`;

  return (
    <>
      <CabecalhoAdmin
        titulo={`Credenciamento ${ANO_CREDENCIAMENTO}`}
        subtitulo="Municípios que se cadastraram para sediar uma etapa do Circuito. Cada município só pode se credenciar uma vez."
      />

      {params.excluido && <div className="ok">Credenciamento excluído. O município voltou para a lista do formulário.</div>}
      {params.prazo && <div className="ok">Prazo do credenciamento salvo.</div>}

      <section className="bloco prazo-cred">
        <h2 className="bloco-titulo"><Icone nome="calendario" tamanho={22} /> Prazo do credenciamento</h2>
        <form action={salvarPrazo} className="prazo-form">
          <div>
            <label htmlFor="prazo">Aceitar cadastros até o dia</label>
            <input id="prazo" name="prazo" type="date" defaultValue={prazo ?? ""} />
          </div>
          <button className="botao">Salvar prazo</button>
        </form>
        <p className={aberto ? "status-aberta" : "status-fechada"} style={{ margin: "10px 0 0", fontWeight: 800 }}>
          {!prazo
            ? "Sem prazo definido: o formulário está aberto."
            : aberto
              ? `Formulário aberto até ${diaMes(prazo, true)} (fim do dia). Essa data aparece no quadro "Fique atento!".`
              : `Formulário encerrado: o prazo terminou em ${diaMes(prazo, true)}.`}
        </p>
        <p className="suave" style={{ margin: "6px 0 0" }}>Para reabrir, escolha uma data nova. Deixe em branco e salve para ficar sem prazo.</p>
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
