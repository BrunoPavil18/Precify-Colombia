import {getBusinessScope} from "./BusinessProfiles";
type Kind="workspace"|"operations"|"global-pricing"|"site-connectors"|"business-directory";
type Snapshot={revision:number;data:string};
type Bridge={core?:{invoke?:(command:string,args?:Record<string,unknown>)=>Promise<unknown>}};
const native=()=>((window as Window&{__TAURI__?:Bridge}).__TAURI__?.core?.invoke);
export const supportsDesktopSQLite=()=>typeof native()==="function";
export async function readNativeSnapshot(kind:Kind,businessId=getBusinessScope()):Promise<Snapshot|null>{
 const invoke=native();if(!invoke)return null;
 return await invoke("desktop_snapshot_get",{businessId,kind}) as Snapshot|null;
}
