import {createHash,createPublicKey,verify as verifyEd25519,randomBytes} from "node:crypto";
import {validateChangePage} from "./site-owned-sync.mjs";
/** Server-side adapter MUST use atomic transactions and UNIQUE enrollment+nonce constraints. */
const DEVICE=/^[a-f0-9]{32}$/, CODE=/^[A-Za-z0-9_-]{32,256}$/, SUBJECT=/^[A-Za-z0-9._:-]{1,160}$/, SIGN=/^[A-Za-z0-9_-]{40,200}$/;
export const hashEnrollmentCode=code=>{if(!CODE.test(code))throw Error("Invalid enrollment code");return createHash("sha256").update("precify-financy-device-v2\0"+code).digest("hex");};
export const createEnrollmentCode=()=>randomBytes(32).toString("base64url");
const json=(status,body,origin)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store","vary":"Origin",...(origin?{"access-control-allow-origin":origin}:{})}});
const jwkValid=k=>!!k&&typeof k==="object"&&k.kty==="OKP"&&k.crv==="Ed25519"&&/^[A-Za-z0-9_-]{43}$/.test(k.x??"")&&k.d===undefined;
const canonical=(method,path,timestamp,nonce,deviceId)=>["PRECIFY-FINANCY-V2",method,path,timestamp,nonce,deviceId].join("\n");
/**
 * Adapter:
 * redeem({codeHash,deviceId,publicKey}): atomic consume once, return {subject} or null
 * lookup(deviceId): {subject,publicKey,scopes:["finance:read"],revoked?:boolean}
 * useNonce(deviceId,nonce,timestamp): atomically insert, return false for replay
 * readChanges({subject,cursor,limit}): durable outbox for that shop
 */
export function createDeviceFeedHandler({store,readChanges,allowedOrigins=[],clock=Date.now}){
 if(!store||!["redeem","lookup","useNonce"].every(k=>typeof store[k]==="function")||typeof readChanges!=="function")throw Error("Invalid store device adapter");
 const origins=new Set(allowedOrigins.map(x=>new URL(x).origin));
 return async request=>{
  const origin=request.headers.get("origin");
  if(origin&&!origins.has(origin))return json(403,{error:"Origin denied"});
  const url=new URL(request.url),path=url.pathname,cors=origin||null;
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"Content-Type, X-Precify-Device, X-Precify-Timestamp, X-Precify-Nonce, X-Precify-Signature","access-control-allow-origin":cors??"null","vary":"Origin"}});
  if(path==="/precify/v2/activate"&&request.method==="POST"){
   let body;
   try{const raw=await request.text();if(raw.length>2000)throw Error("oversize");body=JSON.parse(raw);}catch{return json(400,{error:"Invalid activation body"},cors);}
   if(typeof body?.code!=="string"||!CODE.test(body.code)||!DEVICE.test(body.deviceId??"")||!jwkValid(body.publicKey))return json(400,{error:"Invalid activation data"},cors);
   try{
    const result=await store.redeem({codeHash:hashEnrollmentCode(body.code),deviceId:body.deviceId,publicKey:body.publicKey});
    if(!result||!SUBJECT.test(result.subject??""))return json(409,{error:"Enrollment used, revoked or expired"},cors);
    return json(201,{subject:result.subject,deviceId:body.deviceId},cors);
   }catch{return json(409,{error:"Enrollment conflict"},cors);}
  }
  if(!["/precify/v2/identity","/precify/v2/changes"].includes(path))return json(404,{error:"Not found"},cors);
  if(request.method!=="GET")return json(405,{error:"Method not allowed"},cors);
  const id=request.headers.get("x-precify-device")??"",t=request.headers.get("x-precify-timestamp")??"",nonce=request.headers.get("x-precify-nonce")??"",sig=request.headers.get("x-precify-signature")??"";
  if(!DEVICE.test(id)||!/^[0-9]{13}$/.test(t)||!/^[a-f0-9]{32}$/.test(nonce)||!SIGN.test(sig))return json(401,{error:"Signed device proof required"},cors);
  const ts=Number(t);
  if(!Number.isSafeInteger(ts)||Math.abs(clock()-ts)>120_000)return json(401,{error:"Expired device proof"},cors);
  try{
   const principal=await store.lookup(id);
   if(!principal||principal.revoked||!principal.scopes?.includes("finance:read")||!SUBJECT.test(principal.subject??"")||!jwkValid(principal.publicKey))return json(403,{error:"Device denied"},cors);
   const key=createPublicKey({key:principal.publicKey,format:"jwk"});
   if(!verifyEd25519(null,Buffer.from(canonical("GET",path+url.search,t,nonce,id)),key,Buffer.from(sig,"base64url")))return json(401,{error:"Invalid signature"},cors);
   if(!await store.useNonce(id,nonce,ts))return json(409,{error:"Request replay"},cors);
   if(path.endsWith("/identity"))return json(200,{subject:principal.subject,deviceId:id},cors);
   const l=url.searchParams.get("limit")??"100",cursor=url.searchParams.get("cursor");
   if(!/^[1-9][0-9]{0,2}$/.test(l)||Number(l)>250||cursor!==null&&cursor.length>2048)return json(400,{error:"Invalid cursor/limit"},cors);
   const page=validateChangePage(await readChanges({subject:principal.subject,cursor,limit:Number(l)}));
   if(page.changes.length>Number(l))return json(502,{error:"Oversize page"},cors);
   return json(200,page,cors);
  }catch{return json(502,{error:"Store feed unavailable"},cors);}
 };
}
