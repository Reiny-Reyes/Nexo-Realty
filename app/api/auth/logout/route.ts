import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/auth";

export async function POST() {
  const respuesta = NextResponse.json({ cerrado: true });
  respuesta.cookies.set(COOKIE_SESION, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return respuesta;
}
