import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso } from "@/components/Marca";
import { anoCredenciamento } from "@/lib/credenciamento";
import { AVISO_SO_PRESENTES, lerVotacao, motivoSemVotoCidades, podeAvaliarPorPresenca, sql } from "@/lib/db";
import { formatarData } from "@/lib/texto";
import { sair } from "../actions";
import Questionario, { type ExposicaoQuestionario } from "./Questionario";

type Linha = { id: string; nome: string; data_inicio: Date; data_fim: Date; avaliada: boolean };

/** Avaliação das exposições do produtor logado (usada em /avaliar). */
export default async function ConteudoAvaliacao({ s, ok, cidadesAberta }: { s: { produtorId: string }; ok?: string; cidadesAberta: boolean }) {
  const params = { ok };

  const db = sql();
  const [produtor] = await db<{ nome: string; municipio: string }[]>`select nome, municipio from produtores where id = ${s.produtorId}`;
  if (!produtor) redirect("/");

  // Votação das cidades liberada: mostra o cartão para votar (ou "já votou") embaixo da avaliação.
  const ano = await anoCredenciamento();
  const votacao = cidadesAberta ? await lerVotacao() : null;
  const [jaVotou] = cidadesAberta ? await db<{ n: number }[]>`select count(*)::int n from votos_cidades where produtor_id = ${s.produtorId} and ano = ${ano}` : [{ n: 0 }];
  const podeVotarCidades = !!votacao && !(await motivoSemVotoCidades(s.produtorId, votacao));

  // Avaliação só para presentes (opção em Prazo e horário): quem não teve a presença marcada não vê o questionário.
  if (!(await podeAvaliarPorPresenca(s.produtorId, await lerVotacao()))) {
    return (
      <>
        <div className="saudacao">
          <h2>Olá, {produtor.nome.split(" ")[0]}!</h2>
          <div className="suave">{produtor.nome} · {produtor.municipio}</div>
        </div>
        <Aviso titulo="Avaliação só para quem está presente">
          <p>{AVISO_SO_PRESENTES}</p>
        </Aviso>
        <form action={sair} style={{ marginTop: 20 }}>
          <button className="link">Sair</button>
        </form>
      </>
    );
  }

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
              <p>Muito obrigado pela sua opinião.{cidadesAberta ? "" : " Pode fechar esta página."}</p>
            </Aviso>
            {cidadesAberta && podeVotarCidades && (
              <div className={`cartao-cidades${jaVotou.n > 0 ? " feito" : ""}`}>
                <span className="cartao-cidades-icone" aria-hidden="true">🏆</span>
                <div className="cartao-cidades-texto">
                  <strong>Votação das Cidades {ano}</strong>
                  <span>{jaVotou.n > 0 ? "Você já votou nas cidades. Obrigado!" : "Está liberada! Escolha os 2 municípios que você quer ver sediando exposições."}</span>
                </div>
                {jaVotou.n === 0 && (
                  <Link href="/votar" className="botao">Escolher os 2 municípios →</Link>
                )}
              </div>
            )}
          </div>
          <ul className="lista-avaliadas" aria-label="Exposições avaliadas">
            {lista.map((e) => (
              <li key={e.id}>
                <span className="lista-avaliadas-check" aria-hidden="true">✓</span>
                <strong>{e.nome}</strong>
                <span className="lista-avaliadas-data">{formatarData(e.data_inicio)} a {formatarData(e.data_fim)}</span>
              </li>
            ))}
          </ul>
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
