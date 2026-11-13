import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { pool } from "@/lib/db";
import { eliminarImagenPublicada, guardarImagen } from "@/lib/storage";

export async function POST(request: Request) {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "admin" || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Solo el administrador puede subir fotografías." }, { status: 403 });
  }

  const longitud = Number(request.headers.get("content-length"));
  if (Number.isFinite(longitud) && longitud > 9 * 1024 * 1024) {
    return NextResponse.json({ mensaje: "La solicitud supera el límite de 9 MB." }, { status: 413 });
  }

  try {
    const formulario = await request.formData();
    const imagen = formulario.get("imagen");
    if (!(imagen instanceof File)) {
      return NextResponse.json({ mensaje: "Selecciona una fotografía válida." }, { status: 400 });
    }
    const url = await guardarImagen(imagen);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo subir la fotografía.";
    const status = mensaje.startsWith("Configura S3_")
      ? 503
      : mensaje.startsWith("No se pudo guardar la fotografía")
        ? 502
        : 400;
    return NextResponse.json({ mensaje }, { status });
  }
}

export async function DELETE(request: Request) {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "admin" || sesion.debeCambiarContrasena) {
    return NextResponse.json({ mensaje: "Solo el administrador puede eliminar fotografías." }, { status: 403 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }
  const url = cuerpo && typeof cuerpo === "object"
    ? (cuerpo as Record<string, unknown>).url
    : null;
  if (typeof url !== "string") {
    return NextResponse.json({ mensaje: "La URL de la fotografía no es válida." }, { status: 400 });
  }

  const referencias = await pool.query(
    "SELECT 1 FROM imagenes_propiedad WHERE url = $1 LIMIT 1",
    [url]
  );
  if (referencias.rowCount) {
    return NextResponse.json({ mensaje: "La fotografía todavía está asociada a una propiedad." }, { status: 409 });
  }

  try {
    await eliminarImagenPublicada(url);
    return NextResponse.json({ eliminada: true });
  } catch {
    return NextResponse.json({ mensaje: "No se pudo eliminar la fotografía del almacenamiento." }, { status: 502 });
  }
}
