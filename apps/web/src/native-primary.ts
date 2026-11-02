/**
 * Precify Financy 2.x Windows: SQLite is the authoritative on-device store.
 * localStorage is a disposable, synchronous UI read projection. It is NOT used to
 * seed the new Tauri app: prior Precify Colombia experimental data are ignored.
 *
 * Every native save must commit first and only then publish the UI projection.
 */
import {readNativeSnapshot,supportsDesktopSQLite} from "./desktop-snapshots";
import {STORE_KEY} from "@precify-financy/core";
import {businessKey,MAIN_BUSINESS,validateBusinessDirectory} from "./BusinessProfiles";
type Kind="workspace"|"operations"|"global-pricing"|"site-connectors"|"business-directory";
const prefix="precify-financy:";
const names:Record<Exclude<Kind,"business-directory">,string>={
 "workspace":STORE_KEY,
 "operations":prefix+"operations:v1",
 "global-pricing":prefix+"global-pricing:v1",
 "site-connectors":prefix+"site-owned-connectors:v1"
};
const directoryKey=prefix+"business-directory:v1";
const storeKey=(id:string,kind:Kind)=>kind==="business-directory"?directoryKey:businessKey(names[kind],id);
type Bridge={core?:{invoke?:(command:string,args?:Record<string,unknown>)=>Promise<unknown>}};
function bridge(){
 const core=(window as Window&{__TAURI__?:Bridge}).__TAURI__?.core?.invoke;
 if(!core)throw Error("Native SQLite unavailable");
 return core;
}
export const nativePrimary=()=>supportsDesktopSQLite();
export async function bootstrapNativePrimary():Promise<void>{
 if(!nativePrimary())return;
 const dir=await readNativeSnapshot("business-directory",MAIN_BUSINESS);
 if(dir) {
  const valid=validateBusinessDirectory(JSON.parse(dir.data));
  localStorage.setItem(directoryKey,JSON.stringify(valid));
 }else localStorage.removeItem(directoryKey);
 const ids=dir?validateBusinessDirectory(JSON.parse(dir.data)).businesses.map(b=>b.id):[MAIN_BUSINESS];
 for(const businessId of ids)for(const kind of Object.keys(names) as Array<Exclude<Kind,"business-directory">>){
  const snap=await readNativeSnapshot(kind,businessId);
  const key=storeKey(businessId,kind);
  if(snap)localStorage.setItem(key,snap.data);
  else localStorage.removeItem(key);
 }
 const selected=localStorage.getItem(prefix+"active-business:v1");
 if(selected&&selected!=="all"&&!ids.includes(selected))localStorage.setItem(prefix+"active-business:v1",MAIN_BUSINESS);
}
/** Disk commit comes FIRST, with single-current-writer CAS and no silent fallback. */
const pending=new Map<string,Promise<void>>();
export async function nativeWrite(kind:Kind,businessId:string,data:string,expected:string|null):Promise<void>{
 if(!nativePrimary()){
  const key=storeKey(businessId,kind);
  if(localStorage.getItem(key)!==expected)throw Error("Concurrent browser update detected");
  localStorage.setItem(key,data);
  return;
 }
 const key=businessId+":"+kind;
 const before=pending.get(key)??Promise.resolve();
 const task=before.then(async()=>{
  const snap=await readNativeSnapshot(kind,businessId);
  if(snap?.data===data){localStorage.setItem(storeKey(businessId,kind),data);return;}
  if((snap?.data??null)!==expected)throw Error("SQLite revision conflict; no data were overwritten.");
  await bridge()("desktop_snapshot_put",{businessId,kind,data,expectedRevision:snap?.revision??null});
  localStorage.setItem(storeKey(businessId,kind),data);
 });
 pending.set(key,task.catch(()=>{}));
 await task;
}
export async function nativeRemove(kind:Kind,businessId:string):Promise<void>{
 if(!nativePrimary()){localStorage.removeItem(storeKey(businessId,kind));return;}
 const key=businessId+":"+kind;await (pending.get(key)??Promise.resolve());
 const snap=await readNativeSnapshot(kind,businessId);
 if(snap)await bridge()("desktop_snapshot_delete",{businessId,kind,expectedRevision:snap.revision});
 localStorage.removeItem(storeKey(businessId,kind));
}
