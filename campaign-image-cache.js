/* Public, same-origin campaign artwork only; authenticated records are never cached. */
(()=>{'use strict';const NAME='ffh-campaign-images-v1',paths=['campaign-assets/cpo.webp','campaign-assets/promotion.webp','campaign-assets/incentives.webp','home-motivation.png'],urls=paths.map(p=>new URL(p,self.registration.scope).href),allowed=url=>urls.includes(url);
self.addEventListener('install',event=>event.waitUntil(caches.open(NAME).then(cache=>Promise.allSettled(urls.map(async url=>{const response=await fetch(url);if(response.ok)await cache.put(url,response);})))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!allowed(event.request.url))return;const fresh=caches.open(NAME).then(async cache=>{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;});event.waitUntil(fresh.catch(()=>{}));event.respondWith(caches.open(NAME).then(async cache=>(await cache.match(event.request))||fresh));});
})();
