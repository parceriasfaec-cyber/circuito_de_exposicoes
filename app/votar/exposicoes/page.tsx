import { redirect } from "next/navigation";
import { Aviso } from "@/components/Marca";
import { sql } from "@/lib/db";
import { produtorDaSessao } from "@/lib/sessao";
import { formatarData } from "@/lib/texto";
import { sair } from "../actions";
import Questionario, { type ExposicaoQuestionario } from "./Questionario";

export const dynamic = "force-dynamic";

type Linha = { id: string; nome: string; data_inicio: Date; data_fim: Date; avaliada: boolean };

export default async function MinhasExposicoes({ searchParams }: { searchParams: Promise<{ ok?: string; ja?: string }> }) {
  const s = await produtorDaSessao();
  if (!s) redirect("/votar");
  const params = await searchParams;

  const db = sql();
  const [produtor] = await db<{ nome: string; municipio: string }[]>`select nome, municipio from produtores where id = ${s.produtorId}`;
  if (!produtor) redirect("/votar");

  const lista = await db<Linha[]>`
    select e.id, e.nome, e.data_inicio, e.data_fim, (a.produtor_id is not null) avaliada
    from participacoes pa
    join exposicoes e on e.id = pa.exposicao_id
    join ciclos c on c.id = e.ciclo_id and c.ativo
    left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
    where pa.produtor_id = ${s.produtorId}
    order by e.data_inicio`;

  const pendentes = lista.filter((l) => !l.avaliada);
  let questionarios: ExposicaoQuestionario[] = [];
  if (pendentes.length > 0) {
    const perguntas = await db<{ exposicao_id: string; ordem: number; texto: string }[]>`
      select exposicao_id, ordem, texto from perguntas
      where exposicao_id in ${db(pendentes.map((p) => p.id))}
      order by ordem`;
    questionarios = pendentes.map((p) => ({
      id: p.id,
      nome: p.nome,
      periodo: `${formatarData(p.data_inicio)} a ${formatarData(p.data_fim)}`,
      perguntas: perguntas.filter((q) => q.exposicao_id === p.id).map(({ ordem, texto }) => ({ ordem, texto })),
    }));
  }

  return (
    <>
      <div className="saudacao">
        <h2>Olá, {produtor.nome.split(" ")[0]}!</h2>
        <div className="suave">{produtor.nome} · {produtor.municipio}</div>
      </div>

      {pendentes.length === 0 ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <Aviso titulo={params.ok ? "Avaliação enviada. Obrigado!" : "Você já avaliou todas as exposições."} sucesso>
              <p>Muito obrigado pela sua opinião. Pode fechar esta página.</p>
            </Aviso>
          </div>
          {lista.map((e) => (
            <div key={e.id} className="cartao exposicao">
              <div>
                <strong>{e.nome}</strong>
                <div className="suave">{formatarData(e.data_inicio)} a {formatarData(e.data_fim)}</div>
              </div>
              <span className="selo feito">Avaliada</span>
            </div>
          ))}
        </>
      ) : (
        <>
          <p className="intro" style={{ marginTop: 0 }}>
            Você participou de <strong>{pendentes.length}</strong> {pendentes.length === 1 ? "exposição" : "exposições"}.
            Responda as 10 perguntas de {pendentes.length === 1 ? "cada uma" : "todas"} e envie no final. A avaliação é
            obrigatória e só pode ser feita uma vez.
          </p>
          <Questionario exposicoes={questionarios} />
        </>
      )}

      <form action={sair} style={{ marginTop: 20 }}>
        <button className="link">Sair</button>
      </form>
    </>
  );
}
