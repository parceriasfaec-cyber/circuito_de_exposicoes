import Icone from "@/components/Icone";
import { nomeCurto } from "@/lib/texto";

export type Progresso = { nome: string; foto: string | null; na_lista: number; responderam: number };
const curto = nomeCurto;

/**
 * Total de produtores do ciclo e, para cada exposição, a barra do total de participantes
 * com a parte de quem já fez a avaliação (o tamanho da barra acompanha o número de participantes).
 */
/** `linha`: altura de cada exposição no gráfico (maior = barras mais espaçadas, usado no telão). */
/** `largura`: largura do desenho (menor = letras e barras maiores num quadro estreito). */
/** `presentes`: expositores com a presença marcada no evento (sem valor, o quadro não aparece). */
export default function Participacao({ progresso, produtores, completos, presentes, linha = 34, largura = 560 }: { progresso: Progresso[]; produtores: number; completos: number; presentes?: number; linha?: number; largura?: number }) {
  const lista = [...progresso].sort((a, b) => b.na_lista - a.na_lista || a.nome.localeCompare(b.nome));
  const maior = Math.max(1, ...lista.map((p) => p.na_lista));
  return (
    <div className="part">
      <div className={`part-topo${presentes !== undefined ? " tres" : ""}`}>
        <div>
          <span className="part-topo-icone"><Icone nome="usuarios" tamanho={30} /></span>
          <span><strong>{produtores}</strong><small>{presentes !== undefined ? "Participantes" : "Total de Participantes"}</small></span>
        </div>
        {presentes !== undefined && (
          <div>
            <span className="part-topo-icone"><Icone nome="escudo" tamanho={28} /></span>
            <span><strong>{presentes}</strong><small>Presentes</small></span>
          </div>
        )}
        <div>
          <span className="part-topo-icone redondo"><Icone nome="check" tamanho={22} /></span>
          <span><strong>{completos}</strong><small>{presentes !== undefined ? "Avaliaram tudo" : "já avaliaram tudo"}</small></span>
        </div>
      </div>
      <ul className="part-legenda">
        <li><span className="ponto part-cor-total" /> Participantes</li>
        <li><span className="ponto part-cor-aval" /> Avaliaram</li>
      </ul>
      {lista.length === 0 ? (
        <p className="suave" style={{ margin: 0 }}>Nenhuma exposição neste ciclo.</p>
      ) : (
        <GraficoParticipacao lista={lista} linha={linha} largura={largura} />
      )}
    </div>
  );
}

/**
 * Barras deitadas por exposição: em cima o total de participantes (verde claro), embaixo quantos avaliaram
 * (verde escuro). O nome fica inteiro à esquerda.
 */
function GraficoParticipacao({ lista, linha, largura }: { lista: Progresso[]; linha: number; largura: number }) {
  const m = { e: 168, d: 36, t: 6, b: 30 };
  const L = largura;
  const A = m.t + m.b + linha * lista.length;
  const max = Math.max(1, ...lista.map((p) => p.na_lista));
  const passo = max <= 10 ? 2 : max <= 50 ? 10 : max <= 100 ? 20 : 50;
  const teto = Math.ceil(max / passo) * passo;
  const x = (v: number) => m.e + (v / teto) * (L - m.e - m.d);
  const marcas = Array.from({ length: teto / passo + 1 }, (_, k) => k * passo);
  const base = A - m.b;
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="part-grafico" role="img" aria-label="Participantes e avaliações por exposição">
      {marcas.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={m.t} y2={base} stroke="#eef2ec" />
          <line x1={x(v)} x2={x(v)} y1={base} y2={base + 5} stroke="#5b6b5b" />
          <text x={x(v)} y={base + 20} textAnchor="middle" className="eixo">{v}</text>
        </g>
      ))}
      {lista.map((p, k) => {
        const y0 = m.t + k * linha + 6;
        const pct = p.na_lista ? Math.round((p.responderam / p.na_lista) * 100) : 0;
        const nome = curto(p.nome);
        return (
          <g key={p.nome}>
            <title>{`${p.nome}: ${p.na_lista} participantes, ${p.responderam} avaliaram (${pct}%)`}</title>
            <text x={m.e - 12} y={y0 + 14} textAnchor="end" className="eixo nome">{nome.length > 24 ? `${nome.slice(0, 23)}…` : nome}</text>
            <rect x={m.e} y={y0} width={Math.max(3, x(p.na_lista) - m.e)} height="10" rx="5" fill="#a9cf94" />
            <text x={x(p.na_lista) + 6} y={y0 + 9} className="valor">{p.na_lista}</text>
            <rect x={m.e} y={y0 + 12} width={Math.max(3, x(p.responderam) - m.e)} height="10" rx="5" fill="#1d5e2c" />
            <text x={x(p.responderam) + 6} y={y0 + 21} className="valor escuro">{p.responderam}</text>
          </g>
        );
      })}
      <line x1={m.e} x2={m.e} y1={m.t} y2={base} stroke="#5b6b5b" strokeWidth="1.5" />
      <line x1={m.e} x2={L - m.d} y1={base} y2={base} stroke="#5b6b5b" strokeWidth="1.5" />
    </svg>
  );
}
