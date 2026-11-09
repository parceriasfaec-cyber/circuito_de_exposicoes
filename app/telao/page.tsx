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
  const cidades = votacao.modo === "cidades";

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/votar`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  // Votação das cidades encerrada: o telão mostra o resultado (durante a votação, só o QR Code, para não influenciar).
  const resultado = cidades && !votacao.aberta ? await resultadoCidades(ano) : null;

  return (
    <PaginaPublica>
    <div className="telao">
      <LogoCircuito />
      <FaixaTitulo>{cidades ? `Votação das cidades do Circuito ${ano}` : "Avalie as exposições do Circuito"}</FaixaTitulo>
      {votacao.aberta ? (
        <>
          <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div>
            <div className="suave" style={{ fontSize: "1.3rem" }}>
              Leia o QR Code com a câmera do celular, digite o código do dia{cidades ? " e escolha 2 cidades" : ""}
            </div>
            <div className="codigo">{votacao.codigo_do_dia}</div>
            <div className="suave">{url}</div>
          </div>
        </>
      ) : resultado && resultado.votantes > 0 ? (
        <div className="telao-resultado">
          <p style={{ fontSize: "1.3rem", margin: "0 0 12px" }}>
            Resultado: {resultado.votantes} {resultado.votantes === 1 ? "produtor votou" : "produtores votaram"}
          </p>
          <RankingCidades ranking={resultado.ranking} vagas={resultado.vagas} />
        </div>
      ) : (
        <p style={{ fontSize: "1.5rem" }}>A votação está fechada.</p>
      )}
    </div>
    </PaginaPublica>
  );
}
