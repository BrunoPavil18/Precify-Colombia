/**
 * Precify Colombia opt-in connected REST service.
 * Node 20+, no runtime npm dependencies. Hosted PostgreSQL/Supabase is configured
 * by the operator; there are no hard-coded credentials or automatic migrations.
 */
import http from "node:http";
import {createHash,createHmac,createCipheriv,createDecipheriv,randomBytes,timingSafeEqual} from "node:crypto";
import {
 validateOrderEvent,validateAdCampaign,computeCODFunnel,reconcileCampaigns
} from "../../packages/core/dist/index.js";

const env=process.env;
const required=["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_KEY","PRECIFY_ENCRYPTION_KEY","PRECIFY_WEB_ORIGIN","PRECIFY_PUBLIC_URL"];
for(const key of required)if(!env[key])throw Error("Missing required environment variable "+key);
const dbUrl=new URL(env.SUPABASE_URL);
if(dbUrl.protocol!=="https:")throw Error("SUPABASE_URL must be HTTPS");
const publicURL=new URL(env.PRECIFY_PUBLIC_URL);
const webOrigin=new URL(env.PRECIFY_WEB_ORIGIN).origin;
if(!["https:","http:"].includes(publicURL.protocol))throw Error("Invalid service origin");
if(publicURL.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(publicURL.hostname))throw Error("PRECIFY_PUBLIC_URL requires HTTPS");
const encryptionKey=Buffer.from(env.PRECIFY_ENCRYPTION_KEY,"hex");
if(encryptionKey.length!==32)throw Error("PRECIFY_ENCRYPTION_KEY must be 32 bytes in hex");
const port=Number(env.PORT||8787),allowed=new Set([webOrigin,publicURL.origin]);
const metaVersion=env.META_GRAPH_VERSION||"v24.0";
if(!/^v\d{1,2}\.\d{1,2}$/.test(metaVersion))throw Error("Invalid Meta Graph API version");
const jsonHeaders={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const sha=text=>createHash("sha256").update(text).digest("hex");
const bearer=value=>({Authorization:"Bearer "+value});
const serviceHeaders={apikey:env.SUPABASE_SERVICE_KEY,...bearer(env.SUPABASE_SERVICE_KEY)};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const roles=["viewer","analyst","admin","owner"];
const supportedTables=new Set(["precify_organizations","precify_memberships","precify_order_events","precify_campaigns","precify_prices","precify_api_keys","precify_webhooks","precify_oauth_states","precify_meta_connections","precify_meta_accounts","precify_audit"]);
const limitByIp=new Map();
function fail(status,message){const error=new Error(message);error.status=status;throw error;}
function respond(res,status,payload,extra={}){
 const body=JSON.stringify(payload);
 res.writeHead(status,{...jsonHeaders,...extra});res.end(body);
}
async function readRaw(req,max=2000000){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>max)fail(413,"Request body too large");chunks.push(chunk);}
 return Buffer.concat(chunks);
}
async function readJSON(req,max=2000000){
 const raw=await readRaw(req,max);
 try{return JSON.parse(raw.toString("utf8"));}catch{fail(400,"Invalid JSON");}
}
function crypt(text){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",encryptionKey,iv);
 const data=Buffer.concat([cipher.update(text,"utf8"),cipher.final()]);
 return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),data.toString("base64url")].join(".");
}
function decrypt(ciphertext){
 const [iv,tag,body]=String(ciphertext).split(".");
 if(!iv||!tag||!body)fail(500,"Invalid encrypted token");
 const d=createDecipheriv("aes-256-gcm",encryptionKey,Buffer.from(iv,"base64url"));
 d.setAuthTag(Buffer.from(tag,"base64url"));
 return Buffer.concat([d.update(Buffer.from(body,"base64url")),d.final()]).toString("utf8");
}
async function sb(method,table,query={},body,prefer){
 if(!supportedTables.has(table))fail(500,"Invalid database table");
 const url=new URL("/rest/v1/"+table,dbUrl);
 for(const [name,value] of Object.entries(query))url.searchParams.set(name,String(value));
 const response=await fetch(url,{method,headers:{...serviceHeaders,"content-type":"application/json",...(prefer?Prefer:undefined)},body:body===undefined?undefined:JSON.stringify(body)});
 // Replaced below: Prefer header is set explicitly so write semantics are visible.
 if(!response.ok)fail(response.status>=400&&response.status<500?400:502,"Database operation failed: "+response.status);
 if(response.status===204)return null;
 const text=await response.text();return text?JSON.parse(text):null;
}
async function rpc(name,body){
 if(name!=="precify_create_org")fail(500,"Unknown RPC");
 const url=new URL("/rest/v1/rpc/"+name,dbUrl);
 const response=await fetch(url,{method:"POST",headers:{...serviceHeaders,"content-type":"application/json"},body:JSON.stringify(body)});
 if(!response.ok)fail(502,"Organization creation failed");
 return await response.json();
}
async function query(table,filters={},select="*"){
 return await sb("GET",table,{select,...filters});
}
async function insert(table,records,options={}){
 const url=new URL("/rest/v1/"+table,dbUrl);
 if(options.conflict)url.searchParams.set("on_conflict",options.conflict);
 const prefer=options.upsert?"resolution=ignore-duplicates,return=representation":"return=representation";
 const response=await fetch(url,{method:"POST",headers:{...serviceHeaders,"content-type":"application/json",Prefer:prefer},body:JSON.stringify(records)});
 if(!response.ok)fail(502,"Database insert failed: "+response.status);
 return await response.json();
}
async function remove(table,filters){
 return await sb("DELETE",table,filters);
}
async function currentUser(req){
 const authorization=String(req.headers.authorization||"");
 if(authorization.startsWith("ApiKey ")){
  const secret=authorization.slice(7);
  if(!/^prc_live_[a-f0-9]{64}$/.test(secret))fail(401,"Invalid API key");
  const rows=await query("precify_api_keys",{secret_hash:"eq."+sha(secret),revoked_at:"is.null"});
  if(!rows.length)fail(401,"Unknown or revoked API key");
  return {type:"api",orgId:rows[0].org_id,scope:rows[0].scope,id:"api:"+rows[0].id};
 }
 if(!authorization.startsWith("Bearer "))fail(401,"Authentication required");
 const token=authorization.slice(7);
 if(token.length>8192)fail(401,"Invalid token");
 const response=await fetch(new URL("/auth/v1/user",dbUrl),{headers:{apikey:env.SUPABASE_ANON_KEY,...bearer(token)},cache:"no-store"});
 if(!response.ok)fail(401,"Invalid or expired access token");
 const user=await response.json();
 if(!uuid.test(user.id))fail(401,"Missing user id");
 return {type:"user",id:user.id,email:user.email??null};
}
async function authorize(auth,org,needed="viewer"){
 if(!uuid.test(org))fail(400,"Invalid organization ID");
 if(auth.type==="api"){
  if(auth.orgId!==org)fail(403,"API key not scoped to this organization");
  if(needed!=="viewer"&&auth.scope!=="write")fail(403,"API key is read-only");
  if(["owner","admin"].includes(needed))fail(403,"Interactive administrator required");
  return "integration";
 }
 const rows=await query("precify_memberships",{org_id:"eq."+org,user_id:"eq."+auth.id});
 const role=rows[0]?.role;
 if(!roles.includes(role))fail(403,"Not a member of this organization");
 if(roles.indexOf(role)<roles.indexOf(needed))fail(403,"Insufficient organization permissions");
 return role;
}
async function audit(org,auth,action,details={}){
 await insert("precify_audit",{org_id:org,actor:auth.id,action,details});
}
async function importOrders(org,auth,rows){
 if(!Array.isArray(rows)||rows.length>10000)fail(400,"Invalid order events batch");
 const seen=new Map();
 for(const row of rows){
  validateOrderEvent(row);
  const existing=seen.get(row.id);
  if(existing&&JSON.stringify(existing)!==JSON.stringify(row))fail(409,"Conflicting duplicate event");
  seen.set(row.id,row);
 }
 const events=[...seen.values()];
 for(const event of events){
  const old=await query("precify_order_events",{org_id:"eq."+org,event_id:"eq."+event.id},"payload");
  if(old.length&&JSON.stringify(old[0].payload)!==JSON.stringify(event))fail(409,"Event ID already exists with another payload");
 }
 if(events.length)await insert("precify_order_events",events.map(e=>({org_id:org,event_id:e.id,order_id:e.orderId,payload:e})),{upsert:true,conflict:"org_id,event_id"});
 await audit(org,auth,"orders.import",{count:events.length});
 return {imported:events.length};
}
async function importCampaigns(org,auth,rows){
 if(!Array.isArray(rows)||rows.length>10000)fail(400,"Invalid campaign batch");
 const unique=new Map();
 for(const c of rows){validateAdCampaign(c);unique.set(c.id,c);}
 if(unique.size)await insert("precify_campaigns",[...unique.values()].map(c=>({org_id:org,id:c.id,payload:c,updated_at:new Date().toISOString()})),{upsert:true,conflict:"org_id,id"});
 await audit(org,auth,"campaigns.import",{count:unique.size});
 return {imported:unique.size};
}
async function exportOrg(org){
 const [events,campaigns,prices,audits]=await Promise.all([
  query("precify_order_events",{org_id:"eq."+org},"payload"),
  query("precify_campaigns",{org_id:"eq."+org},"payload"),
  query("precify_prices",{org_id:"eq."+org},"id,payload,created_at"),
  query("precify_audit",{org_id:"eq."+org},"actor,action,event_at,details")
 ]);
 return {schema:1,exportedAt:new Date().toISOString(),orders:events.map(v=>v.payload),
  campaigns:campaigns.map(v=>v.payload),prices,audits};
}
async function getDashboard(org){
 const data=await exportOrg(org);
 const byCurrency=new Map();
 for(const e of data.orders)byCurrency.set(e.currency,[...(byCurrency.get(e.currency)??[]),e]);
 const funnel=[...byCurrency.entries()].map(([currency,events])=>({currency,...computeCODFunnel(events)}));
 const reconciliation=data.campaigns.map(c=>reconcileCampaigns(data.orders.filter(e=>e.currency===c.currency),[c])[0]);
 return {mode:"observed",funnel,reconciliation,campaigns:data.campaigns.length,
  lastUpdated:new Date().toISOString(),warning:"Financial figures are derived from supplied operational records; ad attribution is not a confirmed payment."};
}
function tokenFor(org,auth){
 if(auth.type!=="user")fail(403,"Meta OAuth requires authenticated user");
 return query("precify_meta_connections",{org_id:"eq."+org,user_id:"eq."+auth.id});
}
async function graph(url,token){
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token,"Accept":"application/json"},cache:"no-store"});
 if(!response.ok)fail(502,"Meta API request failed: "+response.status);
 return await response.json();
}
async function metaAccounts(org,auth){
 const rows=await tokenFor(org,auth);
 if(!rows.length)fail(404,"No Meta account connected");
 const token=decrypt(rows[0].token_enc);
 const url=new URL("https://graph.facebook.com/"+metaVersion+"/me/adaccounts");
 url.searchParams.set("fields","id,name,currency");url.searchParams.set("limit","100");
 const response=await graph(url,token);
 const accounts=(response.data??[]).filter(v=>/^act_\d{4,30}$/.test(v.id)&&/^[A-Z]{3}$/.test(v.currency));
 for(const item of accounts)await insert("precify_meta_accounts",{
  org_id:org,user_id:auth.id,account_id:item.id,account_name:String(item.name??item.id).slice(0,200),currency:item.currency
 },{upsert:true,conflict:"org_id,user_id,account_id"});
 return accounts;
}
async function metaSync(org,auth,request){
 if(auth.type!=="user")fail(403,"Personal authorization required");
 const accounts=await query("precify_meta_accounts",{org_id:"eq."+org,user_id:"eq."+auth.id,account_id:"eq."+request.accountId});
 if(!accounts.length)fail(403,"Ad account not authorized");
 const isoDate=/^\d{4}-\d{2}-\d{2}$/;
 if(!isoDate.test(request.since)||!isoDate.test(request.until)||request.since>request.until)fail(400,"Invalid date range");
 const connection=await tokenFor(org,auth);
 if(!connection.length)fail(401,"Meta connection expired");
 const token=decrypt(connection[0].token_enc);
 const url=new URL("https://graph.facebook.com/"+metaVersion+"/"+request.accountId+"/insights");
 url.searchParams.set("fields","campaign_id,campaign_name,spend,impressions,clicks,actions,action_values");
 url.searchParams.set("level","campaign");url.searchParams.set("limit","100");
 url.searchParams.set("time_range",JSON.stringify({since:request.since,until:request.until}));
 const reports=await graph(url,token);
 const rows=(reports.data??[]).map(x=>{
  const purchase=(x.actions??[]).find(z=>z.action_type==="purchase");
  const revenue=(x.action_values??[]).find(z=>z.action_type==="purchase");
  return {id:"meta:"+request.accountId+":"+x.campaign_id+":"+request.since+":"+request.until,
   source:"meta",currency:accounts[0].currency,spend:String(x.spend??"0"),
   impressions:String(x.impressions??"0"),clicks:String(x.clicks??"0"),
   attributedConversions:String(purchase?.value??"0"),attributedRevenue:String(revenue?.value??"0"),
   observedFrom:request.since+"T00:00:00Z",observedTo:request.until+"T23:59:59Z"};
 });
 const validated=rows.map(validateAdCampaign);
 await importCampaigns(org,auth,validated);
 return {count:validated.length,hasNextPage:!!reports.paging?.next,
  warning:reports.paging?.next?"Partial page: request pagination support before treating this as a complete Meta report.":null};
}
const rateBuckets=new Map();
function throttle(req){
 const ip=req.socket.remoteAddress||"unknown",now=Date.now(),v=rateBuckets.get(ip);
 const bucket=!v||now-v.start>60000?{start:now,count:1}:{start:v.start,count:v.count+1};
 rateBuckets.set(ip,bucket);if(bucket.count>180)fail(429,"Rate limit exceeded");
 if(rateBuckets.size>10000)rateBuckets.clear();
}
async function handler(req,res){
 try{
  throttle(req);
  const origin=req.headers.origin;
  if(origin&&!allowed.has(origin))fail(403,"Origin not allowed");
  if(origin)res.setHeader("access-control-allow-origin",origin);
  res.setHeader("vary","Origin");res.setHeader("access-control-allow-headers","Authorization,Content-Type,X-Precify-Signature,X-Precify-Timestamp");
  res.setHeader("access-control-allow-methods","GET,POST,DELETE,OPTIONS");
  if(req.method==="OPTIONS"){res.writeHead(204);return res.end();}
  const url=new URL(req.url||"/",publicURL);
  if(url.pathname==="/health"&&req.method==="GET")return respond(res,200,{ok:true,service:"precify-connected-v1"});
  // Generic signed webhook endpoint, authenticated by its own shared secret.
  const hook=url.pathname.match(/^\/v1\/hooks\/([a-f0-9-]{36})$/i);
  if(hook&&req.method==="POST"){
   const rows=await query("precify_webhooks",{id:"eq."+hook[1],revoked_at:"is.null"});
   if(!rows.length)fail(404,"Webhook not found");
   const timestamp=String(req.headers["x-precify-timestamp"]||"");
   const ms=Number(timestamp);
   if(!Number.isSafeInteger(ms)||Math.abs(Date.now()-ms)>300000)fail(401,"Webhook timestamp outside tolerance");
   const raw=await readRaw(req);
   const secret=decrypt(rows[0].secret_enc);
   const expected=createHmac("sha256",secret).update(timestamp+".").update(raw).digest();
   const supplied=String(req.headers["x-precify-signature"]||"").replace(/^sha256=/,"");
   if(!/^[a-f0-9]{64}$/i.test(supplied)||!timingSafeEqual(expected,Buffer.from(supplied,"hex")))fail(401,"Invalid webhook signature");
   const body=JSON.parse(raw.toString("utf8"));
   const org=rows[0].org_id,auth={type:"api",orgId:org,scope:"write",id:"webhook:"+hook[1]};
   return respond(res,202,await importOrders(org,auth,Array.isArray(body)?body:[body]));
  }
  // OAuth return is validated via one-time random state persisted in the database.
  if(url.pathname==="/v1/oauth/meta/callback"&&req.method==="GET"){
   const state=url.searchParams.get("state"),code=url.searchParams.get("code");
   if(!state||!/^[-_a-zA-Z0-9]{35,100}$/.test(state)||!code||code.length>4096)fail(400,"Invalid OAuth callback");
   const rows=await query("precify_oauth_states",{nonce_hash:"eq."+sha(state)});
   if(rows.length!==1||Date.parse(rows[0].expires_at)<Date.now())fail(401,"OAuth state expired");
   await remove("precify_oauth_states",{nonce_hash:"eq."+sha(state)});
   if(!env.META_APP_ID||!env.META_APP_SECRET)fail(503,"Meta connector not configured");
   const redirect=new URL("/v1/oauth/meta/callback",publicURL).toString();
   const tokenUrl=new URL("https://graph.facebook.com/"+metaVersion+"/oauth/access_token");
   tokenUrl.searchParams.set("client_id",env.META_APP_ID);
   tokenUrl.searchParams.set("client_secret",env.META_APP_SECRET);
   tokenUrl.searchParams.set("redirect_uri",redirect);
   tokenUrl.searchParams.set("code",code);
   const response=await fetch(tokenUrl,{cache:"no-store"});
   if(!response.ok)fail(502,"Meta OAuth exchange failed");
   const body=await response.json();
   if(typeof body.access_token!=="string")fail(502,"Meta token missing");
   await insert("precify_meta_connections",{org_id:rows[0].org_id,user_id:rows[0].user_id,
    token_enc:crypt(body.access_token),expires_at:body.expires_in?new Date(Date.now()+Number(body.expires_in)*1000).toISOString():null},
    {upsert:true,conflict:"org_id,user_id"});
   res.writeHead(302,{location:webOrigin+"/?precify-meta=connected","cache-control":"no-store"});return res.end();
  }
  const auth=await currentUser(req);
  if(url.pathname==="/v1/me"&&req.method==="GET")return respond(res,200,{id:auth.id,type:auth.type,email:auth.email??null});
  if(url.pathname==="/v1/orgs"&&req.method==="GET"){
   if(auth.type!=="user")fail(403,"User login required");
   const memberships=await query("precify_memberships",{user_id:"eq."+auth.id},"org_id,role");
   const ids=memberships.map(x=>x.org_id);
   const organizations=ids.length?await query("precify_organizations",{id:"in.("+ids.join(",")+")"},"id,name,created_at"):[];
   return respond(res,200,organizations.map(o=>({...o,role:memberships.find(m=>m.org_id===o.id)?.role})));
  }
  if(url.pathname==="/v1/orgs"&&req.method==="POST"){
   if(auth.type!=="user")fail(403,"User login required");
   const body=await readJSON(req,4096);
   if(typeof body.name!=="string"||body.name.trim().length<1||body.name.length>120)fail(400,"Invalid organization name");
   const id=await rpc("precify_create_org",{p_name:body.name,p_user:auth.id});
   return respond(res,201,{id});
  }
  const route=url.pathname.match(/^\/v1\/orgs\/([a-f0-9-]{36})(?:\/(.*))?$/i);
  if(!route)fail(404,"Not found");
  const org=route[1],path=route[2]??"";
  await authorize(auth,org,req.method==="GET"?"viewer":"analyst");
  if(path==="dashboard"&&req.method==="GET")return respond(res,200,await getDashboard(org));
  if(path==="orders"&&req.method==="GET"){
   const rows=await query("precify_order_events",{org_id:"eq."+org},"payload");
   return respond(res,200,rows.map(x=>x.payload));
  }
  if(path==="orders/import"&&req.method==="POST")return respond(res,200,await importOrders(org,auth,await readJSON(req)));
  if(path==="campaigns"&&req.method==="GET"){
   const rows=await query("precify_campaigns",{org_id:"eq."+org},"payload");
   return respond(res,200,rows.map(x=>x.payload));
  }
  if(path==="campaigns/import"&&req.method==="POST")return respond(res,200,await importCampaigns(org,auth,await readJSON(req)));
  if(path==="export"&&req.method==="GET")return respond(res,200,await exportOrg(org));
  if(path==="prices"&&req.method==="GET")return respond(res,200,await query("precify_prices",{org_id:"eq."+org},"id,payload,created_at"));
  if(path==="prices"&&req.method==="POST"){
   const price=await readJSON(req,10000);
   if(typeof price.product!=="string"||typeof price.competitor!=="string"||!/^[A-Z]{3}$/.test(price.currency))fail(400,"Invalid competitor record");
   return respond(res,201,await insert("precify_prices",{org_id:org,payload:price}));
  }
  if(path==="members"&&req.method==="GET")return respond(res,200,await query("precify_memberships",{org_id:"eq."+org},"user_id,role"));
  if(path==="members"&&req.method==="POST"){
   await authorize(auth,org,"owner");
   const body=await readJSON(req,4096);
   if(!uuid.test(body.userId)||!["admin","analyst","viewer"].includes(body.role))fail(400,"Invalid member");
   return respond(res,201,await insert("precify_memberships",{org_id:org,user_id:body.userId,role:body.role},{upsert:true,conflict:"org_id,user_id"}));
  }
  const member=path.match(/^members\/([a-f0-9-]{36})$/i);
  if(member&&req.method==="DELETE"){
   await authorize(auth,org,"owner");
   if(member[1]===auth.id)fail(400,"Cannot remove owner self");
   await remove("precify_memberships",{org_id:"eq."+org,user_id:"eq."+member[1],role:"neq.owner"});
   return respond(res,200,{deleted:true});
  }
  if(path==="api-keys"&&req.method==="POST"){
   await authorize(auth,org,"owner");
   const body=await readJSON(req,1024);
   const scope=body.scope==="read"?"read":body.scope==="write"?"write":null;
   if(!scope)fail(400,"Invalid API key scope");
   const key="prc_live_"+randomBytes(32).toString("hex");
   await insert("precify_api_keys",{org_id:org,secret_hash:sha(key),scope,created_by:auth.id});
   await audit(org,auth,"key.create",{scope});
   return respond(res,201,{key,scope,warning:"Shown once. Store only on trusted servers, never in browser JavaScript."});
  }
  if(path==="webhooks"&&req.method==="POST"){
   await authorize(auth,org,"admin");
   const secret=randomBytes(32).toString("hex");
   const rows=await insert("precify_webhooks",{org_id:org,secret_enc:crypt(secret),created_by:auth.id});
   return respond(res,201,{id:rows[0].id,endpoint:new URL("/v1/hooks/"+rows[0].id,publicURL).toString(),
    secret,signature:"HMAC-SHA256(timestamp + '.' + exact UTF-8 body)",warning:"Secret is shown only once"});
  }
  if(path==="meta/connect"&&req.method==="POST"){
   await authorize(auth,org,"admin");
   if(auth.type!=="user"||!env.META_APP_ID||!env.META_APP_SECRET)fail(503,"Meta OAuth is not configured");
   const state=randomBytes(32).toString("base64url");
   await insert("precify_oauth_states",{nonce_hash:sha(state),org_id:org,user_id:auth.id,expires_at:new Date(Date.now()+600000).toISOString()});
   const authorizeUrl=new URL("https://www.facebook.com/"+metaVersion+"/dialog/oauth");
   authorizeUrl.searchParams.set("client_id",env.META_APP_ID);
   authorizeUrl.searchParams.set("redirect_uri",new URL("/v1/oauth/meta/callback",publicURL).toString());
   authorizeUrl.searchParams.set("scope","ads_read");
   authorizeUrl.searchParams.set("state",state);
   return respond(res,200,{authorizationUrl:authorizeUrl.toString(),expiresInSeconds:600});
  }
  if(path==="meta/accounts"&&req.method==="GET")return respond(res,200,await metaAccounts(org,auth));
  if(path==="meta/sync"&&req.method==="POST"){
   await authorize(auth,org,"analyst");return respond(res,200,await metaSync(org,auth,await readJSON(req,4096)));
  }
  if(path==="meta/disconnect"&&req.method==="POST"){
   await authorize(auth,org,"admin");
   if(auth.type!=="user")fail(403,"Personal authorization required");
   await remove("precify_meta_connections",{org_id:"eq."+org,user_id:"eq."+auth.id});
   await remove("precify_meta_accounts",{org_id:"eq."+org,user_id:"eq."+auth.id});
   return respond(res,200,{disconnected:true});
  }
  if(path==="data"&&req.method==="DELETE"){
   await authorize(auth,org,"owner");
   for(const table of ["precify_order_events","precify_campaigns","precify_prices","precify_meta_accounts","precify_meta_connections","precify_webhooks","precify_api_keys"])
    await remove(table,{org_id:"eq."+org});
   await audit(org,auth,"data.erase",{scope:"connected-operational-data"});
   return respond(res,200,{deleted:true});
  }
  fail(404,"Not found");
 }catch(e){
  const code=Number.isInteger(e.status)?e.status:500;
  if(code===500)console.error("Precify API request failed",e?.message??e);
  if(!res.headersSent)respond(res,code,{error:code===500?"Internal server error":e.message});
 }
}
http.createServer((req,res)=>{void handler(req,res);}).listen(port,env.HOST||"127.0.0.1",()=>{
 console.log("Precify connected API listening on port "+port);
});
