import Icone from "@/components/Icone";
import { Aviso } from "@/components/Marca";
import PaginaPublica from "@/components/PaginaPublica";
import { ANO_CREDENCIAMENTO, municipiosDisponiveis } from "@/lib/credenciamento";
import FormCredenciamento from "./FormCredenciamento";

export const dynamic = "force-dynamic";
export const metadata = { title: `Credenciamento ${ANO_CREDENCIAMENTO} · Circuito Cearense de Exposição` };

export default async function Credenciamento({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const municipios = ok ? [] : await municipiosDisponiveis();

  return (
    <PaginaPublica>
      <div className="moldura-voto">
        <h1 className="moldura-voto-topo">
          <Icone nome="calendario" tamanho={34} />
          Credenciamento {ANO_CREDENCIAMENTO}
        </h1>
        <div className="moldura-voto-corpo">
          <p className="lema">Cadastre o seu município para sediar uma etapa do Circuito Cearense de Exposição {ANO_CREDENCIAMENTO}.</p>
          {ok ? (
            <Aviso titulo="Credenciamento enviado. Obrigado!" sucesso>
              <p>
                O município de <strong>{ok}</strong> foi cadastrado para o Circuito {ANO_CREDENCIAMENTO}. A organização vai entrar
                em contato pelo e-mail informado.
              </p>
            </Aviso>
          ) : municipios.length === 0 ? (
            <Aviso titulo="Não há municípios disponíveis.">
              <p>Todos os municípios já foram credenciados. Procure a organização.</p>
            </Aviso>
          ) : (
            <FormCredenciamento municipios={municipios} ano={ANO_CREDENCIAMENTO} />
          )}
        </div>
      </div>
    </PaginaPublica>
  );
}
