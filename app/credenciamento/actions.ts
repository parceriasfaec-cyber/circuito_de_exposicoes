"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ANO_CREDENCIAMENTO, diaMes, lerPrazo, municipiosDisponiveis } from "@/lib/credenciamento";
import { cpfValido, maiusculaInicial, soDigitos } from "@/lib/texto";

export type EstadoCredenciamento = { erro?: string };

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim().replace(/\s+/g, " ");
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function credenciar(_: EstadoCredenciamento, form: FormData): Promise<EstadoCredenciamento> {
  const { prazo, aberto } = await lerPrazo();
  if (!aberto) return { erro: `O prazo do credenciamento terminou em ${diaMes(prazo!, true)}.` };
  const codigo = Number(texto(form, "municipio"));
  const responsavel = maiusculaInicial(texto(form, "responsavel"));
  const cpf = soDigitos(texto(form, "cpf"));
  const email = texto(form, "email").toLowerCase();
  const funcao = maiusculaInicial(texto(form, "funcao"));
  const instituicao = maiusculaInicial(texto(form, "instituicao"));
  const p1i = texto(form, "periodo1_inicio");
  const p1f = texto(form, "periodo1_fim");
  const p2i = texto(form, "periodo2_inicio");
  const p2f = texto(form, "periodo2_fim");

  if (!Number.isInteger(codigo) || codigo <= 0) return { erro: "Escolha o município." };
  if (responsavel.length < 3) return { erro: "Preencha o nome do responsável." };
  if (!cpfValido(cpf)) return { erro: "Este CPF não é válido. Confira os números." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "Este e-mail não é válido. Confira." };
  if (funcao.length < 2) return { erro: "Preencha a função do responsável." };
  if (instituicao.length < 3) return { erro: "Preencha o nome da prefeitura ou da associação." };
  if (responsavel.length > 150 || instituicao.length > 150 || funcao.length > 100) return { erro: "Algum campo ficou grande demais. Resuma o texto." };

  const periodos: [string, string, string][] = [[p1i, p1f, "01"], [p2i, p2f, "02"]];
  for (const [ini, fim, n] of periodos) {
    if (!DATA.test(ini) || !DATA.test(fim)) return { erro: `Preencha o início e o fim do período ${n}.` };
    if (fim < ini) return { erro: `No período ${n}, o fim não pode ser antes do início.` };
    if (!ini.startsWith(String(ANO_CREDENCIAMENTO)) || !fim.startsWith(String(ANO_CREDENCIAMENTO))) {
      return { erro: `As datas do período ${n} precisam ser em ${ANO_CREDENCIAMENTO}.` };
    }
  }

  // Cada pessoa (CPF) só pode credenciar um município.
  const [jaFeito] = await sql()<{ municipio: string }[]>`
    select m.nome municipio from credenciamentos c join municipios m on m.codigo = c.municipio_codigo
    where c.ano = ${ANO_CREDENCIAMENTO} and c.cpf = ${cpf}`;
  if (jaFeito) {
    return { erro: `Este CPF já credenciou o município de ${jaFeito.municipio}. Cada pessoa só pode credenciar um município.` };
  }

  // Confere de novo no servidor: o município pode ter sido escolhido por outra pessoa enquanto a página estava aberta.
  const disponiveis = await municipiosDisponiveis();
  const municipio = disponiveis.find((m) => m.codigo === codigo);
  if (!municipio) return { erro: "Este município não está mais disponível. Escolha outro na lista (atualize a página)." };

  try {
    await sql()`
      insert into credenciamentos (ano, municipio_codigo, responsavel, cpf, email, funcao, instituicao,
                                   periodo1_inicio, periodo1_fim, periodo2_inicio, periodo2_fim)
      values (${ANO_CREDENCIAMENTO}, ${codigo}, ${responsavel}, ${cpf}, ${email}, ${funcao}, ${instituicao},
              ${p1i}, ${p1f}, ${p2i}, ${p2f})`;
  } catch (e) {
    const err = e as { code?: string; constraint_name?: string };
    if (err.code === "23505" && err.constraint_name === "credenciamentos_cpf_ano_uk") {
      return { erro: "Este CPF já credenciou um município. Cada pessoa só pode credenciar um município." };
    }
    if (err.code === "23505") {
      return { erro: "Este município acabou de ser credenciado por outra pessoa. Escolha outro na lista (atualize a página)." };
    }
    console.error(e);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  redirect(`/credenciamento?ok=${encodeURIComponent(municipio.nome)}`);
}
