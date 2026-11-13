import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL. Carga .env.local antes de agregar las propiedades.");
}

const pool = new Pool({ connectionString });

// Registros demostrativos para poblar el catálogo inicial. Precios en USD.
const propiedades = [
  {
    nombre: "Casa contemporánea en Equipetrol",
    ubicacion: "Equipetrol, Santa Cruz de la Sierra",
    direccion: "Zona norte, Equipetrol",
    tipo: "Casa",
    precio: 285000,
    habitaciones: 4,
    banos: 4,
    metros: 310,
    estado: "Disponible",
    descripcion: "Vivienda amplia de diseño contemporáneo, con ambientes integrados, jardín privado y excelente iluminación natural.",
    amenidades: ["Jardín privado", "Parrillero", "Garaje para dos vehículos", "Aire acondicionado"],
    imagen: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Departamento luminoso en Calacoto",
    ubicacion: "Calacoto, La Paz",
    direccion: "A pocas cuadras de la avenida principal",
    tipo: "Apartamento",
    precio: 142000,
    habitaciones: 3,
    banos: 2,
    metros: 126,
    estado: "Disponible",
    descripcion: "Departamento familiar con distribución funcional, ventanales amplios y acceso cercano a comercios y transporte.",
    amenidades: ["Ascensor", "Balcón", "Garaje", "Portería"],
    imagen: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Residencia con patio en Queru Queru",
    ubicacion: "Queru Queru, Cochabamba",
    direccion: "Sector residencial consolidado",
    tipo: "Casa",
    precio: 198000,
    habitaciones: 4,
    banos: 3,
    metros: 248,
    estado: "Disponible",
    descripcion: "Casa cómoda en un entorno tranquilo, con patio arbolado, cocina amplia y espacios pensados para compartir.",
    amenidades: ["Patio", "Churrasquero", "Lavandería", "Garaje"],
    imagen: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Penthouse con terraza privada",
    ubicacion: "Equipetrol, Santa Cruz de la Sierra",
    direccion: "Edificio residencial con seguridad",
    tipo: "Apartamento",
    precio: 325000,
    habitaciones: 3,
    banos: 3,
    metros: 235,
    estado: "Disponible",
    descripcion: "Penthouse de dos niveles con terraza privada, cocina integrada y vistas abiertas de la ciudad.",
    amenidades: ["Terraza", "Piscina", "Gimnasio", "Seguridad 24 horas"],
    imagen: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Terreno residencial en Urubó",
    ubicacion: "Urubó, Santa Cruz de la Sierra",
    direccion: "Urbanización privada con acceso controlado",
    tipo: "Terreno",
    precio: 89000,
    habitaciones: 0,
    banos: 0,
    metros: 720,
    estado: "Disponible",
    descripcion: "Lote plano dentro de una urbanización residencial, ideal para desarrollar una vivienda unifamiliar.",
    amenidades: ["Acceso controlado", "Áreas verdes", "Servicios básicos"],
    imagen: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Local comercial sobre avenida",
    ubicacion: "Centro, Cochabamba",
    direccion: "Avenida de alto flujo peatonal",
    tipo: "Local comercial",
    precio: 168000,
    habitaciones: 0,
    banos: 1,
    metros: 154,
    estado: "Disponible",
    descripcion: "Espacio comercial a nivel de calle con buena exposición, planta abierta y fácil acceso para clientes.",
    amenidades: ["Frente vidriado", "Depósito", "Baño", "Acceso independiente"],
    imagen: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Villa familiar con piscina",
    ubicacion: "Las Palmas, Santa Cruz de la Sierra",
    direccion: "Condominio residencial Las Palmas",
    tipo: "Villa",
    precio: 410000,
    habitaciones: 5,
    banos: 5,
    metros: 390,
    estado: "Disponible",
    descripcion: "Residencia de amplios ambientes con galería cubierta, piscina y jardín privado para disfrutar en familia.",
    amenidades: ["Piscina", "Jardín", "Galería", "Dependencia de servicio", "Garaje"],
    imagen: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Departamento céntrico con balcón",
    ubicacion: "Sopocachi, La Paz",
    direccion: "A pasos de cafeterías y transporte público",
    tipo: "Apartamento",
    precio: 112000,
    habitaciones: 2,
    banos: 2,
    metros: 98,
    estado: "Reservada",
    descripcion: "Departamento práctico y bien conectado, con balcón, área social integrada y espacios de guardado.",
    amenidades: ["Balcón", "Ascensor", "Portería", "Baulera"],
    imagen: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Oficina ejecutiva en zona empresarial",
    ubicacion: "Equipetrol, Santa Cruz de la Sierra",
    direccion: "Centro empresarial con recepción",
    tipo: "Oficina",
    precio: 134000,
    habitaciones: 0,
    banos: 1,
    metros: 86,
    estado: "Disponible",
    descripcion: "Oficina lista para adecuar a distintos equipos de trabajo, en un edificio corporativo con servicios compartidos.",
    amenidades: ["Recepción", "Salas de reunión", "Ascensores", "Estacionamiento"],
    imagen: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1400&auto=format&fit=crop",
  },
  {
    nombre: "Casa con jardín en Tiquipaya",
    ubicacion: "Tiquipaya, Cochabamba",
    direccion: "Barrio residencial de baja densidad",
    tipo: "Casa",
    precio: 176000,
    habitaciones: 3,
    banos: 3,
    metros: 205,
    estado: "Disponible",
    descripcion: "Casa de una planta con jardín, buena entrada de luz y ambientes cómodos en una zona residencial tranquila.",
    amenidades: ["Jardín", "Churrasquero", "Garaje", "Lavandería"],
    imagen: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1400&auto=format&fit=crop",
  },
];

try {
  await pool.query("BEGIN");
  let agregadas = 0;

  for (const propiedad of propiedades) {
    const existente = await pool.query(
      `SELECT id FROM propiedades
       WHERE LOWER(nombre) = LOWER($1) AND LOWER(ubicacion) = LOWER($2)
       LIMIT 1`,
      [propiedad.nombre, propiedad.ubicacion]
    );
    if (existente.rowCount) continue;

    const { imagen, ...datos } = propiedad;
    const insertada = await pool.query(
      `INSERT INTO propiedades (
        nombre, ubicacion, direccion, tipo, precio, habitaciones, banos,
        metros, estado, descripcion, amenidades
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        datos.nombre,
        datos.ubicacion,
        datos.direccion,
        datos.tipo,
        datos.precio,
        datos.habitaciones,
        datos.banos,
        datos.metros,
        datos.estado,
        datos.descripcion,
        datos.amenidades,
      ]
    );
    await pool.query(
      "INSERT INTO imagenes_propiedad (propiedad_id, url, orden) VALUES ($1, $2, 0)",
      [insertada.rows[0].id, imagen]
    );
    agregadas += 1;
  }

  await pool.query("COMMIT");
  console.log(`Propiedades de muestra agregadas: ${agregadas}.`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
