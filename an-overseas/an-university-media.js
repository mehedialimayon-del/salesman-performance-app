/* A&N university identity and licensed imagery, 2026-11-05.
   Never substitute an unrelated stock photo for a named campus. */
(function(){
 'use strict';
 const guide=window.ANUniGuide;
 if(!guide||typeof guide.card!=='function')return;
 const nativeCard=guide.card;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 const canonicalUniversityName=name=>({
  '2nd military medical university':'Naval Medical University',
  'second military medical university':'Naval Medical University',
  '3rd military medical university':'Army Medical University',
  'third military medical university':'Army Medical University',
  '4th military medical university':'Air Force Medical University',
  'fourth military medical university':'Air Force Medical University'
 })[String(name||'').trim().toLowerCase()]||String(name||'');
 // Hand-matched photographs/logo URLs from each institution's published pages
 // or labelled historical archival imagery. Photos are references, not partner claims.
 const verifiedCovers={
  allianzeuniversitycollegeofmedicalsciencesaucms:{
   photo:'https://img.afterschool.my/storage/uploads/images/getadvice/30481/598d8c25c4321.jpg',
   source:'https://afterschool.my/articles/aucms-students-barred-from-serving-their-practical-years-in-government-hospitals',
   credit:'Historical AUCMS campus photo · Afterschool.my',
   closedDate:'30 November 2017'
  },
  amcuniversitycollege:{
   site:'https://amc.edu.my/',
   photo:'https://amc.edu.my/wp-content/uploads/2026/08/ChIJF1KTaL1pOzIRIkad4g7py6Q.jpg',
   logo:'https://amc.edu.my/wp-content/uploads/2024/08/AMC-UC-Logo-Horizontal-01.png',
   source:'https://amc.edu.my/',
   credit:'AMC University College · official website'
  },
  asiametropolitanuniversity:{
   site:'https://amu.edu.my/',
   photo:'https://amu.edu.my/wp-content/uploads/2026/08/IMG_0607-scaled.jpg',
   logo:'https://amu.edu.my/wp-content/uploads/2025/01/AMU-Logo-Orange.png',
   source:'https://amu.edu.my/campus-life/our-campus/',
   credit:'Asia Metropolitan University · official campus photography'
  },
  asiametropolitanuniversitycyberjayacampus:{
   site:'https://amu.edu.my/',
   photo:'https://amu.edu.my/wp-content/uploads/2022/10/AMU-Cyberjaya-Campus-Library_Resize-scaled-1.jpg',
   logo:'https://amu.edu.my/wp-content/uploads/2025/01/AMU-Logo-Orange.png',
   source:'https://amu.edu.my/campus-life/our-campus/',
   credit:'Asia Metropolitan University · official Cyberjaya campus image'
  },
  alfauniversitycollegeauc:{
   site:'https://alfa.edu.my/',
   photo:'https://alfa.edu.my/wp-content/uploads/Grand-Alfa-University-Campus-Entrance-1.png',
   logo:'https://alfa.edu.my/wp-content/uploads/ALFA-LOGO-BLACK@2x-8-scaled.png',
   source:'https://alfa.edu.my/',
   credit:'ALFA University College · official campus image'
  }
 };
 const verifiedCoversById={
  "utm":{photo:"https://www.utm.my/wp-content/uploads/2026/09/aerial-view-scaled.jpg",source:"https://www.utm.my/",credit:'Campus image · official institution website'},
  "usm":{photo:"https://upload.wikimedia.org/wikipedia/commons/a/a9/Main_gate_at_the_Universiti_Sains_Malaysia.jpg",source:"https://commons.wikimedia.org/wiki/File:Main_gate_at_the_Universiti_Sains_Malaysia.jpg",credit:'USM main gate · Dnydegger / CC BY-SA 3.0'},
  "utem":{photo:"https://www.utem.edu.my/images/slider/cache/ec38f738b76a1041bda5df75169acc3b/slider-aerial-utem.png",source:"https://www.utem.edu.my/",credit:'Campus image · official institution website'},
  "unisza":{photo:"https://www.unisza.edu.my/wp-content/uploads/elementor/thumbs/medical-Campus-2-pj4k486f1t84jt3gxghi9133m193ksq5mp045efbpk.jpg",source:"https://www.unisza.edu.my/",credit:'Campus image · official institution website'},
  "sunway":{photo:"https://sunwayuniversity.edu.my/sites/default/files/styles/content_banner/public/contentbanner/2023-12/sunway-campus-drone01.jpg.webp?h=f5bb8812&itok=7c4Y_P7W",source:"https://sunwayuniversity.edu.my/",credit:'Campus image · official institution website'},
  "apu":{photo:"https://publicwebsite-media.apu.edu.my/assets/2024-01/banner_apu_iconic_campus.jpg?VersionId=z9PBh2OaiyBqWHu9c7dRBK1xVDwIzVuF",source:"https://www.apu.edu.my/",credit:'Campus image · official institution website'},
  "heriotwatt-my":{photo:"https://www.hw.ac.uk/image-library/hci-malaysia-campus-water.xc1fb97cc.jpg?w=1280&h=474&fit=crop&q=75&f=webp",source:"https://www.hw.ac.uk/malaysia.htm",credit:'Campus image · official institution website'},
  "xiamen-my":{photo:"https://www.xmu.edu.my/sites/default/files/styles/720p/public/2025-04/A3%20Building%202.jpeg?itok=ZBAbuHpu",source:"https://www.xmu.edu.my/",credit:'Campus image · official institution website'},
  "inti":{photo:"https://newinti.edu.my/wp-content/uploads/2018/01/IU_campus_small.jpg",source:"https://newinti.edu.my/",credit:'Campus image · official institution website'},
  "oum":{photo:"https://www.oum.edu.my/wp-content/uploads/2026/09/menara-oum-1536x512-1.png",source:"https://www.oum.edu.my/",credit:'Campus image · official institution website'},
  "southampton-my":{photo:"https://www.southampton.ac.uk/img/malaysia/Students%20on%20campus.jpg",source:"https://www.southampton.ac.uk/",credit:'Campus image · official institution website'},
  "curtin-my":{photo:"https://s43414.pcdn.co/wp-content/uploads/2023/04/Campus-Sunset-Square-copy.jpg",source:"https://curtin.edu.my/",credit:'Campus image · official institution website'},
  "umk":{photo:"https://www.umk.edu.my/images/gambartest.webp",source:"https://www.umk.edu.my/",credit:'Campus image · official institution website'},
  "my-u-malaysiancooperativeentrepreneurshipuniversity":{photo:"https://www.ukkm.edu.my/wp-content/uploads/2025/09/Campus-Life1.jpg",source:"https://www.ukkm.edu.my/",credit:'Campus image · official institution website'},
  "my-college-lsbf":{photo:"https://lsbf.edu.my/wp-content/uploads/2026/10/campuses.webp",source:"https://lsbf.edu.my/",credit:'Campus image · official institution website'}
 };
 const verifiedSites={
  alsultanabdullahahmadshahquranicuniversityofpahang:'https://uniqsaas.edu.my/',
  genovasiuniversitycollege:'https://www.genovasi.edu.my/',
  kpjhealthcareuniversity:'https://kpju.edu.my/',
  internationaluniversitycollegeoftechnologytwintech:'https://newtwintech.edu.my/',
  lintonuniversitycollege:'https://www.linton.edu.my/web/',
  netherlandsmaritimeuniversitycollegenmuc:'https://nmuc.edu.my/',
  northborneouniversitycollegenbuc:'https://nbuc.edu.my/',
  universitycollegeofaviationmalaysiaunicam:'https://aviation.edu.my/',
  universitycollegetatiuctati:'https://www.uctati.edu.my/',
  universitycollegesabahfoundationucsf:'https://www.ucsf.edu.my/',
  spectruminternationaluniversitycollege:'https://siuc.edu.my/',
  universitycollegeofagrosciencemalaysia:'https://ucam.edu.my/',
  universitycollegebestari:'https://www.ucbestari.edu.my/',
  drbhicomuniversityofautomotivemalaysia:'https://www.en.dhuautomotive.edu.my/',
  innovativeuniversitycollege:'https://innovative.edu.my/',
  sultanismailpetrainternationalislamicuniversitycollege:'https://www.kias.edu.my/',
    globalnxtuniversity:'https://globalnxt.edu.my/',
  manipaluniversitycollegemalaysiamucm:'https://manipal.edu.my/',
  kolejuniversitifairview:'https://ucf.edu.my/',
  kolejuniversitiijn:'https://www.ijn.edu.my/',
  kolejuniversitivision:'https://vision.edu.my/',
  malaysiancooperativeentrepreneurshipuniversity:'https://www.ukkm.edu.my/',
    veritasuniversitycollege:'https://www.veritas.edu.my/'
 };
 const asiaCountries=new Set(['Malaysia','China','Japan','South Korea','Singapore','Thailand','United Arab Emirates','Turkey']);
 const failedMediaUrls=new Set();
 function enrichKnownUniversity(u){
   const key=normalize(u.name);
   const site=verifiedSites[key];
   if(site&&!u.site)u.site=site;
   const asia=window.ANAsiaVerifiedMedia?.[u.id];
   if(asia){
     if(asia.photo&&!u.cardPhoto&&!failedMediaUrls.has(asia.photo)){
       u.cardPhoto=asia.photo;
       u.cardSource=asia.source||u.site;
       u.cardCredit='Institutional photo · official website';
     }
     if(asia.logo&&!u.logoImage&&!failedMediaUrls.has(asia.logo)){
       u.logoImage=asia.logo;
     }
   }
   const match=verifiedCoversById[u.id]||verifiedCovers[key];
   if(!match)return;
   if(match.site&&!u.site)u.site=match.site;
   if(match.photo&&!failedMediaUrls.has(match.photo)){
     u.cardPhoto=match.photo;u.cardSource=match.source;u.cardCredit=match.credit;
   }
   if(match.logo&&!u.logoImage&&!failedMediaUrls.has(match.logo))u.logoImage=match.logo;
   if(match.closedDate)u.closedDate=match.closedDate;
 }
 const remembered=new Map(), watching=new WeakSet();
 const hostOf=x=>{const m=String(x||'').match(/^https?:\/\/([^/?#:]+)/i);return m?m[1].toLowerCase().replace(/^www\./,''):'';};
 let hostCountSize=-1,hostCount=new Map();
 function websiteIcon(u){
   const host=hostOf(u.site);if(!host||asiaCountries.has(u.country))return '';
   // Asia only uses confirmed institutional photos and genuine logos, not generic globe icons.
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
   const logo=(u.logoImage||p?.logo||websiteIcon(u)||''); // Google favicon is often a generic globe; not a university photo.
   const named=String(u.name||'');const acronym=named.match(/\(([A-Z]{2,5})\)/);
   const short=acronym?acronym[1]:String(u.short||u.name||'U').replace(/[^A-Z]/g,'').slice(0,3)||'U';
   const pending=asiaCountries.has(u.country)&&!logo;
   return '<div class="an-guide-identity an-identity-logo-only'+(pending?' an-asia-media-pending':'')+'"><div class="an-logo-stage">'+
       (logo?'<img class="an-center-logo '+(logo.includes('google.com/s2/favicons')?'an-website-favicon':'an-verified-media')+'" src="'+esc(logo)+'" alt="'+esc(u.name)+' university website logo" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">':'')+
       (pending?'<div class="an-identity-awaiting"><span class="an-identity-awaiting-name">'+esc(u.name)+'</span><small>Campus photo or logo not yet verified</small></div>':
       '<span class="an-center-monogram">'+esc(short)+'</span><span class="an-identity-name">'+esc(u.name)+'</span>')+'</div></div>';
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
   enrichKnownUniversity(u);
   let result=nativeCard(u,p);
   result=result.replace('class="campus-cover an-guide-photo"','class="campus-cover an-guide-photo" referrerpolicy="no-referrer"');
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
   name=canonicalUniversityName(name);
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
     return {url:image,source:info.descriptionurl||'https://commons.wikimedia.org',licence,credit,kind:/logo|seal|coat.?of.?arms|crest|emblem|icon|symbol/i.test(filename)?'logo':'other',photoCandidate:photoCandidate&&Number(info.width)>=550&&Number(info.height)>=300&&Number(info.width)/Number(info.height)>=0.98};
    }catch{return null;}
   })();
   remembered.set(name,req);
   return req;
 }
 const sealCache=new Map();
 async function wikidataMedia(name){
  name=canonicalUniversityName(name);
  if(sealCache.has(name))return sealCache.get(name);
  const request=(async()=>{
   try{
    const base='https://en.wikipedia.org/w/api.php?origin=*&action=query&redirects=1&format=json&formatversion=2&prop=pageprops&titles='+encodeURIComponent(name);
    const result=await fetch(base,{mode:'cors'});if(!result.ok)return null;
    const doc=await result.json(),page=doc?.query?.pages?.[0];
    let id='';
    if(page&&!page.missing){
      const redirects=(doc?.query?.redirects||[]).some(x=>normalize(x.from)===normalize(name)&&normalize(x.to)===normalize(page.title));
      if(redirects||normalize(page.title)===normalize(name))id=page.pageprops?.wikibase_item||'';
    }
    // A large global catalogue includes names that are absent from English Wikipedia
    // yet have their own Wikidata items. Find an exact university label instead.
    if(!/^Q\d+$/.test(id)){
      const endpoint='https://www.wikidata.org/w/api.php?origin=*&action=wbsearchentities&format=json&language=en&type=item&limit=8&search='+encodeURIComponent(name);
      const lookup=await fetch(endpoint,{mode:'cors'});
      if(lookup.ok){
        const candidates=(await lookup.json())?.search||[];
        const exact=candidates.find(row=>{
          const label=normalize(row.label||''),requested=normalize(name);
          const description=String(row.description||'').toLowerCase();
          return label===requested && (!description||/university|college|medical|education|academy|institute/.test(description));
        });
        if(exact?.id)id=exact.id;
      }
    }
    if(!/^Q\d+$/.test(id||''))return null;
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
 const campusSearchCache=new Map();
 async function commonsCampusSearch(name){
  name=canonicalUniversityName(name);
  if(campusSearchCache.has(name))return campusSearchCache.get(name);
  const job=(async()=>{
   try{
    // Only exact institutional names in Commons filenames are acceptable: never use a city/stock photo.
    const search='"'+String(name).replace(/["\\]/g,'')+'" campus';
    const url='https://commons.wikimedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch='+encodeURIComponent(search)+'&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=1100';
    const response=await fetch(url,{mode:'cors'});if(!response.ok)return null;
    const pages=(await response.json())?.query?.pages||[];
    const key=normalize(name);
    const candidates=pages.filter(p=>{
     const filename=String(p.title||'').replace(/^File:/i,'');
     return normalize(filename).includes(key)&&!/(logo|seal|coat.?of.?arms|crest|emblem|flag|symbol|admission|brochure|poster|portrait|passport|signature|map)/i.test(filename);
    }).sort((a,b)=>(a.index??999)-(b.index??999));
    for(const page of candidates){
     const info=page.imageinfo?.[0],license=String(info?.extmetadata?.LicenseShortName?.value||'');
     const w=Number(info?.width),h=Number(info?.height),image=info?.thumburl||info?.url;
     if(!/CC BY|CC0|public domain|PD-|CC-BY/i.test(license)||w<650||h<330||w/h<1||w/h>3.7)continue;
     if(!/^https:\/\/upload\.wikimedia\.org\//.test(image||''))continue;
     const credit=String(info?.extmetadata?.Artist?.value||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').slice(0,85);
     return {kind:'photo',url:image,source:info.descriptionurl||'https://commons.wikimedia.org',credit,licence:license,photoCandidate:true};
    }
    return null;
   }catch{return null;}
  })();
  campusSearchCache.set(name,job);return job;
 }
 window.ANUniMedia={websiteIcon,commonsImage,wikidataMedia,commonsCampusSearch};
 function showImage(cover,rec){
   if(!cover?.isConnected||!rec||!rec.photoCandidate)return;
   if(cover.querySelector('.an-guide-photo'))return;
   const image=document.createElement('img');
   image.className='campus-cover an-guide-photo an-commons-photo an-fullbleed-photo';
   image.alt=cover.dataset.universityTitle+' — Wikimedia Commons university illustration';
   image.loading='lazy';image.decoding='async';
   image.addEventListener('error',()=>{cover?.classList.remove('an-has-campus-photo');image.remove();},{once:true});
   image.addEventListener('load',()=>{
     if(cover.isConnected)cover.classList.add('an-has-campus-photo');
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
   if(candidate?.kind==='logo'&&cover.isConnected){
     const logo=document.createElement('img');
     logo.className='an-center-logo an-verified-media';
     logo.alt=name+' — licensed Wikimedia university identity';
     logo.loading='lazy';logo.decoding='async';
     logo.addEventListener('load',()=>{brand.querySelectorAll('.an-center-logo').forEach(old=>{if(old!==logo)old.remove();});},{once:true});
     logo.addEventListener('error',()=>logo.remove(),{once:true});
     brand.prepend(logo);logo.src=candidate.url;
   }
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
   const found=await commonsCampusSearch(name);
   if(found?.photoCandidate&&cover.isConnected)showImage(cover,found);
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
     failedMediaUrls.add(target.src);
     const cover=target.closest('.an-guide-card .uni-cover-wrap');
     const university=typeof U!=='undefined'?U.find(u=>u.id===cover?.dataset.universityId):null;
     target.remove();
     if(cover&&university){
       if(university.cardPhoto===target.src)university.cardPhoto='';
       const profile=typeof UNIVERSITY_PROFILES!=='undefined'?UNIVERSITY_PROFILES[university.id]:null;
       const oldIdentity=cover.querySelector('.an-guide-identity');
       if(oldIdentity)oldIdentity.outerHTML=brandFallback(university,profile);
       cover.querySelector('.uni-card-logo')?.remove();
       cover.querySelector('.an-guide-credit')?.remove();
       requestAnimationFrame(()=>inspect(cover));
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
