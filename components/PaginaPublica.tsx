import { Topo } from "./Marca";

/**
 * Moldura das telas abertas (produtor, login do organizador e telão).
 * O fundo (foto com as ondas verdes) vem do CSS da classe .pagina.
 */
export default function PaginaPublica({ children }: { children: React.ReactNode }) {
  return (
    <div className="pagina">
      <Topo />
      <main className="conteudo">{children}</main>
    </div>
  );
}
