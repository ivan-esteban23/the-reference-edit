// Version the offline shell whenever index.html or its app assets change.
const CACHE='visual-edit-shell-network-first-20261014-v1';
const SHELL=['/index.html','/manifest.webmanifest','/favicon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png'];
// Hosting may redirect /index.html to /. Store a fresh response so navigation can reuse it safely.
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(SHELL.map(async path=>{const response=await fetch(path,{cache:'reload'});if(!response.ok)throw new Error('Offline asset unavailable');await cache.put(path,new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}));}));await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys()){if(name.startsWith('visual-edit-shell-')&&name!==CACHE)await caches.delete(name);}await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Online reloads use the latest page; offline or slow connections use the saved shell.
 if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){event.respondWith((async()=>{
  const cache=await caches.open(CACHE),controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try{
   const response=await fetch(request,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error('Page unavailable');
   clearTimeout(timer);
   // Remove redirect metadata before storing, as the host may redirect /index.html to /.
   const copy=response.clone();
   await cache.put('/index.html',new Response(copy.body,{status:copy.status,statusText:copy.statusText,headers:copy.headers}));
   return response;
  }catch(error){return await cache.match('/index.html')||new Response('Reconnect to load The Visual Edit.',{status:503,headers:{'Content-Type':'text/plain'}});}
  finally{clearTimeout(timer);}
 })());return;}
 if(SHELL.includes(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(url.pathname)||fetch(request);})());}
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){self.skipWaiting();return;}
 if(event.data?.type==='OFFLINE_STATUS'&&event.ports[0]){event.waitUntil((async()=>{const cache=await caches.open(CACHE);const entries=await Promise.all(SHELL.map(path=>cache.match(path)));event.ports[0].postMessage({ready:entries.every(Boolean)});})());}
});
