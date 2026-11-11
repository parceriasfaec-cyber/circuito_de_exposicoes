import { cpfValido, maiusculaInicial, soDigitos } from "./texto";

export type DadosCredenciamento = {
  codigo: number;
  responsavel: string;
  cpf: string | null;
  email: string;
  telefone: string;
  funcao: string;
  instituicao: string;
  p1i: string;
  p1f: string;
  p2i: string;
  p2f: string;
};

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim().replace(/\s+/g, " ");
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lê e confere os campos do credenciamento (formulário público e edição no painel usam as mesmas regras).
 * Nomes com a primeira letra de cada palavra em maiúscula; e-mail em minúscula; CPF e telefone só com números.
 */
export function lerDadosCredenciamento(form: FormData, ano: number): { erro: string } | { dados: DadosCredenciamento } {
  const d: DadosCredenciamento = {
    codigo: Number(texto(form, "municipio")),
    responsavel: maiusculaInicial(texto(form, "responsavel")),
    cpf: soDigitos(texto(form, "cpf")) || null, // opcional por enquanto
    email: texto(form, "email").toLowerCase(),
    telefone: soDigitos(texto(form, "telefone")),
    funcao: maiusculaInicial(texto(form, "funcao")),
    instituicao: maiusculaInicial(texto(form, "instituicao")),
    p1i: texto(form, "periodo1_inicio"),
    p1f: texto(form, "periodo1_fim"),
    p2i: texto(form, "periodo2_inicio"),
    p2f: texto(form, "periodo2_fim"),
  };

  if (!Number.isInteger(d.codigo) || d.codigo <= 0) return { erro: "Escolha o município." };
  if (d.responsavel.length < 3) return { erro: "Preencha o nome do responsável." };
  if (d.cpf && !cpfValido(d.cpf)) return { erro: "Este CPF não é válido. Confira os números." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return { erro: "Este e-mail não é válido. Confira." };
  if (d.telefone.length < 10 || d.telefone.length > 11) return { erro: "Digite o telefone com DDD, só os números. Ex.: (85) 99999-9999." };
  if (d.funcao.length < 2) return { erro: "Preencha a função do responsável." };
  if (d.instituicao.length < 3) return { erro: "Preencha o nome da prefeitura ou da associação." };
  if (d.responsavel.length > 150 || d.instituicao.length > 150 || d.funcao.length > 100) {
    return { erro: "Algum campo ficou grande demais. Resuma o texto." };
  }

  const periodos: [string, string, string][] = [[d.p1i, d.p1f, "01"], [d.p2i, d.p2f, "02"]];
  for (const [ini, fim, n] of periodos) {
    if (!DATA.test(ini) || !DATA.test(fim)) return { erro: `Preencha o início e o fim do período ${n}.` };
    if (fim < ini) return { erro: `No período ${n}, o fim não pode ser antes do início.` };
    if (!ini.startsWith(String(ano)) || !fim.startsWith(String(ano))) return { erro: `As datas do período ${n} precisam ser em ${ano}.` };
  }
  return { dados: d };
}
