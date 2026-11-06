/* A&N Overseas - verified PROGRAMME-level MOI evidence and partner university cards.
   Accepting MOI for i-MESC does NOT imply all degrees at that university accept MOI. */
(function(){
'use strict';
const source='https://i-mesc.eu/application/student';
const hostSource='https://i-mesc.eu/the-master/consortium-and-universities';
const hosts=[
 {name:'Warsaw University of Technology',aliases:['Warsaw University of Technology','Politechnika Warszawska'],country:'Poland',city:'Warsaw',site:'https://www.pw.edu.pl/engpw'},
 {name:'Université Toulouse III Paul Sabatier',aliases:['Université Toulouse III Paul Sabatier','University of Toulouse','Université de Toulouse'],country:'France',city:'Toulouse',site:'https://www.univ-tlse3.fr/'},
 {name:'Université de Picardie Jules Verne',aliases:['Université de Picardie Jules Verne','University of Picardie Jules Verne'],country:'France',city:'Amiens',site:'https://www.u-picardie.fr/'},
 {name:'University of Ljubljana',aliases:['University of Ljubljana','Univerza v Ljubljani'],country:'Slovenia',city:'Ljubljana',site:'https://www.uni-lj.si/en/'},
 {name:'University of the Basque Country',aliases:['University of the Basque Country','Universidad del País Vasco'],country:'Spain',city:'Bilbao',site:'https://www.ehu.eus/en/en-home'},
 {name:'Drexel University',aliases:['Drexel University'],country:'United States',city:'Philadelphia',site:'https://drexel.edu/'},
 {name:'Deakin University',aliases:['Deakin University'],country:'Australia',city:'Melbourne',site:'https://www.deakin.edu.au/'}
];
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
function catalog(){try{return typeof U!=='undefined'&&Array.isArray(U)?U:[];}catch(e){return []}}
function findHost(h){return catalog().find(u=>h.aliases.some(x=>normalize(u.name)===normalize(x))||
 (String(u.site||'').replace(/^https?:\/\/(?:www\.)?/,'').split('/')[0]===h.site.replace(/^https?:\/\/(?:www\.)?/,'').split('/')[0]));}
let added=0;
function addVerifiedHosts(){
 const list=catalog();if(!list.length)return;
 for(const host of hosts){
  if(findHost(host))continue;
  const id='verified-imesc-'+normalize(host.name).slice(0,32);
  if(list.some(u=>u.id===id))continue;
  list.push({id,name:host.name,short:host.name,country:host.country,city:host.city,
   kind:'University',institutionType:'University',site:host.site,
   programs:['i-MESC Erasmus Mundus Joint Master (programme-specific, consortium verified)'],
   registrySource:hostSource,scholarshipHost:true});
  added++;
 }
}
function matchPos(name){const norm=normalize(name);return hosts.find(h=>h.aliases.some(alias=>normalize(alias)===norm));}
function isHohenheim(name){return normalize(name)==='universityofhohenheim';}
function labelFor(name){
 const host=matchPos(name);
 if(host)return {cls:'yes',title:'MOI ACCEPTED · i-MESC only',desc:'i-MESC permits an English-medium prior-degree certificate under its programme rules, not a blanket university waiver.',source};
 if(isHohenheim(name))return {cls:'no',title:'MOI NOT ACCEPTED · DAAD AgEcon',desc:'Hohenheim AgEcon EPOS requires official English proof; an English-medium university letter alone is insufficient.',source:'https://www.uni-hohenheim.de/agecon-stipendien'};
 return null;
}
function badge(x){
 const a=document.createElement('a');a.href=x.source;a.target='_blank';a.rel='noopener noreferrer';
 a.className='an-university-moi-badge '+x.cls;a.textContent=x.title;a.title=x.desc+' View the primary source.';
 return a;
}
function decorate(){
 const route=(location.hash||'').split(/[/?]/)[1]||'home';
 if(route==='universities'||route==='favorites'){
  for(const el of document.querySelectorAll('#results .uni-card,#an-saved-grid .uni-card')){
   if(el.querySelector('.an-university-moi-badge'))continue;
   const name=el.querySelector('.university-fullname')?.textContent?.trim();
   const result=labelFor(name);if(!result)continue;
   const inside=el.querySelector('.inside');
   if(inside)inside.insertBefore(badge(result),inside.querySelector('.an-guide-links')||null);
  }
 }
 if(route==='university'){
  const title=document.querySelector('#app .page-head h1')?.textContent?.trim();
  const result=labelFor(title);
  const profile=document.querySelector('#app .university-profile')||document.querySelector('#app .profile-layout')||document.querySelector('#app .page-head');
  if(result&&profile&&!document.querySelector('#app .an-university-moi-explainer')){
   const note=document.createElement('section');note.className='an-university-moi-explainer';
   note.append(badge(result));
   const p=document.createElement('p');p.textContent=result.desc+' Other courses at this institution may have different rules.';note.append(p);
   profile.insertAdjacentElement('afterend',note);
  }
 }
 if(route==='scholarship'&&(location.hash||'').includes('erasmus-mundus')){
  const guide=document.getElementById('an-scholarship-document-guide');
  if(guide&&!document.querySelector('#app #an-imesc-verified-hosts')){
   const content=hosts.map(host=>findHost(host)).filter(Boolean);
   if(!content.length)return;
   const section=document.createElement('section');section.className='an-specific-guide';section.id='an-imesc-verified-hosts';
   const h=document.createElement('h2');h.textContent='Verified i-MESC consortium university portfolios';section.append(h);
   const p=document.createElement('p');p.textContent='These are the official partner universities of the i-MESC Erasmus Mundus programme (not every Erasmus Mundus programme). MOI waiver rules are programme-specific.';section.append(p);
   const link=document.createElement('a');link.href=hostSource;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Confirm official i-MESC partners ↗';section.append(link);
   const cards=document.createElement('div');cards.className='an-moi-partners-grid';
   for(const u of content){const holder=document.createElement('div');holder.innerHTML=typeof card==='function'?card(u):'<a href="#/university/'+encodeURIComponent(u.id)+'">'+u.name+'</a>';while(holder.firstChild)cards.appendChild(holder.firstChild)}
   section.append(cards);guide.parentElement.insertBefore(section,guide);
  }
 }
}
function init(){
 addVerifiedHosts();
 // Augmentation is safe: only a named official programme is labelled.
 const app=document.getElementById('app');
 if(app){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}).observe(app,{subtree:true,childList:true});}
 window.addEventListener('hashchange',()=>requestAnimationFrame(decorate));
 decorate();
 if((location.hash||'').startsWith('#/universities')&&added&&typeof renderResults==='function')renderResults();
}
window.ANMOIRegistry={hosts,source,hostSource,matchPos,addVerifiedHosts};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();