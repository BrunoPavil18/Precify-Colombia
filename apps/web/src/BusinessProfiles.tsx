import React,{createContext,useContext,useEffect,useMemo,useState} from "react";
import {STORE_KEY,MAX_BACKUP_BYTES,emptyWorkspace,validateWorkspace,type Workspace} from "@precify-colombia/core";
import {UIIcon} from "./UIIcon";
import {useTranslator} from "./i18n";
import {initializeNativeSnapshots} from "./desktop-snapshots";

/**
 * Business-scoped workspaces. The original "default" business uses the exact
 * historical localStorage keys: existing data is neither copied nor overwritten.
 * No cross-business identifiers or records are merged implicitly.
 */
const DIRECTORY="precify-colombia:business-directory:v1";
const ACTIVE="precify-colombia:active-business:v1";
export const MAIN_BUSINESS="default";
export const ALL_BUSINESSES="all";
export type Business={id:string;name:string;website:string;createdAt:string};
export type BusinessDirectory={version:1;businesses:Business[]};
const newId=()=>"b_"+crypto.randomUUID().replace(/-/g,"");
let currentScope=MAIN_BUSINESS;
export function setBusinessScope(id:string){currentScope=id===ALL_BUSINESSES?MAIN_BUSINESS:id;}
export const getBusinessScope=()=>currentScope;
const initial=():BusinessDirectory=>({version:1,businesses:[{id:MAIN_BUSINESS,name:"Negocio principal",website:"",createdAt:new Date().toISOString()}]});
export function businessKey(base:string,id:string):string{
 if(id===MAIN_BUSINESS)return base;
 if(!/^b_[a-f0-9]{32}$/.test(id))throw Error("Invalid business identifier");
 return base+":business:"+id;
}
export function validateBusinessDirectory(raw:unknown):BusinessDirectory{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Invalid directory");
 const d=raw as BusinessDirectory;
 if(d.version!==1||!Array.isArray(d.businesses)||d.businesses.length<1||d.businesses.length>40)throw Error("Invalid business directory version/size");
 const ids=new Set<string>();
 for(const b of d.businesses){
  if(!b||typeof b!=="object"||typeof b.id!=="string"||ids.has(b.id)||!(b.id===MAIN_BUSINESS||/^b_[a-f0-9]{32}$/.test(b.id)))throw Error("Invalid business ID");
  ids.add(b.id);
  if(typeof b.name!=="string"||!b.name.trim()||b.name.length>80||/[\u0000-\u001f\u007f]/.test(b.name))throw Error("Invalid business name");
  if(typeof b.website!=="string"||b.website.length>240||(/[\u0000-\u001f\u007f]/.test(b.website)))throw Error("Invalid website");
  if(b.website&&(!/^https:\/\//.test(b.website)||!/^https:\/\/[^/]+\.[^/]+/.test(b.website)))throw Error("Use HTTPS store URL");
  if(typeof b.createdAt!=="string"||!Number.isFinite(Date.parse(b.createdAt)))throw Error("Invalid date");
 }
 if(!ids.has(MAIN_BUSINESS))throw Error("Missing historical default business");
 return d;
}
function readDirectory():{data:BusinessDirectory;error:string|null}{
 try{
  const raw=localStorage.getItem(DIRECTORY);
  if(raw===null)return {data:initial(),error:null};
  if(raw.length>22000)throw Error("Directory exceeds maximum size");
  return {data:validateBusinessDirectory(JSON.parse(raw)),error:null};
 }catch(e){return {data:initial(),error:"Directorio de negocios dañado: "+String(e)+". No se sobrescribirá."};}
}
export function loadBusinessWorkspace(id:string):{state:Workspace;error:string|null;locked:boolean}{
 try{
  const raw=localStorage.getItem(businessKey(STORE_KEY,id));
  if(raw===null)return {state:emptyWorkspace(),error:null,locked:false};
  if(new TextEncoder().encode(raw).length>MAX_BACKUP_BYTES)throw Error("Workspace exceeds 2MB");
  return {state:validateWorkspace(JSON.parse(raw)),error:null,locked:false};
 }catch(e){return{state:emptyWorkspace(),locked:true,error:String(e)};}
}
type Context={
 directory:BusinessDirectory;selectedId:string;current:Business|null;error:string|null;
 choose:(id:string)=>void;create:(name:string,website:string)=>string;
 rename:(id:string,name:string,website:string)=>void;
};
const ProfileContext=createContext<Context|null>(null);
export const useBusinesses=()=>{const ctx=useContext(ProfileContext);if(!ctx)throw Error("Business provider is missing");return ctx;};
export function BusinessProvider({children}:{children:(key:string)=>React.ReactNode}){
 const reading=useMemo(readDirectory,[]);
 const [directory,setDirectory]=useState<BusinessDirectory>(reading.data);
 const [error,setError]=useState<string|null>(reading.error);
 const [selectedId,setSelectedId]=useState(()=>{
  const wanted=localStorage.getItem(ACTIVE);
  return wanted===ALL_BUSINESSES||reading.data.businesses.some(b=>b.id===wanted)?wanted!:MAIN_BUSINESS;
 });
 function choose(id:string){
  if(id!==ALL_BUSINESSES&&!directory.businesses.some(b=>b.id===id))throw Error("Business not found");
  localStorage.setItem(ACTIVE,id);setSelectedId(id);
 }
 function update(next:BusinessDirectory){
  if(error)throw Error(error);
  const valid=validateBusinessDirectory(next);
  localStorage.setItem(DIRECTORY,JSON.stringify(valid));setDirectory(valid);
 }
 function create(name:string,website:string){
  if(directory.businesses.length>=40)throw Error("Too many businesses");
  const id=newId();
  update({version:1,businesses:[...directory.businesses,{id,name:name.trim(),website:website.trim(),createdAt:new Date().toISOString()}]});
  localStorage.setItem(ACTIVE,id);setSelectedId(id);return id;
 }
 function rename(id:string,name:string,website:string){
  const valid=directory.businesses.some(b=>b.id===id);
  if(!valid)throw Error("Business not found");
  update({version:1,businesses:directory.businesses.map(b=>b.id===id?{...b,name:name.trim(),website:website.trim()}:b)});
 }
 const current=directory.businesses.find(b=>b.id===selectedId)??null;
 const ctx={directory,selectedId,current,error,choose,create,rename};
 setBusinessScope(selectedId);
 useEffect(()=>{void initializeNativeSnapshots().catch(e=>console.warn("Native SQLite bootstrap:",e));},[selectedId]);
 useEffect(()=>{
  if(error)return;
  const listener=(e:StorageEvent)=>{
   if(e.key===DIRECTORY){setError("Los perfiles se modificaron en otra ventana. Recarga antes de editar.");}
  };window.addEventListener("storage",listener);
  return()=>window.removeEventListener("storage",listener);
 },[error]);
 return <ProfileContext.Provider value={ctx}>{children(selectedId)}</ProfileContext.Provider>;
}

/** Cross-business overview never guesses monetary totals from product simulation. */
export function BusinessPortfolio({onOpen}:{onOpen:()=>void}){
 const t=useTranslator();
 const {directory,choose}=useBusinesses();
 const overview=directory.businesses.map(b=>({business:b,workspace:loadBusinessWorkspace(b.id)}));
 const products=overview.reduce((n,b)=>n+(b.workspace.locked?0:b.workspace.state.products.length),0);
 const scenarios=overview.reduce((n,b)=>n+(b.workspace.locked?0:b.workspace.state.scenarios.length),0);
 return <section className="business-portfolio">
   <div className="section-head"><div><span className="eyebrow">{t("VISIÓN MULTINEGOCIO · DATOS LOCALES")}</span><h2>{t("Todos los negocios")}</h2><p className="muted">{t("Resumen de catálogos y simulaciones. No representa ventas o utilidad observadas.")}</p></div></div>
   <div className="overview-stats">
    <div className="overview-stat"><span>{t("Negocios")}</span><strong>{overview.length}</strong><small>{t("Perfiles independientes")}</small></div>
    <div className="overview-stat"><span>{t("Productos")}</span><strong>{products}</strong><small>{t("En todos los catálogos COP")}</small></div>
    <div className="overview-stat"><span>{t("Escenarios")}</span><strong>{scenarios}</strong><small>{t("Simulaciones declaradas")}</small></div>
    <div className="overview-stat"><span>{t("Ganancias verificadas")}</span><strong>—</strong><small>{t("Sin registros financieros conciliados")}</small></div>
   </div>
   <div className="business-card-grid">
    {overview.map(({business,workspace})=><button key={business.id} className="business-card" onClick={()=>{choose(business.id);onOpen();}}>
     <UIIcon name="products" size={22}/><strong>{business.name}</strong><small>{business.website||t("Sin sitio web asociado")}</small>
     {workspace.locked?<span className="red">{t("Datos dañados · no sobrescritos")}</span>:<span>{workspace.state.products.length} {t("productos")} · {workspace.state.scenarios.length} {t("escenarios")}</span>}
     <span className="business-open">{t("Abrir negocio")} →</span>
    </button>)}
   </div>
   <p className="muted">{t("No se suman valores monetarios de diferentes monedas ni se presentan márgenes simulados como ganancias reales.")}</p>
  </section>;
}
export function BusinessChooser({onChange}:{onChange:(id:string)=>void}){
 const t=useTranslator();
 const {directory,selectedId,choose,error,create,rename,current}=useBusinesses();
 const [editing,setEditing]=useState(false);
 const [name,setName]=useState("");const [website,setWebsite]=useState("");
 const [message,setMessage]=useState("");
 const [renameMode,setRenameMode]=useState(false);
 function change(id:string){choose(id);onChange(id);setEditing(false);setRenameMode(false);}
 function submit(){
  try{
   if(renameMode){if(!current)throw Error("Select a business");rename(current.id,name,website);}
   else {const id=create(name,website);onChange(id);}
   setName("");setWebsite("");setMessage("");setEditing(false);setRenameMode(false);
  }catch(e){setMessage(e instanceof Error?e.message:String(e));}
 }
 return <div className="business-switcher">
  <label htmlFor="business-select" className="business-label">{t("NEGOCIO")}</label>
  <select id="business-select" value={selectedId} onChange={e=>change(e.target.value)}>
   <option value={ALL_BUSINESSES}>{t("Todos los negocios")}</option>
   {directory.businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
  </select>
  <button className="business-add" title={t("Agregar negocio")} aria-label={t("Agregar negocio")} onClick={()=>{setEditing(v=>!v);setRenameMode(false);setName("");setWebsite("");setMessage("");}}><UIIcon name="more" size={17}/></button>
  {selectedId!==ALL_BUSINESSES&&<button className="business-edit" title={t("Editar nombre y sitio")} aria-label={t("Editar negocio")} onClick={()=>{setEditing(true);setRenameMode(true);setName(current?.name??"");setWebsite(current?.website??"");setMessage("");}}><UIIcon name="settings" size={16}/></button>}
  {editing&&<div className="business-editor" role="dialog" aria-label={t(renameMode?"Editar negocio":"Crear negocio")}>
    <h3>{t(renameMode?"Editar negocio":"Nuevo negocio")}</h3>
    <label>{t("Nombre")}<input maxLength={80} autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder={t("Mi tienda")}/></label>
    <label>{t("Sitio HTTPS (opcional)")}<input maxLength={240} value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://tienda.example"/></label>
    {message&&<p role="alert" className="red">{message}</p>}
    {error&&<p role="alert" className="red">{error}</p>}
    <div className="actions"><button className="secondary" onClick={()=>setEditing(false)}>{t("Cancelar")}</button><button className="primary" disabled={!!error||!name.trim()} onClick={submit}>{t(renameMode?"Guardar cambios":"Crear perfil")}</button></div>
   </div>}
 </div>;
}
