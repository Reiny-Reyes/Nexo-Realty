import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { pool } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // La base de datos se consulta al atender /sitemap.xml, no durante el build.
  await connection();

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [{ url: base, changeFrequency: "daily", priority: 1 }];
  try {
    const resultado = await pool.query("SELECT id, updated_at FROM propiedades WHERE estado <> 'Vendida' ORDER BY id DESC");
    for (const fila of resultado.rows as Array<{ id: number; updated_at?: string | Date }>) {
      urls.push({
        url: `${base}/propiedades/${fila.id}`,
        lastModified: fila.updated_at ? new Date(fila.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("No se pudieron generar las URLs del sitemap:", error);
  }
  return urls;
}
