import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";

type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Contexto) {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "admin" || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Solo un administrador puede gestionar usuarios." }, { status: 403 });
  }

  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ mensaje: "ID de usuario no válido." }, { status: 400 });
  }

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
  const actual = await pool.query("SELECT id, role, active, email FROM usuarios WHERE id = $1", [id]);
  if (!actual.rows[0]) {
    return NextResponse.json({ mensaje: "No se encontró el usuario." }, { status: 404 });
  }

  const nuevoRol = datos.rol === undefined ? actual.rows[0].role : datos.rol;
  const nuevaActividad = datos.activo === undefined ? actual.rows[0].active : datos.activo;
  const contrasena = datos.contrasena;
  const correo = datos.correo === undefined
    ? actual.rows[0].email
    : typeof datos.correo === "string"
      ? datos.correo.trim().toLowerCase()
      : null;
  if (nuevoRol !== "admin" && nuevoRol !== "viewer") {
    return NextResponse.json({ mensaje: "Rol no válido." }, { status: 400 });
  }
  if (typeof nuevaActividad !== "boolean") {
    return NextResponse.json({ mensaje: "El estado activo debe ser verdadero o falso." }, { status: 400 });
  }
  if (contrasena !== undefined && (typeof contrasena !== "string" || contrasena.length < 12)) {
    return NextResponse.json({ mensaje: "La nueva contraseña debe tener al menos 12 caracteres." }, { status: 400 });
  }
  if (typeof correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
    return NextResponse.json({ mensaje: "Escribe un correo electrónico válido." }, { status: 400 });
  }
  if (id === sesion.id && contrasena !== undefined) {
    return NextResponse.json({ mensaje: "Usa Mi contraseña para actualizar tu propia clave." }, { status: 400 });
  }
  if (id === sesion.id && (nuevoRol !== "admin" || !nuevaActividad)) {
    return NextResponse.json({ mensaje: "No puedes cambiar tu propia cuenta a solo lectura ni desactivarla." }, { status: 400 });
  }

  const quitaAdmin = actual.rows[0].role === "admin" && actual.rows[0].active &&
    (nuevoRol !== "admin" || !nuevaActividad);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (quitaAdmin) {
      await client.query("SELECT pg_advisory_xact_lock(481516, 2342)");
      const admins = await client.query(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE role = 'admin' AND active = TRUE AND id <> $1",
        [id]
      );
      if (Number(admins.rows[0].total) === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ mensaje: "Debe permanecer al menos un administrador activo." }, { status: 409 });
      }
    }

    const hash = typeof contrasena === "string" ? await hashPassword(contrasena) : null;
    if (correo !== actual.rows[0].email) {
      await client.query("DELETE FROM password_reset_tokens WHERE usuario_id = $1", [id]);
    }
    const actualizado = await client.query(
      `UPDATE usuarios SET role = $1, active = $2, email = $3,
         password_hash = COALESCE($4, password_hash),
         force_password_change = CASE WHEN $4::text IS NOT NULL THEN TRUE ELSE force_password_change END,
         session_version = session_version + CASE
           WHEN $4::text IS NOT NULL OR role <> $1 OR active <> $2 THEN 1 ELSE 0 END,
         updated_at = NOW()
       WHERE id = $5
       RETURNING id, username, email, role, active, force_password_change, created_at`,
      [nuevoRol, nuevaActividad, correo, hash, id]
    );
    await client.query("COMMIT");
    return NextResponse.json(actualizado.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ mensaje: "Ese correo ya está asociado a otra cuenta." }, { status: 409 });
    }
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ mensaje: "No se pudo actualizar el usuario." }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "admin" || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Solo un administrador puede gestionar usuarios." }, { status: 403 });
  }
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ mensaje: "ID de usuario no válido." }, { status: 400 });
  }
  if (id === sesion.id) {
    return NextResponse.json({ mensaje: "No puedes eliminar tu propia cuenta." }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(481516, 2342)");
    const usuario = await client.query("SELECT role, active FROM usuarios WHERE id = $1 FOR UPDATE", [id]);
    if (!usuario.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ mensaje: "No se encontró el usuario." }, { status: 404 });
    }
    if (usuario.rows[0].role === "admin" && usuario.rows[0].active) {
      const admins = await client.query(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE role = 'admin' AND active = TRUE AND id <> $1",
        [id]
      );
      if (Number(admins.rows[0].total) === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ mensaje: "Debe permanecer al menos un administrador activo." }, { status: 409 });
      }
    }
    await client.query("DELETE FROM usuarios WHERE id = $1", [id]);
    await client.query("COMMIT");
    return NextResponse.json({ eliminado: true, id });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ mensaje: "No se pudo eliminar el usuario." }, { status: 500 });
  } finally {
    client.release();
  }
}
