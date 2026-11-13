
// Página cliente que presenta el detalle y crea el enlace de consulta por WhatsApp.
"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { galeriasPropiedades } from "@/lib/imagenes-propiedades";
import type { Propiedad } from "@/types/propiedad";
import { formatoMoneda } from "@/lib/format";

const formatoPrecio = (precio: number, moneda: Propiedad["moneda"]) => formatoMoneda(precio, moneda);

function DetallePropiedadContenido({ id }: { id: string }) {
  // Carga la ficha real, incluyendo descripción, baños e imágenes desde PostgreSQL.
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [correoContacto, setCorreoContacto] = useState("");
  const [consultaEnviada, setConsultaEnviada] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarPropiedad() {
      setCargando(true);
      setErrorCarga("");
      setPropiedad(null);

      try {
        const respuesta = await fetch(`/api/propiedades/${encodeURIComponent(id)}`, {
          cache: "no-store",
          signal: controlador.signal,
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(resultado.mensaje || "No se pudo cargar esta propiedad.");
        }

        setPropiedad(resultado as Propiedad);
      } catch (error) {
        if (controlador.signal.aborted) return;
        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No se pudo cargar esta propiedad."
        );
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    cargarPropiedad();
    let visitante = sessionStorage.getItem("nexo-visitante");
    if (!visitante) {
      visitante = crypto.randomUUID();
      sessionStorage.setItem("nexo-visitante", visitante);
    }
    fetch("/api/analytics/views", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propiedadId: Number(id), visitante }),
    }).catch(() => undefined);
    return () => controlador.abort();
  }, [id]);

  if (cargando) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#F4F1EB] px-6">
        <p className="text-sm text-[#77786F]">Cargando información del inmueble…</p>
      </main>
    );
  }

  if (!propiedad) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F1EB] px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-light text-[#292B27]">
            {errorCarga ? "No pudimos cargar la propiedad" : "Propiedad no encontrada"}
          </h1>

          <p className="mt-4 text-sm text-[#77786F]">
            {errorCarga || "Es posible que este inmueble ya no esté disponible."}
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

  const propiedadActual = propiedad;

  // Prioriza fotos del registro local y usa la galería de ejemplo como respaldo.
  const fotosGuardadas =
  propiedad.imagenes?.filter((foto) => foto.trim() !== "") ?? [];

  const fotos =
  fotosGuardadas.length > 0
    ? fotosGuardadas
    : galeriasPropiedades[propiedad.id] ?? galeriasPropiedades[1];

  async function enviarConsulta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const ventana = window.open("about:blank", "_blank");
    const texto = `Hola, soy ${nombreContacto}. Me interesa ${propiedadActual.nombre} (${propiedadActual.ubicacion}). Mi teléfono es ${telefonoContacto}.${correoContacto ? ` Mi correo es ${correoContacto}.` : ""} Me gustaría recibir más información y coordinar una visita.`;
    try {
      const respuesta = await fetch("/api/consultas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedadId: propiedadActual.id, nombre: nombreContacto, telefono: telefonoContacto, email: correoContacto, mensaje: texto }),
      });
      if (!respuesta.ok) throw new Error("No se pudo registrar la consulta. Inténtalo más tarde.");
    } catch (error) {
      ventana?.close();
      setErrorCarga(error instanceof Error ? error.message : "No se pudo registrar la consulta.");
      return;
    }
    const url = `https://wa.me/18493180073?text=${encodeURIComponent(texto)}`;
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
    setConsultaEnviada(true);
  }

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
            {propiedad.ubicacion} · {propiedad.tipo ?? "Inmueble"}
          </p>

          <h2 className="text-4xl font-light leading-tight md:text-5xl">
            {propiedad.nombre}
          </h2>

          <p className="mt-5 text-3xl font-light">
            <span className="mb-2 block text-sm font-medium uppercase tracking-widest text-[#777F70]">{propiedad.operacion === "Alquiler" ? "Alquiler mensual" : "En venta"}</span>
            {formatoPrecio(propiedad.precio, propiedad.moneda)}
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

        <div className="mb-8 border border-[#292B27]/10 bg-white/70 px-5 py-4 text-sm text-[#77786F]">
          Consulta la disponibilidad y las condiciones actualizadas con nuestro asesor antes de formalizar una operación.
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

                {propiedad.habitaciones > 0 && <div>
                  <p className="text-2xl font-light">
                    {propiedad.habitaciones}
                  </p>
                  <p className="mt-2 text-xs text-[#77786F]">
                    Habitaciones
                  </p>
                </div>}

                {(propiedad.banos ?? 0) > 0 && <div>
                  <p className="text-2xl font-light">
                    {propiedad.banos}
                  </p>
                  <p className="mt-2 text-xs text-[#77786F]">
                    Baños
                  </p>
                </div>}

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

            {propiedad.direccion && (
              <div className="mt-8 border-t border-[#292B27]/10 pt-6">
                <h3 className="text-lg font-medium">Dirección o referencia</h3>
                <p className="mt-2 text-sm leading-7 text-[#77786F]">{propiedad.direccion}</p>
              </div>
            )}

            {propiedad.amenidades && propiedad.amenidades.length > 0 && (
              <div className="mt-10 border-t border-[#292B27]/10 pt-8">
                <h3 className="text-2xl font-light">Amenidades</h3>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {propiedad.amenidades.map((amenidad) => (
                    <li key={amenidad} className="border border-[#292B27]/10 bg-white/60 px-4 py-3 text-sm">✓ {amenidad}</li>
                  ))}
                </ul>
              </div>
            )}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${propiedad.direccion ?? ""} ${propiedad.ubicacion}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex border-b border-[#292B27] pb-1 text-sm text-[#555F4D]"
            >
              Ver zona en Google Maps →
            </a>

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

            <form onSubmit={enviarConsulta} className="mt-7 space-y-3">
              <label className="block text-xs font-medium">Tu nombre
                <input required value={nombreContacto} onChange={(e) => setNombreContacto(e.target.value)} className="mt-1.5 w-full border border-[#292B27]/15 bg-white px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-xs font-medium">Teléfono
                <input required type="tel" value={telefonoContacto} onChange={(e) => setTelefonoContacto(e.target.value)} className="mt-1.5 w-full border border-[#292B27]/15 bg-white px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-xs font-medium">Correo (opcional)
                <input type="email" value={correoContacto} onChange={(e) => setCorreoContacto(e.target.value)} className="mt-1.5 w-full border border-[#292B27]/15 bg-white px-3 py-2.5 text-sm" />
              </label>
              <button type="submit" className="block w-full bg-[#292B27] px-6 py-4 text-center text-sm font-medium text-white transition hover:bg-[#777F70]">
                {consultaEnviada ? "Volver a consultar por WhatsApp" : "Enviar consulta por WhatsApp"}
              </button>
              <p className="text-[10px] leading-5 text-[#77786F]">Guardaremos tu solicitud para darle seguimiento y abriremos WhatsApp para que puedas enviarla directamente.</p>
            </form>

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
export default function DetallePropiedadCliente({ id }: { id: string }) {
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
      <DetallePropiedadContenido id={id} />
    </Suspense>
  );
}
