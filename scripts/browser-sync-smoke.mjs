/** Real Chrome/Chromium IndexedDB smoke, dependency-free Node >=22 CDP. */
import http from "node:http";
import {readFileSync,mkdtempSync,rmSync,existsSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawn,spawnSync} from "node:child_process";
if(!process.argv[2])throw Error("Pass compiled website-sync-db.js path");
const source=readFileSync(process.argv[2],"utf8");
const binary=[process.env.CHROME_PATH,"google-chrome","chromium","chromium-browser"].filter(Boolean).find(bin=>spawnSync(bin,["--version"],{stdio:"ignore"}).status===0);
if(!binary)throw Error("Chrome/Chromium executable not found");
const dir=mkdtempSync(join(tmpdir(),"precify-idb-"));
const server=http.createServer((req,res)=>{
 res.setHeader("cache-control","no-store");
 if(req.url==="/db.js"){res.setHeader("content-type","text/javascript");res.end(source);}
 else{res.setHeader("content-type","text/html");res.end("<!doctype html><title>Precify IndexedDB smoke</title>");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
let browser,ws,seq=0;
const requests=new Map();
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,timeout=14000){
 const since=Date.now();while(Date.now()-since<timeout){try{const x=await fn();if(x)return x;}catch{}await wait(100);}
 throw Error("Chrome/CDP readiness timed out");
}
function command(method,params={}){
 const id=++seq;return new Promise((resolve,reject)=>{
  requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expression){
 const r=await command("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});
 if(r.exceptionDetails)throw Error("Browser JS exception: "+JSON.stringify(r.exceptionDetails).slice(0,1800));
 return r.result.value;
}
async function browserCases(){
 let stage="import";
 try {
 const m=await import("/db.js");
 const stamp=String(Date.now()),a="storeA:"+stamp,b="storeB:"+stamp;
 const change=(id,amount)=>({id,kind:"order",operation:"upsert",value:{id,amount}});
 const check=(x,msg)=>{if(!x)throw Error(msg);};
 stage="initial insert";
 await m.applySitePage(a,[change("evt1","100")],"c1",null);
 let cp=await m.readSiteCheckpoint(a);
 check(cp.cursor==="c1"&&cp.count===1,"initial checkpoint");
 stage="conflicting immutable event";
 let conflicting=false;
 try{await m.applySitePage(a,[change("evt1","200")],"c2","c1");}catch{conflicting=true;}
 check(conflicting,"immutable order event replay");
 check((await m.readSiteCheckpoint(a)).cursor==="c1","conflict rollback");
 stage="stale cursor";
 let stale=false;
 try{await m.applySitePage(a,[change("evt2","200")],"c2","wrong");}catch{stale=true;}
 check(stale,"cross-tab stale cursor rejection");
 check((await m.readSiteCheckpoint(a)).cursor==="c1","stale cursor rollback");
 stage="other tenant insert";
 await m.applySitePage(b,[change("evt1","other")],"other-c1",null);
 stage="concurrent writes";
 const concurrent=await Promise.allSettled([
  m.applySitePage(a,[change("evt2","201")],"c2","c1"),
  m.applySitePage(a,[change("evt3","202")],"c3","c1")
 ]);
 check(concurrent.filter(x=>x.status==="fulfilled").length===1,"concurrent writers");
 check((await m.readSiteRows(a)).length===2,"local record count");
 stage="source cache deletion";
 await m.purgeSiteCache("storeA");
 check((await m.readSiteCheckpoint(a))===null,"source revoke");
 check((await m.readSiteRows(b)).length===1,"unrelated tenant retained");
 return {ok:true,scope:b,checks:9};
 }catch(error){return {ok:false,stage,error:String(error)}}
}
async function persistentCase(scope){
 const m=await import("/db.js");
 const cp=await m.readSiteCheckpoint(scope),rows=await m.readSiteRows(scope);
 return cp?.cursor==="other-c1"&&rows.length===1;
}
try{
 browser=spawn(binary,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
  "--no-first-run","--no-proxy-server","--disable-background-networking","--remote-debugging-port=0",
  "--user-data-dir="+dir,origin+"/"],{stdio:"ignore"});
 const port=await until(()=>{
  const file=join(dir,"DevToolsActivePort");
  return existsSync(file)?Number(readFileSync(file,"utf8").split("\n")[0]):null;
 });
 const page=await until(async()=>{
  const response=await fetch("http://127.0.0.1:"+port+"/json/list");
  return (await response.json()).find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
 });
 ws=new WebSocket(page.webSocketDebuggerUrl);
 ws.addEventListener("message",ev=>{
  const event=JSON.parse(ev.data),pending=requests.get(event.id);
  if(pending){requests.delete(event.id);event.error?pending.reject(Error(event.error.message)):pending.resolve(event.result);}
 });
 await new Promise((resolve,reject)=>{
  ws.addEventListener("open",resolve,{once:true});
  ws.addEventListener("error",reject,{once:true});
 });
 await command("Runtime.enable");
 await command("Page.enable");
 const nav=await command("Page.navigate",{url:origin+"/"});
 if(nav.errorText)throw Error("Chrome navigation failed: "+nav.errorText);
 await until(()=>evaluate('document.readyState==="complete" && location.origin==='+JSON.stringify(origin)));
 const result=await evaluate("("+browserCases.toString()+")()");
 if(!result?.ok)throw Error("Browser IndexedDB check failed: "+JSON.stringify(result));
 await command("Page.reload",{ignoreCache:true});
 await until(()=>evaluate('document.readyState==="complete" && location.origin==='+JSON.stringify(origin)));
 const reload=await evaluate("("+persistentCase.toString()+")("+JSON.stringify(result.scope)+")");
 if(!reload)throw Error("IndexedDB cache did not survive browser reload");
 console.log("PASS: real Chromium IndexedDB atomic cursor, concurrency, delete, tenant isolation and reload ("+result.checks+" checks)");
}finally{
 try{ws?.close();}catch{}
 try{browser?.kill("SIGKILL");}catch{}
 await new Promise(resolve=>server.close(resolve));
 rmSync(dir,{recursive:true,force:true});
}
