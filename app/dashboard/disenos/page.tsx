"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Moneda, Propiedad } from "@/types/propiedad";
import { formatoMoneda } from "@/lib/format";
import { galeriasPropiedades } from "@/lib/imagenes-propiedades";

type Modelo = "isometrico" | "dona" | "prismas";
const coloresEstado = { Disponible: "#5b8f6a", Reservada: "#daa94f", Vendida: "#c9755e" } as const;
const etiquetasEstado = ["Disponible", "Reservada", "Vendida"] as const;

function Foto({ propiedad, className = "" }: { propiedad: Propiedad; className?: string }) {
  const url = propiedad.imagenes?.[0] || galeriasPropiedades[propiedad.id]?.[0];
  return <div role="img" aria-label={`Fotografía de ${propiedad.nombre}`} className={`bg-slate-200 bg-cover bg-center ${className}`} style={{ backgroundImage: url ? `url("${url}")` : "linear-gradient(135deg,#dce5db,#8d9c8a)" }} />;
}

function EstadoIsometrico({ propiedades }: { propiedades: Propiedad[] }) {
  return <div className="space-y-4">{etiquetasEstado.map((estado) => {
    const cantidad = propiedades.filter((p) => p.estado === estado).length;
    const ancho = propiedades.length ? cantidad / propiedades.length * 100 : 0;
    return <div key={estado} className="grid grid-cols-[100px_minmax(0,1fr)_32px] items-center gap-3">
      <span className="text-xs font-medium text-slate-600">{estado}</span>
      <div className="h-[44px] border-b border-r border-slate-200 bg-[linear-gradient(135deg,#f8fafc_25%,transparent_25%,transparent_50%,#f8fafc_50%,#f8fafc_75%,transparent_75%)] bg-[length:12px_12px] px-1 pt-1">
        <div className="relative h-full min-w-[7px] transition-all" style={{ width: `${Math.max(ancho, cantidad ? 7 : 0)}%`, backgroundColor: coloresEstado[estado], transform: "skewY(-8deg)", transformOrigin: "left bottom", boxShadow: `5px 5px 0 ${coloresEstado[estado]}99, 9px 9px 0 ${coloresEstado[estado]}44` }}>
          {cantidad > 0 && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{cantidad}</span>}
        </div>
      </div>
      <span className="text-right text-sm font-bold text-slate-700">{cantidad}</span>
    </div>;
  })}</div>;
}

function DonaRelieve({ propiedades }: { propiedades: Propiedad[] }) {
  const disponibles = propiedades.filter((p) => p.estado === "Disponible").length;
  const reservadas = propiedades.filter((p) => p.estado === "Reservada").length;
  const total = propiedades.length || 1;
  const a = disponibles / total * 100;
  const b = a + reservadas / total * 100;
  const gradiente = `conic-gradient(${coloresEstado.Disponible} 0% ${a}%, ${coloresEstado.Reservada} ${a}% ${b}%, ${coloresEstado.Vendida} ${b}% 100%)`;
  return <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-1 sm:gap-4">
    <div className="relative mx-auto grid h-[178px] w-[178px] place-items-center [perspective:700px]">
      <div className="absolute inset-[17px] rounded-full opacity-50 blur-[1px]" style={{ background: gradiente, transform: "rotateX(58deg) translateY(19px) scale(1.05)", filter: "brightness(.55) blur(1px)" }} />
      <div className="absolute inset-[17px] rounded-full shadow-[0_22px_18px_-13px_rgba(15,23,42,.6)]" style={{ background: gradiente, transform: "rotateX(58deg)" }} />
      <div className="absolute inset-[54px] rounded-full border-[9px] border-white bg-white shadow-inner" style={{ transform: "rotateX(58deg)" }} />
      <div className="relative z-10 mt-1 text-center"><p className="text-3xl font-bold tracking-tight text-slate-800">{propiedades.length}</p><p className="mt-0.5 text-[10px] font-medium text-slate-500">propiedades</p></div>
    </div>
    <div className="space-y-3">{etiquetasEstado.map((estado) => <div key={estado} className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: coloresEstado[estado] }} /><div className="min-w-0"><p className="text-[10px] text-slate-500">{estado}</p><p className="text-sm font-bold text-slate-800">{propiedades.filter((p) => p.estado === estado).length}<span className="ml-1 text-[9px] font-normal text-slate-400">{Math.round(propiedades.filter((p) => p.estado === estado).length / total * 100)}%</span></p></div></div>)}</div>
  </div>;
}

