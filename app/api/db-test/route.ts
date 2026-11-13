
// Endpoint de diagnóstico que confirma si el servidor puede consultar PostgreSQL.
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "admin" || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "No autorizado." }, { status: 403 });
  }

  try {
    const resultado = await pool.query(
      "SELECT current_database() AS base_de_datos, NOW() AS fecha"
    );

    return NextResponse.json({
      conectado: true,
      mensaje: "Conexión con PostgreSQL exitosa",
      baseDeDatos: resultado.rows[0].base_de_datos,
      fecha: resultado.rows[0].fecha,
    });
  } catch (error) {
    console.error("Error de conexión PostgreSQL:", error);

    return NextResponse.json(
      {
        conectado: false,
        mensaje: "No se pudo conectar con PostgreSQL",
      },
      { status: 500 }
    );
  }
}
