BEGIN;

ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS operacion TEXT NOT NULL DEFAULT 'Venta',
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE propiedades ADD CONSTRAINT propiedades_operacion_check CHECK (operacion IN ('Venta', 'Alquiler'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE propiedades ADD CONSTRAINT propiedades_moneda_check CHECK (moneda IN ('USD', 'BOB'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_lower_unique
  ON usuarios (LOWER(email))
  WHERE email IS NOT NULL AND BTRIM(email) <> '';

CREATE TABLE IF NOT EXISTS consultas (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE SET NULL,
  propiedad_nombre TEXT NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  mensaje TEXT,
  estado TEXT NOT NULL DEFAULT 'Nueva'
    CHECK (estado IN ('Nueva', 'En seguimiento', 'Cerrada')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS consultas_estado_fecha_idx
  ON consultas (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS consultas_propiedad_fecha_idx
  ON consultas (propiedad_id, created_at DESC);

CREATE TABLE IF NOT EXISTS historial_propiedades (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT NOT NULL,
  propiedad_nombre TEXT NOT NULL,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('Creada', 'Editada', 'Eliminada')),
  cambios JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS historial_propiedades_fecha_idx
  ON historial_propiedades (created_at DESC);
CREATE INDEX IF NOT EXISTS historial_propiedades_id_fecha_idx
  ON historial_propiedades (propiedad_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vistas_propiedad (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  visitor_hash CHAR(64) NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (propiedad_id, visitor_hash, visit_date)
);
CREATE INDEX IF NOT EXISTS vistas_propiedad_fecha_idx
  ON vistas_propiedad (created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_usuario_idx
  ON password_reset_tokens (usuario_id, created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_attempts (
  key_hash CHAR(64) PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ
);

COMMIT;
