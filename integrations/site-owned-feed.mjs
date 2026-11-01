/**
 * Install on a STORE backend, not in Precify's browser bundle.
 * The store supplies authorization + a durable transactional change-feed.
 */
import {validateChangePage} from "./site-owned-sync.mjs";
const SUBJECT=/^[a-zA-Z0-9._:-]{1,160}$/;
function json(status,data,origin=null){
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","vary":"Origin"};
 if(origin)headers["access-control-allow-origin"]=origin;
 return new Response(JSON.stringify(data),{status,headers});
}
/**
 * @param {{authorize:(token:string)=>Promise<{subject:string}|null>,
 * readChanges:(args:{subject:string,cursor:string|null,limit:number})=>Promise<unknown>,
 * allowedOrigins:string[]}} options
 */
export function createSiteFeedHandler({authorize,readChanges,allowedOrigins=[]}){
 if(typeof authorize!=="function"||typeof readChanges!=="function"||!Array.isArray(allowedOrigins))
  throw Error("Invalid store change-feed configuration");
 const allowed=new Set(allowedOrigins.map(v=>new URL(v).origin));
 return async function handle(request){
  const origin=request.headers.get("origin");
  if(origin&&!allowed.has(origin))return json(403,{error:"Origin not allowed"});
  const cors=origin&&allowed.has(origin)?origin:null;
  if(request.method==="OPTIONS"){
   return new Response(null,{status:204,headers:{
    ...(cors?{"access-control-allow-origin":cors}:{}),
    "access-control-allow-methods":"GET, OPTIONS",
    "access-control-allow-headers":"Authorization, Accept",
    "access-control-max-age":"600","vary":"Origin"
   }});
  }
  if(request.method!=="GET")return json(405,{error:"Method not allowed"},cors);
  const url=new URL(request.url);
  if(!["/precify/v1/identity","/precify/v1/changes"].includes(url.pathname))
   return json(404,{error:"Not found"},cors);
  const match=request.headers.get("authorization")?.match(/^Bearer ([^\s]{8,4096})$/);
  if(!match)return json(401,{error:"Read-only store authentication required"},cors);
  try{
   const principal=await authorize(match[1]);
   if(!principal||typeof principal.subject!=="string"||!SUBJECT.test(principal.subject))
    return json(403,{error:"Store access denied"},cors);
   if(url.pathname.endsWith("/identity"))return json(200,{subject:principal.subject},cors);
   const limitText=url.searchParams.get("limit")??"100";
   if(!/^[1-9]\d{0,2}$/.test(limitText))return json(400,{error:"Invalid page size"},cors);
   const limit=Number(limitText);
   if(limit>250)return json(400,{error:"Page size exceeds cap"},cors);
   const cursor=url.searchParams.get("cursor");
   if(cursor!==null&&cursor.length>2048)return json(400,{error:"Cursor too long"},cors);
   const page=validateChangePage(await readChanges({subject:principal.subject,cursor,limit}));
   if(page.changes.length>limit)return json(502,{error:"Store returned oversized page"},cors);
   if(cursor!==null&&page.nextCursor===null)return json(502,{error:"Store cursor regression"},cors);
   return json(200,page,cors);
  }catch(_error){return json(502,{error:"Store sync provider unavailable or invalid"},cors);}
 };
}
