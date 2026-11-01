/**
 * Offline-first COD operational intelligence.
 * Observed order events and ad-platform attributed data are never silently
 * presented as an identical cohort. All amounts are canonical decimal strings.
 */
import {FinancialInputError,fromCents,roundDiv} from "./money.js";
import {minorAmount,fromMinor} from "./fx.js";

export type CODStatus="created"|"cancelled"|"shipped"|"delivery_failed"|"delivered"|"paid"|"returned"|"refunded";
export type OrderEvent={
 id:string;orderId:string;source:string;occurredAt:string;status:CODStatus;
 campaignId:string|null;currency:string;grossRevenue:string;productCost:string;
 shippingCost:string;reverseShippingCost:string;advertisingCost:string;otherCost:string;
 refundAmount:string;
};
export type AdCampaign={
 id:string;source:string;currency:string;spend:string;impressions:string;
 clicks:string;attributedConversions:string;attributedRevenue:string;
 observedFrom:string;observedTo:string;
};
const statuses:CODStatus[]=["created","cancelled","shipped","delivery_failed","delivered","paid","returned","refunded"];
const idPattern=/^[a-zA-Z0-9_.:-]{1,128}$/;
const countPattern=/^(0|[1-9]\d{0,11})$/;
function safeId(value:unknown,label:string):string {
 if(typeof value!=="string"||!idPattern.test(value))throw new FinancialInputError(label+" inválido.");
 return value;
}
function dateString(date:unknown):string {
 if(typeof date!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(date)||!Number.isFinite(Date.parse(date)))
  throw new FinancialInputError("Fecha de evento inválida.");
 return date;
}
export function validateOrderEvent(value:OrderEvent):OrderEvent {
 if(!value||typeof value!=="object")throw new FinancialInputError("Evento inválido.");
 safeId(value.id,"Evento");safeId(value.orderId,"Pedido");safeId(value.source,"Origen");
 if(!statuses.includes(value.status))throw new FinancialInputError("Estado COD inválido.");
 dateString(value.occurredAt);
 if(value.campaignId!==null)safeId(value.campaignId,"Campaña");
 if(typeof value.currency!=="string"||!/^[A-Z]{3}$/.test(value.currency))throw new FinancialInputError("Moneda inválida.");
 for(const field of ["grossRevenue","productCost","shippingCost","reverseShippingCost","advertisingCost","otherCost","refundAmount"] as const)
  minorAmount(value[field],value.currency);
 if(minorAmount(value.refundAmount,value.currency)>minorAmount(value.grossRevenue,value.currency))
  throw new FinancialInputError("Reembolso mayor que el importe de la venta.");
 return value;
}
export function validateAdCampaign(value:AdCampaign):AdCampaign {
 safeId(value.id,"Campaña");safeId(value.source,"Origen");
 if(typeof value.currency!=="string"||!/^[A-Z]{3}$/.test(value.currency))
  throw new FinancialInputError("Moneda inválida.");
 for(const field of ["spend","attributedRevenue"] as const)minorAmount(value[field],value.currency);
 for(const field of ["impressions","clicks","attributedConversions"] as const)
  if(!countPattern.test(value[field]))throw new FinancialInputError("Contador de publicidad inválido.");
 dateString(value.observedFrom);dateString(value.observedTo);
 if(Date.parse(value.observedFrom)>Date.parse(value.observedTo))
  throw new FinancialInputError("Rango de fechas inválido.");
 return value;
}
export type OrderSnapshot={orderId:string;status:CODStatus;campaignId:string|null;currency:string;
 source:string;occurredAt:string;totalEvents:number;
 hasShipped:boolean;hasDelivered:boolean;hasPaid:boolean;hasReturned:boolean;hasRefunded:boolean;
};
function normalizeEvents(input:OrderEvent[]):Map<string,OrderEvent[]> {
 if(!Array.isArray(input)||input.length>100000)throw new FinancialInputError("Cantidad de eventos excesiva.");
 const ids=new Set<string>(),groups=new Map<string,OrderEvent[]>();
 for(const event of input){
  validateOrderEvent(event);
  if(ids.has(event.id))continue; // idempotent replay
  ids.add(event.id);
  const group=groups.get(event.orderId)??[];
  group.push(event);groups.set(event.orderId,group);
 }
 for(const group of groups.values()){
  group.sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||a.id.localeCompare(b.id));
  const currency=group[0]!.currency;
  if(group.some(item=>item.currency!==currency))throw new FinancialInputError("Pedido con distintas monedas: requiere conciliación FX explícita.");
 }
 return groups;
}
function latest(group:OrderEvent[]):OrderEvent{return group[group.length-1]!;}
function observed(group:OrderEvent[],status:CODStatus):boolean{return group.some(v=>v.status===status);}
export function computeCODFunnel(events:OrderEvent[]):{
 currency:string|null; orders:number;created:number;cancelled:number;shipped:number;
 delivered:number;paid:number;deliveryFailed:number;returned:number;refunded:number;
 grossCollected:string;refunds:string;netCollected:string;incurredCosts:string;
 projectedNet:string;unattributedOrders:number; snapshots:OrderSnapshot[];
}{
 const groups=normalizeEvents(events),snapshots:OrderSnapshot[]=[];
 let currency:string|null=null,created=0,cancelled=0,shipped=0,delivered=0,paid=0,deliveryFailed=0,returned=0,refunded=0;
 let grossCollected=0n,refunds=0n,incurredCosts=0n,unattributedOrders=0;
 for(const [id,group]of groups){
  const item=latest(group),wasShipped=observed(group,"shipped")||observed(group,"delivered")||observed(group,"paid")||observed(group,"delivery_failed")||observed(group,"returned")||observed(group,"refunded");
  const wasDelivered=observed(group,"delivered")||observed(group,"paid")||observed(group,"returned")||observed(group,"refunded");
  const wasPaid=observed(group,"paid")||observed(group,"refunded");
  const wasReturned=observed(group,"returned")||observed(group,"refunded");
  const wasRefunded=observed(group,"refunded");
  if(currency!==null&&currency!==item.currency)throw new FinancialInputError("No mezcles diferentes monedas en un resultado COD sin conversión verificable.");
  currency=item.currency;
  created++;if(item.status==="cancelled"&&!wasShipped)cancelled++;
  if(wasShipped)shipped++;if(wasDelivered)delivered++;
  if(wasPaid)paid++;if(item.status==="delivery_failed")deliveryFailed++;
  if(wasReturned)returned++;if(wasRefunded)refunded++;
  if(item.campaignId===null)unattributedOrders++;
  const money=(amount:string)=>minorAmount(amount,item.currency);
  const sale=wasPaid?money(item.grossRevenue):0n;
  const returnedValue=wasRefunded?money(item.refundAmount):0n;
  // Each cost happens once per order, not once per status event.
  const costs=money(item.advertisingCost)+money(item.otherCost)
   +(wasShipped?money(item.shippingCost):0n)
   +(wasReturned?money(item.reverseShippingCost):0n)
   +(wasPaid||wasReturned?money(item.productCost):0n);
  grossCollected+=sale;refunds+=returnedValue;incurredCosts+=costs;
  snapshots.push({orderId:id,status:item.status,campaignId:item.campaignId,currency:item.currency,source:item.source,
   occurredAt:item.occurredAt,totalEvents:group.length,hasShipped:wasShipped,hasDelivered:wasDelivered,
   hasPaid:wasPaid,hasReturned:wasReturned,hasRefunded:wasRefunded});
 }
 return {currency,orders:groups.size,created,cancelled,shipped,delivered,paid,deliveryFailed,returned,refunded,
  grossCollected:fromMinor(grossCollected,currency??"COP"),refunds:fromMinor(refunds,currency??"COP"),
  netCollected:fromMinor(grossCollected-refunds,currency??"COP"),incurredCosts:fromMinor(incurredCosts,currency??"COP"),
  projectedNet:fromMinor(grossCollected-refunds-incurredCosts,currency??"COP"),unattributedOrders,snapshots};
}
export function reconcileCampaigns(events:OrderEvent[],campaigns:AdCampaign[]){
 const funnel=computeCODFunnel(events);
 const names=new Set<string>();
 return campaigns.map(c=>{
  validateAdCampaign(c);
  if(names.has(c.id))throw new FinancialInputError("Campaña duplicada.");names.add(c.id);
  const matching=funnel.snapshots.filter(o=>o.campaignId===c.id);
  if(matching.some(o=>o.currency!==c.currency))
   throw new FinancialInputError("Monedas del anuncio y pedidos incompatibles; convierte cada resultado con una tasa fechada.");
  const matchingOrders=normalizeEvents(events);
  const revenue=matching.reduce((sum,s)=>{const g=matchingOrders.get(s.orderId)!;const row=latest(g);
   return sum+(s.hasPaid?minorAmount(row.grossRevenue,c.currency)-(s.hasRefunded?minorAmount(row.refundAmount,c.currency):0n):0n);
  },0n);
  const spent=minorAmount(c.spend,c.currency);
  return {campaignId:c.id,currency:c.currency,
   attributedConversions:c.attributedConversions,attributedRevenue:c.attributedRevenue,
   matchedOrders:matching.length,paidOrders:matching.filter(x=>x.hasPaid).length,
   observedNetRevenue:fromMinor(revenue,c.currency),observedAdvertisingSpend:c.spend,
   roasOnObservedOrders:spent>0n?fromCents(roundDiv(revenue*100n,spent)):null,
   evidence:matching.length?"matched-explicit-campaign-id":"not-linked",
   discrepancy:fromMinor(minorAmount(c.attributedRevenue,c.currency)-revenue,c.currency),
   warning:"La atribución de anuncios no equivale a pagos confirmados y no debe sustituir registros operativos."};
 });
}
export type CPASensitivityInput={
 currency?:string;createdOrders:string; shippedPercent:string; deliveredPercentOfShipped:string;paidPercentOfDelivered:string;
 contributionPerPaid:string; failedDeliveryCost:string; reverseShippingPerUnpaid:string;
 advertisementPerCreated:string; otherFixedCosts:string;
};
export function simulateCPASensitivity(input:CPASensitivityInput, deliveryRates:string[], cpaValues:string[]){
 if(!countPattern.test(input.createdOrders))throw new FinancialInputError("Pedidos creados inválidos.");
 const count=BigInt(input.createdOrders),currency=input.currency??"COP";
 const money=(value:string)=>minorAmount(value,currency);
 const percent=(v:string)=>{const match=/^(0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(v);if(!match)throw new FinancialInputError("Porcentaje inválido.");const b=BigInt(v.replace(".","").padEnd(v.includes(".")?v.split(".")[0]!.length+2:v.length+2,"0"));if(b>10000n)throw new FinancialInputError("Porcentaje fuera de rango.");return b;};
 const shipped=roundDiv(count*percent(input.shippedPercent),10000n);
 const paidRate=percent(input.paidPercentOfDelivered);
 const fixed=money(input.otherFixedCosts);
 const contribution=money(input.contributionPerPaid);
 const failedCost=money(input.failedDeliveryCost),reverse=money(input.reverseShippingPerUnpaid);
 if(deliveryRates.length>20||cpaValues.length>20)throw new FinancialInputError("Matriz demasiado grande.");
 return deliveryRates.map(deliveryPercent=>{
  const delivered=roundDiv(shipped*percent(deliveryPercent),10000n);
  const paid=roundDiv(delivered*paidRate,10000n),failed=shipped-delivered,unpaid=delivered-paid;
  return {deliveryPercent,shippedOrders:shipped.toString(),deliveredOrders:delivered.toString(),paidOrders:paid.toString(),
   results:cpaValues.map(cpa=>{
    const cp=money(cpa);
    const result=paid*contribution-count*cp-failed*failedCost-unpaid*reverse-fixed;
    return {cpa,profit:fromMinor(result,currency),currency,feasible:result>=0n};
   })};
 });
}
