"use client";

import type { Moneda, Propiedad } from "@/types/propiedad";
import { etiquetaMoneda, formatoMoneda } from "@/lib/format";
import { galeriasPropiedades } from "@/lib/imagenes-propiedades";

const estados = [
  { nombre: "Disponible", color: "#4f7f5e" },
  { nombre: "Reservada", color: "#d4a548" },
  { nombre: "Vendida", color: "#bd7058" },
] as const;

export function GraficoEstadosInventario({ propiedades }: { propiedades: Propiedad[] }) {
  const total = propiedades.length;
  const radio = 68;
  const circunferencia = 2 * Math.PI * radio;
  let desplazamiento = 0;
  const datos = estados.map((estado) => {
    const cantidad = propiedades.filter((p) => p.estado === estado.nombre).length;
    const proporción = total ? (cantidad / total) * 100 : 0;
    const longitud = total ? (cantidad / total) * circunferencia : 0;
    const segmento = { ...estado, cantidad, proporción, longitud, desplazamiento };
    desplazamiento += longitud;
    return segmento;
  });

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(180px,220px)_1fr]" role="group" aria-label={`Distribución de ${total} propiedades por estado`}>
      <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-[210px]" aria-hidden="true">
        <circle cx="100" cy="100" r={radio} fill="none" stroke="#edf0ed" strokeWidth="20" />
        {datos.filter((segmento) => segmento.cantidad > 0).map((segmento) => (
          <circle
            key={segmento.nombre}
            cx="100"
            cy="100"
            r={radio}
            fill="none"
            stroke={segmento.color}
            strokeWidth="20"
            strokeDasharray={`${segmento.longitud} ${circunferencia - segmento.longitud}`}
            strokeDashoffset={-segmento.desplazamiento}
            transform="rotate(-90 100 100)"
            className="transition-all duration-700"
          />
        ))}
        <text x="100" y="91" textAnchor="middle" fill="#647067" fontSize="10" fontWeight="600" letterSpacing="1.5">PROPIEDADES</text>
        <text x="100" y="119" textAnchor="middle" fill="#17231b" fontSize="30" fontWeight="700">{total}</text>
      </svg>

      <ul className="space-y-3">
        {datos.map((segmento) => (
          <li key={segmento.nombre} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segmento.color }} />
                {segmento.nombre}
              </span>
              <strong className="text-sm font-semibold text-slate-900">{segmento.cantidad}</strong>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${segmento.proporción}%`, backgroundColor: segmento.color }} />
              </div>
              <span className="w-9 text-right text-[11px] tabular-nums text-slate-500">{Math.round(segmento.proporción)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GraficoPrismasPrecios({ propiedades, moneda }: { propiedades: Propiedad[]; moneda: Moneda }) {
  const datos = propiedades
    .filter((p) => p.moneda === moneda)
    .sort((a, b) => Number(b.precio) - Number(a.precio))
    .slice(0, 5);
  const maximo = Math.max(...datos.map((p) => Number(p.precio)), 1);
  const tonos = ["#bd7150", "#c9825f", "#d1936c", "#d9a77f", "#e0b99b"];
  const guias = [0, 1, 2, 3];

  if (!datos.length) {
    return <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-[#f8f6f3] px-5 text-center text-sm text-slate-500">No hay propiedades registradas en {etiquetaMoneda(moneda)}.</div>;
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#eee9e4] bg-gradient-to-b from-[#fbfaf8] to-[#f0ede9] p-3 sm:p-4">
        <svg viewBox="0 0 440 240" className="h-[260px] w-full" role="img" aria-label={`Gráfico de las cinco propiedades de mayor precio en ${etiquetaMoneda(moneda)}`}>
          {guias.map((guia) => {
            const y = 190 - guia * 52;
            const valor = maximo * guia / 3;
            return <g key={guia}>
              <line x1="42" y1={y} x2="428" y2={y} stroke="#d8d5d0" strokeDasharray="3 5" />
              <text x="36" y={y - 5} textAnchor="end" fill="#77736d" fontSize="9">{formatoMoneda(valor, moneda)}</text>
            </g>;
          })}
          <line x1="42" y1="190" x2="428" y2="190" stroke="#aaa69e" />
          {datos.map((p, i) => {
            const alto = Math.max(Number(p.precio) / maximo * 150, 8);
            const x = 62 + i * 74;
            const y = 190 - alto;
            const ancho = 31;
            const profundidad = 12;
            return <g key={p.id}>
              <polygon points={`${x + ancho},${y} ${x + ancho + profundidad},${y - 8} ${x + ancho + profundidad},182 ${x + ancho},190`} fill={tonos[i]} opacity=".62" />
              <rect x={x} y={y} width={ancho} height={alto} rx="2" fill={tonos[i]} />
              <polygon points={`${x},${y} ${x + profundidad},${y - 8} ${x + ancho + profundidad},${y - 8} ${x + ancho},${y}`} fill="#efc7a8" />
              <text x={x + 16} y={Math.min(y + 20, 181)} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">{i + 1}</text>
            </g>;
          })}
        </svg>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {datos.map((p, i) => <li key={p.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: tonos[i] }}>{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{p.nombre}</span>
          <strong className="whitespace-nowrap text-[11px] text-slate-800">{formatoMoneda(Number(p.precio), moneda)}</strong>
        </li>)}
      </ol>
    </div>
  );
}

export function FotoInventario({ propiedad, className = "" }: { propiedad: Propiedad; className?: string }) {
  const url = propiedad.imagenes?.[0] || galeriasPropiedades[propiedad.id]?.[0];
  return <div
    role="img"
    aria-label={`Fotografía de ${propiedad.nombre}`}
    className={`bg-slate-200 bg-cover bg-center ${className}`}
    style={{ backgroundImage: url ? `url("${url}")` : "linear-gradient(135deg,#dce5db,#8d9c8a)" }}
  />;
}
