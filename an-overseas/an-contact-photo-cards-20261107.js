/* Contact page only — keep CMS-managed social anchors intact while presenting
   six icon cards (two per row) and the Gmail address on its own centered full row.
   No synthetic social URLs, phone numbers, or enquiry submissions are created. */
(()=>{'use strict';
 const icons={
  facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#1877F2"/><path d="M14.4 20v-7.2h2.5l.4-3h-2.9V7.9c0-.9.2-1.4 1.5-1.4h1.5V3.8c-.3-.1-1.2-.2-2.3-.2-2.4 0-4 1.4-4 4.1v2.1H8.6v3h2.5V20z" fill="#fff"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#0c0d11"/><path d="M14 3.6v10.8c-.1 4.1-3.1 6.5-6.4 5.8-3.7-.9-4.6-5.8-1.5-8.1 1.1-.8 2.4-1.1 3.7-1V14c-2.2-.4-3.2 1.7-2.2 3.1 1.1 1.6 3.9.8 3.9-1.5V3.6H14c.3 2.7 1.7 4.3 4.2 4.8v3.1c-1.8-.1-3.2-.8-4.2-1.9z" fill="#fff"/><path d="M13.1 3.6v10.7c-.2 3.7-2.9 5.6-5.6 5.1" stroke="#25F4EE" stroke-width="1.1" fill="none"/><path d="M14.5 3.6c.4 2.4 2 4.2 4.2 4.6" stroke="#FE2C55" stroke-width="1.1" fill="none"/></svg>',
  youtube:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0033"/><path d="m10 8 6.5 4-6.5 4z" fill="#fff"/></svg>',
  linkedin:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#0A66C2"/><circle cx="6.4" cy="7" r="1.6" fill="#fff"/><rect x="5" y="10" width="2.8" height="9" fill="#fff"/><path d="M10.2 10h2.7v1.2c.7-1 1.6-1.5 3-1.5 2.4 0 3.6 1.5 3.6 4.1V19h-2.9v-4.6c0-1.3-.4-2-1.6-2s-1.8.8-1.8 2V19h-3z" fill="#fff"/></svg>',
  whatsapp:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#25D366"/><path d="M7 17.4 8 14.7a6 6 0 1 1 2.5 2.4z" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M9.6 8.8c-.3-.6-.5-.6-.8-.5-.6.1-1 1-1 1.5 0 1.4 2.2 4.3 4.4 5.1 1.1.4 2.1.5 2.8 0 .6-.4 1-1.1.8-1.4-.1-.3-1.6-.9-1.9-.9-.3 0-.5.7-.9.7-.7 0-2.3-1.5-2.6-2.1-.2-.4.6-.8.6-1.2-.1-.4-.9-1.2-1.4-1.2z" fill="#fff"/></svg>',
  phone:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#E88119"/><path d="M7 4.8 9.9 7.7 8.5 9.4c1 2.6 3.4 5 6.1 6.1l1.7-1.4 2.9 2.9-1.6 2c-.4.6-1.2.9-2 .7C9.4 18.5 5.5 14.5 4.4 8.4c-.2-.8.1-1.6.7-2z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  gmail:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.2V19h3.2V9.2L12 13l5.8-3.8V19H21V6.2L12 12z" fill="#4285F4"/><path d="M3 6.2 12 13V9.4L4.4 3.9C3.6 3.3 3 4.1 3 5z" fill="#EA4335"/><path d="M21 6.2 12 13V9.4l7.6-5.5C20.4 3.3 21 4.1 21 5z" fill="#34A853"/><path d="M3 6.2V19h3.2V8.6z" fill="#4285F4"/><path d="M21 6.2V19h-3.2V8.6z" fill="#FBBC05"/></svg>'
 };
 const order=['facebook','tiktok','youtube','linkedin','whatsapp','phone','gmail'];
 const labels={facebook:'Facebook',tiktok:'TikTok',youtube:'YouTube',linkedin:'LinkedIn',whatsapp:'WhatsApp',phone:'Call Us',gmail:'Gmail'};
 const set=(e,t)=>{if(e&&e.textContent!==t)e.textContent=t;};
 const phone=(s)=>String(s?.phone||s?.whatsapp||'').replace(/[^0-9+]/g,'');
 function enhance(){
  const host=document.querySelector('body.an-contact-mode #app .an-contact-content');
  if(!host)return;
  const grid=host.querySelector('.an-contact-social');
  if(!grid)return;
  if(grid.dataset.anEnhanced!=='yes'){
   const anchors={};
   for(const a of grid.querySelectorAll('[data-an-social]'))anchors[a.dataset.anSocial]=a;
   if(!anchors.facebook||!anchors.gmail||!anchors.whatsapp)return;
   const call=document.createElement('a');
   call.className='an-contact-phone an-social-unset';
   call.setAttribute('aria-disabled','true');call.tabIndex=-1;
   call.setAttribute('aria-label','Call A&N Overseas');
   anchors.phone=call;
   for(const name of order){
    const a=anchors[name];if(!a)continue;
    a.classList.add('an-contact-social-card');
    const icon=document.createElement('span');
    icon.className='an-contact-icon';icon.innerHTML=icons[name];
    const copy=document.createElement('span');copy.className='an-contact-card-copy';
    const title=document.createElement('small');title.textContent=labels[name];
    const detail=document.createElement('span');detail.className='an-contact-card-detail';
    detail.textContent='Checking contact details…';
    copy.append(title,detail);
    a.replaceChildren(icon,copy);
    a.setAttribute('aria-label',labels[name]+' contact');
   }
   grid.replaceChildren(...order.map(n=>anchors[n]).filter(Boolean));
   grid.dataset.anEnhanced='yes';
  }
  sync(host);
 }
 function sync(host){
  if(!host||!document.body.classList.contains('an-contact-mode'))return;
  const s=window.ANContactSettings||{};
  const links=host.querySelectorAll('.an-contact-social [data-an-social]');
  for(const a of links){
   const n=a.dataset.anSocial,details=a.querySelector('.an-contact-card-detail');
   if(!details)continue;
   if(n==='gmail'){
    const gmail=String(s.gmail||s.email||'educationanoverseas@gmail.com').trim();
    set(details,gmail);
    continue;
   }
   if(n==='whatsapp'){
    const digits=String(s.whatsapp||'').replace(/[^0-9]/g,'');
    set(details,digits.length>=8?('+'+digits):'Number not published');
    continue;
   }
   const url=s[n];
   const active=!!(a.getAttribute('href')&&!a.classList.contains('an-social-unset'));
   set(details,active?'Open profile ↗':url?'Link pending':'Link not published');
  }
  const call=host.querySelector('.an-contact-phone');
  if(call){
   const digits=phone(s),detail=call.querySelector('.an-contact-card-detail');
   if(digits.replace(/\D/g,'').length>=8){
    call.href='tel:'+digits.replace(/[^0-9+]/g,'');
    call.classList.remove('an-social-unset');
    call.removeAttribute('aria-disabled');call.removeAttribute('tabindex');
    set(detail,digits.startsWith('+')?digits:'+'+digits);
   }else{
    call.removeAttribute('href');
    call.classList.add('an-social-unset');
    call.setAttribute('aria-disabled','true');call.tabIndex=-1;
    set(detail,'Number not published');
   }
  }
 }
 let queued=false;
 const schedule=()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;enhance();});
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
 });
 window.addEventListener('hashchange',schedule);
 window.addEventListener('an-contact-settings-updated',schedule);
})();
