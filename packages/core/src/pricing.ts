import { MAX_CENTAVOS, FinancialInputError, basisAmount, ceilDiv, fromCents, parseDecimal, percentBps, roundDiv, roundPrice, type PriceRounding } from "./money.js";
export type NumericOrigin = "manual" | "estimado" | "confirmado";
export type PriceInput = {
  name: string; category: string; origin: NumericOrigin;
  acquisition: string; packaging: string; shippingCost: string; shippingCharged: string;
  fixedFee: string; advertising: string; returnsReserve: string; codReserve: string;
  feePercent: string; taxPercent: string; ivaPercent: string; codPercent: string;
  discountPercent: string; discountFixed: string; targetMargin: string;
  currentPrice: string; monthlyFixed: string; monthlyUnits: string;
  rounding: PriceRounding;
};
export const EMPTY_INPUT: PriceInput = {
 name:"Producto ejemplo", category:"General", origin:"manual",
 acquisition:"35000.00",packaging:"2000.00",shippingCost:"7000.00",
 shippingCharged:"0.00",fixedFee:"1000.00",advertising:"3000.00",
 returnsReserve:"0.00",codReserve:"0.00",feePercent:"3.00",taxPercent:"0.00",
 ivaPercent:"0.00",codPercent:"0.00",discountPercent:"0.00",
 discountFixed:"0.00",targetMargin:"20.00",currentPrice:"89900.00",
 monthlyFixed:"0.00",monthlyUnits:"100",rounding:"peso"
};
const moneyFields = ["acquisition","packaging","shippingCost","shippingCharged","fixedFee","advertising","returnsReserve","codReserve","discountFixed","currentPrice","monthlyFixed"] as const;
const rateFields = ["feePercent","taxPercent","ivaPercent","codPercent","discountPercent","targetMargin"] as const;
export function validateInput(value: unknown): PriceInput {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new FinancialInputError("Formato de producto inválido.");
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || !v.name.trim() || v.name.length > 120 ||
      typeof v.category !== "string" || v.category.length > 80)
    throw new FinancialInputError("Nombre o categoría inválidos.");
  if (!["manual","estimado","confirmado"].includes(String(v.origin)))
    throw new FinancialInputError("Origen inválido.");
  if (!["centavo","peso","50","100","500","1000","ending-900","ending-990"].includes(String(v.rounding)))
    throw new FinancialInputError("Redondeo inválido.");
  for (const key of moneyFields) parseDecimal(v[key] as string, key);
  for (const key of rateFields) percentBps(v[key] as string, key);
  if (typeof v.monthlyUnits !== "string" || !/^(0|[1-9]\d{0,7})$/.test(v.monthlyUnits))
    throw new FinancialInputError("Unidades mensuales inválidas.");
  const cast = v as unknown as PriceInput;
  const deductions = percentBps(cast.feePercent) + percentBps(cast.taxPercent) + percentBps(cast.codPercent);
  if (deductions >= 10000n) throw new FinancialInputError("Las deducciones porcentuales deben ser menores a 100%.");
  if (percentBps(cast.targetMargin) >= 10000n) throw new FinancialInputError("La meta de margen debe ser menor a 100%.");
  return cast;
}
export type Breakdown = {
  salePrice: string; collected: string; revenue: string; discount: string;
  variableCost: string; deductions: string; ivaIncluded: string; contribution: string;
  marginPercent: string | null; markupPercent: string | null;
  monthlyNet: string; breakEvenUnits: string | null; feasible: boolean;
  assumptions: string[]; warnings: string[];
};
function signedRatio(n: bigint, d: bigint): string | null {
  if (d <= 0n) return null;
  const sign = n < 0n ? "-" : "";
  return sign + fromCents(roundDiv((n < 0n ? -n : n) * 10000n, d));
}
export function analyze(input: PriceInput, salePrice = input.currentPrice): Breakdown {
  const v = validateInput(input);
  const sale = parseDecimal(salePrice, "Precio de venta");
  const disc = basisAmount(sale, percentBps(v.discountPercent)) + parseDecimal(v.discountFixed);
  if (disc > sale) throw new FinancialInputError("El descuento supera el precio del producto.");
  const netSale = sale - disc;
  const freightReceived = parseDecimal(v.shippingCharged);
  const revenue = netSale + freightReceived;
  const variableCost = (["acquisition","packaging","shippingCost","fixedFee","advertising","returnsReserve","codReserve"] as const)
    .reduce((sum,key) => sum + parseDecimal(v[key]),0n);
  const iva = roundDiv(netSale * percentBps(v.ivaPercent), 10000n + percentBps(v.ivaPercent));
  const deductions = basisAmount(netSale, percentBps(v.feePercent) + percentBps(v.taxPercent) + percentBps(v.codPercent)) + iva;
  const contribution = revenue - deductions - variableCost;
  const monthlyUnits = BigInt(v.monthlyUnits);
  const fixed = parseDecimal(v.monthlyFixed);
  const net = contribution * monthlyUnits - fixed;
  const breakEven = contribution <= 0n ? null : ceilDiv(fixed, contribution).toString();
  const warnings: string[] = [];
  if (contribution <= 0n) warnings.push("Contribución no positiva: no existe punto de equilibrio calculable.");
  if (net < 0n) warnings.push("La utilidad mensual proyectada es negativa.");
  if (v.ivaPercent !== "0" && parseDecimal(v.ivaPercent) > 0n)
    warnings.push("IVA ilustrativo incluido solo sobre el valor del producto. Confirme clasificación y tratamiento con asesoría local.");
  if (v.origin !== "confirmado") warnings.push("Existen valores declarados como manuales o estimados; no representan cotizaciones confirmadas.");
  return {
    salePrice:fromCents(sale), collected:fromCents(revenue), revenue:fromCents(revenue),
    discount:fromCents(disc), variableCost:fromCents(variableCost),
    deductions:fromCents(deductions), ivaIncluded:fromCents(iva),
    contribution:fromCents(contribution), marginPercent:signedRatio(contribution, netSale),
    markupPercent: signedRatio(contribution, variableCost),
    monthlyNet:fromCents(net), breakEvenUnits:breakEven,
    feasible: contribution >= 0n, assumptions:[
      "Margen de contribución = ingreso cobrado − deducciones − costos variables.",
      "Descuentos sobre el precio del producto; flete cobrado se suma separadamente.",
      "Comisiones y tributo sobre ingresos aplicados al producto tras descuentos.",
      "IVA indicado se extrae del precio del producto, no del flete.",
      "COD y devoluciones son reservas editables, no tarifas verificadas."
    ],warnings
  };
}
/** Search the minimum pre-discount retail price satisfying contribution/net-sale margin. */
export function suggestPrice(input: PriceInput): { price: string; result: Breakdown; warnings: string[] } {
 const v=validateInput(input);
 const target=percentBps(v.targetMargin);
 // If discount leaves zero net sale, no target margin exists.
 const adequate=(price:bigint):boolean=>{
   try {
     const r=analyze(v,fromCents(price));
     const netSale=parseDecimal(r.salePrice)-parseDecimal(r.discount);
     if(netSale<=0n) return false;
     return parseDecimal(r.contribution) * 10000n >= target * netSale;
   }catch{return false;}
 };
 let lo=0n, hi=100n;
 while(hi<=MAX_CENTAVOS && !adequate(hi)) hi*=2n;
 if(hi>MAX_CENTAVOS) hi=MAX_CENTAVOS;
 if(!adequate(hi)) throw new FinancialInputError("No existe precio viable dentro del límite permitido.");
 while(lo+1n<hi){
   const mid=(lo+hi)/2n;
   if(adequate(mid)) hi=mid; else lo=mid;
 }
 const rounded=roundPrice(hi,v.rounding);
 if(rounded>MAX_CENTAVOS) throw new FinancialInputError("Precio redondeado supera el límite admitido.");
 const result=analyze(v,fromCents(rounded));
 if (!adequate(rounded)) throw new FinancialInputError("El precio redondeado no cumple la meta de margen.");
 return {price:fromCents(rounded),result,warnings:result.warnings};
}
export function maxDiscountPercent(input: PriceInput): string {
 const v=validateInput({...input,discountPercent:"0.00",discountFixed:"0.00"});
 let lo=0n,hi=10000n;
 const pass=(bps:bigint)=>{
   try {
     const value=fromCents(bps);
     const r=analyze({...v,discountPercent:value});
     const net=parseDecimal(r.salePrice)-parseDecimal(r.discount);
     return net>0n && parseDecimal(r.contribution)*10000n>=percentBps(v.targetMargin)*net;
   } catch{return false;}
 };
 if(!pass(0n)) return "0.00";
 while(lo<hi){
   const mid=(lo+hi+1n)/2n;
   if(pass(mid)) lo=mid; else hi=mid-1n;
 }
 return fromCents(lo);
}
