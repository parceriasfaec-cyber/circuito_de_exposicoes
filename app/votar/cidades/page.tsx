import { redirect } from "next/navigation";
import { Aviso } from "@/components/Marca";
import { anoCredenciamento } from "@/lib/credenciamento";
import { lerVotacao, sql } from "@/lib/db";
import { produtorDaSessao } from "@/lib/sessao";
import { sair } from "../actions";
import EscolherCidades from "./EscolherCidades";

export const dynamic = "force-dynamic";

export default async function VotarCidades({ searchParams }: { searchParams: Promise<{ ok?: string; ja?: string }> }) {
  const s = await produtorDaSessao();
  if (!s) redirect("/votar");
  if ((await lerVotacao()).modo !== "cidades") redirect("/votar/exposicoes");
  const params = await searchParams;

  const db = sql();
  const ano = await anoCredenciamento();
  const [produtor] = await db<{ nome: string; municipio: string }[]>`select nome, municipio from produtores where id = ${s.produtorId}`;
  if (!produtor) redirect("/votar");

  const votos = await db<{ municipio: string }[]>`
    select m.nome municipio from votos_cidades v
    join credenciamentos c on c.id = v.credenciamento_id
    join municipios m on m.codigo = c.municipio_codigo
    where v.produtor_id = ${s.produtorId} and v.ano = ${ano}
    order by m.nome`;

  const cidades = votos.length
    ? []
    : await db<{ id: string; municipio: string; instituicao: string }[]>`
        select c.id, m.nome municipio, c.instituicao from credenciamentos c
        join municipios m on m.codigo = c.municipio_codigo
        where c.ano = ${ano} and c.apresentou
        order by m.nome`;

  return (
    <>
      <div className="saudacao">
        <h2>Olá, {produtor.nome.split(" ")[0]}!</h2>
        <div className="suave">{produtor.nome} · {produtor.municipio}</div>
      </div>

      {votos.length > 0 ? (
        <Aviso titulo={params.ok ? "Voto enviado. Obrigado!" : "Você já votou nas cidades."} sucesso>
          <p>Suas escolhas: <strong>{votos.map((v) => v.municipio).join(" e ")}</strong>.</p>
          <p>O resultado será mostrado no telão ao final da votação.</p>
        </Aviso>
      ) : cidades.length < 2 ? (
        <Aviso titulo="Ainda não há cidades para votar.">
          <p>A organização vai liberar as cidades credenciadas em breve.</p>
        </Aviso>
      ) : (
        <>
          <p className="intro" style={{ marginTop: 0 }}>
            Marque <strong>2 cidades</strong> e toque em Enviar. O voto só pode ser feito uma vez.
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
