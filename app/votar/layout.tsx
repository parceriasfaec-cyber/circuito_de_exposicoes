import Icone from "@/components/Icone";
import PaginaPublica from "@/components/PaginaPublica";

export default function LayoutVotar({ children }: { children: React.ReactNode }) {
  return (
    <PaginaPublica>
      <div className="moldura-voto">
        <h1 className="moldura-voto-topo">
          <Icone nome="prancheta" tamanho={34} />
          Avaliação das Exposições
        </h1>
        <div className="moldura-voto-corpo">
          <p className="lema">Sua opinião é importante para fortalecer as exposições agropecuárias do Ceará.</p>
          {children}
        </div>
      </div>
    </PaginaPublica>
  );
}
