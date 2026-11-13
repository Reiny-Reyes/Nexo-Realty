
// El panel requiere interacciones del navegador para filtros, formularios y operaciones CRUD.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormularioPropiedad from "@/components/FormularioPropiedad";
import AdministrarUsuarios from "@/components/AdministrarUsuarios";
import CambiarContrasena from "@/components/CambiarContrasena";
import { FotoInventario, GraficoEstados3D, GraficoPrismasPrecios } from "@/components/dashboard/Visualizaciones3D";
import type { Propiedad } from "@/types/propiedad";
import { formatoMoneda } from "@/lib/format";

// Presenta importes con formato de moneda USD.
const dinero = (valor: number, moneda: Propiedad["moneda"] = "USD") => formatoMoneda(valor, moneda);

export default function DashboardPage() {
  const router = useRouter();
  // Estados para inventario, carga, mensajes, modal, edición y filtros del panel.
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [propiedadEditar, setPropiedadEditar] = useState<
    Propiedad | undefined
  >();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroOperacion, setFiltroOperacion] = useState("Todas");
  const [monedaGrafico, setMonedaGrafico] = useState<Propiedad["moneda"]>("USD");
  const [precioMinimo, setPrecioMinimo] = useState("");
  const [precioMaximo, setPrecioMaximo] = useState("");
  const [habitacionesMinimas, setHabitacionesMinimas] = useState("");
  const [orden, setOrden] = useState("recientes");
  const [pagina, setPagina] = useState(1);
  const propiedadesPorPagina = 8;
  const [rol, setRol] = useState<"admin" | "viewer" | null>(null);
  const esAdministrador = rol === "admin";
  const [usuariosAbierto, setUsuariosAbierto] = useState(false);
  const [contrasenaAbierta, setContrasenaAbierta] = useState(false);
  const [cambioObligatorio, setCambioObligatorio] = useState(false);
  const [consultas, setConsultas] = useState<Array<{ id: number; propiedad_nombre: string; nombre: string; telefono: string; email: string | null; mensaje: string | null; estado: string; created_at: string }>>([]);
  const [visitas30d, setVisitas30d] = useState(0);
  const [consultasNuevas, setConsultasNuevas] = useState(0);
  const [conversion, setConversion] = useState(0);
  const [masVistas, setMasVistas] = useState<Array<{ id: number; nombre: string; vistas: number }>>([]);
  const [historial, setHistorial] = useState<Array<{ id: number; propiedad_nombre: string; username: string; accion: string; created_at: string }>>([]);

  useEffect(() => {
    let activo = true;
    async function actualizarSesion() {
      try {
        const respuesta = await fetch("/api/auth/session", { cache: "no-store" });
        if (!respuesta.ok) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
        const sesion: { rol: "admin" | "viewer"; debeCambiarContrasena: boolean } = await respuesta.json();
        if (!activo) return;
        setRol(sesion.rol);
        if (sesion.debeCambiarContrasena) {
          setCambioObligatorio(true);
          setContrasenaAbierta(true);
        }
      } catch (fallo) {
        if (!activo) return;
        setError(
          fallo instanceof Error
            ? fallo.message
            : "No se pudo verificar la sesión."
        );
        router.replace("/login");
      }
    }

    actualizarSesion();
    const intervalo = window.setInterval(actualizarSesion, 60_000);
    window.addEventListener("focus", actualizarSesion);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizarSesion);
    };
  }, [router]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function cambiarEstadoConsulta(id: number, estado: string) {
    const respuesta = await fetch(`/api/consultas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!respuesta.ok) {
      const resultado = await respuesta.json().catch(() => ({}));
      notificar(resultado.mensaje || "No se pudo actualizar la consulta.");
      return;
    }
    setConsultas((actuales) => actuales.map((consulta) => consulta.id === id ? { ...consulta, estado } : consulta));
    setConsultasNuevas((actual) => Math.max(0, actual - (consultas.find((c) => c.id === id)?.estado === "Nueva" && estado !== "Nueva" ? 1 : 0)));
    notificar("Estado de la consulta actualizado.");
  }

  function notificar(mensaje: string) {
    setNotificacion(mensaje);
    window.setTimeout(() => setNotificacion(""), 3500);
  }

  // CARGAR PROPIEDADES DESDE POSTGRESQL
  useEffect(() => {
    let activo = true;

    async function cargarPropiedades() {
      try {
        setCargando(true);
        setError("");

        const respuesta = await fetch("/api/propiedades", {
          cache: "no-store",
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje || "No se pudieron cargar las propiedades."
          );
        }

        if (activo) {
          setPropiedades(resultado);
        }
      } catch (error) {
        if (activo) {
          setError(
            error instanceof Error
              ? error.message
              : "Ocurrió un error al cargar las propiedades."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarPropiedades();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    Promise.all([
      fetch("/api/consultas", { cache: "no-store" }).then((r) => r.ok ? r.json() : []),
      fetch("/api/analytics", { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/propiedades/historial", { cache: "no-store" }).then((r) => r.ok ? r.json() : []),
    ]).then(([lista, metricas, eventos]) => {
      if (!activo) return;
      setConsultas(lista);
      setVisitas30d(metricas?.vistas ?? 0);
      setConsultasNuevas(metricas?.consultasNuevas ?? 0);
      setConversion(metricas?.conversionPorcentaje ?? 0);
      setMasVistas(metricas?.masVistas ?? []);
      setHistorial(eventos);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, []);

  // Calcula conteos, valor total, promedio y porcentajes a partir de las propiedades cargadas.
  const total = propiedades.length;

  const disponibles = propiedades.filter(
    (p) => p.estado === "Disponible"
  ).length;

  const reservadas = propiedades.filter(
    (p) => p.estado === "Reservada"
  ).length;

  const valorTotal = propiedades.reduce(
    (suma, p) => suma + (p.moneda === "USD" ? Number(p.precio) : 0),
    0
  );
  const valorTotalBOB = propiedades.reduce((suma, p) => suma + (p.moneda === "BOB" ? Number(p.precio) : 0), 0);

  // useMemo vuelve a filtrar solo cuando cambia la lista o alguno de los filtros.
  const propiedadesFiltradas = useMemo(() => {
    return propiedades.filter((p) => {
      const texto = `${p.nombre} ${p.ubicacion}`.toLowerCase();

      const coincideBusqueda = texto.includes(
        busqueda.toLowerCase()
      );

      const coincideEstado =
        filtroEstado === "Todos" || p.estado === filtroEstado;
      const coincideTipo = filtroTipo === "Todos" || (p.tipo ?? "Sin especificar") === filtroTipo;
      const coincideOperacion = filtroOperacion === "Todas" || p.operacion === filtroOperacion;
      const coincidePrecioMinimo = precioMinimo === "" || Number(p.precio) >= Number(precioMinimo);
      const coincidePrecioMaximo = precioMaximo === "" || Number(p.precio) <= Number(precioMaximo);
      const coincideHabitaciones = habitacionesMinimas === "" || p.habitaciones >= Number(habitacionesMinimas);

      return coincideBusqueda && coincideEstado && coincideTipo && coincideOperacion && coincidePrecioMinimo && coincidePrecioMaximo && coincideHabitaciones;
    }).sort((a, b) => {
      if (orden === "precio-menor") return Number(a.precio) - Number(b.precio);
      if (orden === "precio-mayor") return Number(b.precio) - Number(a.precio);
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      return b.id - a.id;
    });
  }, [propiedades, busqueda, filtroEstado, filtroTipo, filtroOperacion, precioMinimo, precioMaximo, habitacionesMinimas, orden]);

  const paginas = Math.max(1, Math.ceil(propiedadesFiltradas.length / propiedadesPorPagina));
  const paginaActual = Math.min(pagina, paginas);
  const propiedadesPaginadas = propiedadesFiltradas.slice(
    (paginaActual - 1) * propiedadesPorPagina,
    paginaActual * propiedadesPorPagina
  );

  // Envía una propiedad nueva a POST /api/propiedades y sincroniza la lista en pantalla.
  async function registrarPropiedad(nueva: Omit<Propiedad, "id">) {
    try {
      setError("");

      const respuesta = await fetch("/api/propiedades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nueva),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || "No se pudo registrar la propiedad."
        );
      }

      const propiedadCreada: Propiedad = resultado;

      setPropiedades((actuales) => [
        propiedadCreada,
        ...actuales,
      ]);

      setModalAbierto(false);
      setPropiedadEditar(undefined);
      notificar("Propiedad registrada correctamente.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Error al registrar la propiedad."
      );
      throw error;
    }
  }

  // Envía los cambios a PUT /api/propiedades/[id] y reemplaza el registro actualizado.
  async function editarPropiedad(
    actualizada: Omit<Propiedad, "id">
  ) {
    if (!propiedadEditar) return;

    try {
      setError("");

      const respuesta = await fetch(
        `/api/propiedades/${propiedadEditar.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(actualizada),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || "No se pudo actualizar la propiedad."
        );
      }

      const propiedadActualizada: Propiedad = resultado;

      setPropiedades((actuales) =>
        actuales.map((p) =>
          p.id === propiedadActualizada.id
            ? propiedadActualizada
            : p
        )
      );

      setModalAbierto(false);
      setPropiedadEditar(undefined);
      notificar("Cambios guardados correctamente.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Error al actualizar la propiedad."
      );
      throw error;
    }
  }

  // Pide confirmación antes de DELETE y quita de la lista el registro eliminado.
  async function eliminarPropiedad(id: number, nombre: string) {
    const confirmar = window.confirm(
      `¿Eliminar “${nombre}”? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setError("");

      const respuesta = await fetch(
        `/api/propiedades/${id}`,
        {
          method: "DELETE",
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || "No se pudo eliminar la propiedad."
        );
      }

      setPropiedades((actuales) =>
        actuales.filter((p) => p.id !== id)
      );
      notificar("Propiedad eliminada.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Error al eliminar la propiedad."
      );
    }
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

            {esAdministrador && (
              <button
                onClick={abrirRegistro}
                title="Agregar propiedad"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-white/65 transition hover:bg-[#777F70] hover:text-white"
              >
                +
              </button>
            )}

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
                {rol === "admin" ? "Administrador" : rol === "viewer" ? "Solo lectura" : "Verificando acceso..."}
              </span>

              <Link
                href="/"
                className="border border-[#292B27] px-3 py-2 text-[11px] font-medium text-[#292B27] transition hover:bg-[#292B27] hover:text-white md:px-4"
              >
                ← Página principal
              </Link>

              <button
                type="button"
                onClick={cerrarSesion}
                className="border border-[#292B27]/15 px-3 py-2 text-[11px] text-[#292B27] transition hover:bg-[#EAE6DF]"
              >
                Salir
              </button>
              <button
                type="button"
                onClick={() => setContrasenaAbierta(true)}
                className="border border-[#292B27]/15 px-3 py-2 text-[11px] text-[#292B27] transition hover:bg-[#EAE6DF]"
              >
                Mi contraseña
              </button>
              {esAdministrador && (
                <button
                  type="button"
                  onClick={() => setUsuariosAbierto(true)}
                  className="border border-[#292B27] px-3 py-2 text-[11px] text-[#292B27] transition hover:bg-[#292B27] hover:text-white"
                >
                  Usuarios
                </button>
              )}

              <div className="flex h-8 w-8 items-center justify-center border border-[#777F70] font-serif text-sm text-[#777F70]">
                N
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-4 p-4 md:p-6">
            {/* MENSAJE DE ERROR */}
            {error && (
              <div className="border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}
            {notificacion && (
              <div role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                {notificacion}
              </div>
            )}

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

              {esAdministrador && (
                <button
                  onClick={abrirRegistro}
                  className="bg-[#292B27] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#777F70]"
                >
                  + Agregar propiedad
                </button>
              )}
            </section>

            {/* RESUMEN DE CARTERA: importes claros y segregados por moneda. */}
            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#352e29] via-[#2c2926] to-[#1e302a] p-6 text-white shadow-[0_22px_55px_-35px_rgba(24,35,29,.65)] md:p-8">
                <div className="pointer-events-none absolute -right-8 -top-12 -z-10 h-64 w-64 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute right-8 top-10 -z-10 h-40 w-40 rounded-full border border-white/10" />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-white/60">Resumen patrimonial</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Valor del portafolio</h3>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-medium text-white/75">Cifras por moneda</span>
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">Total en USD</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{dinero(valorTotal)}</p>
                    <p className="mt-1 text-[10px] text-white/55">{propiedades.filter((p) => p.moneda === "USD").length} propiedades</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">Total en BOB</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{dinero(valorTotalBOB, "BOB")}</p>
                    <p className="mt-1 text-[10px] text-white/55">{propiedades.filter((p) => p.moneda === "BOB").length} propiedades</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/10 py-3 text-center">
                  <div><p className="text-xl font-bold">{total}</p><p className="mt-1 text-[10px] text-white/55">Inventario</p></div>
                  <div><p className="text-xl font-bold">{disponibles}</p><p className="mt-1 text-[10px] text-white/55">Disponibles</p></div>
                  <div><p className="text-xl font-bold">{reservadas}</p><p className="mt-1 text-[10px] text-white/55">Reservadas</p></div>
                </div>
                <p className="mt-4 text-[10px] leading-5 text-white/45">Los importes se presentan por separado; no se mezclan divisas.</p>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,.35)] md:p-6">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8a634f]">Composición</p><h3 className="mt-1 text-lg font-semibold text-slate-900">Estado del inventario</h3><p className="mt-1 text-xs text-slate-500">Distribución actual de las propiedades</p></div>
                  <span className="rounded-xl bg-[#f4f1ed] px-3 py-2 text-xs font-semibold text-[#8a634f]">{total} en total</span>
                </div>
                <GraficoEstados3D propiedades={propiedades} />
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="border border-[#292B27]/10 bg-[#F4F1EB]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292B27]/10 px-5 py-4">
                  <div><h3 className="font-serif text-lg">Consultas recibidas</h3><p className="mt-1 text-[10px] text-[#77786F]">Solicitudes recientes · {consultasNuevas} nuevas</p></div>
                  <div className="flex gap-5 text-right text-xs text-[#555F4D]"><div><strong className="block text-xl">{visitas30d}</strong>visitas / 30 días</div><div><strong className="block text-xl">{conversion}%</strong>visita a consulta</div></div>
                </div>
                <div className="max-h-96 divide-y divide-[#292B27]/10 overflow-auto">
                  {consultas.length === 0 ? <p className="p-6 text-sm text-[#77786F]">Todavía no hay consultas registradas.</p> : consultas.slice(0, 40).map((consulta) => (
                    <article key={consulta.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1"><p className="font-medium">{consulta.nombre} <span className="font-normal text-[#77786F]">· {consulta.propiedad_nombre}</span></p><p className="mt-1 text-xs text-[#77786F]">{consulta.telefono}{consulta.email ? ` · ${consulta.email}` : ""} · {new Date(consulta.created_at).toLocaleString("es-BO")}</p>{consulta.mensaje && <p className="mt-2 line-clamp-2 text-xs text-[#77786F]">{consulta.mensaje}</p>}</div>
                      {esAdministrador ? <select aria-label={`Estado de consulta de ${consulta.nombre}`} value={consulta.estado} onChange={(e) => cambiarEstadoConsulta(consulta.id, e.target.value)} className="border border-[#292B27]/15 bg-white px-2 py-2 text-xs"><option>Nueva</option><option>En seguimiento</option><option>Cerrada</option></select> : <span className="text-xs text-[#77786F]">{consulta.estado}</span>}
                    </article>
                  ))}
                </div>
              </div>
              <div className="border border-[#292B27]/10 bg-[#F4F1EB] p-5">
                <h3 className="font-serif text-lg">Actividad reciente</h3><p className="mt-1 text-[10px] text-[#77786F]">Cambios de inventario y autor</p>
                <p className="mt-5 border-t border-[#292B27]/10 pt-4 text-xs font-semibold">Más visitadas · 30 días</p>
                <ol className="mt-3 space-y-2">{masVistas.length ? masVistas.map((item) => <li key={item.id} className="flex justify-between gap-3 text-xs"><span className="truncate">{item.nombre}</span><strong>{item.vistas}</strong></li>) : <li className="text-xs text-[#77786F]">Aún no hay visitas.</li>}</ol>
                <p className="mt-5 border-t border-[#292B27]/10 pt-4 text-xs font-semibold">Actividad reciente</p>
                <ol className="mt-3 max-h-64 space-y-3 overflow-auto">{historial.length === 0 ? <li className="text-sm text-[#77786F]">Sin cambios registrados.</li> : historial.slice(0, 20).map((evento) => <li key={evento.id} className="border-l-2 border-[#777F70]/40 pl-3"><p className="text-sm"><strong>{evento.accion}</strong> · {evento.propiedad_nombre}</p><p className="mt-1 text-[10px] text-[#77786F]">{evento.username} · {new Date(evento.created_at).toLocaleString("es-BO")}</p></li>)}</ol>
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

                  {esAdministrador && (
                    <button
                      onClick={abrirRegistro}
                      className="bg-[#292B27] px-3 py-2 text-[10px] font-medium text-white transition hover:bg-[#777F70]"
                    >
                      + Agregar
                    </button>
                  )}
                </div>

                {/* BUSCADOR */}
                <div className="grid gap-2 border-b border-[#292B27]/10 p-3 sm:grid-cols-2 xl:grid-cols-3">
                  <input
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    placeholder="Buscar propiedad o ubicación..."
                    className="min-w-0 flex-1 border border-[#292B27]/10 bg-transparent px-3 py-2 text-[11px] outline-none placeholder:text-[#99998F] focus:border-[#777F70]"
                  />

                  <select
                    value={filtroEstado}
                    onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
                    className="border border-[#292B27]/10 bg-[#F4F1EB] px-3 py-2 text-[11px] outline-none focus:border-[#777F70]"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Disponible">Disponibles</option>
                    <option value="Reservada">Reservadas</option>
                    <option value="Vendida">Vendidas</option>
                  </select>
                  <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1); }} className="border border-[#292B27]/10 bg-[#F4F1EB] px-3 py-2 text-[11px] outline-none focus:border-[#777F70]">
                    <option value="Todos">Todos los tipos</option><option>Apartamento</option><option>Casa</option><option>Villa</option><option>Terreno</option><option>Local comercial</option><option>Oficina</option><option>Otro</option><option>Sin especificar</option>
                  </select>
                  <select value={filtroOperacion} onChange={(e) => { setFiltroOperacion(e.target.value); setPagina(1); }} aria-label="Filtrar por operación" className="border border-[#292B27]/10 bg-[#F4F1EB] px-3 py-2 text-[11px] outline-none"><option value="Todas">Venta y alquiler</option><option value="Venta">Venta</option><option value="Alquiler">Alquiler</option></select>
                  <input type="number" min="0" value={precioMinimo} onChange={(e) => { setPrecioMinimo(e.target.value); setPagina(1); }} placeholder="Precio mínimo USD" className="min-w-0 border border-[#292B27]/10 bg-transparent px-3 py-2 text-[11px] outline-none" />
                  <input type="number" min="0" value={precioMaximo} onChange={(e) => { setPrecioMaximo(e.target.value); setPagina(1); }} placeholder="Precio máximo USD" className="min-w-0 border border-[#292B27]/10 bg-transparent px-3 py-2 text-[11px] outline-none" />
                  <input type="number" min="0" step="1" value={habitacionesMinimas} onChange={(e) => { setHabitacionesMinimas(e.target.value); setPagina(1); }} placeholder="Habitaciones mín." className="min-w-0 border border-[#292B27]/10 bg-transparent px-3 py-2 text-[11px] outline-none" />
                  <select value={orden} onChange={(e) => setOrden(e.target.value)} className="border border-[#292B27]/10 bg-[#F4F1EB] px-3 py-2 text-[11px] outline-none">
                    <option value="recientes">Más recientes</option><option value="precio-menor">Precio: menor a mayor</option><option value="precio-mayor">Precio: mayor a menor</option><option value="nombre">Nombre</option>
                  </select>
                </div>

                {/* LISTA DE PROPIEDADES */}
                <div className="divide-y divide-[#292B27]/10">
                  {cargando ? (
                    <p className="p-10 text-center text-xs text-[#77786F]">
                      Cargando propiedades desde PostgreSQL...
                    </p>
                  ) : propiedadesFiltradas.length === 0 ? (
                    <p className="p-10 text-center text-xs text-[#77786F]">
                      No se encontraron propiedades.
                    </p>
                  ) : (
                    propiedadesPaginadas.map((p) => (
                      <article key={p.id} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 px-4 py-4 transition hover:bg-[#eeeae3] sm:grid-cols-[116px_minmax(0,1fr)_auto] sm:gap-5 sm:px-5">
                        <FotoInventario propiedad={p} className="h-[86px] w-[96px] rounded-2xl shadow-sm sm:h-[96px] sm:w-[116px]" />
                        <div className="min-w-0 py-1">
                          <div className="flex flex-wrap items-center gap-2"><p className="max-w-full truncate text-sm font-semibold text-[#292B27] sm:text-base">{p.nombre}</p><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${colorEstado(p.estado)}`}>{p.estado}</span></div>
                          <p className="mt-1.5 truncate text-xs text-[#77786F]">{p.ubicacion}{p.direccion ? ` · ${p.direccion}` : ""}</p>
                          <p className="mt-2 line-clamp-1 text-xs leading-5 text-[#77786F]">{p.descripcion || "Sin descripción registrada."}</p>
                          <p className="mt-2 text-[10px] font-medium text-[#555F4D]">{[p.tipo || "Inmueble", p.operacion, p.habitaciones > 0 ? `${p.habitaciones} hab.` : "", (p.banos ?? 0) > 0 ? `${p.banos} baños` : "", `${p.metros} m²`].filter(Boolean).join(" · ")}</p>
                        </div>
                        <div className="col-span-2 flex items-center justify-between gap-3 border-t border-[#292B27]/10 pt-3 sm:col-span-1 sm:justify-end sm:border-0 sm:pt-0">
                          <p className="text-base font-bold tracking-tight text-[#292B27] sm:text-lg">{dinero(Number(p.precio), p.moneda)}{p.operacion === "Alquiler" && <span className="ml-1 text-[10px] font-normal text-[#77786F]">/ mes</span>}</p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {esAdministrador && <><button onClick={() => abrirEdicion(p)} aria-label={`Editar ${p.nombre}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#292B27]/10 text-sm text-[#555F4D] transition hover:bg-white">✎</button><button onClick={() => eliminarPropiedad(p.id, p.nombre)} aria-label={`Eliminar ${p.nombre}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-base text-red-700 transition hover:bg-red-50">×</button></>}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="border-t border-[#292B27]/10 px-4 py-3 text-[9px] text-[#77786F]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{propiedadesFiltradas.length} propiedades · Página {paginaActual} de {paginas}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPagina((actual) => Math.max(1, actual - 1))} disabled={paginaActual <= 1} className="border border-[#292B27]/15 px-3 py-2 disabled:opacity-40">Anterior</button>
                      <button type="button" onClick={() => setPagina((actual) => Math.min(paginas, actual + 1))} disabled={paginaActual >= paginas} className="border border-[#292B27]/15 px-3 py-2 disabled:opacity-40">Siguiente</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPARACIÓN 3D: prismas con escala, eje y etiquetas legibles. */}
              <div id="estadisticas" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,.35)] md:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8a634f]">Comparación visual</p><h3 className="mt-1 text-lg font-semibold text-slate-900">Precios de propiedades</h3><p className="mt-1 text-xs text-slate-500">Cinco valores más altos · cada barra muestra una propiedad</p></div>
                  <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500">Moneda<select aria-label="Moneda del gráfico de precios" value={monedaGrafico} onChange={(e) => setMonedaGrafico(e.target.value as Propiedad["moneda"])} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800"><option value="USD">USD</option><option value="BOB">BOB</option></select></label>
                </div>
                <GraficoPrismasPrecios propiedades={propiedades} moneda={monedaGrafico} />
                <p className="mt-4 rounded-xl bg-[#f8f6f3] px-3 py-2.5 text-[10px] leading-5 text-slate-500">La escala y el listado usan únicamente la moneda seleccionada; cambia a BOB para comparar las propiedades en bolivianos.</p>
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
      {modalAbierto && esAdministrador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#172019]/65 p-2 backdrop-blur-sm sm:p-6">
          <section aria-labelledby="formulario-propiedad-titulo" aria-modal="true" role="dialog" className="h-[calc(100dvh-1rem)] min-h-0 w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl shadow-black/30 sm:h-[min(900px,calc(100dvh-3rem))]">
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
          </section>
        </div>
      )}
      {usuariosAbierto && esAdministrador && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#292B27]/60 p-4 backdrop-blur-sm">
          <AdministrarUsuarios onCerrar={() => setUsuariosAbierto(false)} />
        </div>
      )}
      {contrasenaAbierta && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#292B27]/60 p-4 backdrop-blur-sm">
          <CambiarContrasena
            obligatoria={cambioObligatorio}
            onCerrar={() => setContrasenaAbierta(false)}
            onCambioCompletado={() => {
              setCambioObligatorio(false);
              setContrasenaAbierta(false);
            }}
          />
        </div>
      )}
    </main>
  );
}
