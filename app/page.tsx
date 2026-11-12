import Link from "next/link";
import { redirect } from "next/navigation";
import Icone from "@/components/Icone";
import { Aviso } from "@/components/Marca";
import MolduraVoto from "@/components/MolduraVoto";
import { anoCredenciamento } from "@/lib/credenciamento";
import { lerVotacao, motivoSemVotoCidades, sql } from "@/lib/db";
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
  const ano = await anoCredenciamento();

  // O que ainda falta para este produtor: só mostra o que ele ainda pode fazer.
  let faltaAvaliar = false;
  let faltaVotar = false;
  if (s) {
    const db = sql();
    if (votacao.exposicoes_aberta) {
      const [{ n }] = await db<{ n: number }[]>`
        select count(*)::int n from participacoes pa
        join exposicoes e on e.id = pa.exposicao_id
        join ciclos c on c.id = e.ciclo_id and c.ativo
        left join avaliacoes a on a.produtor_id = pa.produtor_id and a.exposicao_id = pa.exposicao_id
        where pa.produtor_id = ${s.produtorId} and a.produtor_id is null`;
      faltaAvaliar = n > 0; // sem presença (quando exigida), a tela de avaliação mostra o aviso
    }
    if (votacao.cidades_aberta) {
      const [{ n }] = await db<{ n: number }[]>`select count(*)::int n from votos_cidades where produtor_id = ${s.produtorId} and ano = ${ano}`;
      faltaVotar = n === 0 && !(await motivoSemVotoCidades(s.produtorId, votacao));
    }
    if (faltaAvaliar && !faltaVotar) redirect("/avaliar");
    if (faltaVotar && !faltaAvaliar) redirect("/votar");
  }

  return (
    <MolduraVoto tipo="inicio">
      {!votacao.aberta ? (
        <Aviso titulo="Nenhuma votação está liberada agora.">
          <p>A organização libera a avaliação das exposições e a votação das cidades nos momentos certos.</p>
          <p>Quando for liberada, leia de novo o QR Code ou atualize esta página.</p>
        </Aviso>
      ) : s && !faltaAvaliar && !faltaVotar ? (
        <>
          {votacao.cidades_aberta ? (
            <Aviso titulo="Está tudo feito. Obrigado!" sucesso>
              <p>
                {votacao.exposicoes_aberta
                  ? "Você já avaliou as exposições e já votou nas cidades."
                  : "Você já votou nas cidades (ou a votação das cidades não é para você)."}
              </p>
              <p>Pode fechar esta página.</p>
            </Aviso>
          ) : (
            // Avaliou tudo, mas a votação das cidades ainda não foi liberada: avisa que ainda vai poder votar.
            <Aviso titulo="Avaliação concluída. Obrigado!" sucesso>
              <p>Agora falta escolher as 2 novas cidades para {ano}, mas essa votação ainda não foi liberada.</p>
              <p>Assim que for liberada, leia o QR Code de novo ou atualize esta página para votar.</p>
            </Aviso>
          )}
          <form action={sair} style={{ marginTop: 20 }}>
            <button className="link">Sair</button>
          </form>
        </>
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
        <Identificacao destino="inicio" ano={ano} />
      )}
    </MolduraVoto>
  );
}
