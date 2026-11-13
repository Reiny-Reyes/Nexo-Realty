import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

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
  const propiedadId = Number(datos.propiedadId);
  const visitante = datos.visitante;
  if (!Number.isInteger(propiedadId) || propiedadId <= 0 || typeof visitante !== "string" || !/^[0-9a-f-]{36}$/i.test(visitante)) {
    return NextResponse.json({ mensaje: "Los datos de visita no son válidos." }, { status: 400 });
  }

  const secreto = process.env.SESSION_SECRET;
  if (!secreto) return NextResponse.json({ mensaje: "Servicio no disponible." }, { status: 503 });
  const visitanteHash = createHash("sha256").update(`${visitante}:${secreto}`).digest("hex");
  await pool.query(
    `INSERT INTO vistas_propiedad (propiedad_id, visitor_hash)
     SELECT id, $2 FROM propiedades WHERE id = $1
     ON CONFLICT (propiedad_id, visitor_hash, visit_date) DO NOTHING`,
    [propiedadId, visitanteHash]
  );
  return NextResponse.json({ registrada: true });
}
