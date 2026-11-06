import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { excluirProdutor } from "../../cadastros-actions";
import FormProdutor from "./FormProdutor";

export const dynamic = "force-dynamic";

export default async function EditarProdutor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const { id } = await params;
  const { erro } = await searchParams;
  const novo = id === "novo";
  if (!novo && !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = sql();
  const exposicoes = await db<{ id: string; nome: string }[]>`select id, nome from exposicoes order by data_inicio, nome`;

  let dados = { id: "", nome: "", municipio: "", atividade: "", tipo_documento: "CPF", documento: "", participa: [] as string[], avaliadas: [] as string[] };
  if (!novo) {
    const [p] = await db<{ nome: string; municipio: string; atividade: string | null; tipo_documento: string | null; documento: string | null }[]>`
      select nome, municipio, atividade, tipo_documento, documento from produtores where id = ${id}`;
    if (!p) notFound();
    const part = await db<{ exposicao_id: string }[]>`select exposicao_id from participacoes where produtor_id = ${id}`;
    const aval = await db<{ exposicao_id: string }[]>`select exposicao_id from avaliacoes where produtor_id = ${id}`;
    dados = {
      id,
      nome: p.nome,
      municipio: p.municipio,
      atividade: p.atividade ?? "",
      tipo_documento: p.tipo_documento ?? "",
      documento: p.documento ?? "",
      participa: part.map((x) => x.exposicao_id),
      avaliadas: aval.map((x) => x.exposicao_id),
    };
  }

  return (
    <>
      <CabecalhoAdmin titulo={novo ? "Novo produtor" : dados.nome} subtitulo={novo ? "Cadastre um participante da lista de votação." : "Edite os dados e as exposições em que o produtor participou."} />
      <div className="barra">
        <Link href="/admin/produtores" className="acao-link"><Icone nome="voltar" tamanho={18} /> Voltar para Produtores</Link>
        {!novo && <Link href={`/admin/avaliacoes/${id}`} className="acao-link"><Icone nome="olho" tamanho={18} /> Ver avaliação</Link>}
      </div>

      {erro === "avaliou" && <div className="erro" style={{ marginBottom: 14 }}>Este produtor já avaliou e não pode ser excluído.</div>}

      <FormProdutor dados={dados} exposicoes={exposicoes} />

      {!novo && (
        <section className="bloco" style={{ paddingTop: 14 }}>
          <strong>Excluir produtor</strong>
          {dados.avaliadas.length > 0 ? (
            <p className="suave" style={{ margin: "6px 0 0" }}>Não é possível excluir: ele já enviou a avaliação.</p>
          ) : (
            <form action={excluirProdutor} className="acoes-form" style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={id} />
              <span className="suave">Remove o produtor da lista de votação.</span>
              <button className="botao perigo pequeno">Excluir produtor</button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
