// Network-only: private household data is never stored in a shared offline cache.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HomeForce • Offline</title><body style="font-family:sans-serif;padding:40px;background:#f6f7fa;color:#12233b"><h1>HomeForce</h1><p>ইন্টারনেট সংযোগ নেই। সংযোগ ফিরলে আবার খুলুন।</p><button onclick="location.reload()">আবার চেষ্টা করুন</button></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}})))});
