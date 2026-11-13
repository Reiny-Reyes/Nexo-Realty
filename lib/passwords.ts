import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const LONGITUD_HASH = 64;

export async function hashPassword(contrasena: string) {
  const sal = randomBytes(16).toString("hex");
  const derivado = (await scrypt(contrasena, sal, LONGITUD_HASH)) as Buffer;
  return `scrypt$${sal}$${derivado.toString("hex")}`;
}

export async function verificarPassword(contrasena: string, guardada: string) {
  const [algoritmo, sal, hashHex, extra] = guardada.split("$");
  if (algoritmo !== "scrypt" || !sal || !hashHex || extra) return false;

  try {
    const esperado = Buffer.from(hashHex, "hex");
    if (esperado.length !== LONGITUD_HASH) return false;
    const resultado = (await scrypt(contrasena, sal, LONGITUD_HASH)) as Buffer;
    return timingSafeEqual(resultado, esperado);
  } catch {
    return false;
  }
}
