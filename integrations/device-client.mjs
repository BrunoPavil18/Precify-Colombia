import {validateChangePage} from "./site-owned-sync.mjs";
const toURL=(base,route)=>{
 const u=new URL(base);
 if(u.username||u.password||u.search||u.hash||(u.protocol!=="https:"&&!(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname))))throw Error("HTTPS origin required");
 u.pathname=u.pathname.replace(/\/+$/,"")+"/precify/v2/"+route;return u;
};
const encoded=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
const randomHex=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");
export async function generateDeviceIdentity(){
 const pair=await crypto.subtle.generateKey({name:"Ed25519"},false,["sign","verify"]);
 return {deviceId:randomHex(),publicKey:await crypto.subtle.exportKey("jwk",pair.publicKey),privateKey:pair.privateKey};
}
export async function activateDevice({baseURL,code,identity,fetchImpl=fetch}){
 const resp=await fetchImpl(toURL(baseURL,"activate"),{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({code,deviceId:identity.deviceId,publicKey:identity.publicKey})});
 if(resp.status===409)throw Error("Activation code already in use, revoked or expired");
 if(!resp.ok)throw Error("Device activation HTTP "+resp.status);
 const body=await resp.json();
 if(body.deviceId!==identity.deviceId||typeof body.subject!=="string"||!body.subject)throw Error("Invalid activation response");
 return {subject:body.subject,deviceId:identity.deviceId};
}
export async function signDeviceRequest({url,deviceId,privateKey,clock=Date.now,nonce=randomHex}){
 const t=String(clock()),n=nonce(),u=new URL(url);
 const msg=["PRECIFY-FINANCY-V2","GET",u.pathname+u.search,t,n,deviceId].join("\n");
 const sig=new Uint8Array(await crypto.subtle.sign("Ed25519",privateKey,new TextEncoder().encode(msg)));
 return {"X-Precify-Device":deviceId,"X-Precify-Timestamp":t,"X-Precify-Nonce":n,"X-Precify-Signature":encoded(sig),"Accept":"application/json"};
}
export function createDeviceConnector({id,baseURL,identity,fetchImpl=fetch}){
 if(!/^[A-Za-z0-9._:-]{1,160}$/.test(id)||!/^[a-f0-9]{32}$/.test(identity?.deviceId??"")||!identity.privateKey)throw Error("Invalid device connector");
 const request=async(route,query="")=>{
  const u=toURL(baseURL,route);u.search=query;
  const headers=await signDeviceRequest({url:u.toString(),deviceId:identity.deviceId,privateKey:identity.privateKey});
  const resp=await fetchImpl(u,{method:"GET",headers,redirect:"error",credentials:"omit",cache:"no-store"});
  if(!resp.ok)throw Error("Device sync HTTP "+resp.status);
  if(!(resp.headers.get("content-type")??"").includes("application/json"))throw Error("Non-JSON response");
  const body=await resp.text();if(body.length>1_500_000)throw Error("Oversized feed");
  return JSON.parse(body);
 };
 return {id,async identify(){const r=await request("identity");if(typeof r.subject!=="string"||!r.subject||r.deviceId!==identity.deviceId)throw Error("Invalid identity");return r.subject;},
 async pull(cursor,limit=100){if(!Number.isInteger(limit)||limit<1||limit>250)throw Error("Invalid limit");const q=new URLSearchParams({limit:String(limit)});if(cursor!==null)q.set("cursor",cursor);return validateChangePage(await request("changes",q.toString()));}};
}
