"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
      });
      const resultado = await respuesta.json();

      if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo iniciar sesión.");
      router.replace("/dashboard");
      router.refresh();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Ocurrió un error al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F1EB] px-5 py-12 text-[#292B27]">
      <section className="w-full max-w-md border border-[#292B27]/10 bg-white p-8 shadow-sm sm:p-10">
        <Link href="/" className="text-xs uppercase tracking-[0.25em] text-[#777F70]">
          ← Nexo Realty
        </Link>
        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.25em] text-[#858B7C]">
          Área privada
        </p>
        <h1 className="text-3xl font-light">Iniciar sesión</h1>
        <p className="mt-3 text-sm leading-6 text-[#77786F]">
          Ingresa con tu cuenta para consultar o administrar las propiedades.
        </p>
        <p className="mt-4 text-xs leading-5 text-[#77786F]">
          <Link href="/recuperar-contrasena" className="font-medium text-[#555F4D] underline underline-offset-4">¿Olvidaste tu contraseña?</Link>
        </p>

        <form onSubmit={iniciarSesion} className="mt-8 space-y-5">
          <div>
            <label htmlFor="usuario" className="mb-2 block text-sm font-medium">Usuario</label>
            <input
              id="usuario"
              name="username"
              autoComplete="username"
              value={usuario}
              onChange={(evento) => setUsuario(evento.target.value)}
              required
              className="w-full border border-[#292B27]/15 bg-[#F4F1EB] px-4 py-3 text-sm outline-none focus:border-[#777F70]"
            />
          </div>
          <div>
            <label htmlFor="contrasena" className="mb-2 block text-sm font-medium">Contraseña</label>
            <input
              id="contrasena"
              name="password"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              required
              className="w-full border border-[#292B27]/15 bg-[#F4F1EB] px-4 py-3 text-sm outline-none focus:border-[#777F70]"
            />
          </div>

          {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#292B27] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#777F70] disabled:cursor-wait disabled:opacity-60"
          >
            {cargando ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
