
"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import FormularioPropiedad from "@/components/FormularioPropiedad";
import { Propiedad } from "@/types/propiedad";
import {
  obtenerPropiedades,
  obtenerPropiedadesServidor,
  escucharCambios,
  guardarPropiedades,
} from "@/lib/Propiedades";

const dinero = (valor: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valor);

export default function DashboardPage() {
  const propiedades = useSyncExternalStore(
    escucharCambios,
    obtenerPropiedades,
    obtenerPropiedadesServidor
  );

  const [modalAbierto, setModalAbierto] = useState(false);
  const [propiedadEditar, setPropiedadEditar] = useState<Propiedad | undefined>();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  // ESTADÍSTICAS
  const total = propiedades.length;

  const disponibles = propiedades.filter(
    (p) => p.estado === "Disponible"
  ).length;

  const reservadas = propiedades.filter(
    (p) => p.estado === "Reservada"
  ).length;

  const vendidas = propiedades.filter(
    (p) => p.estado === "Vendida"
  ).length;

  const valorTotal = propiedades.reduce(
    (suma, p) => suma + p.precio,
    0
  );

  const precioPromedio = total > 0 ? valorTotal / total : 0;

  const porcentaje = (cantidad: number) =>
    total > 0 ? Math.round((cantidad / total) * 100) : 0;

  // BÚSQUEDA Y FILTROS
  const propiedadesFiltradas = useMemo(() => {
    return [...propiedades]
      .filter((p) => {
        const texto = `${p.nombre} ${p.ubicacion}`.toLowerCase();

        const coincideBusqueda = texto.includes(
          busqueda.toLowerCase()
        );

        const coincideEstado =
          filtroEstado === "Todos" || p.estado === filtroEstado;

        return coincideBusqueda && coincideEstado;
      })
      .reverse();
  }, [propiedades, busqueda, filtroEstado]);

  // FUNCIONES CRUD
  function registrarPropiedad(nueva: Propiedad) {
    guardarPropiedades([...propiedades, nueva]);
    setModalAbierto(false);
  }

  function editarPropiedad(actualizada: Propiedad) {
    guardarPropiedades(
      propiedades.map((p) =>
        p.id === actualizada.id ? actualizada : p
      )
    );

    setModalAbierto(false);
    setPropiedadEditar(undefined);
  }

  function eliminarPropiedad(id: number) {
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar esta propiedad?"
    );

    if (!confirmar) return;

    guardarPropiedades(
      propiedades.filter((p) => p.id !== id)
    );
  }

  function abrirEdicion(propiedad: Propiedad) {
    setPropiedadEditar(propiedad);
    setModalAbierto(true);
  }

  function abrirRegistro() {
    setPropiedadEditar(undefined);
    setModalAbierto(true);
  }

  // COLORES DE ESTADO
  function colorEstado(estado: string) {
    if (estado === "Disponible") {
      return "bg-[#EAE6DF] text-[#555F4D]";
    }

    if (estado === "Reservada") {
      return "bg-[#E2DFD5] text-[#777F70]";
    }

    return "bg-[#E7E6DF] text-[#77786F]";
  }

  const maxPrecio = Math.max(
    ...propiedades.map((p) => p.precio),
    1
  );

  return (
    <main className="min-h-screen bg-[#F4F1EB] text-[#292B27]">

      <div className="flex min-h-screen">

        {/* MENÚ LATERAL */}
        <aside className="fixed inset-y-0 left-0 z-40 flex w-[64px] flex-col items-center bg-[#292B27] py-4 text-[#F4F1EB] md:w-[76px]">

          <Link
            href="/"
            title="Nexo Realty"
            className="mb-8 flex h-10 w-10 items-center justify-center border border-[#777F70] font-serif text-2xl text-[#EAE6DF]"
          >
            N
          </Link>

          <div className="flex flex-1 flex-col items-center gap-3">

            <div
              title="Dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#777F70] text-lg text-white"
            >
              ◫
            </div>

            <button
              onClick={abrirRegistro}
              title="Agregar propiedad"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-white/65 transition hover:bg-[#777F70] hover:text-white"
            >
              +
            </button>

            <Link
              href="/"
              title="Página principal"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-white/65 transition hover:bg-[#777F70] hover:text-white"
            >
              ⌂
            </Link>

            <div className="my-2 h-px w-7 bg-white/15" />

            <button
              title="Propiedades"
              onClick={() =>
                document
                  .getElementById("propiedades")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-white/65 transition hover:bg-[#777F70] hover:text-white"
            >
              ▤
            </button>

            <button
              title="Estadísticas"
              onClick={() =>
                document
                  .getElementById("estadisticas")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-white/65 transition hover:bg-[#777F70] hover:text-white"
            >
              ▥
            </button>

          </div>

          <Link
            href="/"
            title="Volver a la página principal"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-white/65 transition hover:bg-[#777F70] hover:text-white"
          >
            ↩
          </Link>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <div className="ml-[64px] min-w-0 flex-1 md:ml-[76px]">

          {/* BARRA SUPERIOR */}
          <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between border-b border-[#292B27]/10 bg-[#F4F1EB]/95 px-4 backdrop-blur md:px-7">

            <div className="flex items-center gap-5">
              <h1 className="font-serif text-xl text-[#292B27] md:text-2xl">
                Analytics
              </h1>

              <span className="hidden rounded-full bg-[#EAE6DF] px-3 py-1.5 text-[10px] text-[#77786F] sm:inline-block">
                Nexo Realty · Panel general
              </span>
            </div>

            <div className="flex items-center gap-2 md:gap-4">

              <span className="hidden text-xs text-[#77786F] sm:block">
                Administración
              </span>

              <Link
                href="/"
                className="border border-[#292B27] px-3 py-2 text-[11px] font-medium text-[#292B27] transition hover:bg-[#292B27] hover:text-white md:px-4"
              >
                ← Página principal
              </Link>

              <div className="flex h-8 w-8 items-center justify-center border border-[#777F70] font-serif text-sm text-[#777F70]">
                N
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-4 p-4 md:p-6">

            {/* ENCABEZADO */}
            <section className="flex flex-wrap items-end justify-between gap-4">

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#858B7C]">
                  Administración inmobiliaria
                </p>

                <h2 className="font-serif text-2xl text-[#292B27] md:text-3xl">
                  Resumen de tu negocio
                </h2>
              </div>

              <button
                onClick={abrirRegistro}
                className="bg-[#292B27] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#777F70]"
              >
                + Agregar propiedad
              </button>

            </section>

            {/* PRIMERA FILA: TRES PANELES */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr_0.85fr]">

              {/* VALOR DEL PORTAFOLIO */}
              <div className="relative min-h-[230px] overflow-hidden bg-[#292B27] p-5 text-[#F4F1EB] shadow-sm">

                <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full border border-white/10" />

                <div className="absolute -right-2 -top-4 h-28 w-28 rounded-full border border-white/10" />

                <div className="relative">

                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#B8B9AA]">
                    Valor del portafolio
                  </p>

                  <h3 className="mt-4 font-serif text-3xl md:text-4xl">
                    {dinero(valorTotal)}
                  </h3>

                  <p className="mt-2 text-[10px] text-white/55">
                    Valor registrado de todas las propiedades
                  </p>

                  <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">

                    <div>
                      <p className="font-serif text-xl">{total}</p>
                      <p className="mt-1 text-[9px] text-white/55">Total</p>
                    </div>

                    <div>
                      <p className="font-serif text-xl">{disponibles}</p>
                      <p className="mt-1 text-[9px] text-white/55">Disponibles</p>
                    </div>

                    <div>
                      <p className="font-serif text-xl">{vendidas}</p>
                      <p className="mt-1 text-[9px] text-white/55">Vendidas</p>
                    </div>

                  </div>
                </div>
              </div>

              {/* PRECIO PROMEDIO Y GRÁFICO CIRCULAR */}
              <div className="border border-[#292B27]/10 bg-[#EAE6DF] p-5">

                <div className="flex items-start justify-between">

                  <div>
                    <p className="text-[10px] text-[#77786F]">
                      Precio promedio
                    </p>

                    <h3 className="mt-1 font-serif text-2xl text-[#292B27]">
                      {dinero(precioPromedio)}
                    </h3>
                  </div>

                  <span className="flex h-8 w-8 items-center justify-center border border-[#777F70]/30 text-sm text-[#777F70]">
                    $
                  </span>

                </div>

                {/* GRÁFICO CIRCULAR CON COLORES VIVOS */}
                <div className="my-4 flex items-center justify-center">

                  <div
                    className="relative flex h-32 w-32 items-center justify-center rounded-full"
                    style={{
                      background:
                        total === 0
                          ? "#DADBD2"
                          : `conic-gradient(
                              #687D50 0% ${porcentaje(disponibles)}%,
                              #D5A342 ${porcentaje(disponibles)}% ${porcentaje(disponibles) + porcentaje(reservadas)}%,
                              #C66F53 ${porcentaje(disponibles) + porcentaje(reservadas)}% 100%
                            )`,
                    }}
                  >

                    <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-[#EAE6DF]">

                      <span className="font-serif text-2xl text-[#292B27]">
                        {total}
                      </span>

                      <span className="text-[9px] text-[#77786F]">
                        Inmuebles
                      </span>

                    </div>
                  </div>
                </div>

                {/* CONTADORES */}
                <div className="flex justify-between gap-2 border-t border-[#292B27]/10 pt-3">

                  <div>
                    <p className="text-[9px] text-[#77786F]">Reservadas</p>
                    <p className="mt-1 text-sm font-semibold text-[#292B27]">{reservadas}</p>
                  </div>

                  <div>
                    <p className="text-[9px] text-[#77786F]">Disponibles</p>
                    <p className="mt-1 text-sm font-semibold text-[#292B27]">{disponibles}</p>
                  </div>

                  <div>
                    <p className="text-[9px] text-[#77786F]">Vendidas</p>
                    <p className="mt-1 text-sm font-semibold text-[#292B27]">{vendidas}</p>
                  </div>

                </div>
              </div>

              {/* INDICADORES */}
              <div className="grid grid-rows-2 gap-4">

                {/* DISPONIBLES */}
                <div className="border border-[#292B27]/10 bg-[#EAE6DF] p-5">

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#77786F]">
                      Propiedades disponibles
                    </p>

                    <span className="flex h-8 w-8 items-center justify-center border border-[#687D50]/30 text-sm text-[#687D50]">
                      ◇
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between">
                    <p className="font-serif text-3xl text-[#292B27]">
                      {disponibles}
                    </p>

                    <p className="text-[10px] text-[#77786F]">
                      {porcentaje(disponibles)}% del inventario
                    </p>
                  </div>

                  <div className="mt-3 h-1.5 bg-[#D9D9D0]">
                    <div
                      className="h-full bg-[#687D50]"
                      style={{ width: `${porcentaje(disponibles)}%` }}
                    />
                  </div>
                </div>

                {/* RESERVADAS */}
                <div className="border border-[#292B27]/10 bg-[#EAE6DF] p-5">

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#77786F]">
                      Propiedades reservadas
                    </p>

                    <span className="flex h-8 w-8 items-center justify-center border border-[#D5A342]/30 text-sm text-[#B98A42]">
                      ◷
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between">
                    <p className="font-serif text-3xl text-[#292B27]">
                      {reservadas}
                    </p>

                    <p className="text-[10px] text-[#77786F]">
                      {porcentaje(reservadas)}% del inventario
                    </p>
                  </div>

                  <div className="mt-3 h-1.5 bg-[#D9D9D0]">
                    <div
                      className="h-full bg-[#D5A342]"
                      style={{ width: `${porcentaje(reservadas)}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SEGUNDA FILA: LISTADO Y GRÁFICO */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">

              {/* PROPIEDADES RECIENTES */}
              <div
                id="propiedades"
                className="overflow-hidden border border-[#292B27]/10 bg-[#F4F1EB]"
              >

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292B27]/10 px-5 py-4">

                  <div>
                    <h3 className="font-serif text-lg text-[#292B27]">
                      Propiedades recientes
                    </h3>

                    <p className="mt-1 text-[10px] text-[#77786F]">
                      Consulta y administra tu inventario
                    </p>
                  </div>

                  <button
                    onClick={abrirRegistro}
                    className="bg-[#292B27] px-3 py-2 text-[10px] font-medium text-white transition hover:bg-[#777F70]"
                  >
                    + Agregar
                  </button>
                </div>

                {/* BUSCADOR */}
                <div className="flex flex-col gap-2 border-b border-[#292B27]/10 p-3 sm:flex-row">

                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar propiedad o ubicación..."
                    className="min-w-0 flex-1 border border-[#292B27]/10 bg-transparent px-3 py-2 text-[11px] outline-none placeholder:text-[#99998F] focus:border-[#777F70]"
                  />

                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="border border-[#292B27]/10 bg-[#F4F1EB] px-3 py-2 text-[11px] outline-none focus:border-[#777F70]"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Disponible">Disponibles</option>
                    <option value="Reservada">Reservadas</option>
                    <option value="Vendida">Vendidas</option>
                  </select>
                </div>

                {/* LISTA DE PROPIEDADES */}
                <div className="divide-y divide-[#292B27]/10">

                  {propiedadesFiltradas.length === 0 ? (

                    <p className="p-10 text-center text-xs text-[#77786F]">
                      No se encontraron propiedades.
                    </p>

                  ) : (

                    propiedadesFiltradas.slice(0, 6).map((p, i) => (

                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-[#EAE6DF]"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center border border-[#777F70]/20 font-serif text-sm ${
                              i % 2 === 0
                                ? "bg-[#EAE6DF] text-[#777F70]"
                                : "bg-[#E5E3DA] text-[#555F4D]"
                            }`}
                          >
                            {p.nombre.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-[#292B27]">
                              {p.nombre}
                            </p>

                            <p className="mt-1 truncate text-[9px] text-[#77786F]">
                              {p.ubicacion}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">

                          <div className="text-right">
                            <p className="text-[11px] font-semibold text-[#292B27]">
                              {dinero(p.precio)}
                            </p>

                            <span
                              className={`mt-1 inline-block px-2 py-0.5 text-[9px] ${colorEstado(
                                p.estado
                              )}`}
                            >
                              {p.estado}
                            </span>
                          </div>

                          <button
                            onClick={() => abrirEdicion(p)}
                            title="Editar"
                            className="p-1.5 text-xs text-[#777F70] transition hover:bg-[#EAE6DF] hover:text-[#292B27]"
                          >
                            ✎
                          </button>

                          <button
                            onClick={() => eliminarPropiedad(p.id)}
                            title="Eliminar"
                            className="p-1.5 text-sm text-[#77786F] transition hover:bg-[#EAE6DF] hover:text-[#292B27]"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-[#292B27]/10 px-4 py-3 text-[9px] text-[#77786F]">
                  {propiedadesFiltradas.length} propiedades encontradas
                </div>
              </div>

              {/* GRÁFICO DE PRECIOS */}
              <div
                id="estadisticas"
                className="border border-[#292B27]/10 bg-[#F4F1EB] p-5"
              >

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="font-serif text-lg text-[#292B27]">
                      Precio de inmuebles
                    </h3>

                    <p className="mt-1 text-[10px] text-[#77786F]">
                      Comparación del inventario
                    </p>
                  </div>

                  <span className="border border-[#777F70]/30 px-2.5 py-2 text-sm text-[#777F70]">
                    ↗
                  </span>
                </div>

                {/* GRÁFICO DE BARRAS CON COLORES VIVOS */}
                <div className="mt-6 flex h-[190px] items-end gap-2 border-b border-[#292B27]/10 px-1">

                  {propiedades.slice(0, 8).map((p, i) => (

                    <div
                      key={p.id}
                      className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >

                      <span className="whitespace-nowrap text-[8px] text-[#77786F] opacity-0 transition group-hover:opacity-100">
                        {dinero(p.precio)}
                      </span>

                      <div
                        title={`${p.nombre}: ${dinero(p.precio)}`}
                        className={`w-full max-w-8 rounded-t-sm transition-opacity group-hover:opacity-70 ${
                          [
                            "bg-[#687D50]",
                            "bg-[#D5A342]",
                            "bg-[#C66F53]",
                            "bg-[#8C9B69]",
                            "bg-[#B98A42]",
                          ][i % 5]
                        }`}
                        style={{
                          height: `${Math.max(
                            (p.precio / maxPrecio) * 125,
                            8
                          )}px`,
                        }}
                      />

                      <span className="w-full truncate text-center text-[8px] text-[#77786F]">
                        {p.nombre}
                      </span>

                    </div>
                  ))}

                  {total === 0 && (
                    <p className="w-full pb-16 text-center text-xs text-[#77786F]">
                      Registra propiedades para ver el gráfico.
                    </p>
                  )}
                </div>

                {/* VALOR TOTAL */}
                <div className="mt-5 bg-[#EAE6DF] p-4">

                  <p className="text-[10px] text-[#77786F]">
                    Valor total registrado
                  </p>

                  <p className="mt-1 font-serif text-2xl text-[#292B27]">
                    {dinero(valorTotal)}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between text-[10px] text-[#77786F]">

                  <span>Precio promedio</span>

                  <span className="font-semibold text-[#292B27]">
                    {dinero(precioPromedio)}
                  </span>
                </div>
              </div>
            </section>

            {/* PIE */}
            <footer className="py-4 text-center text-[9px] tracking-[0.2em] text-[#77786F]">
              NEXO REALTY · ESPACIOS CON IDENTIDAD
            </footer>

          </div>
        </div>
      </div>

      {/* MODAL DE REGISTRO Y EDICIÓN */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#292B27]/60 p-4 backdrop-blur-sm">

          <div className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto bg-[#F4F1EB] shadow-2xl">

            <FormularioPropiedad
              key={propiedadEditar?.id ?? "nueva"}
              propiedadEditar={propiedadEditar}
              onGuardar={
                propiedadEditar
                  ? editarPropiedad
                  : registrarPropiedad
              }
              onCerrar={() => {
                setModalAbierto(false);
                setPropiedadEditar(undefined);
              }}
            />

          </div>
        </div>
      )}

    </main>
  );
}
