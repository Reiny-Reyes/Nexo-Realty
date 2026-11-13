"use client";

import { useState, type FormEvent } from "react";

export default function CambiarContrasena({ onCerrar, onCambioCompletado, obligatoria = false }: { onCerrar: () => void; onCambioCompletado?: () => void; obligatoria?: boolean }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    if (nueva !== confirmacion) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    try {
      const respuesta = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.mensaje || "No se pudo cambiar la contraseña.");
        return;
      }
      setMensaje("Contraseña actualizada.");
      setActual("");
      setNueva("");
      setConfirmacion("");
      onCambioCompletado?.();
      if (!obligatoria) window.setTimeout(onCerrar, 900);
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    }
  }

  return (
    <section className="w-full max-w-md border border-[#292B27]/10 bg-[#F4F1EB] p-7 shadow-2xl" aria-labelledby="clave-titulo">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#858B7C]">Seguridad</p>
          <h2 id="clave-titulo" className="mt-2 text-2xl font-light">{obligatoria ? "Cambia tu contraseña" : "Cambiar contraseña"}</h2>
        </div>
        {!obligatoria && <button type="button" onClick={onCerrar} className="border border-[#292B27]/15 px-3 py-2 text-xs">Cerrar</button>}
      </div>
      {obligatoria && <p className="mt-3 text-sm text-[#77786F]">El administrador restableció tu contraseña. Elige una personal para continuar.</p>}
      <form onSubmit={enviar} className="mt-6 space-y-4">
        <label className="block text-xs font-medium">Contraseña actual
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" className="mt-2 w-full border border-[#292B27]/15 bg-white px-3 py-2.5 text-sm" />
        </label>
        <label className="block text-xs font-medium">Contraseña nueva (12 caracteres mínimo)
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={12} autoComplete="new-password" className="mt-2 w-full border border-[#292B27]/15 bg-white px-3 py-2.5 text-sm" />
        </label>
        <label className="block text-xs font-medium">Repite la contraseña nueva
          <input type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} required minLength={12} autoComplete="new-password" className="mt-2 w-full border border-[#292B27]/15 bg-white px-3 py-2.5 text-sm" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {mensaje && <p role="status" className="text-sm text-emerald-800">{mensaje}</p>}
        <button type="submit" className="w-full bg-[#292B27] px-4 py-3 text-sm text-white">Guardar contraseña</button>
      </form>
    </section>
  );
}
