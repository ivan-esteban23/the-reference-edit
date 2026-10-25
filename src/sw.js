// Version the offline shell whenever index.html or its app assets change.
const CACHE='visual-edit-shell-hero-alt-v16';
// Precache the cover, gallery catalog and three illustrations. Source logos cache on demand.
const SHELL=['/data/references.json','/images/references/tokyo-street/tokyo-street-01.jpg','/images/references/seoul-fashion-week/seoul-fashion-week-01.jpg','/images/references/paris-office/paris-office-01.jpg','/index.html','/manifest.webmanifest','/favicon.svg','/icons/reference-edit-192.png','/icons/reference-edit-512.png','/icons/reference-edit-maskable-512.png','/icons/reference-edit-apple-touch-180.png','/icons/reference-edit-favicon-64.png','/images/image-79c5c1401cc2d69b.jpg','/fonts/font-8a08d13f8a6c0d51.ttf','/fonts/font-29160a80ff49ddca.ttf'];
// Hosting may redirect /index.html to /. Store a fresh response so navigation can reuse it safely.
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(SHELL.map(async path=>{const response=await fetch(path,{cache:'reload'});if(!response.ok)throw new Error('Offline asset unavailable');await cache.put(path,new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}));}));await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 // Storage may be unavailable or evicted. Failed cleanup must not prevent claiming clients.
 for(const name of await caches.keys().catch(()=>[])){if(name.startsWith('visual-edit-shell-')&&name!==CACHE)await caches.delete(name).catch(()=>{});}
 await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Online reloads use the latest page; offline or slow connections use the saved shell.
 if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){event.respondWith((async()=>{
  // Runtime cache writes are best-effort: quota/privacy failures must not hide a fresh page.
  // Installation above stays strict so an incomplete shell cannot replace a working worker.
  const cache=await caches.open(CACHE).catch(()=>null),controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try{
   const response=await fetch(request,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error('Page unavailable');
   // Keep the deadline active until the whole page arrives, not just its headers.
   const body=await response.arrayBuffer();
   clearTimeout(timer);
   // Remove redirect metadata so the saved response can be used for navigation.
   const page=new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
   if(cache)await cache.put('/index.html',page.clone()).catch(()=>{});
   return page;
  }catch(error){return (cache&&await cache.match('/index.html').catch(()=>null))||new Response('Reconnect to load The Reference Edit.',{status:503,headers:{'Content-Type':'text/plain'}});}
  finally{clearTimeout(timer);}
 })());return;}
 if(SHELL.includes(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(CACHE).catch(()=>null);return (cache&&await cache.match(url.pathname).catch(()=>null))||fetch(request);})());}
 // Content-addressed local images can be reused across reloads without a network round trip.
 // A failed download or cache write must not prevent the directory itself from working.
 else if(/^\/images\/image-[a-f0-9]{16}\.(png|jpg|gif|ico|svg)$/.test(url.pathname)){event.respondWith((async()=>{
  const cache=await caches.open(CACHE).catch(()=>null),saved=cache&&await cache.match(url.pathname).catch(()=>null);if(saved)return saved;
  // Never store opaque responses: their body/status cannot be verified and quota cost varies.
  const response=await fetch(request);if(cache&&response.ok&&response.type==='basic')await cache.put(url.pathname,response.clone()).catch(()=>{});
  return response;
 })());}
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil(self.skipWaiting());return;}
 if(event.data?.type==='OFFLINE_STATUS'&&event.ports[0]){event.waitUntil((async()=>{
  let ready=false;
  try{const cache=await caches.open(CACHE);const entries=await Promise.all(SHELL.map(path=>cache.match(path)));ready=entries.every(Boolean);}catch(error){/* Report unavailable storage instead of leaving the UI waiting. */}
  event.ports[0].postMessage({ready});
 })());}
});
