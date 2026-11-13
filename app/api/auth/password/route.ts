import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { pool } from "@/lib/db";
import { hashPassword, verificarPassword } from "@/lib/passwords";
import { COOKIE_SESION, crearTokenSesion, duracionSesion } from "@/lib/auth";

export async function PATCH(request: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json({ mensaje: "Inicia sesión para continuar." }, { status: 401 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "El contenido debe ser JSON válido." }, { status: 400 });
  }
  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json({ mensaje: "Datos no válidos." }, { status: 400 });
  }
  const datos = cuerpo as Record<string, unknown>;
  if (typeof datos.actual !== "string" || typeof datos.nueva !== "string" || datos.nueva.length < 12) {
    return NextResponse.json({ mensaje: "Escribe tu contraseña actual y una nueva de al menos 12 caracteres." }, { status: 400 });
  }

  const consulta = await pool.query("SELECT password_hash FROM usuarios WHERE id = $1", [sesion.id]);
  if (!consulta.rows[0] || !(await verificarPassword(datos.actual, consulta.rows[0].password_hash))) {
    return NextResponse.json({ mensaje: "La contraseña actual no coincide." }, { status: 401 });
  }
  const hash = await hashPassword(datos.nueva);
  const actualizada = await pool.query(
    `UPDATE usuarios
     SET password_hash = $1, force_password_change = FALSE,
         session_version = session_version + 1, updated_at = NOW()
     WHERE id = $2
     RETURNING username, session_version`,
    [hash, sesion.id]
  );
  const cuenta = actualizada.rows[0];
  const respuesta = NextResponse.json({ actualizado: true });
  respuesta.cookies.set(COOKIE_SESION, crearTokenSesion({
    id: sesion.id,
    username: cuenta.username,
    sessionVersion: Number(cuenta.session_version),
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: duracionSesion,
  });
  return respuesta;
}
