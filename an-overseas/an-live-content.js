/* Public-only A&N CMS bridge. No private tables or privileged keys. */
(function(){
'use strict';
const ROOT='https://svpgjrxeqnluipsgjywk.supabase.co';
const KEY='sb_publishable_eR5TZxv2aWndxdwzU0RIUA_mXWcBcO3';
const headers={'apikey':KEY,'Content-Type':'application/json'};
let settings={},news=[],team=[],universityOverrides=[],version='',busy=false;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink=x=>{try{const u=new URL(x);return u.protocol==='https:'?u.href:'';}catch{return'';}};
async function refreshCms(){
 if(busy||document.hidden)return;busy=true;
 try{
  const r=await fetch(ROOT+'/rest/v1/an_site_content?select=key,value&key=in.(settings,latest_updates,management,university_overrides)',{headers:{apikey:KEY},cache:'no-store'});
  if(!r.ok)throw Error('Public content unavailable');
  const rows=await r.json(),s={};rows.forEach(x=>{s[x.key]=x.value});
  const next=JSON.stringify(s);
  if(next!==version){version=next;settings=s.settings||{};news=Array.isArray(s.latest_updates)?s.latest_updates:[];team=Array.isArray(s.management)?s.management:[];universityOverrides=Array.isArray(s.university_overrides)?s.university_overrides:[];applyUniversities();applyPage();}
 }catch(_){/* Site remains usable without the optional CMS service. */}
 finally{busy=false;}
}
function applyUniversities(){
 if(typeof U==='undefined'||!Array.isArray(U))return;
 let changed=false;
 universityOverrides.forEach(data=>{
  if(!data||!data.id||!data.name)return;
  let u=U.find(x=>x.id===data.id);
  if(!u){u={id:String(data.id),name:String(data.name),short:String(data.short||data.name),country:String(data.country||'Malaysia'),city:String(data.city||''),kind:data.kind==='Private'?'Private':'Public',programs:Array.isArray(data.programs)?data.programs:[],site:safeLink(data.site)||'https://www.mqa.gov.my',photo:''};U.push(u);changed=true;}
  ['name','short','city','country','kind','site'].forEach(k=>{
   if(typeof data[k]==='string'&&data[k]&&u[k]!==data[k]){u[k]=data[k];changed=true;}
  });
  const cover=safeLink(data.cardImageUrl||data.cardPhoto);
  const logo=safeLink(data.logoImageUrl||data.logoImage);
  if(cover&&u.cardPhoto!==cover){u.cardPhoto=cover;changed=true;}
  if(logo&&u.logoImage!==logo){u.logoImage=logo;changed=true;}
  if(Array.isArray(data.galleryImages)){const urls=data.galleryImages.map(safeLink).filter(Boolean);if(JSON.stringify(u.galleryImages||[])!==JSON.stringify(urls)){u.galleryImages=urls;changed=true;}}
  if(Array.isArray(data.programs)&&JSON.stringify(u.programs)!==JSON.stringify(data.programs)){u.programs=data.programs;changed=true;}
 });
 if(changed&&typeof render==='function')render();
}
function applyPage(){
 const marquee=document.querySelector('.ticker .marquee');
 const lines=news.filter(x=>x&&x.text).map(x=>String(x.text));
 const text=lines.length?lines.join('  ✦  '):settings.ticker||'';
 if(marquee&&text&&marquee.textContent!==text)marquee.textContent=text;
 const title=document.querySelector('body.home-view .hero h1');
 if(title&&(settings.heroLead||settings.heroAccent)){
  const h=esc(settings.heroLead||'Study in'),a=esc(settings.heroAccent||'Malaysia.');
  const html=h+'<br><span class="gradient">'+a+'</span>';
  if(title.innerHTML!==html)title.innerHTML=html;
 }
 const d=document.querySelector('body.home-view .home-description');
 if(d&&settings.heroDescription&&d.textContent!==settings.heroDescription)d.textContent=settings.heroDescription;
 // Only the fixed About carousel in an-premium-public.js can render management members.
 // This bridge updates public text in place; it must never append a second team grid.
 if(location.hash.split('?')[0]==='#/about'){
  // Concise mission copy is editable in the secure Admin Website Editor.
  // The fixed visual design limits overflow without altering the published wording.
  const summary=document.getElementById('an-about-intro');
  if(summary&&settings.about&&summary.textContent!==settings.about)summary.textContent=settings.about;
  const office=document.querySelectorAll('#an-about-fixed .an-about-locations span');
  if(office.length===2){
   office[0].textContent='🇲🇾 '+(settings.malaysiaOffice||'Kuala Lumpur, Malaysia');
   office[1].textContent='🇧🇩 '+(settings.bangladeshOffice||'Rangpur, Bangladesh');
  }
 }
 if(location.hash.split('?')[0]==='#/aboutdetails'){
  const work=document.getElementById('an-about-work');
  if(work&&settings.work&&work.textContent!==settings.work)work.textContent=settings.work;
 }
 if(location.hash.startsWith('#/contact')){
  const c=document.querySelector('#app .wrap.content .card .inside');
  if(c){
   let box=document.getElementById('an-public-contact');
   if(!box){box=document.createElement('div');box.id='an-public-contact';c.appendChild(box);}
   box.innerHTML='<p><b>Malaysia:</b> '+esc(settings.malaysiaOffice||'Kuala Lumpur')+'</p><p><b>Bangladesh:</b> '+esc(settings.bangladeshOffice||'Rangpur')+'</p>'
    +(settings.phone?'<p><b>Phone:</b> '+esc(settings.phone)+'</p>':'')
    +(settings.email?'<p><b>Email:</b> <a href="mailto:'+encodeURIComponent(settings.email)+'">'+esc(settings.email)+'</a></p>':'')
    +(settings.whatsapp&&/^\+?[0-9 ()-]{8,25}$/.test(settings.whatsapp)?'<p><a href="https://wa.me/'+settings.whatsapp.replace(/[^0-9]/g,'')+'" target="_blank" rel="noopener">Message on WhatsApp ↗</a></p>':'');
  }
  const n=document.querySelector('#contact-form')?.previousElementSibling;
  if(n&&n.tagName==='P')n.textContent='Send a message to A&N Overseas. Our team will review your enquiry.';
 }
}
document.addEventListener('submit',async e=>{
 const form=e.target;
 if(form?.id!=='contact-form')return;
 e.preventDefault();e.stopImmediatePropagation();
 const name=form.querySelector('[name=name]')?.value.trim(),email=form.querySelector('[name=email]')?.value.trim(),phone=form.querySelector('[name=phone]')?.value.trim(),message=form.querySelector('[name=message]')?.value.trim();
 if(!name||!email||!message)return;
 const button=form.querySelector('[type=submit]');button.disabled=true;
 try{
  const res=await fetch(ROOT+'/rest/v1/an_enquiries',{method:'POST',headers:{...headers,'Prefer':'return=minimal'},body:JSON.stringify({full_name:name,email,phone:phone||'',country:'',institution:'',programme:'',message,status:'new'})});
  if(!res.ok)throw Error('Message could not be sent. Please contact us directly.');
  form.reset();window.toast?.('Message sent. Our team will contact you soon.');
 }catch(err){window.toast?.(err.message||'Could not send enquiry');}
 finally{button.disabled=false;}
},true);
window.addEventListener('hashchange',()=>setTimeout(applyPage,20));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCms();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshCms);else refreshCms();
setInterval(refreshCms,90000);
})();