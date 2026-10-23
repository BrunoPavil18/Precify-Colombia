import { STORE_KEY, MAX_BACKUP_BYTES, emptyWorkspace, validateWorkspace, type Workspace } from "@precify-colombia/core";
export type ReadResult={state:Workspace;locked:boolean;error:string|null};
export function loadWorkspace():ReadResult {
 try {
  const raw=localStorage.getItem(STORE_KEY);
  if(raw===null)return{state:emptyWorkspace(),locked:false,error:null};
  if(new TextEncoder().encode(raw).length>MAX_BACKUP_BYTES)throw new Error("Datos locales exceden 2 MB.");
  return{state:validateWorkspace(JSON.parse(raw)),locked:false,error:null};
 }catch(e){
  return{state:emptyWorkspace(),locked:true,error:"Datos locales dañados o inaccesibles. No se sobrescribirán automáticamente. Exporta una copia desde el navegador antes de continuar. "+String(e)};
 }
}
/** Optimistic revision guard: refuse stale writes from another browser tab. */
export function persistWorkspace(state:Workspace,expectedUpdatedAt?:string):void {
 if(expectedUpdatedAt!==undefined){
  const raw=localStorage.getItem(STORE_KEY);
  if(raw===null)throw new Error("Conflicto entre pestañas: los datos cambiaron o fueron borrados. Actualiza y exporta una copia antes de continuar.");
  if(new TextEncoder().encode(raw).length>MAX_BACKUP_BYTES)throw new Error("Conflicto entre pestañas: almacenamiento inesperado.");
  const current=validateWorkspace(JSON.parse(raw));
  if(current.updatedAt!==expectedUpdatedAt)
   throw new Error("Conflicto entre pestañas: cambios externos detectados. No se sobrescribieron datos.");
 }

 const data=JSON.stringify(validateWorkspace(state));
 if(new TextEncoder().encode(data).length>MAX_BACKUP_BYTES)throw new Error("Límite local de 2 MB. Exporta un respaldo y reduce tu historial.");
 localStorage.setItem(STORE_KEY,data);
}
export function downloadFile(content:string,fileName:string,type:string):void {
 const blob=new Blob([content],{type});
 const link=document.createElement("a");
 const url=URL.createObjectURL(blob);
 link.href=url;link.download=fileName;link.style.display="none";
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
