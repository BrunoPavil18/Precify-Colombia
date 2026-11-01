import {useCallback,useEffect,useState} from "react";
import {validateOrderEvent,validateAdCampaign,type OrderEvent,type AdCampaign} from "@precify-colombia/core";
import {useTranslator} from "./i18n";

const API=(import.meta.env.VITE_PRECIFY_API_URL as string|undefined)?.replace(/\/$/,"")??"";
const SB=(import.meta.env.VITE_SUPABASE_URL as string|undefined)?.replace(/\/$/,"")??"";
const ANON=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
const SESSION="precify-colombia:connected-session:v1";
const LOCAL_OPERATIONS="precify-colombia:operations:v1";
type Session={access_token:string;refresh_token:string;expires_at:number;user:{id:string;email?:string}};
type Org={id:string;name:string;role:string};
type Dash={mode:string;funnel:Array<Record<string,string|number|null>>;reconciliation:Array<{
 campaignId:string;currency:string;paidOrders:number;observedNetRevenue:string;discrepancy:string;
}>;lastUpdated:string};
type AdAccount={id:string;name:string;currency:string};
function readSession():Session|null{
 try{const v=sessionStorage.getItem(SESSION);return v?JSON.parse(v) as Session:null;}catch{return null;}
}
async function authRequest(path:string,body:unknown){
 if(!SB||!ANON)throw new Error("Servicio de autenticación no configurado.");
 const res=await fetch(SB+"/auth/v1/"+path,{method:"POST",headers:{"content-type":"application/json",apikey:ANON},body:JSON.stringify(body)});
 const data=await res.json();
 if(!res.ok)throw new Error(String(data.msg??data.message??data.error_description??"Error de autenticación"));
 return data;
}
let activeSession:Session|null=readSession();
function storeSession(value:Session|null){
 activeSession=value;
 try{if(value)sessionStorage.setItem(SESSION,JSON.stringify(value));else sessionStorage.removeItem(SESSION);}catch{/* Session persistence optional */ }
}
async function renewSession(session:Session):Promise<void>{
 if(session.expires_at>Date.now()+60000)return;
 if(!session.refresh_token||!SB||!ANON)throw new Error("Sesión caducada. Inicia sesión de nuevo.");
 const response=await fetch(SB+"/auth/v1/token?grant_type=refresh_token",{
  method:"POST",headers:{"content-type":"application/json",apikey:ANON},
  body:JSON.stringify({refresh_token:session.refresh_token}),cache:"no-store"
 });
 const updated=await response.json();
 if(!response.ok||typeof updated.access_token!=="string")throw new Error("No se pudo renovar la sesión. Inicia sesión de nuevo.");
 session.access_token=updated.access_token;
 session.refresh_token=String(updated.refresh_token??session.refresh_token);
 session.expires_at=Date.now()+Number(updated.expires_in??3600)*1000;
 storeSession(session);
}
async function ensureFreshSession(session:Session):Promise<Session>{
 const current=activeSession?.user.id===session.user.id?activeSession:session;
 if(Date.now()<current.expires_at-60000)return current;
 if(!current.refresh_token)throw new Error("Sesión expirada. Inicia sesión nuevamente.");
 const fresh=await authRequest("token?grant_type=refresh_token",{refresh_token:current.refresh_token});
 if(typeof fresh.access_token!=="string"||!fresh.user?.id)throw new Error("No se pudo renovar la sesión.");
 const updated:Session={access_token:fresh.access_token,refresh_token:String(fresh.refresh_token??current.refresh_token),
  expires_at:Date.now()+Number(fresh.expires_in??3600)*1000,user:{id:fresh.user.id,email:fresh.user.email}};
 storeSession(updated);
 return updated;
}
async function request<T>(session:Session,path:string,method:"GET"|"POST"|"DELETE"="GET",body?:unknown):Promise<T>{
 await renewSession(session);
 if(!API)throw new Error("Servidor conectado no configurado.");
 const current=await ensureFreshSession(session);
 const res=await fetch(API+path,{method,headers:{
  Authorization:"Bearer "+current.access_token,
  "Content-Type":"application/json","Accept":"application/json"
 },cache:"no-store",body:body===undefined?undefined:JSON.stringify(body)});
 const response=await res.json();
 if(!res.ok)throw new Error(String(response.error??"Error remoto: "+res.status));
 return response as T;
}
function summaryKey(user:string,org:string){return "precify-colombia:connected-summary:v1:"+user+":"+org;}
function savedOrgs(user:string):Org[]{
 const prefix="precify-colombia:connected-summary:v1:"+user+":";
 try{
  return Object.keys(localStorage).filter(key=>key.startsWith(prefix))
   .map(key=>key.slice(prefix.length))
   .filter(id=>/^[a-f0-9-]{36}$/i.test(id))
   .map(id=>({id,name:"Offline "+id.slice(0,8),role:"cached"}));
 }catch{return [];}
}
export function ConnectedLab(){
 const t=useTranslator();
 const [session,setSession]=useState<Session|null>(readSession);
 const [email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [orgs,setOrgs]=useState<Org[]>([]),[selected,setSelected]=useState("");
 const [newOrg,setNewOrg]=useState("");
 const [dashboard,setDashboard]=useState<Dash|null>(null);
 const [cacheConsent,setCacheConsent]=useState(false),[offline,setOffline]=useState(false);
 const [metaAccounts,setMetaAccounts]=useState<AdAccount[]>([]);
 const [adAccount,setAdAccount]=useState(""),[since,setSince]=useState(""),[until,setUntil]=useState("");
 const [metaLevel,setMetaLevel]=useState("campaign");
 const [breakdowns,setBreakdowns]=useState<Array<{campaignId:string;age:string;gender:string;impressions:string;clicks:string;spend:string}>>([]);
 const [memberId,setMemberId]=useState(""),[memberRole,setMemberRole]=useState("viewer");
 const [newKey,setNewKey]=useState(""),[newHook,setNewHook]=useState<{endpoint:string;secret:string}|null>(null);
 const [deletePhrase,setDeletePhrase]=useState("");
 const [organizationConfirmation,setOrganizationConfirmation]=useState("");
 useEffect(()=>{if(new URLSearchParams(window.location.search).get("precify-meta")==="connected")
  setNotice("Facebook autorizado. Regresa al módulo conectado y carga tus cuentas publicitarias.");
 },[]);
 const report=useCallback(async(org:string,access:Session)=>{
  try{
   const value=await request<Dash>(access,"/v1/orgs/"+org+"/dashboard");
   setDashboard(value);setOffline(false);
   if(cacheConsent)try{localStorage.setItem(summaryKey(access.user.id,org),JSON.stringify(value));}catch{}
  }catch(e){
   let raw:string|null=null;try{raw=localStorage.getItem(summaryKey(access.user.id,org));}catch{/* Browser storage denied */}
   if(raw){try{setDashboard(JSON.parse(raw) as Dash);setOffline(true);}catch{setDashboard(null);}}
   else{setDashboard(null);setNotice(String(e));setOffline(true);}
  }
 },[cacheConsent]);
 const loadOrgs=useCallback(async(access:Session)=>{
  try{const list=await request<Org[]>(access,"/v1/orgs");setOrgs(list);
   const id=list.find(v=>v.id===selected)?.id??list[0]?.id??"";
   setSelected(id);
   if(id)await report(id,access);
  }catch(e){
   setNotice("Sin conexión: solo están disponibles los informes guardados con permiso.");
   setOffline(true);
   const saved=savedOrgs(access.user.id);setOrgs(saved);
   const id=saved.find(o=>o.id===selected)?.id??saved[0]?.id??"";
   setSelected(id);
   if(id)await report(id,access);
  }
 },[report,selected]);
 useEffect(()=>{if(session)void loadOrgs(session);},[session]); // Organization selection refresh is deliberate.
 async function submitAuth(mode:"login"|"signup"){
  try{
   setBusy(true);setNotice("");
   if(!email.includes("@")||password.length<8)throw new Error("Introduce un correo válido y una contraseña de 8 caracteres o más.");
   if(mode==="signup"){
    await authRequest("signup",{email,password});
    setNotice(t("Cuenta solicitada. Revisa tu correo para confirmar el registro y luego inicia sesión."));
   }else{
    const data=await authRequest("token?grant_type=password",{email,password});
    if(typeof data.access_token!=="string"||!data.user?.id)throw new Error("No se recibió sesión válida.");
    const next:Session={access_token:data.access_token,refresh_token:String(data.refresh_token??""),
     expires_at:Date.now()+Number(data.expires_in??3600)*1000,user:{id:data.user.id,email:data.user.email}};
    storeSession(next);setSession(next);setPassword("");
   }
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 async function createOrg(){
  if(!session||!newOrg.trim())return;
  try{setBusy(true);const created=await request<{id:string}>(session,"/v1/orgs","POST",{name:newOrg});
   setNewOrg("");await loadOrgs(session);setSelected(created.id);await report(created.id,session);
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 function logout(){
  if(session)try{for(const key of Object.keys(localStorage))if(key.startsWith("precify-colombia:connected-summary:v1:"+session.user.id+":"))localStorage.removeItem(key);}catch{/* Storage may be unavailable */}
  storeSession(null);setSession(null);setOrgs([]);setSelected("");setDashboard(null);setCacheConsent(false);setNewKey("");setNewHook(null);
 }
 async function uploadLocal(){
  if(!session||!selected)return;
  try{
   setBusy(true);
   const raw=localStorage.getItem(LOCAL_OPERATIONS);
   if(!raw)throw new Error("No hay datos operativos locales para importar.");
   if(raw.length>2000000)throw new Error("El respaldo local es demasiado grande.");
   const data=JSON.parse(raw) as {version:number;events:OrderEvent[];campaigns:AdCampaign[]};
   if(data.version!==1||!Array.isArray(data.events)||!Array.isArray(data.campaigns))throw new Error("Datos locales inválidos.");
   data.events.forEach(validateOrderEvent);data.campaigns.forEach(validateAdCampaign);
   await request(session,"/v1/orgs/"+selected+"/orders/import","POST",data.events);
   await request(session,"/v1/orgs/"+selected+"/campaigns/import","POST",data.campaigns);
   await report(selected,session);
   setNotice(t("Importación explícita completada. Los datos locales permanecen intactos."));
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 async function loadMetaAccounts(){
  if(!session||!selected)return;
  try{setBusy(true);const list=await request<AdAccount[]>(session,"/v1/orgs/"+selected+"/meta/accounts");
   setMetaAccounts(list);setAdAccount(list[0]?.id??"");
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 async function connectMeta(){
  if(!session||!selected)return;
  try{
   const response=await request<{authorizationUrl:string}>(session,"/v1/orgs/"+selected+"/meta/connect","POST",{});
   if(!response.authorizationUrl.startsWith("https://www.facebook.com/"))throw new Error("Destino OAuth inválido.");
   window.location.assign(response.authorizationUrl);
  }catch(e){setNotice(String(e));}
 }
 async function syncMeta(){
  if(!session||!selected||!adAccount)return;
  try{setBusy(true);
   const result=await request<{count:number;hasNextPage:boolean}>(session,"/v1/orgs/"+selected+"/meta/sync","POST",{accountId:adAccount,since,until,level:metaLevel});
   setNotice(t("Informes publicitarios importados")+": "+result.count+(result.hasNextPage?" · "+t("Resultado parcial: existen páginas adicionales."):""));
   await report(selected,session);
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 async function loadBreakdowns(){
  if(!session||!selected||!adAccount)return;
  try{setBusy(true);const report=await request<{aggregates:typeof breakdowns}>(session,"/v1/orgs/"+selected+"/meta/breakdowns","POST",{accountId:adAccount,since,until});
   setBreakdowns(report.aggregates);setNotice(t("Datos demográficos agregados actualizados."));}
  catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 async function addMember(){
  if(!session||!selected)return;
  try{setBusy(true);await request(session,"/v1/orgs/"+selected+"/members","POST",{userId:memberId,role:memberRole});
   setMemberId("");setNotice(t("Miembro agregado a la organización."));
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 async function createKey(){
  if(!session||!selected)return;
  try{const value=await request<{key:string}>(session,"/v1/orgs/"+selected+"/api-keys","POST",{scope:"write"});
   setNewKey(value.key);setNotice(t("La clave se muestra una sola vez. No la incluyas en el frontend."));
  }catch(e){setNotice(String(e));}
 }
 async function createHook(){
  if(!session||!selected)return;
  try{setNewHook(await request<{endpoint:string;secret:string}>(session,"/v1/orgs/"+selected+"/webhooks","POST",{}));}
  catch(e){setNotice(String(e));}
 }
 async function exportRemote(){
  if(!session||!selected)return;
  try{const response=await request(session,"/v1/orgs/"+selected+"/export");
   const blob=new Blob([JSON.stringify(response,null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="precify-connected-export.json";link.click();URL.revokeObjectURL(url);
  }catch(e){setNotice(String(e));}
 }
 async function eraseData(){
  if(!session||!selected||deletePhrase!=="ELIMINAR")return;
  try{setBusy(true);await request(session,"/v1/orgs/"+selected+"/data","DELETE");
   localStorage.removeItem(summaryKey(session.user.id,selected));setDeletePhrase("");await report(selected,session);
   setNotice(t("Datos conectados eliminados; el área local no fue modificada."));
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 async function deleteOrganization(){
  if(!session||!selected||organizationConfirmation!==selected)return;
  try{
   setBusy(true);
   await request(session,"/v1/orgs/"+selected,"DELETE",{confirmOrganization:selected});
   try{localStorage.removeItem(summaryKey(session.user.id,selected));}catch{}
   setOrganizationConfirmation("");setSelected("");setDashboard(null);setNotice(t("Organización y datos conectados eliminados permanentemente."));
   await loadOrgs(session);
  }catch(e){setNotice(String(e));}finally{setBusy(false);}
 }
 return <section className="main-card connected-lab">
  <span className="eyebrow">{t("OPERACIONES CONECTADAS")}</span>
  <h2>{t("Cuenta opcional, control por organización y API abierta")}</h2>
  <p className="muted">{t("Tu calculadora y tus respaldos locales funcionan sin una cuenta. El modo conectado solo se activa con tu autorización explícita y un servidor configurado.")}</p>
  {!API||!SB||!ANON?<p role="status">{t("El modo conectado no está configurado. Las funciones locales y offline siguen disponibles.")}</p>:
  !session?<div className="advanced-grid">
   <label className="field"><span>{t("Correo electrónico")}</span><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label className="field"><span>{t("Contraseña")}</span><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <div className="advanced-actions"><button className="primary" disabled={busy} onClick={()=>{void submitAuth("login");}}>{t("Iniciar sesión")}</button>
   <button className="secondary" disabled={busy} onClick={()=>{void submitAuth("signup");}}>{t("Crear cuenta gratuita")}</button></div>
  </div>:<>
   <div className="advanced-actions"><span>{session.user.email??session.user.id}</span><button className="secondary" onClick={logout}>{t("Cerrar sesión")}</button></div>
   <div className="advanced-grid">
    <label className="field"><span>{t("Organización")}</span><select value={selected} onChange={e=>{const id=e.target.value;setSelected(id);void report(id,session);}}>
     <option value="">{t("Selecciona una organización")}</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name+" · "+o.role}</option>)}
    </select></label>
    <label className="field"><span>{t("Nueva organización")}</span><input value={newOrg} onChange={e=>setNewOrg(e.target.value)}/></label>
    <button className="secondary" disabled={busy} onClick={()=>{void createOrg();}}>{t("Crear organización")}</button>
   </div>
   {selected&&<>
    <label className="field"><input type="checkbox" checked={cacheConsent} onChange={e=>{const consent=e.target.checked;setCacheConsent(consent);if(!consent&&session&&selected){try{localStorage.removeItem(summaryKey(session.user.id,selected));}catch{}}}}/> {t("Guardar un resumen financiero offline solo en este navegador")}</label>
    <div className="advanced-results">
     <h3>{offline?t("Último informe guardado — no actualizado"):t("Informe conectado")}</h3>
     {!dashboard?<p>{t("No hay un informe conectado disponible.")}</p>:
      <><p className="muted">{dashboard.lastUpdated}</p>
      {dashboard.funnel.map((row,i)=><div key={i} className="list-row"><span>{String(row.currency)} · {t("Pedidos pagados")}: {String(row.paid)} · {t("Ingresos pagados netos")}: {String(row.netCollected)}</span><small>{t("Resultado operacional simplificado")}: {String(row.projectedNet)}</small></div>)}
      {dashboard.reconciliation.map(c=><div className="list-row" key={c.campaignId}><span>{c.campaignId} · {c.currency+" "+c.observedNetRevenue}</span><small>{t("Diferencia frente a la atribución")}: {c.discrepancy}</small></div>)}
      </>}
    </div>
    <div className="advanced-actions">
     <button className="secondary" disabled={busy} onClick={()=>{void report(selected,session);}}>{t("Actualizar informe")}</button>
     <button className="secondary" disabled={busy||offline} onClick={()=>{void uploadLocal();}}>{t("Importar mis datos locales explícitamente")}</button>
     <button className="secondary" onClick={()=>{void exportRemote();}}>{t("Exportar mis datos conectados")}</button>
    </div>
    <div className="advanced-results">
     <h3>{t("Facebook Ads (conexión opcional)")}</h3>
     <div className="advanced-actions"><button disabled={busy||offline} onClick={()=>{void connectMeta();}}>{t("Autorizar Facebook Ads")}</button>
      <button disabled={busy||offline} className="secondary" onClick={()=>{void loadMetaAccounts();}}>{t("Consultar cuentas de anuncios")}</button></div>
     {metaAccounts.length>0&&<div className="advanced-grid">
      <label className="field"><span>{t("Cuenta de anuncios")}</span><select value={adAccount} onChange={e=>setAdAccount(e.target.value)}>{metaAccounts.map(a=><option key={a.id} value={a.id}>{a.name+" ("+a.currency+")"}</option>)}</select></label>
      <label className="field"><span>{t("Nivel del informe")}</span><select value={metaLevel} onChange={e=>setMetaLevel(e.target.value)}><option value="campaign">{t("Campaña")}</option><option value="adset">{t("Conjunto de anuncios")}</option><option value="ad">{t("Anuncio")}</option></select></label>
      <label className="field"><span>{t("Desde")}</span><input type="date" value={since} onChange={e=>setSince(e.target.value)}/></label>
      <label className="field"><span>{t("Hasta")}</span><input type="date" value={until} onChange={e=>setUntil(e.target.value)}/></label>
      <button disabled={busy||offline||!since||!until} onClick={()=>{void syncMeta();}}>{t("Importar métricas de Facebook Ads")}</button>
      <button className="secondary" disabled={busy||offline||!since||!until} onClick={()=>{void loadBreakdowns();}}>{t("Consultar datos agregados de edad y género")}</button>
     </div>}
     {breakdowns.length>0&&<div className="table-scroll"><table><thead><tr><th>{t("Campaña")}</th><th>{t("Edad")}</th><th>{t("Género")}</th><th>{t("Impresiones")}</th><th>{t("Clics")}</th><th>{t("Gasto")}</th></tr></thead><tbody>
      {breakdowns.map((v,i)=><tr key={i}><td>{v.campaignId}</td><td>{v.age}</td><td>{v.gender}</td><td>{v.impressions}</td><td>{v.clicks}</td><td>{v.spend}</td></tr>)}
     </tbody></table></div>}
     <p className="muted">{t("Meta puede exigir revisión del aplicativo y permisos ads_read para acceder a cuentas de terceros.")}</p>
    </div>
    <div className="advanced-results">
     <h3>{t("Miembros y acceso")}</h3>
     <div className="advanced-grid"><label className="field"><span>{t("ID de usuario ya registrado")}</span><input value={memberId} onChange={e=>setMemberId(e.target.value)}/></label>
      <label className="field"><span>{t("Permiso")}</span><select value={memberRole} onChange={e=>setMemberRole(e.target.value)}><option value="viewer">{t("Solo lectura")}</option><option value="analyst">{t("Analista")}</option><option value="admin">{t("Administrador")}</option></select></label>
      <button className="secondary" disabled={busy||offline} onClick={()=>{void addMember();}}>{t("Agregar miembro")}</button></div>
    </div>
    <div className="advanced-results">
     <h3>{t("Integraciones directas (API y webhooks)")}</h3>
     <p className="muted">{t("Las claves son para el backend de tu tienda, nunca para código público del navegador.")}</p>
     <div className="advanced-actions"><button disabled={busy||offline} onClick={()=>{void createKey();}}>{t("Generar clave de integración")}</button>
      <button disabled={busy||offline} onClick={()=>{void createHook();}}>{t("Crear endpoint webhook")}</button></div>
     {newKey&&<label className="field"><span>{t("Clave nueva (copia ahora)")}</span><textarea readOnly rows={2} value={newKey}/></label>}
     {newHook&&<><p>{newHook.endpoint}</p><label className="field"><span>{t("Secreto del webhook (copia ahora)")}</span><textarea readOnly rows={2} value={newHook.secret}/></label></>}
    </div>
    <div className="advanced-results">
     <h3>{t("Privacidad y eliminación")}</h3>
     <p className="muted">{t("La eliminación borra los datos operativos conectados de esta organización. Tus datos locales se mantienen intactos. Exporta un respaldo antes.")}</p>
     <label className="field"><span>{t("Escribe ELIMINAR para confirmar")}</span><input value={deletePhrase} onChange={e=>setDeletePhrase(e.target.value)}/></label>
     <button className="danger" disabled={busy||deletePhrase!=="ELIMINAR"||offline} onClick={()=>{void eraseData();}}>{t("Eliminar datos conectados")}</button>
     <p className="muted">{t("La eliminación anterior conserva tu organización y sus miembros. Para eliminar también cuenta de organización, equipos, llaves y conexiones, escribe el ID de la organización.")}</p>
     <label className="field"><span>{t("Confirma el ID completo de la organización")}: {selected}</span>
      <input value={organizationConfirmation} onChange={e=>setOrganizationConfirmation(e.target.value)} autoComplete="off"/></label>
     <button className="danger" disabled={busy||offline||organizationConfirmation!==selected} onClick={()=>{void deleteOrganization();}}>{t("Eliminar toda la organización permanentemente")}</button>
    </div>
   </>}
  </>}
  {notice&&<p role="status">{t(notice)}</p>}
 </section>;
}
