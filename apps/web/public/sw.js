/* Asset-only offline cache. Local product/backup data are never fetched or cached. */
const VERSION="precify-colombia-v2-assets-1";
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  const page=new URL("./",self.registration.scope);
  const response=await fetch(page,{cache:"reload"});
  if(!response.ok)throw new Error("Offline shell unavailable");
  const html=await response.clone().text();
  await cache.put(page,response);
  const paths=[...html.matchAll(/(?:src|href)="([^"]+)"/g)]
   .map(m=>m[1]).filter(path=>path && !/^(https?:|data:|#)/.test(path));
  const urls=[...new Set(paths.map(path=>new URL(path,page).href))];
  await Promise.all(urls.map(async url=>{
   const resource=await fetch(url,{cache:"reload"});
   if(resource.ok)await cache.put(url,resource);
  }));
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys()){
   if(key.startsWith("precify-colombia-v2-assets-")&&key!==VERSION)await caches.delete(key);
  }
  await self.clients.claim();
 })());
});
self.addEventListener("message",event=>{
 if(event.data?.type==="ACTIVATE_UPDATE")self.skipWaiting();
});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin || /\/api\//.test(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(VERSION);
  if(event.request.mode==="navigate"){
   try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
   catch{return await cache.match(event.request)||await cache.match("./")||Response.error();}
  }
  const cached=await cache.match(event.request);
  if(cached)return cached;
  try{
   const response=await fetch(event.request);
   if(response.ok && ["script","style","image","font","manifest"].includes(event.request.destination))await cache.put(event.request,response.clone());
   return response;
  }catch{return Response.error();}
 })());
});