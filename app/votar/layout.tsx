import Icone from "@/components/Icone";
import PaginaPublica from "@/components/PaginaPublica";
import { anoCredenciamento } from "@/lib/credenciamento";
import { lerVotacao } from "@/lib/db";

export default async function LayoutVotar({ children }: { children: React.ReactNode }) {
  const { aberta, modo } = await lerVotacao();
  const cidades = aberta && modo === "cidades";
  const ano = await anoCredenciamento();
  return (
    <PaginaPublica>
      <div className="moldura-voto">
        <h1 className="moldura-voto-topo">
          <Icone nome={cidades ? "trofeu" : "prancheta"} tamanho={34} />
          {cidades ? `Votação das Cidades ${ano}` : "Avaliação das Exposições"}
        </h1>
        <div className="moldura-voto-corpo">
          <p className="lema">
            {cidades
              ? `Escolha as 2 cidades que você quer ver sediando exposições no Circuito ${ano}.`
              : "Sua opinião é importante para fortalecer as exposições agropecuárias do Ceará."}
          </p>
          {children}
        </div>
      </div>
    </PaginaPublica>
  );
}
