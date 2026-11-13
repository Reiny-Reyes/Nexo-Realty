import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { pool } from "@/lib/db";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

type DatosSEO = {
  nombre: string;
  ubicacion: string;
  direccion: string | null;
  descripcion: string | null;
  estado: string;
  precio: number | string;
  operacion: string;
  moneda: string;
  imagenes: string[];
};

async function obtenerDatosSEO(id: string): Promise<DatosSEO | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`propiedad-seo-${id}`);

  try {
    const resultado = await pool.query(
      `SELECT p.nombre, p.ubicacion, p.direccion, p.descripcion, p.estado, p.precio, p.operacion, p.moneda,
        COALESCE((SELECT JSON_AGG(i.url ORDER BY i.orden)
          FROM imagenes_propiedad i WHERE i.propiedad_id = p.id), '[]'::json) AS imagenes
       FROM propiedades p WHERE p.id = $1`,
      [id]
    );
    return (resultado.rows[0] as DatosSEO | undefined) ?? null;
  } catch (error) {
    console.error("No se pudieron leer los datos SEO de la propiedad:", error);
    return null;
  }
}

function limpiarDescripcion(texto: string | null, ubicacion: string) {
  const resumen = texto?.replace(/\s+/g, " ").trim();
  return resumen
    ? resumen.slice(0, 155)
    : `Conoce esta propiedad en ${ubicacion}. Consulta disponibilidad y coordina una visita con Nexo Realty.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const canonical = `/propiedades/${encodeURIComponent(id)}`;

  const propiedad = await obtenerDatosSEO(id);
  if (!propiedad) {
    return {
      metadataBase: new URL(baseUrl),
      title: "Propiedad no encontrada | Nexo Realty",
      description: "Consulta propiedades y coordina una visita con Nexo Realty.",
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const title = `${propiedad.nombre} en ${propiedad.ubicacion} | Nexo Realty`;
  const description = limpiarDescripcion(propiedad.descripcion, propiedad.ubicacion);
  const image = propiedad.imagenes.find((url) => url.startsWith("https://") || url.startsWith("http://"));

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: "Nexo Realty",
      ...(image ? { images: [{ url: image, alt: propiedad.nombre }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default function LayoutPropiedad({ children, params }: Props) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <DatosEstructurados params={params} />
      </Suspense>
    </>
  );
}

async function DatosEstructurados({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const propiedad = await obtenerDatosSEO(id);
  if (!propiedad) return null;

  const urlSitio = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const datosEstructurados = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: propiedad.nombre,
    description: limpiarDescripcion(propiedad.descripcion, propiedad.ubicacion),
    url: `${urlSitio}/propiedades/${encodeURIComponent(id)}`,
    image: propiedad.imagenes.filter((url) => url.startsWith("http")),
    address: {
      "@type": "PostalAddress",
      streetAddress: propiedad.direccion || undefined,
      addressLocality: propiedad.ubicacion,
    },
    offers: {
      "@type": "Offer",
      price: Number(propiedad.precio),
      priceCurrency: propiedad.moneda,
      availability: propiedad.estado === "Disponible"
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(datosEstructurados).replace(/</g, "\\u003c"),
      }}
    />
  );
}