function ColumnasPrisma({ propiedades, moneda }: { propiedades: Propiedad[]; moneda: Moneda }) {
  const datos = propiedades.filter((p) => p.moneda === moneda).sort((a, b) => Number(b.precio) - Number(a.precio)).slice(0, 5);
  const maximo = Math.max(...datos.map((p) => Number(p.precio)), 1);
  const colores = ["#bd7150", "#ce8960", "#d69a70", "#dca987", "#e1bda1"];
  return <div>
    <div className="rounded-2xl bg-gradient-to-b from-[#fbfaf8] to-[#f1eeea] p-3">
      {datos.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No hay inmuebles en {moneda}.</p> : <svg viewBox="0 0 440 218" className="h-[225px] w-full overflow-visible" role="img" aria-label={`Gráfico 3D de precios en ${moneda}`}>
        {[40, 80, 120, 160].map((y) => <g key={y}><line x1="24" y1={y} x2="424" y2={y} stroke="#d9d7d2" strokeDasharray="3 5" /><text x="4" y={y + 4} fill="#85827b" fontSize="9">{Math.round((160 - y) / 120 * maximo / 1000)}k</text></g>)}
        <line x1="24" y1="164" x2="424" y2="164" stroke="#aaa69d" />
        {datos.map((p, i) => {
          const alto = Math.max(Number(p.precio) / maximo * 118, 9);
          const x = 48 + i * 77;
          const y = 164 - alto;
          const ancho = 34;
          const profundidad = 12;
          return <g key={p.id}>
            <polygon points={`${x + ancho},${y} ${x + ancho + profundidad},${y - 8} ${x + ancho + profundidad},${164 - 8} ${x + ancho},164`} fill={colores[i]} opacity=".64" />
            <rect x={x} y={y} width={ancho} height={alto} rx="2" fill={colores[i]} />
            <polygon points={`${x},${y} ${x + profundidad},${y - 8} ${x + ancho + profundidad},${y - 8} ${x + ancho},${y}`} fill="#edc5a7" />
            <text x={x + 17} y={Math.max(y - 14, 12)} textAnchor="middle" fill="#49342a" fontSize="9" fontWeight="700">{formatoMoneda(Number(p.precio), moneda)}</text>
            <text x={x + 17} y="181" textAnchor="middle" fill="#56544f" fontSize="8">{p.nombre.slice(0, 10)}{p.nombre.length > 10 ? "…" : ""}</text>
          </g>;
        })}
      </svg>}
    </div>
    {datos.length > 0 && <div className="mt-3 grid gap-1.5 sm:grid-cols-2">{datos.map((p, i) => <div key={p.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-[#faf8f5] px-2 py-1.5"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: colores[i] }} /><span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">{p.nombre}</span><strong className="text-[10px] text-slate-800">{formatoMoneda(Number(p.precio), moneda)}</strong></div>)}</div>}
  </div>;
}

function FilasPropiedades({ propiedades }: { propiedades: Propiedad[] }) {
  return <div className="divide-y divide-slate-100">{propiedades.slice(0, 3).map((p) => <article key={p.id} className="flex items-center gap-3 py-3"><Foto propiedad={p} className="h-[62px] w-[84px] shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{p.nombre}</p><p className="mt-1 truncate text-[10px] text-slate-500">{p.ubicacion} · {p.tipo}</p><p className="mt-1 text-[9px] text-slate-500">{p.habitaciones} hab. · {p.banos ?? 0} baños · {p.metros} m²</p></div><div className="text-right"><p className="whitespace-nowrap text-[10px] font-bold text-slate-800">{formatoMoneda(Number(p.precio), p.moneda)}</p><span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-800">{p.operacion}</span></div></article>)}</div>;
}

const modelos: { id: Modelo; titulo: string; resumen: string; acento: string; etiqueta: string }[] = [
  { id: "isometrico", titulo: "Isométrico ejecutivo", resumen: "Barras de estado con volumen, colores elegantes y fotos en filas amplias.", acento: "#254d40", etiqueta: "Relieve isométrico" },
  { id: "dona", titulo: "Dona 3D de disponibilidad", resumen: "La distribución del inventario se entiende al instante con un anillo extruido y su leyenda completa.", acento: "#4778b8", etiqueta: "Anillo extruido" },
  { id: "prismas", titulo: "Prismas de inversión", resumen: "Columnas 3D comparan precios de una misma moneda y conectan cada dato con su propiedad.", acento: "#a75d3d", etiqueta: "Columnas 3D" },
];

export default function DisenosDashboardPage() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [seleccionado, setSeleccionado] = useState<Modelo | null>(null);

  useEffect(() => {
    let activo = true;
    fetch("/api/propiedades", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudieron cargar las propiedades");
        return await respuesta.json() as Propiedad[];
      })
      .then((datos) => { if (activo) setPropiedades(datos); })
      .catch(() => undefined)
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const suma = useMemo(() => propiedades.filter((p) => p.moneda === moneda).reduce((total, p) => total + Number(p.precio), 0), [propiedades, moneda]);
  const disponibles = propiedades.filter((p) => p.estado === "Disponible").length;

  return <main className="min-h-screen bg-[#f3f4f2] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#8a634f]">Nexo Realty · variaciones del diseño 3</p><h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">Tres gráficos con volumen</h1></div>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-medium text-slate-500">Moneda del gráfico<select aria-label="Moneda de los gráficos de precios" value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-800"><option value="USD">USD</option><option value="BOB">RD$</option></select></label><Link href="/dashboard" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">← Dashboard</Link></div>
      </div>
    </header>

    <div className="mx-auto max-w-[1600px] px-5 py-7 md:px-8 md:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><p className="max-w-3xl text-sm leading-6 text-slate-600">Las tres alternativas parten del catálogo visual que te gustó. Los gráficos usan tu inventario real; el selector de moneda evita comparar precios en USD con precios en RD$. Esta vista es solo una comparación y no guarda cambios.</p>{seleccionado && <p role="status" className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-900">Marcaste: {modelos.find((m) => m.id === seleccionado)?.titulo}</p>}</div>

      {cargando ? <div className="rounded-3xl bg-white p-12 text-center text-sm text-slate-500">Cargando propiedades reales…</div> : propiedades.length === 0 ? <div className="rounded-3xl bg-white p-12 text-center text-sm text-slate-500">No hay propiedades disponibles para la comparación.</div> : <div className="grid items-start gap-6 xl:grid-cols-3">
        {modelos.map((modelo, indice) => <article key={modelo.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_45px_-30px_rgba(15,23,42,.35)]">
          <div className="px-5 pb-4 pt-5"><div className="flex items-center justify-between"><span className="rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: modelo.acento, backgroundColor: `${modelo.acento}12` }}>Modelo 3.{indice + 1}</span><span className="text-[10px] text-slate-400">{modelo.etiqueta}</span></div><h2 className="mt-3 text-lg font-semibold tracking-tight">{modelo.titulo}</h2><p className="mt-1 min-h-[42px] text-xs leading-5 text-slate-500">{modelo.resumen}</p></div>

          <div className="mx-4 mb-4 overflow-hidden rounded-[22px] bg-[#f7f6f3]">
            <div className={`relative overflow-hidden p-5 text-white ${modelo.id === "dona" ? "bg-[#263b56]" : modelo.id === "prismas" ? "bg-[#352d28]" : "bg-[#183c32]"}`}>
              <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/10" /><div className="absolute -right-5 -top-7 h-24 w-24 rounded-full border border-white/10" />
              <div className="relative flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/60">Portafolio en {moneda}</p><p className="mt-2 text-3xl font-bold tracking-tight">{formatoMoneda(suma, moneda)}</p><p className="mt-1 text-[10px] text-white/60">Monto separado por moneda</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right"><p className="text-lg font-bold">{propiedades.length}</p><p className="text-[9px] text-white/65">inmuebles</p></div></div>
              <div className="relative mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px]">{disponibles} disponibles</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px]">{propiedades.filter((p) => p.operacion === "Alquiler").length} alquileres</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px]">{propiedades.filter((p) => p.operacion === "Venta").length} ventas</span></div>
            </div>

            <div className="p-4">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-2"><div><p className="text-[11px] font-bold text-slate-800">{modelo.id === "isometrico" ? "Composición del inventario" : modelo.id === "dona" ? "Estado de las propiedades" : "Comparación de precios"}</p><p className="mt-1 text-[9px] text-slate-500">{modelo.id === "prismas" ? `Valores en ${moneda} · 5 principales` : "Datos actuales · sin promedios combinados"}</p></div><span className="rounded-lg px-2 py-1 text-[9px] font-bold" style={{ color: modelo.acento, backgroundColor: `${modelo.acento}12` }}>3D</span></div>
                {modelo.id === "isometrico" && <EstadoIsometrico propiedades={propiedades} />}
                {modelo.id === "dona" && <DonaRelieve propiedades={propiedades} />}
                {modelo.id === "prismas" && <ColumnasPrisma propiedades={propiedades} moneda={moneda} />}
              </section>

              {modelo.id !== "prismas" && <section className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="mb-3 flex items-start justify-between"><div><p className="text-[11px] font-bold text-slate-800">Precios por inmueble</p><p className="mt-1 text-[9px] text-slate-500">{moneda} · columnas con caras y profundidad</p></div><span className="text-[9px] font-semibold text-slate-400">{moneda}</span></div><ColumnasPrisma propiedades={propiedades} moneda={moneda} /></section>}

              <section className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"><div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold text-slate-800">Propiedades destacadas</p><span className="text-[9px] text-slate-400">foto + características</span></div><FilasPropiedades propiedades={propiedades} /></section>
            </div>
          </div>

          <div className="px-4 pb-4"><button onClick={() => setSeleccionado(modelo.id)} className="w-full rounded-xl border py-3 text-xs font-semibold transition hover:bg-slate-50" style={{ borderColor: `${modelo.acento}55`, color: modelo.acento }}>{seleccionado === modelo.id ? "✓ Modelo marcado" : `Elegir modelo 3.${indice + 1}`}</button></div>
        </article>)}
      </div>}

      <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500"><span>{propiedades.length} propiedades cargadas · no se alteró el inventario</span><span>Elige 3.1, 3.2 o 3.3 y adaptaré el dashboard completo a ese estilo.</span></footer>
    </div>
  </main>;
}
