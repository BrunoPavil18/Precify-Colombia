export interface SiteChange {
 id:string;kind:"order"|"campaign";operation:"upsert"|"delete";value?:Record<string,unknown>;
}
export interface SitePage {changes:SiteChange[];nextCursor:string|null;hasMore:boolean;}
export function validateChangePage(value:unknown):SitePage;
export function createSiteConnector(options:{
 id:string;baseURL:string;getToken:()=>string|Promise<string>;
 fetchImpl?:typeof fetch;
}):{
 id:string;identify:()=>Promise<string>;pull:(cursor:string|null,limit?:number)=>Promise<SitePage>;
};
export interface SyncStatus {phase:"idle"|"syncing"|"ready"|"error";lastSuccess:number|null;lastError:string|null;pulled:number;}
export function createSyncController(options:{
 connector:{pull:(cursor:string|null,limit?:number)=>Promise<SitePage>};
 store:{read:(scope:string)=>Promise<{cursor:string|null}|null>;apply:(scope:string,changes:SiteChange[],cursor:string|null,expectedCursor:string|null)=>Promise<void>};
 scope:string;onState?:(state:SyncStatus)=>void;clock?:()=>number;pageLimit?:number;maxPages?:number;
}):{run:(manual?:boolean)=>Promise<SyncStatus>;getState:()=>SyncStatus};
