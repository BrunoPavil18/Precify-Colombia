import { AdvancedLab } from "./AdvancedLab";
import { useEffect, useMemo, useRef, useState } from "react";
import {
 analyze, decodeBackup, defaultScenarios, EMPTY_INPUT, encodeBackup, exportProductsCsv,
 maxDiscountPercent, moneyDisplay, parseCOPInput, parseDecimal, basisAmount, fromCents, suggestPrice, validateInput,
 validateWorkspace, emptyWorkspace, STORE_KEY,
 type PriceInput, type PriceRounding, type Workspace, type Product, type SavedScenario
} from "@precify-colombia/core";
import { LocaleContext, readLocale, saveLocale, translate, useTranslator, type Locale } from "./i18n";
import { downloadFile, loadWorkspace, persistWorkspace } from "./storage";

type Page = "calculadora" | "productos" | "escenarios" | "metas" | "informes" | "datos" | "avanzado";
const nav: {id:Page;icon:string;label:string;description:string}[]=[
 {id:"calculadora",icon:"◈",label:"Calculadora",description:"Precio recomendado"},
 {id:"productos",icon:"▦",label:"Productos",description:"Catálogo local"},
 {id:"escenarios",icon:"◫",label:"Escenarios",description:"Riesgo y oportunidades"},
 {id:"metas",icon:"◎",label:"Metas",description:"Punto de equilibrio"},
 {id:"informes",icon:"▥",label:"Informes",description:"Comparar y exportar"},
 {id:"datos",icon:"◇",label:"Datos",description:"Privacidad y copias"},
 {id:"avanzado",icon:"◉",label:"Avanzado",description:"COD, campañas y PUM"},
];
type MoneyKey = "acquisition"|"packaging"|"shippingCost"|"shippingCharged"|
 "fixedFee"|"advertising"|"returnsReserve"|"codReserve"|"discountFixed"|"currentPrice"|"monthlyFixed";
type PercentKey = "feePercent"|"taxPercent"|"ivaPercent"|"codPercent"|"discountPercent"|"targetMargin";
type MoneySpec={key:MoneyKey;label:string;help:string};
type PercentSpec={key:PercentKey;label:string;help:string};
const costs:MoneySpec[]=[
 {key:"acquisition",label:"Costo de adquisición",help:"Costo unitario de compra o fabricación."},
 {key:"packaging",label:"Empaque",help:"Materiales y preparación de una venta."},
 {key:"shippingCost",label:"Costo de envío",help:"Valor realmente asumido por el comerciante."},
 {key:"shippingCharged",label:"Envío cobrado al cliente",help:"Ingreso adicional por flete; no integra la base de IVA de esta simulación."},
 {key:"fixedFee",label:"Comisión fija por venta",help:"Cargo monetario independiente del valor vendido."},
 {key:"advertising",label:"Publicidad por pedido",help:"Costo de adquisición de cliente estimado por venta."},
 {key:"returnsReserve",label:"Reserva por devoluciones",help:"Provisión unitaria editable, no cotización confirmada."},
 {key:"codReserve",label:"Reserva por no entrega (COD)",help:"Supuesto monetario por rechazos o pedidos fallidos."}
];
const rates:PercentSpec[]=[
 {key:"feePercent",label:"Comisión porcentual",help:"Porcentaje sobre el precio del producto después del descuento."},
 {key:"taxPercent",label:"Otra deducción sobre venta (%)",help:"Hipótesis comercial, no liquidación fiscal."},
 {key:"ivaPercent",label:"IVA incluido (%)",help:"Solo ilustrativo: se extrae del precio del producto. En cero si no corresponde."},
 {key:"codPercent",label:"Comisión COD estimada (%)",help:"No representa una tarifa publicada de una transportadora."}
];
const baseFmt=(s:string|null|undefined,locale:Locale="es-CO"):string=>{
 if(s===null || s===undefined)return translate(locale,"No calculable");
 return s.startsWith("-")?"−"+moneyDisplay(s.slice(1)):moneyDisplay(s);
};
const signedCents=(s:string)=>s.startsWith("-")?-parseDecimal(s.slice(1)):parseDecimal(s);
function sensitivity(input:PriceInput):string{
 try{
  const base=parseDecimal(input.acquisition);
  const changed={...input,acquisition:fromCents(base+basisAmount(base,1000n))};
  return baseFmt(fromCents(signedCents(analyze(input).contribution)-signedCents(analyze(changed).contribution)));
 }catch{return "No calculable";}
}
const localizedDate=(s:string,locale:Locale)=>new Date(s).toLocaleString(locale,{dateStyle:"medium",timeStyle:"short"});
const makeId=()=>globalThis.crypto?.randomUUID?.().replace(/-/g,"").slice(0,22)||
 ("r"+Date.now().toString(36)+Math.random().toString(36).slice(2));
