/* Public A&N content gallery: published data only, no private tables or admin keys. */
(function(){
'use strict';
const ROOT='https://svpgjrxeqnluipsgjywk.supabase.co';
const KEY='sb_publishable_eR5TZxv2aWndxdwzU0RIUA_mXWcBcO3';
let stories=[],insights=[],countries=null,team=[],teamIndex=0,snapshot='',working=false,refreshQueued=false;
const GALLERY_CACHE_KEY='an-approved-public-gallery-20261106-v1';
/* Fast first visit: bundled snapshot contains approved public posts only.
   A live Supabase refresh still replaces it with the latest published data. */
async function loadStaticGallery(){
 if(stories.length||insights.length)return;
 try{
  const response=await fetch('an-public-gallery-snapshot.json?v=20261106-v1',{cache:'force-cache'});
  if(!response.ok)return;
  const data=await response.json();
  if(snapshot||stories.length||insights.length)return; // never overwrite fresher data
  const approved=x=>Array.isArray(x)?x.filter(p=>p&&p.approved===true):[];
  const nextStories=approved(data.success_stories),nextInsights=approved(data.study_insights);
  if(!nextStories.length&&!nextInsights.length)return;
  stories=nextStories;insights=nextInsights;
  window.ANPublicSearchData={stories,insights};
  window.dispatchEvent(new Event('an-public-search-updated'));
  apply();
 }catch(e){/* Offline? Continue to normal live request. */}
}

function showCachedGallery(){
 try{
  const c=JSON.parse(localStorage.getItem(GALLERY_CACHE_KEY)||'null');
  if(!c||!Number.isFinite(c.at)||Date.now()-c.at>14*24*60*60*1000)return;
  stories=Array.isArray(c.stories)?c.stories.filter(x=>x&&x.approved===true):[];
  insights=Array.isArray(c.insights)?c.insights.filter(x=>x&&x.approved===true):[];
  if(stories.length||insights.length){snapshot=JSON.stringify({success_stories:stories,study_insights:insights});window.ANPublicSearchData={stories,insights};apply();}
 }catch(e){}
}
function saveCachedGallery(){
 try{
  const safe={at:Date.now(),stories:stories.filter(x=>x?.approved===true).slice(0,100),insights:insights.filter(x=>x?.approved===true).slice(0,100)};
  localStorage.setItem(GALLERY_CACHE_KEY,JSON.stringify(safe));
 }catch(e){}
}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=x=>{try{const u=new URL(x);return u.protocol==='https:'?u.href:'';}catch{return'';}};
const img=x=>url(x)||(String(x||'').startsWith('photo-')?'https://images.unsplash.com/'+x+'?w=900&q=85&auto=format&fit=crop':'');
const current=()=>location.hash.replace(/^#\/?/,'').split(/[/?]/)[0]||'home';
function storyCard(s,i){
 const media=url(s.media_url);if(!media)return'';
 const title=esc(s.title||'Student Success'),desc=esc(s.description||'');
 const visual=s.type==='video'
  ?'<div class="an-youtube-media is-video"><video src="'+esc(media)+'" playsinline controls preload="metadata" aria-label="'+title+'"></video></div>'
  :'<button type="button" class="an-youtube-media is-image" data-an-preview="'+esc(media)+'" data-an-title="'+title+'" aria-label="Enlarge '+title+'"><img src="'+esc(media)+'" alt="'+title+'" loading="lazy"><span class="an-zoom">⤢ View Photo</span></button>';
 const d=s.created_at?new Date(s.created_at):null;
 const date=d&&!isNaN(d.getTime())?d.toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'}):'';
 return '<article class="an-youtube-card">'+visual+'<div class="an-youtube-info"><div class="an-story-avatar">A<span>&</span>N</div><div class="an-story-copy"><h3>'+title+'</h3>'
 +(desc?'<p>'+desc+'</p><button type="button" class="an-community-more" data-an-read-detail="story" data-an-detail-index="'+i+'" aria-label="Read full story: '+title+'">Read more ↗</button>':'')+'<small>A&N Overseas'+(date?' · '+esc(date):'')+'</small></div></div></article>';
}

function insightCard(s,i){
 const title=esc(s.title||'Study Resource'),desc=esc(s.description||'');
 const media=url(s.media_url),type=s.type||'text';
 const category=esc(s.category||'Student Guidance');
 const visual=(type==='video'&&media)
  ?'<div class="an-community-media is-video"><video controls playsinline preload="metadata" src="'+esc(media)+'" aria-label="'+title+'"></video></div>'
  :(type==='image'&&media)
  ?'<button class="an-community-media is-image" type="button" data-an-preview="'+esc(media)+'" data-an-title="'+title+'" aria-label="View '+title+'"><img src="'+esc(media)+'" alt="'+title+'" loading="lazy"></button>'
  :'<div class="an-community-media is-text"><span>✦</span><b>'+title+'</b></div>';
 const d=s.created_at?new Date(s.created_at):null;
 const date=d&&!isNaN(d.getTime())?d.toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'}):'';
 return '<article class="an-community-card">'+visual+
 '<div class="an-community-copy"><div class="an-community-category">'+(s.featured?'★ FEATURED · ':'')+category+'</div><h3>'+title+'</h3>'+
 (desc?'<p class="an-community-desc">'+desc+'</p><button type="button" class="an-community-more" data-an-read-detail="study" data-an-detail-index="'+i+'" aria-label="Read full update: '+title+'">Read more ↗</button>':'')+
 '<small class="an-community-meta">A&N Overseas'+(date?' · '+esc(date):'')+'</small></div></article>';
}
function showInsights(){
 const mount=document.querySelector('#an-insights-gallery');
 if(!mount)return;
 const live=insights.filter(s=>s&&s.approved===true&&String(s.title||'').trim());
 live.sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)||(new Date(b.created_at||0)-new Date(a.created_at||0)));
 const top=live.find(s=>s.featured);
 const feature=document.querySelector('#an-community-featured');
 if(feature)feature.innerHTML='<b>'+(top?'FEATURED':'STUDY HUB')+'</b><span>'+esc(top?top.title:'University news, application tips and practical student resources')+'</span>';
 mount.innerHTML=live.length?'<div class="an-community-grid">'+live.map((s,i)=>insightCard(s,i)).join('')+'</div>'
 :'<div class="an-premium-empty"><span>✦</span><h2>Study Updates & Insights</h2><p>University guides, FAQs, posters and videos will appear here after the administrator publishes them.</p></div>';
}

function showStories(){
 const mount=document.querySelector('#an-success-gallery');
 if(!mount)return;
 const live=stories.filter(s=>s&&s.approved===true&&(s.type==='video'||s.type==='image')&&url(s.media_url));
 live.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
 mount.innerHTML=live.length?'<div class="an-youtube-grid">'+live.map(storyCard).join('')+'</div>'
 :'<div class="an-premium-empty"><span>✦</span><h2>Our Student Stories</h2><p>Verified student photos and videos will appear here once published with permission.</p></div>';
}
function showCountries(){
 const mount=document.querySelector('.country-tiles');
 if(!mount||!Array.isArray(countries)||!countries.length)return;
 mount.innerHTML=countries.filter(c=>Array.isArray(c)&&c[0]).map(c=>{
  const photo=img(c[2]),name=String(c[0]);
  if(window.ANCountryCards?.render)return window.ANCountryCards.render({name,flag:c[1],img:c[2]});
  return '<a class="country an-country-card" href="#/universities?country='+encodeURIComponent(name)+'"'
   +(photo?' style="background-image:url(&quot;'+esc(photo)+'&quot;)"':'')+'><span class="flag">'+esc(c[1]||'🌍')+'</span>'
   +'<strong>'+esc(name)+'</strong><small>Explore universities <span>↗</span></small></a>';
 }).join('');
}
function contactNumber(n){return String(n||'').replace(/[^0-9+]/g,'');}
function activeMembers(){return team.filter(m=>m&&String(m.name||'').trim());}
function positionHeading(role,name=''){
 const source=String(role||'MANAGEMENT').trim().toUpperCase();
 const words=source.split(/\s+/).filter(Boolean);
 let cut=Math.max(1,Math.ceil(words.length/2));
 // Keep an intentional orange/white split, rather than arbitrary character colours.
 const ofMarketing=words.indexOf('OF');
 if(ofMarketing>0 && words.slice(ofMarketing+1).includes('MARKETING'))cut=ofMarketing;
 if(words.length===1){
   return '<span class="an-role-orange">'+esc(source)+'</span>'+
     (name?' <span class="an-role-white">'+esc(String(name).toUpperCase())+'</span>':'');
 }
 return '<span class="an-role-orange">'+esc(words.slice(0,cut).join(' '))+'</span>'+
   ' <span class="an-role-white">'+esc(words.slice(cut).join(' '))+'</span>';
}
function managerField(label,value,extraClass=''){
 if(!value)return '';
 return '<div class="an-manager-field '+extraClass+'"><span class="an-manager-field-label">'+esc(label.toUpperCase())+'</span><span class="an-manager-field-value">'+esc(value)+'</span></div>';
}
function showTeam(){
 if(current()!=='about')return;
 const panel=document.getElementById('an-manager-card'),counter=document.getElementById('an-manager-counter');
 if(!panel||!counter)return;
 const members=activeMembers(),arrows=[...document.querySelectorAll('.an-manager-controls [data-an-manager]')];
 if(!members.length){
  panel.innerHTML='<div class="an-manager-role-banner">OUR MANAGEMENT TEAM</div><div class="an-manager-empty">Management profiles will appear here after publication.</div>';
  counter.textContent='0 / 0';arrows.forEach(x=>x.disabled=true);return;
 }
 teamIndex=(teamIndex+members.length)%members.length;
 arrows.forEach(x=>x.disabled=members.length<2);
 const m=members[teamIndex],photo=url(m.photo),portfolio=url(m.portfolio);
 const email=String(m.email||'').trim(),phone=contactNumber(m.phone);
 const validEmail=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
 const role=String(m.position||m.designation||m.role||'Management').trim();
 const linkedIn=url(m.linkedin||m.linkedin_url||m.linkedinUrl||m.socials?.linkedin||'');
 const help=String(m.help||m.bio||m.description||'').trim();
 const isFounder=m.id==='nusrat-nasrin'||String(m.name).trim().toLowerCase()==='nusrat nasrin';
 const imageHtml=photo?'<button class="an-manager-photo-button" type="button" data-an-preview="'+esc(photo)+'" data-an-title="'+esc(m.name)+'" aria-label="View full photo of '+esc(m.name)+'"><img class="an-manager-photo" src="'+esc(photo)+'" alt="'+esc(m.name)+'" loading="lazy"></button>'
  :'<div class="an-manager-photo an-manager-photo-empty"><span>A</span>&amp;<span>N</span></div>';
 const mailIcon='<svg class="an-mail" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.1-8 5-8-5V6l8 5 8-5v2.1Z"/></svg>';
 const waIcon='<svg class="an-wa" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.82 11.82 0 0 0 12.07 0C5.49 0 .13 5.34.12 11.91a11.8 11.8 0 0 0 1.6 5.96L0 24l6.29-1.65a11.95 11.95 0 0 0 5.77 1.47h.01c6.57 0 11.94-5.35 11.94-11.93a11.8 11.8 0 0 0-3.49-8.41ZM12.07 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.73.98 1-3.64-.24-.38a9.83 9.83 0 0 1-1.52-5.26c0-5.47 4.46-9.92 9.94-9.92a9.88 9.88 0 0 1 7.03 2.91 9.87 9.87 0 0 1 2.9 7.02c0 5.47-4.46 9.92-9.98 9.92Zm5.45-7.44c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.66-1.6-.9-2.18-.23-.56-.47-.48-.66-.49h-.56c-.2 0-.52.08-.79.37s-1.03 1.01-1.03 2.46 1.06 2.86 1.21 3.06c.15.2 2.09 3.18 5.06 4.45.71.31 1.26.49 1.7.63.71.22 1.35.19 1.85.12.56-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg>';
 const emailHtml=validEmail?'<a class="an-manager-contact" href="mailto:'+esc(email)+'" aria-label="Email '+esc(m.name)+'">'+mailIcon+'<span><small>EMAIL</small><b>'+esc(email)+'</b></span></a>':'';
 const waNumber=phone.replace(/[^0-9]/g,'');
 const whatsappHtml=waNumber.length>=8?'<a class="an-manager-contact" href="https://wa.me/'+waNumber+'" target="_blank" rel="noopener noreferrer" aria-label="Chat with '+esc(m.name)+' on WhatsApp">'+waIcon+'<span><small>WHATSAPP</small><b>Start a conversation ↗</b></span></a>':
 '<span class="an-manager-contact an-contact-unavailable" title="WhatsApp number has not been published">'+waIcon+'<span><small>WHATSAPP</small><b>Contact number not published</b></span></span>';
 const displayName=String(m.name||'').trim();const nameParts=displayName.match(/^(AGRICULTURIST)\s+(.+)$/i);
  const coloredName=nameParts?'<span class="an-manager-profession">'+esc(nameParts[1].toUpperCase())+'</span> <span class="an-manager-person-name">'+esc(nameParts[2].toUpperCase())+'</span>':esc(displayName);
  const nameHtml='<div class="an-manager-name-box"><span class="an-manager-label">NAME</span><h3 class="an-manager-white-name">'+coloredName+'</h3></div>';
 const designationHtml='<div class="an-manager-position"><span class="an-manager-label">DESIGNATION</span><strong>'+positionHeading(role)+'</strong></div>';
 const supportHtml=help?'<div class="an-manager-support"><span class="an-manager-label">STUDENT SUPPORT</span><p>'+esc(help)+'</p></div>':'';
 const buttonsHtml=(portfolio?'<a class="an-manager-action an-journey-cta" href="'+esc(portfolio)+'" target="_blank" rel="noopener noreferrer">'+(isFounder?'DISCOVER THE FOUNDER':'VIEW PORTFOLIO')+' ↗</a>':'')+
   (isFounder?'<a class="an-manager-action an-admin-entry" href="#/admin" aria-label="Open secure administration login">ADMIN PANEL ↗</a>':'');
 const linkedinTarget=linkedIn||'https://www.linkedin.com/search/results/people/?keywords='+encodeURIComponent(String(m.name||'').trim());
 const linkedInHtml='<a class="an-manager-contact an-manager-linkedin" href="'+esc(linkedinTarget)+'" target="_blank" rel="noopener noreferrer" aria-label="'+(linkedIn?'View':'Find')+' '+esc(m.name)+' on LinkedIn"><span class="an-linkedin-mark" aria-hidden="true">in</span><span><small>LINKEDIN</small><b>'+(linkedIn?'Open LinkedIn profile ↗':'Find on LinkedIn ↗')+'</b></span></a>';
 panel.innerHTML='<div class="an-manager-role-banner">'+positionHeading(role,isFounder?m.name:'')+'</div><div class="an-manager-main"><div class="an-manager-photo-box">'+imageHtml+'</div>'
  +'<div class="an-manager-information">'+nameHtml+designationHtml+supportHtml
  +'<div class="an-manager-contacts">'+emailHtml+whatsappHtml+linkedInHtml+'</div>'
  +'<div class="an-manager-actions">'+buttonsHtml+'</div></div></div>';
 counter.textContent=(teamIndex+1)+' / '+members.length;
}
function apply(){
 if(current()==='success'){showInsights();showStories();}
 if(current()==='countries')showCountries();
 if(current()==='about')showTeam();
}
async function load(){
 const route=current();
 const keys=route==='success'?'success_stories,study_insights':route==='about'?'management':route==='countries'?'countries':'';
 if(!keys)return;
 if(working){refreshQueued=true;return;}
 working=true;
 try{
  const r=await fetch(ROOT+'/rest/v1/an_site_content?select=key,value&key=in.('+keys+')',{
   headers:{apikey:KEY},cache:'no-store',signal:AbortSignal.timeout(8500)
  });
  if(!r.ok)throw Error('Could not load public media');
  const rows=await r.json(),data={};rows.forEach(r=>data[r.key]=r.value);
  const next=JSON.stringify(data);
  if(snapshot!==next){snapshot=next;
   if(Object.prototype.hasOwnProperty.call(data,'success_stories'))stories=Array.isArray(data.success_stories)?data.success_stories:[];
   if(Object.prototype.hasOwnProperty.call(data,'study_insights'))insights=Array.isArray(data.study_insights)?data.study_insights:[];
   if(Object.prototype.hasOwnProperty.call(data,'countries'))countries=Array.isArray(data.countries)?data.countries:null;
   if(Object.prototype.hasOwnProperty.call(data,'management'))team=Array.isArray(data.management)?data.management:[];
  }
  window.ANPublicSearchData={stories,insights};
  window.dispatchEvent(new Event('an-public-search-updated'));
  saveCachedGallery();
  apply();
 }catch(e){
  if(!snapshot&&!stories.length&&!insights.length&&current()==='success'){
   const msg='<div class="an-premium-empty" role="alert"><span>!</span><h2>Live content temporarily unavailable</h2><p>Could not load published posts. Check your connection and tap Refresh to try again.</p><button type="button" class="an-community-more" data-an-gallery-refresh>Refresh posts ↻</button></div>';
   ['an-insights-gallery','an-success-gallery'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=msg;});
  }else apply();
 }finally{working=false;if(refreshQueued){refreshQueued=false;queueMicrotask(()=>void load());}}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-an-gallery-refresh]'))void load();});
