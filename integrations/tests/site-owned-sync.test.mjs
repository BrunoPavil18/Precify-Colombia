import test from "node:test";
import assert from "node:assert/strict";
import {createSiteConnector,createSyncController,validateChangePage} from "../site-owned-sync.mjs";
const delta=(id)=>({id,kind:"order",operation:"upsert",value:{id}});
function memory(){
 const state=new Map();
 return {
  async read(k){return state.get(k)??null;},
  async apply(k,changes,cursor){const old=state.get(k)??{cursor:null,rows:new Map()};
   const rows=new Map(old.rows);
   for(const c of changes){const key=c.kind+":"+c.id;if(c.operation==="delete")rows.delete(key);else rows.set(key,c.value);}
   state.set(k,{cursor,rows});},
  peek:k=>state.get(k)
 };
}
test("validates protocol and rejects no-progress pages",()=>{
 assert.throws(()=>validateChangePage({changes:[],hasMore:true,nextCursor:null}),/Non-advancing/);
 assert.throws(()=>validateChangePage({changes:[{id:"x",kind:"order",operation:"upsert"}],hasMore:false,nextCursor:null}),/payload/);
 assert.throws(()=>validateChangePage({changes:[{id:"x",kind:"unknown",operation:"delete"}],hasMore:false,nextCursor:null}),/change/);
});
test("site identity and opaque cursor, no credentials in URL",async()=>{
 const urls=[];const cfg={id:"store-1",baseURL:"https://merchant.example/",
  getToken:()=> "read-only-token",
  fetchImpl:async(url,options)=>{
   urls.push([url,options]);
   return {ok:true,headers:{get:()=>"application/json"},text:async()=>JSON.stringify(
    url.includes("identity")?{subject:"tenant-1"}:{changes:[delta("a")],nextCursor:"c:1",hasMore:false}
   )};
  }};
 const connector=createSiteConnector(cfg);
 assert.equal(await connector.identify(),"tenant-1");
 assert.equal((await connector.pull("last/one",100)).nextCursor,"c:1");
 assert.match(urls[1][0],/\/precify\/v1\/changes\?limit=100&cursor=last%2Fone/);
 assert.match(urls[0][0],/\/precify\/v1\/identity$/);
 assert.ok(!urls[1][0].includes("read-only-token"));
 assert.equal(urls[1][1].headers.Authorization,"Bearer read-only-token");
 assert.equal(urls[1][1].credentials,"omit");
});
test("rejects insecure or credential-bearing connector origins",()=>{
 for(const baseURL of ["http://merchant.example","https://user:password@merchant.example","https://merchant.example/?token=x"]){
  assert.throws(()=>createSiteConnector({id:"store",baseURL,getToken:()=>""}));
 }
});
test("incremental multi-page resume and idempotent replays",async()=>{
 const store=memory();const requests=[];
 const connector={pull:async(cursor)=>{requests.push(cursor);return cursor===null?
 {changes:[delta("a")],nextCursor:"page1",hasMore:true}:
 {changes:[delta("b"),delta("a")],nextCursor:"page2",hasMore:false}}};
 const sync=createSyncController({connector,store,scope:"user:site:tenant"});
 const state=await sync.run();
 assert.equal(state.phase,"ready");assert.equal(state.pulled,3);
 assert.equal(store.peek("user:site:tenant").rows.size,2);
 assert.deepEqual(requests,[null,"page1"]);
 const another=createSyncController({connector,store,scope:"user:site:tenant"});
 await another.run();
 assert.equal(requests[2],"page2");
});
test("atomic checkpoint remains unchanged after failed commit",async()=>{
 const store=memory();let calls=0;
 const wrapped={read:(...args)=>store.read(...args),apply:async(...args)=>{if(++calls===2)throw Error("disk failed");await store.apply(...args);}};
 const connector={pull:async(cursor)=>cursor===null?
 {changes:[delta("a")],nextCursor:"c1",hasMore:true}:
 {changes:[delta("b")],nextCursor:"c2",hasMore:false}};
 const sync=createSyncController({connector,store:wrapped,scope:"site"});
 assert.equal((await sync.run()).phase,"error");
 assert.equal(store.peek("site").cursor,"c1");
 assert.equal((await sync.run(true)).phase,"ready");
 assert.equal(store.peek("site").cursor,"c2");
});
test("coalesces concurrent calls",async()=>{
 let finish;let count=0;const store=memory();
 const controller=createSyncController({connector:{pull:async()=>{count++;return await new Promise(resolve=>finish=resolve);}},store,scope:"s"});
 const first=controller.run();const second=controller.run(true);
 await Promise.resolve();await Promise.resolve();
 finish({changes:[delta("a")],nextCursor:"done",hasMore:false});
 await Promise.all([first,second]);
 assert.equal(count,1);
});
test("automatic retry backoff and manual override",async()=>{
 let now=100000,count=0;const store=memory();
 const controller=createSyncController({connector:{pull:async()=>{count++;throw Error("timeout");}},store,scope:"x",clock:()=>now});
 assert.equal((await controller.run()).phase,"error");
 await controller.run();assert.equal(count,1);
 await controller.run(true);assert.equal(count,2);
 now+=120000;await controller.run();assert.equal(count,3);
});
test("handles deletions without clobbering other identities",async()=>{
 const store=memory();const changes=[delta("same")];
 await store.apply("account:a",changes,"c1");
 await store.apply("account:b",changes,"c1");
 await store.apply("account:a",[{id:"same",kind:"order",operation:"delete"}],"c2");
 assert.equal(store.peek("account:a").rows.size,0);
 assert.equal(store.peek("account:b").rows.size,1);
});
test("cursor loop is an error, not infinite polling",async()=>{
 const store=memory();
 const sync=createSyncController({connector:{pull:async()=>({changes:[delta("a")],nextCursor:"same",hasMore:true})},store,scope:"x"});
 assert.equal((await sync.run()).phase,"error");
 assert.equal(store.peek("x").cursor,"same");
});

test("malformed IDs and cursor rewinds never mutate the checkpoint",async()=>{
 assert.throws(()=>validateChangePage({changes:[{kind:"order",operation:"delete"}],hasMore:false,nextCursor:"x"}),/change/);
 const store=memory();
 await store.apply("s",[], "stable");
 const controller=createSyncController({connector:{pull:async()=>({changes:[delta("x")],nextCursor:null,hasMore:false})},store,scope:"s"});
 assert.equal((await controller.run()).phase,"error");
 assert.equal(store.peek("s").cursor,"stable");
});
