import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { excluirProdutor } from "../../cadastros-actions";
import FormProdutor from "./FormProdutor";

export const dynamic = "force-dynamic";

export default async function EditarProdutor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ciclo?: string; juntado?: string; ok?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const { id } = await params;
  const { erro, ciclo: cicloParam, juntado, ok } = await searchParams;
  const { ciclo, ciclos } = await cicloEscolhido(cicloParam);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";
  const novo = id === "novo";
  if (!novo && !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = sql();
  const exposicoes = await db<{ id: string; nome: string }[]>`select id, nome from exposicoes where ciclo_id = ${cid} order by data_inicio, nome`;

  let dados = { id: "", codigo: "", nome: "", empresa: "", municipio: "", atividade: "", tipo_documento: "CPF", documento: "", participa: [] as string[], avaliadas: [] as string[] };
  if (!novo) {
    const [p] = await db<{ codigo: string; nome: string; empresa: string | null; municipio: string; atividade: string | null; tipo_documento: string | null; documento: string | null }[]>`
      select codigo, nome, empresa, municipio, atividade, tipo_documento, documento from produtores where id = ${id}`;
    if (!p) notFound();
    const part = await db<{ exposicao_id: string }[]>`select exposicao_id from participacoes where produtor_id = ${id}`;
    const aval = await db<{ exposicao_id: string }[]>`select exposicao_id from avaliacoes where produtor_id = ${id}`;
    dados = {
      id,
      codigo: p.codigo,
      nome: p.nome,
      empresa: p.empresa ?? "",
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
      <CabecalhoAdmin titulo={novo ? "Novo expositor" : dados.nome} subtitulo={novo ? "Cadastre um participante da lista de votação." : `ID ${dados.codigo} · Edite os dados e as exposições em que o expositor participou.`} ciclos={ciclos} ciclo={ciclo} />
      <div className="barra">
        <Link href={`/admin/produtores?ciclo=${cid}`} className="acao-link"><Icone nome="voltar" tamanho={18} /> Voltar para Expositores</Link>
        {!novo && <Link href={`/admin/avaliacoes/${id}?ciclo=${cid}`} className="acao-link"><Icone nome="olho" tamanho={18} /> Ver avaliação</Link>}
      </div>

      {erro === "avaliou" && <div className="erro" style={{ marginBottom: 14 }}>Este expositor já avaliou e não pode ser excluído.</div>}
      {erro === "juntar-avaliou" && <div className="erro" style={{ marginBottom: 14 }}>Este cadastro já enviou avaliação e não pode ser juntado. Junte pelo outro cadastro.</div>}
      {ok && <div className="ok">Alterações salvas.</div>}
      {juntado && <div className="ok">Cadastros juntados. As exposições dos dois estão marcadas abaixo.</div>}

      <FormProdutor key={ok ?? "inicio"} dados={dados} exposicoes={exposicoes} cicloId={cid} cicloNome={ciclo?.nome ?? ""} />

      {!novo && (
        <section className="bloco" style={{ paddingTop: 14 }}>
          <strong>Excluir expositor</strong>
          {dados.avaliadas.length > 0 ? (
            <p className="suave" style={{ margin: "6px 0 0" }}>Não é possível excluir: ele já enviou a avaliação.</p>
          ) : (
            <form action={excluirProdutor} className="acoes-form" style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={id} />
              <span className="suave">Remove o expositor da lista de votação.</span>
              <button className="botao perigo pequeno">Excluir expositor</button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
