"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function FormularioRestablecimiento() {
  const parametros = useSearchParams();
  const token = parametros.get("token") ?? "";
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function restablecer(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    if (!token) {
      setError("Falta el enlace de restablecimiento. Solicita uno nuevo.");
      return;
    }
    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, contrasena }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo cambiar la contraseña.");
      setMensaje("La contraseña se actualizó. Ya puedes iniciar sesión con la nueva clave.");
      setContrasena("");
      setConfirmacion("");
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F1EB] px-5 py-10 text-[#292B27]">
      <section className="w-full max-w-md border border-[#292B27]/10 bg-white p-7 shadow-sm sm:p-10" aria-labelledby="restablecer-titulo">
        <Link href="/login" className="text-xs uppercase tracking-[0.2em] text-[#687D50]">← Volver al acceso</Link>
        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.25em] text-[#858B7C]">Seguridad de la cuenta</p>
        <h1 id="restablecer-titulo" className="text-3xl font-light">Crear contraseña nueva</h1>
        <p className="mt-3 text-sm leading-6 text-[#77786F]">Usa al menos 12 caracteres. El enlace solo puede utilizarse una vez.</p>
        <form onSubmit={restablecer} className="mt-7 space-y-5">
          <label htmlFor="nueva-clave" className="block text-sm font-medium">Contraseña nueva
            <input id="nueva-clave" type="password" autoComplete="new-password" minLength={12} required value={contrasena} onChange={(evento) => setContrasena(evento.target.value)} className="mt-2 w-full border border-[#292B27]/15 bg-[#F4F1EB] px-4 py-3 outline-none focus:border-[#687D50]" />
          </label>
          <label htmlFor="confirmar-clave" className="block text-sm font-medium">Confirmar contraseña
            <input id="confirmar-clave" type="password" autoComplete="new-password" minLength={12} required value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} className="mt-2 w-full border border-[#292B27]/15 bg-[#F4F1EB] px-4 py-3 outline-none focus:border-[#687D50]" />
          </label>
          {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {mensaje && <p role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</p>}
          <button type="submit" disabled={cargando || !token} className="w-full bg-[#292B27] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#555F4D] disabled:opacity-60">
            {cargando ? "Actualizando…" : "Guardar contraseña nueva"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F4F1EB]" />}>
      <FormularioRestablecimiento />
    </Suspense>
  );
}
