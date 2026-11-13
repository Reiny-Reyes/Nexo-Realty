import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { obtenerSesion } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F4F1EB]" />}>
      <VerificarAcceso>{children}</VerificarAcceso>
    </Suspense>
  );
}

async function VerificarAcceso({ children }: Readonly<{ children: ReactNode }>) {
  // La sesión y su fecha de vencimiento dependen de la petición actual.
  await connection();
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  return children;
}
