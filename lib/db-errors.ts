const ERRORES_DE_CONEXION = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ETIMEDOUT",
]);

export function esErrorDeConexionDB(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const dato = error as { code?: unknown; errors?: unknown[] };
  if (typeof dato.code === "string" && ERRORES_DE_CONEXION.has(dato.code)) {
    return true;
  }

  return Array.isArray(dato.errors) && dato.errors.some(esErrorDeConexionDB);
}

export const MENSAJE_DB_NO_DISPONIBLE =
  "No se puede conectar con PostgreSQL. Revisa DATABASE_URL y confirma que la base de datos esté encendida y accesible.";
