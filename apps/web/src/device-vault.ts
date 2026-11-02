import {generateDeviceIdentity,activateDevice} from "../../../integrations/device-client.mjs";
export type DeviceIdentity={deviceId:string;publicKey:JsonWebKey;privateKey:CryptoKey;subject:string};
const DB="precify-financy-identities-v1",TABLE="devices";
const bucket=(mode:IDBTransactionMode):Promise<{db:IDBDatabase;tx:IDBTransaction;store:IDBObjectStore}>=>new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB,1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(TABLE))req.result.createObjectStore(TABLE,{keyPath:"scope"});};
 req.onerror=()=>reject(req.error);
 req.onsuccess=()=>{const db=req.result,tx=db.transaction(TABLE,mode);resolve({db,tx,store:tx.objectStore(TABLE)});};
});
const scope=(businessId:string,siteId:string)=>businessId+":"+siteId;
export async function readDevice(businessId:string,siteId:string):Promise<DeviceIdentity|null>{
 const {db,tx,store}=await bucket("readonly");
 return new Promise((resolve,reject)=>{
  const r=store.get(scope(businessId,siteId));
  tx.oncomplete=()=>{db.close();resolve((r.result as {identity?:DeviceIdentity}|undefined)?.identity??null);};
  tx.onerror=()=>{db.close();reject(tx.error);};
  tx.onabort=()=>{db.close();reject(tx.error);};
 });
}
export async function saveDevice(businessId:string,siteId:string,identity:DeviceIdentity):Promise<void>{
 const {db,tx,store}=await bucket("readwrite");
 return new Promise((resolve,reject)=>{
  store.add({scope:scope(businessId,siteId),identity});
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onerror=()=>{db.close();reject(tx.error);};
  tx.onabort=()=>{db.close();reject(tx.error);};
 });
}
export async function deleteDevice(businessId:string,siteId:string):Promise<void>{
 const {db,tx,store}=await bucket("readwrite");
 return new Promise((resolve,reject)=>{
  store.delete(scope(businessId,siteId));
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onerror=()=>{db.close();reject(tx.error);};
  tx.onabort=()=>{db.close();reject(tx.error);};
 });
}
export async function enrollDevice(businessId:string,siteId:string,baseURL:string,code:string){
 if(await readDevice(businessId,siteId))throw Error("This device is already activated for this store");
 const identity=await generateDeviceIdentity();
 const activation=await activateDevice({baseURL,code,identity});
 const saved:DeviceIdentity={...identity,subject:activation.subject};
 await saveDevice(businessId,siteId,saved);
 return saved;
}
