
// API de colección: GET lista propiedades y POST valida y registra una nueva en PostgreSQL.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esErrorDeConexionDB, MENSAJE_DB_NO_DISPONIBLE } from "@/lib/db-errors";
import type { Estado, Propiedad } from "@/types/propiedad";

const estados: Estado[] = ["Disponible", "Reservada", "Vendida"];
const operaciones = ["Venta", "Alquiler"] as const;
const monedas = ["USD", "BOB"] as const;
const tiposPropiedad = ["Sin especificar", "Apartamento", "Casa", "Villa", "Terreno", "Local comercial", "Oficina", "Otro"];

// Comprueba el cuerpo recibido antes de usarlo en las consultas SQL.
function validarPropiedad(datos: unknown): Omit<Propiedad, "id"> | null {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return null;
  }

  const p = datos as Record<string, unknown>;

  if (
    typeof p.nombre !== "string" ||
    !p.nombre.trim() ||
    typeof p.ubicacion !== "string" ||
    !p.ubicacion.trim() ||
    (p.tipo != null && (typeof p.tipo !== "string" || !tiposPropiedad.includes(p.tipo))) ||
    (p.operacion != null && (typeof p.operacion !== "string" || !operaciones.includes(p.operacion as typeof operaciones[number]))) ||
    (p.moneda != null && (typeof p.moneda !== "string" || !monedas.includes(p.moneda as typeof monedas[number]))) ||
    (p.direccion != null && (typeof p.direccion !== "string" || p.direccion.length > 300)) ||
    typeof p.precio !== "number" ||
    !Number.isFinite(p.precio) ||
    p.precio < 0 ||
    typeof p.habitaciones !== "number" ||
    !Number.isInteger(p.habitaciones) ||
    p.habitaciones < 0 ||
    typeof p.metros !== "number" ||
    !Number.isFinite(p.metros) ||
    p.metros < 0 ||
    !estados.includes(p.estado as Estado)
  ) {
    return null;
  }

  if (
    p.banos != null &&
    (typeof p.banos !== "number" ||
      !Number.isInteger(p.banos) ||
      p.banos < 0)
  ) {
    return null;
  }

  if (p.descripcion != null && typeof p.descripcion !== "string") {
    return null;
  }

  if (
    p.amenidades !== undefined &&
    (!Array.isArray(p.amenidades) || p.amenidades.length > 30 || !p.amenidades.every((item) => typeof item === "string" && item.length <= 100))
  ) {
    return null;
  }

  if (
    p.imagenes !== undefined &&
    (!Array.isArray(p.imagenes) ||
      p.imagenes.length > 5 ||
      !p.imagenes.every((imagen) => typeof imagen === "string" && imagen.length <= 2048))
  ) {
    return null;
  }

  return {
    nombre: p.nombre.trim(),
    ubicacion: p.ubicacion.trim(),
    direccion: typeof p.direccion === "string" ? p.direccion.trim() || undefined : undefined,
    tipo: typeof p.tipo === "string" ? p.tipo.trim() : "Sin especificar",
    operacion: p.operacion === "Alquiler" ? "Alquiler" : "Venta",
    moneda: p.moneda === "BOB" ? "BOB" : "USD",
    precio: p.precio,
    habitaciones: p.habitaciones,
    banos: p.banos == null ? undefined : p.banos as number,
    metros: p.metros,
    estado: p.estado as Estado,
    descripcion:
      typeof p.descripcion === "string"
        ? p.descripcion.trim() || undefined
        : undefined,
    amenidades: (p.amenidades as string[] | undefined) ?? [],
    imagenes: (p.imagenes as string[] | undefined) ?? [],
  };
}

