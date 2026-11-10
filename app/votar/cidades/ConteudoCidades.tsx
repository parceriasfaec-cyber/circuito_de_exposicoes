import { redirect } from "next/navigation";
import { Aviso } from "@/components/Marca";
import { anoCredenciamento } from "@/lib/credenciamento";
import { avaliouAlgumaExposicao, lerVotacao, sql } from "@/lib/db";
import { sair } from "../actions";
import EscolherCidades from "./EscolherCidades";

/** Escolha dos 2 municípios do produtor logado (usada em /votar). */
export default async function ConteudoCidades({ s, ok }: { s: { produtorId: string }; ok?: string }) {
  const votacao = await lerVotacao();
  const podeVotar = votacao.cidades_quem === "todos" || (await avaliouAlgumaExposicao(s.produtorId));
  const params = { ok };

  const db = sql();
  const ano = await anoCredenciamento();
  const [produtor] = await db<{ nome: string; municipio: string }[]>`select nome, municipio from produtores where id = ${s.produtorId}`;
  if (!produtor) redirect("/");

  const votos = await db<{ municipio: string }[]>`
    select m.nome municipio from votos_cidades v
    join credenciamentos c on c.id = v.credenciamento_id
    join municipios m on m.codigo = c.municipio_codigo
    where v.produtor_id = ${s.produtorId} and v.ano = ${ano}
    order by m.nome`;

  const cidades = votos.length || !podeVotar
    ? []
    : await db<{ id: string; municipio: string; instituicao: string }[]>`
        select c.id, m.nome municipio, c.instituicao from credenciamentos c
        join municipios m on m.codigo = c.municipio_codigo
        where c.ano = ${ano} and c.apresentou
        order by m.nome`;

  return (
    <>
      <div className="saudacao-linha">
        <strong>Olá, {produtor.nome.split(" ")[0]}!</strong>
        <span className="suave">{produtor.nome} · {produtor.municipio}</span>
      </div>

      {votos.length > 0 ? (
        <Aviso titulo={params.ok ? "Voto enviado. Obrigado!" : "Você já votou nas cidades."} sucesso>
          <p>Suas escolhas: <strong>{votos.map((v) => v.municipio).join(" e ")}</strong>.</p>
          <p>O resultado será mostrado no telão ao final da votação.</p>
        </Aviso>
      ) : !podeVotar ? (
        <Aviso titulo="A votação das cidades é só para quem avaliou.">
          <p>Só pode escolher as cidades quem fez a avaliação de alguma exposição deste ano. Em caso de dúvida, procure a organização.</p>
        </Aviso>
      ) : cidades.length < 2 ? (
        <Aviso titulo="Ainda não há cidades para votar.">
          <p>A organização vai liberar as cidades credenciadas em breve.</p>
        </Aviso>
      ) : (
        <>
          <p className="intro-mini">
            Selecione <strong>2 municípios</strong>. O voto só pode ser feito uma vez.
          </p>
          <EscolherCidades cidades={cidades} />
        </>
      )}

      <form action={sair} style={{ marginTop: 20 }}>
        <button className="link">Sair</button>
      </form>
    </>
  );
}