document.addEventListener('click',e=>{
 const arrow=e.target.closest('[data-an-manager]');
 if(!arrow||current()!=='about'||arrow.disabled)return;
 const count=activeMembers().length;
 if(count<2)return;
 teamIndex=(teamIndex+Number(arrow.dataset.anManager)+count)%count;
 showTeam();
});
let startX=null;
document.addEventListener('touchstart',e=>{
 if(current()==='about'&&e.target.closest('#an-manager-card'))startX=e.touches[0]?.clientX??null;
},{passive:true});
document.addEventListener('touchend',e=>{
 if(startX===null||current()!=='about')return;
 const next=e.changedTouches[0]?.clientX??startX,delta=next-startX;
 startX=null;
 if(Math.abs(delta)<50||activeMembers().length<2)return;
 teamIndex=(teamIndex+(delta<0?1:-1)+activeMembers().length)%activeMembers().length;showTeam();
},{passive:true});

// Fullscreen reader for Study Updates and Student Success Stories.
// The compact two-column cards remain unchanged; Read More opens media first,
// then the complete caption. Tapping an image still opens the original photo.
const liveStudies=()=>insights.filter(s=>s&&s.approved===true&&String(s.title||'').trim())
 .sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)||(new Date(b.created_at||0)-new Date(a.created_at||0)));
