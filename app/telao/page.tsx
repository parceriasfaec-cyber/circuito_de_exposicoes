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
          <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div>
            <div className="suave" style={{ fontSize: "1.3rem" }}>
              Leia o QR Code com a câmera do celular e digite o código do dia{ambas ? "" : cidades ? " para escolher 2 cidades" : " para avaliar"}
            </div>
            <div className="codigo">{votacao.codigo_do_dia}</div>
            <div className="suave">{url.replace(/\/$/, "")}</div>
          </div>
        </>
      ) : resultado && resultado.votantes > 0 ? (
        <div className="telao-resultado">
          <p style={{ fontSize: "1.3rem", margin: "0 0 12px" }}>
            Resultado: {resultado.votantes} {resultado.votantes === 1 ? "produtor votou" : "produtores votaram"}
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
