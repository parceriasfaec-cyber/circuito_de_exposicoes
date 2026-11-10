/** Tira acentos e deixa minúsculo, para comparar nomes. */
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function soDigitos(s: string) {
  return s.replace(/\D/g, "");
}

export function cpfValido(cpf: string) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    return ((s * 10) % 11) % 10;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

export function cnpjValido(cnpj: string) {
  const d = soDigitos(cnpj);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0);
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Documento com só os 2 últimos dígitos à mostra: CPF: •••.•••.•••-71 */
/** Documento completo, com pontuação (só nas telas do organizador). */
export function documentoCompleto(tipo: string | null, doc: string | null) {
  if (!tipo || !doc) return "Sem documento";
  const d = doc.replace(/\D/g, "");
  if (tipo === "CPF" && d.length === 11) return `CPF: ${d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}`;
  if (tipo === "CNPJ" && d.length === 14) return `CNPJ: ${d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}`;
  return `${tipo}: ${doc}`;
}

export function mascararDocumento(tipo: string | null, doc: string | null) {
  if (!tipo || !doc) return "sem documento";
  const fim = doc.slice(-2);
  if (tipo === "CPF") return `CPF: •••.•••.•••-${fim}`;
  if (tipo === "CNPJ") return `CNPJ: ••.•••.•••/••••-${fim}`;
  return `Doc.: ${"•".repeat(Math.max(doc.length - 2, 3))}${fim}`;
}

/** Datas do banco (tipo date) chegam como meia-noite UTC; formatar em UTC evita mostrar o dia anterior. */
export function formatarData(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d.slice(0, 10) + "T00:00:00Z") : d;
  return dt.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const MINUSCULAS = new Set(["a", "as", "o", "os", "e", "de", "da", "das", "do", "dos", "em", "na", "nas", "no", "nos", "para", "por", "com"]);

/**
 * Primeira letra de cada palavra em maiúscula e as demais em minúscula, deixando em minúscula
 * as ligações (de, da, do, e...): "PREFEITURA municipal DE aiuaba" -> "Prefeitura Municipal de Aiuaba".
 * Siglas curtas já todas em maiúscula (ex.: SDA, CE) são mantidas.
 */
export function maiusculaInicial(s: string) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((palavra, i) => {
      if (!palavra) return palavra;
      const min = palavra.toLocaleLowerCase("pt-BR");
      if (i > 0 && MINUSCULAS.has(min)) return min;
      const letras = palavra.replace(/[^\p{L}]/gu, "");
      if (letras.length >= 2 && letras.length <= 4 && letras === letras.toUpperCase() && /\p{Lu}/u.test(letras) && i > 0) return palavra;
      return min.replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase("pt-BR"));
    })
    .join(" ");
}

/** Nome curto da exposição para abas, ranking e listas: "Exposição de Crateús" -> "Crateús". */
export function nomeCurto(nome: string) {
  return nome.replace(/^Exposição Agropecuária (de|do|da) /i, "").replace(/^Exposição (de|do|da) /i, "");
}

const LIGACOES = new Set(["de", "da", "do", "das", "dos", "e", "di", "du"]);

/** "EDUARDO MELO DE BARROSO" -> "Eduardo Melo de Barroso" (primeira letra de cada nome maiúscula). */
export function nomeProprio(nome: string) {
  return nome
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((p, i) => (i > 0 && LIGACOES.has(p) ? p : p.replace(/(^|[-'/])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase("pt-BR"))))
    .join(" ");
}
