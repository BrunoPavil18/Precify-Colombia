import {UnifiedCODLab} from "./UnifiedCODLab";
import {useEffect,useMemo,useRef,useState} from "react";
import {computeCODFunnel,importOrdersCSV,importCampaignsCSV,parseCSV,
 reconcileCampaigns,advertisingIndicators,simulateCPASensitivity,exportOperationsCSV,validateOrderEvent,validateAdCampaign,
 currencyCatalog,minorAmount,type Product,type OrderEvent,type AdCampaign,type OrderCSVMapping,type CPASensitivityInput} from "@precify-financy/core";
import {useTranslator} from "./i18n";

import {businessKey,getBusinessScope} from "./BusinessProfiles";
import {nativeWrite} from "./native-primary";
const KEY="precify-financy:operations:v1";
const storageKey=()=>businessKey(KEY,getBusinessScope());
type HistoryPrice={id:string;product:string;competitor:string;currency:string;price:string;observedAt:string;source:string};
type LocalOperations={version:1;events:OrderEvent[];campaigns:AdCampaign[];prices:HistoryPrice[]};
const empty=():LocalOperations=>({version:1,events:[],campaigns:[],prices:[]});
function validateLocalOps(candidate:unknown):LocalOperations{
 if(!candidate||typeof candidate!=="object")throw new Error("Respaldo operacional inválido.");
 const v=candidate as LocalOperations;
 if(v.version!==1||!Array.isArray(v.events)||!Array.isArray(v.campaigns)||!Array.isArray(v.prices)
  ||v.events.length>10000||v.campaigns.length>10000||v.prices.length>10000)
  throw new Error("Formato operacional inválido o demasiado grande.");
 v.events.forEach(validateOrderEvent);v.campaigns.forEach(validateAdCampaign);
 v.prices.forEach(p=>{
  if(typeof p.id!=="string"||!p.id||p.id.length>128||
    typeof p.product!=="string"||!p.product.trim()||p.product.length>200||
    typeof p.competitor!=="string"||!p.competitor.trim()||p.competitor.length>200||
    typeof p.source!=="string"||p.source.length>500||
    typeof p.observedAt!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(p.observedAt))
   throw new Error("Historial de precios inválido.");
  minorAmount(p.price,p.currency);
 });
 for(const group of [v.events,v.campaigns,v.prices]){
  const ids=group.map(x=>x.id);
  if(new Set(ids).size!==ids.length)throw new Error("IDs duplicados en respaldo.");
 }
 return v;
}
export function readOperations():{value:LocalOperations;error:string|null;raw:string|null}{
 try{
  const raw=localStorage.getItem(storageKey());
  if(!raw)return {value:empty(),error:null,raw:null};
  if(raw.length>2000000)throw new Error("El almacenamiento operacional supera el límite.");
  const value=validateLocalOps(JSON.parse(raw));
  return {value,error:null,raw};
 }catch(e){let raw:string|null=null;try{raw=localStorage.getItem(storageKey());}catch{/* Storage may itself be unavailable */}return {value:empty(),raw,error:e instanceof Error?e.message:String(e)};}
}
const requiredFields=["id","orderId","status","occurredAt"] as const;
const inputFields=["grossRevenue","productCost","shippingCost","reverseShippingCost","advertisingCost","otherCost","refundAmount","campaignId","currency"] as const;
const defaultCPA:CPASensitivityInput={currency:"COP",createdOrders:"100",shippedPercent:"100",
 deliveredPercentOfShipped:"70",paidPercentOfDelivered:"90",contributionPerPaid:"50000.00",
 failedDeliveryCost:"10000.00",reverseShippingPerUnpaid:"5000.00",
 otherFixedCosts:"0"};
