"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function RecuperarContrasenaPage() {
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function solicitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo enviar la solicitud.");
      setMensaje(resultado.mensaje);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo enviar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F1EB] px-5 py-10 text-[#292B27]">
      <section className="w-full max-w-md border border-[#292B27]/10 bg-white p-7 shadow-sm sm:p-10" aria-labelledby="recuperar-titulo">
        <Link href="/login" className="text-xs uppercase tracking-[0.2em] text-[#687D50]">← Volver al acceso</Link>
        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.25em] text-[#858B7C]">Seguridad de la cuenta</p>
        <h1 id="recuperar-titulo" className="text-3xl font-light">Recuperar contraseña</h1>
        <p className="mt-3 text-sm leading-6 text-[#77786F]">Te enviaremos un enlace de un solo uso al correo asociado a tu cuenta. Vence en 30 minutos.</p>
        <form onSubmit={solicitar} className="mt-7 space-y-5">
          <label htmlFor="correo-recuperacion" className="block text-sm font-medium">Correo electrónico
            <input id="correo-recuperacion" type="email" autoComplete="email" required maxLength={254} value={correo} onChange={(evento) => setCorreo(evento.target.value)} className="mt-2 w-full border border-[#292B27]/15 bg-[#F4F1EB] px-4 py-3 outline-none focus:border-[#687D50]" />
          </label>
          {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {mensaje && <p role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</p>}
          <button type="submit" disabled={cargando} className="w-full bg-[#292B27] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#555F4D] disabled:opacity-60">
            {cargando ? "Enviando…" : "Enviar enlace de recuperación"}
          </button>
        </form>
      </section>
    </main>
  );
}
