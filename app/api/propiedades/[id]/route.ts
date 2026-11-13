
// API de un inmueble: PUT lo actualiza y DELETE lo elimina usando el ID de la ruta.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { eliminarImagenPublicada } from "@/lib/storage";
import type { Estado, Propiedad } from "@/types/propiedad";

const estados: Estado[] = ["Disponible", "Reservada", "Vendida"];
const operaciones = ["Venta", "Alquiler"] as const;
const monedas = ["USD", "BOB"] as const;
const tiposPropiedad = ["Sin especificar", "Apartamento", "Casa", "Villa", "Terreno", "Local comercial", "Oficina", "Otro"];

type DatosPropiedad = Omit<Propiedad, "id">;

// Acepta solo campos válidos para evitar guardar datos mal formados.
function validarPropiedad(datos: unknown): DatosPropiedad | null {
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

// Adapta la fila SQL al modelo compartido con la interfaz.
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

type ContextoRuta = {
  params: Promise<{ id: string }>;
};

// GET: entregar al público la ficha completa desde PostgreSQL.
export async function GET(
  _request: Request,
  { params }: ContextoRuta
) {
  const { id: idTexto } = await params;
  const id = Number(idTexto);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { mensaje: "El ID de la propiedad no es válido." },
      { status: 400 }
    );
  }

  try {
    const resultado = await pool.query(
      `SELECT p.*,
        COALESCE(
          JSON_AGG(i.url ORDER BY i.orden)
            FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS imagenes
       FROM propiedades p
       LEFT JOIN imagenes_propiedad i ON i.propiedad_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );

    if (!resultado.rows[0]) {
      return NextResponse.json(
        { mensaje: "No se encontró la propiedad." },
        { status: 404 }
      );
    }

    return NextResponse.json(convertirPropiedad(resultado.rows[0]));
  } catch (error) {
    console.error("Error al consultar la propiedad:", error);
    return NextResponse.json(
      { mensaje: "No se pudo cargar la información de la propiedad." },
      { status: 500 }
    );
  }
}

// PUT: actualizar una propiedad
export async function PUT(
  request: Request,
  { params }: ContextoRuta
) {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Inicia sesión para continuar." }, { status: 401 });
  }
  if (sesion.rol !== "admin") {
    return NextResponse.json({ mensaje: "No tienes permiso para editar propiedades." }, { status: 403 });
  }

  const { id: idTexto } = await params;
  const id = Number(idTexto);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { mensaje: "El ID de la propiedad no es válido." },
      { status: 400 }
    );
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const propiedadAnterior = await client.query(
      "SELECT * FROM propiedades WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (!propiedadAnterior.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ mensaje: "No se encontró la propiedad." }, { status: 404 });
    }

    const imagenesAnteriores = await client.query(
      "SELECT url FROM imagenes_propiedad WHERE propiedad_id = $1",
      [id]
    );

    const resultado = await client.query(
      `UPDATE propiedades
       SET nombre = $1,
           ubicacion = $2,
           direccion = $3,
           tipo = $4,
           operacion = $5,
           moneda = $6,
           precio = $7,
           habitaciones = $8,
           banos = $9,
           metros = $10,
           estado = $11,
           descripcion = $12,
           amenidades = $13,
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
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
        id,
      ]
    );

    if (resultado.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { mensaje: "No se encontró la propiedad." },
        { status: 404 }
      );
    }

    await client.query(
      "DELETE FROM imagenes_propiedad WHERE propiedad_id = $1",
      [id]
    );

    if (propiedad.imagenes && propiedad.imagenes.length > 0) {
      await client.query(
        `INSERT INTO imagenes_propiedad (propiedad_id, url, orden)
         SELECT $1, imagen.url, imagen.orden - 1
         FROM unnest($2::text[]) WITH ORDINALITY
           AS imagen(url, orden)`,
        [id, propiedad.imagenes]
      );
    }

    const filaAnterior = propiedadAnterior.rows[0] as Record<string, unknown>;
    const valoresNuevos: Record<string, unknown> = {
      nombre: propiedad.nombre,
      ubicacion: propiedad.ubicacion,
      direccion: propiedad.direccion ?? null,
      tipo: propiedad.tipo,
      operacion: propiedad.operacion,
      moneda: propiedad.moneda,
      precio: propiedad.precio,
      habitaciones: propiedad.habitaciones,
      banos: propiedad.banos ?? null,
      metros: propiedad.metros,
      estado: propiedad.estado,
      descripcion: propiedad.descripcion ?? null,
      amenidades: propiedad.amenidades ?? [],
    };
    const cambios = Object.fromEntries(
      Object.entries(valoresNuevos)
        .filter(([campo, valor]) => JSON.stringify(filaAnterior[campo] ?? null) !== JSON.stringify(valor))
        .map(([campo]) => [campo, { anterior: filaAnterior[campo] ?? null, nuevo: valoresNuevos[campo] }])
    );
    const imagenesViejas = imagenesAnteriores.rows.map((fila) => String(fila.url));
    if (JSON.stringify(imagenesViejas) !== JSON.stringify(propiedad.imagenes ?? [])) {
      cambios.imagenes = { anterior: imagenesViejas.length, nuevo: propiedad.imagenes?.length ?? 0 };
    }
    if (Object.keys(cambios).length > 0) {
      await client.query(
        `INSERT INTO historial_propiedades
          (propiedad_id, propiedad_nombre, usuario_id, username, accion, cambios)
         VALUES ($1, $2, $3, $4, 'Editada', $5::jsonb)`,
        [id, propiedad.nombre, sesion.id, sesion.usuario, JSON.stringify(cambios)]
      );
    }

    await client.query("COMMIT");
    revalidateTag(`propiedad-seo-${id}`, { expire: 0 });
    revalidateTag("sitemap-propiedades", { expire: 0 });

    const urlsActuales = new Set(propiedad.imagenes ?? []);
    for (const fila of imagenesAnteriores.rows) {
      const urlAnterior = String(fila.url);
      if (urlsActuales.has(urlAnterior)) continue;
      try {
        const referencias = await pool.query(
          "SELECT 1 FROM imagenes_propiedad WHERE url = $1 LIMIT 1",
          [urlAnterior]
        );
        if (referencias.rowCount === 0) await eliminarImagenPublicada(urlAnterior);
      } catch (error) {
        console.warn("No se pudo retirar una imagen anterior del almacenamiento:", error);
      }
    }

    return NextResponse.json(
      convertirPropiedad({
        ...resultado.rows[0],
        imagenes: propiedad.imagenes ?? [],
      })
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al actualizar propiedad:", error);

    return NextResponse.json(
      { mensaje: "No se pudo actualizar la propiedad." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE: eliminar una propiedad
export async function DELETE(
  _request: Request,
  { params }: ContextoRuta
) {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Inicia sesión para continuar." }, { status: 401 });
  }
  if (sesion.rol !== "admin") {
    return NextResponse.json({ mensaje: "No tienes permiso para eliminar propiedades." }, { status: 403 });
  }

  const { id: idTexto } = await params;
  const id = Number(idTexto);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { mensaje: "El ID de la propiedad no es válido." },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const propiedadEliminada = await client.query(
      "SELECT nombre FROM propiedades WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (!propiedadEliminada.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ mensaje: "No se encontró la propiedad." }, { status: 404 });
    }

    const imagenesEliminadas = await client.query(
      "SELECT url FROM imagenes_propiedad WHERE propiedad_id = $1",
      [id]
    );

    await client.query(
      "DELETE FROM imagenes_propiedad WHERE propiedad_id = $1",
      [id]
    );

    const resultado = await client.query(
      "DELETE FROM propiedades WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { mensaje: "No se encontró la propiedad." },
        { status: 404 }
      );
    }

    await client.query(
      `INSERT INTO historial_propiedades
        (propiedad_id, propiedad_nombre, usuario_id, username, accion, cambios)
       VALUES ($1, $2, $3, $4, 'Eliminada', '{}'::jsonb)`,
      [id, String(propiedadEliminada.rows[0].nombre), sesion.id, sesion.usuario]
    );

    await client.query("COMMIT");
    revalidateTag(`propiedad-seo-${id}`, { expire: 0 });
    revalidateTag("sitemap-propiedades", { expire: 0 });

    for (const fila of imagenesEliminadas.rows) {
      try {
        const referencias = await pool.query(
          "SELECT 1 FROM imagenes_propiedad WHERE url = $1 LIMIT 1",
          [fila.url]
        );
        if (referencias.rowCount === 0) await eliminarImagenPublicada(String(fila.url));
      } catch (error) {
        console.warn("No se pudo retirar una imagen del almacenamiento:", error);
      }
    }

    return NextResponse.json({
      mensaje: "Propiedad eliminada correctamente.",
      id,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al eliminar propiedad:", error);

    return NextResponse.json(
      { mensaje: "No se pudo eliminar la propiedad." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
