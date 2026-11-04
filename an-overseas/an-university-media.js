/* A&N university identity and licensed imagery, 2026-11-05.
   Never substitute an unrelated stock photo for a named campus. */
(function(){
 'use strict';
 const guide=window.ANUniGuide;
 if(!guide||typeof guide.card!=='function')return;
 const nativeCard=guide.card;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 const remembered=new Map(), watching=new WeakSet();
 function websiteIcon(u){
   try {let domain=new URL(u.site).hostname;return 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=256';}catch{return '';}
 }
 function brandFallback(u){
   const site=websiteIcon(u),country=u.country||'University';
   return '<div class="an-guide-identity an-identity-branded">'+
       '<div class="an-identity-head">'+
       (site?'<img class="an-identity-logo" src="'+esc(site)+'" alt="'+esc(u.name)+' official website icon" loading="lazy" decoding="async">':'')+
       '<span>University identity</span></div>'+
       '<span class="an-guide-country">'+esc(country)+'</span>'+
       '<strong>'+esc(u.name)+'</strong>'+
       '<small>University portfolio · official website linked</small></div>';
 }
 guide.card=function(u,p){
   let result=nativeCard(u,p),start=result.indexOf('<div class="an-guide-identity">');
   if(start!==-1){
     const stop=result.indexOf('</small></div>',start);
     if(stop!==-1)result=result.slice(0,start)+brandFallback(u)+result.slice(stop+'</small></div>'.length);
   }
   const mark=websiteIcon(u);
   const marker=mark?'<img class="an-university-mark" src="'+esc(mark)+'" alt="'+esc(u.name)+' website icon" loading="lazy" decoding="async">':'';
   return result.replace('<div class="uni-cover-wrap">','<div class="uni-cover-wrap" data-university-title="'+esc(u.name)+'" data-university-id="'+esc(u.id)+'">'+marker);
 };
 async function commonsImage(name){
   if(remembered.has(name))return remembered.get(name);
   const req=(async()=>{
    try{
     const query='https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&prop=pageimages&piprop=name&titles='+encodeURIComponent(name);
     const resp=await fetch(query,{mode:'cors'});if(!resp.ok)return null;
     const pages=(await resp.json())?.query?.pages||[];
     const page=pages[0];
     if(!page||page.missing||normalize(page.title)!==normalize(name)||!page.pageimage)return null;
     const title='File:'+page.pageimage;
     const path='https://commons.wikimedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=960&titles='+encodeURIComponent(title);
     const res=await fetch(path,{mode:'cors'});if(!res.ok)return null;
     const info=(await res.json())?.query?.pages?.[0]?.imageinfo?.[0];if(!info)return null;
     const meta=info.extmetadata||{};
     const licence=String(meta.LicenseShortName?.value||'');
     if(!/CC BY|CC0|public domain|PD-|CC-BY/i.test(licence))return null;
     const image=info.thumburl||info.url;
     if(!/^https:\/\//.test(image)||!/^(https:\/\/upload\.wikimedia\.org\/)/.test(image))return null;
     const credit=String(meta.Artist?.value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,85);
     return {url:image,source:info.descriptionurl||'https://commons.wikimedia.org',licence,credit};
    }catch{return null;}
   })();
   remembered.set(name,req);
   return req;
 }
 window.ANUniMedia={websiteIcon,commonsImage};
 function showImage(cover,rec){
   if(!cover?.isConnected||!rec)return;
   if(cover.querySelector('.an-guide-photo'))return;
   const image=document.createElement('img');
   image.className='campus-cover an-guide-photo an-commons-photo';
   image.alt=cover.dataset.universityTitle+' — Wikimedia Commons university illustration';
   image.loading='lazy';image.decoding='async';
   image.addEventListener('error',()=>image.remove(),{once:true});
   image.addEventListener('load',()=>{
     const label=document.createElement('a');
     label.className='an-guide-credit an-commons-credit';
     label.href=rec.source;label.target='_blank';label.rel='noopener noreferrer';
     label.textContent='Wikimedia Commons · '+(rec.credit?rec.credit+' · ':'')+rec.licence+' ↗';
     cover.appendChild(label);
   },{once:true});
   cover.appendChild(image);image.src=rec.url;
 }
 async function inspect(cover){
   if(watching.has(cover)||cover.querySelector('.an-guide-photo'))return;
   watching.add(cover);
   const name=cover.dataset.universityTitle;
   if(!name)return;
   showImage(cover,await commonsImage(name));
 }
 const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{
   entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);inspect(entry.target);}});
 },{rootMargin:'380px'}):null;
 function hydrate(){
   document.querySelectorAll('.an-guide-card .uni-cover-wrap[data-university-title]').forEach(cover=>{
     if(cover.dataset.mediaObserved)return;
     cover.dataset.mediaObserved='1';
     if(cover.querySelector('.an-guide-photo'))return;
     if(observer)observer.observe(cover);else inspect(cover);
   });
   const campus=document.querySelector('.university-profile #profile-campus');
   if(campus&&!campus.dataset.anMediaObserved&&!campus.querySelector('.campus-gallery figure')){
     campus.dataset.anMediaObserved='1';
     const matched=String(location.hash||'').match(/^#\/university\/([^?/]+)/);
     const id=matched?decodeURIComponent(matched[1]):'';
     const u=typeof U!=='undefined'?U.find(item=>item.id===id):null;
     if(u)commonsImage(u.name).then(rec=>{
       if(!rec||!campus.isConnected||campus.querySelector('.campus-gallery figure'))return;
       const gallery=document.createElement('div');gallery.className='campus-gallery';
       const figure=document.createElement('figure');
       const anchor=document.createElement('a');anchor.href=rec.source;anchor.target='_blank';anchor.rel='noopener noreferrer';
       const picture=document.createElement('img');picture.src=rec.url;picture.alt=u.name+' — Wikimedia Commons university illustration';picture.loading='lazy';
       const cap=document.createElement('figcaption');cap.textContent='Wikimedia Commons · '+(rec.credit?rec.credit+' · ':'')+rec.licence;
       picture.addEventListener('error',()=>gallery.remove(),{once:true});
       anchor.appendChild(picture);figure.appendChild(anchor);figure.appendChild(cap);gallery.appendChild(figure);
       const credit=campus.querySelector('.photo-credit');if(credit)campus.insertBefore(gallery,credit);else campus.appendChild(gallery);
     });
   }
 }
 document.addEventListener('error',event=>{
   const target=event.target;
   if(target instanceof HTMLImageElement&&target.classList.contains('an-identity-logo')){
     target.style.display='none';
     const tag=target.nextElementSibling;if(tag)tag.textContent='University';
   }else if(target instanceof HTMLImageElement&&target.classList.contains('an-university-mark')){
     target.style.display='none';
   }
 },true);
 const start=()=>{
  hydrate();
  const app=document.querySelector('#app');
  if(app)new MutationObserver(()=>hydrate()).observe(app,{childList:true,subtree:true});
  document.addEventListener('hashchange',()=>requestAnimationFrame(hydrate));
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
