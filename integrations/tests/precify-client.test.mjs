import test from "node:test";
import assert from "node:assert/strict";
import {PrecifyConnectedClient} from "../precify-client.mjs";
const key="prc_live_"+"a".repeat(64),org="11111111-1111-4111-8111-111111111111";
test("server integration preserves organization scope and never changes URL host",async()=>{
 let called;
 const client=new PrecifyConnectedClient({baseURL:"https://api.example.test",apiKey:key,
  fetchImpl:async(url,options)=>{called={url,options};return {ok:true,json:async()=>({imported:1})};}});
 assert.deepEqual(await client.sendOrderEvents(org,[{id:"e"}]),{imported:1});
 assert.equal(called.url,"https://api.example.test/v1/orgs/"+org+"/orders/import");
 assert.equal(called.options.headers.Authorization,"ApiKey "+key);
 await assert.rejects(client.dashboard("../other"));
 assert.throws(()=>new PrecifyConnectedClient({baseURL:"http://public.example",apiKey:key}));
});
