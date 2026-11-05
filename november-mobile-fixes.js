/* Focused, idempotent enhancements for the already-approved FieldForce UI. */
(()=>{
 'use strict';
 const app=document.getElementById('app');if(!app)return;
 const id=p=>p?.staff_id||p?.id||'';
 let scheduled=false,aiAnimating=false;
 const clean=v=>String(v||'').trim();
 function dashboardIdentity(){
   const hero=app.querySelector('.dashHero');
   const heading=app.querySelector('main.wrap .head h1');
   if(!hero||!heading)return;
   const selected=app.querySelector('#ffScopeStaff')?.value||'ALL';
   const zone=app.querySelector('#ffDashboardZone')?.value||'ALL';
   const p=selected!=='ALL'?window.FFH_STAFF_PHOTOS?.find?.(selected):zone!=='ALL'?window.FFH_ZONE_MANAGER?.(zone):null;
   const selectedText=app.querySelector('#ffScopeStaff option:checked')?.textContent||'';
   let label=p?.full_name||p?.name||'';
   if(!label&&selected!=='ALL')label=selectedText.split(' · ')[0]||selected;
   if(!label)label=zone!=='ALL'?(zone==='PRIMARY'?'KL ZONE':zone)+' · COMBINED':'COMBINED TEAM';
   const existing=heading.querySelector(':scope > .ffDashboardCurrentIdentity');
   if(existing?.textContent===label)return;
   const chip=existing||document.createElement('span');chip.className='ffDashboardCurrentIdentity';
   chip.textContent=label;chip.title='Selected dashboard: '+label;
   if(!existing)heading.append(chip);
 }
 function compactContact(card){
   if(card.classList.contains('ffCompactContactCard'))return;
   const identity=card.querySelector('.ffContactIdentity'),namePanel=card.querySelector('.ffContactNamePanel'),tags=card.querySelector('.ffContactTags');
   if(!identity||!namePanel||!tags)return;
   card.classList.add('ffCompactContactCard');
   const spans=[...tags.querySelectorAll(':scope > span')];
   const text=s=>clean(s?.querySelector('small')?.textContent).toLowerCase();
   const sales=spans.find(s=>text(s)==='salesmen');
   const routes=spans.find(s=>text(s)==='routes');
   const zone=spans.find(s=>text(s)==='zone');
   if(sales||routes){
     const pair=document.createElement('div');pair.className='ffContactMiniStats';
     for(const el of [sales,routes].filter(Boolean))pair.append(el);
     namePanel.append(pair);
   }
   if(zone){
     const full=document.createElement('div');full.className='ffContactZoneFull';
     full.append(...zone.childNodes);
     const b=full.querySelector('b');
     if(b&&['KL','PRIMARY','KUALA LUMPUR'].includes(b.textContent.trim().toUpperCase()))b.textContent='KUALA LUMPUR';
     card.insertBefore(full,card.querySelector('.ffContactLinks')||card.querySelector('.ffContactAbout')||card.querySelector('.ffContactTools')||null);
   }
   const longer=[...tags.querySelectorAll(':scope > span')];
   if(longer.length){
      const details=document.createElement('details');details.className='ffContactExtraDetails';
      const label=document.createElement('summary');label.textContent='Team / route details';details.append(label,...longer);
      card.insertBefore(details,card.querySelector('.ffContactLinks')||card.querySelector('.ffContactTools')||null);
   }
   if(!tags.children.length)tags.remove();
 }
 function keepContactCompact(){
   for(const card of app.querySelectorAll('.ffContactCard'))compactContact(card);
 }
 function hintSrBaseline(){
   const form=app.querySelector('#ffAccountForm');
   if(!form)return;
   const position=form.elements.namedItem('designation')?.value;
   const sr=form.elements.namedItem('can_sell')?.checked===true||position==='SR';
   const row=form.querySelector('.ffPermissionRow[data-module="sales"]');
   if(!row)return;
   let note=row.querySelector('.ffBuiltInAccessNote');
   if(sr&&!note){
      note=document.createElement('small');note.className='ffBuiltInAccessNote';
      note.textContent='✓ Built-in SR: own sales submission. Blank Edit/Upload/Delete boxes are separate delegation settings.';
      row.querySelector('span')?.append(note);
   }
   if(!sr&&note)note.remove();
   const table=form.querySelector('.ffPermissionTable');
   if(table){
      let included=form.querySelector('.ffBuiltInSrSummary');
      if(sr&&!included){
         included=document.createElement('section');included.className='ffBuiltInSrSummary';
         included.innerHTML='<b>✓ Included with SR Role</b><div class="ffSrRoleGrid"></div><small>These are base SR operations, not additional Edit / Upload / Delete grants. To remove the SR role, change the account position and route after confirming the impact.</small>';
         for(const activity of ['Own Daily Sales','Own Attendance','Assigned Task Proof','Own Private Chat']){
           const label=document.createElement('label'),check=document.createElement('input');
           check.type='checkbox';check.checked=true;check.disabled=true;
           label.append(check,document.createTextNode(activity));included.querySelector('.ffSrRoleGrid').append(label);
         }
         table.before(included);
      }
      if(!sr&&included)included.remove();
   }
 }
 function update(){
   scheduled=false;
   dashboardIdentity();
   keepContactCompact();
   hintSrBaseline();
   // Reach the fixed bottom navigation; never stop Zero Sales halfway down.
   const main=app.querySelector('main.wrap:has(>.ffZeroBoard)');
   if(main){
     const nav=app.querySelector('nav.bottomSeven')||app.querySelector('nav');
     const mt=main.getBoundingClientRect().top,nt=nav?.getBoundingClientRect().top;
     const px=Math.max(330,Math.round((nt&&nt>mt?nt:window.innerHeight-74)-mt-5))+'px';
     if(main.style.getPropertyValue('--ff-zero-main-height')!==px)main.style.setProperty('--ff-zero-main-height',px);
   }
   const task=app.querySelector('.ffTaskModalBackdrop');
   if(task)task.style.maxWidth='100vw';
 }
 function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(update);}
 new MutationObserver(queue).observe(app,{childList:true,subtree:true});
 window.addEventListener('resize',queue,{passive:true});
 window.visualViewport?.addEventListener('resize',queue,{passive:true});
 app.addEventListener('change',e=>{if(e.target?.name==='can_sell'||e.target?.name==='designation')queue()},true);
 function aiOrigin(){
   const orb=app.querySelector('#orb'),popup=document.querySelector('#aiPopup.aiFloatingOverlay');
   if(!orb||!popup||!popup.isConnected||popup.dataset.ffAiAnimated)return;
   const panel=popup.querySelector('.aiPopupPanel');if(!panel)return;
   const o=orb.getBoundingClientRect(),p=panel.getBoundingClientRect();
   if(o.width&&o.height&&p.width&&p.height){
     panel.style.setProperty('--ff-ai-origin-x',Math.max(-50,Math.min(p.width+50,o.left+o.width/2-p.left))+'px');
     panel.style.setProperty('--ff-ai-origin-y',Math.max(-50,Math.min(p.height+50,o.top+o.height/2-p.top))+'px');
   }
   popup.dataset.ffAiAnimated='1';
 }
 const media=document.createElement('style');
 media.textContent='body:has(.ffAccountNavHeader) #orb.aiOrb{display:block!important}';
 document.head.append(media);
 // Stop only the second orb click long enough to animate closing into it.
 let bypass=false;
 document.addEventListener('click',e=>{
   const orb=e.target.closest?.('#orb');
   if(!orb||bypass)return;
   const popup=document.querySelector('#aiPopup.aiFloatingOverlay');
   if(!popup||popup.classList.contains('ffAiClosing')||aiAnimating)return;
   if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
   e.preventDefault();e.stopImmediatePropagation();
   aiAnimating=true;aiOrigin();popup.classList.add('ffAiClosing');
   setTimeout(()=>{
     if(popup.isConnected&&orb.isConnected){
       bypass=true;try{orb.click();}finally{bypass=false;}
     }else popup.remove();
     aiAnimating=false;
   },195);
 },true);
 new MutationObserver(()=>{
   if(document.querySelector('#aiPopup.aiFloatingOverlay:not([data-ff-ai-animated])'))requestAnimationFrame(aiOrigin);
 }).observe(document.body,{childList:true,subtree:false});
 queue();
})();
