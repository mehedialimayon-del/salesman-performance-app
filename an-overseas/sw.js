/* A&N Overseas own service worker, separate from FieldForce Hub root PWA. */
const PATH='/salesman-performance-app/an-overseas/';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const r=event.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin||!u.pathname.startsWith(PATH))return;
  event.respondWith(fetch(r,{cache:'no-store'}));
});