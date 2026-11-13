import { NextResponse } from "next/server";
import {
  COOKIE_SESION,
  crearTokenSesion,
  duracionSesion,
  limpiarIntentosLogin,
  obtenerBloqueoLogin,
  registrarLoginFallido,
} from "@/lib/auth";
import { pool } from "@/lib/db";
import { verificarPassword } from "@/lib/passwords";
import { esErrorDeConexionDB, MENSAJE_DB_NO_DISPONIBLE } from "@/lib/db-errors";

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }

  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }

  const datos = cuerpo as Record<string, unknown>;
  if (typeof datos.usuario !== "string" || typeof datos.contrasena !== "string") {
    return NextResponse.json({ mensaje: "Escribe tu usuario y contraseña." }, { status: 400 });
  }

  try {
    const usuario = datos.usuario.trim();
    const bloqueo = await obtenerBloqueoLogin(usuario);
    if (bloqueo > 0) {
      return NextResponse.json(
        { mensaje: "Demasiados intentos. Inténtalo de nuevo en 15 minutos." },
        { status: 429, headers: { "Retry-After": String(bloqueo) } }
      );
    }

    const consulta = await pool.query(
      `SELECT id, username, password_hash, role, active, session_version
       FROM usuarios WHERE LOWER(username) = LOWER($1)`,
      [usuario]
    );
    const cuenta = consulta.rows[0];
    const passwordCorrecta = cuenta
      ? await verificarPassword(datos.contrasena, cuenta.password_hash)
      : false;

    if (!cuenta || !cuenta.active || !passwordCorrecta) {
      await registrarLoginFallido(usuario);
      return NextResponse.json({ mensaje: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    await limpiarIntentosLogin(usuario);
    const sesion = {
      id: Number(cuenta.id),
      username: cuenta.username,
      sessionVersion: Number(cuenta.session_version),
    };
    const respuesta = NextResponse.json({ usuario: cuenta.username, rol: cuenta.role });
    respuesta.cookies.set(COOKIE_SESION, crearTokenSesion(sesion), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: duracionSesion,
    });
    return respuesta;
  } catch (error) {
    console.error("No se pudo completar el inicio de sesión.", error);
    return NextResponse.json(
      { mensaje: esErrorDeConexionDB(error) ? MENSAJE_DB_NO_DISPONIBLE : "No se pudo verificar el acceso en este momento." },
      { status: 503 }
    );
  }
}
