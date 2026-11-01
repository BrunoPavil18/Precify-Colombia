/**
 * ISO currency conversions for optional connected/offline reports.
 * This does not change the COP-only v2.0.1 pricing-core contract.
 * All *arithmetic* uses integer minor units and decimal-string FX ratios.
 */
import { FinancialInputError, roundDiv } from "./money.js";

export type FXQuote={
 base:string; quote:string; rate:string; date:string; source:string; fetchedAt:string;
};
export const FX_PROVIDER="https://api.frankfurter.dev/v2";
export function currencyCode(code:string):string {
 if(typeof code!=="string"||!/^[A-Z]{3}$/.test(code))throw new FinancialInputError("Código de moneda ISO inválido.");
 return code;
}
export function currencyDigits(code:string):number {
 currencyCode(code);
 const intl=Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]};
 if(intl.supportedValuesOf&&!intl.supportedValuesOf("currency").includes(code))
  throw new FinancialInputError("Moneda ISO no compatible.");
 try {
  const d=new Intl.NumberFormat("en",{style:"currency",currency:code}).resolvedOptions().maximumFractionDigits;
  if(typeof d!=="number"||!Number.isInteger(d)||d<0||d>3)throw new Error("Unsupported currency precision");
  return d;
 }catch {throw new FinancialInputError("Moneda ISO no compatible.");}
}
export function currencyCatalog():string[]{
 const intl=Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]};
 return typeof intl.supportedValuesOf==="function"
  ? intl.supportedValuesOf("currency").map(v=>v.toUpperCase()).filter(v=>/^[A-Z]{3}$/.test(v))
  : ["COP","USD","EUR","BRL","MXN","ARS","CLP","PEN","JPY","GBP","CAD","AUD"];
}
function pow10(n:number):bigint{return 10n**BigInt(n);}
export function minorAmount(amount:string,currency:string):bigint {
 const d=currencyDigits(currency);
 if(typeof amount!=="string"||!/^[-]?(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/.test(amount))
  throw new FinancialInputError("Importe monetario inválido.");
 const negative=amount.startsWith("-"), raw=negative?amount.slice(1):amount;
 const [whole,fraction=""]=raw.split(".");
 if(fraction.length>d)throw new FinancialInputError("La moneda no admite tantas cifras decimales.");
 const result=BigInt(whole!)*pow10(d)+BigInt(fraction.padEnd(d,"0")||"0");
 return negative?-result:result;
}
export function nonNegativeMinorAmount(amount:string,currency:string):bigint {
 const result=minorAmount(amount,currency);
 if(result<0n)throw new FinancialInputError("Importe monetario negativo no admitido para esta base.");
 return result;
}
export function fromMinor(amount:bigint,currency:string):string {
 const d=currencyDigits(currency),scale=pow10(d);
 const abs=amount<0n?-amount:amount;
 return (amount<0n?"-":"")+(abs/scale).toString()+(d?"."+(abs%scale).toString().padStart(d,"0"):"");
}
export function validateFXQuote(candidate:FXQuote):FXQuote {
 if(!candidate||typeof candidate!=="object")throw new FinancialInputError("Cotización inválida.");
 currencyDigits(candidate.base);currencyDigits(candidate.quote);
 if(typeof candidate.rate!=="string"||! /^(?:0|[1-9]\d{0,11})(?:\.\d{1,12})?$/.test(candidate.rate))
  throw new FinancialInputError("Tasa de cambio inválida.");
 if(!Number.isFinite(Number(candidate.rate))||Number(candidate.rate)<=0)
  throw new FinancialInputError("Tasa de cambio debe ser positiva.");
 if(typeof candidate.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)||!Number.isFinite(Date.parse(candidate.date+"T00:00:00Z")))
  throw new FinancialInputError("Fecha de cotización inválida.");
 if(typeof candidate.source!=="string"||candidate.source.length>120||!candidate.source.trim())
  throw new FinancialInputError("Fuente de cotización inválida.");
 if(typeof candidate.fetchedAt!=="string"||!Number.isFinite(Date.parse(candidate.fetchedAt)))
  throw new FinancialInputError("Fecha de consulta inválida.");
 return candidate;
}
export function convertCurrency(amount:string,from:string,to:string,quote:FXQuote):{
 amount:string;currency:string;rate:string;rateDate:string;source:string;
}{
 currencyDigits(from);currencyDigits(to);
 const q=validateFXQuote(quote);
 if(q.base!==from||q.quote!==to)throw new FinancialInputError("Cotización no corresponde al par solicitado.");
 const [whole,fraction=""]=q.rate.split(".");
 const scale=pow10(fraction.length);
 const rate=BigInt(whole!)*scale+BigInt(fraction||"0");
 const signed=minorAmount(amount,from);
 const result=roundDiv(signed*rate*pow10(currencyDigits(to)),scale*pow10(currencyDigits(from)));
 return {amount:fromMinor(result,to),currency:to,rate:q.rate,rateDate:q.date,source:q.source};
}
export function quoteAge(quote:FXQuote,now:string):{days:number;stale:boolean}{
 validateFXQuote(quote);
 const elapsed=Date.parse(now)-Date.parse(quote.date+"T00:00:00Z");
 if(!Number.isFinite(elapsed))throw new FinancialInputError("Fecha actual inválida.");
 const days=Math.max(0,Math.floor(elapsed/86400000));
 // The provider publishes daily indicative data; weekends and holidays cause gaps.
 return {days,stale:days>3};
}
