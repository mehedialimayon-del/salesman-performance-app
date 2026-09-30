/* Shared FieldForce + OneSignal worker at the GitHub Pages app scope. */
self.addEventListener('notificationclick',event=>{
 if(!event.notification?.data?.ffhLocal)return;
 event.stopImmediatePropagation();event.notification.close();
 const url=new URL(event.notification.data.url,self.registration.scope);
 if(url.origin!==self.location.origin)return;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  const existing=clients.find(client=>new URL(client.url).pathname===url.pathname);
  if(existing){await existing.navigate(url.href);return existing.focus()}
  return self.clients.openWindow(url.href)
 }));
});
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
