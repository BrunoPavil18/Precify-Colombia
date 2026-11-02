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
const strings={
 "es-CO":{
 title:"Sincronización con tiendas propias",description:"Cada tienda conserva sus datos en su propio servidor. Precify descarga cambios cuando está abierto y conectado.",
 add:"Añadir tienda",name:"Nombre de la tienda",url:"URL HTTPS de la tienda",token:"Token personal de lectura (solo esta sesión)",
 consent:"Permitir guardar datos de esta tienda en este dispositivo",manual:"Sincronizar ahora",remove:"Eliminar conexión y caché",
 last:"Última sincronización",pending:"Activa esta instalación con un código emitido por la tienda.",never:"Nunca",ready:"Actualizado",running:"Sincronizando",error:"No se pudo sincronizar",inactive:"Sin autorización",offline:"Sin conexión",
 interval:"Intervalo",one:"Cada minuto",thirty:"Cada 30 segundos",five:"Cada 5 minutos",only:"Solo manual",
 imported:"Cambios en la última actualización",rows:"Registros locales",paid:"Pedidos pagados",profit:"Resultado operacional",security:"Conexiones nuevas: protocolo v2. Cada instalación tiene su propia clave Ed25519, vinculada a una invitación de un solo uso emitida por la tienda. No introduzcas secretos administrativos. La tienda debe implementar la API v2 para activar y sincronizar.",
 fail:"No fue posible guardar el conector.",needsConsent:"Debes autorizar el guardado local antes de sincronizar."
 },
 "pt-BR":{
 title:"Sincronização com lojas próprias",description:"Cada loja mantém os dados no próprio servidor. O Precify recebe alterações quando está aberto e conectado.",
 add:"Adicionar loja",name:"Nome da loja",url:"URL HTTPS da loja",token:"Token pessoal de leitura (apenas nesta sessão)",
 consent:"Permitir guardar dados desta loja neste dispositivo",manual:"Sincronizar agora",remove:"Excluir conexão e cache",
 last:"Última sincronização",pending:"Ative esta instalação com um código emitido pela loja.",never:"Nunca",ready:"Atualizado",running:"Sincronizando",error:"Falha na sincronização",inactive:"Sem autorização",offline:"Sem conexão",
 interval:"Intervalo",one:"A cada 1 minuto",thirty:"A cada 30 segundos",five:"A cada 5 minutos",only:"Somente manual",
 imported:"Alterações na última atualização",rows:"Registros locais",paid:"Pedidos pagos",profit:"Resultado operacional",security:"Novas conexões: protocolo v2. Cada instalação tem sua própria chave Ed25519, ativada por convite de uso único emitido pela loja. Não informe segredos administrativos. A loja precisa implementar a API v2 para ativação e sincronização.",
 fail:"Não foi possível salvar o conector.",needsConsent:"Autorize o armazenamento local para sincronizar."
 },
 en:{
 title:"Connect your own stores",description:"Each store keeps its data on its own server. Precify pulls changes while the app is open and connected.",
 add:"Add store",name:"Store name",url:"Store HTTPS URL",token:"Personal read-only token (this session only)",
 consent:"Allow this device to save data from this store",manual:"Sync now",remove:"Remove connection and cache",
 last:"Last synchronization",pending:"Activate this installation using a code issued by the store.",never:"Never",ready:"Up to date",running:"Syncing",error:"Sync failed",inactive:"Not authorized",offline:"Offline",
 interval:"Interval",one:"Every minute",thirty:"Every 30 seconds",five:"Every 5 minutes",only:"Manual only",
 imported:"Changes received on last sync",rows:"Local records",paid:"Paid orders",profit:"Operational result",security:"New connections use protocol v2. Each installation has its own Ed25519 key activated by a single-use invitation issued by the store. Never enter administrator secrets. The store must implement the v2 API for activation and synchronization.",
 fail:"Could not save connector.",needsConsent:"Authorize local storage before syncing."
 }
} as const;
function loadSites(businessId=getBusinessScope()):Site[]{
 try{const raw=localStorage.getItem(businessKey(SETTINGS,businessId));if(!raw)return [];
  const values=JSON.parse(raw) as Site[];
  if(!Array.isArray(values)||values.length>20)return [];
  return values.filter(x=>x&&/^[0-9a-f-]{36}$/i.test(x.id)&&typeof x.url==="string"&&typeof x.name==="string"&&
   [0,30000,60000,300000].includes(x.interval)&&typeof x.enabled==="boolean");
 }catch{return [];}
}
async function persistSites(sites:Site[],businessId:string){const before=localStorage.getItem(businessKey(SETTINGS,businessId));const content=JSON.stringify(sites);await nativeWrite("site-connectors",businessId,content,before);}
type Controller={run:(manual?:boolean)=>Promise<SyncStatus>};
export function WebsiteSyncLab({visible}:{visible:boolean}){
 const businessId=useRef(getBusinessScope()).current;
 const locale=useContext(LocaleContext) as Locale;
 const t=strings[locale];
 const [sites,setSites]=useState<Site[]>(loadSites),[tokens,setTokens]=useState<Record<string,string>>({});
 const [devices,setDevices]=useState<Record<string,DeviceIdentity>>({});
 const [codes,setCodes]=useState<Record<string,string>>({});
 const [activating,setActivating]=useState<Record<string,boolean>>({});
 const [guideOpen,setGuideOpen]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  void Promise.all(sites.filter(s=>s.mode==="device-v2").map(async site=>[site.id,await readDevice(businessId,site.id,site.url)] as const))
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
 async function update(next:Site[]){try{await persistSites(next,businessId);setSites(next);}catch(e){setNotice(String(e));throw e;}}
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
   let stopped=false,handler:()=>void=()=>{},teardown:()=>void=()=>{};
   // Register cleanup synchronously: async identity verification may finish after unmount.
   tasks.push(()=>{stopped=true;teardown();controllers.current.delete(site.id);});
   const init=async()=>{
    try{
     const connector=site.mode==="device-v2"?createDeviceConnector({id:site.id,baseURL:site.url,identity:device!}):createSiteConnector({id:site.id,baseURL:site.url,getToken:()=>token??""});
     const subject=await connector.identify();
     if(stopped)return;
     if(site.subject!==subject){
      setStats(previous=>{const next={...previous};delete next[site.id];return next;});
      setSummaries(previous=>{const next={...previous};delete next[site.id];return next;});
      const next=loadSites(businessId).map(s=>s.id===site.id?{...s,subject}:s);
      if(!next.some(s=>s.id===site.id&&s.enabled))return;
      await update(next);
      if(stopped)return;
     }
     const scope=site.id+":"+subject;
     const controller=createSyncController({
      connector,scope,
      store:{read:async key=>await readSiteCheckpoint(key,businessId),
       apply:async(key,changes,cursor,expectedCursor)=>{
        if(stopped||!loadSites(businessId).some(x=>x.id===site.id&&x.enabled))throw Error("Sync disabled");
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
      const existing=running.current.get(site.id);
      if(existing)return existing;
      // Keep the entire fetch + report refresh in flight, so disabling/removing
      // a connection waits for all reads before purging its local records.
      const task=(async()=>{
       const result=await controller.run(manual);
       if(!stopped)await loadSnapshot(scope,site.id);
       return result;
      })();
      running.current.set(site.id,task);
      try{return await task;}
      finally{if(running.current.get(site.id)===task)running.current.delete(site.id);}
     };
     controllers.current.set(site.id,{run});
     handler=()=>{void run().catch(e=>{if(!stopped)setNotice(String(e));});};
     if(site.interval>0&&navigator.onLine)handler();
     const interval=site.interval>0?window.setInterval(()=>{if(navigator.onLine&&!document.hidden)handler();},site.interval):undefined;
     if(site.interval>0)window.addEventListener("online",handler);
     const visibility=()=>{if(site.interval>0&&!document.hidden)handler();};
     if(site.interval>0)document.addEventListener("visibilitychange",visibility);
     teardown=()=>{if(interval!==undefined)window.clearInterval(interval);
      window.removeEventListener("online",handler);document.removeEventListener("visibilitychange",visibility);};
     if(stopped)teardown();
    }catch(e){if(!stopped)setStatuses(previous=>({...previous,[site.id]:{
      phase:"error",lastError:String(e),lastSuccess:null,pulled:0
    }}));}
   };
   void init();
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
   await update([...sites,entry]);setName("");setUrl("");setNotice("");
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
  <p className="muted">{locale==="pt-BR"?"Cada código só ativa um computador. Remover a conexão local não revoga o dispositivo no servidor; revogue-o também no painel da loja.":locale==="en"?"Each code can activate only one installation. Removing the local connection does not revoke the device on the store server; revoke it from the store's admin panel.":"Cada código solo activa una instalación. Eliminar la conexión local no revoca el dispositivo en el servidor; revócalo también en la administración de la tienda."}</p>
  <div className="connection-onboarding" role="note">
   <strong>{locale==="pt-BR"?"Como conectar uma loja":locale==="en"?"How to connect a store":"Cómo conectar una tienda"}</strong>
   <ol>
    <li>{locale==="pt-BR"?"O administrador da loja habilita a API Precify v2 no próprio site e emite um convite de uso único.":locale==="en"?"The store administrator enables the Precify v2 API on the site and issues a single-use invitation.":"El administrador habilita la API Precify v2 en su sitio y emite una invitación de un solo uso."}</li>
    <li>{locale==="pt-BR"?"Informe o nome e a URL HTTPS da loja aqui e clique em Adicionar loja.":locale==="en"?"Enter the store name and HTTPS URL here, then select Add store.":"Escribe el nombre y la URL HTTPS de la tienda y selecciona Añadir tienda."}</li>
    <li>{locale==="pt-BR"?"Cole o convite no cartão da loja, ative esta instalação e autorize a sincronização.":locale==="en"?"Paste the invitation into the store card, activate this installation and authorize synchronization.":"Pega la invitación en la tarjeta de la tienda, activa la instalación y autoriza la sincronización."}</li>
   </ol>
   <p className="muted">{locale==="pt-BR"?"Enquanto o site não implementar essa API, você pode cadastrar a loja, mas não ativá-la ou receber pedidos reais. Nenhuma conta central do Precify é necessária.":locale==="en"?"Until the site implements this API, you can add it but cannot activate or receive real orders. No central Precify account is needed.":"Hasta que el sitio implemente esta API, puedes registrarlo, pero no activarlo ni recibir pedidos reales. No necesitas una cuenta central de Precify."}</p>
   <button type="button" className="secondary" aria-expanded={guideOpen} aria-controls="precify-site-integration-guide" onClick={()=>setGuideOpen(value=>!value)}>
    {locale==="pt-BR"?"Guia técnico para integrar seu site":locale==="en"?"Technical guide for integrating your site":"Guía técnica para integrar tu sitio"} {guideOpen?"−":"+"}
   </button>
   {guideOpen&&<div id="precify-site-integration-guide" role="region" aria-label={locale==="pt-BR"?"Manual de integração da loja":locale==="en"?"Store integration manual":"Manual de integración de la tienda"} className="connection-technical-guide">
    <h4>{locale==="pt-BR"?"Configuração no servidor da loja":locale==="en"?"Store backend setup":"Configuración en el servidor de la tienda"}</h4>
    <p>{locale==="pt-BR"?"O convite não cria a API sozinho. Um desenvolvedor precisa instalar o adaptador no backend da loja, usando o banco de dados da própria loja. Não é necessário criar contas no Precify.":locale==="en"?"An invitation does not create an API automatically. A developer must integrate the adapter into the store backend, using the store's own database. No Precify accounts are required.":"Una invitación no crea la API automáticamente. Un desarrollador debe integrar el adaptador en el backend, usando la propia base de datos de la tienda. No se requieren cuentas de Precify."}</p>
    <ol>
     <li>{locale==="pt-BR"?"Escolha a migração SQL para MySQL 8 ou PostgreSQL em integrations/sql e aplique-a apenas no banco da loja, após backup.":locale==="en"?"Choose the MySQL 8 or PostgreSQL migration from integrations/sql and apply it only to the store database after taking a backup.":"Elige la migración para MySQL 8 o PostgreSQL de integrations/sql y aplícala únicamente a la base de la tienda después de un respaldo."}</li>
     <li>{locale==="pt-BR"?"Implemente os adaptadores de dispositivos, convites de uso único e feed durável de pedidos. Exponha os três endpoints HTTPS abaixo.":locale==="en"?"Implement the device adapter, single-use invitations and a durable order feed. Expose the three HTTPS endpoints below.":"Implementa el adaptador de dispositivos, invitaciones de un solo uso y un feed duradero de pedidos. Expón los tres endpoints HTTPS siguientes."}</li>
     <li>{locale==="pt-BR"?"No painel administrativo da loja, permita emitir convites temporários, listar dispositivos autorizados e revogar acessos. Nunca disponibilize a emissão de convites ao público.":locale==="en"?"In the store admin, allow issuing short-lived invitations, listing authorized devices and revoking access. Never expose invitation issuance publicly.":"En el panel administrativo, permite emitir invitaciones temporales, listar dispositivos autorizados y revocar accesos. Nunca permitas la emisión pública."}</li>
     <li>{locale==="pt-BR"?"Ative uma instalação com cada convite. A loja deve rejeitar reutilização com HTTP 409 e verificar assinatura Ed25519, nonce, horário, escopo e revogação.":locale==="en"?"Activate one installation per invitation. The store must reject reuse with HTTP 409 and verify the Ed25519 signature, nonce, timestamp, scope and revocation.":"Activa una instalación por invitación. La tienda debe rechazar la reutilización con HTTP 409 y comprobar firma Ed25519, nonce, fecha, permisos y revocación."}</li>
    </ol>
    <p><strong>{locale==="pt-BR"?"Endpoints exigidos":locale==="en"?"Required endpoints":"Endpoints obligatorios"}</strong></p>
    <pre>{`POST /precify/v2/activate\nGET  /precify/v2/identity\nGET  /precify/v2/changes`}</pre>
    <p>{locale==="pt-BR"?"Obrigatório: HTTPS, CORS restrito, limite de tentativas, retenção de eventos, isolamento entre lojas e ausência de dados pessoais desnecessários. A sincronização só ocorre enquanto o Precify está aberto.":locale==="en"?"Required: HTTPS, restricted CORS, rate limiting, durable events, store isolation and no unnecessary personal data. Precify syncs only while open.":"Obligatorio: HTTPS, CORS restringido, límite de intentos, eventos duraderos, aislamiento por tienda y sin datos personales innecesarios. Precify sincroniza solo mientras está abierto."}</p>
    <p><a href="https://github.com/BrunoPavil18/Precify-Financy/blob/feat/precify-colombia-v2.1.0/docs/STORE_DEVICE_API_V2.md" target="_blank" rel="noopener noreferrer">{locale==="pt-BR"?"Documentação completa e arquivos do adaptador (GitHub)":locale==="en"?"Full documentation and adapter files (GitHub)":"Documentación completa y archivos del adaptador (GitHub)"}</a></p>
    <label className="field"><span>{locale==="pt-BR"?"Se o link externo não abrir no Windows, copie este endereço:":locale==="en"?"If the external link does not open on Windows, copy this URL:":"Si el enlace externo no abre en Windows, copia esta dirección:"}</span>
     <input type="text" readOnly onFocus={e=>e.target.select()} aria-label={locale==="pt-BR"?"Endereço para copiar do guia técnico":locale==="en"?"Copyable technical manual URL":"Dirección del manual para copiar"} value="https://github.com/BrunoPavil18/Precify-Financy/blob/feat/precify-colombia-v2.1.0/docs/STORE_DEVICE_API_V2.md"/>
    </label>
   </div>}
  </div>
  <div className="advanced-grid">
   <label className="field"><span>{t.name}</span><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
   <label className="field"><span>{t.url}</span><input type="url" placeholder="https://store.example" value={url} onChange={e=>setUrl(e.target.value)}/></label>
   <button className="secondary" onClick={()=>{void add();}}>{t.add}</button>
  </div>
  {sites.length===0&&<p role="status" className="muted">{locale==="pt-BR"?"Nenhuma loja cadastrada neste negócio. Cadastre uma loja acima para iniciar o vínculo por dispositivo.":locale==="en"?"No store registered for this business. Add one above to start per-device enrollment.":"No hay tiendas registradas para este negocio. Añade una arriba para comenzar la activación por dispositivo."}</p>}
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
  {sites.some(site=>site.mode!=="device-v2")&&<p className="muted"><small>{locale==="pt-BR"?"Conexões antigas com token v1 continuam disponíveis apenas para compatibilidade; não reutilize tokens administrativos.":locale==="en"?"Existing v1 bearer-token connections remain for compatibility only; never use administrator tokens.":"Las conexiones anteriores con token v1 permanecen solo por compatibilidad; no utilices tokens administrativos."}</small></p>}
  {notice&&<p role="alert">{notice}</p>}
 </section>;
}
