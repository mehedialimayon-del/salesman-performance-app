/* FieldForce Hub · selected identity follows actual Zone / SR / Manager scope.
   Read-only view enhancement. Does not alter scope calculations, tasks or permissions. */
(()=>{'use strict';
const root=document.getElementById('app');if(!root)return;
let queued=false,managerRows=[],fetching=false;
const ownId=()=>{try{return String(JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||'');}catch{return ''}};
const profile=id=>window.FFH_STAFF_PROFILE?.(id)||(Array.isArray(window.U)?window.U.find(p=>String(p.id)===String(id)):null);
const photo=id=>window.FFH_STAFF_PHOTOS?.find?.(id);
const safe=url=>{try{const x=new URL(String(url||''));return x.protocol==='https:'?x.href:''}catch{return ''}};
const norm=x=>String(x||'').trim().toUpperCase();
const name=p=>String(p?.name||p?.full_name||p?.manager_name||'').trim();
const managers=()=>managerRows;
function selectedIdentity(){
 const hero=root.querySelector('.ffDashboardFrame .dashHero');
 if(!hero)return;
 const zone=root.querySelector('#ffDashboardZone')?.value||'ALL';
 const staff=root.querySelector('#ffScopeStaff')?.value||'ALL';
 let id='',selected=null;
 if(staff!=='ALL'){id=staff.startsWith('TEAM:')?staff.slice(5):staff;selected=profile(id);}
 else if(zone==='ALL'){id='M21954';selected=profile(id)||photo(id);}
 else {
  const row=managers().find(p=>norm(p.zone_id)===norm(zone));
  const local=typeof U!=='undefined'?U.find(p=>p.can_manage&&norm(p.zone)===norm(zone)):null;
  id=String(row?.staff_id||local?.id||'');
  selected=profile(id)||row||local;
 }
 if(!selected&&id)selected=photo(id);
 const label=name(selected);
 const pic=safe(photo(id)?.photo_url||selected?.photo_url||selected?.photo||'');
 const old=hero.querySelector('.ffDashSelectedIdentity');
 if(!label){old?.remove();return;}
 const key=[zone,staff,id,label,pic].join('|');
 if(old?.dataset.key===key)return;
 old?.remove();
 const block=document.createElement('div');block.className='ffDashSelectedIdentity';
 block.dataset.key=key;block.dataset.staffId=id;
 block.setAttribute('aria-label','Selected zone or staff: '+label);
 const avatar=document.createElement('span');avatar.className='ffDashSelectedAvatar';
 if(pic){
  const img=document.createElement('img');img.src=pic;img.alt=label+' profile photo';img.loading='lazy';
  img.onerror=()=>{img.remove();avatar.textContent=label.charAt(0).toUpperCase()};
  img.onclick=e=>{e.stopPropagation();window.FFH_OPEN_IMAGE?.(pic.includes('/photo-v2-')?pic.replace('/photo-v2-','/full-v2-'):pic)};
  avatar.append(img);
 }else avatar.textContent=label.charAt(0).toUpperCase();
 const text=document.createElement('span');text.className='ffDashSelectedName';text.textContent=label.toUpperCase();
 block.append(avatar,text);
 const percent=hero.querySelector('.dashAch');
 if(percent)hero.insertBefore(block,percent);else hero.append(block);
}
function render(){queued=false;selectedIdentity();}
function queue(){if(queued)return;queued=true;requestAnimationFrame(render);}
async function loadManagers(){
 if(fetching||typeof ffhZoneManagers!=='function')return;
 fetching=true;
 try{const list=await ffhZoneManagers();if(Array.isArray(list)){managerRows=list;queue();}}
 catch(e){console.warn('Zone identities currently unavailable:',e?.message||e)}
 finally{fetching=false}
}
const observer=new MutationObserver(queue);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['value']});
document.addEventListener('ffh-staff-updated',queue);document.addEventListener('ffh-staff-photos-updated',queue);
window.addEventListener('pageshow',()=>{loadManagers();queue()});
document.addEventListener('change',e=>{if(e.target?.matches?.('#ffDashboardZone,#ffScopeStaff'))queue()});
setTimeout(()=>{loadManagers();queue()},0);
})();