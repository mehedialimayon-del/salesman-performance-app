/* FieldForce Hub: OneSignal Web SDK bridge. No API secrets here. */
(function(){
'use strict';
const APP_ID='b867a503-3728-411a-977d-cad4bd9b2440';
const deferred=window.OneSignalDeferred=window.OneSignalDeferred||[];
let started=false,lastStaff='';
function init(){if(started)return;started=true;
 deferred.push(async function(OneSignal){
   try{
     await OneSignal.init({appId:APP_ID,serviceWorkerPath:'push/OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/push/'},notifyButton:{enable:false}});
     window.FFH_ONESIGNAL_READY=true;
     // Never bind a push subscription to a locally stored or unverified ID.
     const sync=async()=>{
       try{
         const sb=window.FFH_SUPABASE;if(!sb)return;
         const {data,error}=await sb.auth.getUser();if(error||!data?.user){if(lastStaff){await OneSignal.logout();lastStaff=''}return;}
         const {data:profile,error:pe}=await sb.from('ffh_profiles').select('staff_id,active').eq('auth_user_id',data.user.id).single();
         if(pe||!profile?.staff_id||profile.active===false)return;
         const staff=String(profile.staff_id).trim();if(staff&&staff!==lastStaff){await OneSignal.login(staff);lastStaff=staff;}
       }catch(e){console.warn('FFH OneSignal identity sync:',e)}
     };
     window.FFH_ONESIGNAL_SYNC=sync;
     await sync();
     window.FFH_ONESIGNAL_ASK_PERMISSION=()=>OneSignal.Notifications.requestPermission();
     if(window.FFH_SUPABASE?.auth?.onAuthStateChange){window.FFH_SUPABASE.auth.onAuthStateChange((event)=>{
       if(event==='SIGNED_OUT'){lastStaff='';OneSignal.logout().catch(console.warn)}
       else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(sync,0);
     });}
     OneSignal.Notifications.addEventListener('click',function(e){
       // Backend may set data.ffh_page. Never use arbitrary URLs from notification data.
       const allowed=['notifications','tasks','zero','cpo','sales','route','home'];
       const page=e?.notification?.additionalData?.ffh_page;
       if(!allowed.includes(page))return;
       sessionStorage.setItem('ffh_push_target',page);
       // Existing FieldForce app has a safe hash router on many builds; dispatch a hash change.
       location.hash='#'+page;
       window.dispatchEvent(new HashChangeEvent('hashchange'));
     });
   }catch(e){started=false;console.error('FFH OneSignal init:',e)}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
