/* FieldForce Hub · chat header presentation fix · 2026-11-07
   A chat peer's immutable staff ID chooses the display name/designation.
   No message, roster, or permission writes. Prevents the old mutation cycle
   where glowing title spans and initial-only profile avatars produced LLLLL…. */
(()=>{
 'use strict';
 const app=document.getElementById('app');if(!app)return;
 let queued=false;
 function selectedPeer(){
  const messenger=app.querySelector('.ffMessenger.ffConversationOpen');
  if(!messenger)return '';
  const id=window.history?.state?.ffhChatPeer;
  return typeof id==='string'&&id.trim()?id.trim():'';
 }
 function profile(id){
  const p=window.FFH_STAFF_PROFILE?.(id);
  if(p)return p;
  return window.FFH_STAFF_PHOTOS?.find?.(id)||null;
 }
 function clean(x){
  return String(x??'').trim();
 }
 function draw(){
  queued=false;
  const peer=selectedPeer(),title=app.querySelector('#ffChatTitle');
  if(!peer||!title)return;
  const p=profile(peer);
  const person=clean(p?.full_name||p?.name)||peer;
  const role=clean(p?.display_title||p?.designation||p?.role)||
    (p?.can_sell===true?'SR':p?.can_manage===true?'Manager':'Staff');
  const staffId=clean(p?.company_staff_id||p?.companyStaffId||p?.staff_id||p?.id)||peer;
  const label=role+(staffId?' · '+staffId:'');
  const details=title.querySelector(':scope > .ffChatIdentityDetails');
  const name=details?.querySelector('.ffChatIdentityName');
  const designation=details?.querySelector('.ffChatIdentityRole');
  if(name?.textContent===person&&designation?.textContent===label){
   return;
  }
  // Keep the profile-photo element if it has already been supplied by the
  // shared avatar manager. Never use title.textContent, which destroys it.
  const avatar=title.querySelector(':scope > .ffChatTitleAvatar');
  const body=document.createElement('span');body.className='ffChatIdentityDetails';
  const heading=document.createElement('strong');heading.className='ffChatIdentityName';heading.textContent=person;
  const sub=document.createElement('small');sub.className='ffChatIdentityRole';sub.textContent=label;
  body.append(heading,sub);
  title.replaceChildren(...(avatar?[avatar]:[]),body);
  title.classList.remove('ffGlowTitle');
  title.removeAttribute('data-ff-glow-text');
  title.removeAttribute('data-ff-requested-title');
  title.removeAttribute('data-ff-dual-tone');
  title.setAttribute('aria-label',person+' · '+label);
 }
 function queue(){if(!queued){queued=true;requestAnimationFrame(draw)}}
 new MutationObserver(queue).observe(app,{childList:true,subtree:true,characterData:true});
 document.addEventListener('ffh-staff-updated',queue);
 window.addEventListener('popstate',queue);
 window.addEventListener('pageshow',queue);
 queue();
})();
