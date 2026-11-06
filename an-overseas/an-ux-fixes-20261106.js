/* A&N site: accessible hub fullscreen and CMS-driven contact links. */
(function(){
'use strict';
const esc=x=>String(x==null?'':x);
let openPanel=null;
function hub(){
 const root=document.querySelector('body.an-community-mode #an-community');
 if(!root)return;
 for(const panel of root.querySelectorAll('.an-community-panel')){
  const header=panel.querySelector('.an-community-panel-head');
  if(!header||header.querySelector('.an-hub-maximize'))continue;
  const label=panel.getAttribute('aria-label')||'Study Hub';
  const b=document.createElement('button');
  b.type='button';b.className='an-hub-maximize';b.setAttribute('aria-label','Expand '+label+' to fullscreen');
  b.title='Fullscreen — view all posts and scroll inside';
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"></path></svg>';
  header.appendChild(b);
  b.addEventListener('click',()=>{if(openPanel===panel)close();else expand(panel);});
 }
}
function expand(panel){
 close();
 openPanel=panel;
 panel.classList.add('an-hub-fullview');
 document.body.classList.add('an-hub-max-open');
 const b=panel.querySelector('.an-hub-maximize');
 if(b){b.setAttribute('aria-label','Close fullscreen Study Hub');b.title='Exit fullscreen';b.innerHTML='✕';}
 const region=panel.querySelector('.an-community-scroll');if(region)region.scrollTop=0;
 b?.focus({preventScroll:true});
}
function close(){
 if(!openPanel)return;
 const b=openPanel.querySelector('.an-hub-maximize');
 openPanel.classList.remove('an-hub-fullview');
 if(b){
  b.setAttribute('aria-label','Expand Study Hub section to fullscreen');
  b.title='Fullscreen — view all posts and scroll inside';
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"></path></svg>';
 }
 document.body.classList.remove('an-hub-max-open');openPanel=null;
}
function contacts(){
 const host=document.querySelector('body.an-contact-mode .an-contact-content');
 if(!host)return;
 const s=window.ANContactSettings||{};
 for(const key of ['malaysiaOffice','bangladeshOffice']){
  const el=host.querySelector('[data-an-office="'+key+'"]');
  if(el&&s[key])el.textContent=esc(s[key]);
  const map=host.querySelector('[data-an-map-office="'+key+'"]');
  const area=String(el?.textContent||'').trim();
  if(map&&area){
   map.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(area);
   map.title='Search this office area on Google Maps (not a verified office pin)';
  }
 }
 const email=String(s.email||'educationanoverseas@gmail.com').trim();
 const gmail=String(s.gmail||email).trim();
 const e=host.querySelector('[data-an-email]');if(e)e.textContent=email;
 const ea=host.querySelector('a.an-contact-email');if(ea)ea.href='mailto:'+encodeURIComponent(email);
 const channels={email:'mailto:'+encodeURIComponent(email),gmail:'mailto:'+encodeURIComponent(gmail)};
 for(const name of ['facebook','tiktok','youtube','linkedin']){
  try{
   const raw=String(s[name]||'').trim(),u=new URL(raw);
   if(u.protocol==='https:'||u.protocol==='http:')channels[name]=u.href;
  }catch(e){}
 }
 const wa=String(s.whatsapp||'').replace(/[^0-9]/g,'');
 if(wa.length>=8)channels.whatsapp='https://wa.me/'+wa;
 for(const a of host.querySelectorAll('[data-an-social]')){
  const url=channels[a.dataset.anSocial];
  if(url){
   a.href=url;
   a.classList.remove('an-social-unset');
   a.removeAttribute('aria-disabled');a.removeAttribute('tabindex');
   a.setAttribute('title','Open '+a.dataset.anSocial);
   if(url.startsWith('http')){a.target='_blank';a.rel='noopener noreferrer';}
  }else{
   a.removeAttribute('href');a.classList.add('an-social-unset');
   a.setAttribute('aria-disabled','true');a.tabIndex=-1;
  }
 }
}
function ensureRoute(){
 const hash=location.hash.startsWith('#/')?location.hash.slice(2):location.hash.slice(1);
 const page=hash.split('?')[0].split('/')[0]||'home';
 for(const [cls,route] of [['an-contact-mode','contact'],['an-about-details-mode','aboutdetails'],['an-countries-mode','countries'],['an-universities-mode','universities'],['an-scholarships-mode','scholarships']]){
  document.body.classList.toggle(cls,page===route);
 }
 if(page==='contact'&&!document.querySelector('#app .an-contact-content')&&typeof window.ANCompactContactPage==='function'){
  const html=window.ANCompactContactPage();
  if(typeof html==='string'&&html.includes('an-contact-content')){
   const app=document.getElementById('app');if(app)app.innerHTML=html;
  }
 }
}
function init(){
 const app=document.getElementById('app');
 if(!app)return;
 const update=()=>{ensureRoute();if(openPanel&&!document.contains(openPanel))close();hub();contacts();};
 let pending=false;
 const observer=new MutationObserver(()=>{
  if(pending)return;pending=true;
  requestAnimationFrame(()=>{pending=false;update();});
 });
 observer.observe(app,{childList:true});
 window.addEventListener('hashchange',()=>{close();requestAnimationFrame(update);});
 window.addEventListener('an-contact-settings-updated',contacts);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openPanel){e.preventDefault();close();}});
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
