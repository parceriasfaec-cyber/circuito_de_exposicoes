import { redirect } from "next/navigation";
import { Aviso } from "@/components/Marca";
import { lerVotacao } from "@/lib/db";
import { produtorDaSessao } from "@/lib/sessao";
import Identificacao from "./Identificacao";

export const dynamic = "force-dynamic";

export default async function Votar() {
  const votacao = await lerVotacao();
  if (votacao.aberta && (await produtorDaSessao())) redirect(votacao.modo === "cidades" ? "/votar/cidades" : "/votar/exposicoes");

  if (!votacao.aberta) {
    return (
      <Aviso titulo="A votação ainda não está liberada.">
        <p>Ela é aberta pela organização no encerramento do evento.</p>
        <p>Quando for liberada, leia de novo o QR Code ou atualize esta página.</p>
      </Aviso>
    );
  }

  return (
    <>
      <Identificacao />
    </>
  );
}
