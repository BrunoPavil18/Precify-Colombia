/** Real Chromium visual smoke for the compiled Precify Financy UI. Node 22+. */
import http from "node:http";
import {existsSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,statSync} from "node:fs";
import {join,resolve,extname,sep} from "node:path";
import {tmpdir} from "node:os";
import {spawn,spawnSync} from "node:child_process";
const root=resolve("apps/web/dist");
if(!existsSync(join(root,"index.html")))throw Error("Missing production build");
const chrome=[process.env.CHROME_PATH,"google-chrome","chromium","chromium-browser"].filter(Boolean).find(x=>spawnSync(x,["--version"],{stdio:"ignore"}).status===0);
if(!chrome)throw Error("Chrome or Chromium executable required");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json",".png":"image/png",".webp":"image/webp",".ico":"image/x-icon"};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost"),path=url.pathname==="/"?"/index.html":decodeURIComponent(url.pathname);
  const file=resolve(root,"."+path);
  if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile())throw Error("invalid path");
  res.setHeader("content-type",mime[extname(file)]??"application/octet-stream");res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end("not found");}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const origin="http://127.0.0.1:"+server.address().port,tmp=mkdtempSync(join(tmpdir(),"precify-redesign-"));
const wait=ms=>new Promise(ok=>setTimeout(ok,ms));
async function until(fn){
 const start=Date.now();while(Date.now()-start<16000){try{const val=await fn();if(val)return val;}catch{}await wait(110);}
 throw Error("Browser readiness timed out");
}
let child,ws,id=0;const pending=new Map(),errors=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));
});
async function evaluate(expression){
 const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});
 if(r.exceptionDetails)throw Error("Browser exception: "+JSON.stringify(r.exceptionDetails).slice(0,1300));
 return r.result.value;
}
async function nav(label,heading){
 const clicked=await evaluate('(()=>{const el=[...document.querySelectorAll(".nav-link")].find(x=>x.textContent.includes('+JSON.stringify(label)+'));if(!el)return false;el.click();return true})()');
 if(!clicked)throw Error("Navigation item not found: "+label);
 await until(async()=>String(await evaluate('document.querySelector(".page-heading h1")?.textContent||""')).includes(heading));
}
async function shot(file){
 const data=await send("Page.captureScreenshot",{format:"png",fromSurface:true});
 mkdirSync("artifacts/redesign",{recursive:true});
 writeFileSync(join("artifacts/redesign",file),Buffer.from(data.data,"base64"));
}
try{
 child=spawn(chrome,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
  "--no-proxy-server","--no-first-run","--disable-background-networking",
  "--remote-debugging-port=0","--window-size=1440,900","--user-data-dir="+tmp,origin+"/"],{stdio:"ignore"});
 const port=await until(()=>{const path=join(tmp,"DevToolsActivePort");return existsSync(path)?Number(readFileSync(path,"utf8").split("\n")[0]):null});
 const page=await until(async()=>{const res=await fetch("http://127.0.0.1:"+port+"/json/list");return (await res.json()).find(p=>p.type==="page"&&p.webSocketDebuggerUrl);});
 ws=new WebSocket(page.webSocketDebuggerUrl);
 ws.addEventListener("message",e=>{const x=JSON.parse(e.data),p=pending.get(x.id);
  if(p){pending.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result);}
  if(x.method==="Runtime.exceptionThrown")errors.push(x.params?.exceptionDetails?.text??"JS exception");
 });
 await new Promise((ok,fail)=>{ws.addEventListener("open",ok,{once:true});ws.addEventListener("error",fail,{once:true});});
 await send("Runtime.enable");await send("Page.enable");
 await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"no-preference"}]});
 const result=await send("Page.navigate",{url:origin+"/"});
 if(result.errorText)throw Error(result.errorText);
 await until(()=>evaluate('!!document.querySelector(".overview-page")'));
 const audit=await evaluate('({background:getComputedStyle(document.querySelector(".app-shell")).backgroundColor,stats:document.querySelectorAll(".overview-stat").length,links:document.querySelectorAll(".nav-link").length,animation:getComputedStyle(document.querySelector(".overview-page")).animationDuration,reduce:matchMedia("(prefers-reduced-motion:reduce)").matches})');
 if(audit.background!=="rgb(18, 18, 18)"||audit.stats!==4||audit.links<18||audit.animation==="0s"||audit.reduce)throw Error("Dark/motion/dashboard contract: "+JSON.stringify(audit));
 await shot("overview-desktop.png");
 for(const [label,title] of [
  ["Calculadora","Calculadora de precios"],["Productos","Catálogo de productos"],
  ["Escenarios","Escenarios de rentabilidad"],["Metas","Metas y punto de equilibrio"],
  ["Precio por unidad","Precio por unidad"],["Precio al consumidor","Precio al consumidor"],
  ["Cartera multiproducto","Cartera multiproducto"],
  ["Riesgo COD","Simulación de riesgo COD"],["Marketing y CAC","Marketing y CAC"],
  ["Matriz CPA","Matriz de sensibilidad CPA"],["Precios internacionales","Precificación internacional"],
  ["Precificación COD","Precificación COD integrada"],["Importar CSV","Importación de datos"],
  ["Conexiones","Fuentes y conexiones"],["Panel COD","Panel de operaciones COD"],
  ["Informes","Informes y comparaciones"],["Competidores","Referencias de competidores"],
  ["Divisas","Divisas y cambio"],["Datos y copias","Datos, privacidad y copias"]
 ]){
  await nav(label,title);
  if(label==="Conexiones"){
   await until(()=>evaluate('!!document.querySelector(".connection-onboarding")'));
   const check=await evaluate('({device:!!document.querySelector(".website-sync-lab"),legacy:!!document.querySelector(".connected-lab"),advanced:document.querySelector(".optional-cloud-toggle")?.getAttribute("aria-expanded"),help:!!document.querySelector(".connection-onboarding a[href*=STORE_DEVICE_API_V2]")})');
   if(!check.device||check.legacy||check.advanced!=="false"||!check.help)throw Error("Connection onboarding/legacy separation regression: "+JSON.stringify(check));
   await shot("desktop-conexiones-device-first.png");
   await evaluate('document.querySelector(".optional-cloud-toggle").click()');
   await until(()=>evaluate('!!document.querySelector(".connected-lab")'));
   await evaluate('document.querySelector(".optional-cloud-toggle").click()');
   if(await evaluate('!!document.querySelector(".connected-lab")'))throw Error("Optional connected accounts did not unmount after closing");
  }
  if(["Calculadora","Riesgo COD","Marketing y CAC","Panel COD","Informes","Datos y copias"].includes(label))
   await shot("desktop-"+label.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".png");
 }
 // End-to-end local workflow: save the default editable example and verify dashboard persistence.
 await nav("Calculadora","Calculadora de precios");
 const didSave=await evaluate('(()=>{const button=[...document.querySelectorAll(".action-strip button")].find(el=>el.textContent.includes("Guardar producto"));if(!button)return false;button.click();return true})()');
 if(!didSave)throw Error("Save product action was not found");
 await until(()=>evaluate('document.querySelectorAll(".product-card").length===1'));
 await send("Page.reload",{ignoreCache:true});
 await until(()=>evaluate('!!document.querySelector(".overview-page")'));
 const savedCount=await evaluate('document.querySelector(".overview-stat strong")?.textContent.trim()');
 if(savedCount!=="1")throw Error("Saved product was not preserved after browser reload");
 await shot("overview-with-product.png");

 // Business isolation regression: new profile must not inherit the first business's product.
 await evaluate('document.querySelector(".business-add").click()');
 const wrote=await evaluate('(()=>{const input=document.querySelector(".business-editor input");if(!input)return false;const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(input,"Tienda 2");input.dispatchEvent(new Event("input",{bubbles:true}));return true;})()');
 if(!wrote)throw Error("Business create editor missing");
 await until(()=>evaluate('!document.querySelector(".business-editor button.primary")?.disabled'));
 await evaluate('document.querySelector(".business-editor button.primary").click()');
 await until(()=>evaluate('document.querySelector("#business-select")?.value.startsWith("b_")'));
 const fresh=await evaluate('document.querySelector(".overview-stat strong")?.textContent.trim()');
 if(fresh!=="0")throw Error("New business leaked the default catalog: "+fresh);
 await nav("Calculadora","Calculadora de precios");
 const saveSecond=await evaluate('(()=>{const b=[...document.querySelectorAll(".action-strip button")].find(x=>x.textContent.includes("Guardar producto"));if(!b)return false;b.click();return true})()');
 if(!saveSecond)throw Error("Cannot save in second business");
 await until(()=>evaluate('document.querySelectorAll(".product-card").length===1'));
 await evaluate('(()=>{const s=document.querySelector("#business-select");s.value="default";s.dispatchEvent(new Event("change",{bubbles:true}))})()');
 await until(()=>evaluate('document.querySelector("#business-select")?.value==="default"'));
 const originalCount=await evaluate('document.querySelector(".overview-stat strong")?.textContent.trim()');
 if(originalCount!=="1")throw Error("Original business modified during second profile test");
 await evaluate('(()=>{const s=document.querySelector("#business-select");s.value="all";s.dispatchEvent(new Event("change",{bubbles:true}))})()');
 await until(()=>evaluate('!!document.querySelector(".business-portfolio")'));
 const summary=await evaluate('([...document.querySelectorAll(".business-portfolio .overview-stat strong")].map(x=>x.textContent.trim()))');
 if(summary[0]!=="2"||summary[1]!=="2")throw Error("Multi-business summary incorrect: "+JSON.stringify(summary));
 await shot("business-portfolio-desktop.png");
 // Changing sections in all-business mode must not silently switch to "default".
 await nav("Productos","Catálogo de productos");
 const keptAll=await evaluate('document.querySelector("#business-select")?.value==="all" && !!document.querySelector(".business-route-picker") && !document.querySelector(".product-card")');
 if(!keptAll)throw Error("All-business route silently changed the selected profile or exposed editing state");
 const selectBusiness=await evaluate('(()=>{const button=[...document.querySelectorAll(".business-route-picker [data-business-id]")].find(el=>el.getAttribute("data-business-id")?.startsWith("b_"));if(!button)return false;button.click();return true})()');
 if(!selectBusiness)throw Error("Explicit business target not offered");
 await until(()=>evaluate('document.querySelector("#business-select")?.value.startsWith("b_") && document.querySelector(".page-heading h1")?.textContent.includes("Catálogo de productos")'));
 const targetProducts=await evaluate('document.querySelectorAll(".product-card").length');
 if(targetProducts!==1)throw Error("Explicit business route did not retain selected business data");
 await evaluate('(()=>{const s=document.querySelector("#business-select");s.value="all";s.dispatchEvent(new Event("change",{bubbles:true}))})()');
 await until(()=>evaluate('!!document.querySelector(".business-portfolio")'));
 await nav("Informes","Informes y comparaciones");
 if(!(await evaluate('document.querySelector("#business-select")?.value==="all" && !!document.querySelector(".business-route-picker")')))throw Error("Aggregate reports switched business silently");
 await evaluate('document.querySelector(".business-route-back").click()');
 await until(()=>evaluate('!!document.querySelector(".business-portfolio")'));
 await evaluate('(()=>{const s=document.querySelector("#business-select");s.value="default";s.dispatchEvent(new Event("change",{bubbles:true}))})()');
 await until(()=>evaluate('!!document.querySelector(".overview-page")'));

 const home=await evaluate('(()=>{const item=[...document.querySelectorAll(".nav-link")].find(x=>x.textContent.includes("Visión general"));if(!item)return false;item.click();return true})()');
 if(!home)throw Error("Dashboard entry missing");
 await until(()=>evaluate('!!document.querySelector(".overview-page")'));
 await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await wait(350);
 const visible=await evaluate('getComputedStyle(document.querySelector(".menu-toggle")).display!=="none"');
 if(!visible)throw Error("Mobile menu trigger hidden");
 const mobileMetrics=await evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,bottom:getComputedStyle(document.querySelector(".mobile-bottom-nav")).display})');
 if(mobileMetrics.bottom==="none"||mobileMetrics.scroll>mobileMetrics.width+2)throw Error("Mobile overflow or missing quick bar: "+JSON.stringify(mobileMetrics));

 await evaluate('document.querySelector(".menu-toggle").click()');
 await wait(300);
 if(!(await evaluate('document.querySelector(".sidebar").classList.contains("mobile-open")')))throw Error("Mobile sidebar did not open");
 if(await evaluate('getComputedStyle(document.querySelector(".mobile-close")).display==="none"'))throw Error("Mobile close control missing");
 await shot("overview-mobile.png");
 await nav("Calculadora","Calculadora de precios");
 await wait(350);
 if(await evaluate('document.querySelector(".sidebar").classList.contains("mobile-open")'))throw Error("Mobile sidebar did not close after navigation");
 await shot("calculator-mobile.png");
 if(errors.length)throw Error("Unhandled React/JS errors: "+JSON.stringify(errors.slice(0,4)));
 console.log("PASS: Jet Black, normal animation, 19 routed tools, scoped business isolation and real mobile drawer, no JS exceptions");
}finally{
 try{ws?.close();}catch{}
 try{child?.kill("SIGKILL");}catch{}
 await new Promise(ok=>server.close(ok));
 rmSync(tmp,{recursive:true,force:true});
}