function mergeRows<T extends {id:string}>(current:T[],incoming:T[]):T[]{
 const ids=new Map(current.map(x=>[x.id,x]));
 for(const x of incoming){
  const old=ids.get(x.id);
  if(old&&JSON.stringify(old)!==JSON.stringify(x))throw new Error("ID duplicado con contenido distinto: "+x.id);
  ids.set(x.id,x);
 }
 return [...ids.values()];
}
function exportText(content:string,filename:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
type OpsTab="unified"|"dashboard"|"import"|"matrix"|"prices";
export function OperationsLab({products,initialTab="unified"}:{products:Product[];initialTab?:OpsTab}){
 const t=useTranslator();
 const initial=useMemo(readOperations,[]);
 const [data,setData]=useState(initial.value);
 const baseline=useRef(initial.raw);
 const [locked,setLocked]=useState(!!initial.error);
 const [notice,setNotice]=useState(initial.error??"");
 const [tab,setTab]=useState<OpsTab>(initialTab);
 const [csv,setCSV]=useState(""),[headers,setHeaders]=useState<string[]>([]);
 const [mapping,setMapping]=useState<OrderCSVMapping>({});
 const [importMode,setImportMode]=useState<"orders"|"campaigns">("orders");
 const [pendingRestore,setPendingRestore]=useState<LocalOperations|null>(null);
 const [cpa,setCPA]=useState(defaultCPA);
 const [benchmark,setBenchmark]=useState({product:"",competitor:"",currency:"COP",price:"0",source:"",observedAt:new Date().toISOString().slice(0,10)});
 useEffect(()=>{
  const onChange=(e:StorageEvent)=>{if(e.key===KEY){setLocked(true);setNotice("Se detectaron cambios en otra pestaña. Exporta una copia y recarga antes de modificar.");}};
  window.addEventListener("storage",onChange);return()=>window.removeEventListener("storage",onChange);
 },[]);
 async function commit(next:LocalOperations):Promise<boolean>{
  if(locked)return false;
  try{
   if(localStorage.getItem(storageKey())!==baseline.current)throw new Error("Conflicto entre pestañas: recarga antes de editar.");
   const raw=JSON.stringify(next);
   if(raw.length>2000000)throw new Error("Almacenamiento local supera 2 MB. Exporta los datos antes de seguir.");
   await nativeWrite("operations",getBusinessScope(),raw,baseline.current);baseline.current=raw;setData(next);setNotice(t("Datos operativos guardados localmente."));return true;
  }catch(e){setLocked(true);setNotice(String(e));return false;}
 }
 async function readFile(file:File|undefined){
  if(!file)return;
  try{
   if(file.size>2000000)throw new Error("CSV máximo 2 MB.");
   const text=await file.text(),parsed=parseCSV(text);
   setCSV(text);setHeaders(parsed.headers);setMapping({});
   setNotice(t("Revisa el mapeo de columnas antes de importar."));
  }catch(e){setNotice(String(e));}
 }
 async function stageBackup(file:File|undefined){
  if(!file||locked)return;
  try{
   if(file.size>2000000)throw new Error("Respaldo operacional superior a 2 MB.");
   const candidate=validateLocalOps(JSON.parse(await file.text()));
   setPendingRestore(candidate);setNotice(t("Respaldo validado. Confirma la sustitución antes de continuar."));
  }catch(e){setPendingRestore(null);setNotice(String(e));}
 }
 function doImport(){
  try{
   if(!csv)throw new Error("Selecciona un archivo CSV.");
   if(importMode==="orders"){
    const imported=importOrdersCSV(csv,mapping);
    await commit({...data,events:mergeRows(data.events,imported)});
   }else{
    const imported=importCampaignsCSV(csv);
    await commit({...data,campaigns:mergeRows(data.campaigns,imported)});
   }
   setCSV("");setHeaders([]);
  }catch(e){setNotice(String(e));}
 }
 const funnels=useMemo(()=>{
  try{
   const currencyGroups=new Map<string,OrderEvent[]>();
   for(const ev of data.events)currencyGroups.set(ev.currency,[...(currencyGroups.get(ev.currency)??[]),ev]);
   return [...currencyGroups.entries()].map(([currency,events])=>({currency,result:computeCODFunnel(events)}));
  }catch(e){return [{currency:"?",error:String(e)}];}
 },[data.events]);
 const reconciled=useMemo(()=>{
  try{return data.campaigns.flatMap(c=>reconcileCampaigns(data.events.filter(e=>e.currency===c.currency),[c]));}
  catch{return [];}
 },[data.events,data.campaigns]);
 const marketing=useMemo(()=>{try{return data.campaigns.map(advertisingIndicators);}catch{return []; }},[data.campaigns]);
 const paidByDay=useMemo(()=>{
  const totals=new Map<string,number>(),seen=new Set<string>();
  for(const ev of data.events)if(ev.status==="paid"){
   const day=ev.occurredAt.slice(0,10),key=day+":"+ev.orderId;
   if(seen.has(key))continue;seen.add(key);totals.set(day,(totals.get(day)??0)+1);
  }
  return [...totals.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
 },[data.events]);
 const matrix=useMemo(()=>{
  try{return {values:simulateCPASensitivity(cpa,["30","40","50","60","70","80","90","100"],["10000","20000","30000","40000"])};}
  catch(e){return {error:String(e)};}
 },[cpa]);
 async function addBenchmark(){
  try{
   if(!benchmark.product.trim()||!benchmark.competitor.trim())throw new Error("Producto y competidor obligatorios.");
   minorAmount(benchmark.price,benchmark.currency);
   const item:HistoryPrice={...benchmark,id:crypto.randomUUID()};
   commit({...data,prices:[...data.prices,item]});
  }catch(e){setNotice(String(e));}
 }
 const tabs=[["unified","Precificación COD integrada"],["dashboard","Panel COD"],["import","Importar CSV"],["matrix","Matriz CPA"],["prices","Precios de competidores"]] as const;
 return <section className="main-card operations-lab">
  <span className="eyebrow">{t("INTELIGENCIA OPERACIONAL")}</span>
  <h2>{t("Pedidos, publicidad y rentabilidad explicable")}</h2>
  <p className="muted">{t("Los datos importados son observaciones de sus fuentes, no ventas verificadas por Precify. El modo local no sincroniza automáticamente con otros dispositivos.")}</p>
  <div className="advanced-tabs" role="group" aria-label={t("Módulo operacional")}>
   {tabs.map(([id,title])=><button key={id} className={tab===id?"primary":"secondary"} aria-pressed={tab===id} onClick={()=>setTab(id)}>{t(title)}</button>)}
  </div>
  {notice&&<p role="status" className="muted">{t(notice)}</p>}
  {locked&&<p role="alert">{t("Edición local bloqueada para evitar sobrescrituras; exporta tus datos y recarga.")}</p>}
  {tab==="unified"&&<UnifiedCODLab products={products}/>}
  {tab==="dashboard"&&<div className="advanced-results">
   <h3>{t("Funil de pedidos observados")}</h3>
   {funnels.length===0?<p>{t("Todavía no hay pedidos importados.")}</p>:funnels.map(x=>
    <section key={x.currency} className="main-card">
     <h3>{x.currency}</h3>
     {"error" in x?<p role="alert">{x.error}</p>:<dl>
      {([["created","Pedidos creados"],["shipped","Pedidos enviados"],["delivered","Entregados"],["paid","Pedidos pagados"],["cancelled","Cancelados"],["deliveryFailed","Entrega fallida"],["returned","Devueltos"],["refunded","Reembolsados"],["netCollected","Ingresos pagados netos"],["incurredCosts","Costos incurridos"],["projectedNet","Resultado operacional simplificado"]] as const).map(([key,label])=><div key={key}><dt>{t(label)}</dt><dd>{String(x.result[key])}{typeof x.result[key]==="string"&&["netCollected","incurredCosts","projectedNet"].includes(key)?" "+x.currency:""}</dd></div>)}
     </dl>}
    </section>)}
   <h3>{t("Evolución de pagos registrados por día")}</h3>
   {paidByDay.length===0?<p className="muted">{t("Todavía no hay eventos de pago.")}</p>:<div className="operations-trend" role="img" aria-label={t("Pagos registrados por día")}>
    {paidByDay.map(([day,count])=><div className="list-row" key={day}><span>{day}</span>
     <div style={{flex:1,background:"var(--surface-muted, #e1ebe7)",borderRadius:6,height:14,overflow:"hidden"}}><div style={{width:(100*count/Math.max(...paidByDay.map(x=>x[1]),1))+"%",height:"100%",background:"#178669"}}/></div><strong>{count}</strong></div>)}
   </div>}
   <h3>{t("Métricas atribuidas de campañas")}</h3>
   {marketing.length===0?<p className="muted">{t("Todavía no hay métricas publicitarias importadas.")}</p>:
    <div className="table-scroll"><table><thead><tr><th>{t("Campaña")}</th><th>CTR</th><th>CPC</th><th>CPM</th><th>ROAS</th></tr></thead><tbody>
    {marketing.map(m=><tr key={m.id}><th>{m.id}</th><td>{m.ctrPercent??"—"}%</td><td>{m.cpc??"—"} {m.currency}</td><td>{m.cpm??"—"} {m.currency}</td><td>{m.attributedRoas??"—"}×</td></tr>)}
    </tbody></table></div>}
   <h3>{t("Confrontación entre atribución publicitaria y pedidos pagados")}</h3>
   {reconciled.length===0?<p>{t("Importa anuncios y pedidos con un ID de campaña explícito para conciliar.")}</p>:reconciled.map(c=><div className="list-row" key={c.campaignId}><span>{c.campaignId} · {t("Pedidos pagos")} {c.paidOrders} · {t("Ingresos reales conciliados")} {c.currency+" "+c.observedNetRevenue}</span><small>{t("Diferencia frente a la atribución")} {c.currency+" "+c.discrepancy}</small></div>)}
  </div>}
  {tab==="import"&&<div className="advanced-results">
   <label className="field"><span>{t("Tipo de archivo")}</span><select value={importMode} onChange={e=>{setImportMode(e.target.value as typeof importMode);setCSV("");setHeaders([]);}}><option value="orders">{t("Eventos de pedidos")}</option><option value="campaigns">{t("Campañas publicitarias")}</option></select></label>
   <label className="field"><span>{t("Archivo CSV (hasta 2 MB)")}</span><input type="file" accept=".csv,text/csv" onChange={e=>{void readFile(e.target.files?.[0]);}}/></label>
   {csv&&<>
    <p className="muted">{t("Filas detectadas")}: {parseCSV(csv).rows.length}</p>
    {importMode==="orders"&&<div className="advanced-grid">
     {[...requiredFields,...inputFields].map(field=><label className="field" key={field}><span>{field}</span><select value={mapping[field]??field} onChange={e=>setMapping(old=>({...old,[field]:e.target.value}))}>
      <option value={field}>{headers.includes(field)?field:t("Columna no encontrada")}</option>
      {headers.filter(h=>h!==field).map(h=><option key={h} value={h}>{h}</option>)}
     </select></label>)}
    </div>}
    <button className="primary" disabled={locked} onClick={doImport}>{t("Confirmar importación validada")}</button>
   </>}
   <div className="advanced-actions">
    <button className="secondary" onClick={()=>exportText(exportOperationsCSV(data.events),"precify-cod-orders.csv","text/csv;charset=utf-8")}>{t("Exportar pedidos CSV")}</button>
    <button className="secondary" onClick={()=>exportText(JSON.stringify(data,null,2),"precify-operations-backup.json","application/json")}>{t("Descargar respaldo operacional")}</button>
    {locked&&initial.raw&&<button className="secondary" onClick={()=>exportText(initial.raw!,"precify-operations-raw-recovery.json","application/json")}>{t("Descargar datos originales dañados")}</button>}
   </div>
   <label className="field"><span>{t("Restaurar respaldo operacional JSON (hasta 2 MB)")}</span>
    <input type="file" accept=".json,application/json" onChange={e=>{void stageBackup(e.target.files?.[0]);}}/></label>
   {pendingRestore&&<div className="advanced-results">
    <p role="alert">{t("La restauración sustituirá todos los registros operativos locales actuales, no los productos originales.")}</p>
    <button className="primary" disabled={locked} onClick={()=>{void (async()=>{if(await commit(pendingRestore))setPendingRestore(null);})();}}>{t("Confirmar restauración")}</button>
    <button className="secondary" onClick={()=>setPendingRestore(null)}>{t("Cancelar")}</button>
   </div>}
  </div>}
  {tab==="matrix"&&<div className="advanced-results">
   <h3>{t("Matriz: CPA frente a entregas y pagos")}</h3>
   <div className="advanced-grid">{(Object.keys(cpa) as Array<keyof CPASensitivityInput>).map(k=><label key={k} className="field"><span>{t(k)}</span>{k==="currency"?<select value={cpa.currency??"COP"} onChange={e=>setCPA(prev=>({...prev,currency:e.target.value}))}>{currencyCatalog().map(code=><option key={code} value={code}>{code}</option>)}</select>:<input type="text" inputMode="decimal" value={cpa[k]??""} onChange={e=>setCPA(prev=>({...prev,[k]:e.target.value}))}/>}</label>)}</div>
   {"values" in matrix&&matrix.values?<div className="table-scroll"><table><thead><tr><th>{t("Entregados (%) / CPA")}</th>{matrix.values[0]?.results.map(c=><th key={c.cpa}>{c.cpa}</th>)}</tr></thead><tbody>
   {matrix.values.map(row=><tr key={row.deliveryPercent}><th>{row.deliveryPercent+"%"}</th>{row.results.map(cell=><td key={cell.cpa} className={cell.feasible?"":"red"}>{cell.profit}</td>)}</tr>)}
   </tbody></table></div>:<p role="alert">{matrix.error}</p>}
   <p className="muted">{t("Modelo de escenarios con tasas condicionales. No sustituye una contabilidad de pedidos reales.")}</p>
  </div>}
  {tab==="prices"&&<div className="advanced-results">
   <h3>{t("Referencias de precios de la competencia")}</h3>
   <div className="advanced-grid">{(["product","competitor","currency","price","source","observedAt"] as const).map(k=><label className="field" key={k}><span>{t(k)}</span><input value={benchmark[k]} onChange={e=>setBenchmark(prev=>({...prev,[k]:e.target.value}))}/></label>)}</div>
   <button className="primary" disabled={locked} onClick={addBenchmark}>{t("Guardar referencia")}</button>
   {data.prices.slice().reverse().map(p=><div className="list-row" key={p.id}><span>{p.product} · {p.competitor}</span><small>{p.currency+" "+p.price} · {p.observedAt} · {p.source}</small></div>)}
   <p className="muted">{t("Precios declarados manualmente con fecha y fuente; no se realizan extracciones automáticas de sitios externos.")}</p>
  </div>}
 </section>;
}
