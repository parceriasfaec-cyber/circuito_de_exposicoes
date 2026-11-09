import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/CabecalhoAdmin";
import Icone from "@/components/Icone";
import { ANO_CREDENCIAMENTO, diaMes, lerPrazo } from "@/lib/credenciamento";
import { ehAdmin } from "@/lib/sessao";
import { salvarPrazo } from "../actions";

export const dynamic = "force-dynamic";

export default async function Prazos2027({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  if (!(await ehAdmin())) redirect("/admin");
  const params = await searchParams;
  const { prazo, aberto, apresentacao } = await lerPrazo();

  return (
    <>
      <CabecalhoAdmin
        titulo={`Prazos ${ANO_CREDENCIAMENTO}`}
        subtitulo="Até quando os municípios podem se credenciar e o dia das apresentações. As duas datas aparecem no formulário."
      />

      {params.ok && <div className="ok">Datas salvas.</div>}

      <section className="bloco prazo-cred">
        <h2 className="bloco-titulo"><Icone nome="calendario" tamanho={22} /> Prazo e apresentações</h2>
        <form action={salvarPrazo} className="prazo-form">
          <div>
            <label htmlFor="prazo">Aceitar cadastros até o dia</label>
            <input id="prazo" name="prazo" type="date" defaultValue={prazo ?? ""} />
          </div>
          <div>
            <label htmlFor="apresentacao">Dia das apresentações</label>
            <input id="apresentacao" name="apresentacao" type="date" defaultValue={apresentacao ?? ""} />
          </div>
          <button className="botao">Salvar datas</button>
        </form>
        <p className={aberto ? "status-aberta" : "status-fechada"} style={{ margin: "10px 0 0", fontWeight: 800 }}>
          {!prazo
            ? "Sem prazo definido: o formulário está aberto."
            : aberto
              ? `Formulário aberto até ${diaMes(prazo, true)} (fim do dia).`
              : `Formulário encerrado: o prazo terminou em ${diaMes(prazo, true)}.`}
        </p>
        <p className="suave" style={{ margin: "6px 0 0" }}>
          As datas aparecem no quadro &quot;Fique atento!&quot; do formulário. Para reabrir o credenciamento, escolha um prazo novo; deixe em
          branco para ficar sem prazo.
        </p>
      </section>

      <section className="bloco">
        <h2 className="bloco-titulo"><Icone nome="documento" tamanho={22} /> Formulário de credenciamento</h2>
        <p style={{ marginTop: 0 }}>
          Envie este link para as prefeituras e associações: <Link href="/credenciamento" target="_blank"><strong>/credenciamento</strong></Link>
        </p>
        <Link className="botao secundario pequeno" href="/credenciamento" target="_blank"><Icone nome="olho" tamanho={16} /> Abrir formulário</Link>
      </section>
    </>
  );
}
