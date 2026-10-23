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
 const failed=created-paid,shipFailures=shipped-delivered;
 const standard=signed(analyze(v).contribution);
 // Existing advertising and COD/returns reserves are NOT duplicated.
 const perPaid=standard-parseDecimal(v.advertising)-parseDecimal(v.codReserve)-parseDecimal(v.returnsReserve)
   -parseDecimal(input.extraCODFeePerPaidOrder);
 const ad=created*parseDecimal(input.advertisingPerCreatedOrder);
 const failures=failed*(parseDecimal(input.failedAttemptCost)+parseDecimal(input.lossReservePerFailedOrder));
 const reversals=shipFailures*parseDecimal(input.returnShippingCost);
 const total=paid*perPaid-ad-failures-reversals;
 return {
  createdOrders:created.toString(),shippedOrders:shipped.toString(),deliveredOrders:delivered.toString(),
  paidOrders:paid.toString(),failedOrders:failed.toString(),
  expectedProfit:fromCents(total),
  profitPerCreatedOrder:created===0n?null:fromCents(roundDiv(total,created)),
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
 const projectedProfit=conversions*contribution-spend;
 const maxCAC=contribution>0n?fromCents(contribution):null;
 const cac=conversions===0n?null:fromCents(roundDiv(spend,conversions));
 const roas=spend===0n?null:fromCents(roundDiv(netAttributed*100n,spend));
 const breakEvenRoas=contribution<=0n||parseDecimal(breakdown.collected)===0n?null:
  fromCents(roundDiv(parseDecimal(breakdown.collected)*100n,contribution));
 return {conversions:conversions.toString(),cac,maxCAC,roas,breakEvenRoas,
   attributedRevenueAfterRefunds:fromCents(netAttributed),projectedProfit:fromCents(projectedProfit),
   estimated:true};
}
export type PUMUnit="g"|"kg"|"ml"|"l"|"cm"|"m"|"unit";
export function pricePerMeasure(price:string,quantity:string,unit:PUMUnit){
 const cents=parseDecimal(price),q=parseDecimal(quantity);
 nonzero(q,"Cantidad");
 if(!["g","kg","ml","l","cm","m","unit"].includes(unit))throw new FinancialInputError("Unidad inválida.");
 // quantity carries two decimal digits. Per 1kg for g, per 1L for ml, otherwise per base unit.
 const scale=unit==="g"||unit==="ml"?1000n:unit==="cm"?100n:1n;
 const amount=roundDiv(cents*100n*scale,q);
 return {unit:unit==="g"?"kg":unit==="ml"?"l":unit==="cm"?"m":unit,
 pricePerUnit:fromCents(amount),informativeOnly:true};
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
 return {lines,totalUnits:totalUnits.toString(),totalContribution:fromCents(weighted),
  monthlyProfit:fromCents(weighted-fixed),
  breakEvenUnits:average===null||average<=0n?null:ceilDiv(fixed,average).toString(),
  weightedContribution:average===null?null:fromCents(average),
  netMargin:totalRevenue===0n?null:fromCents(roundDiv((weighted-fixed)*10000n,totalRevenue)),
  estimated:true};
}
