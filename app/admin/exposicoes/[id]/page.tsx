import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { excluirExposicao } from "../../cadastros-actions";
import FormExposicao from "./FormExposicao";

export const dynamic = "force-dynamic";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function EditarExposicao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const { id } = await params;
  const { erro } = await searchParams;
  const nova = id === "nova";
  if (!nova && !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = sql();
  let dados = { id: "", nome: "", municipio: "", local: "", data_inicio: "", data_fim: "", perguntas: [] as string[] };
  let avaliacoes = 0;
  let participantes = 0;

  if (!nova) {
    const [e] = await db<{ nome: string; municipio: string; local: string | null; data_inicio: Date; data_fim: Date }[]>`
      select nome, municipio, local, data_inicio, data_fim from exposicoes where id = ${id}`;
    if (!e) notFound();
    const perguntas = await db<{ texto: string }[]>`select texto from perguntas where exposicao_id = ${id} order by ordem`;
    const [c] = await db<{ a: number; p: number }[]>`
      select (select count(*)::int from avaliacoes where exposicao_id = ${id}) a,
             (select count(*)::int from participacoes where exposicao_id = ${id}) p`;
    avaliacoes = c.a;
    participantes = c.p;
    dados = { id, nome: e.nome, municipio: e.municipio, local: e.local ?? "", data_inicio: iso(e.data_inicio), data_fim: iso(e.data_fim), perguntas: perguntas.map((q) => q.texto) };
  }

  return (
    <>
      <CabecalhoAdmin titulo={nova ? "Nova exposição" : dados.nome} subtitulo={nova ? "Cadastre uma exposição do Circuito." : "Edite os dados e as perguntas desta exposição."} />
      <div className="barra">
        <Link href="/admin/exposicoes" className="acao-link"><Icone nome="voltar" tamanho={18} /> Voltar para Exposições</Link>
      </div>

      {erro === "avaliada" && <div className="erro" style={{ marginBottom: 14 }}>Esta exposição já recebeu avaliações e não pode ser excluída.</div>}

      <FormExposicao dados={dados} avaliacoes={avaliacoes} />

      {!nova && (
        <section className="bloco" style={{ paddingTop: 14 }}>
          <strong>Excluir exposição</strong>
          {avaliacoes > 0 ? (
            <p className="suave" style={{ margin: "6px 0 0" }}>Não é possível excluir: ela já tem {avaliacoes} avaliações.</p>
          ) : (
            <form action={excluirExposicao} className="acoes-form" style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={id} />
              <span className="suave">Remove a exposição, as perguntas e a ligação com {participantes} produtores.</span>
              <button className="botao perigo pequeno">Excluir exposição</button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
