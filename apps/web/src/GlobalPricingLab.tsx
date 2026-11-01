import {useEffect,useMemo,useRef,useState} from "react";
import {loadGlobalCatalog,persistGlobalCatalog,decodeGlobalCatalogBackup,downloadGlobalCatalog,type GlobalSavedCatalog} from "./global-storage";
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
 const initial=useMemo(loadGlobalCatalog,[]);
 const [catalog,setCatalog]=useState(initial.catalog);
 const baseline=useRef(initial.raw);
 const [locked,setLocked]=useState(!!initial.error),[notice,setNotice]=useState(initial.error??"");
 const [name,setName]=useState(""),[selectedId,setSelectedId]=useState("");
 const [pendingDelete,setPendingDelete]=useState(""),[pendingRestore,setPendingRestore]=useState<GlobalSavedCatalog|null>(null);
 useEffect(()=>{
  const listener=(e:StorageEvent)=>{if(e.key==="precify-colombia:global-pricing:v1"){setLocked(true);setNotice("Otro navegador o pestaña modificó el catálogo de monedas. Exporta tus datos y recarga.");}};
  window.addEventListener("storage",listener);return()=>window.removeEventListener("storage",listener);
 },[]);
 function commit(next:GlobalSavedCatalog):boolean{
  if(locked)return false;
  try{
   const raw=persistGlobalCatalog(next,baseline.current);
   baseline.current=raw;setCatalog(next);setNotice(t("Catálogo internacional guardado en este navegador."));return true;
  }catch(e){setLocked(true);setNotice(String(e));return false;}
 }
 function saveProduct(){
  try{
   globalPrice(input);
   if(!name.trim())throw new Error("Introduce un nombre para guardar el precio.");
   const id=selectedId||crypto.randomUUID(),updatedAt=new Date().toISOString();
   const old=catalog.products.find(x=>x.id===id);
   const previousHistory=old?.history??[];
   const history=old&&(old.input.salePrice!==input.salePrice||old.input.currency!==input.currency)
    ?[...previousHistory,{salePrice:old.input.salePrice,currency:old.input.currency,at:old.updatedAt}].slice(-100)
    :previousHistory;
   const row={id,name:name.trim(),input:{...input},updatedAt,history};
   const next={version:1 as const,products:[...catalog.products.filter(x=>x.id!==id),row]};
   if(commit(next))setSelectedId(id);
  }catch(e){setNotice(String(e));}
 }
 async function stageRestore(file:File|undefined){
  if(!file||locked)return;
  try{if(file.size>2000000)throw new Error("Respaldo excede el límite de 2 MB.");
   setPendingRestore(decodeGlobalCatalogBackup(await file.text()));
   setNotice(t("Respaldo validado; confirma si quieres sustituir el catálogo internacional."));
  }catch(e){setPendingRestore(null);setNotice(String(e));}
 }

 const outcome=useMemo(()=>{
  try{return {data:globalPrice(input),suggestion:globalSuggestedPrice(input)};}
  catch(e){return {error:e instanceof Error?e.message:String(e)};}
 },[input]);
 return <section className="main-card global-pricing">
  <span className="eyebrow">{t("PRECIFICACIÓN MULTIMONEDA")}</span>
  <h2>{t("Calcula márgenes directamente en la moneda elegida")}</h2>
  <p className="muted">{t("Este cálculo utiliza valores nativos en una sola moneda, no una tasa de cambio implícita. No mezcla importes de diferentes monedas ni calcula tributos oficiales automáticamente.")}</p>
  {notice&&<p role={locked?"alert":"status"}>{t(notice)}</p>}
  <div className="advanced-grid">
   <label className="field"><span>{t("Nombre del precio guardado")}</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label>
   <label className="field"><span>{t("Abrir precio guardado")}</span><select value={selectedId} onChange={e=>{const id=e.target.value;setSelectedId(id);const row=catalog.products.find(x=>x.id===id);if(row){setInput({...row.input});setName(row.name);}}}>
    <option value="">{t("Nueva simulación internacional")}</option>
    {catalog.products.map(row=><option key={row.id} value={row.id}>{row.name+" ("+row.input.currency+")"}</option>)}
   </select></label>
  </div>
  <div className="advanced-actions">
   <button className="primary" disabled={locked} onClick={saveProduct}>{t("Guardar precio internacional")}</button>
   <button className="secondary" onClick={()=>{setSelectedId("");setName("");setInput({...defaultInput});}}>{t("Nueva simulación internacional")}</button>
   <button className="secondary" onClick={()=>downloadGlobalCatalog(catalog)}>{t("Descargar respaldo internacional")}</button>
   {selectedId&&<button className="danger" disabled={locked} onClick={()=>setPendingDelete(selectedId)}>{t("Eliminar precio guardado")}</button>}
  </div>
  {pendingDelete&&<div className="advanced-results">
   <p role="alert">{t("Se eliminará este precio guardado del catálogo internacional, no tus productos COP.")}</p>
   <button className="danger" disabled={locked} onClick={()=>{const ok=commit({version:1,products:catalog.products.filter(row=>row.id!==pendingDelete)});if(ok){setPendingDelete("");setSelectedId("");}}}>{t("Confirmar eliminación")}</button>
   <button className="secondary" onClick={()=>setPendingDelete("")}>{t("Cancelar")}</button>
  </div>}
  {initial.raw&&locked&&<button className="secondary" onClick={()=>{const url=URL.createObjectURL(new Blob([initial.raw!],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="precify-global-raw-recovery.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}}>{t("Descargar datos originales dañados")}</button>}
  <label className="field"><span>{t("Restaurar respaldo de precios internacionales (JSON)")}</span><input type="file" accept=".json,application/json" onChange={e=>{void stageRestore(e.target.files?.[0]);}}/></label>
  {pendingRestore&&<div className="advanced-results">
   <p role="alert">{t("La restauración sustituirá el catálogo internacional, sin modificar los productos COP originales.")}</p>
   <button className="primary" disabled={locked} onClick={()=>{if(commit(pendingRestore)){setPendingRestore(null);setSelectedId("");}}}>{t("Confirmar restauración")}</button>
   <button className="secondary" onClick={()=>setPendingRestore(null)}>{t("Cancelar")}</button>
  </div>}
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
  {selectedId&&catalog.products.find(x=>x.id===selectedId)?.history?.length?<div className="advanced-results">
   <h3>{t("Historial de precios anteriores")}</h3>
   {catalog.products.find(x=>x.id===selectedId)?.history?.slice().reverse().map((entry,i)=><div className="list-row" key={i}>
    <span>{entry.currency+" "+entry.salePrice}</span><small>{new Date(entry.at).toLocaleString()}</small>
   </div>)}
  </div>:null}
  <p className="muted">{t("El precio sugerido conserva como denominador la venta neta del producto. Los impuestos son deducciones configurables, no asesoría fiscal.")}</p>
 </section>;
}
