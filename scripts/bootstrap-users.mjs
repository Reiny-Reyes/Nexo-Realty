import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL. Carga .env.local antes de ejecutar este comando.");
}

const accounts = [
  { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, role: "admin" },
  { username: process.env.VIEWER_USERNAME, password: process.env.VIEWER_PASSWORD, role: "viewer" },
].filter((account) => account.username && account.password);

if (!accounts.some((account) => account.role === "admin") || !accounts.some((account) => account.role === "viewer")) {
  throw new Error("Configura ADMIN_USERNAME/ADMIN_PASSWORD y VIEWER_USERNAME/VIEWER_PASSWORD para crear las dos cuentas iniciales.");
}
if (accounts[0].username.toLowerCase() === accounts[1].username.toLowerCase()) {
  throw new Error("El usuario administrador y el usuario de consulta deben ser distintos.");
}
if (accounts.some((account) => account.password.length < 12)) {
  throw new Error("Cada contraseña inicial debe tener al menos 12 caracteres.");
}
if (accounts.some((account) => !/^[\p{L}\p{N}._-]{3,40}$/u.test(account.username))) {
  throw new Error("Cada nombre inicial debe tener entre 3 y 40 caracteres válidos.");
}

const pool = new Pool({ connectionString });
try {
  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password);
    const result = await pool.query(
      `INSERT INTO usuarios (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING username`,
      [account.username, passwordHash, account.role]
    );
    console.log(result.rowCount ? `Cuenta inicial creada: ${account.username}` : `Cuenta ya existente, sin cambios: ${account.username}`);
  }
} finally {
  await pool.end();
}
