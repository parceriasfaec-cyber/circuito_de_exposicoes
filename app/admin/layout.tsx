import PaginaPublica from "@/components/PaginaPublica";
import { anoCredenciamento } from "@/lib/credenciamento";
import { adminLogado } from "@/lib/sessao";
import MenuLateral from "./MenuLateral";

export const dynamic = "force-dynamic";

/** Logado: moldura com barra lateral. Sem login: a mesma moldura das telas do produtor. */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await adminLogado();
  if (!admin) return <PaginaPublica>{children}</PaginaPublica>;

  return (
    <div className="admin">
      <MenuLateral anoProximo={await anoCredenciamento()} />
      <div className="admin-principal">{children}</div>
    </div>
  );
}
