// Tipos centrales para compartir estados y forma de una propiedad entre páginas y API.
export type Estado = "Disponible" | "Reservada" | "Vendida";
export type Operacion = "Venta" | "Alquiler";
export type Moneda = "USD" | "BOB";

export type Propiedad = {
  id: number;
  nombre: string;
  ubicacion: string;
  direccion?: string;
  tipo?: string;
  operacion: Operacion;
  moneda: Moneda;
  precio: number;
  habitaciones: number;
  banos?: number;
  metros: number;
  estado: Estado;
  descripcion?: string;
  amenidades?: string[];
  imagenes?: string[];
};
