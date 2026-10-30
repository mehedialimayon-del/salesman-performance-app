/* Public A&N content gallery: published data only, no private tables or admin keys. */
(function(){
'use strict';
const ROOT='https://svpgjrxeqnluipsgjywk.supabase.co';
const KEY='sb_publishable_eR5TZxv2aWndxdwzU0RIUA_mXWcBcO3';
let stories=[],countries=null,team=[],teamIndex=0,snapshot='',working=false;
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
 +(desc?'<p>'+desc+'</p>':'')+'<small>A&N Overseas'+(date?' · '+esc(date):'')+'</small></div></div></article>';
}
function showStories(){
 const mount=document.querySelector('#an-success-gallery');
 if(!mount)return;
 const live=stories.filter(s=>s&&s.approved===true&&(s.type==='video'||s.type==='image')&&url(s.media_url));
 mount.innerHTML=live.length?'<div class="an-youtube-grid">'+live.map(storyCard).join('')+'</div>'
 :'<div class="an-premium-empty"><span>✦</span><h2>Our Student Stories</h2><p>Verified student photos and videos will appear here once published with permission.</p></div>';
}
function showCountries(){
 const mount=document.querySelector('.country-tiles');
 if(!mount||!Array.isArray(countries)||!countries.length)return;
 mount.innerHTML=countries.filter(c=>Array.isArray(c)&&c[0]).map(c=>{
  const photo=img(c[2]),name=String(c[0]);
  return '<a class="country an-country-card" href="#/universities?country='+encodeURIComponent(name)+'"'
   +(photo?' style="background-image:url(&quot;'+esc(photo)+'&quot;)"':'')+'><span class="flag">'+esc(c[1]||'🌍')+'</span>'
   +'<strong>'+esc(name)+'</strong><small>Explore universities <span>↗</span></small></a>';
 }).join('');
}
function contactNumber(n){return String(n||'').replace(/[^0-9+]/g,'');}
function activeMembers(){return team.filter(m=>m&&String(m.name||'').trim());}
function positionHeading(role){
 const words=String(role||'MANAGEMENT').trim().toUpperCase().split(/\s+/).filter(Boolean);
 const cut=Math.max(1,Math.ceil(words.length/2));
 const first=words.slice(0,cut).join(' '),last=words.slice(cut).join(' ');
 return '<span class="an-role-orange">'+esc(first)+'</span>'+(last?' <span class="an-role-white">'+esc(last)+'</span>':'');
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
 const m=members[teamIndex];
 const photo=url(m.photo),portfolio=url(m.portfolio),email=String(m.email||'').trim(),phone=contactNumber(m.phone);
 const validEmail=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
 const role=String(m.position||m.designation||m.role||'Management').trim();
 const otherRole=String(m.designation||m.role||'').trim();
 const company=String(m.company||m.department||'').trim();
 const help=String(m.help||m.bio||m.description||'').trim();
 const isOwner=m.id==='nusrat-nasrin'||String(m.name).trim().toLowerCase()==='nusrat nasrin';
 const imageHtml=photo?'<img class="an-manager-photo" src="'+esc(photo)+'" alt="'+esc(m.name)+'" loading="lazy">'
  :'<div class="an-manager-photo an-manager-photo-empty"><span>A</span>&amp;<span>N</span></div>';
 const emailHtml=validEmail?'<a class="an-manager-field an-manager-email-box" href="mailto:'+esc(email)+'" aria-label="Send email to '+esc(m.name)+'"><span class="an-manager-field-label">EMAIL <span aria-hidden="true">↗</span></span><span class="an-manager-field-value">'+esc(email)+'</span></a>':'';
 const phoneHtml=phone.length>=8?'<a class="an-manager-field an-manager-phone-box" href="tel:'+esc(phone)+'" aria-label="Call '+esc(m.name)+'"><span class="an-manager-field-label">CONTACT NUMBER ↗</span><span class="an-manager-field-value">'+esc(m.phone)+'</span></a>':'';
 const buttonsHtml=(portfolio?'<a class="an-manager-action" href="'+esc(portfolio)+'" target="_blank" rel="noopener noreferrer">VIEW PORTFOLIO ↗</a>':'')
  +(isOwner?'<a class="an-manager-action an-manager-action-secondary" href="./admin-app/" target="_blank" rel="noopener noreferrer">ADMIN PANEL ↗</a>':'');
 panel.innerHTML='<div class="an-manager-role-banner">'+positionHeading(role)+'</div>'
  +'<div class="an-manager-main"><div class="an-manager-photo-box">'+imageHtml+'</div>'
  +'<div class="an-manager-information">'
  +managerField('NAME',m.name,'an-manager-name-box')
  +(otherRole&&otherRole!==role?managerField('DESIGNATION',otherRole):'')
  +managerField('COMPANY',company,'an-manager-company-box')
  +managerField('STUDENT SUPPORT',help,'an-manager-bio-box')
  +(m.department&&m.department!==company?managerField('DEPARTMENT',m.department):'')
  +emailHtml+phoneHtml
  +'<div class="an-manager-actions">'+buttonsHtml+'</div>'
  +'</div></div>';
 counter.textContent=(teamIndex+1)+' / '+members.length;
}
function apply(){
 if(current()==='success')showStories();
 if(current()==='countries')showCountries();
 if(current()==='about')showTeam();
}
async function load(){
 if(working)return;working=true;
 try{
  const r=await fetch(ROOT+'/rest/v1/an_site_content?select=key,value&key=in.(success_stories,countries,management)',{
   headers:{apikey:KEY},cache:'no-store'
  });
  if(!r.ok)throw Error('Could not load public media');
  const rows=await r.json(),data={};rows.forEach(r=>data[r.key]=r.value);
  const next=JSON.stringify(data);
  if(snapshot!==next){snapshot=next;stories=Array.isArray(data.success_stories)?data.success_stories:[];
   countries=Array.isArray(data.countries)?data.countries:null;team=Array.isArray(data.management)?data.management:[];}
  apply();
 }catch(e){
  apply();
 }finally{working=false;}
}
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
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-an-preview]');if(!target)return;
 const src=url(target.dataset.anPreview);if(!src)return;
 let dlg=document.getElementById('an-preview-dialog');
 if(!dlg){dlg=document.createElement('dialog');dlg.id='an-preview-dialog';dlg.className='an-preview-dialog';document.body.appendChild(dlg);}
 dlg.innerHTML='<button type="button" class="an-dialog-close" data-an-close aria-label="Close photo">×</button><img src="'+esc(src)+'" alt="'+esc(target.dataset.anTitle||'Student photo')+'"><p>'+esc(target.dataset.anTitle||'')+'</p>';
 if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
});
document.addEventListener('click',e=>{if(e.target.closest('[data-an-close]')){const dlg=document.getElementById('an-preview-dialog');if(dlg?.close)dlg.close();else dlg?.removeAttribute('open');}});
window.addEventListener('hashchange',()=>setTimeout(apply,70));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void load());else void load();
setInterval(()=>{if(!document.hidden)void load();},45000);
})();
