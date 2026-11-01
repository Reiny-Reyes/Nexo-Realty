

"use client";

import { useState, useSyncExternalStore } from "react";
import Tarjeta from "@/components/Tarjeta";
import FormularioPropiedad from "@/components/FormularioPropiedad";
import type { Propiedad } from "@/types/propiedad";

import {
  escucharCambios,
  obtenerPropiedades,
  obtenerPropiedadesServidor,
  guardarPropiedades,
} from "@/lib/Propiedades";


const formatoPrecio = (precio: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(precio);

  

export default function Home() {
  const propiedades = useSyncExternalStore(
    escucharCambios,
    obtenerPropiedades,
    obtenerPropiedadesServidor
  );
  

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [modalAbierto, setModalAbierto] = useState(false);

  const disponibles = propiedades.filter(
    (p) => p.estado === "Disponible"
  ).length;

  const reservadas = propiedades.filter(
    (p) => p.estado === "Reservada"
  ).length;

  const vendidas = propiedades.filter(
    (p) => p.estado === "Vendida"
  ).length;

  const propiedadesFiltradas = propiedades.filter((p) => {
    const coincideBusqueda =
      `${p.nombre} ${p.ubicacion}`
        .toLowerCase()
        .includes(busqueda.toLowerCase());

    const coincideEstado =
      filtro === "Todas" || p.estado === filtro;

    return coincideBusqueda && coincideEstado;
  });

  const [propiedadEditar, setPropiedadEditar] =
  useState<Propiedad | undefined>(undefined);

  function editarPropiedad(datos: Omit<Propiedad, "id">) {
  if (!propiedadEditar) return;

  const propiedadesActualizadas = propiedades.map((p) =>
    p.id === propiedadEditar.id
      ? { ...p, ...datos }
      : p
  );

  guardarPropiedades(propiedadesActualizadas);
  setPropiedadEditar(undefined);
  setModalAbierto(false);
}

  function registrarPropiedad(datos: Omit<Propiedad, "id">) {
    const nuevaPropiedad: Propiedad = {
      id: Date.now(),
      ...datos,
    };

    guardarPropiedades([...propiedades, nuevaPropiedad]);
    setModalAbierto(false);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="w-full shrink-0 bg-slate-950 p-5 text-white md:min-h-screen md:w-64">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl font-bold">
            N
          </div>

          <div>
            <h1 className="text-lg font-bold">Nexo Realty</h1>
            <p className="text-xs text-slate-400">
              Gestión inmobiliaria
            </p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Menú principal
        </p>

        <nav className="space-y-2">
          <a
            href="#inicio"
            className="flex items-center gap-3 rounded-xl bg-emerald-500/15 px-4 py-3 font-medium text-emerald-400"
          >
            <span>▦</span> Dashboard
          </a>

          <a
            href="#propiedades"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
          >
            <span>⌂</span> Propiedades
          </a>
        </nav>

        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="font-semibold">Panel de control</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Administra tus inmuebles y consulta su estado
            desde un solo lugar.
          </p>
        </div>
      </aside>

      <main
        id="inicio"
        className="min-w-0 flex-1 p-5 md:p-8 lg:p-10"
      >
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm text-slate-500">
              Gestión / Dashboard
            </p>

            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Panel inmobiliario
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Administra y supervisa tu cartera de propiedades.
            </p>
          </div>

          <button
            onClick={() => {
              setPropiedadEditar(undefined);
              setModalAbierto(true)
            }}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            + Nueva propiedad
          </button>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tarjeta
            titulo="Total propiedades"
            valor={propiedades.length}
            detalle="Inmuebles registrados"
            simbolo="⌂"
          />

          <Tarjeta
            titulo="Disponibles"
            valor={disponibles}
            detalle="Listas para la venta"
            simbolo="✓"
          />

          <Tarjeta
            titulo="Reservadas"
            valor={reservadas}
            detalle="En proceso de reserva"
            simbolo="◷"
          />

          <Tarjeta
            titulo="Vendidas"
            valor={vendidas}
            detalle="Ventas completadas"
            simbolo="↗"
          />
        </section>

        <section
          id="propiedades"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <h3 className="text-lg font-bold">
                Mis propiedades
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Consulta y administra tus inmuebles.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar propiedad..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 sm:w-56"
              />

              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                <option value="Todas">Todos los estados</option>
                <option value="Disponible">Disponible</option>
                <option value="Reservada">Reservada</option>
                <option value="Vendida">Vendida</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Propiedad</th>
                  <th className="px-6 py-4">Características</th>
                  <th className="px-6 py-4">Precio</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {propiedadesFiltradas.map((p) => (
                  <tr
                    key={p.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-800">
                        {p.nombre}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {p.ubicacion}
                      </p>
                    </td>

                    <td className="px-6 py-5 text-slate-600">
                      <p>{p.habitaciones} habitaciones</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {p.metros} m²
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-6 py-5 font-semibold">
                      {formatoPrecio(p.precio)}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          p.estado === "Disponible"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.estado === "Reservada"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>

                   <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setPropiedadEditar(p);
                          setModalAbierto(true);
                        }}
                        className="font-medium text-emerald-600 hover:text-emerald-800"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => eliminarPropiedad(p.id)}
                        className="font-medium text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                  </tr>
                ))}

                {propiedadesFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No se encontraron propiedades.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
            Mostrando {propiedadesFiltradas.length} de{" "}
            {propiedades.length} propiedades
          </div>
        </section>
      </main>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3
                  id="titulo-modal"
                  className="text-xl font-bold"
                >
                  {propiedadEditar ? "Editar propiedad" : "Nueva propiedad"}
                </h3>

               <p className="mt-1 text-sm text-slate-500">
                {propiedadEditar
                  ? "Modifica los datos que necesites."
                  : "Completa los datos del inmueble."}
              </p>
              </div>

              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar formulario"
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <FormularioPropiedad
              key={propiedadEditar?.id ?? "nueva"}
              propiedadEditar={propiedadEditar}
              onGuardar={
              propiedadEditar ? editarPropiedad : registrarPropiedad
              }
              onCerrar={() => {
                setModalAbierto(false);
                setPropiedadEditar(undefined);
              }}
            />
          </div>
        </div>
      )}
    </div>
    
  );
}
