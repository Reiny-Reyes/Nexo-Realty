import type { Moneda } from "@/types/propiedad";

export function etiquetaMoneda(moneda: Moneda) {
  return moneda === "BOB" ? "RD$" : "USD";
}

export function formatoMoneda(valor: number, moneda: Moneda = "USD") {
  const esPesosDominicanos = moneda === "BOB";
  const locale = esPesosDominicanos ? "es-DO" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: esPesosDominicanos ? "DOP" : "USD",
    maximumFractionDigits: 0,
  }).format(valor);
}
