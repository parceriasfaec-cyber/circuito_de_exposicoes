import { redirect } from "next/navigation";

/** Endereço antigo: o credenciamento agora fica no painel do próximo ano. */
export default function CredenciamentosAntigo() {
  redirect("/admin/proximo/credenciados");
}
