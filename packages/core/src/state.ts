import { FinancialInputError, parseDecimal } from "./money.js";
import { analyze, validateInput, type PriceInput } from "./pricing.js";
export const STORE_KEY = "precify-colombia:workspace:v1";
export const MAX_BACKUP_BYTES = 2_000_000;
export type RecordOrigin = "manual" | "estimado" | "confirmado";
export type Product = { id: string; createdAt: string; updatedAt: string; input: PriceInput };
export type SavedScenario = { id: string; productId: string; title: string; note: string; values: PriceInput };
export type SavedProfile = { id: string; name: string; values: PriceInput };
export type HistoryEntry = { id: string; productId: string; at: string; action: string; snapshot: PriceInput };
export type Workspace = {
 schemaVersion: 1; updatedAt: string; products: Product[];
 scenarios: SavedScenario[]; profiles: SavedProfile[]; history: HistoryEntry[];
};
export const emptyWorkspace = (): Workspace => ({
 schemaVersion:1,updatedAt:new Date().toISOString(),products:[],scenarios:[],profiles:[],history:[]
});
function obj(v:unknown,context:string):Record<string,unknown> {
 if(!v || typeof v!=="object" || Array.isArray(v)) throw new FinancialInputError(context+": objeto inválido.");
 return v as Record<string,unknown>;
}
function safeText(v:unknown,label:string,max=160):string {
 if(typeof v!=="string" || v.length>max || /[\u0000-\u001F\u007F]/.test(v))
  throw new FinancialInputError(label+": texto inválido.");
 return v;
}
function safeDate(v:unknown,label:string):string {
 const s=safeText(v,label,40);
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s) || Number.isNaN(Date.parse(s)))
  throw new FinancialInputError(label+": fecha inválida.");
 return s;
}
function id(v:unknown):string {
 const s=safeText(v,"Identificador",90);
 if(!/^[a-zA-Z0-9_-]{1,90}$/.test(s)) throw new FinancialInputError("Identificador inválido.");
 return s;
}
function assertArray(v:unknown,name:string,limit:number):unknown[] {
 if(!Array.isArray(v) || v.length>limit) throw new FinancialInputError(name+": lista inválida o excesiva.");
 return v;
}
export function validateWorkspace(value:unknown):Workspace {
 const v=obj(value,"Workspace");
 if(v.schemaVersion!==1) throw new FinancialInputError("Versión de datos no compatible. No se modificó el almacenamiento.");
 const products=assertArray(v.products,"Productos",500).map(item=>{
  const p=obj(item,"Producto");
  return {id:id(p.id),createdAt:safeDate(p.createdAt,"Fecha"),updatedAt:safeDate(p.updatedAt,"Fecha"),input:validateInput(p.input)};
 });
 const productIds=new Set(products.map(p=>p.id));
 if(productIds.size!==products.length) throw new FinancialInputError("Identificadores de producto duplicados.");
 const scenarios=assertArray(v.scenarios,"Escenarios",1500).map(item=>{
  const s=obj(item,"Escenario");
  const productId=id(s.productId);
  if(!productIds.has(productId)) throw new FinancialInputError("Escenario sin producto asociado.");
  return {id:id(s.id),productId,title:safeText(s.title,"Título",80),note:safeText(s.note,"Nota",400),values:validateInput(s.values)};
 });
 const profiles=assertArray(v.profiles,"Perfiles",100).map(item=>{
  const p=obj(item,"Perfil");return {id:id(p.id),name:safeText(p.name,"Perfil",80),values:validateInput(p.values)};
 });
 const history=assertArray(v.history,"Historial",3000).map(item=>{
  const h=obj(item,"Historial");
  return {id:id(h.id),productId:id(h.productId),at:safeDate(h.at,"Fecha"),action:safeText(h.action,"Acción",80),snapshot:validateInput(h.snapshot)};
 });
 for (const [name,rows] of [["Escenarios",scenarios],["Perfiles",profiles],["Historial",history]] as const) {
  const keys=rows.map(x=>x.id);
  if(new Set(keys).size!==keys.length) throw new FinancialInputError(name+": identificadores duplicados.");
 }
 return {schemaVersion:1,updatedAt:safeDate(v.updatedAt,"Actualización"),products,scenarios,profiles,history};
}
export function encodeBackup(data: Workspace):string {
 const validated=validateWorkspace(data);
 return JSON.stringify({format:"precify-colombia-backup",backupVersion:1,currency:"COP",locale:"es-CO",
  exportedAt:new Date().toISOString(),workspace:validated},null,2);
}
export function decodeBackup(text:string):Workspace {
 if(typeof text!=="string" || new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)
   throw new FinancialInputError("Archivo de respaldo demasiado grande (máximo 2 MB).");
 let parsed:unknown;
 try{parsed=JSON.parse(text);}catch{throw new FinancialInputError("JSON malformado. No se reemplazaron datos.");}
 const root=obj(parsed,"Respaldo");
 if(root.format!=="precify-colombia-backup" || root.backupVersion!==1 || root.currency!=="COP" || root.locale!=="es-CO")
  throw new FinancialInputError("Metadatos de respaldo incompatibles.");
 safeDate(root.exportedAt,"Exportación");
 return validateWorkspace(root.workspace);
}
function csvCell(value:string):string {
 const normalized=value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g," ");
 const formula=/^[\s\uFEFF]*[=+\-@]/.test(normalized);
 return '"' + (formula?"'":"") + normalized.replace(/"/g,'""') + '"';
}
export function exportProductsCsv(data:Workspace):string {
 const safe=validateWorkspace(data);
 const rows=[["ID","Producto","Categoría","Origen","Precio actual (COP)","Contribución (COP)","Margen contribución (%)","Fecha actualización"]];
 for(const p of safe.products){
  const r=analyze(p.input);
  rows.push([p.id,p.input.name,p.input.category,p.input.origin,p.input.currentPrice,r.contribution,r.marginPercent??"N/D",p.updatedAt]);
 }
 return "\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
}
