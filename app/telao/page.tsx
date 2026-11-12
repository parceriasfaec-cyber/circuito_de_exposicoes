import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { FaixaTitulo, LogoCircuito } from "@/components/Marca";
import PaginaPublica from "@/components/PaginaPublica";
import RankingCidades from "@/components/RankingCidades";
import { anoCredenciamento, resultadoCidades } from "@/lib/credenciamento";
import { lerVotacao } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function Telao() {
  if (!(await ehAdmin())) redirect("/admin");
  const votacao = await lerVotacao();
  const ano = await anoCredenciamento();
  const cidades = votacao.cidades_aberta;
  const ambas = votacao.cidades_aberta && votacao.exposicoes_aberta;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  // Um QR Code só para as duas: o início mostra "Avaliar as exposições" e "Votar nas cidades".
  const url = `${proto}://${host}/`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  // Nada aberto: o telão mostra o resultado das cidades, se já houve votos (durante a votação, só o QR Code, para não influenciar).
  const resultado = !votacao.aberta ? await resultadoCidades(ano) : null;

  return (
    <PaginaPublica>
    <div className="telao">
      <LogoCircuito />
      <FaixaTitulo>
        {ambas ? `Avalie as exposições e escolha as 2 novas cidades para ${ano}` : cidades ? `Votação das cidades do Circuito ${ano}` : votacao.aberta ? "Avalie as exposições do Circuito" : `Votação das cidades do Circuito ${ano}`}
      </FaixaTitulo>
      {votacao.aberta ? (
        <>
          {/* Mesmas frases do cartaz do QR Code */}
          <p className="telao-chamada">Participe e ajude a <strong>transformar nossa região!</strong></p>
          <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="telao-passo">
            <strong>Escaneie o QR Code</strong>
            {ambas ? (
              <>, faça sua avaliação dos Circuitos e vote nos <strong>dois municípios</strong> que serão contemplados em {ano}.</>
            ) : cidades ? (
              <> e vote nos <strong>dois municípios</strong> que serão contemplados em {ano}.</>
            ) : (
              <> e faça sua avaliação dos Circuitos.</>
            )}
            <small>Tenha em mãos o seu ID de 5 números.</small>
          </div>
          <p className="telao-frase">Sua opinião é fundamental para construirmos o futuro juntos!</p>
          <div className="telao-link">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
        </>
      ) : resultado && resultado.votantes > 0 ? (
        <div className="telao-resultado">
          <p style={{ fontSize: "1.3rem", margin: "0 0 12px" }}>
            Resultado: {resultado.votantes} {resultado.votantes === 1 ? "expositor votou" : "expositores votaram"}
          </p>
          <RankingCidades ranking={resultado.ranking} vagas={resultado.vagas} porPagina={10} />
        </div>
      ) : (
        <p style={{ fontSize: "1.5rem" }}>A votação está fechada.</p>
      )}
    </div>
    </PaginaPublica>
  );
}
