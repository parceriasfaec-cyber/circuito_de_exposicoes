"use client";

import { useMemo, useRef, useState } from "react";
import { MAPA_CEARA } from "@/lib/mapaCeara";

export type EtapaMapa = {
  id: string; nome: string; municipio: string; periodo: string;
  posicao: number | null; media: string | null; avaliacoes: number; participantes: number; atual: boolean;
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const { w: W, h: H } = MAPA_CEARA;

/** Mapa do Ceará com as etapas do Circuito: toque num marcador para ver os dados da etapa. */
export default function MapaCircuito({ etapas }: { etapas: EtapaMapa[] }) {
  const pontos = useMemo(
    () => etapas.flatMap((e, i) => {
      const c = (MAPA_CEARA.centros as Record<string, readonly number[]>)[norm(e.municipio)];
      return c ? [{ ...e, n: i + 1, x: c[0], y: c[1] }] : [];
    }),
    [etapas],
  );
  const [vista, setVista] = useState({ x: 0, y: 0, z: 1 });
  const [sel, setSel] = useState<string | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ d: number; moveu: boolean }>({ d: 0, moveu: false });

  const vw = W / vista.z, vh = H / vista.z;
  const limitar = (x: number, y: number, z: number) => {
    const a = W / z, b = H / z;
    return { x: Math.min(Math.max(x, -a * 0.1), W - a * 0.9), y: Math.min(Math.max(y, -b * 0.1), H - b * 0.9), z };
  };
  const zoomEm = (fator: number, cx = 0.5, cy = 0.5) => setVista((v) => {
    const z = Math.min(6, Math.max(1, v.z * fator));
    const px = v.x + (W / v.z) * cx, py = v.y + (H / v.z) * cy;
    return limitar(px - (W / z) * cx, py - (H / z) * cy, z);
  });

  const onDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesto.current = { d: 0, moveu: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId);
    if (!p || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const antes = { ...p };
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const todos = [...ptrs.current.values()];
    if (todos.length === 2) {
      const d = Math.hypot(todos[0].x - todos[1].x, todos[0].y - todos[1].y);
      if (gesto.current.d) zoomEm(d / gesto.current.d, ((todos[0].x + todos[1].x) / 2 - r.left) / r.width, ((todos[0].y + todos[1].y) / 2 - r.top) / r.height);
      gesto.current = { d, moveu: true };
    } else if (todos.length === 1) {
      const dx = e.clientX - antes.x, dy = e.clientY - antes.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) gesto.current.moveu = gesto.current.moveu || Math.abs(dx) + Math.abs(dy) > 3;
      setVista((v) => limitar(v.x - (dx / r.width) * (W / v.z), v.y - (dy / r.height) * (H / v.z), v.z));
    }
  };
  const onUp = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); gesto.current.d = 0; };

  const escolhida = pontos.find((p) => p.id === sel) ?? null;
  const rota = pontos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("");
  const k = 1 / vista.z;

  return (
    <div className="mapa">
      <svg
        ref={ref} className="mapa-svg" viewBox={`${vista.x} ${vista.y} ${vw} ${vh}`} role="img" aria-label="Mapa do Ceará com as etapas do Circuito"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={(e) => { const r = e.currentTarget.getBoundingClientRect(); zoomEm(e.deltaY < 0 ? 1.2 : 1 / 1.2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }}
      >
        <rect x={-200} y={-200} width={W + 400} height={H + 400} className="mapa-mar" />
        {Object.entries(MAPA_CEARA.vizinhos).map(([sigla, v]) => (
          <g key={sigla}><path d={v.d} className="mapa-viz" /><text x={v.x} y={v.y} className="mapa-viz-txt" style={{ fontSize: 26 * k }}>{sigla}</text></g>
        ))}
        <path d={MAPA_CEARA.estado} className="mapa-estado" />
        <path d={MAPA_CEARA.municipios} className="mapa-mun" />
        <path d={MAPA_CEARA.estado} className="mapa-borda" style={{ strokeWidth: 3.2 * k }} />
        <path d={rota} className="mapa-rota" style={{ strokeWidth: 2 * k, strokeDasharray: `${9 * k} ${7 * k}` }} />
        {pontos.map((p) => (
          <g
            key={p.id} className={`mapa-pino${p.atual ? " atual" : ""}${sel === p.id ? " sel" : ""}`} transform={`translate(${p.x} ${p.y})`}
            onClick={() => { if (!gesto.current.moveu) setSel(p.id === sel ? null : p.id); }} role="button" tabIndex={0} aria-label={`${p.n}. ${p.municipio}`}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSel(p.id); }}
          >
            {p.atual && <circle r={20 * k} className="mapa-anel" style={{ strokeWidth: 4 * k }} />}
            <circle r={14 * k} className="mapa-bolha" />
            <text className="mapa-num" style={{ fontSize: 15 * k }} dy={5.2 * k}>{p.n}</text>
            <text className="mapa-nome" style={{ fontSize: 17 * k, strokeWidth: 4 * k }} dy={34 * k}>{p.municipio}</text>
          </g>
        ))}
      </svg>

      <div className="mapa-zoom">
        <button type="button" onClick={() => zoomEm(1.5)} aria-label="Aproximar">+</button>
        <button type="button" onClick={() => zoomEm(1 / 1.5)} aria-label="Afastar">−</button>
        <button type="button" onClick={() => setVista({ x: 0, y: 0, z: 1 })} aria-label="Ver tudo">⤢</button>
      </div>

      {escolhida && (
        <div className="mapa-painel" role="dialog" aria-label={`Etapa ${escolhida.nome}`}>
          <button type="button" className="mapa-fechar" onClick={() => setSel(null)} aria-label="Fechar">×</button>
          <span className="mapa-etapa">{escolhida.atual ? "Etapa atual" : `Etapa ${escolhida.n}`}</span>
          <h3>{escolhida.nome}</h3>
          <p className="mapa-sub">{escolhida.municipio} · {escolhida.periodo}</p>
          <div className="mapa-dados">
            <div><strong>{escolhida.posicao ? `${escolhida.posicao}º` : "—"}</strong><small>No ranking</small></div>
            <div><strong>{escolhida.media ?? "—"}</strong><small>Média</small></div>
            <div><strong>{escolhida.avaliacoes}</strong><small>Avaliações</small></div>
            <div><strong>{escolhida.participantes}</strong><small>Participantes</small></div>
          </div>
        </div>
      )}
    </div>
  );
}
