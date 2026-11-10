import ExcelJS from "exceljs";
import { cicloEscolhido } from "@/lib/ciclo";
import { sql } from "@/lib/db";
import { ehAdmin } from "@/lib/sessao";
import { formatarData, normalizar } from "@/lib/texto";

export const dynamic = "force-dynamic";

type Linha = {
  id: string;
  expositor: string;
  empresa: string | null;
  tipo: string | null;
  documento: string | null;
  municipio: string;
  atividade: string | null;
  exposicao: string | null;
  exposicao_curta: string | null;
  data_inicio: Date | null;
  data_fim: Date | null;
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const comparar = (a: string, b: string) => semAcento(a).localeCompare(semAcento(b), "pt-BR");

function doc(tipo: string | null, d: string | null) {
  if (!d) return "";
  if (tipo === "CPF" && d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (tipo === "CNPJ" && d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return d;
}

function estilizar(ws: ExcelJS.Worksheet, larguras: number[]) {
  ws.columns.forEach((c, i) => (c.width = larguras[i]));
  const cab = ws.getRow(1);
  cab.height = 22;
  cab.eachCell((c) => {
    c.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D5E2C" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.eachCell({ includeEmpty: true }, (c) => {
      c.font = { name: "Arial", size: 10 };
      c.alignment = { vertical: "middle", wrapText: true };
      c.border = { bottom: { style: "thin", color: { argb: "FFD5E3CC" } } };
      if (n % 2 === 0) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF6E8" } };
    });
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

/**
 * Baixa os produtores do ciclo escolhido em Excel: aba por expositor e aba por exposição, em ordem alfabética.
 * Respeita os filtros da tela (busca, exposição e total de exposições).
 */
export async function GET(req: Request) {
  if (!(await ehAdmin())) return new Response("Acesso restrito ao organizador.", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const { ciclo } = await cicloEscolhido(sp.get("ciclo") ?? undefined);
  const cid = ciclo?.id ?? "00000000-0000-0000-0000-000000000000";

  const todasLinhas = await sql()<Linha[]>`
    select p.id, p.nome expositor, p.empresa, p.tipo_documento tipo, p.documento, p.municipio, p.atividade,
           e.nome exposicao, regexp_replace(e.nome, '^Exposição (Agropecuária )?(de|do|da) ', '') exposicao_curta, e.data_inicio, e.data_fim
    from produtores p
    left join participacoes pa on pa.produtor_id = p.id
    left join exposicoes e on e.id = pa.exposicao_id and e.ciclo_id = ${cid}`;

  // Mesmos filtros da tela de Produtores
  const q = normalizar(sp.get("q") ?? "");
  const exp = sp.get("exp") || null;
  const total = /^\d+$/.test(sp.get("total") ?? "") ? Number(sp.get("total")) : null;
  const expsDe = new Map<string, Set<string>>();
  for (const l of todasLinhas) {
    const set = expsDe.get(l.id) ?? new Set<string>();
    if (l.exposicao_curta) set.add(l.exposicao_curta);
    expsDe.set(l.id, set);
  }
  const passa = (l: Linha) => {
    const exps = expsDe.get(l.id)!;
    if (q && !normalizar(`${l.expositor} ${l.empresa ?? ""} ${l.municipio} ${l.documento ?? ""} ${l.atividade ?? ""}`).includes(q)) return false;
    if (exp && !exps.has(exp)) return false;
    if (total !== null && exps.size !== total) return false;
    return true;
  };
  const linhas = todasLinhas.filter(passa);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Circuito Cearense de Exposição";

  // Aba 1: um produtor por linha, com todas as exposições dele
  const porExpositor = wb.addWorksheet("Por expositor");
  porExpositor.addRow(["Expositor", "Empresa", "CPF / CNPJ", "Município", "Atividade", "Qtd. exposições", "Exposições"]);
  const pessoas = new Map<string, { l: Linha; exps: Set<string> }>();
  for (const l of linhas) {
    const k = `${l.expositor}|${l.documento ?? ""}|${l.municipio}`;
    const p = pessoas.get(k) ?? { l, exps: new Set<string>() };
    if (l.exposicao) p.exps.add(l.exposicao);
    pessoas.set(k, p);
  }
  for (const { l, exps } of [...pessoas.values()].sort((a, b) => comparar(a.l.expositor, b.l.expositor))) {
    const lista = [...exps].sort(comparar);
    porExpositor.addRow([l.expositor, l.empresa ?? "", doc(l.tipo, l.documento), l.municipio, l.atividade ?? "", lista.length, lista.join("; ")]);
  }
  estilizar(porExpositor, [42, 32, 22, 18, 22, 10, 70]);

  // Aba 2: exposição em ordem alfabética e, dentro dela, os expositores
  const porExposicao = wb.addWorksheet("Por exposição");
  porExposicao.addRow(["Exposição", "Período", "Expositor", "CPF / CNPJ", "Município"]);
  for (const l of linhas.filter((x) => x.exposicao && (!exp || x.exposicao_curta === exp)).sort((a, b) => comparar(a.exposicao!, b.exposicao!) || comparar(a.expositor, b.expositor))) {
    porExposicao.addRow([
      l.exposicao,
      l.data_inicio && l.data_fim ? `${formatarData(l.data_inicio)} a ${formatarData(l.data_fim)}` : "",
      l.expositor,
      doc(l.tipo, l.documento),
      l.municipio,
    ]);
  }
  estilizar(porExposicao, [32, 25, 42, 22, 18]);

  const arquivo = await wb.xlsx.writeBuffer();
  const base = [ciclo?.nome ?? "circuito", exp ?? "", total !== null ? `${total}-exposicoes` : ""].filter(Boolean).join(" ");
  const nome = `produtores-${normalizar(base).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.xlsx`;
  return new Response(arquivo as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
