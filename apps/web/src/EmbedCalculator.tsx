import {useMemo,useState} from "react";
import {currencyCatalog,globalPrice,globalSuggestedPrice,type GlobalPriceInput} from "@precify-colombia/core";
import {LocaleContext,readLocale,translate,type Locale} from "./i18n";

/** No account, storage, cookies or network calls; suitable for a third-party iframe.
 * All fields are user-entered and processed in this document only.
 */
const empty:GlobalPriceInput={
 currency:"COP",salePrice:"100000.00",acquisition:"50000.00",packaging:"0",
 shippingCost:"0",shippingCharged:"0",fixedFee:"0",advertising:"0",
 returnsReserve:"0",codReserve:"0",discountPercent:"0",discountFixed:"0",
 feePercent:"0",taxDeductionPercent:"0",targetMargin:"20",monthlyFixed:"0",monthlyUnits:"100"
};
const fields=[
 ["salePrice","Precio de venta"],
 ["acquisition","Costo de adquisición"],
 ["shippingCost","Costo de envío"],
 ["shippingCharged","Envío cobrado al cliente"],
 ["advertising","Publicidad por pedido"],
 ["fixedFee","Comisión fija por venta"],
 ["feePercent","Comisión porcentual (%)"],
 ["targetMargin","Margen objetivo sobre venta neta (%)"]
] as const;
export default function EmbedCalculator(){
 const [locale,setLocale]=useState<Locale>(()=>readLocale());
 const [data,setData]=useState<GlobalPriceInput>(empty);
 const t=(text:string)=>translate(locale,text);
 const analysis=useMemo(()=>{
  try{return {current:globalPrice(data),recommended:globalSuggestedPrice(data)};}
  catch(e){return {error:e instanceof Error?e.message:String(e)};}
 },[data]);
 return <LocaleContext.Provider value={locale}>
  <main className="embed-calculator" style={{maxWidth:920,margin:"0 auto",padding:"20px",minHeight:320}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <h1 style={{fontSize:24,margin:0}}>Precify Colombia</h1>
    <label>{t("Idioma")} <select value={locale} onChange={e=>setLocale(e.target.value as Locale)}>
     <option value="es-CO">ES</option><option value="pt-BR">PT</option><option value="en">EN</option>
    </select></label>
   </header>
   <p className="muted">{t("Calculadora integrable. Sin cuenta ni transferencia de datos a la tienda o al servidor.")}</p>
   <section className="main-card">
    <label className="field"><span>{t("Moneda de cálculo")}</span><select value={data.currency}
     onChange={e=>setData(old=>({...old,currency:e.target.value}))}>
     {currencyCatalog().map(c=><option key={c} value={c}>{c}</option>)}
    </select></label>
    <div className="advanced-grid">{fields.map(([key,label])=><label key={key} className="field">
     <span>{t(label)}</span>
     <input value={data[key]} inputMode="decimal" type="text"
      onChange={e=>setData(old=>({...old,[key]:e.target.value}))}
      onBlur={()=>{if(!data[key].trim())setData(old=>({...old,[key]:"0"}));}}/>
    </label>)}</div>
    {"error" in analysis?<p role="alert">{t(analysis.error??"")}</p>:
     <div className="advanced-results" aria-live="polite"><h2>{t("Resultados de precio internacional")}</h2>
      <dl>
       <div><dt>{t("Precio recomendado")}</dt><dd>{data.currency+" "+analysis.recommended?.suggestedPrice}</dd></div>
       <div><dt>{t("Contribución unitaria")}</dt><dd>{data.currency+" "+analysis.current?.contribution}</dd></div>
       <div><dt>{t("Margen sobre venta neta (%)")}</dt><dd>{analysis.current?.marginOnProductPercent??"—"}%</dd></div>
      </dl>
     </div>}
    <p className="muted">{t("Valores estimados. No son asesoría fiscal ni precios garantizados.")}</p>
   </section>
   <footer className="muted" style={{marginTop:16}}>
    <a href="https://github.com/BrunoPavil18/Precify-Colombia" target="_blank" rel="noopener noreferrer">Precify Colombia · Apache-2.0</a>
   </footer>
  </main>
 </LocaleContext.Provider>;
}
