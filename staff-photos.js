/* FieldForce Hub · shared staff profile photos · no account/route mutation. */
(()=>{'use strict';
 const app=document.getElementById('app');if(!app)return;
 const sb=()=>window.FFH_SUPABASE,avatars=new Map(),broken=new Set();
 let viewer='',scheduled=false,fetching=null,channel=null,photoBroadcast=null,lastRead=0;
 const pickId=()=>{try{return String(JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||'').trim().toUpperCase();}catch{return '';}};
 const safeUrl=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:'';}catch{return '';}};
 const person=id=>avatars.get(String(id||'').toUpperCase());
 const fullPhoto=url=>url&&url.includes('/photo-v2-')?url.replace('/photo-v2-','/full-v2-'):url;
 const emptyPortrait='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#21150e"/><circle cx="40" cy="29" r="15" fill="#f48a3a"/><path d="M13 77c1-19 12-29 27-29s26 10 27 29" fill="#f48a3a"/></svg>');
 const byName=name=>[...avatars.values()].find(p=>p.full_name?.trim().toLowerCase()===String(name||'').trim().toLowerCase());
 function patchAvatar(container,id,classes='ffStaffCircle'){
  if(!container)return;const p=person(id),url=safeUrl(p?.photo_url),name=p?.full_name||String(id||''),initial=(name.trim().charAt(0)||'•').toUpperCase();
  if(container.dataset.ffProfileSource===url&&container.dataset.ffProfileStaff===String(id||''))return;
  container.dataset.ffProfileSource=url;container.dataset.ffProfileStaff=String(id||'');
  const img=container.querySelector(':scope > img.ffStaffPhoto');
  if(url&&!broken.has(url)){let image=img;if(!image){container.replaceChildren();image=document.createElement('img');image.className='ffStaffPhoto zoomable';image.loading='lazy';container.append(image);}
   image.src=url;image.dataset.fullSrc=fullPhoto(url);image.alt=name+' profile photo';image.title='Tap to enlarge photo';image.onerror=()=>{broken.add(url);if(image.isConnected){container.dataset.ffProfileSource='';patchAvatar(container,id,classes);}};container.classList.add('ffHasStaffPhoto');
  }else{container.replaceChildren();container.textContent=initial;container.classList.remove('ffHasStaffPhoto');}
  container.classList.add(...classes.split(' '));
 }
 function makeAvatar(id,cls='ffStaffCircle'){const el=document.createElement('span');el.className=cls;patchAvatar(el,id,cls);return el;}
 function own(){
  const id=pickId();if(!id)return;
  for(const img of document.querySelectorAll('.ffIdentityHero .editableAvatar,.profile .editableAvatar')){
   let p=person(id),url=safeUrl(p?.photo_url);
   if(p){const next=url&&!broken.has(url)?url:emptyPortrait;if(img.dataset.ffServerPhoto!==next){img.dataset.ffServerPhoto=next;img.src=next;}}
   img.classList.add('zoomable');img.dataset.fullSrc=fullPhoto(url)||img.src;img.title='View full profile photo';img.alt='My profile photo';
   img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge my profile photo');
   if(!img.dataset.ffPhotoKeyboard){img.dataset.ffPhotoKeyboard='yes';img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.FFH_OPEN_IMAGE?.(img.dataset.fullSrc||img.src);}});}
   // Avatar opens the full-size zoom viewer. Photo changes live in the top-right Settings menu.
  }
 }
 function dashboard(){
  const hero=document.querySelector('.dashHero');if(!hero)return;
  const progress=hero.querySelector('.dashAch');
  if(progress&&!progress.classList.contains('ffDashProgress')){
    const label=progress.textContent.trim(),value=Math.max(0,Math.min(100,Number.parseFloat(label)||0));
    progress.classList.add('ffDashProgress');
    progress.style.setProperty('--ff-dash-progress',value+'%');
    const face=document.createElement('span');face.className='ffDashProgressFace';
    const percentage=document.createElement('span');percentage.className='ffDashProgressLabel';percentage.textContent=label;
    progress.replaceChildren(face,percentage);
  }
  const selected=document.querySelector('#ffScopeStaff')?.value||'';
  const text=hero.querySelector('small')?.textContent||'';
  let p=(selected&&selected!=='ALL'?person(selected):null);
  if(!p&&!selected&&!/combined|all\s+team/i.test(text))p=[...avatars.values()].find(x=>x.full_name&&text.includes(x.full_name));
  // A selected zone with combined SR data still shows that zone's manager portrait.
  // Only reuse real, active manager records already loaded by the application.
  if(!p&&(!selected||selected==='ALL')){
    const zone=document.querySelector('#ffDashboardZone')?.value;
    try{
      const manager=zone&&zone!=='ALL'?window.FFH_ZONE_MANAGER?.(zone):null;
      if(manager)p=person(manager.staff_id||manager.id);
    }catch(_){}
  }
  const head=document.querySelector('#app main.wrap .head');
  if(head){
    let tag=head.querySelector('.ffDashSelectedLabel');
    if(!tag){tag=document.createElement('span');tag.className='ffDashSelectedLabel';head.append(tag);}
    const zone=document.querySelector('#ffDashboardZone')?.value||'ALL';
    const staff=document.querySelector('#ffScopeStaff');
    const name=p?.full_name||(selected&&selected!=='ALL'?(staff?.selectedOptions?.[0]?.textContent||selected):null);
    tag.textContent=name||('Combined team'+(zone&&zone!=='ALL'?' · '+(zone==='PRIMARY'?'KL ZONE':zone):''));
    tag.title=tag.textContent;
  }
  const old=hero.querySelector('.ffDashStaffIdentity');
  if(!p){old?.remove();document.querySelector('.ffScopeFilter .ffScopeAvatar')?.remove();return;}
  if(old?.dataset.staffId===p.staff_id){patchAvatar(old.querySelector('.ffDashStaffAvatar'),p.staff_id,'ffDashStaffAvatar ffStaffCircle');return;}
  old?.remove();const block=document.createElement('div');block.className='ffDashStaffIdentity';block.dataset.staffId=p.staff_id;
  const circle=makeAvatar(p.staff_id,'ffDashStaffAvatar ffStaffCircle');const label=document.createElement('span');label.className='ffDashStaffName';label.textContent=p.full_name;
  block.append(circle,label);
  const face=progress?.querySelector('.ffDashProgressFace');
  if(face)face.append(block);else hero.insertBefore(block,hero.lastElementChild);
  const scope=document.querySelector('.ffScopeFilter summary');if(scope){let slot=scope.querySelector('.ffScopeAvatar');if(!slot){slot=document.createElement('span');slot.className='ffScopeAvatar ffStaffCircle';scope.prepend(slot);}patchAvatar(slot,p.staff_id,'ffScopeAvatar ffStaffCircle');}
 }
 function accountCards(){
  // Zone staff cards are not .row elements. Reconcile by immutable staff ID,
  // not by name or list index; reusing the shared photo store preserves zoom.
  for(const avatar of document.querySelectorAll('.ffTeamAvatar[data-ff-staff-avatar]')){
   const id=avatar.dataset.ffStaffAvatar;
   if(id)patchAvatar(avatar,id,'ffTeamAvatar ffStaffCircle');
  }
  for(const button of document.querySelectorAll('.ffEditAccount,.ffReplaceAccount')){
   const id=button.dataset.id,row=button.closest('.row');if(!row||!id||!person(id))continue;
   let circle=row.querySelector(':scope > .ffStaffCardAvatar');if(!circle){circle=document.createElement('span');circle.className='ffStaffCardAvatar ffStaffCircle';row.prepend(circle);}patchAvatar(circle,id,'ffStaffCardAvatar ffStaffCircle');
  }
  if(document.querySelector('#ffRosterAccounts'))for(const row of document.querySelectorAll('main.wrap details.card .row')){
   const b=row.querySelector('b');if(!b)continue;const found=b.textContent.match(/^([A-Za-z][\w-]+)\s*[·•]\s*(.+)$/);if(!found)continue;
   const p=person(found[1])||byName(found[2]);if(!p)continue;
   let circle=row.querySelector(':scope > .ffRosterAvatar');if(!circle){circle=document.createElement('span');circle.className='ffRosterAvatar ffStaffCircle';row.prepend(circle);}patchAvatar(circle,p.staff_id,'ffRosterAvatar ffStaffCircle');
  }
 }
 function chat(){
  const conversation=document.querySelector('.ffMessenger');if(!conversation)return;
  for(const row of conversation.querySelectorAll('.ffConversationRow[data-conversation]')){
   const id=row.dataset.conversation;const slot=row.querySelector('.ffConversationAvatar');if(slot)patchAvatar(slot,id,'ffConversationAvatar ffStaffCircle');
  }
  const peer=history.state?.ffhChatPeer||conversation.querySelector('[data-current-peer]')?.dataset.currentPeer||'';
  const title=conversation.querySelector('#ffChatTitle');
  if(title&&peer&&person(peer)){let slot=title.querySelector('.ffChatTitleAvatar');if(!slot){slot=document.createElement('span');slot.className='ffChatTitleAvatar ffStaffCircle';title.prepend(slot);}patchAvatar(slot,peer,'ffChatTitleAvatar ffStaffCircle');}
  const self=pickId();
  for(const bubble of conversation.querySelectorAll('.ffChatBubble[data-chat-id]')){
   const sender=bubble.querySelector('.ffChatSender');if(!sender)continue;
   const name=sender.textContent.trim(),id=bubble.classList.contains('ffChatOwn')?self:(byName(name)?.staff_id||peer);
   if(!id||!person(id))continue;
   let slot=sender.querySelector('.ffChatSenderAvatar');if(!slot){slot=document.createElement('span');slot.className='ffChatSenderAvatar ffStaffCircle';sender.prepend(slot);}
   patchAvatar(slot,id,'ffChatSenderAvatar ffStaffCircle');
  }
 }

 function pickers(){
  for(const row of document.querySelectorAll('.ffItemPicker .ffPickerOption')){
   // Zone rows already render their manager portrait; injecting a generic
   // staff avatar here produced two identical circles for every zone.
   if(row.classList.contains('ffZoneManagerRow'))continue;
   const text=row.querySelector('strong,.ffPickerText')?.textContent||row.querySelector('span:not(.ffPickerAvatar)')?.textContent||'';
   const p=person(row.dataset.staffId)||byName(text)||[...avatars.values()].find(x=>text.includes(x.staff_id));
   if(!p)continue;
   let avatar=row.querySelector(':scope > .ffPickerAvatar');
   if(!avatar){
    avatar=makeAvatar(p.staff_id,'ffPickerAvatar ffStaffCircle');
    const box=row.querySelector('.ffPickerText,.ffMultiOption > span');
    if(box)row.insertBefore(avatar,box);else row.prepend(avatar);
   }else patchAvatar(avatar,p.staff_id,'ffPickerAvatar ffStaffCircle');
  }
  for(const select of document.querySelectorAll('select[data-ff-picker="1"]:not([multiple])')){
   const button=select.nextElementSibling;
   if(!button?.classList.contains('ffSelectTrigger'))continue;
   const p=person(select.value);
   const old=button.querySelector('.ffSelectStaffAvatar');
   if(!p){
    if(old){button.textContent=select.selectedOptions?.[0]?.textContent||'Select';button.removeAttribute('data-staff-photo');}
    continue;
   }
   if(!old||button.dataset.staffPhoto!==p.staff_id){
    const avatar=makeAvatar(p.staff_id,'ffSelectStaffAvatar ffStaffCircle');
    const label=document.createElement('span');label.className='ffSelectStaffLabel';label.textContent=select.selectedOptions?.[0]?.textContent||p.full_name;
    button.replaceChildren(avatar,label);button.dataset.staffPhoto=p.staff_id;
   }else patchAvatar(old,p.staff_id,'ffSelectStaffAvatar ffStaffCircle');
  }
 }
 function render(){scheduled=false;if(!pickId())return;own();dashboard();accountCards();chat();pickers();}
 function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(render);}
 async function refresh(force=false){
  const id=pickId();if(!id||!sb()?.rpc)return;
  if(fetching)return fetching;
  if(!force&&Date.now()-lastRead<10000)return;
  fetching=(async()=>{try{
   const {data,error}=await sb().rpc('ffh_staff_photo_directory');
   if(error)throw error;
   if(!Array.isArray(data))return;
   if(pickId()!==id)return;
   avatars.clear();for(const p of data){if(p&&p.staff_id)avatars.set(String(p.staff_id).toUpperCase(),p);}
   lastRead=Date.now();queue();
  }catch(err){console.warn('Staff profile photos are temporarily unavailable:',err.message||err);}finally{fetching=null;}})();
  return fetching;
 }
 function sessionTick(){const id=pickId();if(id!==viewer){viewer=id;avatars.clear();lastRead=0;if(channel){sb()?.removeChannel?.(channel);channel=null;}if(photoBroadcast){sb()?.removeChannel?.(photoBroadcast);photoBroadcast=null;}}if(id){refresh();connectRealtime();}}
 const st=document.createElement('style');
 st.textContent=`
 .ffIdentityHero .editableAvatar,.profile .editableAvatar{border-radius:50%!important;object-fit:cover!important;cursor:zoom-in!important}
 .ffOwnPhotoEdit{display:none!important}
 .ffStaffCircle{width:36px;height:36px;min-width:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e66f2c;background:#241711;color:#ffab63;font-size:15px;font-weight:750;vertical-align:middle}
 .ffStaffCircle .ffStaffPhoto{width:100%;height:100%;object-fit:cover;cursor:zoom-in;display:block}
 .ffStaffCardAvatar{width:38px;height:38px;min-width:38px}
 .ffDashStaffIdentity{display:flex;align-items:center;gap:7px;max-width:42%;min-width:0;padding:2px 4px}
 .ffDashStaffIdentity .ffDashStaffName{font-size:10px;color:#fff;line-height:1.3;overflow:hidden;text-overflow:ellipsis;max-width:85px}
 .ffDashStaffAvatar{width:38px;height:38px;min-width:38px}
 .dashHero{min-width:0!important;gap:8px!important}
 .dashHero>div:first-child{min-width:0;flex:1}
 .dashHero>div:first-child small{display:block;max-width:100%;overflow-wrap:anywhere}
 #app main.wrap .head:has(+.ffDashboardTabs){display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;flex-wrap:wrap}
 #app main.wrap .ffDashSelectedLabel{max-width:min(55%,270px);padding:4px 8px;border:1px solid #ac5e2d;border-radius:9px;color:#fff;font-size:11px;font-weight:750;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#1b110b}
 
 /* Restore portrait-centred dashboard progress; leave the existing theme intact. */
 .dashHero .dashAch.ffDashProgress{position:relative;flex:0 0 74px;width:74px;height:74px;min-width:74px;border-radius:50%;background:conic-gradient(#ff7b18 var(--ff-dash-progress,0%),#493322 0);display:grid;place-items:center;box-shadow:0 0 15px #ff74172b;color:#ff9a3b!important}
 .dashHero .ffDashProgressFace{position:absolute;inset:6px;border-radius:50%;background:#130e0c;display:grid;place-items:center;overflow:hidden}
 .dashHero .ffDashProgressFace .ffDashStaffIdentity{width:100%;height:100%;max-width:none;min-width:0;padding:0;display:grid;place-items:center}
 .dashHero .ffDashProgressFace .ffDashStaffAvatar{width:100%;height:100%;min-width:0;border:0;border-radius:50%}
 .dashHero .ffDashProgressFace .ffDashStaffName{display:none}
 .dashHero .ffDashProgressLabel{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);z-index:2;min-width:35px;text-align:center;padding:1px 5px;border:1px solid #ff7b18;border-radius:10px;background:#130e0c;color:#fff!important;font-size:12px!important;font-weight:900;line-height:1.4;white-space:nowrap}
 
 .ffScopeAvatar{width:24px;height:24px;min-width:24px;margin-right:5px}
 .ffConversationAvatar.ffStaffCircle{width:42px;height:42px;min-width:42px}
 .ffChatTitleAvatar{width:29px;height:29px;min-width:29px;margin-right:8px}
 #ffChatTitle{display:flex;align-items:center}
 .ffChatSender{display:inline-flex;align-items:center;gap:5px}
 .ffChatSenderAvatar{width:20px;height:20px;min-width:20px;font-size:10px}
 .ffPickerOption{display:flex!important;align-items:center;flex-direction:row!important;gap:10px!important;min-height:56px!important;padding:7px 10px!important;text-align:left}
 .ffPickerText{display:flex;flex:1;min-width:0;flex-direction:column;justify-content:center;gap:2px;text-align:left}
 .ffPickerText strong{font-size:13px!important;line-height:1.25!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .ffPickerText small{font-size:10px!important;line-height:1.2!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .ffMultiOption input[type=checkbox]{flex:0 0 auto}
 .ffMultiOption>span:not(.ffStaffCircle){flex:1;font-size:13px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .ffSelectTrigger:has(.ffSelectStaffAvatar){display:flex!important;align-items:center;gap:9px!important;min-height:46px!important;text-align:left}
 .ffSelectStaffAvatar{width:38px!important;height:38px!important;min-width:38px!important}
 .ffSelectStaffLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}

 .ffPickerAvatar{width:40px!important;height:40px!important;min-width:40px!important;flex:none}
 .ffRosterAvatar{width:34px;height:34px;min-width:34px}
 .ffStaffPhoto.zoomable{touch-action:manipulation}
 `;
 document.head.append(st);
 const observer=new MutationObserver(queue);observer.observe(app,{subtree:true,childList:true});
 const observedPickers=new WeakSet();const overlayObserver=new MutationObserver(records=>{queue();for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches?.('.ffItemPicker')&&!observedPickers.has(node)){observedPickers.add(node);new MutationObserver(queue).observe(node,{subtree:true,childList:true});}});overlayObserver.observe(document.body,{childList:true,subtree:false});
 window.addEventListener('pageshow',()=>{sessionTick();queue()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
 document.addEventListener('ffh-staff-updated',()=>refresh(true));
 window.addEventListener('storage',e=>{if(e.key==='ffh_session')sessionTick()});
 const connectRealtime=()=>{
  if(channel||!sb()?.channel||!pickId())return;
  try{channel=sb().channel('ffh-shared-staff-photo-'+pickId())
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'ffh_profiles'},()=>refresh(true))
   .subscribe();
   photoBroadcast=sb().channel('ffh-team-photo-announcements')
    .on('broadcast',{event:'profile-photo-updated'},()=>refresh(true)).subscribe();
  }catch(err){console.warn('Profile photo realtime fallback:',err);}
 };
 window.addEventListener('ffh-staff-updated',()=>refresh(true));
 queue();sessionTick();setInterval(()=>{if(document.hidden)return;sessionTick();refresh();},8000);
 window.FFH_STAFF_PHOTOS={refresh,render:queue,find:id=>person(id),announce:(staffId)=>{
  try{photoBroadcast?.send?.({type:'broadcast',event:'profile-photo-updated',payload:{staff_id:String(staffId||'')}})?.catch?.(console.warn);}catch(err){console.warn('Profile photo broadcast unavailable:',err);}
 },updateOwn:(id,url)=>{
  if(!id||!safeUrl(url))return;
  const key=String(id).toUpperCase(),old=person(key)||{staff_id:key,full_name:key};
  avatars.set(key,{...old,photo_url:url});broken.delete(url);
  document.querySelectorAll('.ffIdentityHero .editableAvatar,.profile .editableAvatar').forEach(img=>{img.dataset.ffServerPhoto=url;img.src=url;img.dataset.fullSrc=fullPhoto(url);});
  queue();
 }};
})();