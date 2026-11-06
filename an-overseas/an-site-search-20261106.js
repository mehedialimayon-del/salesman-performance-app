/* A&N Overseas: public site-wide search, no credentials or admin data indexed. */
(function(){
 'use strict';
 const pages=[
  ['Home','Main website and student support','#/home','Page'],
  ['About Us','Our consultancy, mission and management','#/about','Page'],
  ['Our Vision','Company story and founder vision','#/aboutdetails','Page'],
  ['Our Services','Admission, visa, accommodation, travel and support','#/services','Page'],
  ['Study Updates & Insights','Student resources, tips, learning posts and research','#/success','Study Hub'],
  ['Student Success Stories','Approved student success photos and videos','#/success','Study Hub'],
  ['Countries','Study destinations and country listings','#/countries','Page'],
  ['Universities','Global university directory and admissions','#/universities','Page'],
  ['Scholarships','Funding, grants and university scholarships','#/scholarships','Page'],
  ['Apply Now','Begin your student application','#/apply','Page'],
  ['Contact','Kuala Lumpur and Rangpur support offices','#/contact','Page'],
  ['Student Login','Student account access','#/login','Page']
 ];
 const norm=x=>String(x??'').toLocaleLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
 const slug=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const safe=x=>String(x??'');
 let dialog,input,list,status,pending=null,results=[];
 function index(){
  const entries=pages.map(p=>({title:p[0],detail:p[1],href:p[2],kind:p[3]}));
  if(typeof serviceList!=='undefined'&&Array.isArray(serviceList))for(const s of serviceList){
   if(!s||!s[1])continue;
   entries.push({title:safe(s[1]),detail:safe(s[2]),href:'#/service/'+slug(s[1]),kind:'Service'});
  }
  if(typeof countries!=='undefined'&&Array.isArray(countries))for(const c of countries){
   if(!Array.isArray(c)||!c[0])continue;
   entries.push({title:safe(c[0]),detail:'Universities and programmes in '+safe(c[0]),href:'#/universities?country='+encodeURIComponent(c[0]),kind:'Country'});
  }
  if(typeof U!=='undefined'&&Array.isArray(U)){
   const seen=new Set();
   for(const u of U){
    if(!u||!u.id||seen.has(u.id))continue;
    seen.add(u.id);
    entries.push({title:safe(u.name||u.short),detail:[u.short,u.country,u.city,Array.isArray(u.programs)?u.programs.join(', '):''].filter(Boolean).join(' · '),href:'#/university/'+encodeURIComponent(u.id),kind:'University'});
   }
  }
  const scholarships=window.ANScholarships?.items;
  if(Array.isArray(scholarships))for(const s of scholarships){
   if(!s||!s.id)continue;
   entries.push({title:safe(s.name||s.title||s.id),detail:[s.country,s.level,s.description].filter(Boolean).join(' · '),href:'#/scholarship/'+encodeURIComponent(s.id),kind:'Scholarship'});
  }
  const published=window.ANPublicSearchData;
  if(published&&typeof published==='object'){
   for(const [key,kind] of [['insights','Study Post'],['stories','Success Story']]){
    const items=Array.isArray(published[key])?published[key]:[];
    for(const s of items){
     if(!s||s.approved!==true||!s.title)continue;
     entries.push({title:safe(s.title),detail:safe(s.description||s.category),href:'#/success',kind,postTitle:safe(s.title),postType:key});
    }
   }
  }
  return entries;
 }
 function search(query){
  const q=norm(query),terms=q.split(' ').filter(Boolean);
  if(!terms.length)return index().filter(x=>x.kind==='Page'||x.kind==='Study Hub').slice(0,10);
  const found=[];
  for(const v of index()){
   const title=norm(v.title),detail=norm(v.detail),combined=title+' '+detail;
   if(!terms.every(t=>combined.includes(t)))continue;
   const score=(title===q?1000:0)+(title.startsWith(q)?350:0)+(title.includes(q)?120:0)
     +(v.kind==='Page'?18:0)+(v.kind==='Service'?12:0)+(v.kind==='University'?5:0);
   found.push({...v,score});
  }
  found.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
  return found.slice(0,24);
 }
 function make(tag,className,content){
  const e=document.createElement(tag);if(className)e.className=className;if(content!=null)e.textContent=content;return e;
 }
 function render(){
  if(!list)return;
  results=search(input.value);
  list.replaceChildren(status);
  const q=input.value.trim();
  status.textContent=q?(results.length?'Search results — choose an item to open it':'No matching published content found. Try a different word.'):'Quick access · Search universities, scholarships, services and student posts';
  for(let i=0;i<results.length;i++){
   const r=results[i],a=make('a','an-site-search-result');
   a.href=r.href;a.dataset.index=String(i);
   a.append(make('strong','',r.title),make('small','',r.kind+' · '+r.detail.slice(0,145)));
   list.append(a);
  }
 }
 function scrollToPublished(){
  if(!pending||location.hash.replace(/^#\/?/,'').split('?')[0]!=='success')return;
  const panel=document.getElementById(pending.postType==='stories'?'an-success-gallery':'an-insights-gallery');
  if(!panel)return;
  const selector=pending.postType==='stories'?'.an-youtube-card':'.an-community-card';
  const card=[...panel.querySelectorAll(selector)].find(el=>norm(el.querySelector('h3')?.textContent)===norm(pending.postTitle));
  if(!card)return;
  const offset=card.getBoundingClientRect().top-panel.getBoundingClientRect().top;
  panel.scrollTop+=offset-14;
  card.classList.add('an-search-highlight');
  try{sessionStorage.removeItem('an-public-search-target');}catch(e){}
  pending=null;
 }
 function openResult(r){
  if(!r)return;
  if(dialog?.open)dialog.close();
  if(r.postTitle){
   pending={postTitle:r.postTitle,postType:r.postType};
   try{sessionStorage.setItem('an-public-search-target',JSON.stringify(pending));}catch(e){}
  }else pending=null;
  if(r.href==='#/success'&&new URLSearchParams(location.search).get('hub_refresh')!=='20261103-fresh-1'){
   const u=new URL(location.href);u.searchParams.set('hub_refresh','20261103-fresh-1');u.hash='/success';
   location.assign(u.href);return;
  }
  if(location.hash===r.href)scrollToPublished();else location.hash=r.href;
  if(r.postTitle)setTimeout(scrollToPublished,150);
 }
 function init(){
  const header=document.querySelector('.top .wrap'),nav=document.getElementById('links');
  if(!header||!nav||document.querySelector('.an-global-search-trigger'))return;
  const button=make('button','an-global-search-trigger');
  button.type='button';button.setAttribute('aria-label','Search the entire A&N Overseas website');
  button.title='Search website (Ctrl+K)';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" stroke-width="2.1" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="7.1"></circle><path d="m16 16 5 5"></path></svg>';
  nav.insertAdjacentElement('afterend',button);
  const mobileButton=make('button','an-mobile-global-search','⌕ Search the website');
  mobileButton.type='button';mobileButton.setAttribute('aria-label','Search the entire A&N Overseas website');
  nav.prepend(mobileButton);
  dialog=make('dialog','an-site-search-dialog');
  dialog.setAttribute('aria-label','Search A&N Overseas');
  const content=make('div','an-site-search-content'),heading=make('div','an-site-search-heading'),headingText=make('div');
  headingText.append(make('b','','Search A&N Overseas'),make('small','','Universities · Scholarships · Services · Study Hub'));
  const close=make('button','an-site-search-close','✕');close.type='button';close.setAttribute('aria-label','Close search');heading.append(headingText,close);
  const field=make('div','an-site-search-field');
  input=make('input');input.type='search';input.setAttribute('aria-label','Search website');
  input.autocomplete='off';input.placeholder='Search a university, service, scholarship or story…';
  field.append(input);
  list=make('div','an-site-search-results');
  status=make('div','an-site-search-status');list.append(status);
  content.append(heading,field,list);dialog.append(content);document.body.append(dialog);
  const open=()=>{if(!dialog.open)dialog.showModal();input.focus();input.select();render();};
  button.addEventListener('click',open);
  mobileButton.addEventListener('click',open);
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>button.focus({preventScroll:true}));
  input.addEventListener('input',render);
  input.addEventListener('keydown',e=>{
   if(e.key==='Enter'){e.preventDefault();openResult(results[0]);}
  });
  list.addEventListener('click',e=>{
   const target=e.target.closest('a[data-index]');if(!target)return;
   e.preventDefault();openResult(results[Number(target.dataset.index)]);
  });
  document.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}
  });
  window.addEventListener('an-public-search-updated',()=>{if(dialog.open)render();scrollToPublished();});
  window.addEventListener('hashchange',()=>setTimeout(scrollToPublished,80));
  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>{if(pending)scrollToPublished();}).observe(app,{childList:true,subtree:true});
  try{
   const saved=JSON.parse(sessionStorage.getItem('an-public-search-target')||'null');
   if(saved&&saved.postTitle&&['stories','insights'].includes(saved.postType))pending=saved;
  }catch(e){}
  scrollToPublished();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
