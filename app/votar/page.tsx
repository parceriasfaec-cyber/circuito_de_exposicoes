import { Aviso } from "@/components/Marca";
import MolduraVoto from "@/components/MolduraVoto";
import { anoCredenciamento } from "@/lib/credenciamento";
import { lerVotacao } from "@/lib/db";
import { produtorDaSessao } from "@/lib/sessao";
import ConteudoCidades from "./cidades/ConteudoCidades";
import Identificacao from "./Identificacao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votação das Cidades · Circuito Cearense de Exposição" };

/** Link direto da votação das cidades. */
export default async function Votar({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const votacao = await lerVotacao();
  const ano = await anoCredenciamento();
  const s = votacao.cidades_aberta ? await produtorDaSessao() : null;
  return (
    <MolduraVoto tipo="cidades">
      {!votacao.cidades_aberta ? (
        <Aviso titulo="A votação das cidades ainda não está liberada.">
          <p>Ela é aberta pela organização no dia das apresentações dos municípios.</p>
          <p>Quando for liberada, leia de novo o QR Code ou atualize esta página.</p>
        </Aviso>
      ) : s ? (
        <ConteudoCidades s={s} ok={ok} />
      ) : (
        <Identificacao destino="votar" ano={ano} />
      )}
    </MolduraVoto>
  );
}
