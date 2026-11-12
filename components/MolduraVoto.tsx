import Icone from "@/components/Icone";
import PaginaPublica from "@/components/PaginaPublica";
import { anoCredenciamento } from "@/lib/credenciamento";

export type TipoVoto = "inicio" | "avaliacao" | "cidades";

/** Moldura das telas do produtor: título e frase mudam conforme a tela (início, avaliação ou votação das cidades). */
export default async function MolduraVoto({ tipo, children }: { tipo: TipoVoto; children: React.ReactNode }) {
  const ano = await anoCredenciamento();
  const topo = {
    inicio: { icone: "prancheta" as const, titulo: "Circuito Cearense de Exposição", lema: (
      <span className="faixa-anuncio">
        <span className="faixa-anuncio-ic"><Icone nome="megafone" tamanho={30} /></span>
        <span>Avalie as exposições e escolha as <strong>duas cidades</strong> para fazerem parte do <strong>circuito de {ano}.</strong></span>
      </span>
    ) },
    avaliacao: { icone: "prancheta" as const, titulo: "Avaliação das Exposições", lema: "Sua opinião é importante para fortalecer as exposições agropecuárias do Ceará." },
    cidades: { icone: "trofeu" as const, titulo: `Votação das Cidades ${ano}`, lema: `Escolha os 2 municípios que vão sediar exposições no Circuito ${ano}.` },
  }[tipo];
  return (
    <PaginaPublica>
      <div className={`moldura-voto tipo-${tipo}`}>
        <h1 className="moldura-voto-topo">
          <Icone nome={topo.icone} tamanho={34} />
          {tipo === "cidades" && <span className="moldura-voto-sep" aria-hidden="true" />}
          {topo.titulo}
        </h1>
        <div className="moldura-voto-corpo">
          <p className="lema">{topo.lema}</p>
          {children}
        </div>
      </div>
    </PaginaPublica>
  );
}
