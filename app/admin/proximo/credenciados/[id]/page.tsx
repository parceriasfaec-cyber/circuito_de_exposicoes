import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import FormCredenciamento from "@/app/credenciamento/FormCredenciamento";
import { anoCredenciamento, formatarCpf, formatarTelefone, municipiosDisponiveis } from "@/lib/credenciamento";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { salvarCredenciado } from "../../actions";

export const dynamic = "force-dynamic";

type Linha = {
  municipio_codigo: number;
  municipio: string;
  instituicao: string;
  responsavel: string;
  funcao: string;
  cpf: string | null;
  telefone: string | null;
  email: string;
  periodo1_inicio: string;
  periodo1_fim: string;
  periodo2_inicio: string;
  periodo2_fim: string;
};

/** Editar um credenciado: os mesmos campos do formulário público, já preenchidos. */
export default async function EditarCredenciado({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const { id } = await params;
  const { ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ano = await anoCredenciamento();

  const [c] = await sql()<Linha[]>`
    select c.municipio_codigo, m.nome municipio, c.instituicao, c.responsavel, c.funcao, c.cpf, c.telefone, c.email,
           to_char(c.periodo1_inicio, 'YYYY-MM-DD') periodo1_inicio, to_char(c.periodo1_fim, 'YYYY-MM-DD') periodo1_fim,
           to_char(c.periodo2_inicio, 'YYYY-MM-DD') periodo2_inicio, to_char(c.periodo2_fim, 'YYYY-MM-DD') periodo2_fim
    from credenciamentos c join municipios m on m.codigo = c.municipio_codigo
    where c.id = ${id} and c.ano = ${ano}`;
  if (!c) notFound();

  // Pode manter o município atual ou trocar por um que ainda esteja disponível.
  const municipios = [{ codigo: c.municipio_codigo, nome: c.municipio }, ...(await municipiosDisponiveis(ano))].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  return (
    <>
      <CabecalhoAdmin titulo={`Editar credenciado: ${c.municipio}`} subtitulo="Corrija os dados do credenciamento e clique em Salvar alterações." />

      <div className="barra">
        <Link href="/admin/proximo/credenciados" className="acao-link"><Icone nome="voltar" tamanho={18} /> Voltar para Credenciados</Link>
      </div>

      {ok && <div className="ok">Alterações salvas.</div>}

      <section className="bloco" style={{ maxWidth: 900 }}>
        <FormCredenciamento
          key={ok ?? "inicio"}
          municipios={municipios}
          ano={ano}
          acao={salvarCredenciado}
          id={id}
          textoBotao="Salvar alterações"
          valores={{
            municipio: c.municipio_codigo,
            instituicao: c.instituicao,
            responsavel: c.responsavel,
            funcao: c.funcao,
            cpf: formatarCpf(c.cpf),
            telefone: c.telefone ? formatarTelefone(c.telefone) : "",
            email: c.email,
            periodo1_inicio: c.periodo1_inicio,
            periodo1_fim: c.periodo1_fim,
            periodo2_inicio: c.periodo2_inicio,
            periodo2_fim: c.periodo2_fim,
          }}
        />
      </section>
    </>
  );
}
