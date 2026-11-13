import type { Moneda } from "@/types/propiedad";

export function formatoMoneda(valor: number, moneda: Moneda = "USD") {
  const locale = moneda === "BOB" ? "es-BO" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);
}
