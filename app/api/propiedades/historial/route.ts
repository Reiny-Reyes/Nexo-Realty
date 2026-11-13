import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Inicia sesión para continuar." }, { status: 401 });
  }
  try {
    const resultado = await pool.query(
      `SELECT id, propiedad_id, propiedad_nombre, username, accion, cambios, created_at
       FROM historial_propiedades ORDER BY created_at DESC LIMIT 100`
    );
    return NextResponse.json(resultado.rows);
  } catch (error) {
    console.error("No se pudo cargar el historial:", error);
    return NextResponse.json({ mensaje: "No se pudo cargar el historial." }, { status: 500 });
  }
}
