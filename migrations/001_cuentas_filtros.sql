-- Amplía el inventario y crea las tablas de cuentas y limitación de intentos.
BEGIN;

ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Sin especificar';

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_lower_unique
  ON usuarios (LOWER(username));

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  username_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ
);

-- Metadatos básicos para ubicación y confianza pública.
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS amenidades TEXT[] NOT NULL DEFAULT '{}';

COMMIT;
