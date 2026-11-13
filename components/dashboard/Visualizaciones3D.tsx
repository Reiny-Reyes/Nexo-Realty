"use client";

import type { Moneda, Propiedad } from "@/types/propiedad";
import { formatoMoneda } from "@/lib/format";
import { galeriasPropiedades } from "@/lib/imagenes-propiedades";

const estados = [
  { nombre: "Disponible", color: "#5b8f6a", sombra: "#376b49" },
  { nombre: "Reservada", color: "#daa94f", sombra: "#a77927" },
  { nombre: "Vendida", color: "#c9755e", sombra: "#984c38" },
] as const;

export function GraficoEstados3D({ propiedades }: { propiedades: Propiedad[] }) {
  return (
    <div className="space-y-5" aria-label="Distribución de propiedades por estado">
      {estados.map((estado) => {
        const cantidad = propiedades.filter((p) => p.estado === estado.nombre).length;
        const proporción = propiedades.length ? cantidad / propiedades.length * 100 : 0;
        return (
          <div key={estado.nombre} className="grid grid-cols-[90px_minmax(0,1fr)_42px] items-center gap-3">
            <span className="text-xs font-medium text-slate-600">{estado.nombre}</span>
            <div className="h-[48px] border-b border-r border-slate-200 bg-[linear-gradient(135deg,#f8fafc_25%,transparent_25%,transparent_50%,#f8fafc_50%,#f8fafc_75%,transparent_75%)] bg-[length:12px_12px] px-1 pt-1">
              <div
                className="relative h-full min-w-[8px] transition-all duration-500"
                style={{
                  width: `${Math.max(proporción, cantidad ? 7 : 0)}%`,
                  backgroundColor: estado.color,
                  transform: "skewY(-8deg)",
                  transformOrigin: "left bottom",
                  boxShadow: `5px 5px 0 ${estado.sombra}, 9px 9px 0 ${estado.sombra}55`,
                }}
              >
                {cantidad > 0 && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{cantidad}</span>}
              </div>
            </div>
            <span className="text-right text-xs font-bold text-slate-700">{cantidad}<span className="ml-1 text-[9px] font-normal text-slate-400">{Math.round(proporción)}%</span></span>
          </div>
        );
      })}
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
    return <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-[#f8f6f3] px-5 text-center text-sm text-slate-500">No hay propiedades registradas en {moneda}.</div>;
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#eee9e4] bg-gradient-to-b from-[#fbfaf8] to-[#f0ede9] p-3 sm:p-4">
        <svg viewBox="0 0 440 240" className="h-[260px] w-full" role="img" aria-label={`Gráfico tridimensional de las cinco propiedades de mayor precio en ${moneda}`}>
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
