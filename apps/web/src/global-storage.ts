import {globalPrice,type GlobalPriceInput} from "@precify-colombia/core";

export const GLOBAL_PRODUCTS_KEY="precify-colombia:global-pricing:v1";
export type GlobalSavedProduct={id:string;name:string;input:GlobalPriceInput;updatedAt:string};
export type GlobalSavedCatalog={version:1;products:GlobalSavedProduct[]};
const empty=():GlobalSavedCatalog=>({version:1,products:[]});
function validateCatalog(value:unknown):GlobalSavedCatalog {
 if(!value||typeof value!=="object")throw new Error("Invalid global catalog");
 const v=value as GlobalSavedCatalog;
 if(v.version!==1||!Array.isArray(v.products)||v.products.length>500)throw new Error("Invalid global catalog version or size");
 const ids=new Set<string>();
 for(const record of v.products){
  if(typeof record.id!=="string"||!/^[a-zA-Z0-9-]{8,70}$/.test(record.id)||ids.has(record.id))
   throw new Error("Invalid/duplicate global product ID");
  ids.add(record.id);
  if(typeof record.name!=="string"||!record.name.trim()||record.name.length>120)
   throw new Error("Invalid global product name");
  if(typeof record.updatedAt!=="string"||!Number.isFinite(Date.parse(record.updatedAt)))
   throw new Error("Invalid global product timestamp");
  globalPrice(record.input);
 }
 return v;
}
export function loadGlobalCatalog():{catalog:GlobalSavedCatalog;raw:string|null;error:string|null}{
 let raw:string|null=null;
 try{
  raw=localStorage.getItem(GLOBAL_PRODUCTS_KEY);
  if(!raw)return {catalog:empty(),raw:null,error:null};
  if(raw.length>2_000_000)throw new Error("Global catalog backup exceeds 2 MB");
  return {catalog:validateCatalog(JSON.parse(raw)),raw,error:null};
 }catch(e){return {catalog:empty(),raw,error:e instanceof Error?e.message:String(e)};}
}
export function persistGlobalCatalog(next:GlobalSavedCatalog,previousRaw:string|null):string {
 const safe=validateCatalog(next);
 const content=JSON.stringify(safe);
 if(content.length>2_000_000)throw new Error("Global catalog storage exceeds 2 MB");
 if(localStorage.getItem(GLOBAL_PRODUCTS_KEY)!==previousRaw)
  throw new Error("Another browser tab modified the global catalog. Export a backup before reloading.");
 localStorage.setItem(GLOBAL_PRODUCTS_KEY,content);
 return content;
}
export function decodeGlobalCatalogBackup(content:string):GlobalSavedCatalog {
 if(content.length>2_000_000)throw new Error("Global catalog backup exceeds 2 MB");
 return validateCatalog(JSON.parse(content));
}
export function downloadGlobalCatalog(catalog:GlobalSavedCatalog):void {
 const safe=validateCatalog(catalog);
 const url=URL.createObjectURL(new Blob([JSON.stringify(safe,null,2)],{type:"application/json"}));
 const link=document.createElement("a");link.href=url;link.download="precify-global-pricing-backup-v1.json";link.click();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
