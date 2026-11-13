
// Almacén local reactivo usado actualmente por la página de detalle; no es la API PostgreSQL.
import type { Propiedad } from "@/types/propiedad";

export const propiedadesIniciales: Propiedad[] = [
  {
    id: 1,
    nombre: "Apartamento Vista al Mar",
    ubicacion: "Santo Domingo, Distrito Nacional",
    operacion: "Venta",
    moneda: "USD",
    precio: 185000,
    habitaciones: 3,
    metros: 120,
    estado: "Disponible",
  },
  {
    id: 2,
    nombre: "Villa Residencial",
    ubicacion: "Punta Cana, La Altagracia",
    operacion: "Venta",
    moneda: "USD",
    precio: 320000,
    habitaciones: 4,
    metros: 240,
    estado: "Reservada",
  },
  {
    id: 3,
    nombre: "Apartamento Moderno",
    ubicacion: "Santiago de los Caballeros",
    operacion: "Venta",
    moneda: "USD",
    precio: 95000,
    habitaciones: 2,
    metros: 85,
    estado: "Vendida",
  },
  {
    id: 4,
    nombre: "Penthouse de Lujo",
    ubicacion: "Santo Domingo, Piantini",
    operacion: "Venta",
    moneda: "USD",
    precio: 450000,
    habitaciones: 3,
    metros: 210,
    estado: "Disponible",
  },
];

const CLAVE_ALMACENAMIENTO = "nexo-propiedades";

let propiedadesActuales = propiedadesIniciales;
let suscripcionInicializada = false;

const suscriptores = new Set<() => void>();

export function obtenerPropiedades(): Propiedad[] {
  return propiedadesActuales;
}

export function obtenerPropiedadesServidor(): Propiedad[] {
  return propiedadesIniciales;
}

function notificarCambios() {
  suscriptores.forEach((notificar) => notificar());
}

function leerAlmacenamiento(): Propiedad[] {
  try {
    const datos = localStorage.getItem(CLAVE_ALMACENAMIENTO);

    if (datos === null) return propiedadesIniciales;

    const resultado: unknown = JSON.parse(datos);

    if (
      !Array.isArray(resultado) ||
      !resultado.every(
        (p) =>
          typeof p.id === "number" &&
          typeof p.nombre === "string" &&
          typeof p.ubicacion === "string" &&
          typeof p.precio === "number" &&
          typeof p.habitaciones === "number" &&
          typeof p.metros === "number" &&
          ["Disponible", "Reservada", "Vendida"].includes(p.estado)
      )
    ) {
      return propiedadesIniciales;
    }

    return resultado as Propiedad[];
  } catch {
    console.error("No se pudieron cargar las propiedades.");
    return propiedadesIniciales;
  }
}

export function escucharCambios(notificar: () => void) {
  suscriptores.add(notificar);

  if (!suscripcionInicializada) {
    suscripcionInicializada = true;
    propiedadesActuales = leerAlmacenamiento();
  }

  function manejarAlmacenamiento(evento: StorageEvent) {
    if (
      evento.key !== CLAVE_ALMACENAMIENTO &&
      evento.key !== null
    ) {
      return;
    }

    propiedadesActuales = leerAlmacenamiento();
    notificarCambios();
  }

  window.addEventListener("storage", manejarAlmacenamiento);

  return () => {
    suscriptores.delete(notificar);
    window.removeEventListener("storage", manejarAlmacenamiento);
  };
}

export function guardarPropiedades(nuevasPropiedades: Propiedad[]) {
  propiedadesActuales = nuevasPropiedades;

  try {
    localStorage.setItem(
      CLAVE_ALMACENAMIENTO,
      JSON.stringify(nuevasPropiedades)
    );
  } catch (error) {
    console.error("No se pudieron guardar las propiedades:", error);
  }

  notificarCambios();
}
