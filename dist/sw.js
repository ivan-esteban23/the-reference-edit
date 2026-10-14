// Version the offline shell whenever index.html or its app assets change.
const CACHE='visual-edit-shell-4558d67a44e9-r2';
const SHELL=['/index.html','/manifest.webmanifest','/favicon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png'];
// Hosting may redirect /index.html to /. Store a fresh response so navigation can reuse it safely.
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(SHELL.map(async path=>{const response=await fetch(path,{cache:'reload'});if(!response.ok)throw new Error('Offline asset unavailable');await cache.put(path,new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}));}));})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys()){if(name.startsWith('visual-edit-shell-')&&name!==CACHE)await caches.delete(name);}await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match('/index.html')||fetch(request);})());return;}
 if(SHELL.includes(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(url.pathname)||fetch(request);})());}
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){self.skipWaiting();return;}
 if(event.data?.type==='OFFLINE_STATUS'&&event.ports[0]){event.waitUntil((async()=>{const cache=await caches.open(CACHE);const entries=await Promise.all(SHELL.map(path=>cache.match(path)));event.ports[0].postMessage({ready:entries.every(Boolean)});})());}
});
