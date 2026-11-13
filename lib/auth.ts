import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { esErrorDeConexionDB } from "@/lib/db-errors";

export const COOKIE_SESION = "nexo_session";
const DURACION_SESION_SEGUNDOS = 60 * 60 * 8;

export type RolUsuario = "admin" | "viewer";

export type SesionUsuario = {
  id: number;
  usuario: string;
  rol: RolUsuario;
  debeCambiarContrasena: boolean;
};

type DatosSesion = {
  id: number;
  usuario: string;
  version: number;
  expira: number;
};

function obtenerSecreto() {
  const secreto = process.env.SESSION_SECRET;
  return secreto && secreto.length >= 32 ? secreto : null;
}

export function crearTokenSesion(usuario: { id: number; username: string; sessionVersion: number }) {
  const secreto = obtenerSecreto();
  if (!secreto) {
    throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
  }

  const datos: DatosSesion = {
    id: usuario.id,
    usuario: usuario.username,
    version: usuario.sessionVersion,
    expira: Math.floor(Date.now() / 1000) + DURACION_SESION_SEGUNDOS,
  };
  const contenido = Buffer.from(JSON.stringify(datos)).toString("base64url");
  const firma = createHmac("sha256", secreto)
    .update(contenido)
    .digest("base64url");
  return `${contenido}.${firma}`;
}

function validarToken(token: string | undefined): DatosSesion | null {
  const secreto = obtenerSecreto();
  if (!token || !secreto) return null;

  const [contenido, firmaRecibida, ...resto] = token.split(".");
  if (!contenido || !firmaRecibida || resto.length > 0) return null;

  const firmaEsperada = createHmac("sha256", secreto)
    .update(contenido)
    .digest("base64url");
  const firmaA = Buffer.from(firmaRecibida);
  const firmaB = Buffer.from(firmaEsperada);
  if (firmaA.length !== firmaB.length || !timingSafeEqual(firmaA, firmaB)) {
    return null;
  }

  try {
    const datos = JSON.parse(
      Buffer.from(contenido, "base64url").toString("utf8")
    ) as DatosSesion;
    if (
      !Number.isInteger(datos.id) ||
      typeof datos.usuario !== "string" ||
      !Number.isInteger(datos.version) ||
      typeof datos.expira !== "number" ||
      datos.expira <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return datos;
  } catch {
    return null;
  }
}

export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const cookieStore = await cookies();
  const token = validarToken(cookieStore.get(COOKIE_SESION)?.value);
  if (!token) return null;

  let resultado;
  try {
    resultado = await pool.query(
      `SELECT id, username, role, active, force_password_change, session_version
       FROM usuarios WHERE id = $1`,
      [token.id]
    );
  } catch (error) {
    if (esErrorDeConexionDB(error)) return null;
    throw error;
  }
  const usuario = resultado.rows[0];
  if (
    !usuario ||
    !usuario.active ||
    usuario.username !== token.usuario ||
    Number(usuario.session_version) !== token.version ||
    (usuario.role !== "admin" && usuario.role !== "viewer")
  ) {
    return null;
  }

  return {
    id: Number(usuario.id),
    usuario: usuario.username,
    rol: usuario.role,
    debeCambiarContrasena: Boolean(usuario.force_password_change),
  };
}

export async function obtenerBloqueoLogin(usuario: string) {
  const resultado = await pool.query(
    `SELECT locked_until FROM auth_login_attempts
     WHERE username_key = $1 AND locked_until > NOW()`,
    [usuario.trim().toLowerCase()]
  );
  const bloqueo = resultado.rows[0]?.locked_until as Date | undefined;
  return bloqueo ? Math.max(1, Math.ceil((bloqueo.getTime() - Date.now()) / 1000)) : 0;
}

export async function registrarLoginFallido(usuario: string) {
  await pool.query(
    "DELETE FROM auth_login_attempts WHERE window_started_at < NOW() - INTERVAL '1 day'"
  );
  await pool.query(
    `INSERT INTO auth_login_attempts (username_key, attempts, window_started_at, locked_until)
     VALUES ($1, 1, NOW(), NULL)
     ON CONFLICT (username_key) DO UPDATE SET
       attempts = CASE
         WHEN auth_login_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1
         ELSE auth_login_attempts.attempts + 1
       END,
       window_started_at = CASE
         WHEN auth_login_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW()
         ELSE auth_login_attempts.window_started_at
       END,
       locked_until = CASE
         WHEN auth_login_attempts.window_started_at < NOW() - INTERVAL '15 minutes'
           THEN NULL
         WHEN auth_login_attempts.attempts + 1 >= 5
           THEN NOW() + INTERVAL '15 minutes'
         ELSE auth_login_attempts.locked_until
       END`,
    [usuario.trim().toLowerCase()]
  );
}

export async function limpiarIntentosLogin(usuario: string) {
  await pool.query(
    "DELETE FROM auth_login_attempts WHERE username_key = $1",
    [usuario.trim().toLowerCase()]
  );
}

export const duracionSesion = DURACION_SESION_SEGUNDOS;
