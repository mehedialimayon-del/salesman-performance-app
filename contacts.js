(function(root){
'use strict';
const bookIcon='<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="5" width="31" height="38" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M5 13h10M5 24h10M5 35h10" stroke="currentColor" stroke-width="3"/><circle cx="26" cy="18" r="5" fill="currentColor"/><path d="M18 34c0-10 16-10 16 0" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
const waIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-12 7L3 20l1.5-5A8 8 0 1 1 20 11.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 7c-2 3 3 8 6 8l2-2-3-1-1 1-2-2 1-1-1-3Z" fill="currentColor"/></svg>';
const mailIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
root.FFH_CONTACT_ICON=bookIcon;
root.FFH_CREATE_CONTACTS=ctx=>{
 const {FFH_SUPABASE:sb,esc,shell,back,bindBack,q,qa}=ctx;
 let rows=[],version=null,undo=null,loading=0,saving=false,category=null,searchTerm='';
 const categories=[['management','Management'],['manager','Manager'],['dic','DIC'],['accounts','Accounts'],['delivery','DM / Deliveryman']];
 const categoryOf=p=>categories.some(([id])=>id===p.category)?p.category:/account/i.test(p.designation+' '+p.department)?'accounts':/delivery|deliveryman|\bdm\b/i.test(p.designation+' '+p.department)?'delivery':/\bdic\b|distribution.*charge/i.test(p.designation+' '+p.department)?'dic':/manager/i.test(p.designation)&&!/general manager/i.test(p.designation)?'manager':'management';
 const matches=(p,term)=>[p.name,p.designation,p.designation2,p.department,p.zone,p.salesmen_names,p.route_names,categories.find(([id])=>id===categoryOf(p))?.[1]].some(v=>String(v||'').normalize('NFKC').toLowerCase().includes(term.normalize('NFKC').toLowerCase()));
 const owner=()=>ctx.user()?.id==='M21954'||ctx.user()?.ownerAccess===true||ctx.may?.('contacts')===true;
 const active=()=>ctx.page()==='contacts';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const visible=()=>rows.filter(x=>!x.deleted_at).sort((a,b)=>a.serial-b.serial||a.id.localeCompare(b.id));
 const safePhoto=url=>/^https:\/\//i.test(url||'')?url:'';
 const input=(name,title,value='',extra='')=>`<label>${title}<input name="${name}" value="${esc(value??'')}" ${extra}></label>`;
 const setStatus=(s,error=false)=>{const el=q('#ffContactStatus');if(el){el.textContent=s;el.setAttribute('role',error?'alert':'status');}};
 async function load(){
  const ticket=++loading;
  const {data,error}=await sb.from('ffh_contacts').select('contacts,version').eq('id',1).single();
  if(error)throw Error('Contacts could not load. '+error.message);
  if(ticket!==loading)return false;
  rows=Array.isArray(data.contacts)?data.contacts:[];version=data.version;return true;
 }
 function contactCard(p){
  const photo=safePhoto(p.photo_url),digits=String(p.whatsapp||'').replace(/\D/g,'');const email=String(p.email||'').replace(/[?#\r\n]/g,''),mailHref=root.FieldForceNative&&!root.FieldForceNative.openContact?'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email):'mailto:'+email;
  const tags=[['Department',p.department],['Zone',p.zone],['Salesmen',p.salesmen_count],['Routes',p.routes_count],['Sales team',p.salesmen_names],['Route names',p.route_names]].filter(([,v])=>v!==null&&v!==undefined&&v!=='');
  return `<article class="ffContactCard" data-contact-id="${esc(p.id)}"><div class="ffContactTop"><span class="ffContactSerial">${p.serial}</span>${p.designation?`<h2>${esc(p.designation)}${p.designation2?` <span class="ffContactPostTwo">${esc(p.designation2)}</span>`:''}</h2>`:''}</div><div class="ffContactIdentity">${photo?`<button class="ffContactPhotoButton" data-photo="${esc(p.id)}" aria-label="Zoom photo of ${esc(p.name)}"><img class="ffContactPhoto" src="${esc(photo)}" alt="${esc(p.name)}" loading="lazy"></button>`:`<div class="ffContactInitial" aria-hidden="true">${esc(Array.from(p.name)[0]||'?')}</div>`}<h3>${esc(p.name)}</h3>${tags.length?`<div class="ffContactTags">${tags.map(([label,value])=>`<span><small>${esc(label)}</small><b>${esc(value)}</b></span>`).join('')}</div>`:''}</div>${p.about?`<p class="ffContactAbout">${esc(p.about)}</p>`:''}<div class="ffContactLinks">${digits?`<a class="ffContactWA" href="https://wa.me/${digits}" aria-label="WhatsApp ${esc(p.name)}">${waIcon}<span>WhatsApp<small>+${digits}</small></span></a>`:''}${p.email?`<a class="ffContactMail" href="${esc(mailHref)}" aria-label="Email ${esc(p.name)}">${mailIcon}<span>Email<small>${esc(p.email)}</small></span></a>`:''}</div>${owner()?`<div class="ffContactTools"><button class="secondary" data-edit="${esc(p.id)}">EDIT</button><button class="secondary" data-delete="${esc(p.id)}">DELETE</button></div>`:''}</article>`;
 }
 function render(message=''){
  if(!active())return;
  const all=visible(),list=all.filter(p=>searchTerm?matches(p,searchTerm):category==='all'||categoryOf(p)===category),trash=rows.filter(x=>x.deleted_at).sort((a,b)=>b.deleted_at.localeCompare(a.deleted_at));
  shell(back('Company Contacts')+`<section class="ffContactHero"><span class="ffContactHeroIcon">${bookIcon}</span><div><small>ONE COMPANY · EVERY ZONE</small><h2>People you can reach</h2><p>Emergency &amp; company contacts</p></div></section><div class="ffContactToolbar">${owner()?'<button class="primary" id="ffContactAdd">＋ ADD CONTACT</button>':''}<button class="secondary" id="ffContactRefresh">REFRESH</button>${owner()&&undo?'<button class="secondary" id="ffContactUndo">UNDO LAST CHANGE</button>':''}</div><label class="ffContactSearchLabel">Search company contacts<input id="ffContactSearch" type="search" placeholder="Search by name, designation or zone" value="${esc(searchTerm)}"></label><div class="ffContactCategories">${categories.map(([id,label])=>`<button class="secondary ffContactCategory ${category===id&&!searchTerm?'selected':''}" data-category="${id}">${label}<small>${all.filter(p=>categoryOf(p)===id).length} contacts</small></button>`).join('')}</div><div id="ffContactResultsLabel">${searchTerm?`Search results (${list.length})`:category?esc(categories.find(([id])=>id===category)?.[1]||'All contacts'):'Choose a category to see contacts'}</div><p id="ffContactStatus" role="status">${esc(message)}</p><div class="ffContactList">${list.map(contactCard).join('')||(category||searchTerm?'<div class="card empty">No matching contacts.</div>':'')}</div>${owner()&&trash.length?`<details class="card ffContactTrash"><summary>Deleted contacts (${trash.length})</summary>${trash.map(p=>`<div class="row"><span>${esc(p.name)}</span><button class="secondary" data-restore="${esc(p.id)}">RESTORE</button></div>`).join('')}</details>`:''}`);
  bindBack();
  const drawResults=()=>{const results=visible().filter(p=>searchTerm?matches(p,searchTerm):category==='all'||categoryOf(p)===category);q('.ffContactList').innerHTML=results.map(contactCard).join('')||((category||searchTerm)?'<p>No matching contacts.</p>':'');q('#ffContactResultsLabel').textContent=searchTerm?'Search results ('+results.length+')':(categories.find(([id])=>id===category)?.[1]||'Choose a category to see contacts');bindCards();};
  q('#ffContactSearch').oninput=e=>{searchTerm=e.target.value.trim();drawResults();};
  qa('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;searchTerm='';render();});
  q('#ffContactAdd')?.addEventListener('click',()=>ctx.navigate('contactEdit',()=>edit()));
  q('#ffContactRefresh').onclick=()=>home();
  q('#ffContactUndo')?.addEventListener('click',()=>action(async()=>{
   if(version!==undo.version)throw Error('Another change was saved. Refresh before editing; restore deleted contacts below.');
   const before=undo.before;await persist(before,false);undo=null;render('Last change undone.');
  }));
  bindCards();
 }
 function bindCards(){
  qa('.ffContactMail').forEach(a=>a.onclick=e=>{if(root.FieldForceNative?.openContact){e.preventDefault();root.FieldForceNative.openContact({url:a.href}).catch(err=>setStatus(err.message,true));}});
  qa('[data-photo]').forEach(b=>b.onclick=()=>{const p=rows.find(p=>p.id===b.dataset.photo);if(p&&root.FFH_OPEN_IMAGE)root.FFH_OPEN_IMAGE(safePhoto(p.photo_url));});
  qa('[data-edit]').forEach(b=>b.onclick=()=>ctx.navigate('contactEdit',()=>edit(b.dataset.edit)));
  qa('[data-delete]').forEach(b=>b.onclick=()=>{
   const p=rows.find(x=>x.id===b.dataset.delete);if(!root.confirm(`Delete ${p.name}? You can undo or restore it.`))return;
   action(async()=>{const next=copy(rows);const removed=next.find(x=>x.id===p.id);removed.restore_position=removed.serial;removed.deleted_at=new Date().toISOString();renumber(next);await persist(next);render('Contact deleted. Undo or restore is available.');});
  });
  qa('[data-restore]').forEach(b=>b.onclick=()=>action(async()=>{
   const next=copy(rows),p=next.find(x=>x.id===b.dataset.restore);p.deleted_at=null;const ordered=next.filter(x=>!x.deleted_at&&x.id!==p.id).sort((a,b)=>a.serial-b.serial);ordered.splice(Math.min(Math.max(0,(p.restore_position||p.serial||1)-1),ordered.length),0,p);ordered.forEach((x,i)=>x.serial=i+1);delete p.restore_position;await persist([...ordered,...next.filter(x=>x.deleted_at)]);render('Contact restored.');
  }));
 }
 function renumber(list){list.filter(x=>!x.deleted_at).sort((a,b)=>a.serial-b.serial||a.id.localeCompare(b.id)).forEach((p,i)=>p.serial=i+1);return list;}
 async function persist(next,remember=true){
  if(!owner())throw Error('Administrator access is required to change contacts.');
  if(version===null)throw Error('Load contacts before saving.');
  const before=copy(rows),oldVersion=version;
  const {data,error}=await sb.from('ffh_contacts').update({contacts:next,version:oldVersion+1,updated_at:new Date().toISOString()}).eq('id',1).eq('version',oldVersion).select('version').maybeSingle();
  if(error)throw Error('Save failed. '+error.message);
  if(!data)throw Error('Contacts changed on another device. Return to Contacts, refresh, then retry.');
  rows=next;version=data.version;if(remember)undo={before,version};
 }
 async function action(fn){if(saving)return;saving=true;try{await fn();}catch(e){setStatus(e.message,true);}finally{saving=false;}}
 async function home(selected=null){
  if(typeof selected==='string')category=selected;
  ctx.setPage('contacts');
  shell(back('Company Contacts')+'<div class="card"><p>Loading company contacts…</p><p id="ffContactStatus" role="status"></p><button id="ffContactRetry" class="secondary">RETRY</button></div>');bindBack();q('#ffContactRetry').onclick=home;
  try{await load();render();}catch(e){if(active())setStatus(e.message,true);}
 }
 function edit(id){
  if(!owner()){ctx.setPage('contacts');render();return;}
  const p=rows.find(x=>x.id===id)||{},baseVersion=version;
  ctx.setPage('contactEdit');
  shell(back(id?'Edit Contact':'Add Contact')+`<div class="card"><p>Only filled details appear on the contact card. Visible to all zones.</p><form class="form" id="ffContactForm"><label>Contact category<select name="category">${categories.map(([id,label])=>`<option value="${id}" ${id===(p.id?categoryOf(p):category||'management')?'selected':''}>${label}</option>`).join('')}</select></label>${input('serial','Serial / position',p.serial||visible().length+1,'type="number" min="1" step="1" required')}<div class="two">${input('designation','Post 1 / Company designation',p.designation,'maxlength="150" placeholder="Managing Director"')}${input('designation2','Post 2 (optional)',p.designation2,'maxlength="150"')}</div>${input('name','Full name',p.name,'required maxlength="150"')}${input('department','Department',p.department??'Modern Trade','maxlength="100"')}${input('zone','Zone (optional)',p.zone,'maxlength="100"')}${input('salesmen_count','Number of salesmen (optional)',p.salesmen_count,'type="number" min="0" max="100000" step="1"')}${input('routes_count','Number of routes (optional)',p.routes_count,'type="number" min="0" max="100000" step="1"')}${input('salesmen_names','Sales team names (optional)',p.salesmen_names,'maxlength="500"')}${input('route_names','Route names (optional)',p.route_names,'maxlength="500"')}${input('whatsapp','WhatsApp with country code',p.whatsapp,'type="tel" maxlength="25" placeholder="+60…"')}${input('email','Email',p.email,'type="email" maxlength="254"')}<label>Photo (optional)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>${safePhoto(p.photo_url)?`<img class="ffContactPhoto" id="ffContactPreview" src="${esc(p.photo_url)}" alt="Current photo"><label><input type="checkbox" name="remove_photo"> Remove photo</label>`:'<img class="ffContactPhoto" id="ffContactPreview" alt="New photo preview" hidden>'}<label>About (optional)<textarea name="about" maxlength="3000" rows="4">${esc(p.about||'')}</textarea></label><div class="ffContactTools"><button class="primary" type="submit">SAVE CONTACT</button><button class="secondary" type="button" id="ffContactCancel">CANCEL</button></div><p id="ffContactStatus" role="status"></p></form></div>`);
  bindBack();const f=q('#ffContactForm');let preview;f.elements.photo.oninput=()=>{const data=ctx.editedPhoto?.(f.elements.photo.files[0]);if(data){q('#ffContactPreview').src=data;q('#ffContactPreview').hidden=false;}};
  f.elements.photo.onchange=()=>{if(preview)URL.revokeObjectURL(preview);const file=f.elements.photo.files[0],el=q('#ffContactPreview');if(file){preview=URL.createObjectURL(file);el.src=preview;el.hidden=false;}else{el.hidden=!p.photo_url;if(p.photo_url)el.src=p.photo_url;}};
  q('#ffContactCancel').onclick=()=>root.history.back();
  f.onsubmit=async e=>{
   e.preventDefault();if(saving)return;
   saving=true;const btn=f.querySelector('[type=submit]');btn.disabled=true;
   try{
    if(version!==baseVersion)throw Error('Contacts changed. Return to Contacts and reopen this editor.');
    const values=Object.fromEntries(new FormData(f));
    const contact={id:p.id||root.crypto.randomUUID(),serial:1,deleted_at:null,category:values.category};if(!categories.some(([id])=>id===contact.category))throw Error('Choose a contact category.');
    for(const key of ['name','designation','designation2','department','zone','salesmen_names','route_names','whatsapp','email','about'])contact[key]=String(values[key]||'').trim();
    if(!contact.name)throw Error('Full name is required.');
    if(contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))throw Error('Enter a valid email.');
    if(contact.whatsapp&&!/^\+?[\d\s()-]+$/.test(contact.whatsapp))throw Error('Enter WhatsApp number with country code.');
    contact.whatsapp=contact.whatsapp.replace(/\D/g,'');
    if(contact.whatsapp&&!/^[1-9]\d{6,14}$/.test(contact.whatsapp))throw Error('WhatsApp needs 7–15 digits with country code, without a leading zero.');
    for(const key of ['salesmen_count','routes_count']){contact[key]=values[key]===''?null:Number(values[key]);if(contact[key]!==null&&(!Number.isInteger(contact[key])||contact[key]<0||contact[key]>100000))throw Error('Counts must be whole numbers from 0 to 100000.');}
    const serial=Number(values.serial);if(!Number.isInteger(serial)||serial<1)throw Error('Serial must be a positive whole number.');
    contact.photo_url=f.elements.remove_photo?.checked?'':p.photo_url||'';
    const file=f.elements.photo.files[0];if(file){setStatus('Uploading photo…');contact.photo_url=await uploadPhoto(file);}
    const next=copy(rows).filter(x=>x.id!==p.id),ordered=next.filter(x=>!x.deleted_at).sort((a,b)=>a.serial-b.serial||a.id.localeCompare(b.id));
    ordered.splice(Math.min(serial-1,ordered.length),0,contact);ordered.forEach((x,i)=>x.serial=i+1);
    await persist([...ordered,...next.filter(x=>x.deleted_at)]);
    if(preview)URL.revokeObjectURL(preview);
    if(ctx.page()==='contactEdit'){root.history.back();}
   }catch(err){setStatus(err.message,true);}finally{saving=false;btn.disabled=false;}
  };
 }
 async function uploadPhoto(file){
  const edited=ctx.editedPhoto?.(file);if(edited)return ctx.uploadEdited(edited); 
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP photo under 10 MB.');
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();img.src=url;await img.decode();
   const c=document.createElement('canvas'),scale=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);
   const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',0.85));if(!blob)throw Error('Photo could not be processed.');
   return await ctx.uploadPublic(new File([blob],'contact-'+root.crypto.randomUUID()+'.jpg',{type:'image/jpeg'}),'contacts');
  }finally{URL.revokeObjectURL(url);}
 }
 async function refresh(){if(!active()||saving||document.activeElement?.id==='ffContactSearch')return;try{await load();render();}catch(e){if(active())setStatus(e.message,true);}}
 async function search(term){await load();const found=visible().filter(p=>matches(p,String(term).trim()));if(!found.length)return false;searchTerm=String(term).trim();category=null;ctx.setPage('contacts');ctx.navigate('contacts',()=>render());return true;}
 async function lookup(term){await load();return copy(visible().filter(p=>matches(p,String(term).trim())));}
 return {home,edit,refresh,search,lookup};
};
})(window);
