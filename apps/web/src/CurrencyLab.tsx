import { GlobalPricingLab } from "./GlobalPricingLab";
import {useCallback,useEffect,useMemo,useState} from "react";
import {FX_PROVIDER,convertCurrency,currencyCatalog,validateFXQuote,quoteAge,type FXQuote} from "@precify-financy/core";
import {useTranslator} from "./i18n";

const KEY="precify-financy:fx-quote:v1:";
const pairKey=(base:string,quote:string)=>KEY+base+":"+quote;
function cached(base:string,quote:string):FXQuote|null{
 try{const raw=localStorage.getItem(pairKey(base,quote));return raw?validateFXQuote(JSON.parse(raw) as FXQuote):null;}
 catch{return null;}
}
function rateString(input:unknown):string{
 if(typeof input!=="number"||!Number.isFinite(input)||input<=0)throw new Error("Cambio inválido");
 const value=String(input);
 if(!value.includes("e"))return value;
 const [coefficient,expText]=value.split("e");
 const exp=Number(expText);
 const [whole,fraction=""]=coefficient!.split(".");
 const digits=whole!+fraction;
 const decimalPoint=whole!.length+exp;
 const result=decimalPoint<=0?"0."+"0".repeat(-decimalPoint)+digits:
  decimalPoint>=digits.length?digits+"0".repeat(decimalPoint-digits.length):
   digits.slice(0,decimalPoint)+"."+digits.slice(decimalPoint);
 return result;
}
function ageLabel(quote:FXQuote):string{
 try{return quoteAge(quote,new Date().toISOString()).stale?"stale":"recent";}catch{return "stale";}
}
export function CurrencyLab(){
 const t=useTranslator();
 const currencies=useMemo(()=>currencyCatalog(),[]);
 const [base,setBase]=useState("COP"),[quote,setQuote]=useState("USD");
 const [amount,setAmount]=useState("100000.00");
 const [observation,setObservation]=useState<FXQuote|null>(()=>cached("COP","USD"));
 const [status,setStatus]=useState(""),[loading,setLoading]=useState(false);
 const [revision,setRevision]=useState(0);
 const fetchQuote=useCallback(async(signal:AbortSignal)=>{
  const prior=cached(base,quote);
  setObservation(prior);
  if(base===quote){setStatus("same");return;}
  setStatus(prior?"cached":"fetching");setLoading(true);
  try{
   const res=await fetch(FX_PROVIDER+"/rate/"+base.toLowerCase()+"/"+quote.toLowerCase(),{signal,cache:"no-store",headers:{"Accept":"application/json"}});
   if(!res.ok)throw new Error("HTTP "+res.status);
   const body=await res.json() as {base?:unknown;quote?:unknown;date?:unknown;rate?:unknown};
   const latest=validateFXQuote({
    base,quote,rate:rateString(body.rate),date:String(body.date),
    source:"Frankfurter (indicative daily)",fetchedAt:new Date().toISOString()
   });
   if(signal.aborted)return;
   localStorage.setItem(pairKey(base,quote),JSON.stringify(latest));
   setObservation(latest);setStatus("updated");
  }catch(e){
   if(signal.aborted)return;
   setStatus(prior?"offline-cached":"unavailable");
  }finally{if(!signal.aborted)setLoading(false);}
 },[base,quote]);
 useEffect(()=>{
  const controller=new AbortController();
  void fetchQuote(controller.signal);
  return()=>controller.abort();
 },[fetchQuote,revision]);
 const result=useMemo(()=>{
  try{
   if(base===quote)return {amount, currency:quote,rate:"1",rateDate:"—",source:"identity"};
   return observation?convertCurrency(amount,base,quote,observation):null;
  }catch{return null;}
 },[amount,base,quote,observation]);
 return <><section className="main-card currency-lab">
  <span className="eyebrow">{t("CAMBIO INTERNACIONAL")}</span>
  <h2>{t("Convertidor de divisas con historial de tasas")}</h2>
  <p className="muted">{t("Cotizaciones indicativas de referencia, normalmente diarias. No son precios de negociación en tiempo real ni tipos de cambio fiscales certificados.")}</p>
  <div className="advanced-grid">
   <label className="field"><span>{t("Importe")}</span><input type="text" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} onBlur={()=>{if(!amount.trim())setAmount("0");}}/></label>
   <label className="field"><span>{t("Moneda de origen")}</span><select value={base} onChange={e=>setBase(e.target.value)}>
    {currencies.map(code=><option key={code} value={code}>{code}</option>)}</select></label>
   <label className="field"><span>{t("Moneda de destino")}</span><select value={quote} onChange={e=>setQuote(e.target.value)}>
    {currencies.map(code=><option key={code} value={code}>{code}</option>)}</select></label>
  </div>
  <div className="advanced-actions">
   <button className="secondary" disabled={loading} onClick={()=>setRevision(v=>v+1)}>{t("Actualizar cotización")}</button>
  </div>
  <div className="advanced-results" aria-live="polite">
   <h3>{t("Conversión estimada")}</h3>
   {result?<dl>
    <div><dt>{t("Importe convertido")}</dt><dd>{result.currency+" "+result.amount}</dd></div>
    <div><dt>{t("Tasa de referencia")}</dt><dd>{result.rate}</dd></div>
    <div><dt>{t("Fecha de la cotización")}</dt><dd>{result.rateDate}</dd></div>
    <div><dt>{t("Fuente")}</dt><dd>{result.source}</dd></div>
   </dl>:<p role="status">{t("Sin tasa válida para este par. Conecta a internet para obtenerla.")}</p>}
  </div>
  <p className="muted" role="status">{status==="updated"?t("Cotización actualizada desde Frankfurter."):
   status==="cached"||status==="offline-cached"?t("Sin conexión: se conserva la última cotización guardada, que puede estar desactualizada."):
   status==="unavailable"?t("No hay una cotización local para este par. No se inventará una tasa."):
   status==="same"?t("Es la misma moneda; no se necesita conversión."):t("Consultando cotización, si hay internet...")}
  </p>
  {observation&&base!==quote&&<p className="muted">{ageLabel(observation)==="stale"?t("Advertencia: la cotización guardada tiene más de tres días."):t("Consulta de referencia: confirma la fecha antes de tomar decisiones.")}</p>}
  <p className="muted">{t("Las cotizaciones se almacenan únicamente en este navegador y nunca alteran los productos COP existentes. La calculadora histórica sigue en COP.")}</p>
 </section><GlobalPricingLab/></>;
}
