import { Kaushan_Script } from "next/font/google";
import Icone from "@/components/Icone";
import { Aviso } from "@/components/Marca";
import PaginaPublica from "@/components/PaginaPublica";
import { anoCredenciamento, diaMes, lerPrazo, municipiosDisponiveis } from "@/lib/credenciamento";
import FormCredenciamento from "./FormCredenciamento";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: `Credenciamento ${await anoCredenciamento()} · Circuito Cearense de Exposição` };
}

const manuscrita = Kaushan_Script({ subsets: ["latin"], weight: "400" });

/** Regra mostrada no quadro "Fique atento!" */
const DURACAO_APRESENTACAO_MIN = 5;

export default async function Credenciamento({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const ano = await anoCredenciamento();
  const { prazo, aberto, apresentacao } = await lerPrazo(ano);
  const municipios = ok || !aberto ? [] : await municipiosDisponiveis(ano);

  return (
    <PaginaPublica>
      <div className="moldura-voto larga">
        <h1 className="moldura-voto-topo">
          <Icone nome="calendario" tamanho={34} />
          Credenciamento {ano}
        </h1>
        <div className="moldura-voto-corpo cred-grade">
          <div className="cred-principal">
            <p className="lema">Cadastre o seu município para sediar uma etapa do Circuito Cearense de Exposição {ano}.</p>
            {ok ? (
              <div className="cred-sucesso" role="status">
                <span className="cred-sucesso-check" aria-hidden="true">✓</span>
                <h2>Credenciamento enviado!</h2>
                <p className="cred-sucesso-texto">
                  O município de <strong>{ok}</strong> está credenciado para o Circuito Cearense de Exposição {ano}.
                </p>
                <div className="cred-passos">
                  <h3>Próximos passos</h3>
                  <ol>
                    <li>
                      {apresentacao ? (
                        <>Prepare o vídeo ou a apresentação para o dia <strong>{diaMes(apresentacao, true)}</strong>.</>
                      ) : (
                        <>Prepare o vídeo ou a apresentação. A organização vai informar a data.</>
                      )}
                    </li>
                    <li>Destaque os motivos pelos quais a sua cidade merece sediar a exposição, em no máximo <strong>{DURACAO_APRESENTACAO_MIN} minutos</strong>.</li>
                    <li>Ao final das apresentações, as cidades serão avaliadas e votadas pelos presentes que participaram de pelo menos 1 etapa do Circuito {ano - 1}. As duas mais votadas receberão as exposições em {ano}.</li>
                  </ol>
                </div>
                <p className="suave" style={{ margin: "14px 0 0" }}>Cada pessoa só pode credenciar um município. Em caso de dúvida, procure a organização do Circuito.</p>
              </div>
            ) : !aberto ? (
              <Aviso titulo="O credenciamento está encerrado.">
                <p>O prazo terminou em {diaMes(prazo!, true)}. Em caso de dúvida, procure a organização do Circuito.</p>
              </Aviso>
            ) : municipios.length === 0 ? (
              <Aviso titulo="Não há municípios disponíveis.">
                <p>Todos os municípios já foram credenciados. Procure a organização.</p>
              </Aviso>
            ) : (
              <FormCredenciamento municipios={municipios} ano={ano} />
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
                {apresentacao ? <>No dia <strong>{diaMes(apresentacao)}</strong>, o</> : "Na data das apresentações, o"} credenciado
                deverá apresentar um vídeo ou uma breve apresentação destacando os motivos pelos quais sua cidade merece sediar a
                exposição.
              </p>
            </div>
            <div className="cred-item">
              <Icone nome="trofeu" tamanho={40} />
              <p>
                Ao final das apresentações, as cidades serão <strong className="sem-destaque">avaliadas e votadas</strong> pelos presentes que
                participaram de pelo menos 1 etapa do Circuito {ano - 1}. As{" "}
                <strong className="sem-destaque">duas mais votadas</strong> receberão as exposições em {ano}.
              </p>
            </div>
            <div className="cred-item grande">
              <IconePlay />
              <p>
                As apresentações deverão ter uma duração de, no máximo, <strong>{DURACAO_APRESENTACAO_MIN} min.</strong>
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