const liveStories=()=>stories.filter(s=>s&&s.approved===true&&(s.type==='video'||s.type==='image')&&url(s.media_url))
 .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
let anReaderPopPending=false;
function closeAnReaderFromHistory(){
 const dlg=document.getElementById('an-detail-dialog');
 if(dlg?.open){dlg.querySelectorAll('video').forEach(v=>v.pause());dlg.close();}
 anReaderPopPending=false;
}
function openAnReader(kind,index){
 if(current()!=='success'||!Number.isSafeInteger(index)||index<0)return;
 const item=(kind==='story'?liveStories():kind==='study'?liveStudies():[])[index];if(!item)return;
 const title=esc(item.title||(kind==='story'?'Student Success Story':'Study Update'));
 const full=esc(item.description||'');
 const media=url(item.media_url);
 const video=item.type==='video'&&media;
 const picture=item.type==='image'&&media;
 const category=esc(kind==='study'?item.category||'Student Guidance':'Student Success Story');
 const d=item.created_at?new Date(item.created_at):null;
 const date=d&&!isNaN(d.getTime())?d.toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'}):'';
 const visual=video
  ?'<div class="an-reader-media"><video controls playsinline preload="metadata" src="'+esc(media)+'" aria-label="'+title+'"></video></div>'
  :picture
   ?'<button type="button" class="an-reader-media an-reader-photo-button" data-an-preview="'+esc(media)+'" data-an-title="'+title+'" aria-label="View full original photo: '+title+'"><img src="'+esc(media)+'" alt="'+title+'"><span>⤢ View full photo</span></button>'
   :'<div class="an-reader-media an-reader-text-media" aria-hidden="true">✦</div>';
 let dlg=document.getElementById('an-detail-dialog');
 if(!dlg){dlg=document.createElement('dialog');dlg.id='an-detail-dialog';dlg.className='an-detail-dialog';dlg.setAttribute('aria-label','Full article and media');document.body.appendChild(dlg);}
 if(dlg.open)closeAnReaderFromHistory();
 dlg.innerHTML='<div class="an-reader-layout">'
  +'<header class="an-reader-top"><span>A&amp;N OVERSEAS <b>· FULL STORY</b></span><button type="button" data-an-close-detail aria-label="Close full story">✕ Close</button></header>'
  +'<div class="an-reader-scroll">'+visual
  +'<article class="an-reader-copy"><div class="an-reader-category">'+category+'</div><h1>'+title+'</h1>'
  +'<div class="an-reader-meta">A&amp;N Overseas'+(date?' · '+esc(date):'')+'</div>'
  +(full?'<div class="an-reader-description">'+full+'</div>':'')
  +'</article></div></div>';
 if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
 history.pushState({anDetailPreview:true},'',location.href);
 anReaderPopPending=true;
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-an-read-detail]');if(!b)return;
 const index=Number(b.dataset.anDetailIndex);
 openAnReader(b.dataset.anReadDetail,index);
});
document.addEventListener('click',e=>{
 if(!e.target.closest('[data-an-close-detail]'))return;
 if(anReaderPopPending)history.back();else closeAnReaderFromHistory();
});
window.addEventListener('popstate',e=>{
 if(anReaderPopPending&&!e.state?.anDetailPreview)closeAnReaderFromHistory();
});
document.addEventListener('cancel',e=>{
 if(e.target?.id!=='an-detail-dialog')return;
 if(anReaderPopPending){e.preventDefault();history.back();}
});
// Full-resolution, uncropped photo viewer. Android Back closes the image before changing routes.
let anPhotoPopPending=false;
function closeAnPhotoFromHistory(){
 const dlg=document.getElementById('an-preview-dialog');
 if(dlg?.open){dlg.close?.();dlg.removeAttribute('open');}
 anPhotoPopPending=false;
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-an-preview]');if(!target)return;
 const src=url(target.dataset.anPreview);if(!src)return;
 let dlg=document.getElementById('an-preview-dialog');
 if(!dlg){dlg=document.createElement('dialog');dlg.id='an-preview-dialog';dlg.className='an-preview-dialog';document.body.appendChild(dlg);}
 if(dlg.open)closeAnPhotoFromHistory();
 dlg.innerHTML='<button type="button" class="an-dialog-close" data-an-close aria-label="Close photo">×</button><img src="'+esc(src)+'" alt="'+esc(target.dataset.anTitle||'Full photo')+'"><p>'+esc(target.dataset.anTitle||'')+'</p>';
 if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
 history.pushState({anPhotoPreview:true},'',window.location.href);
 anPhotoPopPending=true;
});
window.addEventListener('popstate',()=>{if(anPhotoPopPending)closeAnPhotoFromHistory();});
document.addEventListener('click',e=>{
 if(!e.target.closest('[data-an-close]'))return;
 if(anPhotoPopPending)history.back();else closeAnPhotoFromHistory();
});
document.addEventListener('cancel',e=>{
 if(e.target?.id!=='an-preview-dialog')return;
 if(anPhotoPopPending){e.preventDefault();history.back();}
});
// The university CMS can re-render #app after this gallery has already filled the
// About carousel. Observe only its direct children to restore a lost management
// profile without recursively observing updates inside the carousel itself.
function restoreAboutAfterRender(){
 if(current()!=='about'||!activeMembers().length)return;
 const card=document.getElementById('an-manager-card');
 if(card&&!card.querySelector('.an-manager-name-box'))showTeam();
}
const appRoot=document.getElementById('app');
if(appRoot)new MutationObserver(()=>{
 if(current()==='about')requestAnimationFrame(restoreAboutAfterRender);
}).observe(appRoot,{childList:true});
window.addEventListener('hashchange',()=>setTimeout(()=>{apply();restoreAboutAfterRender();void load();},70));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{showCachedGallery();void loadStaticGallery();void load();});else{showCachedGallery();void loadStaticGallery();void load();}
setInterval(()=>{if(!document.hidden)void load();},60000);
})();
