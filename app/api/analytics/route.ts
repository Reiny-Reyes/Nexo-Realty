import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Inicia sesión para ver las estadísticas." }, { status: 401 });
  }

  const [resumen, consultas, masVistas] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS vistas_30_dias,
         COUNT(DISTINCT propiedad_id)::int AS propiedades_vistas
       FROM vistas_propiedad WHERE created_at >= NOW() - INTERVAL '30 days'`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total_30_dias,
         COUNT(*) FILTER (WHERE estado = 'Nueva')::int AS nuevas
       FROM consultas WHERE created_at >= NOW() - INTERVAL '30 days'`
    ),
    pool.query(
      `SELECT p.id, p.nombre, COUNT(v.id)::int AS vistas
       FROM propiedades p
       LEFT JOIN vistas_propiedad v ON v.propiedad_id = p.id
         AND v.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY p.id ORDER BY vistas DESC, p.id DESC LIMIT 5`
    ),
  ]);

  const vistas = Number(resumen.rows[0].vistas_30_dias);
  const solicitudes = Number(consultas.rows[0].total_30_dias);
  return NextResponse.json({
    periodoDias: 30,
    vistas,
    propiedadesVistas: Number(resumen.rows[0].propiedades_vistas),
    consultas: solicitudes,
    consultasNuevas: Number(consultas.rows[0].nuevas),
    conversionPorcentaje: vistas > 0 ? Math.round((solicitudes / vistas) * 1000) / 10 : 0,
    masVistas: masVistas.rows,
  });
}
