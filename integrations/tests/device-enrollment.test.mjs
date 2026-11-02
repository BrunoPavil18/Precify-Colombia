import test from "node:test";
import assert from "node:assert/strict";
import {generateDeviceIdentity,activateDevice,createDeviceConnector,signDeviceRequest} from "../device-client.mjs";
import {createDeviceFeedHandler,hashEnrollmentCode} from "../device-feed.mjs";
const code="Q".repeat(44);
const fixture=()=>{
 const grants=new Map(),replay=new Set(),redeemed=new Set();
 const store={
  async redeem({codeHash,deviceId,publicKey}){if(codeHash!==hashEnrollmentCode(code)||redeemed.has(codeHash)||grants.has(deviceId))return null;redeemed.add(codeHash);grants.set(deviceId,{subject:"shop-one",scopes:["finance:read"],publicKey});return{subject:"shop-one"};},
  async lookup(id){return grants.get(id)??null;},
  async useNonce(id,nonce){const k=id+":"+nonce;if(replay.has(k))return false;replay.add(k);return true;}
 };
 const handler=createDeviceFeedHandler({store,readChanges:async()=>({changes:[],nextCursor:null,hasMore:false}),allowedOrigins:["https://financy.example"]});
 const fetchImpl=(url,init)=>handler(new Request(url,init));
 return {grants,handler,fetchImpl};
};
test("a single enrollment code can only activate one installation",async()=>{
 const f=fixture(),one=await generateDeviceIdentity(),two=await generateDeviceIdentity();
 assert.equal((await activateDevice({baseURL:"https://store.example",code,identity:one,fetchImpl:f.fetchImpl})).subject,"shop-one");
 await assert.rejects(()=>activateDevice({baseURL:"https://store.example",code,identity:two,fetchImpl:f.fetchImpl}),/already in use/);
 assert.equal(f.grants.size,1);
 const c=createDeviceConnector({id:"store",baseURL:"https://store.example",identity:one,fetchImpl:f.fetchImpl});
 assert.equal(await c.identify(),"shop-one");
 assert.deepEqual((await c.pull(null)).changes,[]);
});
test("signatures are sender-bound, time-bound, replay-protected and revocable",async()=>{
 const f=fixture(),a=await generateDeviceIdentity(),b=await generateDeviceIdentity();
 await activateDevice({baseURL:"https://store.example",code,identity:a,fetchImpl:f.fetchImpl});
 const u="https://store.example/precify/v2/identity";
 const headers=await signDeviceRequest({url:u,deviceId:a.deviceId,privateKey:a.privateKey});
 assert.equal((await f.handler(new Request(u,{headers}))).status,200);
 assert.equal((await f.handler(new Request(u,{headers}))).status,409);
 const fake=await signDeviceRequest({url:u,deviceId:a.deviceId,privateKey:b.privateKey});
 assert.equal((await f.handler(new Request(u,{headers:fake}))).status,401);
 const old=await signDeviceRequest({url:u,deviceId:a.deviceId,privateKey:a.privateKey,clock:()=>Date.now()-150000});
 assert.equal((await f.handler(new Request(u,{headers:old}))).status,401);
 f.grants.get(a.deviceId).revoked=true;
 const next=await signDeviceRequest({url:u,deviceId:a.deviceId,privateKey:a.privateKey});
 assert.equal((await f.handler(new Request(u,{headers:next}))).status,403);
});
test("CORS and routing are constrained",async()=>{
 const f=fixture();
 assert.equal((await f.handler(new Request("https://store.example/precify/v2/identity",{headers:{Origin:"https://evil.example"}}))).status,403);
 assert.equal((await f.handler(new Request("https://store.example/private"))).status,404);
});
