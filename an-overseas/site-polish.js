/* A&N global ticker and responsive public-page enhancements. */
(function(){
'use strict';
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const servicePhotos=[
 'photo-1541339907198-e08756dedf3f','photo-1492538368677-f6e0afe31dcc',
 'photo-1566073771259-6a8506099945','photo-1436491865332-7a61a109cc05',
 'photo-1476514525535-07fb3b4ae5f1','photo-1551836022-d5d88e9218df',
 'photo-1523289333742-be1143f6b766','photo-1513258496099-48168024aec0'
];
const namedServicePhotos={'Job Search Assistance':'photo-1497366754035-f200968a6e72','Air Ticket Assistance':'photo-1436491865332-7a61a109cc05','Hotel Booking Support':'photo-1566073771259-6a8506099945','Tourist Visa Guidance':'photo-1488646953014-85cb44e25828'};
let latest=[],managerIndex=0,renderQueued=false,tickerSignature='',tickerWindowWidth=0;
const AN_TICKER_SPEED=58; // readable pixels per second

function where(){return location.hash.replace(/^#\/?/,'').split('?')[0].split('/')[0]||'home';}
function bar(){
 let existing=document.getElementById('an-global-ticker');if(existing)return existing;
 const header=document.querySelector('header.top');if(!header)return null;
 const b=document.createElement('div');b.id='an-global-ticker';b.className='an-updates-bar';b.setAttribute('aria-label','Latest A&N Overseas announcements');
 b.innerHTML='<div class="an-updates-label">📣 Latest Updates</div><div class="an-updates-window"><div class="an-updates-track"></div></div>';
 header.insertAdjacentElement('afterend',b);return b;
}
function normalize(input,fallback){
 let arr=Array.isArray(input)?input:[];
 if(!arr.length&&fallback)arr=String(fallback).split(/\s*[•|]\s*/).filter(Boolean).map((text,i)=>({text,color:i%2?'white':'orange'}));
 if(!arr.length)arr=[{text:'Study abroad with A&N Overseas — Explore destinations, universities and student support.',color:'orange'}];
 return arr.filter(v=>v&&String(v.text||'').trim()).slice(0,30).map(v=>({text:String(v.text).slice(0,400).trim(),color:v.color==='white'?'white':'orange'}));
}
function ticker(input,fallback){
 const updated=normalize(input,fallback||window.ANLive?.publicSettings?.ticker);
 const b=bar();if(!b)return;
 const viewport=b.querySelector('.an-updates-window'),track=b.querySelector('.an-updates-track');
 if(!viewport||!track)return;
 const signature=JSON.stringify(updated),width=Math.round(viewport.getBoundingClientRect().width);
 // The page rerenders often. Never restart an unchanged ticker on every route.
 if(track.childElementCount===2&&tickerSignature===signature&&Math.abs(width-tickerWindowWidth)<10)return;
 latest=updated;tickerSignature=signature;tickerWindowWidth=width;
 if(width<1)return;
 track.style.animation='none';
 track.replaceChildren();
 const createItem=item=>{
  const node=document.createElement('span');
  node.className='an-update-item';node.dataset.color=item.color;
  node.textContent=item.text;
  return node;
 };
 const group=document.createElement('span');group.className='an-updates-group';
 group.setAttribute('aria-label','Latest announcements');
 // The base message series may be very short. Repeat *whole* series until
 // the sequence extends beyond the display. This prevents a dead empty zone.
 let repeatCount=0;
 do{
  for(const item of latest)group.appendChild(createItem(item));
  track.appendChild(group);
  repeatCount++;
 }while(group.getBoundingClientRect().width<width+120&&repeatCount<60);
 const clone=group.cloneNode(true);clone.setAttribute('aria-hidden','true');
 track.appendChild(clone);
 const distance=group.getBoundingClientRect().width;
 track.style.setProperty('--an-ticker-distance',distance+'px');
 track.style.setProperty('--an-ticker-duration',Math.max(12,Math.round(distance/AN_TICKER_SPEED))+'s');
 // With exactly identical adjacent groups, -distance and 0 are visually identical.
 track.style.animation='';
}
window.ANUpdateTicker=ticker;
window.addEventListener('resize',()=>{
 const viewport=document.querySelector('.an-updates-window');
 if(!viewport||Math.abs(Math.round(viewport.getBoundingClientRect().width)-tickerWindowWidth)<10)return;
 ticker(latest,window.ANLive?.publicSettings?.ticker);
}, {passive:true});
const off=()=>window.ANLive?.publicSettings||{};
function applyAbout(){
 // The fixed About page owns the only visible Management carousel.
 if(document.getElementById('an-about-fixed'))return;
 const area=document.querySelector('#app>.wrap.content');if(!area)return;
 let members=Array.isArray(window.ANLive?.management)?window.ANLive.management:[];
 const sNow=off();
 const signature=JSON.stringify([members,sNow.malaysiaOffice,sNow.bangladeshOffice,managerIndex]);
 if(area.dataset.anAboutSignature===signature&&area.querySelector('.an-about-shell'))return;
 area.dataset.anAboutSignature=signature;
 if(!area.querySelector('.an-about-shell')){
  area.innerHTML='<div class="an-about-shell"><section class="an-about-copy">'
   +'<span style="color:#ff9f38;font-size:11px;letter-spacing:1px;font-weight:800">ABOUT A&N OVERSEAS</span>'
   +'<h2><span>Education</span> & Consultancy</h2>'
   +'<p>University admission guidance, student visa documentation, accommodation planning and arrival support for international education.</p>'
   +'<p>We work with students preparing to study abroad, helping them understand available options and the documents required at each stage.</p>'
   +'<div class="an-office-grid"><div>🇲🇾 <strong>Malaysia Office</strong><div id="an-about-office-my">Kuala Lumpur</div></div><div>🇧🇩 <strong>Bangladesh Office</strong><div id="an-about-office-bd">Rangpur</div></div></div>'
   +'<p><a class="btn tiny outline" href="#/aboutdetails">More About Us →</a></p></section>'
   +'<section class="an-management-panel"><h2><span>Our</span> Management</h2><div id="an-management-body"></div>'
   +'<div class="an-management-control"><button type="button" data-an-manager="-1" aria-label="Previous management profile">‹</button><span id="an-management-counter">Management</span><button type="button" data-an-manager="1" aria-label="Next management profile">›</button></div></section></div>';
 }
 let s=off();
 const my=area.querySelector('#an-about-office-my'),bd=area.querySelector('#an-about-office-bd');
 if(my)my.textContent=s.malaysiaOffice||'Kuala Lumpur';
 if(bd)bd.textContent=s.bangladeshOffice||'Rangpur';
 const slot=area.querySelector('#an-management-body'),counter=area.querySelector('#an-management-counter');
 if(!slot)return;
 if(!members.length){slot.innerHTML='<div class="an-management-blank">Management profiles will appear here after they are published by the A&N team.</div>';if(counter)counter.textContent='0 profiles';return;}
 managerIndex=(managerIndex+members.length)%members.length;
 const m=members[managerIndex]||{};
 const img=(typeof m.photo==='string'&&/^https:\/\//i.test(m.photo))?'<img loading="lazy" alt="'+E(m.name||'Management')+'" src="'+E(m.photo)+'">':'<div style="width:135px;height:160px;background:#1b140d;border:1px solid #9b5519;border-radius:10px;display:grid;place-items:center;color:#f7a539">A&N</div>';
 const isNusrat=managerIndex===0&&String(m.name||'').trim().toLowerCase()==='nusrat nasrin';
 const portfolio=isNusrat?'https://mehedialimayon-del.github.io/Nusrat-Nasrin/?utm_source=chatgpt.com':m.portfolio;
 const profileButton=(typeof portfolio==='string'&&/^https:\/\//i.test(portfolio))?'<a class="an-management-link" href="'+E(portfolio)+'" target="_blank" rel="noopener noreferrer">View Portfolio ↗</a>':'';
 const adminButton=isNusrat?'<a class="an-management-link an-management-admin" href="#/admin"><span aria-hidden="true">🔐</span> Admin Panel</a>':'';
 const phone=String(m.phone||'').trim();
 const phoneHtml=phone?'<p class="an-management-contact">Phone: '+E(phone)+'</p>':'';
 const email=String(m.email||'').trim();
 const emailHtml=email?'<p class="an-management-contact">Email: '+E(email)+'</p>':'';
 const title=m.designation||m.role||'';
 const position=String(m.position||'').trim();
 const company=m.company||m.department||'';
 const help=m.help||m.bio||m.description||(isNusrat?'Helping students plan their international education journey.':'');
 slot.innerHTML='<div class="an-management-profile">'+img+'<div class="an-management-copy"><h3>'+E(m.name||'Management')+'</h3>'
  +(title?'<p class="an-management-role">'+E(title)+'</p>':'')
  +(position?'<p class="an-management-position"><strong>Position:</strong> '+E(position)+'</p>':'')
  +(company?'<p>'+E(company)+'</p>':'')
  +(m.department&&m.department!==company?'<p>'+E(m.department)+'</p>':'')
  +(help?'<p class="an-management-help">'+E(help)+'</p>':'')
  +phoneHtml+emailHtml
  +'<div class="an-management-links">'+profileButton+adminButton+'</div></div></div>';
 if(counter)counter.textContent=(managerIndex+1)+' / '+members.length;
}
function applyDetails(){
 let root=document.querySelector('#app');if(!root||root.querySelector('#an-about-details'))return;
 const s=off();
 root.innerHTML='<section class="page-head"><div class="wrap"><div class="bread">HOME › ABOUT US</div><h1><span style="color:#ff9c2c">About</span> A&N Overseas</h1><p>Explore our work and educational support in detail.</p></div></section>'
 +'<div class="wrap content page-scroll" id="an-about-details"><div class="live-panel"><h2>Our Education & Consultancy</h2><p>'+E(s.about||'We support students from university discovery through admissions, documentation and arrival planning.')+'</p><h3>How We Work</h3><p>'+E(s.work||'We provide practical, step-by-step education guidance based on each student’s circumstances.')+'</p><p>University admissions and visa approvals are determined by universities and relevant authorities.</p><a class="btn outline" href="#/about">← Back to About</a></div></div>';
}
function services(){
 const cards=document.querySelectorAll('#app>.wrap.content>.grid>.card');if(!cards.length)return;
 cards.forEach((card,i)=>{if(card.querySelector('.an-service-picture'))return;card.classList.add('an-service-card');const figure=document.createElement('div');figure.className='an-service-picture';const img=document.createElement('img');img.loading='lazy';img.alt=card.querySelector('h3')?.textContent||'A&N student support';img.src='https://images.unsplash.com/'+(namedServicePhotos[card.querySelector('h3')?.textContent?.trim()]||servicePhotos[i%servicePhotos.length])+'?auto=format&fit=crop&w=630&q=77';figure.append(img);card.insertBefore(figure,card.firstChild);});
}
function page(){
 bar();
 const p=where();
 if(p==='about')applyAbout();
 if(p==='aboutdetails')applyDetails();
 if(p==='services')services();
}
function schedule(){if(renderQueued)return;renderQueued=true;queueMicrotask(()=>{renderQueued=false;page();});}
function install(){
 bar();ticker(window.ANLive?.latestUpdates,window.ANLive?.publicSettings?.ticker);
 const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true});
 window.addEventListener('hashchange',()=>setTimeout(page,0));
 document.addEventListener('click',e=>{const t=e.target.closest('[data-an-manager]');if(!t||where()!=='about')return;managerIndex+=Number(t.dataset.anManager)||0;applyAbout();});
 page();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ANRenderPublicEnhancements=page;
})();