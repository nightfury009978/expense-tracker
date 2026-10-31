const V='auraspend-v5',DATA='auraspend-data',TAG='spend';
const CORE=['./','./index.html','./offline.html','./manifest.json','./widgets/spend-template.json','./favicon.svg','./favicon.ico','./favicon-96x96.png','./apple-touch-icon.png','./web-app-manifest-192x192.png','./web-app-manifest-512x512.png'];

self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.allSettled(CORE.map(u=>c.add(u)))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==DATA).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();if(e.data==='WIDGET_REFRESH')e.waitUntil(refreshW())});

/* fetch: network-first pages, stale-while-revalidate for everything else (CDN fonts/Chart.js included) */
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.pathname.endsWith('/widgets/data.json'))return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put('./index.html',c));return res}).catch(()=>caches.match('./index.html').then(m=>m||caches.match('./offline.html'))));return}
  e.respondWith(caches.match(r).then(hit=>{
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res}).catch(()=>hit);
    return hit||net}));
});

/* Windows widget */
async function updW(tag){
  if(!self.widgets)return;
  const tpl=await(await fetch('widgets/spend-template.json')).text();
  const hit=await(await caches.open(DATA)).match(new URL('widgets/data.json',self.registration.scope));
  const data=hit?await hit.text():JSON.stringify({today:'0.00',month:'0.00',left:'-'});
  await self.widgets.updateByTag(tag,{template:tpl,data});
}
async function refreshW(){try{if(self.widgets&&(await self.widgets.getByTag(TAG)))await updW(TAG)}catch{}}
self.addEventListener('widgetinstall',e=>e.waitUntil(updW(e.widget.definition.tag)));
self.addEventListener('widgetresume',e=>e.waitUntil(updW(e.widget.definition.tag)));
self.addEventListener('widgetuninstall',()=>{});

/* Push, notifications, background + periodic sync */
const note=(t,b)=>self.registration.showNotification(t,{body:b,icon:'web-app-manifest-192x192.png',badge:'favicon-96x96.png',tag:'aura',data:{url:'./index.html?action=add'}}).catch(()=>{});
const refreshCore=()=>caches.open(V).then(c=>Promise.allSettled(['./index.html','./manifest.json'].map(u=>c.add(new Request(u,{cache:'reload'})))));
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch{d={body:e.data&&e.data.text()}}e.waitUntil(note(d.title||'AuraSpend',d.body||'Time to log your spending.'))});
self.addEventListener('sync',e=>{if(e.tag==='refresh-data')e.waitUntil(Promise.all([refreshCore(),refreshW()]))});
self.addEventListener('periodicsync',e=>{if(e.tag==='daily-reminder')e.waitUntil(Promise.all([refreshCore(),refreshW(),note('Daily check-in',"Log today's expenses in AuraSpend.")]))});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=(e.notification.data&&e.notification.data.url)||'./index.html';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l.length?l[0].focus():clients.openWindow(u)))});
