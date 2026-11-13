import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }

  const datos = cuerpo && typeof cuerpo === "object"
    ? cuerpo as Record<string, unknown>
    : {};
  if (typeof datos.token !== "string" || datos.token.length < 32 || typeof datos.contrasena !== "string" || datos.contrasena.length < 12) {
    return NextResponse.json({ mensaje: "El enlace o la contraseña no son válidos. Usa al menos 12 caracteres." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(datos.token).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const token = await client.query(
      `SELECT r.usuario_id
       FROM password_reset_tokens r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.token_hash = $1 AND r.expires_at > NOW() AND u.active = TRUE
       FOR UPDATE OF r, u`,
      [tokenHash]
    );
    if (!token.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ mensaje: "El enlace venció o ya fue utilizado. Solicita uno nuevo." }, { status: 400 });
    }

    const usuarioId = Number(token.rows[0].usuario_id);
    const passwordHash = await hashPassword(datos.contrasena);
    await client.query(
      `UPDATE usuarios SET password_hash = $1, force_password_change = FALSE,
         session_version = session_version + 1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, usuarioId]
    );
    await client.query("DELETE FROM password_reset_tokens WHERE usuario_id = $1", [usuarioId]);
    await client.query("COMMIT");
    return NextResponse.json({ restablecida: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("No se pudo restablecer la contraseña:", error);
    return NextResponse.json({ mensaje: "No se pudo restablecer la contraseña." }, { status: 500 });
  } finally {
    client.release();
  }
}
