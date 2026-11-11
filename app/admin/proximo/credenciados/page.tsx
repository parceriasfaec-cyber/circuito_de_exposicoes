import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { anoCredenciamento, formatarCpf, formatarTelefone, municipiosDisponiveis } from "@/lib/credenciamento";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData } from "@/lib/texto";
import ListaCredenciados from "./ListaCredenciados";

export const dynamic = "force-dynamic";

type Linha = {
  id: string;
  municipio: string;
  instituicao: string;
  responsavel: string;
  funcao: string;
  cpf: string | null;
  email: string;
  telefone: string | null;
  periodo1_inicio: Date;
  periodo1_fim: Date;
  periodo2_inicio: Date;
  periodo2_fim: Date;
  criado_em: Date;
  apresentou: boolean;
};

export default async function Credenciados({ searchParams }: { searchParams: Promise<{ excluido?: string; editado?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const ano = await anoCredenciamento();
  const params = await searchParams;

  const linhas = await sql()<Linha[]>`
    select c.id, m.nome municipio, c.instituicao, c.responsavel, c.funcao, c.cpf, c.email, c.telefone,
           c.periodo1_inicio, c.periodo1_fim, c.periodo2_inicio, c.periodo2_fim, c.criado_em, c.apresentou
    from credenciamentos c join municipios m on m.codigo = c.municipio_codigo
    where c.ano = ${ano}
    order by m.nome`;
  const disponiveis = (await municipiosDisponiveis(ano)).length;
  const periodo = (i: Date, f: Date) => `${formatarData(i)} a ${formatarData(f)}`;

  return (
    <>
      <CabecalhoAdmin
        titulo={`Credenciados ${ano}`}
        subtitulo="Municípios que se cadastraram para sediar uma etapa do Circuito. Cada município só pode se credenciar uma vez."
      />

      {params.excluido && <div className="ok">Credenciamento excluído. O município voltou para a lista do formulário.</div>}
      {params.editado && <div className="ok">Alterações salvas.</div>}

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
        <ListaCredenciados
          linhas={linhas.map((l) => ({
            id: l.id,
            municipio: l.municipio,
            instituicao: l.instituicao,
            responsavel: l.responsavel,
            funcao: l.funcao,
            cpf: formatarCpf(l.cpf),
            telefone: l.telefone ? formatarTelefone(l.telefone) : "",
            telefoneDigitos: l.telefone,
            email: l.email,
            periodo1: periodo(l.periodo1_inicio, l.periodo1_fim),
            periodo2: periodo(l.periodo2_inicio, l.periodo2_fim),
            enviado: l.criado_em.toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" }),
            apresentou: l.apresentou,
          }))}
        />
      )}

      <div className="rodape-tabela">
        <span className="total"><Icone nome="trofeu" tamanho={20} /> {linhas.length} {linhas.length === 1 ? "município credenciado" : "municípios credenciados"}</span>
        <span className="suave">{disponiveis} municípios ainda disponíveis</span>
      </div>
    </>
  );
}
