import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import DetallePropiedadCliente from "./DetallePropiedadCliente";

type Props = {
  params: Promise<{ id: string }>;
};

export default function PaginaDetallePropiedad({ params }: Props) {
  return (
    <>
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-[#F4F1EB]">
            <p className="text-sm text-[#77786F]">Cargando propiedad…</p>
          </main>
        }
      >
        <ContenidoPropiedad params={params} />
      </Suspense>
      <Suspense fallback={null}>
        <MarcadorDinamico />
      </Suspense>
    </>
  );
}

async function ContenidoPropiedad({ params }: Props) {
  const { id } = await params;
  return <DetallePropiedadCliente id={id} />;
}

async function MarcadorDinamico(): Promise<ReactNode> {
  // Los metadatos reciben el ID de la URL y se generan para la petición actual.
  await connection();
  return null;
}
