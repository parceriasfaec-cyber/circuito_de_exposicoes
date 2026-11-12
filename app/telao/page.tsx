import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import Icone from "@/components/Icone";
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
      {votacao.aberta ? (
        <>
          {/* Mesmo visual e frases do cartaz do QR Code */}
          <p className="faixa-anuncio telao-anuncio">
            <span className="faixa-anuncio-ic"><Icone nome="megafone" tamanho={34} /></span>
            <span>Avalie as exposições e escolha as <strong>duas cidades</strong> para fazerem parte do <strong>circuito de {ano}.</strong></span>
          </p>
          <div className="qr-area">
            <span className="qr-raios esq" aria-hidden="true" />
            <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
            <span className="qr-raios dir" aria-hidden="true" />
          </div>
          <div className="telao-passo">
            <span className="faixa-anuncio-ic"><Icone nome="celular" tamanho={30} /></span>
            <span><strong>Escaneie o QR Code</strong>, acesse o sistema e informe seu <span className="chip-id">ID de 5 números</span> para registrar sua avaliação.</span>
          </div>
          <p className="telao-frase">Sua opinião é muito importante!</p>
        </>
      ) : (
        <>
          <FaixaTitulo>{`Votação das cidades do Circuito ${ano}`}</FaixaTitulo>
          {resultado && resultado.votantes > 0 ? (
            <div className="telao-resultado">
              <p style={{ fontSize: "1.3rem", margin: "0 0 12px" }}>
                Resultado: {resultado.votantes} {resultado.votantes === 1 ? "expositor votou" : "expositores votaram"}
              </p>
              <RankingCidades ranking={resultado.ranking} vagas={resultado.vagas} porPagina={10} />
            </div>
          ) : (
            <p style={{ fontSize: "1.5rem" }}>A votação está fechada.</p>
          )}
        </>
      )}
    </div>
    </PaginaPublica>
  );
}
