import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { pool } from "@/lib/db";

type Contexto = { params: Promise<{ id: string }> };
const estados = ["Nueva", "En seguimiento", "Cerrada"];

export async function PATCH(request: Request, { params }: Contexto) {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "admin" || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Solo un administrador puede actualizar consultas." }, { status: 403 });
  }

  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ mensaje: "La consulta no es válida." }, { status: 400 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }
  const estado = cuerpo && typeof cuerpo === "object"
    ? (cuerpo as Record<string, unknown>).estado
    : null;
  if (typeof estado !== "string" || !estados.includes(estado)) {
    return NextResponse.json({ mensaje: "El estado seleccionado no es válido." }, { status: 400 });
  }

  const resultado = await pool.query(
    `UPDATE consultas SET estado = $1, updated_at = NOW()
     WHERE id = $2 RETURNING id, estado, updated_at`,
    [estado, id]
  );
  if (!resultado.rowCount) {
    return NextResponse.json({ mensaje: "No se encontró la consulta." }, { status: 404 });
  }
  return NextResponse.json(resultado.rows[0]);
}
