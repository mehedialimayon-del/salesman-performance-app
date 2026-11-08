/* A&N navigation continuity: same-page refresh, persistent per-route scroll/filters.
 * Stores view state on this device only; never stores private documents or forms.
 */
(function(){
'use strict';
const PREFIX='an-overseas:view:v2:';
const MAX_AGE=1000*60*60*24*14;
const root=()=>location.hash||'#/home';
const scrollRoot=()=>document.scrollingElement||document.documentElement;
const scrollableSelectors=[
 '#app','.page-scroll','.an-about-fixed','.an-about-summary','.an-about-duo',
 '.an-about-intro-panel','.an-about-details-scroll','.an-community-scroll',
 '.an2-nav','.an-success-gallery','.an-scholarship-directory','.an-manager-card','.an-university-profile'
];
let activeRoute=root(), pending=null, scheduledSave=0, lastGesture=0, restoreToken=0;
let initial=true, restoreInProgress=false, lastRenderedRoute=null;
const safeGet=key=>{
 try{return sessionStorage.getItem(key)||localStorage.getItem(key);}catch{return null;}
};
const safeSet=(key,value)=>{
 try{sessionStorage.setItem(key,value);localStorage.setItem(key,value);}catch{}
};
function get(route=activeRoute){
 try{
  const state=JSON.parse(safeGet(PREFIX+route)||'null');
  return state&&Date.now()-state.savedAt<MAX_AGE?state:null;
 }catch{return null;}
}
function anchor(){
 const nodes=document.querySelectorAll('#results .an-guide-card');
 let best=null,bestDist=1e12;
 for(const el of nodes){
  const rect=el.getBoundingClientRect();
  if(rect.bottom<60||rect.top>innerHeight+50)continue;
  const dist=Math.abs(rect.top-160);
  if(dist<bestDist){bestDist=dist;const id=el.querySelector('.uni-cover-wrap')?.dataset.universityId;best=id?{id,top:rect.top}:null;}
 }
 return best;
}
function containers(){
 const out={};
 for(const selector of scrollableSelectors){
  const el=document.querySelector(selector);
  if(!el)continue;
  if(el.scrollHeight>el.clientHeight+24||el.scrollWidth>el.clientWidth+24){
   out[selector]={top:el.scrollTop,left:el.scrollLeft};
  }
 }
 return out;
}
function save(route=activeRoute,options={}){
 if(!route||restoreInProgress&&!options.force)return;
 const old=get(route)||{};
 const update={
  savedAt:Date.now(),
  y:Math.max(0,scrollRoot().scrollTop||window.scrollY||0),
  x:Math.max(0,scrollRoot().scrollLeft||0),
  containers:containers(),
  anchor:route.startsWith('#/universities')?anchor():null
 };
 if(route.startsWith('#/universities')&&typeof window.ANCatalogueState?.snapshot==='function'){
  update.catalogue=window.ANCatalogueState.snapshot();
 }
 // Preserve catalogue state when saves happen before it is loaded.
 safeSet(PREFIX+route,JSON.stringify({...old,...update}));
}
function restoreContainers(state){
 if(!state?.containers)return;
 for(const [selector,point] of Object.entries(state.containers)){
  const el=document.querySelector(selector);
  if(!el)continue;
  if(el.scrollHeight>el.clientHeight+10)el.scrollTop=point.top||0;
  if(el.scrollWidth>el.clientWidth+10)el.scrollLeft=point.left||0;
 }
}
function positionTarget(state){
 // A saved pixel position is reliable when the same catalogue and filters are restored.
 // Card anchors are a backup only if the original scroll distance exceeds page height.
 return Math.max(0,Number(state?.y)||0);
}

function restore(route,reason){
 const state=get(route);
 if(!state){if(reason==='navigation'){window.scrollTo(0,0);}return;}
 pending={route,state};
 const token=++restoreToken;
 restoreInProgress=true;
 const begun=Date.now();
 function attempt(){
  if(token!==restoreToken)return; // A newer restoration owns the lock.
  if(route!==activeRoute){restoreInProgress=false;return;}
  if(lastGesture>begun){restoreInProgress=false;pending=null;save();return;}
  const target=positionTarget(state);
  const max=Math.max(0,scrollRoot().scrollHeight-innerHeight);
  let adjusted=Math.min(target,max);
  // If the page remains shorter than the saved position, restore the remembered card.
  if(max<target-120&&state?.anchor?.id&&activeRoute.startsWith('#/universities')){
    const cards=document.querySelectorAll('#results .an-guide-card');
    for(const el of cards){
      if(el.querySelector('.uni-cover-wrap')?.dataset.universityId===state.anchor.id){
        adjusted=Math.max(0,Math.min(max,(scrollRoot().scrollTop||scrollY)+el.getBoundingClientRect().top-state.anchor.top));
        break;
      }
    }
  }
  window.scrollTo({left:state.x||0,top:adjusted,behavior:'instant'});
  restoreContainers(state);
  const complete=Math.abs((scrollRoot().scrollTop||window.scrollY)-target)<6;
  if((complete&&Date.now()-begun>1300)||Date.now()-begun>3800){
   restoreInProgress=false;pending=null;save();return;
  }
  setTimeout(attempt,complete?310:210);
 }
 requestAnimationFrame(()=>requestAnimationFrame(attempt));
}
function beforeRender(){
 const route=root();
 if(initial){initial=false;return;}
 // Avoid writing old-page scroll into the destination route on hash navigation.
 if(!restoreInProgress&&lastRenderedRoute===route)save(route);
}
function afterRender(){
 const route=root();
 if(route!==activeRoute)activeRoute=route;
 lastRenderedRoute=route;
 restore(route,'navigation');
}
function nextRoute(){
 const route=root();
 if(route!==activeRoute){
  if(!restoreInProgress)save(activeRoute);
  activeRoute=route;
 }
}
function gesture(){lastGesture=Date.now();if(restoreInProgress){++restoreToken;restoreInProgress=false;pending=null;}}
document.addEventListener('pointerdown',gesture,{passive:true,capture:true});
document.addEventListener('touchstart',gesture,{passive:true,capture:true});
document.addEventListener('wheel',gesture,{passive:true,capture:true});
document.addEventListener('keydown',gesture,{passive:true,capture:true});
document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href^="#/"]');
 if(a&&!restoreInProgress)save(activeRoute);
 if(!a || !matchMedia('(max-width:800px)').matches || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
 const destination=a.getAttribute('href');
 if(destination==='#/about'||(destination==='#/aboutdetails'&&a.classList.contains('an-about-mobile-readmore'))){
  safeSet(PREFIX+destination,JSON.stringify({savedAt:Date.now(),y:0,x:0,containers:{}}));
  if(destination===activeRoute)restore(destination,'navigation');
 }
},true);
window.addEventListener('hashchange',nextRoute);
window.addEventListener('scroll',()=>{
 if(restoreInProgress)return;
 clearTimeout(scheduledSave);
 scheduledSave=setTimeout(()=>save(activeRoute),130);
},{passive:true});
document.addEventListener('scroll',event=>{
 if(restoreInProgress)return;
 if(event.target===document||event.target===scrollRoot())return;
 clearTimeout(scheduledSave);
 scheduledSave=setTimeout(()=>save(activeRoute),160);
},{capture:true,passive:true});
window.addEventListener('pagehide',()=>save(activeRoute));
window.addEventListener('beforeunload',()=>save(activeRoute));
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){save(activeRoute);return;}
 const state=get(activeRoute);
 if(state&&Number(state.y)>140&&(window.scrollY<18||Math.abs(window.scrollY-state.y)>450)&&Date.now()-lastGesture>500)restore(activeRoute,'resume');
});
window.addEventListener('pageshow',event=>{
 if(event.persisted)restore(activeRoute,'bfcache');
});
try{history.scrollRestoration='manual';}catch{}
window.ANNavState={get,save,beforeRender,afterRender,restore,route:()=>activeRoute};
})();