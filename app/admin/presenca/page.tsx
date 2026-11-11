import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import { cicloEscolhido } from "@/lib/ciclo";
import { anoCredenciamento } from "@/lib/credenciamento";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import MarcarPresenca, { type Expositor, type FiltroAval } from "./MarcarPresenca";

export const dynamic = "force-dynamic";

/** Presença do dia do evento: o organizador digita o ID do expositor e a presença fica marcada na hora. */
export default async function Presenca({ searchParams }: { searchParams: Promise<{ ciclo?: string; aval?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const { ciclo, ciclos } = await cicloEscolhido(params.ciclo);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";
  const ano = await anoCredenciamento();

  // Expositores do ciclo (participam de alguma exposição dele) e quem já está presente.
  const expositores = await sql()<Expositor[]>`
    select p.id, p.codigo, p.nome, p.empresa, p.municipio,
           pr.marcado_em is not null presente,
           to_char(pr.marcado_em at time zone 'America/Fortaleza', 'HH24:MI') hora,
           pr.marcado_em,
           coalesce(x.total, 0)::int total_exposicoes,
           coalesce(x.avaliadas, 0)::int avaliadas,
           exists (select 1 from votos_cidades v where v.produtor_id = p.id and v.ano = ${ano}) votou_cidades,
           x.exposicoes
    from produtores p
    left join lateral (
      select count(*) total, count(a.produtor_id) avaliadas, string_agg(e.nome, ', ' order by e.data_inicio) exposicoes
      from participacoes pa join exposicoes e on e.id = pa.exposicao_id
      left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
      where pa.produtor_id = p.id and e.ciclo_id = ${cid}
    ) x on true
    left join presencas pr on pr.produtor_id = p.id and pr.ciclo_id = ${cid}
    where pr.produtor_id is not null
       or exists (select 1 from participacoes pa join exposicoes e on e.id = pa.exposicao_id
                  where pa.produtor_id = p.id and e.ciclo_id = ${cid})
    order by p.nome`;

  return (
    <>
      <CabecalhoAdmin
        titulo="Presença e avaliação"
        subtitulo="No dia do evento, ache o expositor na lista (pelo ID, nome ou município) e toque no ícone para marcar a presença. O olho mostra as notas da avaliação e o lápis abre o cadastro."
        ciclos={ciclos}
        ciclo={ciclo}
      />
      {ciclo ? (
        <MarcarPresenca cicloId={cid} expositores={expositores} avalInicial={(["avaliou", "nao"].includes(params.aval ?? "") ? params.aval : "todos") as FiltroAval} />
      ) : (
        <div className="cartao"><p style={{ margin: 0 }}>Cadastre um ciclo primeiro.</p></div>
      )}
    </>
  );
}
