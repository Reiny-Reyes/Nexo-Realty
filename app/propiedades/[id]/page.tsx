
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";  
import { Suspense, useSyncExternalStore } from "react";
import { galeriasPropiedades } from "@/lib/imagenes-propiedades";

import {
  escucharCambios,
  obtenerPropiedades,
  obtenerPropiedadesServidor,
} from "@/lib/Propiedades";

const formatoPrecio = (precio: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(precio);

function DetallePropiedadContenido() {
  const params = useParams<{ id: string }>();

  const propiedades = useSyncExternalStore(
    escucharCambios,
    obtenerPropiedades,
    obtenerPropiedadesServidor
  );

  const propiedad = propiedades.find(
    (p) => String(p.id) === params.id
  );

  if (!propiedad) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F1EB] px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-light text-[#292B27]">
            Propiedad no encontrada
          </h1>

          <p className="mt-4 text-sm text-[#77786F]">
            Es posible que este inmueble ya no esté disponible.
          </p>

          <Link
            href="/#propiedades"
            className="mt-8 inline-block bg-[#292B27] px-7 py-3 text-sm text-white transition hover:bg-[#777F70]"
          >
            Volver a propiedades
          </Link>
        </div>
      </main>
    );
  }

  const fotosGuardadas =
  propiedad.imagenes?.filter((foto) => foto.trim() !== "") ?? [];

  const fotos =
  fotosGuardadas.length > 0
    ? fotosGuardadas
    : galeriasPropiedades[propiedad.id] ?? galeriasPropiedades[1];

  const mensaje = `Hola, estoy interesado en la propiedad ${propiedad.nombre}, ubicada en ${propiedad.ubicacion}. Me gustaría recibir más información.`;

  return (
    <main className="min-h-screen bg-[#F4F1EB] text-[#292B27]">

      {/* NAVEGACIÓN */}
      <header className="border-b border-[#292B27]/10">
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

          <Link
            href="/#propiedades"
            className="text-sm transition hover:text-[#777F70]"
          >
            ← Volver a propiedades
          </Link>

        </div>
      </header>

      {/* CONTENIDO */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">

        {/* ENCABEZADO */}
        <div className="mb-8">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#858B7C]">
            {propiedad.ubicacion}
          </p>

          <h2 className="text-4xl font-light leading-tight md:text-5xl">
            {propiedad.nombre}
          </h2>

          <p className="mt-5 text-3xl font-light">
            {formatoPrecio(propiedad.precio)}
          </p>

          <span
            className={`mt-4 inline-block px-4 py-2 text-xs font-semibold uppercase tracking-widest ${
              propiedad.estado === "Disponible"
                ? "bg-[#E1E5D9] text-[#555F4D]"
                : "bg-[#292B27] text-white"
            }`}
          >
            {propiedad.estado}
          </span>
        </div>

        {/* GALERÍA */}
        <div className="grid gap-3 md:grid-cols-2">

          <div
            className="min-h-[300px] bg-cover bg-center md:row-span-2 md:min-h-[550px]"
            style={{
              backgroundImage: `url("${fotos[0]}")`,
            }}
          />

          {fotos.slice(1, 3).map((foto, index) => (
            <div
              key={index}
              className="min-h-[220px] bg-cover bg-center"
              style={{
                backgroundImage: `url("${foto}")`,
              }}
            />
          ))}

        </div>

        {/* INFORMACIÓN */}
        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_350px]">

          <div>

            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#858B7C]">
              Conoce este inmueble
            </p>

            <h3 className="text-3xl font-light">
              Descripción de la propiedad
            </h3>

            <p className="mt-6 whitespace-pre-line text-sm leading-8 text-[#77786F]">
              {propiedad.descripcion ||
                "Para obtener más información sobre este inmueble, ponte en contacto con nuestro equipo."}
            </p>

            {/* CARACTERÍSTICAS */}
            <div className="mt-12 border-t border-[#292B27]/10 pt-8">

              <h3 className="text-2xl font-light">
                Características
              </h3>

              <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-3">

                <div>
                  <p className="text-2xl font-light">
                    {propiedad.habitaciones}
                  </p>
                  <p className="mt-2 text-xs text-[#77786F]">
                    Habitaciones
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-light">
                    {propiedad.banos ?? "—"}
                  </p>
                  <p className="mt-2 text-xs text-[#77786F]">
                    Baños
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-light">
                    {propiedad.metros} m²
                  </p>
                  <p className="mt-2 text-xs text-[#77786F]">
                    Superficie
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* CONTACTO */}
          <aside className="h-fit bg-[#EAE6DF] p-7">

            <p className="text-xs uppercase tracking-[0.25em] text-[#858B7C]">
              ¿Te interesa?
            </p>

            <h3 className="mt-4 text-2xl font-light">
              Conoce más sobre esta propiedad.
            </h3>

            <p className="mt-4 text-sm leading-7 text-[#77786F]">
              Contáctanos para recibir información y coordinar una visita.
            </p>

            <a
              href={`https://wa.me/18493180073?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 block bg-[#292B27] px-6 py-4 text-center text-sm font-medium text-white transition hover:bg-[#777F70]"
            >
              Consultar por WhatsApp
            </a>  

            <p className="mt-4 text-center text-xs text-[#858B7C]">
              Nexo Realty · Espacios con identidad
            </p>

          </aside>

        </div>

      </section>

      {/* PIE DE PÁGINA */}
      <footer className="mt-16 bg-[#292B27] px-6 py-8 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Nexo Realty. Todos los derechos reservados.
      </footer>

    </main>
  );
}
export default function DetallePropiedad() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F4F1EB]">
          <p className="text-sm text-[#77786F]">
            Cargando propiedad...
          </p>
        </main>
      }
    >
      <DetallePropiedadContenido />
    </Suspense>
  );
}
