/** Advanced standalone financial simulations. All money is canonical COP strings; no floats. */
import { FinancialInputError, basisAmount, ceilDiv, fromCents, parseDecimal, percentBps, roundDiv } from "./money.js";
import { analyze, validateInput, type PriceInput } from "./pricing.js";

const signed=(value:string):bigint=>value.startsWith("-")?-parseDecimal(value.slice(1)):parseDecimal(value);
const nonzero=(amount:bigint,label:string)=>{if(amount===0n)throw new FinancialInputError(label+": debe ser positivo.");return amount;};
const bps=(value:string):bigint=>percentBps(value);
export type CODSimulationInput={
 product:PriceInput;
 createdOrders:string; shippedPercent:string; deliveredPercentOfShipped:string; paidPercentOfDelivered:string;
 failedAttemptCost:string; returnShippingCost:string; advertisingPerCreatedOrder:string;
 extraCODFeePerPaidOrder:string; lossReservePerFailedOrder:string;
};
/** Scenario rates are percentages, never assumed logistics benchmarks.
 * Success probabilities are conditional: shipped/created, delivered/shipped, paid/delivered.
 * Product acquisition is charged for successful payments only; uncollected orders
 * carry explicit loss/return reserves rather than double counting product cost.
 */
export function simulateCOD(input:CODSimulationInput){
 const v=validateInput(input.product);
 if(!/^(0|[1-9]\d{0,7})$/.test(input.createdOrders))throw new FinancialInputError("Cantidad de pedidos inválida.");
 const created=BigInt(input.createdOrders);
 const shipped=roundDiv(created*bps(input.shippedPercent),10000n);
 const delivered=roundDiv(shipped*bps(input.deliveredPercentOfShipped),10000n);
 const paid=roundDiv(delivered*bps(input.paidPercentOfDelivered),10000n);
 const failed=created-paid,notShipped=created-shipped,shipFailures=shipped-delivered,deliveredUnpaid=delivered-paid;
 const standard=signed(analyze(v).contribution);
 // Existing advertising and COD/returns reserves are NOT duplicated.
 const perPaid=standard-parseDecimal(v.advertising)-parseDecimal(v.codReserve)-parseDecimal(v.returnsReserve)
   -parseDecimal(input.extraCODFeePerPaidOrder);
 const ad=created*parseDecimal(input.advertisingPerCreatedOrder);
 const failures=shipFailures*parseDecimal(input.failedAttemptCost)+failed*parseDecimal(input.lossReservePerFailedOrder);
 const reversals=(shipFailures+deliveredUnpaid)*parseDecimal(input.returnShippingCost);
 const total=paid*perPaid-ad-failures-reversals;
 return {
  createdOrders:created.toString(),shippedOrders:shipped.toString(),deliveredOrders:delivered.toString(),
  paidOrders:paid.toString(),failedOrders:failed.toString(),cancelledBeforeShipping:notShipped.toString(),
  deliveryFailures:shipFailures.toString(),deliveredUnpaid:deliveredUnpaid.toString(),
  expectedProfit:fromCents(total),
  profitPerCreatedOrder:created===0n?null:fromCents(roundDiv(total,created)),
  profitPerShippedOrder:shipped===0n?null:fromCents(roundDiv(total,shipped)),
  profitPerPaidOrder:paid===0n?null:fromCents(roundDiv(total,paid)),
  assumptions:["Las tasas y costos son hipótesis ingresadas por el usuario.","No equivale a una tarifa publicada por transportadoras.","La adquisición de mercancía no recuperada debe modelarse dentro de la reserva de pérdidas."]
 };
}
export type CampaignInput={
 product:PriceInput; impressions:string; conversionPercent:string;
 advertisingSpend:string; attributedRevenue:string; refundPercent:string;
};
export function simulateCampaign(input:CampaignInput){
 const p=validateInput(input.product);
 if(!/^(0|[1-9]\d{0,11})$/.test(input.impressions))throw new FinancialInputError("Impresiones inválidas.");
 const impressions=BigInt(input.impressions);
 const conversions=roundDiv(impressions*bps(input.conversionPercent),10000n);
 const spend=parseDecimal(input.advertisingSpend);
 const attributed=parseDecimal(input.attributedRevenue);
 const refunded=basisAmount(attributed,bps(input.refundPercent));
 const netAttributed=attributed-refunded;
 const breakdown=analyze({...p,advertising:"0.00"});
 const contribution=signed(breakdown.contribution);
 const projectedRevenue=conversions*parseDecimal(breakdown.collected);
 const projectedRefunds=basisAmount(projectedRevenue,bps(input.refundPercent));
 // A refunded sale loses its collected revenue, while costs already incurred remain.
 const projectedProfit=conversions*contribution-projectedRefunds-spend;
 const disagreement=attributed!==projectedRevenue;
 const maxCAC=contribution>0n?fromCents(contribution):null;
 const cac=conversions===0n?null:fromCents(roundDiv(spend,conversions));
 const roas=spend===0n?null:fromCents(roundDiv(netAttributed*100n,spend));
 const breakEvenRoas=contribution<=0n||parseDecimal(breakdown.collected)===0n?null:
  fromCents(roundDiv(parseDecimal(breakdown.collected)*100n,contribution));
 return {conversions:conversions.toString(),cac,maxCAC,roas,breakEvenRoas,
   projectedRevenue:fromCents(projectedRevenue),projectedRefunds:fromCents(projectedRefunds),
   projectedRoas:spend===0n?null:fromCents(roundDiv((projectedRevenue-projectedRefunds)*100n,spend)),
   revenueMethod:"separate-observed-and-projected" as const,attributionMismatch:disagreement,
   attributionDifference:fromCents(attributed-projectedRevenue),
   reconciliationNotice:disagreement?"La facturación atribuida informada no coincide con conversiones por ingreso unitario. ROAS atribuido y utilidad proyectada usan bases distintas y se presentan separadamente.":"La facturación atribuida coincide con la proyección bruta.",
   attributedRevenueAfterRefunds:fromCents(netAttributed),projectedProfit:fromCents(projectedProfit),
   estimated:true};
}
export type PUMUnit="g"|"kg"|"ml"|"l"|"cm"|"m"|"unit";
const unitFactor:Record<PUMUnit,bigint>={g:1n,kg:1000n,ml:1n,l:1000n,cm:1n,m:100n,unit:1n};
const unitFamily:Record<PUMUnit,string>={g:"mass",kg:"mass",ml:"volume",l:"volume",cm:"length",m:"length",unit:"count"};
/** Price per selected reference unit. Omitting referenceUnit retains the v2.0.0
 * kilogram/liter/meter default and therefore does not change existing callers.
 * UI callers must explicitly select the reference to avoid ambiguous displays.
 */
