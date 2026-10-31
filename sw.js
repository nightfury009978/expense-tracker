const V='auraspend-v3',CORE=['./','./index.html','./offline.html','./manifest.json','./favicon.svg','./favicon.ico','./favicon-96x96.png','./apple-touch-icon.png','./web-app-manifest-192x192.png','./web-app-manifest-512x512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.allSettled(CORE.map(u=>c.add(u)))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put('./index.html',c));return res}).catch(()=>caches.match('./index.html').then(m=>m||caches.match('./offline.html'))));return}
  e.respondWith(caches.match(r).then(hit=>{
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res}).catch(()=>hit);
    return hit||net}));
});
