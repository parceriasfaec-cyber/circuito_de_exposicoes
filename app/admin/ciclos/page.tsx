import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { ativarCiclo } from "../cadastros-actions";
import FormCiclo from "./FormCiclo";

export const dynamic = "force-dynamic";

type Linha = { id: string; ano: number; nome: string; ativo: boolean; exposicoes: number; participantes: number; avaliacoes: number };

export default async function Ciclos({ searchParams }: { searchParams: Promise<{ ok?: string; ativado?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;

  const ciclos = await sql()<Linha[]>`
    select c.id, c.ano, c.nome, c.ativo,
           (select count(*)::int from exposicoes e where e.ciclo_id = c.id) exposicoes,
           (select count(distinct pa.produtor_id)::int from participacoes pa join exposicoes e on e.id = pa.exposicao_id where e.ciclo_id = c.id) participantes,
           (select count(*)::int from avaliacoes a join exposicoes e on e.id = a.exposicao_id where e.ciclo_id = c.id) avaliacoes
    from ciclos c order by c.ano desc`;

  return (
    <>
      <CabecalhoAdmin titulo="Ciclos" subtitulo="Cada ano é um ciclo do Circuito, com as suas exposições, a sua votação e o seu ranking." />

      {params.ok && <div className="ok">Ciclo criado.</div>}
      {params.ativado && <div className="ok">Ciclo ativado. A votação foi encerrada: libere de novo no Painel quando for a hora.</div>}

      <table className="tabela-org" style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th><span><Icone nome="painel" tamanho={18} /> Ciclo</span></th>
            <th className="num">Exposições</th>
            <th className="num">Expositores na lista</th>
            <th className="num">Avaliações</th>
            <th>Situação</th>
            <th style={{ textAlign: "center" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {ciclos.map((c) => (
            <tr key={c.id}>
              <td className="c-produtor"><div className="nome">{c.nome}</div></td>
              <td className="num c-exposicoes">{c.exposicoes}</td>
              <td className="num c-exposicoes">{c.participantes}</td>
              <td className="num c-exposicoes">{c.avaliacoes}</td>
              <td className="c-situacao">
                <span className={`situacao ${c.ativo ? "concluido" : "pendente"}`} style={c.ativo ? undefined : { background: "#f1f3ef", color: "var(--suave)" }}>
                  <Icone nome={c.ativo ? "checkCirculo" : "proibido"} tamanho={18} />
                  {c.ativo ? "Ativo" : "Guardado"}
                </span>
              </td>
              <td className="c-acoes" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                <Link href={`/admin?ciclo=${c.id}`} className="botao-detalhes" style={{ marginRight: 6 }}>Ver resultados</Link>
                {!c.ativo && (
                  <form action={ativarCiclo} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="botao-detalhes">Tornar ativo</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="bloco" style={{ paddingTop: 6 }}>
        <h2 style={{ marginTop: 10 }}>Novo ciclo</h2>
        <FormCiclo ciclos={ciclos.map((c) => ({ id: c.id, nome: c.nome, exposicoes: c.exposicoes }))} />
      </section>

      <p className="suave">
        O ciclo <strong>ativo</strong> é o que os expositores avaliam. Os outros ficam guardados com as suas avaliações e
        o seu ranking, e podem ser vistos pelo seletor de ciclo no alto das telas.
      </p>
    </>
  );
}
