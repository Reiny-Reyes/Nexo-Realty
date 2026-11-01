
"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Estado, Propiedad } from "@/types/propiedad";


function comprimirImagen(file: File): Promise<string> {
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

      const resultado = canvas.toDataURL("image/jpeg", 0.72);

      URL.revokeObjectURL(url);
      resolve(resultado);
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar una fotografía."));
    };

    imagen.src = url;
  });
}


type FormularioPropiedadProps = {
  onGuardar: (propiedad: Omit<Propiedad, "id">) => void;
  onCerrar: () => void;
  propiedadEditar?: Propiedad;
};

export default function FormularioPropiedad(props: FormularioPropiedadProps) {
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
  const [nombre, setNombre] = useState(propiedadEditar?.nombre ?? "");
  const [ubicacion, setUbicacion] = useState(propiedadEditar?.ubicacion ?? "");
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
 const [imagenes, setImagenes] = useState(
  propiedadEditar?.imagenes
    ?.filter((foto) => !foto.startsWith("data:image/"))
    .join("\n") ?? ""
);

const [fotosSubidas, setFotosSubidas] = useState<string[]>(
  propiedadEditar?.imagenes?.filter((foto) =>
    foto.startsWith("data:image/")
  ) ?? []
);

const [mensajeFotos, setMensajeFotos] = useState("");
  const [estado, setEstado] = useState<Estado>(
    propiedadEditar?.estado ?? "Disponible"
  );

  
async function manejarSeleccionFotos(
  e: ChangeEvent<HTMLInputElement>
) {
  const archivos = Array.from(e.target.files ?? []);
  const disponibles = 5 - fotosSubidas.length;

  if (archivos.length === 0) return;

  if (disponibles <= 0) {
    setMensajeFotos("Puedes subir un máximo de 5 fotografías.");
    e.target.value = "";
    return;
  }

  const seleccionados = archivos
    .filter((archivo) => archivo.type.startsWith("image/"))
    .slice(0, disponibles);

  if (seleccionados.length === 0) {
    setMensajeFotos("Selecciona archivos de imagen válidos.");
    e.target.value = "";
    return;
  }

  try {
    const comprimidas = await Promise.all(
      seleccionados.map((archivo) => comprimirImagen(archivo))
    );

    setFotosSubidas((anteriores) => [
      ...anteriores,
      ...comprimidas,
    ]);

    setMensajeFotos(
      `${comprimidas.length} fotografía(s) añadida(s).`
    );
  } catch {
    setMensajeFotos("No se pudieron procesar las fotografías.");
  }

  e.target.value = "";
}

function eliminarFoto(index: number) {
  setFotosSubidas((anteriores) =>
    anteriores.filter((_, i) => i !== index)
  );

  setMensajeFotos("Fotografía eliminada.");
}


  function manejarEnvio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const listaImagenes = imagenes
      .split("\n")
      .map((imagen) => imagen.trim())
      .filter((imagen) => imagen.length > 0);

    onGuardar({
      nombre: nombre.trim(),
      ubicacion: ubicacion.trim(),
      precio: Number(precio),
      habitaciones: Number(habitaciones),
      banos: banos.trim() === "" ? undefined : Number(banos),
      metros: Number(metros),
      estado,
      descripcion: descripcion.trim() || undefined,
      imagenes: [...listaImagenes, ...fotosSubidas],
    });
  }

  const estiloInput =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10";

  const estiloLabel =
    "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <form onSubmit={manejarEnvio} className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4">
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
          <h3 className="text-base font-bold text-slate-900">
            {propiedadEditar ? "Editar propiedad" : "Nueva propiedad"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {propiedadEditar
              ? "Actualiza la información de tu inmueble."
              : "Registra un nuevo inmueble en tu cartera."}
          </p>
        </div>
      </div>

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

          <div className="sm:col-span-2">
            <label className={estiloLabel}>
              Descripción del inmueble
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe las características, acabados, ventajas y detalles de la propiedad..."
              rows={4}
              className={`${estiloInput} resize-y`}
            />
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

        <div>
          <label className={estiloLabel}>
            Enlaces de imágenes
          </label>
          <textarea
            value={imagenes}
            onChange={(e) => setImagenes(e.target.value)}
            placeholder={"https://ejemplo.com/foto1.jpg\nhttps://ejemplo.com/foto2.jpg"}
            rows={4}
            className={`${estiloInput} resize-y`}
          />
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Introduce un enlace por línea. Utiliza direcciones de imágenes
            accesibles desde internet.
          </p>
        </div>
      </div>

      
<div className="space-y-3">
  <label className={estiloLabel}>
    Subir fotografías desde tu computadora
  </label>

  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
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
          d="M12 16V4m0 0L7 9m5-5 5 5M4 16v4h16v-4"
        />
      </svg>
    </span>

    <span className="text-sm font-semibold text-slate-700">
      Seleccionar fotografías
    </span>

    <span className="mt-1 text-xs text-slate-400">
      JPG, PNG o WebP · Máximo 5 fotografías
    </span>

    <input
      type="file"
      accept="image/*"
      multiple
      onChange={manejarSeleccionFotos}
      className="hidden"
    />
  </label>

  {mensajeFotos && (
    <p className="text-xs text-emerald-700">
      {mensajeFotos}
    </p>
  )}

  {fotosSubidas.length > 0 && (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fotosSubidas.map((foto, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-xl border border-slate-200"
        >
          <img
            src={foto}
            alt={`Fotografía ${index + 1}`}
            className="h-32 w-full object-cover"
          />

          <button
            type="button"
            onClick={() => eliminarFoto(index)}
            className="absolute right-2 top-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      ))}
    </div>
  )}

  <p className="text-xs leading-5 text-slate-400">
    Puedes seleccionar varias fotografías y eliminar las que no quieras utilizar.
  </p>
</div>


      {/* Información comercial */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-emerald-600" />
          <h4 className="text-sm font-bold tracking-wide text-slate-900">
            INFORMACIÓN COMERCIAL
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={estiloLabel}>
              Precio de venta
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                $
              </span>
              <input
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
              Precio expresado en dólares (USD).
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

      {/* Acciones */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 active:scale-[0.98]"
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

          {propiedadEditar ? "Guardar cambios" : "Registrar propiedad"}
        </button>
      </div>
    </form>
  );
}
