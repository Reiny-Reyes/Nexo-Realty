import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const respuestaGenerica = () => NextResponse.json({
  mensaje: "Si el correo pertenece a una cuenta activa, recibirás un enlace para restablecer la contraseña.",
}, { status: 202 });

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }

  const correo = cuerpo && typeof cuerpo === "object"
    ? (cuerpo as Record<string, unknown>).correo
    : null;
  if (typeof correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) || correo.length > 254) {
    return NextResponse.json({ mensaje: "Escribe un correo electrónico válido." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const remitente = process.env.EMAIL_FROM;
  const sitio = process.env.NEXT_PUBLIC_SITE_URL;
  const secreto = process.env.SESSION_SECRET;
  if (!apiKey || !remitente || !sitio || !secreto) {
    return NextResponse.json({ mensaje: "La recuperación por correo aún no está configurada." }, { status: 503 });
  }

  const emailNormalizado = correo.trim().toLowerCase();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "desconocida";
  const keyHash = createHash("sha256").update(`${ip}:${emailNormalizado}:${secreto}`).digest("hex");

  await pool.query("DELETE FROM password_reset_attempts WHERE window_started_at < NOW() - INTERVAL '1 day'");
  const bloqueo = await pool.query(
    "SELECT locked_until FROM password_reset_attempts WHERE key_hash = $1 AND locked_until > NOW()",
    [keyHash]
  );
  if (bloqueo.rowCount) return respuestaGenerica();

  await pool.query(
    `INSERT INTO password_reset_attempts (key_hash, attempts, window_started_at, locked_until)
     VALUES ($1, 1, NOW(), NULL)
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE
         WHEN password_reset_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1
         ELSE password_reset_attempts.attempts + 1
       END,
       window_started_at = CASE
         WHEN password_reset_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW()
         ELSE password_reset_attempts.window_started_at
       END,
       locked_until = CASE
         WHEN password_reset_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN NULL
         WHEN password_reset_attempts.attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
         ELSE password_reset_attempts.locked_until
       END`,
    [keyHash]
  );

  const cuenta = await pool.query(
    "SELECT id FROM usuarios WHERE LOWER(email) = $1 AND active = TRUE LIMIT 1",
    [emailNormalizado]
  );
  if (!cuenta.rowCount) return respuestaGenerica();

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await pool.query("DELETE FROM password_reset_tokens WHERE usuario_id = $1", [cuenta.rows[0].id]);
  await pool.query(
    `INSERT INTO password_reset_tokens (token_hash, usuario_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
    [tokenHash, cuenta.rows[0].id]
  );

  const enlace = `${sitio.replace(/\/$/, "")}/recuperar-contrasena/restablecer?token=${encodeURIComponent(token)}`;
  try {
    const envio = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [emailNormalizado],
        subject: "Restablece tu contraseña de Nexo Realty",
        text: `Recibimos una solicitud para restablecer tu contraseña. Abre este enlace en los próximos 30 minutos: ${enlace}\n\nSi no hiciste esta solicitud, ignora este mensaje.`,
        html: `<p>Recibimos una solicitud para restablecer tu contraseña de Nexo Realty.</p><p><a href="${enlace}">Crear una contraseña nueva</a></p><p>El enlace vence en 30 minutos. Si no hiciste esta solicitud, ignora este mensaje.</p>`,
      }),
    });
    if (!envio.ok) throw new Error(`El proveedor de correo respondió ${envio.status}.`);
  } catch (error) {
    await pool.query("DELETE FROM password_reset_tokens WHERE token_hash = $1", [tokenHash]);
    console.error("No se pudo enviar el correo de restablecimiento:", error);
    return NextResponse.json({ mensaje: "No se pudo enviar el correo. Inténtalo más tarde." }, { status: 503 });
  }

  return respuestaGenerica();
}
