/**
 * Published products from stores remain a read-only mirror, never merged into
 * Workspace.products or operational order events without a user's explicit choice.
 * Tauri commits this snapshot to the same SQLite database as other business state;
 * the localStorage view is disposable and rehydrated at startup.
 */
import {businessKey} from "./BusinessProfiles";
import {nativeWrite} from "./native-primary";
export const CATALOG_MIRROR_KEY="precify-financy:catalog-mirror:v1";
export const CATALOG_UPDATED="precify:catalog-mirror-updated";
export type StoreProduct={id:number;mastershopProductId:number|null;slug:string;name:string;price:string;currency:string;imageUrl:string|null};
export type StoreCatalog={siteId:string;name:string;subject:string;syncedAt:string;products:StoreProduct[]};
export type StoreCatalogState={version:1;sites:Record<string,StoreCatalog>};
const empty=():StoreCatalogState=>({version:1,sites:{}});
function valid(state:unknown):StoreCatalogState{
 if(!state||typeof state!=="object"||Array.isArray(state))throw Error("Invalid catalog mirror");
 const input=state as StoreCatalogState;
 if(input.version!==1||!input.sites||typeof input.sites!=="object"||Array.isArray(input.sites)||
    Object.keys(input.sites).length>20)throw Error("Invalid catalog mirror version or store count");
 for(const [siteId,record] of Object.entries(input.sites)){
  if(!/^[a-f0-9-]{36}$/i.test(siteId)||record.siteId!==siteId||
     typeof record.name!=="string"||record.name.length>120||
     typeof record.subject!=="string"||record.subject.length>160||
     typeof record.syncedAt!=="string"||!Number.isFinite(Date.parse(record.syncedAt))||
     !Array.isArray(record.products)||record.products.length>2400)throw Error("Invalid catalog mirror store");
  const seen=new Set<number>();
  for(const p of record.products){
   if(!Number.isSafeInteger(p.id)||p.id<=0||seen.has(p.id)||
      typeof p.name!=="string"||p.name.length>200||
      typeof p.price!=="string"||!/^(0|[1-9][0-9]{0,12})(?:\.[0-9]{1,2})?$/.test(p.price)||
      typeof p.slug!=="string"||p.slug.length>220||
      typeof p.currency!=="string"||!/^[A-Z]{3}$/.test(p.currency)||
      !(p.mastershopProductId===null||Number.isSafeInteger(p.mastershopProductId)&&p.mastershopProductId>0)||
      !(p.imageUrl===null||typeof p.imageUrl==="string"&&p.imageUrl.length<=2048))
    throw Error("Invalid mirrored product");
   seen.add(p.id);
  }
 }
 return input;
}
export function readStoreCatalog(businessId:string):StoreCatalogState{
 const raw=localStorage.getItem(businessKey(CATALOG_MIRROR_KEY,businessId));
 if(!raw)return empty();
 if(raw.length>1_900_000)throw Error("Catalog snapshot exceeds local limit; export and inspect before recovery");
 return valid(JSON.parse(raw));
}
async function commitCatalog(businessId:string,next:StoreCatalogState,before:string|null){
 const content=JSON.stringify(valid(next));
 if(content.length>1_900_000)throw Error("Catalog exceeds 1.9 MB snapshot limit; previous local data preserved");
 await nativeWrite("catalog-mirror",businessId,content,before);
 window.dispatchEvent(new CustomEvent(CATALOG_UPDATED,{detail:businessId}));
}
export async function saveStoreCatalog(businessId:string,siteId:string,name:string,subject:string,products:StoreProduct[]){
 const key=businessKey(CATALOG_MIRROR_KEY,businessId),before=localStorage.getItem(key);
 const current=before?valid(JSON.parse(before)):empty();
 const next:StoreCatalogState={version:1,sites:{...current.sites,
  [siteId]:{siteId,name,subject,syncedAt:new Date().toISOString(),products}}};
 await commitCatalog(businessId,next,before);
 return next.sites[siteId];
}
export async function clearStoreCatalog(businessId:string,siteId:string){
 const key=businessKey(CATALOG_MIRROR_KEY,businessId),before=localStorage.getItem(key);
 if(!before)return;
 const current=valid(JSON.parse(before));
 if(!current.sites[siteId])return;
 const sites={...current.sites};delete sites[siteId];
 await commitCatalog(businessId,{version:1,sites},before);
}
