import { redirect } from "next/navigation";

/** Endereço antigo: o credenciamento agora fica no Painel 2027. */
export default function CredenciamentosAntigo() {
  redirect("/admin/2027/credenciados");
}
