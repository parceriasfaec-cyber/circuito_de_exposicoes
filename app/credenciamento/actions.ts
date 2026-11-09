"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { anoCredenciamento, diaMes, lerPrazo, municipiosDisponiveis } from "@/lib/credenciamento";
import { lerDadosCredenciamento } from "@/lib/dadosCredenciamento";

export type EstadoCredenciamento = { erro?: string };

export async function credenciar(_: EstadoCredenciamento, form: FormData): Promise<EstadoCredenciamento> {
  const ano = await anoCredenciamento();
  const { prazo, aberto } = await lerPrazo(ano);
  if (!aberto) return { erro: `O prazo do credenciamento terminou em ${diaMes(prazo!, true)}.` };

  const lido = lerDadosCredenciamento(form, ano);
  if ("erro" in lido) return lido;
  const d = lido.dados;

  // Cada pessoa (CPF) só pode credenciar um município.
  const [jaFeito] = await sql()<{ municipio: string }[]>`
    select m.nome municipio from credenciamentos c join municipios m on m.codigo = c.municipio_codigo
    where c.ano = ${ano} and c.cpf = ${d.cpf}`;
  if (jaFeito) {
    return { erro: `Este CPF já credenciou o município de ${jaFeito.municipio}. Cada pessoa só pode credenciar um município.` };
  }

  // Confere de novo no servidor: o município pode ter sido escolhido por outra pessoa enquanto a página estava aberta.
  const disponiveis = await municipiosDisponiveis(ano);
  const municipio = disponiveis.find((m) => m.codigo === d.codigo);
  if (!municipio) return { erro: "Este município não está mais disponível. Escolha outro na lista (atualize a página)." };

  try {
    await sql()`
      insert into credenciamentos (ano, municipio_codigo, responsavel, cpf, email, telefone, funcao, instituicao,
                                   periodo1_inicio, periodo1_fim, periodo2_inicio, periodo2_fim)
      values (${ano}, ${d.codigo}, ${d.responsavel}, ${d.cpf}, ${d.email}, ${d.telefone}, ${d.funcao}, ${d.instituicao},
              ${d.p1i}, ${d.p1f}, ${d.p2i}, ${d.p2f})`;
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