export function pricePerMeasure(price:string,quantity:string,unit:PUMUnit,referenceUnit?:PUMUnit){
 const cents=parseDecimal(price),q=parseDecimal(quantity);
 nonzero(q,"Cantidad");
 if(!Object.prototype.hasOwnProperty.call(unitFactor,unit))throw new FinancialInputError("Unidad inválida.");
 const reference=referenceUnit??(unit==="g"?"kg":unit==="ml"?"l":unit==="cm"?"m":unit);
 if(!Object.prototype.hasOwnProperty.call(unitFactor,reference))throw new FinancialInputError("Unidad de referencia inválida.");
 if(unitFamily[unit]!==unitFamily[reference])throw new FinancialInputError("Las unidades de contenido y comparación deben ser compatibles.");
 // Values carry two decimal places. Ratio is exactly centavos * referenceFactor / inputFactor / quantity.
 const numerator=cents*100n*unitFactor[reference];
 const denominator=q*unitFactor[unit];
 const amount=roundDiv(numerator,denominator),truncated=numerator/denominator;
 return {unit:reference,sourceUnit:unit,referenceUnit:reference,quantity:fromCents(q),
 pricePerUnit:fromCents(amount),regulatoryTruncatedPrice:fromCents(truncated),
 exactPriceFraction:{numerator:numerator.toString(),denominator:denominator.toString()},
 regulatoryPresentationConditional:true,informativeOnly:true};
}
export type ConsumerPriceInput={
 productPrice:string; discount:string; additionalFees:string; shippingCharged:string;
 taxMode:"included"|"additional"|"none";taxPercent:string;
};
/** Tax is either embedded in the product or added, never counted twice. */
export function consumerPricePreview(input:ConsumerPriceInput){
 const price=parseDecimal(input.productPrice),discount=parseDecimal(input.discount);
 if(discount>price)throw new FinancialInputError("Descuento superior al precio.");
 const net=price-discount;
 const shipping=parseDecimal(input.shippingCharged),fees=parseDecimal(input.additionalFees);
 const taxRate=bps(input.taxPercent);
 if(!["included","additional","none"].includes(input.taxMode))throw new FinancialInputError("Modo tributario inválido.");
 const tax=input.taxMode==="included"?roundDiv(net*taxRate,10000n+taxRate):
  input.taxMode==="additional"?basisAmount(net,taxRate):0n;
 const total=net+fees+shipping+(input.taxMode==="additional"?tax:0n);
 return {netProduct:fromCents(net),tax:fromCents(tax),shipping:fromCents(shipping),
   otherCharges:fromCents(fees),consumerTotal:fromCents(total),estimated:true};
}
export type MixLine={product:PriceInput;monthlyUnits:string};
export function simulatePortfolio(items:MixLine[],monthlyFixed:string){
 if(!Array.isArray(items)||items.length===0||items.length>500)throw new FinancialInputError("Cartera inválida.");
 const fixed=parseDecimal(monthlyFixed);
 let weighted=0n,totalUnits=0n,totalRevenue=0n;
 const lines=items.map(({product,monthlyUnits})=>{
  if(!/^(0|[1-9]\d{0,7})$/.test(monthlyUnits))throw new FinancialInputError("Unidades inválidas.");
  const n=BigInt(monthlyUnits),r=analyze(product);
  const contribution=signed(r.contribution)*n;
  weighted+=contribution;totalUnits+=n;totalRevenue+=parseDecimal(r.collected)*n;
  return {name:product.name,units:monthlyUnits,contribution:fromCents(contribution),perUnit:r.contribution};
 });
 const average=totalUnits===0n?null:roundDiv(weighted,totalUnits);
 const exactMixBreakEven=totalUnits===0n||weighted<=0n?null:ceilDiv(fixed*totalUnits,weighted);
 return {lines,totalUnits:totalUnits.toString(),totalContribution:fromCents(weighted),
  monthlyProfit:fromCents(weighted-fixed),
  breakEvenUnits:exactMixBreakEven===null?null:exactMixBreakEven.toString(),
  fixedMixAssumption:true,breakEvenScaleNumerator:totalUnits.toString(),breakEvenScaleDenominator:weighted.toString(),
  weightedContribution:average===null?null:fromCents(average),
  netMargin:totalRevenue===0n?null:fromCents(roundDiv((weighted-fixed)*10000n,totalRevenue)),
  estimated:true};
}
