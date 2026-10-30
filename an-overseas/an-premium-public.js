/* Public A&N content gallery: published data only, no private tables or admin keys. */
(function(){
'use strict';
const ROOT='https://svpgjrxeqnluipsgjywk.supabase.co';
const KEY='sb_publishable_eR5TZxv2aWndxdwzU0RIUA_mXWcBcO3';
let stories=[],countries=null,team=[],snapshot='',working=false;
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
function showTeam(){
 if(current()!=='about')return;
 const mount=document.querySelector('#app>.wrap.content');if(!mount)return;
 let el=document.getElementById('an-public-management');
 if(!team.length){if(el)el.remove();return;}
 if(!el){el=document.createElement('section');el.id='an-public-management';mount.appendChild(el);}
 el.className='an-team-section';
 el.innerHTML='<div class="an-team-head"><span>THE PEOPLE BEHIND YOUR JOURNEY</span><h2><em>Meet Our</em> Management</h2></div><div class="an-team-grid">'
 +team.filter(p=>p&&p.name).map(p=>{
  const photo=url(p.photo),portfolio=url(p.portfolio),phone=contactNumber(p.phone),email=String(p.email||'');
  const title=p.designation||p.role||p.position||'',subtitle=p.position&&p.position!==title?p.position:'';
  const description=p.help||p.bio||p.description||'';
  const badge=photo?'<img class="an-team-photo" src="'+esc(photo)+'" alt="'+esc(p.name)+'" loading="lazy">'
    :'<div class="an-team-monogram">A<span>&</span>N</div>';
  const links=(portfolio?'<a class="an-team-button" href="'+esc(portfolio)+'" target="_blank" rel="noopener noreferrer">View Portfolio ↗</a>':'')
   +(phone.length>=8?'<a class="an-team-button alt" href="tel:'+esc(phone)+'">Call / Contact</a>':'')
   +(email&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)?'<a class="an-team-button alt" href="mailto:'+encodeURIComponent(email)+'">Email</a>':'');
  return '<article class="an-team-card">'+badge+'<div class="an-team-body"><h3>'+esc(p.name)+'</h3><b>'+esc(title)+'</b>'
  +(subtitle?'<div class="an-team-position">'+esc(subtitle)+'</div>':'')
  +(p.department?'<small>'+esc(p.department)+'</small>':'')
  +(description?'<p>'+esc(description)+'</p>':'')
  +'<div class="an-team-links">'+links+'</div></div></article>';
 }).join('')+'</div>';
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
