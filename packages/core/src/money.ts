/**
 * All input/export monetary values are canonical decimal strings; all arithmetic
 * is integer centavos (bigint). This deliberately avoids float summation.
 */
export type COP = string & { readonly __cop: unique symbol };
export const MAX_CENTAVOS = 100_000_000_000_000n;
export type PriceRounding = "centavo" | "peso" | "50" | "100" | "500" | "1000" | "ending-900" | "ending-990";
export class FinancialInputError extends Error {
  constructor(message: string) { super(message); this.name = "FinancialInputError"; }
}
export function parseDecimal(value: string, label = "Valor"): bigint {
  if (typeof value !== "string" || !/^(0|[1-9]\\d{0,11})(?:\\.\\d{1,2})?$/.test(value))
    throw new FinancialInputError(label + ": use formato decimal 1234.50 sin separadores de miles.");
  const parts = value.split(".");
  const cents = BigInt(parts[0]!) * 100n + BigInt((parts[1] || "").padEnd(2, "0") || "0");
  if (cents > MAX_CENTAVOS) throw new FinancialInputError(label + ": valor demasiado grande.");
  return cents;
}
/** Parse es-CO screen entry; 89.900 is ninety-thousand minus one hundred. */
export function parseCOPInput(value: string): string {
  const s = value.trim().replace(/^COP\\s*/i, "").replace(/^\\$\\s*/, "").replace(/\\s/g, "");
  if (!/^(?:0|[1-9]\\d*|[1-9]\\d{0,2}(?:\\.\\d{3})+)(?:,\\d{1,2})?$/.test(s))
    throw new FinancialInputError("Valor COP inválido. Ejemplo: 89.900,50");
  const normalized = s.replace(/\\./g, "").replace(",", ".");
  return fromCents(parseDecimal(normalized));
}
export function fromCents(n: bigint): string {
  const sign = n < 0n ? "-" : "";
  const a = n < 0n ? -n : n;
  return sign + (a / 100n).toString() + "." + (a % 100n).toString().padStart(2, "0");
}
export function percentBps(s: string, name = "Porcentaje"): bigint {
  if (typeof s !== "string" || !/^(?:0|[1-9]\\d{0,2})(?:\\.\\d{1,2})?$/.test(s))
    throw new FinancialInputError(name + ": use porcentaje explícito entre 0 y 100 (ej.: 19.5).");
  const bps = parseDecimal(s, name);
  if (bps > 10000n) throw new FinancialInputError(name + ": no puede superar 100%.");
  return bps;
}
export function roundDiv(n: bigint, d: bigint): bigint {
  if (d <= 0n) throw new FinancialInputError("Divisor inválido.");
  if (n < 0n) return -roundDiv(-n, d);
  return (n + d / 2n) / d;
}
export function ceilDiv(n: bigint, d: bigint): bigint {
  if (d <= 0n || n < 0n) throw new FinancialInputError("División inválida.");
  return (n + d - 1n) / d;
}
export function basisAmount(cents: bigint, bps: bigint): bigint {
  return roundDiv(cents * bps, 10000n);
}
export function roundPrice(cents: bigint, method: PriceRounding): bigint {
  if (cents < 0n) throw new FinancialInputError("Precio negativo.");
  if (method === "centavo") return cents;
  if (method === "ending-900" || method === "ending-990") {
    const ending = method === "ending-900" ? 90000n : 99000n;
    const block = 100000n;
    const base = (cents / block) * block + ending;
    return base >= cents ? base : base + block;
  }
  const step = (method === "peso" ? 1n : BigInt(method)) * 100n;
  return ceilDiv(cents, step) * step;
}
export function moneyDisplay(value: string, prefix = "$ "): string {
  const cents = parseDecimal(value);
  const integer = (cents / 100n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
  const fraction = cents % 100n;
  return prefix + integer + (fraction === 0n ? "" : "," + fraction.toString().padStart(2, "0"));
}
