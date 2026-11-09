import { Kaushan_Script } from "next/font/google";
import Icone from "@/components/Icone";
import { Aviso } from "@/components/Marca";
import PaginaPublica from "@/components/PaginaPublica";
import { ANO_CREDENCIAMENTO, diaMes, lerPrazo, municipiosDisponiveis } from "@/lib/credenciamento";
import FormCredenciamento from "./FormCredenciamento";

export const dynamic = "force-dynamic";
export const metadata = { title: `Credenciamento ${ANO_CREDENCIAMENTO} · Circuito Cearense de Exposição` };

const manuscrita = Kaushan_Script({ subsets: ["latin"], weight: "400" });

/** Regras mostradas no quadro "Fique atento!" */
const DIAS_PARA_APRESENTACAO = 5;
const DURACAO_APRESENTACAO_MIN = 30;

export default async function Credenciamento({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const { prazo, aberto } = await lerPrazo();
  const municipios = ok || !aberto ? [] : await municipiosDisponiveis();

  return (
    <PaginaPublica>
      <div className="moldura-voto larga">
        <h1 className="moldura-voto-topo">
          <Icone nome="calendario" tamanho={34} />
          Credenciamento {ANO_CREDENCIAMENTO}
        </h1>
        <div className="moldura-voto-corpo cred-grade">
          <div className="cred-principal">
            <p className="lema">Cadastre o seu município para sediar uma etapa do Circuito Cearense de Exposição {ANO_CREDENCIAMENTO}.</p>
            {ok ? (
              <Aviso titulo="Credenciamento enviado. Obrigado!" sucesso>
                <p>
                  O município de <strong>{ok}</strong> foi cadastrado para o Circuito {ANO_CREDENCIAMENTO}. Fique atento ao prazo
                  para enviar o vídeo e/ou a apresentação.
                </p>
              </Aviso>
            ) : !aberto ? (
              <Aviso titulo="O credenciamento está encerrado.">
                <p>O prazo terminou em {diaMes(prazo!, true)}. Em caso de dúvida, procure a organização do Circuito.</p>
              </Aviso>
            ) : municipios.length === 0 ? (
              <Aviso titulo="Não há municípios disponíveis.">
                <p>Todos os municípios já foram credenciados. Procure a organização.</p>
              </Aviso>
            ) : (
              <FormCredenciamento municipios={municipios} ano={ANO_CREDENCIAMENTO} />
            )}
          </div>

          <aside className="cred-atencao" aria-label="Fique atento">
            <div className="cred-atencao-topo">
              <IconeMegafone />
              <strong>Fique atento!</strong>
            </div>
            <p className="cred-prazo">
              {prazo ? (
                <>
                  Os credenciamentos deverão ser realizados até <strong>{diaMes(prazo)}</strong>.
                </>
              ) : (
                <>O prazo dos credenciamentos será divulgado pela organização.</>
              )}
            </p>
            <div className="cred-item">
              <Icone nome="calendario" tamanho={40} />
              <p>
                Em até <strong>{String(DIAS_PARA_APRESENTACAO).padStart(2, "0")} dias</strong> após o credenciamento, deverá ser
                apresentado um vídeo e/ou apresentação da localidade e dos municípios que deseja que a exposição seja em sua cidade.
              </p>
            </div>
            <div className="cred-item grande">
              <IconePlay />
              <p>
                As apresentações deverão ter uma duração de <strong>{DURACAO_APRESENTACAO_MIN} min.</strong>
              </p>
            </div>
            <p className={`cred-assinatura ${manuscrita.className}`}>Contamos com a sua participação!</p>
          </aside>
        </div>
      </div>
    </PaginaPublica>
  );
}

function IconeMegafone() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 26v12h8l22 12V14L16 26z" />
      <path d="M16 38l4 16h7l-3-14" />
      <path d="M46 24c3 2 3 14 0 16" />
      <path d="M52 14l4-4M54 32h6M52 50l4 4" />
    </svg>
  );
}

function IconePlay() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="8" width="40" height="32" rx="12" />
      <path d="M20 17v14l11-7z" />
    </svg>
  );
}
