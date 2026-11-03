/**
 * Native ISO-currency pricing, independent of the existing COP-only v2 API.
 * Country-specific taxes must be specified explicitly; this is not a tax engine.
 */
import {FinancialInputError,percentBps,roundDiv,ceilDiv} from "./money.js";
import {currencyDigits,minorAmount,nonNegativeMinorAmount,fromMinor} from "./fx.js";
export type GlobalPriceInput={
 currency:string;salePrice:string;acquisition:string;packaging:string;shippingCost:string;
 shippingCharged:string;fixedFee:string;advertising:string;returnsReserve:string;codReserve:string;
 discountPercent:string;discountFixed:string;feePercent:string;taxDeductionPercent:string;
 targetMargin:string;monthlyFixed:string;monthlyUnits:string;
};
export type GlobalPriceResult={
 currency:string;netProductSale:string;collected:string;discount:string;deductions:string;
 variableCosts:string;contribution:string;marginOnProductPercent:string|null;
 marginOnCollectedPercent:string|null;monthlyProfit:string;breakEvenUnits:string|null;
 targetDenominator:"net-product-sale";estimated:true;
};
const count=/^(0|[1-9]\d{0,9})$/;
const signedPct=(a:bigint,b:bigint)=>b>0n?(a<0n?"-":"")+
 fromMinor(roundDiv((a<0n?-a:a)*10000n,b),"COP"):null; // 2 decimal places
export function globalPrice(input:GlobalPriceInput,override?:string):GlobalPriceResult{
 currencyDigits(input.currency);
 if(!count.test(input.monthlyUnits))throw new FinancialInputError("Volumen mensual inválido.");
 const money=(field:keyof GlobalPriceInput)=>nonNegativeMinorAmount(String(input[field]),input.currency);
 const sale=override===undefined?money("salePrice"):nonNegativeMinorAmount(override,input.currency);
 const fee=percentBps(input.feePercent),tax=percentBps(input.taxDeductionPercent);
 const discountRate=percentBps(input.discountPercent),target=percentBps(input.targetMargin);
 if(fee+tax>=10000n||target>=10000n)throw new FinancialInputError("Porcentajes incompatibles.");
 const discount=roundDiv(sale*discountRate,10000n)+money("discountFixed");
 if(discount>sale)throw new FinancialInputError("Descuento supera el precio.");
 const net=sale-discount,received=net+money("shippingCharged");
 const deductions=roundDiv(net*(fee+tax),10000n);
 const cost=["acquisition","packaging","shippingCost","fixedFee","advertising","returnsReserve","codReserve"].reduce(
  (sum,key)=>sum+nonNegativeMinorAmount(String(input[key as keyof GlobalPriceInput]),input.currency),0n);
 const contribution=received-deductions-cost;
 const fixed=money("monthlyFixed"),units=BigInt(input.monthlyUnits);
 return {currency:input.currency,netProductSale:fromMinor(net,input.currency),
  collected:fromMinor(received,input.currency),discount:fromMinor(discount,input.currency),
  deductions:fromMinor(deductions,input.currency),variableCosts:fromMinor(cost,input.currency),
  contribution:fromMinor(contribution,input.currency),marginOnProductPercent:signedPct(contribution,net),
  marginOnCollectedPercent:signedPct(contribution,received),
  monthlyProfit:fromMinor(contribution*units-fixed,input.currency),
  breakEvenUnits:contribution>0n?ceilDiv(fixed,contribution).toString():null,
  targetDenominator:"net-product-sale",estimated:true};
}
export function globalSuggestedPrice(input:GlobalPriceInput):{
 currency:string;suggestedPrice:string;result:GlobalPriceResult;
}{
 const target=percentBps(input.targetMargin);
 const adequate=(amount:bigint)=>{
  try{
   const sale=fromMinor(amount,input.currency);
   const result=globalPrice(input,sale);
   const contribution=minorAmount(result.contribution,input.currency);
   const net=minorAmount(result.netProductSale,input.currency);
   return net>0n&&contribution*10000n>=net*target;
  }catch{return false;}
 };
 let low=0n,high=100n;
 const max=10n**(12n+BigInt(currencyDigits(input.currency)))-1n;
 while(high<max&&!adequate(high))high=high*2n>max?max:high*2n;
 if(!adequate(high))throw new FinancialInputError("No hay precio viable dentro del límite.");
 while(low+1n<high){const middle=(low+high)/2n;if(adequate(middle))high=middle;else low=middle;}
 const result=globalPrice(input,fromMinor(high,input.currency));
 return {currency:input.currency,suggestedPrice:fromMinor(high,input.currency),result};
}
