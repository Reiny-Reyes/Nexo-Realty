import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Inicia sesión para ver las consultas." }, { status: 401 });
  }
  const resultado = await pool.query(
    `SELECT c.id, c.propiedad_id, c.propiedad_nombre, c.nombre, c.telefono,
       c.email, c.mensaje, c.estado, c.created_at, c.updated_at
     FROM consultas c ORDER BY c.created_at DESC LIMIT 200`
  );
  return NextResponse.json(resultado.rows);
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }
  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json({ mensaje: "Completa los datos de contacto." }, { status: 400 });
  }
  const datos = cuerpo as Record<string, unknown>;
  const propiedadId = Number(datos.propiedadId);
  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const telefono = typeof datos.telefono === "string" ? datos.telefono.trim() : "";
  const email = typeof datos.email === "string" ? datos.email.trim().toLowerCase() : "";
  const mensaje = typeof datos.mensaje === "string" ? datos.mensaje.trim() : "";

  if (!Number.isInteger(propiedadId) || propiedadId <= 0 || nombre.length < 2 || nombre.length > 100 || telefono.length < 5 || telefono.length > 40 || (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) || mensaje.length > 2000) {
    return NextResponse.json({ mensaje: "Revisa el nombre, teléfono, correo y mensaje." }, { status: 400 });
  }

  const propiedad = await pool.query(
    "SELECT id, nombre FROM propiedades WHERE id = $1 AND estado = 'Disponible'",
    [propiedadId]
  );
  if (!propiedad.rowCount) {
    return NextResponse.json({ mensaje: "Esta propiedad ya no está disponible." }, { status: 404 });
  }

  const secreto = process.env.SESSION_SECRET;
  if (!secreto) return NextResponse.json({ mensaje: "El servicio no está disponible." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "desconocida";
  const ipHash = createHash("sha256").update(`${ip}:${secreto}`).digest("hex");
  const recientes = await pool.query(
    "SELECT COUNT(*)::int AS total FROM consultas WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '1 hour'",
    [ipHash]
  );
  if (Number(recientes.rows[0].total) >= 5) {
    return NextResponse.json({ mensaje: "Recibimos varias solicitudes desde esta conexión. Inténtalo más tarde." }, { status: 429 });
  }

  const creada = await pool.query(
    `INSERT INTO consultas
       (propiedad_id, propiedad_nombre, nombre, telefono, email, mensaje, ip_hash)
     VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), $7)
     RETURNING id, created_at`,
    [propiedadId, propiedad.rows[0].nombre, nombre, telefono, email, mensaje, ipHash]
  );
  return NextResponse.json({ guardada: true, id: creada.rows[0].id }, { status: 201 });
}
