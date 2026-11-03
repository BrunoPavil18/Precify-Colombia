import {useEffect,useState} from "react";
import {businessKey} from "./BusinessProfiles";
import {readSiteCheckpoint} from "./website-sync-db";
import {CATALOG_MIRROR_KEY,CATALOG_UPDATED,readStoreCatalog} from "./store-catalog";
import {useContext} from "react";
import {LocaleContext} from "./i18n";
type Link={id:string;name:string;subject?:string;enabled:boolean};
type Row={name:string;products:number;events:number;at:number|null;paused:boolean};
const CONFIG="precify-financy:site-owned-connectors:v1";
/** Separate source-read dashboard: no financial totals and no mutation of manual workspace. */
export function ConnectedSourcesOverview({businessId}:{businessId:string}){
 const locale=useContext(LocaleContext);
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState("");
 useEffect(()=>{
  let live=true;
  async function load(){
   try{
    const raw=localStorage.getItem(businessKey(CONFIG,businessId));
    const sites=raw?JSON.parse(raw) as Link[]:[];
    if(!Array.isArray(sites)||sites.length>20)throw Error("Invalid store connector directory");
    const catalog=readStoreCatalog(businessId);
    const next=await Promise.all(sites.filter(s=>s&&typeof s.id==="string"&&typeof s.name==="string").map(async site=>{
     const checkpoint=site.subject?await readSiteCheckpoint(site.id+":"+site.subject,businessId):null;
     return {name:site.name,products:catalog.sites[site.id]?.products.length??0,
      events:checkpoint?.count??0,at:checkpoint?.at??null,paused:!site.enabled};
    }));
    if(live){setRows(next);setError("");}
   }catch(e){if(live)setError(String(e));}
  }
  const onCatalog=(event:Event)=>{if((event as CustomEvent<string>).detail===businessId)void load();};
  const onFeed=()=>{void load();};
  const onStorage=(e:StorageEvent)=>{if(e.key===businessKey(CONFIG,businessId)||e.key===businessKey(CATALOG_MIRROR_KEY,businessId))void load();};
  void load();
  window.addEventListener(CATALOG_UPDATED,onCatalog);
  window.addEventListener("precify:site-feed-updated",onFeed);
  window.addEventListener("storage",onStorage);
  return()=>{live=false;window.removeEventListener(CATALOG_UPDATED,onCatalog);
   window.removeEventListener("precify:site-feed-updated",onFeed);window.removeEventListener("storage",onStorage);};
 },[businessId]);
 if(!rows.length&&!error)return null;
 return <section className="main-card" aria-label={locale==="pt-BR"?"Fontes de loja sincronizadas":locale==="en"?"Synced store sources":"Fuentes sincronizadas de tiendas"}>
  <span className="eyebrow">{locale==="pt-BR"?"LOJAS CONECTADAS · SOMENTE LEITURA":locale==="en"?"CONNECTED STORES · READ ONLY":"TIENDAS CONECTADAS · SOLO LECTURA"}</span>
  <h2>{locale==="pt-BR"?"Dados recebidos das lojas":locale==="en"?"Store data received":"Datos recibidos de tiendas"}</h2>
  <p className="muted">{locale==="pt-BR"?"Contagens por origem, sem misturar produtos espelhados com produtos financeiros manuais ou inferir pagamentos.":locale==="en"?"Source counts only: mirrored and manual products stay distinct; no payments are inferred.":"Solo cantidades por origen. Productos de tiendas y manuales separados; no se infieren pagos."}</p>
  {error&&<p role="alert">{error}</p>}
  {rows.map((row,i)=><div className="list-row" key={i}>
   <span><strong>{row.name}</strong> · {row.products} {locale==="pt-BR"?"produtos publicados":locale==="en"?"published products":"productos publicados"}</span>
   <small>{row.events} {locale==="pt-BR"?"registros operacionais":locale==="en"?"operational records":"registros operacionales"}
    {row.paused?" · "+(locale==="pt-BR"?"Pausado":locale==="en"?"Paused":"Pausado"):""}
    {row.at?" · "+new Date(row.at).toLocaleString(locale):""}</small>
  </div>)}
 </section>;
}
