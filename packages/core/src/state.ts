import { simulateCOD, simulateCampaign, pricePerMeasure, consumerPricePreview, simulatePortfolio, type PUMUnit } from "./advanced.js";
import { FinancialInputError, parseDecimal } from "./money.js";
import { analyze, validateInput, type PriceInput } from "./pricing.js";
export const STORE_KEY = "precify-colombia:workspace:v1";
export const MAX_BACKUP_BYTES = 2_000_000;
export type RecordOrigin = "manual" | "estimado" | "confirmado";
export type Product = { id: string; createdAt: string; updatedAt: string; input: PriceInput };
export type SavedScenario = { id: string; productId: string; title: string; note: string; values: PriceInput };
export type SavedProfile = { id: string; name: string; values: PriceInput };
export type HistoryEntry = { id: string; productId: string; at: string; action: string; snapshot: PriceInput };
export type AdvancedSimulationKind="cod"|"campaign"|"pum"|"consumer"|"portfolio";
export type AdvancedSimulationRecord={id:string;kind:AdvancedSimulationKind;productId:string|null;at:string;label:string;inputs:Record<string,string>};
export type Workspace = {
 schemaVersion: 1; updatedAt: string; products: Product[];
 scenarios: SavedScenario[]; profiles: SavedProfile[]; history: HistoryEntry[];
 advancedSimulations: AdvancedSimulationRecord[];
};
export const emptyWorkspace = (): Workspace => ({
 schemaVersion:1,updatedAt:new Date().toISOString(),products:[],scenarios:[],profiles:[],history:[],advancedSimulations:[]
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
 const advancedRules:Record<AdvancedSimulationKind,Set<string>>={
  cod:new Set(["createdOrders","shippedPercent","deliveredPercentOfShipped","paidPercentOfDelivered","failedAttemptCost","returnShippingCost","advertisingPerCreatedOrder","extraCODFeePerPaidOrder","lossReservePerFailedOrder"]),
  campaign:new Set(["impressions","conversionPercent","advertisingSpend","attributedRevenue","refundPercent"]),
  pum:new Set(["price","quantity","unit"]),
  consumer:new Set(["productPrice","discount","additionalFees","shippingCharged","taxMode","taxPercent"]),
  portfolio:new Set(["monthlyFixed","quantities"])
 };
 const advancedSimulations=assertArray(v.advancedSimulations??[],"Simulaciones avanzadas",300).map(item=>{
  const row=obj(item,"Simulación avanzada");
  const kind=row.kind;
  if(kind!=="cod"&&kind!=="campaign"&&kind!=="pum"&&kind!=="consumer"&&kind!=="portfolio")
   throw new FinancialInputError("Tipo de simulación inválido.");
  const productId=row.productId===null?null:id(row.productId);
  if(productId!==null&&!productIds.has(productId))throw new FinancialInputError("Simulación sin producto asociado.");
  const raw=obj(row.inputs,"Entradas de simulación");
  if(Object.keys(raw).some(key=>!advancedRules[kind].has(key))||Object.keys(raw).length>12)
   throw new FinancialInputError("Entradas de simulación desconocidas.");
  const inputs:Record<string,string>={};
  for(const [key,value] of Object.entries(raw))inputs[key]=safeText(value,"Valor de simulación",1200);
  // A restored simulation must be computationally valid before replacing any workspace.
  if(kind==="cod"||kind==="campaign"){
   const product=products.find(p=>p.id===productId);
   if(!product)throw new FinancialInputError("Simulación sin producto asociado.");
   if(kind==="cod")simulateCOD({...inputs,product:product.input} as Parameters<typeof simulateCOD>[0]);
   else simulateCampaign({...inputs,product:product.input} as Parameters<typeof simulateCampaign>[0]);
  }else if(kind==="pum"){
   pricePerMeasure(inputs.price!,inputs.quantity!,inputs.unit as PUMUnit);
  }else if(kind==="consumer"){
   consumerPricePreview(inputs as unknown as Parameters<typeof consumerPricePreview>[0]);
  }else {
   const parsed=JSON.parse(inputs.quantities??"null") as unknown;
   const quantities=obj(parsed,"Volúmenes de cartera");
   if(Object.keys(quantities).some(key=>!productIds.has(key))||
      Object.values(quantities).some(value=>typeof value!=="string"||!/^(0|[1-9]\d{0,7})$/.test(value)))
    throw new FinancialInputError("Volúmenes de cartera inválidos.");
   simulatePortfolio(products.map(p=>({product:p.input,monthlyUnits:String(quantities[p.id]??"0")})),inputs.monthlyFixed!);
  }
  return {id:id(row.id),kind,productId,at:safeDate(row.at,"Fecha"),label:safeText(row.label,"Nombre de simulación",100),inputs};
 });
 if(new Set(advancedSimulations.map(x=>x.id)).size!==advancedSimulations.length)
  throw new FinancialInputError("Simulaciones avanzadas: identificadores duplicados.");
 const history=assertArray(v.history,"Historial",3000).map(item=>{
  const h=obj(item,"Historial");
  return {id:id(h.id),productId:id(h.productId),at:safeDate(h.at,"Fecha"),action:safeText(h.action,"Acción",80),snapshot:validateInput(h.snapshot)};
 });
 for (const [name,rows] of [["Escenarios",scenarios],["Perfiles",profiles],["Historial",history]] as const) {
  const keys=rows.map(x=>x.id);
  if(new Set(keys).size!==keys.length) throw new FinancialInputError(name+": identificadores duplicados.");
 }
 return {schemaVersion:1,updatedAt:safeDate(v.updatedAt,"Actualización"),products,scenarios,profiles,history,advancedSimulations};
}
export function encodeBackup(data: Workspace):string {
 const validated=validateWorkspace(data);
 return JSON.stringify({format:"precify-colombia-backup",backupVersion:2,currency:"COP",locale:"es-CO",
  exportedAt:new Date().toISOString(),workspace:validated},null,2);
}
export function decodeBackup(text:string):Workspace {
 if(typeof text!=="string" || new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)
   throw new FinancialInputError("Archivo de respaldo demasiado grande (máximo 2 MB).");
 let parsed:unknown;
 try{parsed=JSON.parse(text);}catch{throw new FinancialInputError("JSON malformado. No se reemplazaron datos.");}
 const root=obj(parsed,"Respaldo");
 if(root.format!=="precify-colombia-backup" || ![1,2].includes(Number(root.backupVersion)) || root.currency!=="COP" || root.locale!=="es-CO")
  throw new FinancialInputError("Metadatos de respaldo incompatibles.");
 safeDate(root.exportedAt,"Exportación");
 return validateWorkspace(root.workspace);
}
function csvCell(value:string):string {
 const normalized=value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g," ");
 const formula=/^[\s\uFEFF]*[=+\-@]/.test(normalized);
 return '"' + (formula?"'":"") + normalized.replace(/"/g,'""') + '"';
}
export type CsvTranslations = {
 headers?: readonly string[];
 origin?: Partial<Record<"manual"|"estimado"|"confirmado",string>>;
};
export function exportProductsCsv(data:Workspace,translations?:CsvTranslations):string {
 const safe=validateWorkspace(data);
 const defaultHeaders=["ID","Producto","Categoría","Origen","Precio actual (COP)","Contribución (COP)","Margen contribución (%)","Fecha actualización"];
 const headers=translations?.headers??defaultHeaders;
 if(headers.length!==defaultHeaders.length)throw new FinancialInputError("Encabezados CSV inválidos.");
 const rows=[Array.from(headers)];
 for(const p of safe.products){
  const r=analyze(p.input);
  rows.push([p.id,p.input.name,p.input.category,translations?.origin?.[p.input.origin]??p.input.origin,p.input.currentPrice,r.contribution,r.marginPercent??"N/D",p.updatedAt]);
 }
 return "\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
}
