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
                        <>Prepare o vídeo e/ou a apresentação para o dia <strong>{diaMes(apresentacao, true)}</strong>.</>
                      ) : (
                        <>Prepare o vídeo ou a apresentação. A organização vai informar a data.</>
                      )}
                    </li>
                    <li>A apresentação é obrigatória (vídeo e/ou PowerPoint), com no máximo <strong>{DURACAO_APRESENTACAO_MIN} minutos</strong>, em ordem alfabética dos municípios. Início às <strong>11h00</strong>: chegue até as <strong>10h30</strong> com o arquivo.</li>
                    <li>Ao final, votam os expositores presentes que participaram da avaliação das etapas do Circuito {ano - 1}. Os <strong>02 municípios mais votados</strong> serão contemplados em {ano}, após assinarem as contrapartidas do Termo de Adesão.</li>
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
                  Os credenciamentos deverão ser realizados até <strong>{diaMes(prazo, true)}</strong>.
                </>
              ) : (
                <>O prazo dos credenciamentos será divulgado pela organização.</>
              )}
            </p>
            <p className="cred-regras-titulo">Regras para apresentação e votação</p>
            <div className="cred-regras">
            <div className="cred-item largo">
              <Icone nome="calendario" tamanho={40} />
              <p>
                <strong className="sem-destaque">Apresentação obrigatória:</strong>{" "}
                {apresentacao ? <>no dia <strong>{diaMes(apresentacao, true)}</strong>, o</> : "na data das apresentações, o"} credenciado deverá
                explicar (por vídeo e/ou PowerPoint/PDF) os motivos pelos quais seu município merece sediar uma etapa do Circuito {ano}.
                Quem não apresentar será <strong className="sem-destaque">eliminado</strong>.
              </p>
            </div>
            <div className="cred-item">
              <IconePlay />
              <p>
                <strong className="sem-destaque">Tempo e ordem:</strong> no máximo <strong>{DURACAO_APRESENTACAO_MIN} min</strong> por credenciado,
                seguindo a ordem alfabética dos municípios.
              </p>
            </div>
            <div className="cred-item">
              <Icone nome="relogio" tamanho={40} />
              <p>
                <strong className="sem-destaque">Horário:</strong> início às <strong>11h00</strong>. Chegue com, no mínimo, 30 minutos de
                antecedência (<strong>10h30</strong>), com o arquivo da apresentação (vídeo e/ou PowerPoint/PDF).
              </p>
            </div>
            <div className="cred-item">
              <Icone nome="trofeu" tamanho={40} />
              <p>
                <strong className="sem-destaque">Votação:</strong> ao final, votam os expositores presentes que participaram da avaliação das
                etapas do Circuito {ano - 1}. Serão contemplados os <strong className="sem-destaque">02 municípios mais votados</strong>.
              </p>
            </div>
            <div className="cred-item">
              <Icone nome="documento" tamanho={40} />
              <p>
                <strong className="sem-destaque">Confirmação:</strong> só após a ciência e assinatura das contrapartidas do Termo de Adesão. Se
                houver descumprimento, o município é desclassificado e são chamados os seguintes na ordem de votação.
              </p>
            </div>
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
