"use client";

import { useActionState, useEffect, useState } from "react";
import Icone from "@/components/Icone";
import { entrar, type EstadoEntrada } from "./actions";

type Opcao = { id: string; nome: string; municipio: string; repetido: boolean };

export default function Identificacao({ destino }: { destino: "inicio" | "avaliar" | "votar" }) {
  const [estado, acao, enviando] = useActionState<EstadoEntrada, FormData>(entrar, {});
  const [modo, setModo] = useState<"documento" | "nome">("documento");
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [escolhido, setEscolhido] = useState<Opcao | null>(null);

  useEffect(() => {
    if (modo !== "nome" || escolhido || busca.trim().length < 3) {
      setOpcoes([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/nomes?q=${encodeURIComponent(busca)}`, { signal: ctrl.signal });
        if (r.ok) setOpcoes(await r.json());
      } catch {
        /* busca cancelada */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [busca, modo, escolhido]);

  return (
    <form action={acao} className="form-voto">
      <input type="hidden" name="modo" value={modo} />
      <input type="hidden" name="destino" value={destino} />

      <div className="abas com-icone" role="tablist">
        <button type="button" className={modo === "documento" ? "ativa" : ""} onClick={() => setModo("documento")}>
          <Icone nome="documento" tamanho={26} /> Com documento
        </button>
        <button type="button" className={modo === "nome" ? "ativa" : ""} onClick={() => setModo("nome")}>
          <Icone nome="proibido" tamanho={26} /> Sem documento
        </button>
      </div>

      {modo === "documento" ? (
        <div className="campo-icone">
          <span className="bolha"><Icone nome="usuarioCheio" tamanho={30} /></span>
          <div>
            <label htmlFor="documento">CPF, CNPJ ou outro documento</label>
            <input id="documento" name="documento" type="text" inputMode="numeric" autoComplete="off" placeholder="Só os números" />
          </div>
        </div>
      ) : (
        <div className="campo-icone">
          <span className="bolha"><Icone nome="usuarioCheio" tamanho={30} /></span>
          <div>
          <input type="hidden" name="produtor_id" value={escolhido?.id ?? ""} />
          <label htmlFor="busca">Seu nome completo</label>
          {escolhido ? (
            <div className="escolhido">
              <span>
                <strong>{escolhido.nome}</strong>
                {escolhido.repetido && <> · {escolhido.municipio}</>}
              </span>
              <button type="button" className="link" onClick={() => { setEscolhido(null); setBusca(""); }}>
                Trocar
              </button>
            </div>
          ) : (
            <>
              <input
                id="busca"
                type="text"
                autoComplete="off"
                placeholder="Digite o início do seu nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {opcoes.length > 0 && (
                <ul className="lista-nomes">
                  {opcoes.map((o) => (
                    <li key={o.id}>
                      <button type="button" onClick={() => setEscolhido(o)}>
                        {o.nome}
                        {o.repetido && <span className="suave"> · {o.municipio}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {busca.trim().length >= 3 && opcoes.length === 0 && (
                <p className="suave" style={{ marginTop: 8 }}>Nenhum nome encontrado. Confira a escrita ou procure a organização.</p>
              )}
              <p className="suave" style={{ marginTop: 8 }}>Escolha o seu nome na lista. Se houver dois nomes iguais, aparece também o município.</p>
            </>
          )}
          </div>
        </div>
      )}

      <div className="campo-icone">
        <span className="bolha"><Icone nome="calendario" tamanho={30} /></span>
        <div>
          <label htmlFor="codigo">Código do dia</label>
          <input id="codigo" name="codigo" type="text" inputMode="numeric" maxLength={4} autoComplete="off" placeholder="4 números do telão" />
        </div>
      </div>

      {estado.erro && <div className="erro" role="alert">{estado.erro}</div>}

      <button className="botao cheio entrar" disabled={enviando || (modo === "nome" && !escolhido)}>
        <Icone nome="entrar" tamanho={26} /> {enviando ? "Conferindo..." : "Entrar"}
      </button>

      <p className="nota-info">
        <i className="i">i</i>
        <span>
          Não tem documento? Toque em <strong>Sem documento</strong>, escolha o seu nome na lista e digite o código do dia
          que aparece no telão.
        </span>
      </p>
    </form>
  );
}
