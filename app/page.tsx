
// Esta página es un componente de cliente porque carga datos y administra filtros con React.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { galeriasPropiedades } from "@/lib/imagenes-propiedades";
import type { Propiedad } from "@/types/propiedad";
import { formatoMoneda } from "@/lib/format";

// Convierte un número en un precio legible en dólares estadounidenses.
const formatoPrecio = (precio: number, moneda: Propiedad["moneda"]) =>
  formatoMoneda(precio, moneda);

export default function Home() {
  // Estados de la página: datos recibidos, carga, error y filtros elegidos por el visitante.
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [tipo, setTipo] = useState("Todos");
  const [operacion, setOperacion] = useState("Todas");
  const [precioMinimo, setPrecioMinimo] = useState("");
  const [precioMaximo, setPrecioMaximo] = useState("");
  const [habitacionesMinimas, setHabitacionesMinimas] = useState("");

  // Al montar la página consulta la API, que lee PostgreSQL; activo evita actualizar tras desmontar.
  useEffect(() => {
    let activo = true;

    async function cargarPropiedades() {
      try {
        setCargando(true);
        setError("");

        const respuesta = await fetch("/api/propiedades", {
          cache: "no-store",
        });

        if (!respuesta.ok) {
          const resultado: { mensaje?: string } = await respuesta.json();
          throw new Error(resultado.mensaje || "No se pudieron cargar las propiedades.");
        }

        const datos: Propiedad[] = await respuesta.json();

        if (activo) {
          setPropiedades(datos);
        }
      } catch (err) {
        console.error("Error cargando propiedades:", err);

        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar las propiedades. Intenta nuevamente."
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

  // La portada oculta los inmuebles vendidos y luego aplica búsqueda y estado.
  const propiedadesPublicas = propiedades.filter(
    (p) => p.estado !== "Vendida"
  );

  const propiedadesFiltradas = propiedadesPublicas.filter((p) => {
    const coincideBusqueda =
      `${p.nombre} ${p.ubicacion}`
        .toLowerCase()
        .includes(busqueda.toLowerCase());

    const coincideEstado =
      filtro === "Todas" || p.estado === filtro;

    const coincideTipo = tipo === "Todos" || (p.tipo ?? "Sin especificar") === tipo;
    const coincideOperacion = operacion === "Todas" || p.operacion === operacion;
    const coincidePrecioMinimo = precioMinimo === "" || Number(p.precio) >= Number(precioMinimo);
    const coincidePrecioMaximo = precioMaximo === "" || Number(p.precio) <= Number(precioMaximo);
    const coincideHabitaciones = habitacionesMinimas === "" || p.habitaciones >= Number(habitacionesMinimas);

    return coincideBusqueda && coincideEstado && coincideTipo && coincideOperacion && coincidePrecioMinimo && coincidePrecioMaximo && coincideHabitaciones;
  });

  return (
    <main className="min-h-screen bg-[#F4F1EB] text-[#292B27]">

      {/* NAVEGACIÓN */}
      <header className="relative z-10 border-b border-[#292B27]/10 bg-[#F4F1EB]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">

          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-[#777F70] text-xl font-semibold">
              N
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-[0.15em]">
                NEXO
              </h1>

              <p className="text-[9px] tracking-[0.35em] text-[#777F70]">
                REALTY
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-9 text-sm md:flex">
            <a href="#inicio" className="transition hover:text-[#777F70]">
              Inicio
            </a>

            <a href="#propiedades" className="transition hover:text-[#777F70]">
              Propiedades
            </a>

            <a href="#nosotros" className="transition hover:text-[#777F70]">
              Nosotros
            </a>

            <a
              href="https://wa.me/18493180073?text=Hola,%20Nexo%20Realty.%20Me%20gustaría%20recibir%20información%20sobre%20sus%20propiedades."
              className="transition hover:text-[#777F70]"
            >
              Contacto
            </a>
          </nav>

          <Link
            href="/login"
            className="border border-[#292B27] px-4 py-2.5 text-xs font-medium transition hover:bg-[#292B27] hover:text-white"
          >
            Iniciar sesión
          </Link>

        </div>
      </header>

      {/* PORTADA */}
      <section
        id="inicio"
        className="relative z-0 mx-4 mt-4 flex min-h-[580px] items-center overflow-hidden bg-cover bg-center md:mx-8 lg:mx-10"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2000')",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-8 py-24 text-white md:px-16">

          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-white/80">
            Arquitectura · Espacios · Estilo de vida
          </p>

          <h2 className="max-w-3xl text-5xl font-light leading-tight md:text-7xl">
            El espacio ideal
            <br />
            <span className="italic">
              para tu próxima historia.
            </span>
          </h2>

          <p className="mt-7 max-w-lg text-sm leading-7 text-white/80 md:text-base">
            Descubre propiedades seleccionadas para quienes valoran
            el diseño, la comodidad y los espacios extraordinarios.
          </p>

          <a
            href="#propiedades"
            className="mt-9 inline-block bg-[#EAE6DF] px-8 py-4 text-sm font-semibold text-[#292B27] transition hover:bg-white"
          >
            Explorar propiedades
          </a>

        </div>

        <div className="absolute bottom-8 right-8 hidden text-right text-white/80 md:block">
          <p className="text-xs tracking-[0.2em]">
            NEXO REALTY
          </p>

          <p className="mt-1 text-[10px]">
            Espacios con identidad
          </p>
        </div>
      </section>

      {/* INTRODUCCIÓN */}
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-2 md:items-end lg:px-10">

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#858B7C]">
            Encuentra tu lugar
          </p>

          <h2 className="max-w-xl text-3xl font-light leading-tight md:text-5xl">
            No se trata solamente de encontrar una propiedad.
            <span className="italic">
              {" "}Se trata de encontrar tu espacio.
            </span>
          </h2>
        </div>

        <p className="max-w-lg text-sm leading-8 text-[#77786F] md:justify-self-end">
          En Nexo Realty creemos que cada espacio tiene algo especial.
          Explora nuestra selección de propiedades y descubre nuevas
          posibilidades para vivir e invertir.
        </p>

      </section>

      {/* PROPIEDADES */}
      <section
        id="propiedades"
        className="bg-[#EAE6DF] px-6 py-20 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#858B7C]">
                Nuestra selección
              </p>

              <h2 className="text-4xl font-light md:text-5xl">
                Propiedades destacadas
              </h2>

              <p className="mt-4 text-sm text-[#77786F]">
                Espacios que merecen ser descubiertos.
              </p>
            </div>

            <p className="text-sm text-[#77786F]">
              {propiedadesFiltradas.length} propiedades disponibles para explorar
            </p>

          </div>

          {/* BUSCADOR */}
          <div className="mb-10 grid gap-3 border border-[#292B27]/10 bg-[#F4F1EB] p-4 md:grid-cols-2 lg:grid-cols-4">

            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="¿Dónde te gustaría vivir?"
              className="min-w-0 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[#99998F]"
            />

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="border border-[#292B27]/10 bg-transparent px-3 py-3 text-sm outline-none"
            >
              <option value="Todas">Todos los estados</option>
              <option value="Disponible">Disponible</option>
              <option value="Reservada">Reservada</option>
            </select>

            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="border border-[#292B27]/10 bg-transparent px-3 py-3 text-sm outline-none">
              <option value="Todos">Todos los tipos</option>
              <option>Apartamento</option><option>Casa</option><option>Villa</option><option>Terreno</option><option>Local comercial</option><option>Oficina</option><option>Otro</option><option>Sin especificar</option>
            </select>

            <select aria-label="Operación" value={operacion} onChange={(e) => setOperacion(e.target.value)} className="border border-[#292B27]/10 bg-transparent px-3 py-3 text-sm outline-none"><option value="Todas">Venta y alquiler</option><option value="Venta">En venta</option><option value="Alquiler">En alquiler</option></select>

            <input type="number" min="0" value={precioMinimo} onChange={(e) => setPrecioMinimo(e.target.value)} placeholder="Precio mínimo (moneda propia)" aria-label="Precio mínimo en la moneda registrada de la propiedad" className="min-w-0 border border-[#292B27]/10 bg-transparent px-3 py-3 text-sm outline-none" />
            <input type="number" min="0" value={precioMaximo} onChange={(e) => setPrecioMaximo(e.target.value)} placeholder="Precio máximo (moneda propia)" aria-label="Precio máximo en la moneda registrada de la propiedad" className="min-w-0 border border-[#292B27]/10 bg-transparent px-3 py-3 text-sm outline-none" />
            <input type="number" min="0" step="1" value={habitacionesMinimas} onChange={(e) => setHabitacionesMinimas(e.target.value)} placeholder="Habitaciones mín." aria-label="Habitaciones mínimas" className="min-w-0 border border-[#292B27]/10 bg-transparent px-3 py-3 text-sm outline-none" />

            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltro("Todas");
                setTipo("Todos");
                setOperacion("Todas");
                setPrecioMinimo("");
                setPrecioMaximo("");
                setHabitacionesMinimas("");
              }}
              className="bg-[#292B27] px-7 py-3 text-sm text-white transition hover:bg-[#777F70]"
            >
              Limpiar filtros
            </button>

          </div>

          {/* TARJETAS DE PROPIEDADES */}
          {cargando ? (

            <div className="bg-[#F4F1EB] px-6 py-20 text-center">
              <p className="text-sm text-[#77786F]">
                Cargando propiedades...
              </p>
            </div>

          ) : error ? (

            <div className="bg-[#F4F1EB] px-6 py-20 text-center">
              <h3 className="text-xl font-medium">
                No pudimos cargar las propiedades
              </h3>

              <p className="mt-3 text-sm text-[#77786F]">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 bg-[#292B27] px-6 py-3 text-sm text-white"
              >
                Intentar nuevamente
              </button>
            </div>

          ) : propiedadesFiltradas.length > 0 ? (

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

              {propiedadesFiltradas.map((p) => {

                const imagen =
                  p.imagenes?.find((foto) => foto.trim() !== "") ||
                  galeriasPropiedades[p.id]?.[0] ||
                  galeriasPropiedades[1][0];

                return (
                  <Link
                    href={`/propiedades/${p.id}`}
                    key={p.id}
                    className="group block bg-[#F4F1EB]"
                  >

                    <article>

                      {/* IMAGEN */}
                      <div
                        className="relative h-72 overflow-hidden bg-cover bg-center"
                        style={{
                          backgroundImage: `url("${imagen}")`,
                        }}
                      >

                        <span
                          className={`absolute left-4 top-4 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest ${
                            p.estado === "Disponible"
                              ? "bg-[#F4F1EB] text-[#555F4D]"
                              : "bg-[#292B27] text-white"
                          }`}
                        >
                          {p.estado}
                        </span>

                        <div className="absolute inset-0 bg-black/0 transition duration-500 group-hover:bg-black/10" />

                        <span className="absolute bottom-4 right-4 translate-y-2 bg-[#F4F1EB] px-4 py-2 text-xs font-semibold text-[#292B27] opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          Ver propiedad →
                        </span>

                      </div>

                      {/* INFORMACIÓN */}
                      <div className="p-6">

                        <p className="text-xs uppercase tracking-wider text-[#858B7C]">
                          {p.ubicacion}
                        </p>

                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#777F70]">
                          {p.tipo ?? "Sin especificar"}
                        </p>

                        <h3 className="mt-3 text-xl font-medium">
                          {p.nombre}
                        </h3>

                        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#77786F]">
                          {p.descripcion || "Consulta los detalles de esta propiedad con nuestro equipo."}
                        </p>

                        <p className="mt-4 text-2xl font-light">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[#777F70]">{p.operacion === "Alquiler" ? "Alquiler mensual" : "En venta"}</span>
                          {formatoPrecio(Number(p.precio), p.moneda)}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#292B27]/10 pt-5 text-xs text-[#77786F]">

                          {p.habitaciones > 0 && (
                            <span>{p.habitaciones} habitaciones</span>
                          )}

                          {(p.banos ?? 0) > 0 && (
                            <span>{p.banos} baños</span>
                          )}

                          <span>
                            {p.metros} m²
                          </span>

                        </div>

                        <p className="mt-5 border-t border-[#292B27]/10 pt-4 text-xs font-semibold uppercase tracking-widest text-[#777F70] transition group-hover:text-[#292B27]">
                          Descubrir propiedad →
                        </p>

                      </div>

                    </article>

                  </Link>
                );
              })}

            </div>

          ) : (

            <div className="bg-[#F4F1EB] px-6 py-20 text-center">

              <h3 className="text-xl font-medium">
                No encontramos propiedades
              </h3>

              <p className="mt-3 text-sm text-[#77786F]">
                Intenta cambiar los filtros o buscar otra ubicación.
              </p>

            </div>

          )}

        </div>
      </section>

      {/* NOSOTROS */}
      <section
        id="nosotros"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center lg:px-10"
      >

        <div
          className="min-h-[400px] bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200')",
          }}
        />

        <div className="py-6">

          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-[#858B7C]">
            Nuestra filosofía
          </p>

          <h2 className="text-4xl font-light leading-tight md:text-5xl">
            Arquitectura que conecta con tu forma de vivir.
          </h2>

          <p className="mt-7 text-sm leading-8 text-[#77786F]">
            En Nexo Realty buscamos acercarte a espacios que combinan
            ubicación, diseño y funcionalidad. Queremos que descubrir
            tu próxima propiedad sea una experiencia sencilla y especial.
          </p>

          <a
            href="#contacto"
            className="mt-9 inline-block border-b border-[#292B27] pb-2 text-sm font-medium transition hover:text-[#858B7C]"
          >
            Descubre Nexo Realty →
          </a>

        </div>

      </section>

      {/* CONTACTO */}
      <section
        id="contacto"
        className="bg-[#292B27] px-6 py-20 text-center text-white"
      >

        <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#B8B9AA]">
          Tu próximo espacio comienza aquí
        </p>

        <h2 className="mx-auto max-w-2xl text-4xl font-light leading-tight md:text-5xl">
          ¿Listo para encontrar un lugar que te represente?
        </h2>

        <a
          href="#propiedades"
          className="mt-9 inline-block bg-[#EAE6DF] px-8 py-4 text-sm font-semibold text-[#292B27] transition hover:bg-white"
        >
          Ver propiedades
        </a>

      </section>

      {/* PIE DE PÁGINA */}
      <footer className="bg-[#292B27] px-6 pb-8 text-white">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 border-t border-white/15 pt-8 md:flex-row md:items-center">

          <div>
            <p className="text-lg font-semibold tracking-[0.2em]">
              NEXO REALTY
            </p>

            <p className="mt-2 text-xs text-white/50">
              Espacios con identidad.
            </p>
          </div>

          <p className="text-xs text-white/50">
            © 2026 Nexo Realty. Todos los derechos reservados.
          </p>

          <Link
            href="/dashboard"
            className="text-xs text-white/70 transition hover:text-white"
          >
            Acceso administrativo
          </Link>

        </div>

      </footer>

    </main>
  );
}
