"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Usuario = {
  id: number;
  username: string;
  email: string | null;
  role: "admin" | "viewer";
  active: boolean;
  force_password_change: boolean;
  created_at: string;
};

export default function AdministrarUsuarios({ onCerrar }: { onCerrar: () => void }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [correo, setCorreo] = useState("");
  const [correos, setCorreos] = useState<Record<number, string>>({});
  const [rol, setRol] = useState<"admin" | "viewer">("viewer");
  const [reiniciarId, setReiniciarId] = useState<number | null>(null);
  const [contrasenaTemporal, setContrasenaTemporal] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    const respuesta = await fetch("/api/auth/users", { cache: "no-store" });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudieron cargar las cuentas.");
    setUsuarios(resultado);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(cargarUsuarios).catch((fallo: unknown) =>
      setError(fallo instanceof Error ? fallo.message : "Error cargando cuentas.")
    );
  }, [cargarUsuarios]);

  async function ejecutar(url: string, init?: RequestInit) {
    const respuesta = await fetch(url, init);
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo completar la operación.");
    return resultado;
  }

  async function crearUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setCargando(true);
    try {
      await ejecutar("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena, correo, rol }),
      });
      setUsuario("");
      setContrasena("");
      setCorreo("");
      setMensaje("Cuenta creada.");
      await cargarUsuarios();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo crear la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  async function cambiarUsuario(id: number, cambios: Record<string, unknown>) {
    setError("");
    setMensaje("");
    try {
      await ejecutar(`/api/auth/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      setMensaje("Cambios guardados.");
      setReiniciarId(null);
      setContrasenaTemporal("");
      await cargarUsuarios();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo actualizar la cuenta.");
    }
  }

  async function eliminarUsuario(cuenta: Usuario) {
    if (!window.confirm(`¿Eliminar la cuenta ${cuenta.username}?`)) return;
    try {
      await ejecutar(`/api/auth/users/${cuenta.id}`, { method: "DELETE" });
      setMensaje("Cuenta eliminada.");
      await cargarUsuarios();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo eliminar la cuenta.");
    }
  }

  return (
    <section className="w-full max-w-3xl border border-[#292B27]/10 bg-[#F4F1EB] p-6 shadow-2xl sm:p-8" aria-labelledby="usuarios-titulo">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#858B7C]">Acceso y permisos</p>
          <h2 id="usuarios-titulo" className="mt-2 text-2xl font-light">Cuentas de usuario</h2>
        </div>
        <button type="button" onClick={onCerrar} className="border border-[#292B27]/15 px-3 py-2 text-xs">Cerrar</button>
      </div>

      {error && <p role="alert" className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {mensaje && <p role="status" className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</p>}

      <form onSubmit={crearUsuario} className="mt-7 grid gap-3 border border-[#292B27]/10 bg-white p-4 sm:grid-cols-2">
        <label className="text-xs font-medium">Usuario
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required minLength={3} maxLength={40} className="mt-2 w-full border border-[#292B27]/15 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-xs font-medium">Contraseña inicial (12 caracteres mínimo)
          <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required minLength={12} autoComplete="new-password" className="mt-2 w-full border border-[#292B27]/15 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-xs font-medium">Correo de recuperación
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required maxLength={254} autoComplete="email" className="mt-2 w-full border border-[#292B27]/15 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-xs font-medium">Permisos
          <select value={rol} onChange={(e) => setRol(e.target.value as "admin" | "viewer")} className="mt-2 w-full border border-[#292B27]/15 bg-white px-3 py-2.5 text-sm">
            <option value="viewer">Solo lectura</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button type="submit" disabled={cargando} className="self-end bg-[#292B27] px-4 py-3 text-sm text-white disabled:opacity-50">
          {cargando ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <div className="mt-7 space-y-3">
        {usuarios.map((cuenta) => (
          <article key={cuenta.id} className="border border-[#292B27]/10 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{cuenta.username}</p>
                <p className="mt-1 text-xs text-[#77786F]">
                  {cuenta.role === "admin" ? "Administrador" : "Solo lectura"} · {cuenta.active ? "Activa" : "Desactivada"}
                  {cuenta.force_password_change ? " · Debe cambiar su contraseña" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select aria-label={`Permisos de ${cuenta.username}`} value={cuenta.role} onChange={(e) => cambiarUsuario(cuenta.id, { rol: e.target.value })} className="border border-[#292B27]/15 bg-white px-2 py-2 text-xs">
                  <option value="viewer">Solo lectura</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="button" onClick={() => cambiarUsuario(cuenta.id, { activo: !cuenta.active })} className="border border-[#292B27]/15 px-3 py-2 text-xs">
                  {cuenta.active ? "Desactivar" : "Activar"}
                </button>
                <button type="button" onClick={() => { setReiniciarId(reiniciarId === cuenta.id ? null : cuenta.id); setContrasenaTemporal(""); }} className="border border-[#292B27]/15 px-3 py-2 text-xs">
                  Restablecer clave
                </button>
                <button type="button" onClick={() => eliminarUsuario(cuenta)} className="border border-red-200 px-3 py-2 text-xs text-red-700">
                  Eliminar
                </button>
              </div>
            </div>
            <form onSubmit={(evento) => { evento.preventDefault(); cambiarUsuario(cuenta.id, { correo: correos[cuenta.id] ?? cuenta.email ?? "" }); }} className="mt-4 flex flex-col gap-2 border-t border-[#292B27]/10 pt-4 sm:flex-row">
              <label className="min-w-0 flex-1 text-xs font-medium">Correo para restablecer la contraseña
                <input type="email" required maxLength={254} value={correos[cuenta.id] ?? cuenta.email ?? ""} onChange={(evento) => setCorreos((actual) => ({ ...actual, [cuenta.id]: evento.target.value }))} className="mt-1.5 w-full border border-[#292B27]/15 px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="self-end border border-[#292B27]/20 px-4 py-2 text-xs">Guardar correo</button>
            </form>
            {reiniciarId === cuenta.id && (
              <div className="mt-4 flex flex-col gap-2 border-t border-[#292B27]/10 pt-4 sm:flex-row">
                <input type="password" aria-label="Contraseña temporal" autoComplete="new-password" minLength={12} value={contrasenaTemporal} onChange={(e) => setContrasenaTemporal(e.target.value)} placeholder="Contraseña temporal (12 caracteres mínimo)" className="min-w-0 flex-1 border border-[#292B27]/15 px-3 py-2 text-sm" />
                <button type="button" onClick={() => cambiarUsuario(cuenta.id, { contrasena: contrasenaTemporal })} disabled={contrasenaTemporal.length < 12} className="bg-[#292B27] px-4 py-2 text-xs text-white disabled:opacity-40">
                  Guardar contraseña temporal
                </button>
              </div>
            )}
          </article>
        ))}
        {usuarios.length === 0 && <p className="py-5 text-center text-sm text-[#77786F]">Aún no hay cuentas registradas.</p>}
      </div>
    </section>
  );
}
