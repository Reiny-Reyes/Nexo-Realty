
// Formulario cliente reutilizable para crear y editar inmuebles desde el dashboard.
"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Estado, Moneda, Operacion, Propiedad } from "@/types/propiedad";


// Reduce una foto en el navegador y devuelve un JPEG listo para subir a almacenamiento externo.
function comprimirImagen(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const imagen = new Image();

    imagen.onload = () => {
      const maximo = 1400;
      const escala = Math.min(
        1,
        maximo / Math.max(imagen.width, imagen.height)
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(imagen.width * escala));
      canvas.height = Math.max(1, Math.round(imagen.height * escala));

      const contexto = canvas.getContext("2d");

      if (!contexto) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }

      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(url);
      canvas.toBlob((resultado) => {
        if (resultado) resolve(resultado);
        else reject(new Error("No se pudo comprimir la imagen."));
      }, "image/jpeg", 0.72);
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar una fotografía."));
    };

    imagen.src = url;
  });
}


type FormularioPropiedadProps = {
  onGuardar: (propiedad: Omit<Propiedad, "id">) => void | Promise<void>;
  onCerrar: () => void;
  propiedadEditar?: Propiedad;
};

export default function FormularioPropiedad(props: FormularioPropiedadProps) {
  // Cambiar la clave remonta el formulario y reinicia sus campos al cambiar de inmueble.
  return (
    <FormularioCampos
      key={props.propiedadEditar?.id ?? "nueva"}
      {...props}
    />
  );
}

