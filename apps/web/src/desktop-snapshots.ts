import {getBusinessScope,businessKey,MAIN_BUSINESS} from "./BusinessProfiles";
import {STORE_KEY,MAX_BACKUP_BYTES,validateWorkspace} from "@precify-colombia/core";

type Kind="workspace"|"operations"|"global-pricing"|"site-connectors"|"business-directory";
type Snapshot={revision:number;data:string};
type Bridge={core?:{invoke?:(command:string,args?:Record<string,unknown>)=>Promise<unknown>}};
const native=()=>((window as Window&{__TAURI__?:Bridge}).__TAURI__?.core?.invoke);
const jobs=new Map<string,Promise<void>>();
export const supportsDesktopSQLite=()=>typeof native()==="function";
export async function readNativeSnapshot(kind:Kind,businessId=getBusinessScope()):Promise<Snapshot|null>{
 const invoke=native();
 if(!invoke)return null;
 return await invoke("desktop_snapshot_get",{businessId,kind}) as Snapshot|null;
}
export function mirrorNativeSnapshot(kind:Kind,data:string,previous:string|null,businessId=getBusinessScope()):void{
 const invoke=native();if(!invoke)return;
 const key=businessId+":"+kind;
 const job=(jobs.get(key)??Promise.resolve()).catch(()=>{}).then(async()=>{
  const snapshot=await readNativeSnapshot(kind,businessId);
  if(snapshot){
   if(snapshot.data===data)return;
   if(snapshot.data!==previous)throw Error("SQLite changed independently. Original native snapshot has been preserved.");
  }
  await invoke("desktop_snapshot_put",{businessId,kind,data,expectedRevision:snapshot?.revision??null});
 }).catch(e=>{
  console.warn("Precify SQLite mirror:",e);
  window.dispatchEvent(new CustomEvent("precify:native-snapshot-error",{detail:String(e)}));
 });
 jobs.set(key,job);
}
/** Initial native migration is insert-only. Never overwrites existing snapshots. */
export async function initializeNativeSnapshots():Promise<void>{
 if(!supportsDesktopSQLite())return;
 const {GLOBAL_PRODUCTS_KEY}=await import("./global-storage");
 const mappings:[Kind,string][]=[
  ["workspace",STORE_KEY],["operations","precify-colombia:operations:v1"],
  ["global-pricing",GLOBAL_PRODUCTS_KEY],["site-connectors","precify-colombia:site-owned-connectors:v1"],
  ["business-directory","precify-colombia:business-directory:v1"]
 ];
 const businessId=getBusinessScope();
 for(const [kind,key] of mappings){
  const local=localStorage.getItem(businessKey(key,businessId));
  if(!local||local.length>MAX_BACKUP_BYTES)continue;
  if(kind==="workspace")try{validateWorkspace(JSON.parse(local));}catch{continue;}
  const existing=await readNativeSnapshot(kind,businessId);
  if(!existing)mirrorNativeSnapshot(kind,local,null,businessId);
  else if(existing.data!==local){
   window.dispatchEvent(new CustomEvent("precify:native-snapshot-conflict",{detail:kind}));
  }
 }
}
