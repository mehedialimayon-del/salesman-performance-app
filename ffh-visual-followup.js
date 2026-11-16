/* FieldForce Hub · presentation-only follow-up.
   Existing Tasks, Done/approval, permissions, cloud RPC and notifications are untouched. */
(()=>{
 'use strict';
 const app=document.getElementById('app');
 if(!app)return;
 let scheduled=false;
 const safeUrl=value=>{
  try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:'';}
  catch{return '';}
 };
 const person=id=>window.FFH_STAFF_PROFILE?.(id);
 const photo=id=>window.FFH_STAFF_PHOTOS?.find?.(id);
 const staffName=p=>String(p?.full_name||p?.name||'').trim();
 function managerIdentity(hero){
  const scope=app.querySelector('#ffScopeStaff');
  const zone=app.querySelector('#ffDashboardZone')?.value||'ALL';
  const choice=scope?.value||'ALL';
  let id=String(window.FFH_SELECTED_TEAM_MANAGER||'');
  if(!id&&choice.startsWith('TEAM:'))id=choice.slice(5);
  if(!id&&choice!=='ALL')id=String(person(choice)?.manager_id||'');
  if(!id)id=String(scope?.querySelector('option[value="ALL"]')?.dataset.managerId||'');
  if(!id&&zone!=='ALL'){
   const opt=[...(scope?.options||[])].find(o=>o.value.startsWith('TEAM:')&&(person(o.value.slice(5))?.zone||person(o.value.slice(5))?.zone_id)===zone);
   if(opt)id=opt.value.slice(5);
  }
  if(!id){
   try{const account=JSON.parse(localStorage.getItem('ffh_session')||'null');const own=person(account?.id);if(own?.can_manage)id=String(account.id);}catch(_){}
  }
  const existing=hero.querySelector('.ffDashManagerCompact');
  const p=person(id),pic=photo(id);
  const name=staffName(p)||staffName(pic);
  if(!id||!name){existing?.remove();return;}
  const url=safeUrl(pic?.photo_url||p?.photo_url||p?.photo||'');
  if(existing?.dataset.staffId===id&&existing.dataset.photo===url&&existing.dataset.name===name)return;
  existing?.remove();
  const block=document.createElement('div');
  block.className='ffDashManagerCompact';block.dataset.staffId=id;block.dataset.photo=url;block.dataset.name=name;
  block.setAttribute('aria-label','Selected manager: '+name);
  const circle=document.createElement('span');circle.className='ffDashManagerAvatar';
  if(url){
   const image=document.createElement('img');
   image.src=url;image.alt=name+' profile photo';image.loading='lazy';image.className='zoomable';
   image.dataset.fullSrc=url.includes('/photo-v2-')?url.replace('/photo-v2-','/full-v2-'):url;
   image.onerror=()=>{image.remove();circle.textContent=name.slice(0,1).toUpperCase();};
   image.onclick=e=>{e.stopPropagation();window.FFH_OPEN_IMAGE?.(image.dataset.fullSrc||url);};
   circle.append(image);
  }else circle.textContent=name.slice(0,1).toUpperCase();
  const label=document.createElement('span');label.className='ffDashManagerName';label.textContent=name;
  block.append(circle,label);
  const percentage=hero.querySelector('.dashAch');
  if(percentage)hero.insertBefore(block,percentage);else hero.append(block);
 }
 function normalizeScope(main){
  /* The task screen contains a legacy disclosure around the shared filter.
     Only open that wrapper; do not touch the Assign Task or Notes disclosures. */
  for(const details of main.querySelectorAll('.ffTaskScope,details.ffScopeFilter')){
   if(!details.open)details.open=true;
  }
  for(const field of [
   {selector:'#ffDashboardZone',title:'SELECT ZONE'},
   {selector:'#ffScopeStaff',title:'SELECT SR / COMBINED'}
  ]){
   const select=main.querySelector(field.selector);
   if(select&&!select.dataset.ffPicker&&window.FFH_STYLE_SELECT){
    window.FFH_STYLE_SELECT(select,{title:field.title});
   }
  }
  const hero=main.querySelector('.dashHero');
  if(hero){
   managerIdentity(hero);
   if(!main.querySelector('.ffDashboardActions')){
    const actions=document.createElement('div');
    actions.className='ffDashboardActions ffRefExports';
    for(const [name,module] of [['Daily Sales','sales'],['Zero Sales','zero'],['Reports','reports']]){
     const button=document.createElement('button');
     button.type='button';button.className='ffRefButton';
     button.textContent=name;button.dataset.page=module;
     button.onclick=()=>window.FFH_OPEN_DASHBOARD_SHORTCUT?.(module);
     actions.append(button);
    }
    hero.after(actions);
   }
  }
 }
 const scopeControls=[
  ['#ffRouteStaff','#ffRouteZone','.ffRefFields'],
  ['#ffOutletStaff','#ffOutletZone','.ffOutletCompactFilters'],
  ['#ffTrackStaff','#ffTrackZone','.ffRefTrackingFields'],
  ['#ffRewardStaff','#ffRewardZone','.ffIncFilters'],
  ['#ffReferenceIncomeStaff',null,'.ffRefFields'],
  ['[data-report-filter="sr"]','[data-report-filter="zone"]','.ffReportDirectScope']
 ];
 function scopedIdentity(main){
  const control=scopeControls.find(([selector])=>main.querySelector(selector));
  if(!control)return;
  const [selector,zoneSelector,panelSelector]=control;
  const field=main.querySelector(selector), panel=field.closest(panelSelector);
  if(!panel)return;
  let fallbackId='';
  try{fallbackId=JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||'';}catch(_){}
  const reportManager=panel.querySelector('[data-report-filter="manager"]')?.value;
  const id=String(field.value||reportManager||fallbackId).replace(/^(?:TEAM|STAFF):/,'');
  const profile=person(id), portrait=photo(id);
  const name=staffName(profile)||staffName(portrait);
  if(!name)return;
  const zone=zoneSelector?main.querySelector(zoneSelector)?.selectedOptions?.[0]?.textContent?.trim():'';
  const ownZone=profile?.zone_id||profile?.zone||'';
  const subtitle=[profile?.designation||profile?.role,ownZone==='PRIMARY'?'KL Zone':ownZone,zone].filter((value,index,all)=>value&&all.indexOf(value)===index).join(' · ');
  const url=safeUrl(portrait?.photo_url||profile?.photo_url||profile?.photo);
  const existing=panel.querySelector('.ffScopeIdentity');
  if(existing?.dataset.profile===JSON.stringify([id,name,subtitle,url]))return;
  const line=document.createElement('div');
  line.className='ffScopeIdentity';
  line.dataset.profile=JSON.stringify([id,name,subtitle,url]);
  const avatar=document.createElement('span');avatar.className='ffScopeIdentityPhoto';avatar.textContent=name[0];
  if(url){
   const image=new Image();
   image.src=url;image.alt=name+' profile photo';
   image.addEventListener('error',()=>image.remove(),{once:true});
   avatar.append(image);
  }
  const identity=document.createElement('div');
  const title=document.createElement('strong');title.textContent=name;
  const detail=document.createElement('small');detail.textContent=subtitle;
  identity.append(title,detail);
  line.append(avatar,identity);
  if(existing)existing.replaceWith(line);else panel.prepend(line);
 }
 function enhance(){
  scheduled=false;
  const main=app.querySelector('main.wrap');
  if(main){normalizeScope(main);scopedIdentity(main);}
 }
 function queue(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(enhance);
 }
 new MutationObserver(queue).observe(app,{childList:true,subtree:true});
 app.addEventListener('change',queue,true);
 document.addEventListener('ffh-staff-updated',queue);
 window.addEventListener('pageshow',queue);
 window.addEventListener('resize',queue);
 queue();
})();