import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { ANO_CREDENCIAMENTO, formatarCpf, municipiosDisponiveis } from "@/lib/credenciamento";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData } from "@/lib/texto";
import { marcarApresentacao } from "../actions";
import BotaoExcluir from "../BotaoExcluir";

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
  apresentou: boolean;
};

export default async function Credenciados({ searchParams }: { searchParams: Promise<{ excluido?: string; marcado?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;

  const linhas = await sql()<Linha[]>`
    select c.id, m.nome municipio, c.instituicao, c.responsavel, c.funcao, c.cpf, c.email,
           c.periodo1_inicio, c.periodo1_fim, c.periodo2_inicio, c.periodo2_fim, c.criado_em, c.apresentou
    from credenciamentos c join municipios m on m.codigo = c.municipio_codigo
    where c.ano = ${ANO_CREDENCIAMENTO}
    order by c.criado_em`;
  const disponiveis = (await municipiosDisponiveis()).length;
  const apresentaram = linhas.filter((l) => l.apresentou).length;
  const periodo = (i: Date, f: Date) => `${formatarData(i)} a ${formatarData(f)}`;

  return (
    <>
      <CabecalhoAdmin
        titulo={`Credenciados ${ANO_CREDENCIAMENTO}`}
        subtitulo="Municípios que se cadastraram para sediar uma etapa do Circuito. Cada município só pode se credenciar uma vez."
      />

      {params.excluido && <div className="ok">Credenciamento excluído. O município voltou para a lista do formulário.</div>}

      <p style={{ margin: "0 0 12px", fontWeight: 700 }}>
        Depois que o município fizer a apresentação, clique em <strong>Não apresentou</strong> para marcar como{" "}
        <strong>✓ Apresentou</strong>. Só quem apresentou entra na votação das cidades: {apresentaram} de {linhas.length}.
      </p>
      {params.marcado && <div className="ok">Apresentação atualizada.</div>}

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
                <th style={{ textAlign: "center" }}>Apresentação</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className={l.apresentou ? "linha-apresentou" : undefined}>
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
                  <td style={{ textAlign: "center" }}>
                    <form action={marcarApresentacao}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="apresentou" value={l.apresentou ? "nao" : "sim"} />
                      <button className={`selo-apresentou${l.apresentou ? " sim" : ""}`} title={l.apresentou ? "Clique para desmarcar" : "Clique quando o município fizer a apresentação"}>
                        {l.apresentou ? "✓ Apresentou" : "Não apresentou"}
                      </button>
                    </form>
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
