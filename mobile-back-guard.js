/* FieldForce Hub: Back never silently exits or changes the screen.
   Android native callback and older WebView history.back both show an explicit
   Cancel / Exit confirmation. Existing photo/overlay Back remains available. */
(()=>{
 'use strict';
 const root=document.getElementById('app');if(!root)return;
 const loggedIn=()=>!!localStorage.getItem('ffh_session');
 let overlay=null;
 function promptExit(){
   if(overlay?.isConnected)return;
   overlay=document.createElement('div');
   overlay.className='globalSearchOverlay ffExitOverlay ffProtectedExit';
   overlay.setAttribute('role','dialog');
   overlay.setAttribute('aria-modal','true');
   overlay.setAttribute('aria-label','Confirm exit');
   overlay.innerHTML='<section class="globalSearchBox ffPremiumModal ffExitModal"><div class="cardTitle">Exit FieldForce Hub?</div><p>Do you want to close the app?</p><div class="ffExitActions"><button type="button" class="secondary" data-exit-no>NO · STAY</button><button type="button" class="primary" data-exit-yes>YES · EXIT</button></div></section>';
   document.body.append(overlay);
   const cancel=()=>{overlay?.remove();overlay=null;};
   overlay.querySelector('[data-exit-no]').onclick=cancel;
   overlay.querySelector('[data-exit-yes]').onclick=()=>{
     cancel();window.__FFH_ALLOW_EXIT__=true;
     if(window.FieldForceNative?.exit)window.FieldForceNative.exit();
     else history.go(-2);
   };
   // The background is intentionally non-dismissable; only explicit buttons decide.
 }
 window.FFH_NATIVE_BACK=()=>{
   if(overlay?.isConnected)return true;
   // The existing image/overlay history manager owns gallery navigation.
   const photo=document.querySelector('.ffPhotoViewer [data-action="close"]');
   if(photo){photo.click();return true;}
   promptExit();return true;
 };
 // Add a history guard for the older 1.19 Android wrapper, which sends
 // history.back() directly instead of the new native callback.
 if(loggedIn()){
   const state={...(history.state||{}),ffhBackGuard:true};
   history.pushState(state,'',location.href);
 }
 window.addEventListener('popstate',event=>{
   if(window.__FFH_ALLOW_EXIT__||!loggedIn())return;
   // An overlay's own capture-phase listener handles a photo/modal first.
   const page=localStorage.getItem('ffh_last_page')||history.state?.ffhPage||'home';
   history.pushState({...history.state,ffhPage:page,ffhBackGuard:true},'',location.href);
   event.stopImmediatePropagation();
   promptExit();
 },true);
})();
