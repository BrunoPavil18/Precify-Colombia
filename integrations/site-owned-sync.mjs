/**
 * Precify site-owned sync protocol v1. Works in browsers and Node 20+.
 * No Precify-hosted server or global API key is required.
 */
const ID=/^[a-zA-Z0-9._:-]{1,160}$/;
const MAX_PAGE=250;
export function validateChangePage(value) {
 if(!value||typeof value!=="object"||!Array.isArray(value.changes)||
    value.changes.length>MAX_PAGE||typeof value.hasMore!=="boolean"||
    !(value.nextCursor===null||typeof value.nextCursor==="string"&&value.nextCursor.length<=2048))
  throw new Error("Invalid site change-feed page");
 for(const change of value.changes) {
  if(!change||typeof change.id!=="string"||!ID.test(change.id)||!["order","campaign"].includes(change.kind)||
     !["upsert","delete"].includes(change.operation))throw new Error("Invalid site change");
  if(change.operation==="upsert" && (!change.value||typeof change.value!=="object"||Array.isArray(change.value)))
   throw new Error("Invalid site change payload");
 }
 if(value.hasMore && (!value.nextCursor||!value.changes.length))
  throw new Error("Non-advancing site change-feed");
 return value;
}
function secureBaseURL(baseURL) {
 const url=new URL(baseURL);
 if(url.username||url.password||url.search||url.hash||
   (url.protocol!=="https:" && !(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname))))
  throw new Error("Site connector requires HTTPS (except localhost) and a clean base URL");
 url.pathname=url.pathname.replace(/\/+$/,"");
 return url;
}
export function createSiteConnector({id,baseURL,getToken,fetchImpl=fetch}) {
 if(!ID.test(id)||typeof getToken!=="function")throw new Error("Invalid site connector configuration");
 const origin=secureBaseURL(baseURL);
 async function call(path) {
  const token=await getToken();
  if(typeof token!=="string"||!token.trim())throw new Error("Site sign-in required");
  const u=new URL(origin.href);
  const [route,queryString]=path.split("?");
  u.pathname=origin.pathname.replace(/\/+$/,"")+"/precify/v1/"+route;
  u.search=queryString?"?"+queryString:"";
  const response=await fetchImpl(u.toString(),{
   method:"GET",cache:"no-store",redirect:"error",credentials:"omit",
   headers:{Authorization:"Bearer "+token,Accept:"application/json"}
  });
  if(!response.ok)throw new Error("Site sync HTTP "+response.status);
  if(!(response.headers?.get("content-type")??"").includes("application/json"))
   throw new Error("Site returned non-JSON content");
  const raw=await response.text();
  if(raw.length>1500000)throw new Error("Site sync response too large");
  return JSON.parse(raw);
 }
 return {
  id,
  async identify(){
   const result=await call("identity");
   if(!result||typeof result.subject!=="string"||!ID.test(result.subject))throw new Error("Invalid site identity");
   return result.subject;
  },
  async pull(cursor,limit=100){
   if(cursor!==null && (typeof cursor!=="string"||cursor.length>2048))throw new Error("Invalid cursor");
   if(!Number.isInteger(limit)||limit<1||limit>MAX_PAGE)throw new Error("Invalid sync page limit");
   const params=new URLSearchParams({limit:String(limit)});
   if(cursor!==null)params.set("cursor",cursor);
   return validateChangePage(await call("changes?"+params.toString()));
  }
 };
}
/**
 * Storage must atomically apply changes and cursor in the SAME transaction.
 * One controller per source/scope; calling run twice returns the same promise.
 */
export function createSyncController({connector,store,scope,onState=()=>{},clock=()=>Date.now(),pageLimit=100,maxPages=100}) {
 if(!connector||!store||!ID.test(scope)||!Number.isInteger(pageLimit)||
  pageLimit<1||pageLimit>MAX_PAGE||maxPages<1||maxPages>500)throw new Error("Invalid sync controller");
 let inFlight=null,failures=0,lastAttempt=0;
 let state={phase:"idle",lastSuccess:null,lastError:null,pulled:0};
 const emit=change=>{state={...state,...change};onState({...state});};
 const run=(manual=false)=>{
  if(inFlight)return inFlight;
  if(!manual&&failures&&clock()-lastAttempt<Math.min(900000,60000*2**Math.min(4,failures-1)))
   return Promise.resolve({...state});
  inFlight=(async()=>{
   lastAttempt=clock();emit({phase:"syncing",lastError:null,pulled:0});
   try {
    let cursor=(await store.read(scope))?.cursor??null;
    let pulled=0;
    for(let i=0;i<maxPages;i++){
     const page=validateChangePage(await connector.pull(cursor,pageLimit));
     if(page.hasMore&&page.nextCursor===cursor)throw new Error("Site change-feed cursor did not advance");
     if(cursor!==null&&page.nextCursor===null)throw new Error("Site change-feed cursor was reset");
     // Validation and durability occur before moving to the next cursor.
     await store.apply(scope,page.changes,page.nextCursor,cursor);
     pulled+=page.changes.length;
     cursor=page.nextCursor;
     if(!page.hasMore) {
      failures=0;emit({phase:"ready",lastSuccess:clock(),pulled,lastError:null});
      return {...state};
     }
    }
    throw new Error("Page cap reached; cursor safely checkpointed. Retry to resume");
   }catch(e){
    failures++;emit({phase:"error",lastError:String(e instanceof Error?e.message:e)});
    return {...state};
   }finally{inFlight=null;}
  })();
  return inFlight;
 };
 return {run,getState:()=>({...state})};
}
