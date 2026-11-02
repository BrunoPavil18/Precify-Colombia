import {useContext,useEffect,useRef,useState} from "react";
import {LocaleContext,type Locale} from "./i18n";
import {computeCODFunnel,validateOrderEvent,validateAdCampaign,type OrderEvent,type AdCampaign} from "@precify-financy/core";
import {applySitePage,purgeSiteCache,readSiteCheckpoint,readSiteRows} from "./website-sync-db";
import {createSiteConnector,createSyncController,type SyncStatus} from "../../../integrations/site-owned-sync.mjs";
import {createDeviceConnector} from "../../../integrations/device-client.mjs";
import {readDevice,enrollDevice,deleteDevice,type DeviceIdentity} from "./device-vault";

type Site={id:string;name:string;url:string;enabled:boolean;interval:number;subject?:string;mode?:"device-v2"|"legacy-v1"};
import {businessKey,getBusinessScope} from "./BusinessProfiles";
import {nativeWrite} from "./native-primary";
const SETTINGS="precify-financy:site-owned-connectors:v1";
const siteSettingsKey=()=>businessKey(SETTINGS,getBusinessScope());
const strings={
 "es-CO":{
 title:"Sincronización con tiendas propias",description:"Cada tienda conserva sus datos en su propio servidor. Precify descarga cambios cuando está abierto y conectado.",
 add:"Añadir tienda",name:"Nombre de la tienda",url:"URL HTTPS de la tienda",token:"Token personal de lectura (solo esta sesión)",
 consent:"Permitir guardar datos de esta tienda en este dispositivo",manual:"Sincronizar ahora",remove:"Eliminar conexión y caché",
 last:"Última sincronización",pending:"Conecta una cuenta de lectura para comenzar.",never:"Nunca",ready:"Actualizado",running:"Sincronizando",error:"No se pudo sincronizar",inactive:"Sin autorización",offline:"Sin conexión",
 interval:"Intervalo",one:"Cada minuto",thirty:"Cada 30 segundos",five:"Cada 5 minutos",only:"Solo manual",
 imported:"Cambios en la última actualización",rows:"Registros locales",paid:"Pedidos pagados",profit:"Resultado operacional",security:"No introduzcas claves administrativas ni secretos globales. El token no se guarda en disco; al volver a abrir la aplicación deberás autenticarte. La sincronización requiere que el sitio implemente la API de cambios del protocolo Precify v1.",
 fail:"No fue posible guardar el conector.",needsConsent:"Debes autorizar el guardado local antes de sincronizar."
 },
 "pt-BR":{
 title:"Sincronização com lojas próprias",description:"Cada loja mantém os dados no próprio servidor. O Precify recebe alterações quando está aberto e conectado.",
 add:"Adicionar loja",name:"Nome da loja",url:"URL HTTPS da loja",token:"Token pessoal de leitura (apenas nesta sessão)",
 consent:"Permitir guardar dados desta loja neste dispositivo",manual:"Sincronizar agora",remove:"Excluir conexão e cache",
 last:"Última sincronização",pending:"Conecte uma conta de leitura para começar.",never:"Nunca",ready:"Atualizado",running:"Sincronizando",error:"Falha na sincronização",inactive:"Sem autorização",offline:"Sem conexão",
 interval:"Intervalo",one:"A cada 1 minuto",thirty:"A cada 30 segundos",five:"A cada 5 minutos",only:"Somente manual",
 imported:"Alterações na última atualização",rows:"Registros locais",paid:"Pedidos pagos",profit:"Resultado operacional",security:"Não insira chaves administrativas nem segredos globais. O token não é salvo em disco; ao reabrir o aplicativo, será necessário autenticar-se. A loja precisa implementar a API de alterações do protocolo Precify v1.",
 fail:"Não foi possível salvar o conector.",needsConsent:"Autorize o armazenamento local para sincronizar."
 },
 en:{
 title:"Connect your own stores",description:"Each store keeps its data on its own server. Precify pulls changes while the app is open and connected.",
 add:"Add store",name:"Store name",url:"Store HTTPS URL",token:"Personal read-only token (this session only)",
 consent:"Allow this device to save data from this store",manual:"Sync now",remove:"Remove connection and cache",
 last:"Last synchronization",pending:"Connect a read-only account to begin.",never:"Never",ready:"Up to date",running:"Syncing",error:"Sync failed",inactive:"Not authorized",offline:"Offline",
 interval:"Interval",one:"Every minute",thirty:"Every 30 seconds",five:"Every 5 minutes",only:"Manual only",
 imported:"Changes received on last sync",rows:"Local records",paid:"Paid orders",profit:"Operational result",security:"Never enter admin API keys or global secrets. Tokens are not saved to disk; sign in again after reopening the app. The store must implement the Precify v1 change-feed API.",
 fail:"Could not save connector.",needsConsent:"Authorize local storage before syncing."
 }
} as const;
function loadSites():Site[]{
 try{const raw=localStorage.getItem(siteSettingsKey());if(!raw)return [];
  const values=JSON.parse(raw) as Site[];
  if(!Array.isArray(values)||values.length>20)return [];
  return values.filter(x=>x&&/^[0-9a-f-]{36}$/i.test(x.id)&&typeof x.url==="string"&&typeof x.name==="string"&&
   [0,30000,60000,300000].includes(x.interval)&&typeof x.enabled==="boolean");
 }catch{return [];}
}
async function persistSites(sites:Site[]){const before=localStorage.getItem(siteSettingsKey());const content=JSON.stringify(sites);await nativeWrite("site-connectors",getBusinessScope(),content,before);}
type Controller={run:(manual?:boolean)=>Promise<SyncStatus>};
export function WebsiteSyncLab({visible}:{visible:boolean}){
 const businessId=useRef(getBusinessScope()).current;
 const locale=useContext(LocaleContext) as Locale;
 const t=strings[locale];
 const [sites,setSites]=useState<Site[]>(loadSites),[tokens,setTokens]=useState<Record<string,string>>({});
 const [devices,setDevices]=useState<Record<string,DeviceIdentity>>({});
 const [codes,setCodes]=useState<Record<string,string>>({});
 const [activating,setActivating]=useState<Record<string,boolean>>({});
 useEffect(()=>{
  let cancelled=false;
  void Promise.all(sites.filter(s=>s.mode==="device-v2").map(async site=>[site.id,await readDevice(businessId,site.id)] as const))
   .then(rows=>{if(!cancelled)setDevices(Object.fromEntries(rows.filter(([,v])=>v)) as Record<string,DeviceIdentity>);})
   .catch(e=>{if(!cancelled)setNotice(String(e));});
  return()=>{cancelled=true;};
 },[businessId,sites.map(s=>s.id+":"+s.mode).join("|")]);
 const [statuses,setStatuses]=useState<Record<string,SyncStatus>>({});
 const [stats,setStats]=useState<Record<string,{at:number;count:number}>>({});
 const [summaries,setSummaries]=useState<Record<string,Array<{currency:string;orders:number;paid:number;projectedNet:string}>>>({});
 async function loadSnapshot(scope:string,id:string){
  const checkpoint=await readSiteCheckpoint(scope,businessId);
  if(checkpoint)setStats(previous=>({...previous,[id]:{at:checkpoint.at,count:checkpoint.count}}));
  const records=await readSiteRows(scope,20000,businessId);
  const byCurrency=new Map<string,OrderEvent[]>();
  for(const record of records){
   if(record.kind!=="order")continue;
   const event=validateOrderEvent(record.value as unknown as OrderEvent);
   const current=byCurrency.get(event.currency)??[];
   current.push(event);byCurrency.set(event.currency,current);
  }
  setSummaries(previous=>({...previous,[id]:[...byCurrency].map(([currency,events])=>{
   const result=computeCODFunnel(events);
   return {currency,orders:result.orders,paid:result.paid,projectedNet:result.projectedNet};
  })}));
 }
 const [notice,setNotice]=useState("");
 const [name,setName]=useState(""),[url,setUrl]=useState("");
 const controllers=useRef(new Map<string,Controller>());
 const running=useRef(new Map<string,Promise<SyncStatus>>());
 async function update(next:Site[]){try{await persistSites(next);setSites(next);}catch(e){setNotice(String(e));throw e;}}
 useEffect(()=>{
  for(const site of sites){if(!site.subject)continue;
   void loadSnapshot(site.id+":"+site.subject,site.id).catch(e=>setNotice(String(e)));
  }
 },[sites.map(s=>s.id+":"+s.subject).join("|")]);
 useEffect(()=>{
  const tasks:Array<()=>void>=[];
  for(const site of sites){
   const token=tokens[site.id];
   const device=devices[site.id];
   if(!site.enabled||!(site.mode==="device-v2"?device:token))continue;
   let stopped=false,handler:()=>void=()=>{};
   const init=async()=>{
    try{
     const connector=site.mode==="device-v2"?createDeviceConnector({id:site.id,baseURL:site.url,identity:device!}):createSiteConnector({id:site.id,baseURL:site.url,getToken:()=>token??""});
     const subject=await connector.identify();
     if(stopped)return;
     if(site.subject!==subject){
      setStats(previous=>{const next={...previous};delete next[site.id];return next;});
      setSummaries(previous=>{const next={...previous};delete next[site.id];return next;});
      const next=sites.map(s=>s.id===site.id?{...s,subject}:s);await update(next);
     }
     const scope=site.id+":"+subject;
     const controller=createSyncController({
      connector,scope,
      store:{read:async key=>await readSiteCheckpoint(key,businessId),
       apply:async(key,changes,cursor,expectedCursor)=>{
        if(stopped||!loadSites().some(x=>x.id===site.id&&x.enabled))throw Error("Sync disabled");
        for(const change of changes)if(change.operation==="upsert"){
         if(change.kind==="order")validateOrderEvent(change.value as OrderEvent);
         else validateAdCampaign(change.value as AdCampaign);
        }
        await applySitePage(key,changes,cursor,expectedCursor,businessId);
       }},
      onState:state=>{if(!stopped)setStatuses(previous=>({...previous,[site.id]:state}));}
     });
     const run=async(manual=false)=>{
      if(stopped||(!manual&&!navigator.onLine))return controller.getState();
      const result=controller.run(manual);
      running.current.set(site.id,result);
      await result;
      running.current.delete(site.id);
      if(stopped)return result;
      await loadSnapshot(scope,site.id);
      return result;
     };
     controllers.current.set(site.id,{run});
     handler=()=>{void run();};
     if(site.interval>0&&navigator.onLine)void run();
     const interval=site.interval>0?window.setInterval(()=>{if(navigator.onLine&&!document.hidden)void run();},site.interval):undefined;
     if(site.interval>0)window.addEventListener("online",handler);
     const visibility=()=>{if(site.interval>0&&!document.hidden)handler();};
     if(site.interval>0)document.addEventListener("visibilitychange",visibility);
     tasks.push(()=>{if(interval!==undefined)window.clearInterval(interval);
      window.removeEventListener("online",handler);document.removeEventListener("visibilitychange",visibility);});
    }catch(e){if(!stopped)setStatuses(previous=>({...previous,[site.id]:{
      phase:"error",lastError:String(e),lastSuccess:null,pulled:0
    }}));}
   };
   void init();
   tasks.push(()=>{stopped=true;controllers.current.delete(site.id);});
  }
  return ()=>{for(const close of tasks)close();};
 },[sites.map(s=>s.id+"-"+s.url+"-"+s.enabled+"-"+s.interval+"-"+s.subject).join("|"),
    Object.entries(tokens).map(([id,token])=>id+"-"+token).join("|"),
     Object.entries(devices).map(([id,device])=>id+"-"+device.deviceId).join("|")]);
 async function remove(site:Site){
  setTokens(previous=>{const next={...previous};delete next[site.id];return next;});
  await update(sites.filter(s=>s.id!==site.id));
  if(site.mode==="device-v2")await deleteDevice(businessId,site.id);
  try{await running.current.get(site.id);}catch{/* Cleanup continues. */}
  await purgeSiteCache(site.id,businessId);
  setStats(previous=>{const next={...previous};delete next[site.id];return next;});
  setSummaries(previous=>{const next={...previous};delete next[site.id];return next;});
 }
 async function revoke(site:Site){
  await update(sites.map(s=>s.id===site.id?{...s,enabled:false}:s));
  try{await running.current.get(site.id);}catch{/* Cleanup continues. */}
  await purgeSiteCache(site.id,businessId);
  setStats(previous=>{const next={...previous};delete next[site.id];return next;});
  setSummaries(previous=>{const next={...previous};delete next[site.id];return next;});
 }
 async function add(){
  try{
   const trimmed=name.trim(),base=new URL(url.trim());
   if(!trimmed||trimmed.length>120||!["https:","http:"].includes(base.protocol)||(!["localhost","127.0.0.1"].includes(base.hostname)&&base.protocol!=="https:")||
    base.username||base.password||base.search||base.hash)throw Error(t.fail);
   const entry:Site={id:crypto.randomUUID(),name:trimmed,url:base.toString().replace(/\/$/,""),interval:60000,enabled:false,mode:"device-v2"};
   if(sites.length>=20||sites.some(s=>s.url===entry.url))throw Error(t.fail);
   update([...sites,entry]);setName("");setUrl("");setNotice("");
  }catch(e){setNotice(String(e));}
 }
 const statusesText=(site:Site)=>{
  if(!navigator.onLine)return t.offline;
  if(!site.enabled||!(site.mode==="device-v2"?devices[site.id]:tokens[site.id]))return t.inactive;
  const value=statuses[site.id];
  return value?.phase==="syncing"?t.running:value?.phase==="error"?t.error:value?.phase==="ready"?t.ready:t.pending;
 };
 return <section className="advanced-results website-sync-lab" style={{display:visible?undefined:"none"}}>
  <h3>{t.title}</h3><p className="muted">{t.description}</p>
  <div className="advanced-grid">
   <label className="field"><span>{t.name}</span><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
   <label className="field"><span>{t.url}</span><input type="url" placeholder="https://store.example" value={url} onChange={e=>setUrl(e.target.value)}/></label>
   <button className="secondary" onClick={()=>{void add();}}>{t.add}</button>
  </div>
  {sites.map(site=><div className="advanced-results" key={site.id}>
   <strong>{site.name}</strong><p className="muted">{site.url}</p>
   <div className="advanced-grid">
    {site.mode==="device-v2"?<div className="field">
     <span>{locale==="pt-BR"?"Convite de ativação único (gerado pela loja)":locale==="en"?"Single-use enrollment code":"Código de activación único"}</span>
     {devices[site.id]?<p className="muted">{locale==="pt-BR"?"Instalação ativada":locale==="en"?"Device activated":"Dispositivo activado"} · {devices[site.id]?.deviceId.slice(0,8)}…</p>:<>
      <input type="password" autoComplete="new-password" maxLength={256} value={codes[site.id]??""} onChange={e=>setCodes(p=>({...p,[site.id]:e.target.value}))}/>
      <button className="secondary" disabled={activating[site.id]||!(codes[site.id]??"").trim()} onClick={()=>{void (async()=>{
       setActivating(p=>({...p,[site.id]:true}));
       try{const identity=await enrollDevice(businessId,site.id,site.url,codes[site.id]??"");
        setDevices(p=>({...p,[site.id]:identity}));setCodes(p=>({...p,[site.id]:""}));
        setNotice(locale==="pt-BR"?"Instalação ativada com sucesso.":locale==="en"?"Device activated.":"Dispositivo activado.");
       }catch(e){setNotice(String(e));}finally{setActivating(p=>({...p,[site.id]:false}));}
      })();}}>{locale==="pt-BR"?"Ativar instalação":locale==="en"?"Activate installation":"Activar instalación"}</button>
     </>}
    </div>:<label className="field"><span>{t.token}</span><input type="password" autoComplete="off" value={tokens[site.id]??""} onChange={e=>setTokens(old=>({...old,[site.id]:e.target.value}))}/></label>}
    <label className="field"><span>{t.interval}</span><select value={site.interval} onChange={e=>{void update(sites.map(s=>s.id===site.id?{...s,interval:Number(e.target.value)}:s)).catch(()=>{});}}>
     <option value={30000}>{t.thirty}</option><option value={60000}>{t.one}</option>
     <option value={300000}>{t.five}</option><option value={0}>{t.only}</option>
    </select></label>
   </div>
   <label className="field"><input type="checkbox" checked={site.enabled} onChange={e=>{
    if(e.target.checked)void update(sites.map(s=>s.id===site.id?{...s,enabled:true}:s)).catch(()=>{});
    else void revoke(site);
   }}/> {t.consent}</label>
   <div className="advanced-actions">
    <button className="secondary" disabled={!site.enabled||!(site.mode==="device-v2"?devices[site.id]:tokens[site.id])||statuses[site.id]?.phase==="syncing"}
     onClick={()=>{const controller=controllers.current.get(site.id);
      if(!controller){setNotice(t.pending);return;}
      void controller.run(true).catch(e=>setNotice(String(e)));
     }}>{t.manual}</button>
    <button className="danger" onClick={()=>{void remove(site);}}>{t.remove}</button>
   </div>
   <p role="status">{statusesText(site)}
    {statuses[site.id]?.lastError?" · "+(statuses[site.id]?.lastError??""):""}</p>
   <small>{t.last}: {stats[site.id]?.at?new Date(stats[site.id]?.at??0).toLocaleString(locale):t.never}
    {" · "}{t.rows}: {stats[site.id]?.count??0}
    {" · "}{t.imported}: {statuses[site.id]?.pulled??0}</small>
   {summaries[site.id]?.map((s,index)=><div className="list-row" key={s.currency+index}>
    <span>{s.currency} · {s.orders} · {t.paid}: {s.paid}</span>
    <small>{t.profit}: {s.currency} {s.projectedNet}</small>
   </div>)}
  </div>)}
  <p className="muted"><small>{t.security}</small></p>
  {notice&&<p role="alert">{notice}</p>}
 </section>;
}
