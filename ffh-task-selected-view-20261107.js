/* Task history identity: presentation only. Keeps existing task order, submission and role access unchanged. */
(()=>{
 'use strict';
 const app=document.getElementById('app'); if(!app)return;
 let queued=false,managers=[],loading=false;
 const norm=value=>String(value??'').trim().toUpperCase();
 const safeUrl=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:'';}catch{return '';}};
 const sessionId=()=>{try{return String(JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||'');}catch{return '';}};
 const staff=id=>{
  if(!id)return null;
  const profile=window.FFH_STAFF_PROFILE?.(id);
  const local=typeof U!=='undefined'&&Array.isArray(U)?U.find(p=>norm(p.id)===norm(id)||norm(p.staff_id)===norm(id)):null;
  const photo=window.FFH_STAFF_PHOTOS?.find?.(id);
  return {...(local||{}),...(photo||{}),...(profile||{})};
 };
 const name=p=>String(p?.full_name||p?.name||p?.manager_name||'').trim();
 const displayId=(p,fallback)=>String(p?.company_staff_id||p?.companyStaffId||p?.login_id||p?.staff_id||p?.id||fallback||'Staff ID pending').trim();
 const imageUrl=p=>safeUrl(p?.photo_url||p?.photo||'');
 function chip(className,p,label,id){
  const el=document.createElement('span');el.className=className;
  const avatar=document.createElement('span');avatar.className='ffTaskIdentityAvatar';
  const url=imageUrl(p);
  if(url){
   const img=document.createElement('img');img.src=url;img.alt=label+' profile photo';img.loading='lazy';
   img.onerror=()=>{img.remove();avatar.textContent=(label[0]||'?').toUpperCase();};
   img.onclick=e=>{e.stopPropagation();window.FFH_OPEN_IMAGE?.(url.includes('/photo-v2-')?url.replace('/photo-v2-','/full-v2-'):url);};
   avatar.append(img);
  }else avatar.textContent=(label[0]||'?').toUpperCase();
  const text=document.createElement('span');text.className='ffTaskIdentityText';
  const b=document.createElement('strong');b.textContent=label;
  const small=document.createElement('small');small.textContent=displayId(p,id);
  text.append(b,small);el.append(avatar,text);return el;
 }
 function render(){
  queued=false;
  const main=app.querySelector('main.wrap.ffTaskPage');if(!main)return;
  const zoneSelect=main.querySelector('#ffDashboardZone');
  const staffSelect=main.querySelector('#ffScopeStaff');
  const zone=zoneSelect?.value||'ALL',chosen=staffSelect?.value||'ALL';
  const specific=chosen&&chosen!=='ALL';
  const sid=specific?(chosen.startsWith('TEAM:')?chosen.slice(5):chosen):'';
  let person=sid?staff(sid):null;
  let text=name(person)||'';
  if(specific&&!text)text=String(staffSelect?.selectedOptions?.[0]?.textContent||sid).replace(/^\s*(?:Staff ID pending|[A-Z]\d{4,})\s*[·-]\s*/i,'').trim();
  if(!specific)text=zone==='ALL'?'ALL PERMITTED STAFF':zone==='PRIMARY'?'KL ZONE':zone+' ZONE';
  const label=String(text||sid||'Selected staff').trim();
  const history=main.querySelector('.ffTaskList > .cardTitle');
  if(history){
   history.querySelector('.ffPendingLabel')?.remove();
   const key=[chosen,zone,label,imageUrl(person),displayId(person,sid)].join('|');
   let old=history.querySelector('.ffTaskViewingIdentity');
   if(old?.dataset.key!==key){
    old?.remove();old=chip('ffTaskViewingIdentity',person,label,sid||'');
    old.dataset.key=key;history.append(old);
   }
  }
  // The custom picker sometimes retains only an avatar; always leave its visible name.
  const trigger=staffSelect?.nextElementSibling;
  if(trigger?.classList.contains('ffSelectTrigger')&&specific){
   const visibleName=name(person)||label;
   let badge=trigger.querySelector('.ffSelectStaffLabel');
   if(!badge){badge=document.createElement('span');badge.className='ffSelectStaffLabel';trigger.append(badge);}
   if(badge.textContent!==visibleName)badge.textContent=visibleName;
   trigger.setAttribute('aria-label','Selected staff: '+visibleName);
  }
  const managerRow=managers.find(p=>norm(p.zone_id)===norm(zone));
  const local=zone==='PRIMARY'?staff('M21954'):null;
  const managerId=String(managerRow?.staff_id||local?.staff_id||local?.id||'');
  const manager=managerId?{...(managerRow||{}),...staff(managerId)}:null;
  const managerName=name(manager)||String(managerRow?.manager_name||'');
  const wrapper=main.querySelector('details.ffTaskScope');
  let managerBadge=wrapper?.querySelector('.ffTaskZoneManagerChip');
  if(zone!=='ALL'&&managerName&&wrapper){
   const mkey=[zone,managerId,managerName,imageUrl(manager)].join('|');
   if(managerBadge?.dataset.key!==mkey){
    managerBadge?.remove();
    managerBadge=chip('ffTaskZoneManagerChip',manager,managerName,managerId);
    managerBadge.dataset.key=mkey;
    managerBadge.setAttribute('aria-label',(zone==='PRIMARY'?'KL ZONE':zone+' ZONE')+' manager: '+managerName);
    (wrapper.querySelector('.ffDirectScope,.ffScopeFilter')||wrapper).append(managerBadge);
   }
  }else managerBadge?.remove();
 }
 function queue(){if(!queued){queued=true;requestAnimationFrame(render);}}
 async function loadManagers(){
  if(loading||typeof ffhZoneManagers!=='function')return;
  loading=true;
  try{const rows=await ffhZoneManagers();if(Array.isArray(rows)){managers=rows;queue();}}
  catch(err){console.warn('Task zone manager identity unavailable:',err?.message||err);}
  finally{loading=false;}
 }
 new MutationObserver(queue).observe(app,{subtree:true,childList:true});
 document.addEventListener('change',event=>{if(event.target?.matches?.('#ffDashboardZone,#ffScopeStaff'))queue();});
 document.addEventListener('ffh-staff-updated',queue);
 document.addEventListener('ffh-staff-photos-updated',queue);
 window.addEventListener('pageshow',()=>{loadManagers();queue();});
 queue();loadManagers();
})();