const titleOf=(page:Page)=>nav.find(n=>n.id===page)?.label??"Calculadora";
function MoneyField({label,value,help,onCommit,onDirty}:{label:string;value:string;help:string;onCommit:(v:string)=>void;onDirty?:(dirty:boolean)=>void}){
 const t=useTranslator();
 const [text,setText]=useState(()=>baseFmt(value).replace(/^[$]\s*/,""));
 const [error,setError]=useState("");
 const [prior,setPrior]=useState(value);
 if(value!==prior){setPrior(value);setText(baseFmt(value).replace(/^[$]\s*/,""));setError("");}
 return <label className="field">
   <span>{t(label)} <span className="unit">COP</span></span>
   <input inputMode="decimal" type="text" autoComplete="off" value={text}
    aria-invalid={!!error} title={t(help)} onChange={e=>{setText(e.target.value);setError("");onDirty?.(true);}}
    onBlur={()=>{try{const v=parseCOPInput(text);onCommit(v);onDirty?.(false);setText(baseFmt(v).replace(/^[$]\s*/,""));}catch(e){setError(String(e instanceof Error?e.message:e));}}}/>
   <small>{t(error||help)}</small>
 </label>;
}
function PercentField({label,value,help,onCommit}:{label:string;value:string;help:string;onCommit:(s:string)=>void}){
 const t=useTranslator();
 return <label className="field"><span>{t(label)} <span className="unit">%</span></span>
   <input type="text" inputMode="decimal" value={value} title={t(help)} onChange={e=>onCommit(e.target.value)}/>
   <small>{t(help)}</small>
 </label>;
}
function Kpi({label,value,detail,attention=false}:{label:string;value:string;detail:string;attention?:boolean}){
 const t=useTranslator();
 return <div className={"kpi"+(attention?" alert":"")}><span>{t(label)}</span><strong>{value}</strong><small>{t(detail)}</small></div>;
}
function ProductEditor({value,onChange,onDirty}:{value:PriceInput;onChange:(next:PriceInput)=>void;onDirty:(key:string,dirty:boolean)=>void}){
 const t=useTranslator();
 const set=(key:keyof PriceInput,v:string)=>onChange({...value,[key]:v});
 return <div className="editor">
  <section className="form-section"><header><span className="eyebrow">{t("01 / Identificación")}</span><h3>{t("Datos del producto")}</h3></header>
   <div className="form-grid">
    <label className="field"><span>{t("Nombre del producto")}</span><input maxLength={120} value={value.name} onChange={e=>set("name",e.target.value)}/><small>{t("Identifica esta simulación en el catálogo.")}</small></label>
    <label className="field"><span>{t("Categoría")}</span><input maxLength={80} value={value.category} onChange={e=>set("category",e.target.value)}/><small>{t("Organización exclusivamente local.")}</small></label>
    <label className="field"><span>{t("Origen de los costos")}</span><select value={value.origin} onChange={e=>set("origin",e.target.value)}><option value="manual">{t("Ingresado manualmente")}</option><option value="estimado">{t("Estimación")}</option><option value="confirmado">{t("Confirmado por el usuario")}</option></select><small>{t("El estado «confirmado» no es una verificación externa.")}</small></label>
    <label className="field"><span>{t("Redondeo comercial")}</span><select value={value.rounding} onChange={e=>set("rounding",e.target.value as PriceRounding)}><option value="centavo">{t("Centavos exactos")}</option><option value="peso">{t("Peso superior")}</option><option value="50">{t("Múltiplos de $ 50")}</option><option value="100">{t("Múltiplos de $ 100")}</option><option value="500">{t("Múltiplos de $ 500")}</option><option value="1000">{t("Múltiplos de $ 1.000")}</option><option value="ending-900">{t("Terminar en 900")}</option><option value="ending-990">{t("Terminar en 990")}</option></select><small>{t("No sustituye reglas legales de cambio o efectivo.")}</small></label>
   </div>
  </section>
  <section className="form-section"><header><span className="eyebrow">{t("02 / Costos unitarios")}</span><h3>{t("¿Cuánto te cuesta vender?")}</h3></header>
   <div className="form-grid">{costs.map(f=><MoneyField key={f.key} label={f.label} help={f.help} value={value[f.key]} onDirty={flag=>onDirty(f.key,flag)} onCommit={v=>set(f.key,v)}/>)}</div>
  </section>
  <section className="form-section"><header><span className="eyebrow">{t("03 / Porcentajes")}</span><h3>{t("Comisiones y tributos configurables")}</h3></header>
   <div className="form-grid">{rates.map(f=><PercentField key={f.key} label={f.label} help={f.help} value={value[f.key]} onCommit={v=>set(f.key,v)}/>)}</div>
   <div className="info-line">{t("No se aplica automáticamente ninguna tasa de IVA. Comprueba categoría del producto, tratamiento del envío y obligaciones con un profesional colombiano.")}</div>
  </section>
  <section className="form-section"><header><span className="eyebrow">{t("04 / Objetivos y promociones")}</span><h3>{t("Precio, margen y descuentos")}</h3></header>
   <div className="form-grid">
    <MoneyField label="Precio de venta actual" help="Valor antes de cualquier promoción." value={value.currentPrice} onDirty={flag=>onDirty("currentPrice",flag)} onCommit={v=>set("currentPrice",v)}/>
    <PercentField label="Margen de contribución objetivo" help="Porcentaje de contribución frente a la venta neta del producto." value={value.targetMargin} onCommit={v=>set("targetMargin",v)}/>
    <PercentField label="Descuento porcentual" help="Porcentaje aplicado al precio del producto." value={value.discountPercent} onCommit={v=>set("discountPercent",v)}/>
    <MoneyField label="Descuento fijo adicional" help="Se suma al descuento porcentual." value={value.discountFixed} onDirty={flag=>onDirty("discountFixed",flag)} onCommit={v=>set("discountFixed",v)}/>
    <MoneyField label="Gastos fijos mensuales" help="Costo del negocio por mes; se usa solo en rentabilidad mensual." value={value.monthlyFixed} onDirty={flag=>onDirty("monthlyFixed",flag)} onCommit={v=>set("monthlyFixed",v)}/>
    <label className="field"><span>{t("Unidades vendidas por mes")}</span><input type="text" inputMode="numeric" value={value.monthlyUnits} onChange={e=>set("monthlyUnits",e.target.value)}/><small>{t("Volumen hipotético para la proyección.")}</small></label>
   </div>
  </section>
 </div>;
}
export default function App(){
 const initialized=useMemo(loadWorkspace,[]);
 const wasStored=useRef<boolean>(typeof localStorage!=="undefined"&&localStorage.getItem(STORE_KEY)!==null);
 const [workspace,setWorkspace]=useState<Workspace>(initialized.state);
 const [locked,setLocked]=useState(initialized.locked);
 useEffect(()=>{const onStorage=(event:StorageEvent)=>{if(event.key===STORE_KEY){setLocked(true);setNotice("Conflicto entre pestañas: cambios externos detectados. Recarga la página para continuar, después de exportar tus datos.");}};window.addEventListener("storage",onStorage);return()=>window.removeEventListener("storage",onStorage);},[]);
 const [notice,setNotice]=useState(initialized.error??"");
 const [dirtyMoney,setDirtyMoney]=useState<Set<string>>(()=>new Set());
 const markDirty=(key:string,dirty:boolean)=>setDirtyMoney(prev=>{const next=new Set(prev);if(dirty)next.add(key);else next.delete(key);return next;});
 const [page,setPage]=useState<Page>("calculadora");
 const [draft,setDraft]=useState<PriceInput>(()=>({...EMPTY_INPUT,name:translate(readLocale(),"Producto ejemplo")}));
 const [activeId,setActiveId]=useState<string|null>(null);
 const [scenarioId,setScenarioId]=useState<string|null>(null);
 const [scenarioProductId,setScenarioProductId]=useState("");
 const [goalProductId,setGoalProductId]=useState("");
 const [goalFixedOverride,setGoalFixedOverride]=useState<string|null>(null);
 const [goalUnitsOverride,setGoalUnitsOverride]=useState<string|null>(null);
 const [goalMoneyUnvalidated,setGoalMoneyUnvalidated]=useState(false);
 const [goalEditorRevision,setGoalEditorRevision]=useState(0);
 const [editorRevision,setEditorRevision]=useState(0);
 const [locale,setLocale]=useState<Locale>(readLocale);
 useEffect(()=>{document.documentElement.lang=locale;document.title="Precify Colombia — "+translate(locale,"Calculadora");},[locale]);
 const [showTips,setShowTips]=useState(true);
 const uploadRef=useRef<HTMLInputElement>(null);
 const t=(key:string)=>translate(locale,key);
 const fmt=(s:string|null|undefined)=>baseFmt(s,locale);
 const date=(s:string)=>localizedDate(s,locale);
 const scenarioProduct=workspace.products.find(p=>p.id===scenarioProductId)??workspace.products[0];
 const scenariosForProduct=workspace.scenarios.filter(s=>s.productId===scenarioProduct?.id);
 const selectedScenario=workspace.scenarios.find(s=>s.id===scenarioId);
 const savedProduct=workspace.products.find(p=>p.id===activeId);
 const persistedDraft=page==="escenarios"&&selectedScenario?selectedScenario.values:savedProduct?.input??{...EMPTY_INPUT,name:t("Producto ejemplo")};
 const hasUnsavedDraft=dirtyMoney.size>0||JSON.stringify(draft)!==JSON.stringify(persistedDraft);
 const goalProduct=workspace.products.find(p=>p.id===goalProductId)??workspace.products.find(p=>p.id===activeId)??workspace.products[0];
 const goalInput=useMemo(()=>goalProduct?{
  ...goalProduct.input,
  monthlyFixed:goalFixedOverride??goalProduct.input.monthlyFixed,
  monthlyUnits:goalUnitsOverride??goalProduct.input.monthlyUnits
 }:null,[goalProduct,goalFixedOverride,goalUnitsOverride]);
 const goalDirty=goalMoneyUnvalidated||!!goalProduct&&(
  (goalFixedOverride!==null&&goalFixedOverride!==goalProduct.input.monthlyFixed)||
  (goalUnitsOverride!==null&&goalUnitsOverride!==goalProduct.input.monthlyUnits)
 );
 const goalResult=useMemo(()=>{
  if(!goalInput)return {breakdown:null,error:null as string|null};
  try{return {breakdown:analyze(goalInput),error:null as string|null};}
  catch(e){return {breakdown:null,error:e instanceof Error?e.message:String(e)};}
 },[goalInput]);
 function resetGoalDraft(){
  setGoalFixedOverride(null);setGoalUnitsOverride(null);setGoalMoneyUnvalidated(false);
  setGoalEditorRevision(n=>n+1);
 }
 function selectGoalProduct(id:string){
  if(goalDirty&&!window.confirm(t("Hay cambios sin guardar en Metas. ¿Descartarlos para cambiar de producto?")))return;
  setGoalProductId(id);resetGoalDraft();
 }
 function saveGoalChanges(){
  if(!goalProduct||!goalInput)return;
  if(goalMoneyUnvalidated){setNotice("Hay campos COP sin validar. Revísalos antes de guardar.");return;}
  try{validateInput(goalInput);}catch(e){setNotice("Corrige los campos: "+String(e));return;}
  const now=new Date().toISOString();
  const ok=commit(w=>({
   ...w,
   products:w.products.map(p=>p.id!==goalProduct.id?p:{
    ...p,updatedAt:now,input:{...p.input,monthlyFixed:goalInput.monthlyFixed,monthlyUnits:goalInput.monthlyUnits}
   }),
   history:[...w.history,{
    id:makeId(),productId:goalProduct.id,at:now,action:"Actualización",
    snapshot:{...goalProduct.input,monthlyFixed:goalInput.monthlyFixed,monthlyUnits:goalInput.monthlyUnits}
   }].slice(-3000)
  }));
  if(ok){
   if(activeId===goalProduct.id&&JSON.stringify(draft)===JSON.stringify(goalProduct.input)){
    setDraft(d=>({...d,monthlyFixed:goalInput.monthlyFixed,monthlyUnits:goalInput.monthlyUnits}));
   }
   resetGoalDraft();setNotice("Proyección mensual guardada para el producto seleccionado.");
  }
 }
 function restoreSavedDraft(){
  setDraft({...persistedDraft});setDirtyMoney(new Set());setEditorRevision(n=>n+1);
  setNotice("Se descartaron los cambios sin guardar. La versión guardada permanece intacta.");
 }
 function navigate(target:Page){
  if(target!==page&&page==="escenarios"&&scenarioId){
   if(hasUnsavedDraft&&!window.confirm(t("El escenario tiene cambios sin guardar. ¿Salir y descartarlos?")))return;
   if(savedProduct)setDraft({...savedProduct.input});
   setScenarioId(null);setDirtyMoney(new Set());setEditorRevision(n=>n+1);
  }
  if(target!==page&&page==="metas"&&goalDirty){
   if(!window.confirm(t("Hay cambios sin guardar en Metas. ¿Salir sin guardarlos?")))return;
   resetGoalDraft();
  }
  if(target==="metas"&&target!==page){
   const selected=workspace.products.find(p=>p.id===goalProductId)??workspace.products.find(p=>p.id===activeId)??workspace.products[0];
   setGoalProductId(selected?.id??"");resetGoalDraft();
  }
  setPage(target);
 }
 function switchScenarioProduct(id:string){
  if(scenarioId&&hasUnsavedDraft&&!window.confirm(t("Hay cambios sin guardar en este escenario. ¿Descartarlos?")))return;
  setScenarioProductId(id);setScenarioId(null);setDirtyMoney(new Set());setEditorRevision(n=>n+1);
  const selected=workspace.products.find(p=>p.id===id);
  if(selected){setActiveId(selected.id);setDraft({...selected.input});}
 }
 function commit(change:(prior:Workspace)=>Workspace){
  if(locked){setNotice("Almacenamiento bloqueado por datos corruptos. Exporta los datos originales o restaura un respaldo válido.");return false;}
  try{
   const next=validateWorkspace({...change(workspace),updatedAt:new Date().toISOString()});
   persistWorkspace(next,wasStored.current?workspace.updatedAt:undefined);wasStored.current=true;setWorkspace(next);setNotice("Cambios guardados únicamente en este navegador.");return true;
  }catch(e){setNotice("No se pudieron guardar los cambios: "+(e instanceof Error?e.message:String(e)));return false;}
 }
 const result=useMemo(()=>{
  try{
   const input=validateInput(draft);
   const breakdown=analyze(input);
   const suggestion=suggestPrice(input);
   const limit=maxDiscountPercent(input);
   return {breakdown,suggestion,limit,error:null as string|null};
  }catch(e){return {breakdown:null,suggestion:null,limit:null,error:String(e instanceof Error?e.message:e)};}
 },[draft]);
 function saveProduct(){
  if(dirtyMoney.size){setNotice("Hay campos COP sin validar. Revísalos antes de guardar.");return;}
  try{validateInput(draft);}catch(e){setNotice("Corrige los campos: "+String(e));return;}
  const now=new Date().toISOString(),id=activeId??makeId();
  const exists=workspace.products.some(p=>p.id===id);
  const ok=commit(w=>{
   const p:Product={id,createdAt:w.products.find(p=>p.id===id)?.createdAt??now,updatedAt:now,input:{...draft}};
   return {...w,products:exists?w.products.map(row=>row.id===id?p:row):[...w.products,p],
    history:[...w.history,{id:makeId(),productId:id,at:now,action:exists?"Actualización":"Creación",snapshot:{...draft}}].slice(-3000)};
  });
  if(ok){setActiveId(id);setScenarioProductId(id);setScenarioId(null);setPage("productos");}
 }
 function openProduct(p:Product){setDirtyMoney(new Set());setDraft({...p.input});setActiveId(p.id);setScenarioId(null);setScenarioProductId(p.id);setGoalProductId(p.id);setEditorRevision(n=>n+1);setPage("calculadora");setNotice("Producto cargado: "+p.input.name);}
 function duplicateProduct(p:Product){setDirtyMoney(new Set());setDraft({...p.input,name:p.input.name+" (copia)"});setActiveId(null);setScenarioId(null);setEditorRevision(n=>n+1);setPage("calculadora");}
 function deleteProduct(p:Product){
  if(!window.confirm(t("¿Eliminar «")+p.input.name+t("» y sus escenarios? El historial de auditoría se conservará hasta borrarlo desde Datos.")))return;
  const ok=commit(w=>({...w,products:w.products.filter(x=>x.id!==p.id),scenarios:w.scenarios.filter(x=>x.productId!==p.id)}));
  if(ok && activeId===p.id){setActiveId(null);setDraft({...EMPTY_INPUT});}
 }
 function createScenarios(){
  if(scenarioId&&hasUnsavedDraft&&!window.confirm(t("¿Descartar los cambios no guardados antes de crear escenarios?")))return;
  const product=scenarioProduct;
  if(!product){setNotice("Guarda primero un producto para crear escenarios.");return;}
  const existing=workspace.scenarios.filter(s=>s.productId===product.id);
  const presets=defaultScenarios(product.input)
   .filter(template=>!existing.some(s=>s.title===template.name))
   .map(template=>({id:makeId(),productId:product.id,title:template.name,note:template.note,values:{...template.values}}));
  if(!presets.length){setNotice("Este producto ya tiene los tres escenarios. Selecciona uno para editarlo.");return;}
  if(commit(w=>({...w,scenarios:[...w.scenarios,...presets]}))){
   const first=presets.find(p=>p.title==="Esperado")??presets[0];
   if(first){setScenarioId(first.id);setActiveId(product.id);setScenarioProductId(product.id);
    setDraft({...first.values});setDirtyMoney(new Set());setEditorRevision(n=>n+1);}
   setPage("escenarios");
  }
 }
 function saveScenario(){
  if(dirtyMoney.size){setNotice("Hay campos COP sin validar. Revísalos antes de guardar.");return;}
  if(!scenarioId||!activeId){setNotice("Selecciona un escenario vinculado a un producto.");return;}
  try{validateInput(draft);}catch(e){setNotice("Escenario inválido: "+String(e));return;}
  if(commit(w=>({...w,scenarios:w.scenarios.map(s=>s.id===scenarioId?{...s,values:{...draft}}:s)})))setNotice("Escenario guardado sin modificar el producto original.");
 }
 function openScenario(s:SavedScenario){
  if(scenarioId!==s.id&&scenarioId&&hasUnsavedDraft&&!window.confirm(t("Hay cambios sin guardar. ¿Descartarlos y abrir otro escenario?")))return;
  setDirtyMoney(new Set());setScenarioId(s.id);setActiveId(s.productId);setScenarioProductId(s.productId);
  setDraft({...s.values});setEditorRevision(n=>n+1);setPage("escenarios");
 }
 function saveProfile(){
  if(dirtyMoney.size){setNotice("Hay campos COP sin validar. Revísalos antes de guardar.");return;}
  try{validateInput(draft);}catch(e){setNotice("Perfil inválido: "+String(e));return;}
  commit(w=>({...w,profiles:[...w.profiles,{id:makeId(),name:draft.name+" · configuración",values:{...draft}}]}));
 }
 function restoreProfile(id:string){
  const profile=workspace.profiles.find(p=>p.id===id);
  if(profile){setDraft(old=>({...profile.values,name:old.name,category:old.category,currentPrice:old.currentPrice}));setPage("calculadora");setNotice("Parámetros del perfil aplicados; guarda el producto para conservarlos.");}
 }
 async function importBackup(file:File|undefined){
  if(!file)return;
  if(file.size>2_000_000){setNotice("Archivo supera 2 MB. No se modificaron datos.");return;}
  try{
   const valid=decodeBackup(await file.text());
   if(!window.confirm(t("¿Reemplazar TODOS los productos, perfiles, escenarios e historial locales por este respaldo? Descarga antes una copia de los datos actuales.")))return;
   persistWorkspace(valid);setWorkspace(valid);setLocked(false);setActiveId(null);setScenarioId(null);setScenarioProductId("");setDraft({...EMPTY_INPUT});setDirtyMoney(new Set());setEditorRevision(n=>n+1);
   setNotice("Respaldo validado y restaurado. Se reemplazó el conjunto completo de datos.");setPage("productos");
  }catch(e){setNotice("Respaldo rechazado, sin modificaciones: "+String(e instanceof Error?e.message:e));}
  finally{if(uploadRef.current)uploadRef.current.value="";}
 }
 function reset(){
  if(!window.confirm(t("¿Borrar DEFINITIVAMENTE los datos de Precify Colombia almacenados en este navegador? Haz una copia de seguridad antes.")))return;
  try{localStorage.removeItem(STORE_KEY);setWorkspace(emptyWorkspace());setLocked(false);setActiveId(null);setScenarioId(null);setDraft({...EMPTY_INPUT});setDirtyMoney(new Set());setScenarioProductId("");setEditorRevision(n=>n+1);setNotice("Datos locales borrados.");}
  catch(e){setNotice("No se pudieron borrar los datos: "+String(e));}
 }
 function rawBackup(){
  const raw=localStorage.getItem(STORE_KEY);
  if(raw===null){setNotice("No existe almacenamiento original para descargar.");return;}
  downloadFile(raw,"precify-datos-locales-sin-validar.json","application/json");
 }
 const ranked=useMemo(()=>workspace.products.map(p=>{
  try{return {p,result:analyze(p.input),error:null as string|null};}
  catch(e){return {p,result:null,error:String(e)};}
 }).sort((a,b)=>{
  if(!a.result||!b.result)return 0;
  const aVal=signedCents(a.result.contribution),bVal=signedCents(b.result.contribution);
  return bVal>aVal?1:bVal<aVal?-1:0;
 }),[workspace.products]);
 return <LocaleContext.Provider value={locale}><div className="app-shell">
   <aside className="sidebar">
    <a className="brand" href="#" onClick={e=>{e.preventDefault();navigate("calculadora");}} aria-label={t("Precify Colombia, inicio")}>
     <span className="brand-mark" aria-hidden="true">P<span>₵</span></span><span><strong>precify<span className="brand-accent">.</span></strong><small>COLOMBIA</small></span>
    </a>
    <div className="nav-caption">{t("ESPACIO DE TRABAJO")}</div>
    <nav aria-label={t("Navegación principal")}>{nav.map(item=><button key={item.id} className={"nav-link"+(page===item.id?" selected":"")} aria-current={page===item.id?"page":undefined} onClick={()=>navigate(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{t(item.label)}<small>{t(item.description)}</small></span></button>)}</nav>
    <div className="sidebar-bottom"><span className="privacy-dot"></span><span>{t("Sin cuenta · 100% local")}</span><small>{t("Open source · Apache 2.0")}</small></div>
   </aside>
   <div className="content-column">
    <header className="topbar"><div className="breadcrumb">PRECIFY / <strong>{t(titleOf(page)).toUpperCase()}</strong></div><div className="topbar-right"><span className="currency-pill">COP <span aria-hidden="true">▾</span></span><label className="language-select">{t("Idioma")} <select aria-label={t("Idioma")} value={locale} onChange={e=>{const lang=e.target.value as Locale;if(!activeId&&["Producto ejemplo","Produto de exemplo","Sample product"].includes(draft.name))setDraft(d=>({...d,name:translate(lang,"Producto ejemplo")}));setLocale(lang);saveLocale(lang);}}><option value="es-CO">ES</option><option value="pt-BR">PT</option><option value="en">EN</option></select></label><span className="local-chip"><span aria-hidden="true">●</span> LOCAL</span></div></header>
    <main id="main-content">
     <div className="page-heading"><div><div className="eyebrow">{t("HERRAMIENTA FINANCIERA GRATUITA")} <span className="green-line"></span> {t("VERSIÓN 1.0.0")}</div><h1>{t(page==="calculadora"?"Precios que tienen sentido.":page==="productos"?"Tus productos. Tus números.":page==="escenarios"?"Prepárate para cada escenario.":page==="metas"?"Del objetivo al resultado.":page==="informes"?"Decisiones respaldadas por datos.":"Tus datos te pertenecen.")}</h1><p>{t(page==="calculadora"?"Calcula el precio correcto, protege tu margen y toma mejores decisiones para tu negocio.":page==="productos"?"Tu catálogo se guarda exclusivamente en este dispositivo.":page==="escenarios"?"Simula resultados antes de cambiar el precio de un producto.":page==="metas"?"Estima cuánto necesitas vender para cubrir gastos fijos.":page==="informes"?"Compara contribuciones reales y lleva tus reportes contigo.":"Sin cuentas, sin seguimiento y sin enviar tus cifras a ningún servidor.")}</p></div><div className="heading-symbol" aria-hidden="true">✳</div></div>
     {notice&&<div role="status" aria-live="polite" className={"notice"+(locked?" notice-danger":"")}><span>{t(notice)}</span><button aria-label={t("Cerrar aviso")} onClick={()=>setNotice("")}>×</button></div>}
     {locked&&<div className="critical"><strong>{t("Protección de datos activa")}</strong><p>{t("La información local existente está dañada o inaccesible. Se bloquea el guardado para no sobrescribirla silenciosamente.")}</p><button onClick={rawBackup}>{t("Descargar datos originales sin validar")}</button> <button className="ghost" onClick={()=>setPage("datos")}>{t("Opciones de recuperación")}</button></div>}
     {page==="calculadora"&&<>
      <div className="action-strip"><div><span className="eyebrow">{t("SIMULACIÓN ACTIVA")}</span><strong>{t(activeId?"Editando producto guardado":"Nuevo producto · borrador")}</strong></div><div className="actions"><button className="secondary" onClick={()=>{setDraft({...EMPTY_INPUT,name:t("Producto ejemplo")});setDirtyMoney(new Set());setActiveId(null);setScenarioId(null);setEditorRevision(n=>n+1);}}>{t("+ Nuevo")}</button>{(activeId||hasUnsavedDraft)&&<button className="secondary" disabled={!hasUnsavedDraft} onClick={restoreSavedDraft}>{t("Descartar cambios")}</button>}<button className="primary" onClick={saveProduct}>{t("Guardar producto")} <span aria-hidden="true">↗</span></button></div></div>
      <div className="two-column"><div><ProductEditor key={"product-"+activeId+"-"+editorRevision} value={draft} onChange={setDraft} onDirty={markDirty}/></div><div className="results-column"><div className="results-card"><div className="results-label"><span>{t("RESULTADOS EN TIEMPO REAL")}</span><span className="live-dot">●</span></div>{result.error?<div role="alert" className="error-box"><strong>{t("Revisa los datos")}</strong><p>{t(result.error)}</p></div>:result.breakdown&&result.suggestion&&<>
       <div className="suggested"><span>{t("PRECIO SUGERIDO")}</span><strong>{fmt(result.suggestion.price)}</strong><small>{t("Con margen meta del")} {draft.targetMargin}% {t("· después de descuentos y redondeo")}</small></div>
       <div className="kpi-grid"><Kpi label="Contribución actual" value={fmt(result.breakdown.contribution)} detail="Por venta, después de costos variables" attention={!result.breakdown.feasible}/><Kpi label="Margen de contribución" value={(result.breakdown.marginPercent??"N/D")+"%"} detail="Sobre venta neta del producto" attention={!result.breakdown.feasible}/><Kpi label="Ingresos cobrados" value={fmt(result.breakdown.collected)} detail="Producto neto + envío cobrado"/><Kpi label="Markup de contribución" value={(result.breakdown.markupPercent??"N/D")+"%"} detail="Contribución / costo variable"/><Kpi label="Deducciones + IVA" value={fmt(result.breakdown.deductions)} detail="Porcentajes configurados por el usuario"/></div>
       <div className="result-details"><div><span>{t("Descuento aplicado")}</span><strong>{fmt(result.breakdown.discount)}</strong></div><div><span>{t("Costos variables")}</span><strong>{fmt(result.breakdown.variableCost)}</strong></div><div><span>{t("IVA incluido ilustrativo")}</span><strong>{fmt(result.breakdown.ivaIncluded)}</strong></div><div><span>{t("Máximo descuento orientativo*")}</span><strong>{result.limit===null?t("No disponible"):result.limit+"%"}</strong></div></div>
       <div className="tip">{t("* Máximo descuento porcentual aislado, sin descuento fijo. Calculado para la meta de margen sobre este precio actual.")}</div>
       <div className="warning-list">{result.breakdown.warnings.map((w,i)=><p key={i}><span aria-hidden="true">!</span> {t(w)}</p>)}</div>
      </>}</div>
      <div className="aside-info"><div className="info-symbol">i</div><div><strong>{t("¿Cómo se calcula?")}</strong><p>{t("Trabajamos con centavos exactos. La contribución es lo cobrado menos costos variables, comisiones y supuestos tributarios. Los gastos fijos mensuales se restan después.")}</p><button className="linklike" onClick={()=>setShowTips(!showTips)} aria-expanded={showTips}>{t("Ver premisas")} {showTips?"−":"+"}</button>{showTips&&result.breakdown&&<ul>{result.breakdown.assumptions.map(assumption=><li key={assumption}>{t(assumption)}</li>)}</ul>}</div></div></div></div>
     </>}
     {page==="productos"&&<section className="main-card"><div className="section-head"><div><span className="eyebrow">{t("CATÁLOGO")}</span><h2>{workspace.products.length} {t(workspace.products.length===1?"producto guardado":"productos guardados")}</h2></div><button className="primary" onClick={()=>{setActiveId(null);setScenarioId(null);setDraft({...EMPTY_INPUT,name:t("Producto ejemplo")});setDirtyMoney(new Set());setPage("calculadora");}}>{t("+ Agregar producto")}</button></div>
      {workspace.products.length===0?<div className="empty-state"><div className="empty-icon">▦</div><h3>{t("Tu catálogo empieza aquí")}</h3><p>{t("Guarda tu primera simulación para crear productos comparables.")}</p></div>:<div className="product-grid">{workspace.products.map(p=><article className="product-card" key={p.id}><span className="product-category">{p.input.category||t("Sin categoría")}</span><h3>{p.input.name}</h3><p>{t(p.input.origin==="estimado"?"Estimación":p.input.origin==="confirmado"?"Declarado confirmado":"Ingreso manual")} · {date(p.updatedAt)}</p><strong>{fmt(p.input.currentPrice)}</strong><div className="card-actions"><button onClick={()=>openProduct(p)}>{t("Editar")}</button><button onClick={()=>{setScenarioProductId(p.id);setScenarioId(null);setActiveId(p.id);setDraft({...p.input});setDirtyMoney(new Set());setEditorRevision(n=>n+1);setPage("escenarios");}}>{t("Escenarios")}</button><button onClick={()=>duplicateProduct(p)}>{t("Duplicar")}</button><button className="danger-link" onClick={()=>deleteProduct(p)}>{t("Eliminar")}</button></div></article>)}</div>}
      <div className="section-head profiles-head"><div><span className="eyebrow">{t("PERFILES REUTILIZABLES")}</span><h2>{t("Plantillas de costos")}</h2></div><button className="secondary" onClick={saveProfile}>{t("Guardar configuración actual")}</button></div>
      {workspace.profiles.length===0?<p className="muted">{t("No hay perfiles todavía. Guarda una configuración para reutilizar tasas y costos.")}</p>:<div className="stack-list">{workspace.profiles.map(p=><div key={p.id} className="list-row"><span>{p.name}</span><div><button onClick={()=>restoreProfile(p.id)}>{t("Aplicar")}</button><button className="danger-link" onClick={()=>commit(w=>({...w,profiles:w.profiles.filter(x=>x.id!==p.id)}))}>{t("Eliminar")}</button></div></div>)}</div>}
     </section>}
     {page==="escenarios"&&<section className="main-card">
      <div className="section-head"><div><span className="eyebrow">{t("ANÁLISIS DE RIESGO")}</span><h2>{t("Compara posibles resultados")}</h2></div><button className="primary" disabled={!scenarioProduct} onClick={createScenarios}>{t("+ Crear escenarios faltantes")}</button></div>
      <div className="scenario-intro">
       <p><strong>{t("¿Qué es un escenario?")}</strong> {t("Es una versión alternativa de los costos y precios de un producto. Puedes probar un proveedor más barato (optimista), los valores actuales (esperado) o mayores gastos (conservador), sin cambiar el producto original.")}</p>
       <p>{t("Las tres versiones comienzan con los costos guardados de tu producto. Tú eliges qué cambiar. No se inventan costos o tasas.")}</p>
      </div>
      {scenarioProduct?<label className="scenario-selector"><span>{t("Producto que deseas analizar")}</span><select value={scenarioProduct.id} onChange={e=>switchScenarioProduct(e.target.value)}>{workspace.products.map(p=><option key={p.id} value={p.id}>{p.input.name} · {fmt(p.input.currentPrice)}</option>)}</select></label>:<div className="empty-state"><h3>{t("Primero guarda un producto")}</h3><p>{t("Los escenarios necesitan estar vinculados a un producto de tu catálogo.")}</p><button onClick={()=>navigate("calculadora")}>{t("Ir a la calculadora")}</button></div>}
      {scenarioProduct&&scenariosForProduct.length===0&&<div className="scenario-empty"><strong>{t("Este producto todavía no tiene escenarios.")}</strong><p>{t("Presiona «Crear escenarios faltantes» y ajusta cada simulación. El producto original conserva sus valores.")}</p></div>}
      {scenarioProduct&&scenariosForProduct.length>0&&<>
       <div className="scenario-grid">{scenariosForProduct.map(s=>{let contribution=t("No calculable"),recommended=t("No calculable"),margin="N/D";try{const r=analyze(s.values);contribution=fmt(r.contribution);margin=(r.marginPercent??"N/D")+"%";recommended=fmt(suggestPrice(s.values).price);}catch{}return <button className={"scenario-tile"+(s.id===scenarioId?" chosen":"")} key={s.id} aria-pressed={s.id===scenarioId} onClick={()=>openScenario(s)}><span>{t(s.title.replace(/ \(copia\)$/,""))+(s.title.endsWith(" (copia)")?t(" (copia)"):"")}</span><strong>{contribution}</strong><small>{t("Contribución por venta")}</small><small>{t("Margen:")} {margin} · {t("Precio objetivo:")} {recommended}</small><small>{t(s.note)}</small></button>;})}</div>
       {selectedScenario&&selectedScenario.productId===scenarioProduct.id?<div className="scenario-edit">
        <div className="section-head"><div><span className="eyebrow">{t("EDICIÓN INDEPENDIENTE")}</span><h3>{t(selectedScenario.title.replace(/ \(copia\)$/,""))+(selectedScenario.title.endsWith(" (copia)")?t(" (copia)"):"")} · {scenarioProduct.input.name}</h3><p className="muted">{t("Los cambios solo afectan a este escenario cuando presionas Guardar escenario.")}</p></div>
         <div className="actions">
          <button className="secondary" disabled={!hasUnsavedDraft} onClick={restoreSavedDraft}>{t("Descartar cambios")}</button>
          <button className="secondary" onClick={()=>{if(hasUnsavedDraft&&!window.confirm(t("¿Descartar los cambios no guardados antes de duplicar?")))return;commit(w=>({...w,scenarios:[...w.scenarios,{...selectedScenario,id:makeId(),title:selectedScenario.title+" (copia)"}]}));}}>{t("Duplicar")}</button>
          <button className="primary" onClick={saveScenario}>{t("Guardar escenario")}</button>
          <button className="danger-link" onClick={()=>{if(window.confirm(t("¿Eliminar este escenario?"))&&commit(w=>({...w,scenarios:w.scenarios.filter(s=>s.id!==scenarioId)}))){setScenarioId(null);setDraft({...scenarioProduct.input});setDirtyMoney(new Set());setEditorRevision(n=>n+1);}}}>{t("Eliminar")}</button>
         </div></div>
        <div className="scenario-preview" aria-live="polite">
         <span className="eyebrow">{t("VISTA PREVIA DE ESTE ESCENARIO · AÚN SIN GUARDAR")}</span>
         {result.error?<p role="alert">{t(result.error)}</p>:result.breakdown&&result.suggestion&&<div className="scenario-preview-stats">
          <div><small>{t("Contribución por venta")}</small><strong>{fmt(result.breakdown.contribution)}</strong></div>
          <div><small>{t("Margen de contribución")}</small><strong>{result.breakdown.marginPercent??"N/D"}%</strong></div>
          <div><small>{t("Precio recomendado")}</small><strong>{fmt(result.suggestion.price)}</strong></div>
         </div>}
        </div>
        <ProductEditor key={scenarioId+"-"+editorRevision} value={draft} onChange={setDraft} onDirty={markDirty}/>
       </div>:<p className="muted">{t("Selecciona una tarjeta para editarla, guardar y comparar resultados sin cambiar el producto original.")}</p>}
      </>}
     </section>}
     {page==="metas"&&<div className="two-column">
      <section className="main-card">
       <span className="eyebrow">{t("PROYECCIÓN MENSUAL")}</span><h2>{t("La meta de tu negocio")}</h2>
       <p className="muted">{t("Modifica gastos fijos y unidades para calcular cuándo la contribución cubre la operación.")}</p>
       {goalProduct&&goalInput?<>
        <label className="goal-product-selector"><span>{t("Producto que deseas analizar")}</span>
         <select value={goalProduct.id} onChange={e=>selectGoalProduct(e.target.value)}>
          {workspace.products.map(p=><option key={p.id} value={p.id}>{p.input.name} · {fmt(p.input.currentPrice)}</option>)}
         </select>
        </label>
        <p className="muted goal-help">{t("Las proyecciones utilizan los costos guardados del producto seleccionado. Cambiar de producto no modifica sus datos.")}</p>
        <div className="form-grid">
         <MoneyField key={"goal-fixed-"+goalProduct.id+"-"+goalEditorRevision}
          label="Gastos fijos al mes" value={goalInput.monthlyFixed}
          help="Arriendo, salarios y gastos mensuales."
          onDirty={setGoalMoneyUnvalidated}
          onCommit={v=>setGoalFixedOverride(v===goalProduct.input.monthlyFixed?null:v)}/>
         <label className="field"><span>{t("Unidades vendidas por mes")}</span>
          <input inputMode="numeric" value={goalInput.monthlyUnits}
           onChange={e=>setGoalUnitsOverride(e.target.value===goalProduct.input.monthlyUnits?null:e.target.value)}/>
          <small>{t("Volumen estimado, no ventas confirmadas.")}</small>
         </label>
        </div>
        <div className="actions goals-actions">
         <button className="secondary" disabled={!goalDirty} onClick={resetGoalDraft}>{t("Descartar cambios")}</button>
         <button className="primary" disabled={!goalDirty||goalMoneyUnvalidated||!!goalResult.error} onClick={saveGoalChanges}>{t("Guardar cambios en producto")}</button>
        </div>
        <p className="muted goal-help">{t("Solo se guardan los gastos fijos y las unidades mensuales del producto elegido. Los escenarios se mantienen independientes.")}</p>
       </>:<div className="empty-state"><h3>{t("Primero guarda un producto")}</h3>
        <p>{t("Guarda un producto en el catálogo antes de calcular metas.")}</p>
        <button onClick={()=>navigate("calculadora")}>{t("Ir a la calculadora")}</button></div>}
      </section>
      <aside className="results-card">
       <span className="eyebrow">{t("ESTIMACIÓN DE RENTABILIDAD")}</span>
       {!goalProduct?<p className="muted">{t("Selecciona un producto del catálogo para ver su punto de equilibrio.")}</p>
        :goalResult.error?<div className="error-box" role="alert">{t(goalResult.error)}</div>
        :goalResult.breakdown&&<>
         <div className="goal-number"><span>{t("PUNTO DE EQUILIBRIO")}</span>
          <strong>{goalResult.breakdown.breakEvenUnits??t("No calculable")}</strong>
          <small>{t("unidades mensuales")}</small></div>
         <div className="kpi-grid">
          <Kpi label="Contribución por unidad" value={fmt(goalResult.breakdown.contribution)} detail="Antes de gastos fijos"/>
          <Kpi label="Utilidad mensual estimada" value={fmt(goalResult.breakdown.monthlyNet)} detail="Al volumen indicado" attention={goalResult.breakdown.monthlyNet.startsWith("-")}/>
          <Kpi label="Margen neto mensual" value={(goalResult.breakdown.monthlyNetMargin??"N/D")+"%"} detail="Utilidad / ingreso mensual estimado"/>
         </div>
         <p className="muted">{t("Para varios productos utiliza la contribución promedio ponderada del mix real. No supone demanda estable.")}</p>
        </>}
      </aside>
     </div>}
     {page==="avanzado"&&<AdvancedLab workspace={workspace}/>}
     {page==="informes"&&<section className="main-card"><div className="section-head"><div><span className="eyebrow">{t("RENTABILIDAD")}</span><h2>{t("Ranking por contribución")}</h2></div><div className="actions"><button className="secondary" onClick={()=>{try{downloadFile(exportProductsCsv(workspace,{
 headers:["ID","Producto","Categoría","Origen","Precio actual (COP)","Contribución (COP)","Margen contribución (%)","Fecha actualización"].map(t),
 origin:{manual:t("Ingreso manual"),estimado:t("Estimación"),confirmado:t("Declarado confirmado")}
}),"precify-productos.csv","text/csv;charset=utf-8");}catch(e){setNotice(String(e));}}}>{t("Exportar CSV")}</button><button className="primary" onClick={()=>{try{downloadFile(encodeBackup(workspace),"precify-colombia-backup.json","application/json");}catch(e){setNotice(String(e));}}}>{t("Exportar JSON")}</button></div></div>
       {ranked.length===0?<div className="empty-state"><p>{t("Agrega productos para compararlos.")}</p></div>:<div className="table-scroll"><table><caption>{t("Productos ordenados por contribución unitaria")}</caption><thead><tr><th scope="col">{t("Producto")}</th><th scope="col">{t("Precio")}</th><th scope="col">{t("Contribución")}</th><th scope="col">{t("Margen")}</th><th scope="col">{t("Sensibilidad")}</th></tr></thead><tbody>{ranked.map(({p,result:r,error})=><tr key={p.id}><th scope="row">{p.input.name}<small>{t(p.input.origin==="manual"?"Ingreso manual":p.input.origin==="estimado"?"Estimación":"Declarado confirmado")}</small></th><td>{fmt(p.input.currentPrice)}</td><td className={r&&!r.feasible?"red":""}>{r?fmt(r.contribution):t(error??"")}</td><td>{r?r.marginPercent+"%":"N/D"}</td><td>{r?<span className="sensitivity-value">{sensitivity(p.input)} <small>{t("pérdida ante +10% costo de adquisición")}</small><progress max={100} value={Math.max(0,Math.min(100,Number(r.marginPercent??0)))} aria-label={t("Indicador de margen de")+" "+(r.marginPercent??"0")+" "+t("por ciento")}/></span>:"—"}</td></tr>)}</tbody></table></div>}
       <div className="section-head profiles-head"><div><span className="eyebrow">{t("TRAZABILIDAD LOCAL")}</span><h2>{t("Historial de cambios")} ({workspace.history.length})</h2></div></div><div className="stack-list history">{workspace.history.slice().reverse().slice(0,50).map(h=><div className="list-row" key={h.id}><span>{t(h.action)} · {h.snapshot.name}</span><small>{date(h.at)}</small></div>)}{workspace.history.length>50&&<p className="muted">{t("Se muestran los 50 eventos más recientes. El respaldo JSON incluye todo el historial guardado.")}</p>}</div>
     </section>}
     {page==="datos"&&<div className="two-column"><section className="main-card"><span className="eyebrow">{t("CONTROL DE DATOS")}</span><h2>{t("Tu información, tu control.")}</h2><p>{t("Los cálculos y datos se procesan en tu navegador. Sin cuentas, sin analíticas, sin servidores y sin comunicación obligatoria con servicios externos.")}</p><div className="data-actions"><button className="primary" onClick={()=>{try{downloadFile(encodeBackup(workspace),"precify-colombia-backup.json","application/json");}catch(e){setNotice(String(e));}}}>{t("Descargar copia de seguridad")}</button><button className="secondary" onClick={()=>uploadRef.current?.click()}>{t("Restaurar copia")}</button><input ref={uploadRef} type="file" accept=".json,application/json" className="sr-only" aria-label={t("Seleccionar respaldo JSON")} onChange={e=>{void importBackup(e.target.files?.[0]);}}/><button className="danger" onClick={reset}>{t("Borrar todos los datos")}</button></div><p className="muted">{t("La restauración valida versión, moneda, tamaño, identificadores y costos; sustituye el conjunto completo solo después de tu confirmación. Conserva copias de seguridad fuera del navegador.")}</p></section><aside className="results-card"><span className="eyebrow">{t("ESTADO DEL ESPACIO")}</span><div className="storage-stat"><strong>{workspace.products.length}</strong><span>{t("Productos locales")}</span></div><div className="storage-stat"><strong>{workspace.scenarios.length}</strong><span>{t("Escenarios")}</span></div><div className="storage-stat"><strong>{workspace.history.length}</strong><span>{t("Eventos históricos")}</span></div><p className="muted">{t("Formato de respaldo: precify-colombia-backup v1 · COP · es-CO · máximo 2 MB.")}</p>{locked&&<button onClick={rawBackup}>{t("Descargar datos locales originales")}</button>}</aside></div>}
     <footer className="footer"><p>{t("Resultados orientativos. Consulta a un contador para el tratamiento tributario.")} {t("Ninguna cifra de IVA, COD, tarifa logística o impuesto se presume aplicable por defecto.")}</p><p>{t("Precify Colombia 1.0.0 · Proyecto independiente · Apache-2.0 · COP / es-CO")}</p></footer>
    </main>
   </div>
 </div></LocaleContext.Provider>;
}
