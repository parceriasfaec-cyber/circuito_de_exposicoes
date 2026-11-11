"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Icone from "@/components/Icone";
import { normalizar } from "@/lib/texto";
import { desmarcarPresenca, marcarPresenca, type ResultadoPresenca } from "./actions";

export type Expositor = {
  id: string;
  codigo: string;
  nome: string;
  empresa: string | null;
  municipio: string;
  presente: boolean;
  hora: string | null;
  marcado_em: Date | null;
};

/** Marcar presença na hora: campo grande para o ID (Enter marca), busca por nome para quem esqueceu o ID e lista de presentes. */
export default function MarcarPresenca({ cicloId, expositores: doServidor }: { cicloId: string; expositores: Expositor[] }) {
  // Cópia local: a lista e o contador mudam na hora, sem esperar a página recarregar.
  const [expositores, setExpositores] = useState(doServidor);
  useEffect(() => setExpositores(doServidor), [doServidor]);
  const campo = useRef<HTMLInputElement>(null);
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<ResultadoPresenca | null>(null);
  const [busca, setBusca] = useState("");
  const [ocupado, iniciar] = useTransition();

  useEffect(() => campo.current?.focus(), []);

  const presentes = useMemo(
    () => expositores.filter((e) => e.presente).sort((a, b) => +new Date(b.marcado_em!) - +new Date(a.marcado_em!)),
    [expositores],
  );
  const achados = useMemo(() => {
    const q = normalizar(busca);
    if (q.length < 2) return [];
    return expositores.filter((e) => normalizar(`${e.codigo} ${e.nome} ${e.empresa ?? ""} ${e.municipio}`).includes(q)).slice(0, 8);
  }, [busca, expositores]);

  function marcar(quem: { codigo?: string; id?: string }) {
    iniciar(async () => {
      const r = await marcarPresenca(cicloId, quem);
      setResultado(r);
      if (r.ok) {
        setCodigo("");
        setBusca("");
        setExpositores((lista) => {
          const marcado = { presente: true, hora: r.hora, marcado_em: new Date(r.marcadoEm) };
          return lista.some((x) => x.id === r.id)
            ? lista.map((x) => (x.id === r.id ? { ...x, ...marcado } : x))
            : [...lista, { id: r.id, codigo: r.codigo, nome: r.nome, empresa: null, municipio: r.municipio, ...marcado }];
        });
      }
      campo.current?.focus();
    });
  }

  function desfazer(e: Expositor) {
    if (!confirm(`Tirar a presença de ${e.nome}?`)) return;
    iniciar(async () => {
      await desmarcarPresenca(cicloId, e.id);
      setResultado(null);
      setExpositores((lista) => lista.map((x) => (x.id === e.id ? { ...x, presente: false, hora: null, marcado_em: null } : x)));
    });
  }

  const total = expositores.length;
  const pct = total ? Math.round((presentes.length / total) * 100) : 0;

  return (
    <div className="pres">
      <div className="pres-topo">
        <form
          className="cartao pres-entrada"
          onSubmit={(ev) => {
            ev.preventDefault();
            marcar({ codigo });
          }}
        >
          <label htmlFor="pres-codigo">ID do expositor</label>
          <div className="pres-linha">
            <input
              ref={campo}
              id="pres-codigo"
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              placeholder="00000"
              value={codigo}
              onChange={(ev) => setCodigo(ev.target.value.replace(/\D/g, "").slice(0, 5))}
            />
            <button className="botao com-icone" disabled={ocupado || codigo.length !== 5}>
              <Icone nome="check" tamanho={20} /> Marcar presença
            </button>
          </div>

          {resultado && (
            <div className={`pres-aviso ${resultado.ok ? (resultado.jaEstava ? "ja" : "ok") : "erro"}`} role="status">
              {resultado.ok ? (
                <>
                  <Icone nome={resultado.jaEstava ? "alerta" : "check"} tamanho={26} />
                  <div>
                    <strong>{resultado.nome}</strong>
                    <span>
                      ID {resultado.codigo} · {resultado.municipio} ·{" "}
                      {resultado.jaEstava ? `já estava presente desde ${resultado.hora}` : `presença marcada às ${resultado.hora}`}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Icone nome="alerta" tamanho={26} />
                  <div><strong>{resultado.erro}</strong></div>
                </>
              )}
            </div>
          )}
        </form>

        <div className="cartao pres-contador">
          <span className="pres-numero">{presentes.length}</span>
          <span>de {total} expositores presentes</span>
          <div className="pres-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          <small>{pct}%</small>
        </div>
      </div>

      <div className="cartao pres-busca">
        <label htmlFor="pres-busca">Sem o ID em mãos? Busque pelo nome</label>
        <input id="pres-busca" type="search" placeholder="Nome, empresa ou município..." value={busca} onChange={(ev) => setBusca(ev.target.value)} />
        {busca.trim().length >= 2 && achados.length === 0 && <p className="suave" style={{ margin: "10px 0 0" }}>Ninguém encontrado.</p>}
        {achados.length > 0 && (
          <ul className="pres-lista">
            {achados.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.nome}</strong>
                  <span className="suave">ID {e.codigo} · {e.municipio}</span>
                </div>
                {e.presente ? (
                  <span className="pres-selo">Presente {e.hora}</span>
                ) : (
                  <button type="button" className="botao pequeno" disabled={ocupado} onClick={() => marcar({ id: e.id })}>Marcar</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cartao">
        <h2 className="pres-titulo">Presentes ({presentes.length})</h2>
        {presentes.length === 0 ? (
          <p className="suave" style={{ margin: 0 }}>Ninguém marcado ainda.</p>
        ) : (
          <ul className="pres-lista">
            {presentes.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.nome}</strong>
                  <span className="suave">ID {e.codigo} · {e.municipio} · às {e.hora}</span>
                </div>
                <button type="button" className="link" disabled={ocupado} onClick={() => desfazer(e)}>Desfazer</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
