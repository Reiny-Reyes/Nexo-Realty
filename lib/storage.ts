import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";

const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function obtenerConfiguracion() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL?.replace(/\/+$/, "");
  if (!endpoint || !bucket || !region || !accessKey || !secretKey || !publicUrl) return null;
  return { endpoint, bucket, region, accessKey, secretKey, publicUrl };
}

function hmac(clave: Buffer | string, valor: string) {
  return createHmac("sha256", clave).update(valor).digest();
}

function codificarSegmento(segmento: string) {
  return encodeURIComponent(segmento).replace(/[!'()*]/g, (caracter) =>
    `%${caracter.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

async function solicitarS3(metodo: "PUT" | "DELETE", key: string, cuerpo?: Buffer, tipo?: string) {
  const config = obtenerConfiguracion();
  if (!config) throw new Error("Configura S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY y S3_PUBLIC_URL para guardar archivos.");

  const endpoint = new URL(config.endpoint);
  const prefijo = endpoint.pathname.replace(/\/+$/, "");
  const uri = `${prefijo}/${codificarSegmento(config.bucket)}/${key.split("/").map(codificarSegmento).join("/")}`;
  const url = new URL(uri, endpoint.origin);
  const fecha = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const fechaDia = fecha.slice(0, 8);
  const payloadHash = createHash("sha256").update(cuerpo ?? Buffer.alloc(0)).digest("hex");
  const encabezadosFirmados = tipo
    ? "content-type;host;x-amz-content-sha256;x-amz-date"
    : "host;x-amz-content-sha256;x-amz-date";
  const encabezadosCanonicos = [
    ...(tipo ? [`content-type:${tipo}`] : []),
    `host:${url.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${fecha}`,
    "",
  ].join("\n");
  const ambito = `${fechaDia}/${config.region}/s3/aws4_request`;
  const solicitudCanonica = [metodo, url.pathname, "", encabezadosCanonicos, encabezadosFirmados, payloadHash].join("\n");
  const cadenaFirma = [
    "AWS4-HMAC-SHA256",
    fecha,
    ambito,
    createHash("sha256").update(solicitudCanonica).digest("hex"),
  ].join("\n");
  const claveDia = hmac(`AWS4${config.secretKey}`, fechaDia);
  const claveRegion = hmac(claveDia, config.region);
  const claveServicio = hmac(claveRegion, "s3");
  const claveFirma = hmac(claveServicio, "aws4_request");
  const firma = createHmac("sha256", claveFirma).update(cadenaFirma).digest("hex");

  const headers: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": fecha,
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${ambito}, SignedHeaders=${encabezadosFirmados}, Signature=${firma}`,
  };
  if (tipo) headers["Content-Type"] = tipo;
  const respuesta = await fetch(url, {
    method: metodo,
    headers,
    body: cuerpo ? new Uint8Array(cuerpo) : undefined,
  });
  if (!respuesta.ok) {
    console.error("El almacenamiento S3 rechazó la operación:", respuesta.status);
    throw new Error("No se pudo guardar la fotografía en el almacenamiento.");
  }
}

export async function guardarImagen(imagen: File) {
  const extension = TIPOS_PERMITIDOS.get(imagen.type);
  if (!extension) throw new Error("Formato no permitido. Usa JPEG, PNG o WebP.");
  if (imagen.size === 0 || imagen.size > MAX_BYTES) throw new Error("La fotografía debe pesar menos de 8 MB.");

  const key = `propiedades/${randomUUID()}.${extension}`;
  await solicitarS3("PUT", key, Buffer.from(await imagen.arrayBuffer()), imagen.type);
  const config = obtenerConfiguracion();
  if (!config) throw new Error("El almacenamiento no está configurado.");
  return `${config.publicUrl}/${key.split("/").map(codificarSegmento).join("/")}`;
}

export async function eliminarImagenPublicada(urlImagen: string) {
  const config = obtenerConfiguracion();
  if (!config || !urlImagen.startsWith(`${config.publicUrl}/`)) return;
  const keyCodificada = urlImagen.slice(config.publicUrl.length + 1);
  let key: string;
  try {
    key = keyCodificada.split("/").map(decodeURIComponent).join("/");
  } catch {
    return;
  }
  if (!key.startsWith("propiedades/") || key.includes("..")) return;
  await solicitarS3("DELETE", key);
}
