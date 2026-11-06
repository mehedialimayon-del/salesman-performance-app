/* FieldForce Hub: direct zone + SR/team selectors for all shared scope screens.
   This is presentation-only; existing server-side staff visibility/RLS is retained. */
(function(){
 'use strict';
 const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const zoneKey=p=>String(p?.zone||'UNASSIGNED');
 const isSeller=p=>p?.can_sell===true||p?.role==='SR'||p?.role==='MANAGER+SR';
 const byZoneName=(a,b)=>zoneKey(a).localeCompare(zoneKey(b),'en')||String(a?.name||'').localeCompare(String(b?.name||''),'en');
 const available=()=>U.filter(p=>p?.active!==false&&(!db.companyRoster?.configured||!isSeller(p)||db.companyRoster.teams?.some(t=>t.zone_id===p.zone&&t.active)));
 const allowedSellers=()=>new Set(srIds());
 const managersFor=zone=>available().filter(p=>p?.can_manage&&(!zone||zone==='ALL'||p.zone===zone)).sort(byZoneName);
 const srFor=zone=>{
  const allowed=allowedSellers();
  return available().filter(p=>allowed.has(p.id)&&!p.can_manage&&(!zone||zone==='ALL'||p.zone===zone)).sort(byZoneName);
 };
 const format=p=>String(p.companyStaffId||p.id||'Staff ID pending')+' · '+String(p.name||p.id)+(p.zone?' · '+(p.zone==='PRIMARY'?'KL ZONE':p.zone):'');
 const managerChoice=()=>String(window.FFH_SELECTED_TEAM_MANAGER||'');
 const teamManager=zone=>managersFor(zone).find(p=>p.zone===zone&&p.can_manage);
 const option=p=>'<option value="'+E(p.id)+'" '+(view===p.id?'selected':'')+'>'+E(format(p))+'</option>';
 // Called by dashboard, zero-sales, income, incentive, route, tasks and legacy daily-sales screens.
 window.scopeBar=function(){
  if(!isMgr())return '';
  const zones=[...new Set(available().map(zoneKey).filter(Boolean))].sort((a,b)=>a==='PRIMARY'?-1:b==='PRIMARY'?1:a.localeCompare(b,'en'));
  const zone=zones.includes(ffhSelectedZone)?ffhSelectedZone:'ALL';
  const managers=managersFor(zone),sellers=srFor(zone),team=managerChoice();
  const managerOptions=managers.map(p=>'<option value="TEAM:'+E(p.id)+'" '+(team===p.id?'selected':'')+'>'+E(format(p))+'</option>').join('');
  const srOptions=sellers.map(option).join('');
  const combinedLabel=zone==='ALL'?'COMBINED · ALL ZONES':'COMBINED · '+(zone==='PRIMARY'?'KL ZONE':zone);
  const selectedCombined=view==='ALL'&&!team;
  const zoneOptions=zones.map(z=>'<option value="'+E(z)+'" '+(z===zone?'selected':'')+'>'+E(z==='PRIMARY'?'KL ZONE':z)+'</option>').join('');
  const managerId=teamManager(zone)?.id||'';
  const html='<section class="ffScopeFilter ffDirectScope" aria-label="Zone and staff selection">'
   +'<div class="ffScopeFilterBody ffDirectScopeFields">'
   +'<label class="ffZoneScope">SELECT ZONE<select id="ffDashboardZone" aria-label="Select zone"><option value="ALL" '+(zone==='ALL'?'selected':'')+'>ALL PERMITTED ZONES</option>'+zoneOptions+'</select></label>'
   +'<label>SELECT STAFF / SR<select id="ffScopeStaff" aria-label="Select SR or combined total">'
   +'<option value="ALL" data-manager-id="'+E(managerId)+'" '+(selectedCombined?'selected':'')+'>'+E(combinedLabel)+'</option>'
   +(managerOptions?'<optgroup label="MANAGERS · TEAM TOTAL">'+managerOptions+'</optgroup>':'')
   +(srOptions?'<optgroup label="SALES REPRESENTATIVES · BY ZONE">'+srOptions+'</optgroup>':'')
   +'</select></label></div></section>';
  return html;
 };
 window.bindScope=function(redraw){
  const zone=document.querySelector('#ffDashboardZone');
  const staff=document.querySelector('#ffScopeStaff');
  if(zone)zone.onchange=function(){
   ffhSelectedZone=zone.value;
   window.FFH_SELECTED_TEAM_MANAGER='';
   view='ALL';
   redraw();
  };
  if(staff)staff.onchange=function(){
   const choice=staff.value;
   if(choice.startsWith('TEAM:')){
    const manager=sr(choice.slice(5));
    if(!manager||!manager.can_manage)return;
    window.FFH_SELECTED_TEAM_MANAGER=manager.id;
    ffhSelectedZone=manager.zone||ffhSelectedZone;
    view='ALL'; // existing dashboard calculations now aggregate the manager's zone.
   }else{
    window.FFH_SELECTED_TEAM_MANAGER='';
    view=choice;
   }
   redraw();
  };
 };
 // The task page still has an older second disclosure around scopeBar().
 // Open it in-place and hide its redundant summary, retaining the same controls.
 const watchTask=()=>{
  const el=document.querySelector('.ffTaskScope');
  if(el&&!el.open)el.open=true;
 };
 const observer=new MutationObserver(watchTask);
 const root=document.getElementById('app');
 if(root)observer.observe(root,{childList:true,subtree:true});
})();
