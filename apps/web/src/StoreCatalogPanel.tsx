import {useContext,useEffect,useMemo,useState} from "react";
import {LocaleContext} from "./i18n";
import {CATALOG_MIRROR_KEY,CATALOG_UPDATED,readStoreCatalog,type StoreCatalogState,type StoreProduct} from "./store-catalog";
import {businessKey} from "./BusinessProfiles";

/** A view of catalog items synced from the store. Does not mutate manual products. */
export function StoreCatalogPanel({businessId,onDraft,siteId}:{businessId:string;onDraft:(product:StoreProduct)=>void;siteId?:string}){
 const locale=useContext(LocaleContext);
 const [snapshot,setSnapshot]=useState<StoreCatalogState|null>(null);
 const [error,setError]=useState("");
 const [query,setQuery]=useState(""),[limit,setLimit]=useState(40);
 useEffect(()=>{
  let live=true;
  const reload=()=>{
   try{const state=readStoreCatalog(businessId);if(live){setSnapshot(state);setError("");}}
   catch(e){if(live)setError(String(e));}
  };
  const notified=(e:Event)=>{if((e as CustomEvent<string>).detail===businessId)reload();};
  const storage=(e:StorageEvent)=>{if(e.key===businessKey(CATALOG_MIRROR_KEY,businessId))reload();};
  reload();window.addEventListener(CATALOG_UPDATED,notified);window.addEventListener("storage",storage);
  return()=>{live=false;window.removeEventListener(CATALOG_UPDATED,notified);window.removeEventListener("storage",storage);};
 },[businessId]);
 const stores=useMemo(()=>Object.values(snapshot?.sites??{}).filter(s=>!siteId||s.siteId===siteId),[snapshot,siteId]);
 const total=stores.reduce((n,s)=>n+s.products.length,0);
 if(error)return <section className="main-card" role="alert">{error}</section>;
 if(!stores.length)return siteId?null:<section className="main-card store-catalog-panel">
  <span className="eyebrow">{locale==="pt-BR"?"PRODUTOS DE LOJAS":locale==="en"?"STORE PRODUCTS":"PRODUCTOS DE TIENDAS"}</span>
  <p className="muted">{locale==="pt-BR"?"Nenhum catálogo de loja sincronizado. Conecte uma loja em Fontes e conexões; produtos manuais permanecem separados.":locale==="en"?"No synced store catalog. Connect a store in Sources and connections; manual products stay separate.":"Todavía no hay un catálogo sincronizado. Conecta una tienda; los productos manuales siguen independientes."}</p>
 </section>;
 return <section className="main-card store-catalog-panel">
  <div className="section-head"><div><span className="eyebrow">{locale==="pt-BR"?"CATÁLOGO SINCRONIZADO · SOMENTE LEITURA":locale==="en"?"SYNCED CATALOG · READ ONLY":"CATÁLOGO SINCRONIZADO · SOLO LECTURA"}</span>
   <h2>{total} {locale==="pt-BR"?"produtos publicados da loja":locale==="en"?"published store products":"productos publicados de la tienda"}</h2>
   <p className="muted">{locale==="pt-BR"?"Os valores financeiros manuais não são alterados. Custos, margens e pagamentos não são verificados por este catálogo.":locale==="en"?"Manual financial data stay unchanged. This catalog does not verify costs, margins or payments.":"Los datos financieros manuales no cambian. Este catálogo no verifica costos, márgenes ni pagos."}</p></div></div>
  {total>40&&<label className="field"><span>{locale==="pt-BR"?"Buscar produtos da loja":locale==="en"?"Search store products":"Buscar productos de la tienda"}</span>
   <input type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(40);}} placeholder={locale==="pt-BR"?"Nome do produto":locale==="en"?"Product name":"Nombre del producto"}/></label>}
  {stores.map(store=>{
   const filtered=store.products.filter(p=>p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())||String(p.id)===query.trim());
   return <div key={store.siteId} className="store-catalog-source">
    <h3>{store.name} <small>· {new Date(store.syncedAt).toLocaleString(locale)}</small></h3>
    <div className="store-catalog-grid">{filtered.slice(0,limit).map(p=><article className="store-catalog-item" key={p.id}>
     {p.imageUrl?<img src={p.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>:null}
     <div><strong>{p.name}</strong><small>#{p.id} · {p.currency} {p.price}</small>
      <button type="button" className="secondary" disabled={p.currency!=="COP"}
       title={p.currency!=="COP"?"Use a calculadora internacional para produtos fora de COP":undefined}
       onClick={()=>onDraft(p)}>{locale==="pt-BR"?"Criar simulação":locale==="en"?"Start pricing draft":"Crear simulación"}</button></div>
    </article>)}</div>
    {filtered.length>limit&&<button className="secondary" type="button" onClick={()=>setLimit(n=>n+40)}>{locale==="pt-BR"?"Mostrar mais":locale==="en"?"Show more":"Mostrar más"}</button>}
   </div>;
  })}
 </section>;
}
