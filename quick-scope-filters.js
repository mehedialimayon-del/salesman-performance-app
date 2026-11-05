/* FieldForce Hub: one-step zone/SR filters. UI only—never change zone IDs or permissions. */
(()=>{
 'use strict';
 const ROOT=document.getElementById('app');if(!ROOT)return;
 const style=document.createElement('style');
 style.textContent=`
 #app .ffQuickScope{display:block!important;margin:8px 0!important;padding:3px!important;border:1px solid #9b682e66;border-radius:12px;background:#1b1714}
 #app .ffQuickScope>summary[hidden]{display:none!important}
 #app .ffQuickScope .ffScopeFilterBody{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:8px!important}
 #app .ffQuickScope .ffScopeFilterBody>label{display:block!important;min-width:0;font-size:11px!important;font-weight:800;color:#ffac62!important;letter-spacing:.03em}
 #app .ffQuickScope .ffScopeFilterBody .ffSelectTrigger{width:100%!important;min-width:0;margin-top:7px!important;min-height:43px!important;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
 #app .ffQuickScope .ffScopeFilterBody select:not([hidden]){width:100%;max-width:100%;min-height:43px}
 @media(max-width:365px){#app .ffQuickScope .ffScopeFilterBody{gap:5px;padding:6px!important}#app .ffQuickScope .ffScopeFilterBody>label{font-size:10px!important}}
 `;
 document.head.append(style);
 let queued=false;
 const zoneName=value=>String(value||'').trim().toUpperCase()==='PRIMARY'?'KL ZONE':String(value||'');
 function caption(label,value){
   if(!label)return;
   const node=[...label.childNodes].find(x=>x.nodeType===3&&x.textContent.trim());
   if(node&&node.textContent.trim()!==value)node.textContent=value;
   else if(!node){const span=label.querySelector('.ffQuickScopeCaption');if(!span){const cap=document.createElement('span');cap.className='ffQuickScopeCaption';cap.textContent=value;label.prepend(cap);}else span.textContent=value;}
 }
 function enhance(){
   queued=false;
   // No nested accordion: expose the exact same existing zone and SR controls.
   for(const outer of ROOT.querySelectorAll('.ffTaskScope')){
      const inner=outer.querySelector(':scope > .ffScopeFilter');
      if(inner){outer.replaceWith(inner);}
   }
   for(const detail of ROOT.querySelectorAll('.ffScopeFilter')){
      if(!detail.open)detail.open=true;
      detail.classList.add('ffQuickScope');
      const summary=detail.querySelector(':scope > summary');
      if(summary&&!summary.hidden)summary.hidden=true;
      const zone=detail.querySelector('#ffDashboardZone');
      const staff=detail.querySelector('#ffScopeStaff');
      if(zone){
        caption(zone.closest('label'),'SELECT ZONE');
        for(const opt of zone.options){
          if(opt.value==='PRIMARY'&&opt.textContent!=='KL ZONE')opt.textContent='KL ZONE';
        }
        const trigger=zone.nextElementSibling;
        if(trigger?.classList.contains('ffSelectTrigger')&&zone.value==='PRIMARY'&&trigger.textContent.trim()==='PRIMARY')trigger.textContent='KL ZONE';
      }
      if(staff)caption(staff.closest('label'),'SELECT SR');
   }
   // Keep original immutable zone key PRIMARY in forms and database. Label only.
   for(const zoneOption of ROOT.querySelectorAll('option[value="PRIMARY"]')){
      if(zoneOption.closest('#ffDashboardZone')&&zoneOption.textContent!=='KL ZONE')zoneOption.textContent='KL ZONE';
   }
   for(const el of document.querySelectorAll('.ffZoneManagerRow[data-staff-id="PRIMARY"] .ffPickerText strong')){
     if(el.textContent.trim()==='PRIMARY')el.textContent='KL ZONE';
   }
 }
 function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
 new MutationObserver(queue).observe(ROOT,{childList:true,subtree:true});
 // Zone picker is a body-level dialog, not a child of #app.
 new MutationObserver(queue).observe(document.body,{childList:true,subtree:false});
 queue();
})();
