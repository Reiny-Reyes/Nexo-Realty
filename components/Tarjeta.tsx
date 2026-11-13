
// Propiedades visuales que recibe la tarjeta de indicador del panel.
type TarjetaProps = {
  titulo: string;
  valor: number;
  detalle: string;
  simbolo: string;
};

export default function Tarjeta({
  titulo,
  valor,
  detalle,
  simbolo,
}: TarjetaProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {titulo}
        </p>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
          {simbolo}
        </span>
      </div>

      <p className="text-3xl font-bold tracking-tight">
        {valor}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {detalle}
      </p>
    </div>
  );
}
