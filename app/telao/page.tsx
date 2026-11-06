import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { FaixaTitulo, LogoCircuito } from "@/components/Marca";
import PaginaPublica from "@/components/PaginaPublica";
import { lerVotacao } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function Telao() {
  if (!(await ehAdmin())) redirect("/admin");
  const votacao = await lerVotacao();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/votar`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <PaginaPublica>
    <div className="telao">
      <LogoCircuito />
      <FaixaTitulo>Avalie as exposições do Circuito</FaixaTitulo>
      {votacao.aberta ? (
        <>
          <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div>
            <div className="suave" style={{ fontSize: "1.3rem" }}>Leia o QR Code com a câmera do celular e digite o código do dia</div>
            <div className="codigo">{votacao.codigo_do_dia}</div>
            <div className="suave">{url}</div>
          </div>
        </>
      ) : (
        <p style={{ fontSize: "1.5rem" }}>A votação está fechada.</p>
      )}
    </div>
    </PaginaPublica>
  );
}