// Convierte tipos de PostgreSQL a los tipos usados por TypeScript en el navegador.
function convertirPropiedad(fila: Record<string, unknown>): Propiedad {
  return {
    id: Number(fila.id),
    nombre: String(fila.nombre),
    ubicacion: String(fila.ubicacion),
    direccion: fila.direccion == null ? undefined : String(fila.direccion),
    tipo: fila.tipo == null ? "Sin especificar" : String(fila.tipo),
    operacion: fila.operacion === "Alquiler" ? "Alquiler" : "Venta",
    moneda: fila.moneda === "BOB" ? "BOB" : "USD",
    precio: Number(fila.precio),
    habitaciones: Number(fila.habitaciones),
    banos: fila.banos == null ? undefined : Number(fila.banos),
    metros: Number(fila.metros),
    estado: fila.estado as Estado,
    descripcion:
      fila.descripcion == null ? undefined : String(fila.descripcion),
    amenidades: Array.isArray(fila.amenidades) ? fila.amenidades as string[] : [],
    imagenes: Array.isArray(fila.imagenes)
      ? fila.imagenes as string[]
      : [],
  };
}

// GET: obtener todas las propiedades
export async function GET() {
  try {
    const resultado = await pool.query(`
      SELECT
        p.*,
        COALESCE(
          JSON_AGG(i.url ORDER BY i.orden)
            FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS imagenes
      FROM propiedades p
      LEFT JOIN imagenes_propiedad i
        ON i.propiedad_id = p.id
      GROUP BY p.id
      ORDER BY p.id DESC;
    `);

    return NextResponse.json(
      resultado.rows.map(convertirPropiedad)
    );
  } catch (error) {
    console.error("Error al consultar propiedades:", error);

    return NextResponse.json(
      { mensaje: esErrorDeConexionDB(error) ? MENSAJE_DB_NO_DISPONIBLE : "No se pudieron consultar las propiedades." },
      { status: esErrorDeConexionDB(error) ? 503 : 500 }
    );
  }
}

// POST: registrar una propiedad
export async function POST(request: Request) {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Inicia sesión para continuar." }, { status: 401 });
  }
  if (sesion.rol !== "admin") {
    return NextResponse.json({ mensaje: "No tienes permiso para crear propiedades." }, { status: 403 });
  }

  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { mensaje: "El contenido enviado no es JSON válido." },
      { status: 400 }
    );
  }

  const propiedad = validarPropiedad(cuerpo);

  if (!propiedad) {
    return NextResponse.json(
      { mensaje: "Los datos de la propiedad no son válidos." },
      { status: 400 }
    );
  }

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    const resultado = await client.query(
      `
        INSERT INTO propiedades (
          nombre,
          ubicacion,
          direccion,
          tipo,
          operacion,
          moneda,
          precio,
          habitaciones,
          banos,
          metros,
          estado,
          descripcion,
          amenidades
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `,
      [
        propiedad.nombre,
        propiedad.ubicacion,
        propiedad.direccion ?? null,
        propiedad.tipo,
        propiedad.operacion,
        propiedad.moneda,
        propiedad.precio,
        propiedad.habitaciones,
        propiedad.banos ?? null,
        propiedad.metros,
        propiedad.estado,
        propiedad.descripcion ?? null,
        propiedad.amenidades ?? [],
      ]
    );

    const nuevaPropiedad = resultado.rows[0];

    if ((propiedad.imagenes ?? []).length > 0) {
      await client.query(
        `
          INSERT INTO imagenes_propiedad (
            propiedad_id,
            url,
            orden
          )
          SELECT $1, imagen.url, imagen.orden - 1
          FROM unnest($2::text[]) WITH ORDINALITY
            AS imagen(url, orden);
        `,
        [nuevaPropiedad.id, propiedad.imagenes ?? []]
      );
    }

    await client.query(
      `INSERT INTO historial_propiedades
        (propiedad_id, propiedad_nombre, usuario_id, username, accion, cambios)
       VALUES ($1, $2, $3, $4, 'Creada', $5::jsonb)`,
      [nuevaPropiedad.id, propiedad.nombre, sesion.id, sesion.usuario, JSON.stringify({ nombre: propiedad.nombre, operacion: propiedad.operacion, precio: propiedad.precio, estado: propiedad.estado })]
    );

    await client.query("COMMIT");
    revalidateTag("sitemap-propiedades", { expire: 0 });

    return NextResponse.json(
      convertirPropiedad({
        ...nuevaPropiedad,
        imagenes: propiedad.imagenes ?? [],
      }),
      { status: 201 }
    );
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Error al registrar propiedad:", error);

    return NextResponse.json(
      { mensaje: "No se pudo registrar la propiedad." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
