import test from "node:test";
import assert from "node:assert/strict";
import {createSiteFeedHandler} from "../site-owned-feed.mjs";
const token="read-only-12345",origin="https://precify.example";
const changes={changes:[{id:"event-1",kind:"order",operation:"delete"}],nextCursor:"c2",hasMore:false};
function backend({authorize=async(t)=>t===token?{subject:"shop-A"}:null,readChanges=async()=>changes}={}){
 return createSiteFeedHandler({authorize,readChanges,allowedOrigins:[origin]});
}
function req(path,method="GET",headers={}){
 return new Request("https://store.example"+path,{method,headers});
}
test("tenant identity requires a valid store token",async()=>{
 assert.equal((await backend()(req("/precify/v1/identity"))).status,401);
 assert.equal((await backend()(req("/precify/v1/identity","GET",{authorization:"Bearer badtoken1"}))).status,403);
 const response=await backend()(req("/precify/v1/identity","GET",{authorization:"Bearer "+token}));
 assert.deepEqual(await response.json(),{subject:"shop-A"});
});
test("scoped feed receives identity and cursor, never from caller query",async()=>{
 const calls=[];const handler=backend({readChanges:async args=>{calls.push(args);return changes;}});
 const response=await handler(req("/precify/v1/changes?limit=10&cursor=c1&subject=shop-B","GET",{authorization:"Bearer "+token}));
 assert.equal(response.status,200);assert.deepEqual(calls,[{subject:"shop-A",cursor:"c1",limit:10}]);
 assert.deepEqual(await response.json(),changes);
});
test("CORS is exact-origin allowlist, never wildcard",async()=>{
 const h=backend();
 const denied=await h(req("/precify/v1/identity","GET",{authorization:"Bearer "+token,origin:"https://evil.example"}));
 assert.equal(denied.status,403);assert.equal(denied.headers.get("access-control-allow-origin"),null);
 const preflight=await h(req("/precify/v1/identity","OPTIONS",{origin}));
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get("access-control-allow-origin"),origin);
 assert.equal(preflight.headers.get("access-control-allow-credentials"),null);
});
test("oversized and rewound page are rejected without implicit resync",async()=>{
 assert.equal((await backend()(req("/precify/v1/changes?limit=251","GET",{authorization:"Bearer "+token}))).status,400);
 const rewound=backend({readChanges:async()=>({changes:[],nextCursor:null,hasMore:false})});
 assert.equal((await rewound(req("/precify/v1/changes?cursor=checkpoint","GET",{authorization:"Bearer "+token}))).status,502);
 const oversized=backend({readChanges:async()=>({changes:Array(11).fill(changes.changes[0]),nextCursor:"x",hasMore:false})});
 assert.equal((await oversized(req("/precify/v1/changes?limit=10","GET",{authorization:"Bearer "+token}))).status,502);
});
test("invalid feed and missing route fail closed",async()=>{
 const h=backend({readChanges:async()=>({changes:[{id:"a",kind:"payment",operation:"upsert"}],hasMore:false,nextCursor:"x"})});
 assert.equal((await h(req("/precify/v1/changes","GET",{authorization:"Bearer "+token}))).status,502);
 assert.equal((await h(req("/precify/v1/admin","GET",{authorization:"Bearer "+token}))).status,404);
 assert.equal((await h(req("/precify/v1/identity","POST",{authorization:"Bearer "+token}))).status,405);
});
