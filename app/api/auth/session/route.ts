import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  }
  return NextResponse.json({
    usuario: sesion.usuario,
    rol: sesion.rol,
    debeCambiarContrasena: sesion.debeCambiarContrasena,
  });
}
