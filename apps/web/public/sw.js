/* Asset-only offline cache. Local product/backup data are never fetched or cached. */
const VERSION="precify-colombia-v2-assets-1";
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(VERSION).then(cache=>cache.add(new Request("./",{cache:"reload"}))));
});
self.addEventListener("activate",event=>{
 event.waitUntil(self.clients.claim());
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