import Link from "next/link";
import { redirect } from "next/navigation";
import Icone from "@/components/Icone";
import { Aviso } from "@/components/Marca";
import MolduraVoto from "@/components/MolduraVoto";
import { anoCredenciamento } from "@/lib/credenciamento";
import { lerVotacao } from "@/lib/db";
import { produtorDaSessao } from "@/lib/sessao";
import { sair } from "./votar/actions";
import Identificacao from "./votar/Identificacao";

export const dynamic = "force-dynamic";

/**
 * Endereço do QR Code (um só para as duas). O produtor entra uma vez e escolhe: avaliar as exposições
 * ou votar nas cidades. Se só uma estiver aberta, vai direto para ela.
 */
export default async function Inicio() {
  const votacao = await lerVotacao();
  const s = votacao.aberta ? await produtorDaSessao() : null;
  if (s && votacao.exposicoes_aberta && !votacao.cidades_aberta) redirect("/avaliar");
  if (s && votacao.cidades_aberta && !votacao.exposicoes_aberta) redirect("/votar");
  const ano = await anoCredenciamento();

  return (
    <MolduraVoto tipo="inicio">
      {!votacao.aberta ? (
        <Aviso titulo="Nenhuma votação está liberada agora.">
          <p>A organização libera a avaliação das exposições e a votação das cidades nos momentos certos.</p>
          <p>Quando for liberada, leia de novo o QR Code ou atualize esta página.</p>
        </Aviso>
      ) : s ? (
        <>
          <p className="intro" style={{ marginTop: 0 }}>O que você quer fazer agora?</p>
          <div className="escolha-voto">
            <Link href="/avaliar" className="escolha-voto-opcao">
              <Icone nome="prancheta" tamanho={36} />
              <strong>Avaliar as exposições</strong>
              <small>Responda as perguntas das exposições de que você participou.</small>
            </Link>
            <Link href="/votar" className="escolha-voto-opcao">
              <Icone nome="trofeu" tamanho={36} />
              <strong>Votar nas cidades</strong>
              <small>Escolha os 2 municípios para o Circuito {ano}.</small>
            </Link>
          </div>
          <form action={sair} style={{ marginTop: 20 }}>
            <button className="link">Sair</button>
          </form>
        </>
      ) : (
        <Identificacao destino="inicio" />
      )}
    </MolduraVoto>
  );
}
