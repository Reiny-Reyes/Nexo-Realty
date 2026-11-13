import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL. Carga .env.local antes de migrar.");
}

const pool = new Pool({ connectionString });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const aplicadas = new Set(
    (await pool.query("SELECT filename FROM schema_migrations")).rows.map((fila) => fila.filename)
  );
  const archivos = (await readdir("migrations"))
    .filter((archivo) => /^\d+_.+\.sql$/.test(archivo))
    .sort();

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    const sql = await readFile(`migrations/${archivo}`, "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [archivo]);
    console.log(`Migración aplicada correctamente: ${archivo}`);
  }

  if (archivos.every((archivo) => aplicadas.has(archivo))) {
    console.log("La base de datos ya tiene todas las migraciones aplicadas.");
  }
} finally {
  await pool.end();
}
