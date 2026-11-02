import {useContext,useEffect,useRef,useState} from "react";
import {LocaleContext,type Locale} from "./i18n";
import {computeCODFunnel,validateOrderEvent,validateAdCampaign,type OrderEvent,type AdCampaign} from "@precify-colombia/core";
import {applySitePage,purgeSiteCache,readSiteCheckpoint,readSiteRows} from "./website-sync-db";
import {createSiteConnector,createSyncController,type SyncStatus} from "../../../integrations/site-owned-sync.mjs";

type Site={id:string;name:string;url:string;enabled:boolean;interval:number;subject?:string};
import {businessKey,getBusinessScope} from "./BusinessProfiles";
const SETTINGS="precify-colombia:site-owned-connectors:v1";
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
function persistSites(sites:Site[]){localStorage.setItem(siteSettingsKey(),JSON.stringify(sites));}
type Controller={run:(manual?:boolean)=>Promise<SyncStatus>};
export function WebsiteSyncLab({visible}:{visible:boolean}){
 const locale=useContext(LocaleContext) as Locale;
 const t=strings[locale];
 const [sites,setSites]=useState<Site[]>(loadSites),[tokens,setTokens]=useState<Record<string,string>>({});
 const [statuses,setStatuses]=useState<Record<string,SyncStatus>>({});
 const [stats,setStats]=useState<Record<string,{at:number;count:number}>>({});
 const [summaries,setSummaries]=useState<Record<string,Array<{currency:string;orders:number;paid:number;projectedNet:string}>>>({});
 async function loadSnapshot(scope:string,id:string){
  const checkpoint=await readSiteCheckpoint(scope);
  if(checkpoint)setStats(previous=>({...previous,[id]:{at:checkpoint.at,count:checkpoint.count}}));
  const records=await readSiteRows(scope);
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
 function update(next:Site[]){persistSites(next);setSites(next);}
 useEffect(()=>{
  for(const site of sites){if(!site.subject)continue;
   void loadSnapshot(site.id+":"+site.subject,site.id).catch(e=>setNotice(String(e)));
  }
 },[sites.map(s=>s.id+":"+s.subject).join("|")]);
 useEffect(()=>{
  const tasks:Array<()=>void>=[];
  for(const site of sites){
   const token=tokens[site.id];
   if(!site.enabled||!token)continue;
   let stopped=false,handler:()=>void=()=>{};
   const init=async()=>{
    try{
     const connector=createSiteConnector({id:site.id,baseURL:site.url,getToken:()=>token});
     const subject=await connector.identify();
     if(stopped)return;
     if(site.subject!==subject){
      setStats(previous=>{const next={...previous};delete next[site.id];return next;});
      setSummaries(previous=>{const next={...previous};delete next[site.id];return next;});
      setSites(previous=>{const next=previous.map(s=>s.id===site.id?{...s,subject}:s);persistSites(next);return next;});
     }
     const scope=site.id+":"+subject;
     const controller=createSyncController({
      connector,scope,
      store:{read:async key=>await readSiteCheckpoint(key),
       apply:async(key,changes,cursor,expectedCursor)=>{
        if(stopped||!loadSites().some(x=>x.id===site.id&&x.enabled))throw Error("Sync disabled");
        for(const change of changes)if(change.operation==="upsert"){
         if(change.kind==="order")validateOrderEvent(change.value as OrderEvent);
         else validateAdCampaign(change.value as AdCampaign);
        }
        await applySitePage(key,changes,cursor,expectedCursor);
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
    Object.entries(tokens).map(([id,token])=>id+"-"+token).join("|")]);
 async function remove(site:Site){
  setTokens(previous=>{const next={...previous};delete next[site.id];return next;});
  update(sites.filter(s=>s.id!==site.id));
  try{await running.current.get(site.id);}catch{/* Cleanup continues. */}
  await purgeSiteCache(site.id);
  setStats(previous=>{const next={...previous};delete next[site.id];return next;});
  setSummaries(previous=>{const next={...previous};delete next[site.id];return next;});
 }
 async function revoke(site:Site){
  update(sites.map(s=>s.id===site.id?{...s,enabled:false}:s));
  try{await running.current.get(site.id);}catch{/* Cleanup continues. */}
  await purgeSiteCache(site.id);
  setStats(previous=>{const next={...previous};delete next[site.id];return next;});
  setSummaries(previous=>{const next={...previous};delete next[site.id];return next;});
 }
 function add(){
  try{
   const trimmed=name.trim(),base=new URL(url.trim());
   if(!trimmed||trimmed.length>120||!["https:","http:"].includes(base.protocol)||(!["localhost","127.0.0.1"].includes(base.hostname)&&base.protocol!=="https:")||
    base.username||base.password||base.search||base.hash)throw Error(t.fail);
   const entry:Site={id:crypto.randomUUID(),name:trimmed,url:base.toString().replace(/\/$/,""),interval:60000,enabled:false};
   if(sites.length>=20||sites.some(s=>s.url===entry.url))throw Error(t.fail);
   update([...sites,entry]);setName("");setUrl("");setNotice("");
  }catch(e){setNotice(String(e));}
 }
 const statusesText=(site:Site)=>{
  if(!navigator.onLine)return t.offline;
  if(!site.enabled||!tokens[site.id])return t.inactive;
  const value=statuses[site.id];
  return value?.phase==="syncing"?t.running:value?.phase==="error"?t.error:value?.phase==="ready"?t.ready:t.pending;
 };
 return <section className="advanced-results website-sync-lab" style={{display:visible?undefined:"none"}}>
  <h3>{t.title}</h3><p className="muted">{t.description}</p>
  <div className="advanced-grid">
   <label className="field"><span>{t.name}</span><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
   <label className="field"><span>{t.url}</span><input type="url" placeholder="https://store.example" value={url} onChange={e=>setUrl(e.target.value)}/></label>
   <button className="secondary" onClick={add}>{t.add}</button>
  </div>
  {sites.map(site=><div className="advanced-results" key={site.id}>
   <strong>{site.name}</strong><p className="muted">{site.url}</p>
   <div className="advanced-grid">
    <label className="field"><span>{t.token}</span><input type="password" autoComplete="off" value={tokens[site.id]??""} onChange={e=>setTokens(old=>({...old,[site.id]:e.target.value}))}/></label>
    <label className="field"><span>{t.interval}</span><select value={site.interval} onChange={e=>update(sites.map(s=>s.id===site.id?{...s,interval:Number(e.target.value)}:s))}>
     <option value={30000}>{t.thirty}</option><option value={60000}>{t.one}</option>
     <option value={300000}>{t.five}</option><option value={0}>{t.only}</option>
    </select></label>
   </div>
   <label className="field"><input type="checkbox" checked={site.enabled} onChange={e=>{
    if(e.target.checked)update(sites.map(s=>s.id===site.id?{...s,enabled:true}:s));
    else void revoke(site);
   }}/> {t.consent}</label>
   <div className="advanced-actions">
    <button className="secondary" disabled={!site.enabled||!tokens[site.id]||statuses[site.id]?.phase==="syncing"}
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
