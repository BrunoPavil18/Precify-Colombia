import {useMemo,useState} from "react";
import {globalPrice,globalSuggestedPrice,currencyCatalog,type GlobalPriceInput} from "@precify-colombia/core";
import {useTranslator} from "./i18n";

const defaultInput:GlobalPriceInput={
 currency:"USD",salePrice:"100.00",acquisition:"50.00",packaging:"0.00",shippingCost:"0.00",
 shippingCharged:"0.00",fixedFee:"0.00",advertising:"0.00",returnsReserve:"0.00",
 codReserve:"0.00",discountPercent:"0",discountFixed:"0.00",feePercent:"0",
 taxDeductionPercent:"0",targetMargin:"20",monthlyFixed:"0",monthlyUnits:"100"
};
const entries=[
 ["salePrice","Precio de venta"],["acquisition","Costo de adquisición"],["packaging","Empaque"],
 ["shippingCost","Costo de envío"],["shippingCharged","Envío cobrado al cliente"],
 ["fixedFee","Comisión fija por venta"],["advertising","Publicidad por pedido"],
 ["returnsReserve","Reserva por devoluciones"],["codReserve","Reserva por no entrega (COD)"],
 ["discountPercent","Descuento porcentual (%)"],["discountFixed","Descuento fijo adicional"],
 ["feePercent","Comisión porcentual (%)"],["taxDeductionPercent","Deducción tributaria estimada (%)"],
 ["targetMargin","Margen objetivo sobre venta neta (%)"],["monthlyFixed","Gastos fijos mensuales"],
 ["monthlyUnits","Unidades mensuales"]
] as const;
export function GlobalPricingLab(){
 const t=useTranslator(),[input,setInput]=useState(defaultInput);
 const supported=useMemo(()=>currencyCatalog(),[]);
 const outcome=useMemo(()=>{
  try{return {data:globalPrice(input),suggestion:globalSuggestedPrice(input)};}
  catch(e){return {error:e instanceof Error?e.message:String(e)};}
 },[input]);
 return <section className="main-card global-pricing">
  <span className="eyebrow">{t("PRECIFICACIÓN MULTIMONEDA")}</span>
  <h2>{t("Calcula márgenes directamente en la moneda elegida")}</h2>
  <p className="muted">{t("Este cálculo utiliza valores nativos en una sola moneda, no una tasa de cambio implícita. No mezcla importes de diferentes monedas ni calcula tributos oficiales automáticamente.")}</p>
  <div className="advanced-grid">
   <label className="field"><span>{t("Moneda de cálculo")}</span><select value={input.currency} onChange={e=>setInput(v=>({...v,currency:e.target.value}))}>
    {supported.map(code=><option value={code} key={code}>{code}</option>)}</select></label>
   {entries.map(([key,label])=><label className="field" key={key}><span>{t(label)}</span>
    <input type="text" inputMode="decimal" value={input[key]} onChange={e=>setInput(v=>({...v,[key]:e.target.value}))}
     onBlur={()=>{if(!input[key].trim())setInput(v=>({...v,[key]:"0"}));}}/></label>)}
  </div>
  {"error" in outcome?<p role="alert">{t(outcome.error??"")}</p>:<div className="advanced-results">
   <h3>{t("Resultados de precio internacional")}</h3>
   <dl>
    {([["contribution","Contribución unitaria"],["monthlyProfit","Beneficio mensual estimado"],
     ["marginOnProductPercent","Margen sobre venta neta (%)"],["marginOnCollectedPercent","Margen sobre cobro total (%)"],
     ["breakEvenUnits","Unidades para equilibrio"]] as const).map(([field,label])=>
     <div key={field}><dt>{t(label)}</dt><dd>{outcome.data?.[field]??"—"}{field.startsWith("margin")?"%":field==="breakEvenUnits"?"":" "+input.currency}</dd></div>)}
    <div><dt>{t("Precio recomendado")}</dt><dd>{input.currency+" "+outcome.suggestion?.suggestedPrice}</dd></div>
   </dl>
  </div>}
  <p className="muted">{t("El precio sugerido conserva como denominador la venta neta del producto. Los impuestos son deducciones configurables, no asesoría fiscal.")}</p>
 </section>;
}
