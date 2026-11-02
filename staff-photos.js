/* FieldForce Hub · shared staff profile photos · no account/route mutation. */
(()=>{'use strict';
 const app=document.getElementById('app');if(!app)return;
 const sb=()=>window.FFH_SUPABASE,avatars=new Map(),broken=new Set();
 let viewer='',scheduled=false,fetching=null,channel=null,lastRead=0;
 const pickId=()=>{try{return String(JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||'').trim().toUpperCase();}catch{return '';}};
 const safeUrl=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:'';}catch{return '';}};
 const person=id=>avatars.get(String(id||'').toUpperCase());
 const emptyPortrait='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#21150e"/><circle cx="40" cy="29" r="15" fill="#f48a3a"/><path d="M13 77c1-19 12-29 27-29s26 10 27 29" fill="#f48a3a"/></svg>');
 const byName=name=>[...avatars.values()].find(p=>p.full_name?.trim().toLowerCase()===String(name||'').trim().toLowerCase());
 function patchAvatar(container,id,classes='ffStaffCircle'){
  if(!container)return;const p=person(id),url=safeUrl(p?.photo_url),name=p?.full_name||String(id||''),initial=(name.trim().charAt(0)||'•').toUpperCase();
  if(container.dataset.ffProfileSource===url&&container.dataset.ffProfileStaff===String(id||''))return;
  container.dataset.ffProfileSource=url;container.dataset.ffProfileStaff=String(id||'');
  const img=container.querySelector(':scope > img.ffStaffPhoto');
  if(url&&!broken.has(url)){let image=img;if(!image){container.replaceChildren();image=document.createElement('img');image.className='ffStaffPhoto zoomable';image.loading='lazy';container.append(image);}
   image.src=url;image.alt=name+' profile photo';image.title='Tap to enlarge photo';image.onerror=()=>{broken.add(url);if(image.isConnected){container.dataset.ffProfileSource='';patchAvatar(container,id,classes);}};container.classList.add('ffHasStaffPhoto');
  }else{container.replaceChildren();container.textContent=initial;container.classList.remove('ffHasStaffPhoto');}
  container.classList.add(...classes.split(' '));
 }
 function makeAvatar(id,cls='ffStaffCircle'){const el=document.createElement('span');el.className=cls;patchAvatar(el,id,cls);return el;}
 function own(){
  const id=pickId();if(!id)return;
  for(const img of document.querySelectorAll('.ffIdentityHero .editableAvatar,.profile .editableAvatar')){
   let p=person(id),url=safeUrl(p?.photo_url);
   if(p){const next=url&&!broken.has(url)?url:emptyPortrait;if(img.dataset.ffServerPhoto!==next){img.dataset.ffServerPhoto=next;img.src=next;}}
   img.classList.add('zoomable');img.title='View full profile photo';img.alt='My profile photo';
   img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge my profile photo');
   if(!img.dataset.ffPhotoKeyboard){img.dataset.ffPhotoKeyboard='yes';img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.FFH_OPEN_IMAGE?.(img.src);}});}
   const holder=img.closest('.ffOwnPhotoSlot');if(holder)continue;
   const wrap=document.createElement('span');wrap.className='ffOwnPhotoSlot';img.replaceWith(wrap);wrap.append(img);
   const edit=document.createElement('button');edit.type='button';edit.className='ffOwnPhotoEdit';
   edit.textContent='✎';edit.title='Change my profile picture';edit.setAttribute('aria-label','Change my profile picture');
   edit.onclick=e=>{e.preventDefault();e.stopPropagation();
    if(typeof window.changeOwnPhoto==='function'){window.changeOwnPhoto();setTimeout(()=>refresh(true),1800);setTimeout(()=>refresh(true),5500);}
    else alert('Profile image editor is not available. Reopen FieldForce Hub and try again.');
   };
   wrap.append(edit);
  }
 }
 function dashboard(){
  const hero=document.querySelector('.dashHero');if(!hero)return;
  const selected=document.querySelector('#ffScopeStaff')?.value||'';
  const text=hero.querySelector('small')?.textContent||'';
  let p=(selected&&selected!=='ALL'?person(selected):null);
  if(!p&&!selected&&!/combined|all\s+team/i.test(text))p=[...avatars.values()].find(x=>x.full_name&&text.includes(x.full_name));
  const old=hero.querySelector('.ffDashStaffIdentity');
  if(!p){old?.remove();document.querySelector('.ffScopeFilter .ffScopeAvatar')?.remove();return;}
  if(old?.dataset.staffId===p.staff_id){patchAvatar(old.querySelector('.ffDashStaffAvatar'),p.staff_id,'ffDashStaffAvatar ffStaffCircle');return;}
  old?.remove();const block=document.createElement('div');block.className='ffDashStaffIdentity';block.dataset.staffId=p.staff_id;
  const circle=makeAvatar(p.staff_id,'ffDashStaffAvatar ffStaffCircle');const label=document.createElement('span');label.className='ffDashStaffName';label.textContent=p.full_name;
  block.append(circle,label);hero.insertBefore(block,hero.lastElementChild);
  const scope=document.querySelector('.ffScopeFilter summary');if(scope){let slot=scope.querySelector('.ffScopeAvatar');if(!slot){slot=document.createElement('span');slot.className='ffScopeAvatar ffStaffCircle';scope.prepend(slot);}patchAvatar(slot,p.staff_id,'ffScopeAvatar ffStaffCircle');}
 }
 function accountCards(){
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
   if(row.querySelector(':scope > .ffPickerAvatar'))continue;
   const text=row.querySelector('strong')?.textContent||'';
   const p=person(row.dataset.staffId)||byName(text)||[...avatars.values()].find(x=>text.includes(x.staff_id));if(!p)continue;
   const circle=makeAvatar(p.staff_id,'ffPickerAvatar ffStaffCircle');row.prepend(circle);
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
 function sessionTick(){const id=pickId();if(id!==viewer){viewer=id;avatars.clear();lastRead=0;if(channel){sb()?.removeChannel?.(channel);channel=null;}}if(id)refresh();}
 const st=document.createElement('style');
 st.textContent=`
 .ffOwnPhotoSlot{position:relative;display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center}
 .ffIdentityHero .ffOwnPhotoSlot .avatar,.profile .ffOwnPhotoSlot .avatar{width:52px!important;height:52px!important;min-width:52px!important;border-radius:50%!important;object-fit:cover!important;cursor:zoom-in}
 .ffOwnPhotoEdit{position:absolute!important;bottom:-5px;right:-6px;z-index:5!important;width:27px!important;height:27px!important;min-height:27px!important;padding:0!important;border-radius:50%!important;background:#ff7a18!important;border:2px solid #0d0b09!important;color:#fff!important;font-size:16px!important;line-height:1!important;display:grid!important;place-items:center!important}
 .ffStaffCircle{width:36px;height:36px;min-width:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e66f2c;background:#241711;color:#ffab63;font-size:15px;font-weight:750;vertical-align:middle}
 .ffStaffCircle .ffStaffPhoto{width:100%;height:100%;object-fit:cover;cursor:zoom-in;display:block}
 .ffStaffCardAvatar{width:38px;height:38px;min-width:38px}
 .ffDashStaffIdentity{display:flex;align-items:center;gap:7px;max-width:42%;min-width:0;padding:2px 4px}
 .ffDashStaffIdentity .ffDashStaffName{font-size:10px;color:#fff;line-height:1.3;overflow:hidden;text-overflow:ellipsis;max-width:85px}
 .ffDashStaffAvatar{width:38px;height:38px;min-width:38px}
 .ffScopeAvatar{width:24px;height:24px;min-width:24px;margin-right:5px}
 .ffConversationAvatar.ffStaffCircle{width:42px;height:42px;min-width:42px}
 .ffChatTitleAvatar{width:29px;height:29px;min-width:29px;margin-right:8px}
 #ffChatTitle{display:flex;align-items:center}
 .ffChatSender{display:inline-flex;align-items:center;gap:5px}
 .ffChatSenderAvatar{width:20px;height:20px;min-width:20px;font-size:10px}
 .ffPickerOption{display:flex!important;align-items:center;gap:9px}
 .ffPickerAvatar{width:32px;height:32px;min-width:32px}
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
 queue();sessionTick();setInterval(()=>{if(document.hidden)return;sessionTick();},35000);
 window.FFH_STAFF_PHOTOS={refresh,render:queue,find:id=>person(id)};
})();