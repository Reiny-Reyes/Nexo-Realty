import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";

const responderNoAutorizado = () =>
  NextResponse.json({ mensaje: "Solo un administrador puede gestionar usuarios." }, { status: 403 });

export async function GET() {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "admin" || sesion.debeCambiarContrasena) return responderNoAutorizado();

  const resultado = await pool.query(
    `SELECT id, username, email, role, active, force_password_change, created_at
     FROM usuarios ORDER BY created_at DESC, id DESC`
  );
  return NextResponse.json(resultado.rows);
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "admin" || sesion.debeCambiarContrasena) return responderNoAutorizado();

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "El contenido debe ser JSON válido." }, { status: 400 });
  }
  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json({ mensaje: "Datos de usuario no válidos." }, { status: 400 });
  }

  const datos = cuerpo as Record<string, unknown>;
  const username = typeof datos.usuario === "string" ? datos.usuario.trim() : "";
  const password = typeof datos.contrasena === "string" ? datos.contrasena : "";
  const role = datos.rol;
  const email = typeof datos.correo === "string" ? datos.correo.trim().toLowerCase() : "";

  if (!/^[\p{L}\p{N}._-]{3,40}$/u.test(username)) {
    return NextResponse.json({ mensaje: "El usuario debe tener entre 3 y 40 caracteres (letras, números, punto, guion o guion bajo)." }, { status: 400 });
  }
  if (password.length < 12) {
    return NextResponse.json({ mensaje: "La contraseña debe tener al menos 12 caracteres." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ mensaje: "Escribe un correo electrónico válido para la recuperación de la cuenta." }, { status: 400 });
  }
  if (role !== "admin" && role !== "viewer") {
    return NextResponse.json({ mensaje: "El rol debe ser administrador o solo lectura." }, { status: 400 });
  }

  const hash = await hashPassword(password);
  try {
    const resultado = await pool.query(
      `INSERT INTO usuarios (username, password_hash, role, email)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, active, force_password_change, created_at`,
      [username, hash, role, email]
    );
    return NextResponse.json(resultado.rows[0], { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ mensaje: "Ese nombre de usuario ya existe." }, { status: 409 });
    }
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ mensaje: "No se pudo crear el usuario." }, { status: 500 });
  }
}
