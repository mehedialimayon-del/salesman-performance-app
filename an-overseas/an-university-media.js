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
 const hostOf=x=>{const m=String(x||'').match(/^https?:\/\/([^/?#:]+)/i);return m?m[1].toLowerCase().replace(/^www\./,''):'';};
 let hostCountSize=-1,hostCount=new Map();
 function websiteIcon(u){
   const host=hostOf(u.site);if(!host)return '';
   // Government, shared education authorities and general directory favicons aren't university logos.
   if(/(^|\.)(?:gouv\.fr|gov\.my|gov\.uk|gov\.au|mqa\.gov\.my)$/.test(host)
     ||/^ac-[^.]+\.fr$/.test(host)||/^education\.gouv\.fr$/.test(host)
     ||/^(?:facebook\.com|wikipedia\.org|studyportals\.com)$/.test(host))return '';
   if(typeof U!=='undefined'&&Array.isArray(U)&&hostCountSize!==U.length){
      hostCount=new Map();for(const row of U){const h=hostOf(row.site);if(h)hostCount.set(h,(hostCount.get(h)||0)+1);}
      hostCountSize=U.length;
   }
   // Shared institution domains can carry the same icon for separate catalogue entries.
   if((hostCount.get(host)||0)>1)return '';
   return 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=128';
 }
 function brandFallback(u,p){
   const logo=(u.logoImage||p?.logo||''); // Google favicon is often a generic globe; not a university photo.
   const named=String(u.name||'');const acronym=named.match(/\(([A-Z]{2,5})\)/);
   const short=acronym?acronym[1]:String(u.short||u.name||'U').replace(/[^A-Z]/g,'').slice(0,3)||'U';
   return '<div class="an-guide-identity an-identity-logo-only"><div class="an-logo-stage">'+
       (logo?'<img class="an-center-logo '+(logo.includes('google.com/s2/favicons')?'an-website-favicon':'an-verified-media')+'" src="'+esc(logo)+'" alt="'+esc(u.name)+' university website icon or logo" loading="lazy" decoding="async" onerror="this.remove()">':'')+
       '<span class="an-center-monogram">'+esc(short)+'</span><span class="an-identity-name">'+esc(u.name)+'</span></div></div>';
 }
 // Stable numbers per country are based on the complete loaded catalogue, not current filters.
 let serialCache={size:-1,items:new Map()};
 function serial(u){
   if(typeof U==='undefined'||!Array.isArray(U))return '';
   if(serialCache.size!==U.length){
     const groups=new Map(),items=new Map();
     U.forEach(entry=>{
       const country=entry.country||'Other';
       if(!groups.has(country))groups.set(country,[]);
       groups.get(country).push(entry);
     });
     groups.forEach(list=>{
       list.sort((a,b)=>window.ANUniGuide?.compare?.(a,b)||a.name.localeCompare(b.name));
       list.forEach((entry,i)=>items.set(entry.id,{n:i+1,total:list.length}));
     });
     serialCache={size:U.length,items};
   }
   const number=serialCache.items.get(u.id);if(!number)return '';
   const zero=v=>String(v).padStart(3,'0');
   return '<span class="an-catalogue-index" title="'+esc(u.country)+' university '+number.n+' of '+number.total+'">'+zero(number.n)+' <small>/ '+zero(number.total)+'</small></span>';
 }
 guide.card=function(u,p){
   let result=nativeCard(u,p);
   const hasPhoto=result.includes('class="campus-cover an-guide-photo"');
   if(!hasPhoto){
     const start=result.indexOf('<div class="an-guide-identity">');
     const stop=result.indexOf('</small></div>',start);
     if(start>=0&&stop>=0)result=result.slice(0,start)+brandFallback(u,p)+result.slice(stop+14);
     result=result.replace(/<img class="uni-card-logo"[^>]*>/,'');
   }
   return result.replace('<div class="uni-cover-wrap">','<div class="uni-cover-wrap" data-university-title="'+esc(u.name)+'" data-university-id="'+esc(u.id)+'">');
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
     const filename=String(page.pageimage||'');
     const photoCandidate=!/logo|seal|coat.?of.?arms|crest|emblem|icon|flag|symbol|signature|portrait/i.test(filename);
     const title='File:'+page.pageimage;
     const path='https://commons.wikimedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=960&titles='+encodeURIComponent(title);
     const res=await fetch(path,{mode:'cors'});if(!res.ok)return null;
     const info=(await res.json())?.query?.pages?.[0]?.imageinfo?.[0];if(!info)return null;
     const meta=info.extmetadata||{};
     const licence=String(meta.LicenseShortName?.value||'');
     if(!/CC BY|CC0|public domain|PD-|CC-BY/i.test(licence))return null;
     const image=info.thumburl||info.url;
     if(!/^https:\/\//.test(image)||!/^(https:\/\/upload\.wikimedia\.org\/)/.test(image))return null;
     const credit=String(meta.Artist?.value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,85);
     return {url:image,source:info.descriptionurl||'https://commons.wikimedia.org',licence,credit,photoCandidate:photoCandidate&&Number(info.width)>=550&&Number(info.height)>=300&&Number(info.width)/Number(info.height)>=0.98};
    }catch{return null;}
   })();
   remembered.set(name,req);
   return req;
 }
 const sealCache=new Map();
 async function wikidataMedia(name){
  if(sealCache.has(name))return sealCache.get(name);
  const request=(async()=>{
   try{
    const base='https://en.wikipedia.org/w/api.php?origin=*&action=query&redirects=1&format=json&formatversion=2&prop=pageprops&titles='+encodeURIComponent(name);
    const result=await fetch(base,{mode:'cors'});if(!result.ok)return null;
    const doc=await result.json(),page=doc?.query?.pages?.[0];
    if(!page||page.missing)return null;
    const redirects=(doc?.query?.redirects||[]).some(x=>normalize(x.from)===normalize(name)&&normalize(x.to)===normalize(page.title));
    if(!redirects&&normalize(page.title)!==normalize(name))return null;
    const id=page.pageprops?.wikibase_item;if(!/^Q\d+$/.test(id||''))return null;
    const wr=await fetch('https://www.wikidata.org/w/api.php?origin=*&action=wbgetentities&format=json&ids='+id+'&props=claims',{mode:'cors'});
    if(!wr.ok)return null;
    const claims=(await wr.json())?.entities?.[id]?.claims||{};
    async function commonsFile(file,kind){
     if(typeof file!=='string'||!/\.(png|jpg|jpeg|svg|webp)$/i.test(file))return null;
     const link='https://commons.wikimedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=1100&titles='+encodeURIComponent('File:'+file);
     const resp=await fetch(link,{mode:'cors'});if(!resp.ok)return null;
     const info=(await resp.json())?.query?.pages?.[0]?.imageinfo?.[0];
     if(!info)return null;
     const licence=String(info.extmetadata?.LicenseShortName?.value||'');
     if(!/CC BY|CC0|public domain|PD-|CC-BY/i.test(licence))return null;
     const photo=kind==='photo';
     if(photo&&(Number(info.width)<650||Number(info.height)<330||Number(info.width)/Number(info.height)<.9))return null;
     const url=info.thumburl||info.url;
     if(!/^https:\/\/upload\.wikimedia\.org\//.test(url||''))return null;
     const credit=String(info.extmetadata?.Artist?.value||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').slice(0,85);
     return {kind,url,source:info.descriptionurl||'https://commons.wikimedia.org',credit,licence,photoCandidate:photo};
    }
    // P18 means an actual image of the institution; show it edge-to-edge, never as a logo.
    const p18=claims.P18?.[0]?.mainsnak?.datavalue?.value;
    const photo=await commonsFile(p18,'photo');if(photo)return photo;
    // P154 is the actual university logo; only this gets the centred-logo treatment.
    const p154=claims.P154?.[0]?.mainsnak?.datavalue?.value;
    return await commonsFile(p154,'logo');
   }catch{return null;}
  })();
  sealCache.set(name,request);return request;
 }
 window.ANUniMedia={websiteIcon,commonsImage,wikidataMedia};
 function showImage(cover,rec){
   if(!cover?.isConnected||!rec||!rec.photoCandidate)return;
   if(cover.querySelector('.an-guide-photo'))return;
   const image=document.createElement('img');
   image.className='campus-cover an-guide-photo an-commons-photo an-fullbleed-photo';
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
   const candidate=await commonsImage(name);
   if(candidate?.photoCandidate){showImage(cover,candidate);return;}
   const brand=cover.querySelector('.an-identity-logo-only .an-logo-stage');
   if(!brand)return;
   const media=await wikidataMedia(name);
   if(media?.kind==='photo'){showImage(cover,media);return;}
   if(media?.kind==='logo'&&cover.isConnected&&!cover.querySelector('.an-guide-photo')){
     const mark=document.createElement('img');
     mark.className='an-center-logo an-verified-media';mark.alt=name+' genuine university logo (Wikimedia Commons)';
     mark.loading='lazy';mark.decoding='async';
     mark.addEventListener('load',()=>{brand.querySelectorAll('.an-center-logo').forEach(old=>{if(old!==mark)old.remove();});},{once:true});
     mark.addEventListener('error',()=>mark.remove(),{once:true});
     brand.prepend(mark);mark.src=media.url;
   }
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
   const headerMonogram=document.querySelector('.university-profile .an-portfolio-emblem-pending');
   if(headerMonogram&&!headerMonogram.dataset.sealCheck){
     headerMonogram.dataset.sealCheck='1';
     const id=headerMonogram.dataset.universityId;
     const u=typeof U!=='undefined'?U.find(item=>item.id===id):null;
     if(u)wikidataMedia(u.name).then(seal=>{
       if(!seal||seal.kind!=='logo'||!headerMonogram.isConnected)return;
       const image=document.createElement('img');
       image.className='university-logo';image.alt=u.name+' university emblem — Wikimedia Commons / Wikidata';
       image.loading='lazy';image.decoding='async';
       image.addEventListener('load',()=>{if(headerMonogram.isConnected)headerMonogram.replaceWith(image);},{once:true});
       image.addEventListener('error',()=>image.remove(),{once:true});
       image.src=seal.url;
     });
   }
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
   }else if(target instanceof HTMLImageElement&&target.classList.contains('an-center-logo')){
     target.style.display='none';
   }else if(target instanceof HTMLImageElement&&target.classList.contains('an-guide-photo')){
     const cover=target.closest('.an-guide-card .uni-cover-wrap');
     const university=typeof U!=='undefined'?U.find(u=>u.id===cover?.dataset.universityId):null;
     if(cover&&university&&!cover.querySelector('.an-identity-logo-only')){
       const profile=typeof UNIVERSITY_PROFILES!=='undefined'?UNIVERSITY_PROFILES[university.id]:null;
       const oldIdentity=cover.querySelector('.an-guide-identity');
       if(oldIdentity)oldIdentity.outerHTML=brandFallback(university,profile);
       cover.querySelector('.uni-card-logo')?.remove();
       cover.querySelector('.an-guide-credit')?.remove();
     }
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
