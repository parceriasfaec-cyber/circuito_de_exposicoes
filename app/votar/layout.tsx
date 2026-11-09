import Icone from "@/components/Icone";
import PaginaPublica from "@/components/PaginaPublica";
import { ANO_CREDENCIAMENTO } from "@/lib/credenciamento";
import { lerVotacao } from "@/lib/db";

export default async function LayoutVotar({ children }: { children: React.ReactNode }) {
  const { aberta, modo } = await lerVotacao();
  const cidades = aberta && modo === "cidades";
  return (
    <PaginaPublica>
      <div className="moldura-voto">
        <h1 className="moldura-voto-topo">
          <Icone nome={cidades ? "trofeu" : "prancheta"} tamanho={34} />
          {cidades ? `Votação das Cidades ${ANO_CREDENCIAMENTO}` : "Avaliação das Exposições"}
        </h1>
        <div className="moldura-voto-corpo">
          <p className="lema">
            {cidades
              ? `Escolha as 2 cidades que você quer ver sediando exposições no Circuito ${ANO_CREDENCIAMENTO}.`
              : "Sua opinião é importante para fortalecer as exposições agropecuárias do Ceará."}
          </p>
          {children}
        </div>
      </div>
    </PaginaPublica>
  );
}