function FormularioCampos({
  onGuardar,
  onCerrar,
  propiedadEditar,
}: FormularioPropiedadProps) {
  const campoFotosRef = useRef<HTMLInputElement>(null);
  const botonFotosRef = useRef<HTMLButtonElement>(null);
  const contenidoFormularioRef = useRef<HTMLDivElement>(null);
  const scrollAntesDeElegirFotos = useRef(0);
  const [nombre, setNombre] = useState(propiedadEditar?.nombre ?? "");
  const [ubicacion, setUbicacion] = useState(propiedadEditar?.ubicacion ?? "");
  const [direccion, setDireccion] = useState(propiedadEditar?.direccion ?? "");
  const [tipo, setTipo] = useState(propiedadEditar?.tipo ?? "Sin especificar");
  const [operacion, setOperacion] = useState<Operacion>(propiedadEditar?.operacion ?? "Venta");
  const [moneda, setMoneda] = useState<Moneda>(propiedadEditar?.moneda ?? "USD");
  const [amenidades, setAmenidades] = useState(propiedadEditar?.amenidades?.join("\n") ?? "");
  const [precio, setPrecio] = useState(
    propiedadEditar ? String(propiedadEditar.precio) : ""
  );
  const [habitaciones, setHabitaciones] = useState(
    propiedadEditar ? String(propiedadEditar.habitaciones) : ""
  );
  const [banos, setBanos] = useState(
    propiedadEditar?.banos !== undefined
      ? String(propiedadEditar.banos)
      : ""
  );
  const [metros, setMetros] = useState(
    propiedadEditar ? String(propiedadEditar.metros) : ""
  );
  const [descripcion, setDescripcion] = useState(
    propiedadEditar?.descripcion ?? ""
  );
  const [imagenes, setImagenes] = useState<string[]>(propiedadEditar?.imagenes ?? []);
  const [urlImagen, setUrlImagen] = useState("");
  const [fotosNuevas, setFotosNuevas] = useState<string[]>([]);
  const [mensajeFotos, setMensajeFotos] = useState("");
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");
  const [estado, setEstado] = useState<Estado>(
    propiedadEditar?.estado ?? "Disponible"
  );

  
async function manejarSeleccionFotos(
  e: ChangeEvent<HTMLInputElement>
) {
  // Limita la selección a imágenes y al máximo de cinco fotografías.
  const archivos = Array.from(e.target.files ?? []);
  const disponibles = 5 - imagenes.length;

  if (archivos.length === 0) return;

  if (disponibles <= 0) {
    setMensajeFotos("Puedes subir un máximo de 5 fotografías.");
    e.target.value = "";
    return;
  }

  const seleccionados = archivos
    .filter((archivo) => ["image/jpeg", "image/png", "image/webp"].includes(archivo.type))
    .slice(0, disponibles);

  if (seleccionados.some((archivo) => archivo.size > 25 * 1024 * 1024)) {
    setMensajeFotos("Selecciona archivos de menos de 25 MB antes de comprimirlos.");
    e.target.value = "";
    return;
  }

  if (seleccionados.length === 0) {
    setMensajeFotos("Selecciona archivos de imagen válidos.");
    e.target.value = "";
    return;
  }

  const urlsSubidas: string[] = [];
  setSubiendoFotos(true);
  setMensajeFotos(`Procesando ${seleccionados.length} fotografía(s)…`);
  try {
    const comprimidas = await Promise.all(
      seleccionados.map((archivo) => comprimirImagen(archivo))
    );
    for (const blob of comprimidas) {
      const datos = new FormData();
      datos.append("imagen", blob, "fotografia.jpg");
      const respuesta = await fetch("/api/media", {
        method: "POST",
        body: datos,
        signal: AbortSignal.timeout(60_000),
      });
      const resultado = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(resultado?.mensaje || "No se pudo subir la fotografía.");
      }
      if (typeof resultado?.url !== "string") {
        throw new Error("El servidor no devolvió la dirección de la fotografía.");
      }
      urlsSubidas.push(resultado.url as string);
    }

    setImagenes((anteriores) => [...anteriores, ...urlsSubidas]);
    setFotosNuevas((anteriores) => [...anteriores, ...urlsSubidas]);

    setMensajeFotos(
      `${urlsSubidas.length} fotografía(s) cargada(s).`
    );
  } catch (error) {
    await Promise.all(urlsSubidas.map((url) => fetch("/api/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => undefined)));
    setMensajeFotos(
      error instanceof DOMException && error.name === "TimeoutError"
        ? "La carga tardó demasiado. Comprueba tu conexión e inténtalo de nuevo."
        : error instanceof Error
          ? error.message
          : "No se pudieron procesar las fotografías."
    );
  } finally {
    setSubiendoFotos(false);
    e.target.value = "";
    if (contenidoFormularioRef.current) {
      contenidoFormularioRef.current.scrollTop = scrollAntesDeElegirFotos.current;
    }
    requestAnimationFrame(() => botonFotosRef.current?.focus({ preventScroll: true }));
  }
}

function eliminarFoto(index: number) {
  setImagenes((anteriores) =>
    anteriores.filter((_, i) => i !== index)
  );

  setMensajeFotos(
    propiedadEditar
      ? "Fotografía marcada para quitarse al guardar los cambios."
      : "Fotografía quitada del formulario."
  );
}

async function cancelarFormulario() {
  if (subiendoFotos || guardando) return;
  await Promise.all(fotosNuevas.map((url) => fetch("/api/media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).catch(() => undefined)));
  onCerrar();
}

function moverFoto(index: number, direccion: -1 | 1) {
  setImagenes((anteriores) => {
    const destino = index + direccion;
    if (destino < 0 || destino >= anteriores.length) return anteriores;
    const nuevas = [...anteriores];
    [nuevas[index], nuevas[destino]] = [nuevas[destino], nuevas[index]];
    return nuevas;
  });
}

function hacerFotoPrincipal(index: number) {
  setImagenes((actuales) => {
    if (index === 0 || index >= actuales.length) return actuales;
    const nuevas = [...actuales];
    const [principal] = nuevas.splice(index, 1);
    nuevas.unshift(principal);
    return nuevas;
  });
  setMensajeFotos("Portada actualizada.");
}

function agregarEnlaceImagen() {
  const enlace = urlImagen.trim();
  try {
    const url = new URL(enlace);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    setMensajeFotos("Introduce una URL http o https válida.");
    return;
  }
  if (imagenes.length >= 5) {
    setMensajeFotos("Puedes registrar un máximo de 5 fotografías.");
    return;
  }
  if (imagenes.includes(enlace)) {
    setMensajeFotos("Ese enlace ya está en la galería.");
    return;
  }
  setImagenes((actuales) => [...actuales, enlace]);
  setUrlImagen("");
  setMensajeFotos("Fotografía añadida. La primera de la lista será la portada.");
}


  async function manejarEnvio(e: React.FormEvent<HTMLFormElement>) {
    // Evita la recarga del navegador, normaliza los campos y entrega el objeto al dashboard.
    e.preventDefault();

    if (imagenes.length > 5) {
      setMensajeFotos("Una propiedad puede tener un máximo de 5 fotografías.");
      return;
    }

    if (imagenes.some((imagen) => {
      try {
        const url = new URL(imagen);
        return url.protocol !== "https:" && url.protocol !== "http:";
      } catch {
        return true;
      }
    })) {
      setMensajeFotos("Cada enlace de imagen debe ser una URL http o https válida.");
      return;
    }

    if (propiedadEditar) {
      const imagenesQuitadas = (propiedadEditar.imagenes ?? []).some(
        (imagen) => !imagenes.includes(imagen)
      );
      const detalleImagenes = imagenesQuitadas
        ? " Las fotografías marcadas se quitarán de la propiedad."
        : "";
      if (!window.confirm(`¿Deseas guardar los cambios de «${propiedadEditar.nombre}»?${detalleImagenes}`)) {
        return;
      }
    }

    setGuardando(true);
    setErrorGuardado("");
    try {
      await onGuardar({
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim(),
        direccion: direccion.trim() || undefined,
        tipo,
        operacion,
        moneda,
        precio: Number(precio),
        habitaciones: Number(habitaciones),
        banos: banos.trim() === "" ? undefined : Number(banos),
        metros: Number(metros),
        estado,
        descripcion: descripcion.trim() || undefined,
        amenidades: amenidades.split("\n").map((item) => item.trim()).filter(Boolean),
        imagenes,
      });

      const fotosNuevasQuitadas = fotosNuevas.filter(
        (url) => !imagenes.includes(url)
      );
      await Promise.all(fotosNuevasQuitadas.map((url) => fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).catch(() => undefined)));
    } catch (error) {
      setErrorGuardado(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los datos. Inténtalo nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  }

  const estiloInput =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10";

  const estiloLabel =
    "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <form onSubmit={manejarEnvio} className="flex h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden bg-white sm:h-[min(900px,calc(100dvh-3rem))]">

      {/* Encabezado fijo para mantener el contexto y el cierre accesibles al desplazarse. */}
      <div className="z-10 flex shrink-0 items-center justify-between gap-4 border-b border-[#e8e6df] bg-white px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6"
            />
          </svg>
        </div>

        <div>
          <h3 id="formulario-propiedad-titulo" className="text-lg font-semibold text-slate-900">
            {propiedadEditar ? "Editar propiedad" : "Nueva propiedad"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {propiedadEditar
              ? "Actualiza la información de tu inmueble."
              : "Registra un nuevo inmueble en tu cartera."}
          </p>
        </div>
        </div>
        <button type="button" onClick={cancelarFormulario} disabled={subiendoFotos || guardando} aria-label="Cerrar formulario" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">×</button>
      </div>

      <div ref={contenidoFormularioRef} className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">

      {/* Información general */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-emerald-600" />
          <h4 className="text-sm font-bold tracking-wide text-slate-900">
            INFORMACIÓN GENERAL
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={estiloLabel}>
              Nombre de la propiedad
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Apartamento Vista al Mar"
              required
              className={estiloInput}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={estiloLabel}>
              Ubicación
            </label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ciudad, sector o dirección"
              required
              className={estiloInput}
            />
          </div>

          <div>
            <label className={estiloLabel}>Tipo de inmueble</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={estiloInput}>
              <option>Sin especificar</option>
              <option>Apartamento</option>
              <option>Casa</option>
              <option>Villa</option>
              <option>Terreno</option>
              <option>Local comercial</option>
              <option>Oficina</option>
              <option>Otro</option>
            </select>
          </div>

          <div>
            <label className={estiloLabel}>Dirección o referencia</label>
            <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Sector, calle o referencia" className={estiloInput} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="propiedad-descripcion" className={estiloLabel}>
              Descripción del inmueble
            </label>
            <textarea
              id="propiedad-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe las características, acabados, ventajas y detalles de la propiedad..."
              rows={4}
              className={`${estiloInput} resize-y`}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="propiedad-amenidades" className={estiloLabel}>Amenidades (una por línea)</label>
            <textarea id="propiedad-amenidades" value={amenidades} onChange={(e) => setAmenidades(e.target.value)} placeholder="Piscina\nSeguridad 24 horas\nEstacionamiento" rows={3} className={`${estiloInput} resize-y`} />
          </div>
        </div>
      </div>

      {/* Características */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-emerald-600" />
          <h4 className="text-sm font-bold tracking-wide text-slate-900">
            CARACTERÍSTICAS
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={estiloLabel}>
              Habitaciones
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={habitaciones}
              onChange={(e) => setHabitaciones(e.target.value)}
              placeholder="Ej. 3"
              required
              className={estiloInput}
            />
          </div>

          <div>
            <label className={estiloLabel}>
              Baños
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={banos}
              onChange={(e) => setBanos(e.target.value)}
              placeholder="Ej. 2"
              className={estiloInput}
            />
          </div>

          <div className="col-span-2">
            <label className={estiloLabel}>
              Metros cuadrados
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={metros}
                onChange={(e) => setMetros(e.target.value)}
                placeholder="Ej. 120"
                required
                className={`${estiloInput} pr-12`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                m²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fotografías */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-emerald-600" />
          <h4 className="text-sm font-bold tracking-wide text-slate-900">
            FOTOGRAFÍAS
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="url-imagen" className={estiloLabel}>Añadir imagen por enlace</label>
            <div className="flex gap-2">
              <input id="url-imagen" type="url" value={urlImagen} onChange={(e) => setUrlImagen(e.target.value)} placeholder="https://ejemplo.com/foto.jpg" className={estiloInput} />
              <button type="button" onClick={agregarEnlaceImagen} className="shrink-0 rounded-xl bg-[#344536] px-4 text-sm font-medium text-white">Añadir</button>
            </div>
          </div>
          <div>
            <label className={`${estiloLabel} block`}>Subir desde el dispositivo</label>
            <button
              ref={botonFotosRef}
              type="button"
              disabled={subiendoFotos || guardando}
              onClick={() => {
                scrollAntesDeElegirFotos.current = contenidoFormularioRef.current?.scrollTop ?? 0;
                campoFotosRef.current?.click();
              }}
              aria-describedby="mensaje-fotos"
              className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
            >
              {subiendoFotos ? "Subiendo fotografías…" : "Seleccionar JPG, PNG o WebP"}
            </button>
            <input ref={campoFotosRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={subiendoFotos || guardando} onChange={manejarSeleccionFotos} className="hidden" />
          </div>
        </div>

        <p className="text-xs leading-5 text-slate-500">La primera imagen es la portada. Puedes cambiarla o reordenar la galería antes de guardar (máximo 5).</p>
        {mensajeFotos && <p id="mensaje-fotos" className="text-sm text-emerald-800" role="status">{mensajeFotos}</p>}

        {imagenes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imagenes.map((foto, index) => (
              <article key={`${foto}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="relative h-32 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto} alt={`Vista previa de fotografía ${index + 1}`} className="h-full w-full object-cover" />
                  {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#344536] px-2.5 py-1 text-[10px] font-semibold text-white">Portada</span>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 p-2">
                  {index > 0 && <button type="button" onClick={() => hacerFotoPrincipal(index)} className="rounded-lg border border-[#344536]/20 px-2 py-1.5 text-[10px] text-[#344536]">Usar de portada</button>}
                  <button type="button" aria-label={`Mover imagen ${index + 1} a la izquierda`} disabled={index === 0} onClick={() => moverFoto(index, -1)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs disabled:opacity-40">←</button>
                  <button type="button" aria-label={`Mover imagen ${index + 1} a la derecha`} disabled={index === imagenes.length - 1} onClick={() => moverFoto(index, 1)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs disabled:opacity-40">→</button>
                  <button type="button" disabled={subiendoFotos || guardando} onClick={() => eliminarFoto(index)} className="ml-auto rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] text-red-700 disabled:cursor-not-allowed disabled:opacity-40">Quitar</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">Aún no hay fotos. La primera que agregues será la portada.</div>
        )}
      </div>


      {/* Información comercial */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-emerald-600" />
          <h4 className="text-sm font-bold tracking-wide text-slate-900">
            INFORMACIÓN COMERCIAL
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="propiedad-operacion" className={estiloLabel}>Operación</label>
            <select id="propiedad-operacion" value={operacion} onChange={(e) => setOperacion(e.target.value as Operacion)} className={`${estiloInput} cursor-pointer`}>
              <option value="Venta">Venta</option>
              <option value="Alquiler">Alquiler</option>
            </select>
          </div>
          <div>
            <label htmlFor="propiedad-moneda" className={estiloLabel}>Moneda del precio</label>
            <select id="propiedad-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)} className={`${estiloInput} cursor-pointer`}>
              <option value="USD">Dólares estadounidenses (USD)</option>
              <option value="BOB">Pesos dominicanos (RD$)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="propiedad-precio" className={estiloLabel}>
              {operacion === "Alquiler" ? "Precio de alquiler" : "Precio de venta"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400" aria-hidden="true">
                {moneda === "USD" ? "$" : "RD$"}
              </span>
              <input
                id="propiedad-precio"
                type="number"
                min="0"
                step="any"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="185000"
                required
                className={`${estiloInput} pl-9`}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {operacion === "Alquiler" ? "Indica el importe mensual." : "Indica el importe total."} Moneda: {moneda}.
            </p>
          </div>

          <div>
            <label className={estiloLabel}>
              Estado del inmueble
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as Estado)}
              className={`${estiloInput} cursor-pointer`}
            >
              <option value="Disponible">Disponible</option>
              <option value="Reservada">Reservada</option>
              <option value="Vendida">Vendida</option>
            </select>

            <p className="mt-1.5 text-xs text-slate-400">
              Situación actual del inmueble.
            </p>
          </div>
        </div>
      </div>

      </div>

      {/* Acciones fijas: siempre visibles aunque el formulario sea más alto que la pantalla. */}
      <div className="z-10 flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="min-h-5 text-sm text-red-700" role="alert">{errorGuardado}</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={cancelarFormulario}
          disabled={guardando || subiendoFotos}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={guardando || subiendoFotos}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#344536] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#263628] disabled:cursor-wait disabled:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 12 4 4L19 6"
            />
          </svg>

          {guardando ? "Guardando…" : propiedadEditar ? "Guardar cambios" : "Registrar propiedad"}
        </button>
        </div>
      </div>
    </form>
  );
}
