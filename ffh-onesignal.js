/* FieldForce Hub: OneSignal Web SDK bridge. No API secrets here. */
(function(){
'use strict';
const APP_ID='b867a503-3728-411a-977d-cad4bd9b2440';
const deferred=window.OneSignalDeferred=window.OneSignalDeferred||[];
let started=false,lastStaff='';
function init(){if(started)return;started=true;
 deferred.push(async function(OneSignal){
   try{
     // GitHub Pages serves the application from this project path. The worker
     // stays at the app root so its scope covers every FieldForce Hub screen.
     await OneSignal.init({appId:APP_ID,serviceWorkerPath:'OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/salesman-performance-app/'},notifyButton:{enable:false}});
     window.FFH_ONESIGNAL_READY=true;
     // Never bind a push subscription to a locally stored or unverified ID.
     const sync=async()=>{
       try{
         const sb=window.FFH_SUPABASE;if(!sb)return;
         const {data,error}=await sb.auth.getUser();if(error||!data?.user){if(lastStaff){await OneSignal.logout();lastStaff=''}return;}
         const {data:profile,error:pe}=await sb.from('ffh_profiles').select('staff_id,active').eq('auth_user_id',data.user.id).single();
         if(pe||!profile?.staff_id||profile.active===false)return;
         const staff=String(profile.staff_id).trim();if(staff&&staff!==lastStaff){await OneSignal.login(staff);lastStaff=staff;}
         if(window.Notification?.permission==='granted'&&OneSignal.User.PushSubscription?.optedIn===false)await OneSignal.User.PushSubscription.optIn();
       }catch(e){console.warn('FFH OneSignal identity sync:',e)}
     };
     window.FFH_ONESIGNAL_SYNC=sync;
     await sync();
     window.FFH_ONESIGNAL_ASK_PERMISSION=async()=>{await OneSignal.Notifications.requestPermission();if(Notification.permission==='granted'&&OneSignal.User.PushSubscription?.optIn)await OneSignal.User.PushSubscription.optIn()};
     window.FFH_ONESIGNAL_STATUS=()=>({permission:Notification.permission,subscriptionId:OneSignal.User.PushSubscription?.id||null,optedIn:!!OneSignal.User.PushSubscription?.optedIn,externalId:OneSignal.User.externalId||null});
     if(window.FFH_SUPABASE?.auth?.onAuthStateChange){window.FFH_SUPABASE.auth.onAuthStateChange((event)=>{
       if(event==='SIGNED_OUT'){lastStaff='';OneSignal.logout().catch(console.warn)}
       else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(sync,0);
     });}
     OneSignal.Notifications.addEventListener('click',function(e){
       // Backend may set data.ffh_page. Never use arbitrary URLs from notification data.
       const allowed=['notifications','tasks','zero','cpo','sales','route','home','briefings'];
       const page=e?.notification?.additionalData?.ffh_page;
       if(!allowed.includes(page))return;
       sessionStorage.setItem('ffh_push_target',page);
       // The app uses its own page state, so enter through its verified landing route.
       const landing=new URL(location.href);
       landing.searchParams.set('ffh_page',page);
       location.assign(landing.href);
     });
   }catch(e){started=false;console.error('FFH OneSignal init:',e)}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
