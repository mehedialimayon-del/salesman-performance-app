const CACHE='ffh-v52-ai-learning-bulk';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request))));

// Locally generated test notifications open the app inbox on tap.
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'./?ffh_page=notifications',self.registration.scope);
 if(url.origin!==self.location.origin)return;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
   const existing=clients.find(client=>new URL(client.url).pathname===url.pathname);
   if(existing){await existing.navigate(url.href);return existing.focus()}
   return self.clients.openWindow(url.href);
 }));
});
