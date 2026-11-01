/** IndexedDB: each site page and its cursor commit in one browser transaction. */
const DB_NAME="precify-colombia-site-owned-sync-v1";
function openSyncDB():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){reject(new Error("IndexedDB no disponible"));return;}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   db.createObjectStore("checkpoints",{keyPath:"scope"});
   const rows=db.createObjectStore("rows",{keyPath:"key"});
   rows.createIndex("byScope","scope",{unique:false});
  };
  req.onerror=()=>reject(req.error??new Error("Database open failed"));
  req.onsuccess=()=>resolve(req.result);
 });
}
export type SyncChange={kind:"order"|"campaign";id:string;operation:"upsert"|"delete";value?:Record<string,unknown>};
export async function readSiteCheckpoint(scope:string):Promise<{cursor:string|null;at:number;count:number}|null>{
 const db=await openSyncDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(["checkpoints","rows"],"readonly");
  const cp=tx.objectStore("checkpoints").get(scope);
  const count=tx.objectStore("rows").index("byScope").count(scope);
  tx.oncomplete=()=>{const value=cp.result as {cursor:string|null;at:number}|undefined;
   resolve(value?{cursor:value.cursor,at:value.at,count:count.result}:null);};
  tx.onerror=()=>reject(tx.error??new Error("Database read failed"));
  tx.onabort=()=>reject(tx.error??new Error("Database read aborted"));
 });}finally{db.close();}
}
export async function applySitePage(scope:string,changes:SyncChange[],cursor:string|null):Promise<void>{
 const db=await openSyncDB();
 try{await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction(["checkpoints","rows"],"readwrite");
  const rows=tx.objectStore("rows");
  for(const item of changes){
   const key=scope+":"+item.kind+":"+item.id;
   if(item.operation==="delete")rows.delete(key);
   else rows.put({key,scope,kind:item.kind,id:item.id,value:item.value});
  }
  tx.objectStore("checkpoints").put({scope,cursor,at:Date.now()});
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error??new Error("Site cache transaction failed"));
  tx.onabort=()=>reject(tx.error??new Error("Site cache transaction aborted"));
 });}finally{db.close();}
}
export async function purgeSiteCache(sourceId:string):Promise<void>{
 const db=await openSyncDB();
 try{await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction(["checkpoints","rows"],"readwrite");
  const checkpoints=tx.objectStore("checkpoints");
  const rows=tx.objectStore("rows");
  const cp=checkpoints.openKeyCursor();
  cp.onsuccess=()=>{const cursor=cp.result;if(cursor){if(String(cursor.key).startsWith(sourceId+":"))cursor.delete();cursor.continue();}};
  const row=rows.index("byScope").openCursor();
  row.onsuccess=()=>{const cursor=row.result;if(cursor){if(String(cursor.value.scope).startsWith(sourceId+":"))cursor.delete();cursor.continue();}};
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error??new Error("Cache removal failed"));
  tx.onabort=()=>reject(tx.error??new Error("Cache removal aborted"));
 });}finally{db.close();}
}
