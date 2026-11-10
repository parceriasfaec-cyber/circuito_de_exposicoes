import { Aviso } from "@/components/Marca";
import MolduraVoto from "@/components/MolduraVoto";
import { lerVotacao } from "@/lib/db";
import { produtorDaSessao } from "@/lib/sessao";
import Identificacao from "../votar/Identificacao";
import ConteudoAvaliacao from "../votar/exposicoes/ConteudoAvaliacao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avaliação das Exposições · Circuito Cearense de Exposição" };

/** Link direto da avaliação das exposições. */
export default async function Avaliar({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const votacao = await lerVotacao();
  const s = votacao.exposicoes_aberta ? await produtorDaSessao() : null;
  return (
    <MolduraVoto tipo="avaliacao">
      {!votacao.exposicoes_aberta ? (
        <Aviso titulo="A avaliação ainda não está liberada.">
          <p>Ela é aberta pela organização no encerramento do evento.</p>
          <p>Quando for liberada, leia de novo o QR Code ou atualize esta página.</p>
        </Aviso>
      ) : s ? (
        <ConteudoAvaliacao s={s} ok={ok} cidadesAberta={votacao.cidades_aberta} />
      ) : (
        <Identificacao destino="avaliar" />
      )}
    </MolduraVoto>
  );
}
