export type Estado = "Disponible" | "Reservada" | "Vendida";

export type Propiedad = {
  id: number;
  nombre: string;
  ubicacion: string;
  precio: number;
  habitaciones: number;
  banos?: number;
  metros: number;
  estado: Estado;
  descripcion?: string;
  imagenes?: string[];
};