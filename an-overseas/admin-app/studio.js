/* A&N Overseas Admin Media Studio — authenticated editor, never stores credentials. */
(function(){
'use strict';
const api=()=>window.ANAdminBridge;
const D=()=>api()?.db?.();
const authorized=()=>!!api()?.authorized?.();
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]));
const safeUrl=x=>{try{const u=new URL(x);return u.protocol==='https:'?u.href:'';}catch{return'';}};
const go=(mode)=>window.ANStudio.show(mode);
const dstr=x=>{try{return new Date(x).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'});}catch{return'';}};
const fld=(name,label,val='',type='text')=>'<label class="field">'+E(label)+'<input type="'+type+'" name="'+E(name)+'" value="'+E(val)+'" autocomplete="off"></label>';
const area=(name,label,val='')=>'<label class="field wide">'+E(label)+'<textarea name="'+E(name)+'">'+E(val)+'</textarea></label>';
const fileField=(name,label,types='image/jpeg,image/png,image/webp')=>'<label class="field wide studio-upload"><span>'+E(label)+'</span><input type="file" name="'+E(name)+'" accept="'+types+'"><small>Select photo → Zoom &amp; Position → Use This Photo → Publish</small></label>';
const action=(label,cmd,id='',cl='alt')=>'<button type="button" class="btn sm '+cl+'" data-studio="'+E(cmd)+'" data-id="'+E(id)+'">'+E(label)+'</button>';
const fallbackUrl=section=>new URL('../open-upload.html?section='+encodeURIComponent(section||'management'),location.href).href;
const browserUploadButton=()=>['management','success','updates','countries','universities'].includes(mode)
 ?'<div class="studio-legacy-fallback"><strong>Gallery button not opening?</strong><p>Older installed APKs need your phone browser for file selection. This opens the same secure Admin Editor in Chrome — no APK reinstall.</p><a class="btn" href="'+E(fallbackUrl(mode))+'">📁 Open Gallery Upload in Chrome</a></div>':'';
const wrap=(title,sub,html)=>{document.querySelector('#main').innerHTML='<p class="eyebrow">A&N Overseas · Admin Studio</p><h1 class="title">'+title+'</h1><p class="sub">'+E(sub)+'</p>'+browserUploadButton()+html;window.scrollTo(0,0);};
const panel=h=>'<section class="panel">'+h+'</section>';
const uuid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);
const store=D;
let management=[],stories=[],updates=[],countries=[],historyRows=[],mode='';
const mimeExt={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
const defaultCountries=[
['Malaysia','🇲🇾','photo-1508062878650-88b52897f298'],['United Kingdom','🇬🇧','photo-1513635269975-59663e0ac1ad'],
['Canada','🇨🇦','photo-1517935706615-2717063c2225'],['Australia','🇦🇺','photo-1523482580672-f109ba8cb9be'],
['South Korea','🇰🇷','photo-1517154421773-0529f29ea451'],['China','🇨🇳','photo-1547981609-4b6bfe67ca0b'],
['Japan','🇯🇵','photo-1493976040374-85c8e12f0c0e'],['Germany','🇩🇪','photo-1467269204594-9661b134dd2b'],
['United States','🇺🇸','photo-1485738422979-f5c462d49f74'],['New Zealand','🇳🇿','photo-1507699622108-4be3abd695ad'],
['Ireland','🇮🇪','photo-1464822759023-fed622ff2c3b'],['France','🇫🇷','photo-1502602898657-3e91760cbb34'],
['Italy','🇮🇹','photo-1516483638261-f4dbaf036963'],['Netherlands','🇳🇱','photo-1512470876302-972faa2aa9a4'],
['Sweden','🇸🇪','photo-1509356843151-3e7d96241e11'],['Finland','🇫🇮','photo-1531366936337-7c912a4589a7'],
['Singapore','🇸🇬','photo-1525625293386-3f8f99389edd'],['United Arab Emirates','🇦🇪','photo-1512453979798-5ea266f8880c'],
['Turkey','🇹🇷','photo-1527838832700-5059252407fa'],['Thailand','🇹🇭','photo-1508004680771-708b02aabdc0']
];
const progress=msg=>{const el=document.querySelector('#studio-progress');if(el)el.textContent=msg;};
const publish=async(key,value)=>{if(!authorized())throw Error('Admin login required');await api().publish(key,value);};
async function upload(file,prefix){
 if(!authorized())throw Error('Admin authorization required');
 if(!(file instanceof File)||!file.size)return '';
 if(!mimeExt[file.type])throw Error('Only JPG, PNG, WebP, MP4, WebM or MOV files are supported');
 const video=file.type.startsWith('video/');
 if(file.size>(video?41943040:8388608))throw Error(video?'Video exceeds the 40 MB limit':'Image exceeds the 8 MB limit');
 const filename=prefix+'-'+uuid()+'.'+mimeExt[file.type];
 progress('Uploading '+file.name+' ('+Math.ceil(file.size/1024)+' KB)...');
 const bucket=store().storage.from('an-public-media');
 const result=await bucket.upload(filename,file,{contentType:file.type,cacheControl:'3600',upsert:false});
 if(result.error)throw result.error;
 return bucket.getPublicUrl(filename).data.publicUrl;
}
function teamRow(p,i){
 const desc=p.help||p.bio||p.description||'';
 const role=p.designation||p.role||'';
 return '<article class="studio-editor team-item" data-index="'+i+'" data-id="'+E(p.id||'')+'"><div class="split"><h3>Member '+(i+1)+' · '+E(p.name||'New Person')+'</h3>'+action('Remove','remove-team',i,'danger')+'</div>'
 +((p.photo&&safeUrl(p.photo))?'<img class="studio-avatar" loading="lazy" src="'+E(p.photo)+'" alt="'+E(p.name||'')+'">':'')
 +'<div class="grid-fields">'+fld('name','Full Name',p.name||'')+fld('designation','Designation',role)
 +fld('position','Position / Title',p.position||'')+fld('company','Company',p.company||'')
 +fld('department','Department',p.department||'')+fld('phone','Personal Contact Number',p.phone||'','tel')
 +fld('email','Email Address',p.email||'','email')+fld('portfolio','Personal Portfolio Website (https://)',p.portfolio||'','url')
 +area('help','Biography / How This Person Helps Students',desc)+fileField('photo_file','Upload / Replace Profile Photo')
 +'</div><input type="hidden" name="photo" value="'+E(p.photo||'')+'">'
 +'<div class="actions">'+(safeUrl(p.photo)?action('Zoom / Position Existing Photo','adjust-team',i):'')+'</div><p class="help">Adjust selected photos before publishing. Existing photos can be repositioned too.</p></article>';
}
function paintManagement(){
 wrap('Management <em>& Contacts</em>','Edit existing profiles or add new people. Changes appear publicly only after Publish.',
 panel('<h2>Public Management Cards</h2><div id="studio-team-list">'+management.map(teamRow).join('')+'</div>'
 +'<div class="actions">'+action('Add New Person','add-team','','alt')+'<button type="button" class="btn" data-studio="save-team">Publish All Changes</button></div>'
 +'<p id="studio-progress" class="help" role="status"></p>')+
 '<p class="help">Remove only takes effect when you press Publish. Existing profiles and portfolios remain unchanged until then.</p>');
}
async function showManagement(){
 const v=await api().getContent('management',[]);
 management=Array.isArray(v)?v.map(x=>({...x})):[];
 paintManagement();
}
async function saveManagement(){
 const rows=[...document.querySelectorAll('#studio-team-list .team-item')];
 // Publishing an empty array intentionally removes all public management cards.
 const result=[];
 for(const row of rows){
  const i=Number(row.dataset.index);
  const old=management[i]||{};
  const get=k=>String(row.querySelector('[name="'+k+'"]')?.value||'').trim();
  const name=get('name');
  if(!name)throw Error('Every member must have a name');
  const portfolio=get('portfolio');
  if(portfolio&&!safeUrl(portfolio))throw Error('Portfolio must start with https://');
  const email=get('email');
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Invalid email for '+name);
  const file=await window.ANPhotoEditor.selectedFile(row.querySelector('[name="photo_file"]'));
  const photo=file?.size?await upload(file,'team'):get('photo');
  const help=get('help'),designation=get('designation');
  result.push({...old,id:old.id||'member-'+uuid(),name,role:designation,designation,
    position:get('position'),company:get('company'),department:get('department'),
    phone:get('phone'),email,portfolio,photo,help,bio:help,description:help});
 }
 progress('Publishing management profiles...');
 await publish('management',result);
 await showManagement();
}
function storiesPanel(){
 const row=(s,i)=>'<article class="studio-media-row" data-story-id="'+E(s.id||'index:'+i)+'"><div class="studio-preview">'+
 (s.type==='video'?'<video src="'+E(s.media_url)+'" playsinline muted preload="metadata"></video>':'<img alt="" src="'+E(s.media_url)+'" loading="lazy">')+
 '</div><div><b>'+E(s.title||'Untitled')+'</b><p>'+E(s.description||'')+'</p><small>'+dstr(s.created_at)+' · '+(s.approved?'Published':'Draft')+'</small></div><div class="actions">'+action(s.approved?'Unpublish':'Publish','toggle-story',s.id||'index:'+i)+' '+action('Edit','edit-story',s.id||'index:'+i)+' '+action('Replace Media','replace-story',s.id||'index:'+i)+(s.type==='image'?' '+action('Zoom / Position','adjust-story',s.id||'index:'+i):'')+' '+action('Remove','remove-story',s.id||'index:'+i,'danger')+'</div><input hidden type="file" name="media" data-media-replace="story" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"></article>';
 wrap('Success <em>Stories</em>','Publish YouTube-style photo and video cards with captions, playable directly on the public site.',
 panel('<h2>Upload a Success Story</h2><form id="studio-story-form">'+fld('title','Video / Photo Title','')
 +area('description','Description / Student Achievement','')
 +fileField('media','Upload Photo or Video','image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime')
 +'<label class="field studio-check"><input type="checkbox" name="consent" required> I confirm permission to publish this student media</label>'
 +'<p class="help">Images up to 8 MB, videos up to 40 MB. Uploading and pressing Publish makes the item live. Videos play within the page.</p>'
 +'<button type="submit" class="btn">Upload & Publish</button></form><p class="help" id="studio-progress" role="status"></p>')+
 panel('<h2>Published / Draft History ('+stories.length+')</h2>'+
 (stories.length?'<div>'+stories.map(row).join('')+'</div>':'<div class="empty">No student success media yet.</div>')));
}
async function showStories(){const v=await api().getContent('success_stories',[]);stories=Array.isArray(v)?v:[];storiesPanel();}
async function addStory(f){
 const data=new FormData(f);
 const title=String(data.get('title')||'').trim(),description=String(data.get('description')||'').trim();
 if(!title)throw Error('Enter a story title');
 if(!data.has('consent'))throw Error('Media permission confirmation required');
 const media=await window.ANPhotoEditor.selectedFile(f.querySelector('[name="media"]'));if(!(media instanceof File)||!media.size)throw Error('Choose a photo or video and finish adjusting it.');
 const url=await upload(media,'success-story');
 const result=[{id:'story-'+uuid(),title,description,media_url:url,type:media.type.startsWith('video/')?'video':'image',approved:true,created_at:new Date().toISOString()},...stories];
 progress('Publishing success story...');
 await publish('success_stories',result);
 await showStories();
}
async function mutateStory(cmd,id){
 const i=id.startsWith('index:')?Number(id.slice(6)):stories.findIndex(x=>String(x.id)===id);if(!Number.isInteger(i)||i<0||i>=stories.length)throw Error('Story not found');
 const list=stories.map(x=>({...x}));
 if(cmd==='toggle-story'){list[i].approved=!list[i].approved;}
 else if(cmd==='remove-story'){if(!confirm('Remove this story from the website?'))return;list.splice(i,1);}
 else if(cmd==='edit-story'){
  const title=prompt('Edit Story Title',list[i].title||'');if(title===null)return;
  const desc=prompt('Edit Description',list[i].description||'');if(desc===null)return;
  if(!title.trim())throw Error('Story title cannot be empty');
  list[i].title=title.trim();list[i].description=desc.trim();
 }
 await publish('success_stories',list);await showStories();
}

const updateCategories=['Study Tips','University Updates','Application Guide','Visa Guidance','Student Life','FAQ','Announcement','Offers'];
const updateCategoryOptions=(v)=>updateCategories.map(x=>'<option value="'+E(x)+'"'+(x===v?' selected':'')+'>'+E(x)+'</option>').join('');
function updatePanel(){
 const rows=updates.map((u,i)=>{
  const identifier=E(u.id||'index:'+i),title=E(u.title||'Untitled');
  const media=u.type==='video'&&safeUrl(u.media_url)?'<video src="'+E(u.media_url)+'" controls playsinline preload="metadata"></video>':u.type==='image'&&safeUrl(u.media_url)?'<img src="'+E(u.media_url)+'" alt="" loading="lazy">':'<div class="studio-update-text-preview">✦</div>';
  return '<article class="studio-media-row" data-update-id="'+identifier+'"><div class="studio-preview">'+media+'</div><div><b>'+title+'</b><p>'+E(u.description||'')+'</p><small>'+E(u.category||'Study Tips')+' · '+dstr(u.created_at)+' · '+(u.approved?'Published':'Draft')+(u.featured?' · Featured':'')+'</small></div><div class="actions">'+
   action(u.approved?'Unpublish':'Publish','toggle-update',u.id||'index:'+i)+
   action(u.featured?'Unpin':'Feature','feature-update',u.id||'index:'+i)+
   action('Edit Text','edit-update',u.id||'index:'+i)+
   action('Replace Media','replace-update',u.id||'index:'+i)+
   action('Remove','remove-update',u.id||'index:'+i,'danger')+'</div><input hidden type="file" name="media" data-media-replace="update" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"></article>';
 }).join('');
 wrap('Study <em>Updates & Insights</em>','Your own Facebook-inspired resource library. New posts appear in the left panel of the public Success Stories page.', 
 panel('<h2>Publish a New Resource</h2><form id="studio-update-form">'+
  fld('title','Post Title / Headline','')+
  area('description','Post Description / Full Caption','')+
  '<label class="field wide">Content Category<select name="category">'+updateCategoryOptions('Study Tips')+'</select></label>'+
  fileField('media','Upload Poster, Photo or Video (optional)','image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime')+
  '<label class="field studio-check"><input type="checkbox" name="featured"> Feature this post in the upper announcement banner</label>'+
  '<p class="help">Photo: up to 8 MB; video: up to 40 MB. A text-only update is also allowed. Verify any offers and facts before publishing. Photos involving students require permission.</p>'+
  '<button type="submit" class="btn">Upload & Publish to Website</button></form><p id="studio-progress" class="help" role="status"></p>')+
 panel('<h2>Published / Draft Updates ('+updates.length+')</h2>'+(rows||'<div class="empty">No Study Updates yet. Publish your first post above.</div>')));
}
async function showUpdates(){
 const data=await api().getContent('study_insights',[]);
 updates=Array.isArray(data)?data:[];
 updatePanel();
}
async function addUpdate(f){
 const data=new FormData(f);
 const title=String(data.get('title')||'').trim(),description=String(data.get('description')||'').trim();
 if(!title)throw Error('Post title is required.');
 if(!description)throw Error('Enter a useful caption or description.');
 const picker=f.querySelector('[name="media"]');
 const file=await window.ANPhotoEditor.selectedFile(picker);
 const mediaUrl=file?.size?await upload(file,'study-update'):'';
 const record={
  id:'update-'+uuid(),title,description,category:String(data.get('category')||'Study Tips'),
  media_url:mediaUrl,type:file?.type?.startsWith('video/')?'video':file?.size?'image':'text',
  featured:data.has('featured'),approved:true,created_at:new Date().toISOString()
 };
 progress('Publishing to your public website...');
 await publish('study_insights',[record,...updates]);
 await showUpdates();
}
async function mutateUpdate(command,id){
 const i=id.startsWith('index:')?Number(id.slice(6)):updates.findIndex(x=>String(x.id)===id);
 if(i<0||i>=updates.length||!Number.isInteger(i))throw Error('Update not found');
 const list=updates.map(x=>({...x}));const item=list[i];
 if(command==='toggle-update')item.approved=!item.approved;
 if(command==='feature-update')item.featured=!item.featured;
 if(command==='remove-update'){
  if(!confirm('Remove this update from the public site?'))return;
  list.splice(i,1);
 }
 if(command==='edit-update'){
  const title=prompt('Update Headline',item.title||'');if(title===null)return;
  const desc=prompt('Edit Caption / Description',item.description||'');if(desc===null)return;
  if(!title.trim()||!desc.trim())throw Error('Headline and description cannot be empty.');
  item.title=title.trim();item.description=desc.trim();
 }
 await publish('study_insights',list);
 await showUpdates();
}

function countryRow(c,i){
 return '<article class="studio-editor country-item" data-index="'+i+'"><div class="split"><b>Destination '+(i+1)+'</b>'+action('Remove','remove-country',i,'danger')+'</div>'+
 ((c[2]&&safeUrl(c[2]))?'<img class="studio-country-preview" src="'+E(c[2])+'" alt="" loading="lazy">':'')+
 '<div class="grid-fields">'+fld('name','Country Name',c[0])+fld('flag','Flag Emoji',c[1])+
 fileField('photo_file','Upload / Replace Country Photo')+
 '</div><input type="hidden" name="photo" value="'+E(c[2]||'')+'"><div class="actions">'+(safeUrl(c[2])?action('Zoom / Position Existing Photo','adjust-country',i):'')+'</div><p class="help">Crop to the destination card frame before publishing.</p></article>';
}
function paintCountries(){
 wrap('Study <em>Destinations</em>','Manage full-width country cards, with four cards per row on laptop screens.',
 panel('<h2>Countries ('+countries.length+')</h2><div id="studio-country-list">'+countries.map(countryRow).join('')+'</div>'
 +'<div class="actions">'+action('Add Country','add-country')+'<button class="btn" data-studio="save-countries">Publish Countries</button></div><p class="help" role="status" id="studio-progress"></p>'));
}
async function showCountries(){
 const v=await api().getContent('countries',null);
 countries=Array.isArray(v)&&v.length?v.map(x=>[...(x||[])]) : defaultCountries.map(x=>[...x]);
 paintCountries();
}
async function saveCountries(){
 const rows=[...document.querySelectorAll('#studio-country-list .country-item')];
 if(!rows.length)throw Error('Keep at least one country');
 const result=[];
 for(const row of rows){
   const name=row.querySelector('[name=name]')?.value.trim();
   if(!name)throw Error('Each country must have a name');
   const flag=row.querySelector('[name=flag]')?.value.trim()||'🌍';
   const file=await window.ANPhotoEditor.selectedFile(row.querySelector('[name=photo_file]'));
   const photo=file?.size?await upload(file,'destination'):row.querySelector('[name=photo]')?.value||'';
   result.push([name,flag,photo]);
 }
 await publish('countries',result);await showCountries();
}
async function showHistory(){
 const {data,error}=await store().from('an_site_history')
 .select('id,content_key,operation,previous_value,next_value,changed_at')
 .order('changed_at',{ascending:false}).limit(100);
 if(error)throw error;
 historyRows=data||[];
 const rows=historyRows.map(h=>'<div class="studio-history-record"><div class="split"><b>'+E(h.content_key.replaceAll('_',' '))+'</b><small>'+dstr(h.changed_at)+'</small></div>'
 +'<p class="muted">'+E(h.operation)+' · revision #'+h.id+'</p>'
 +'<details><summary>View Changes</summary><pre>'+E(JSON.stringify(h.next_value,null,2)||'')+'</pre></details>'
 +(h.previous_value!==null?action('Restore Previous Version','restore',h.id,'alt'):'')+'</div>').join('');
 wrap('Change <em>History</em>','Every website CMS change is recorded automatically. Restore a previous version when needed.',
 panel('<h2>Latest 100 Revisions</h2>'+(rows||'<div class="empty">No changes recorded since history was enabled.</div>')));
}
async function restore(id){
 const h=historyRows.find(x=>String(x.id)===id);
 if(!h||h.previous_value==null)throw Error('No previous version for this change');
 if(!confirm('Restore earlier '+h.content_key+' content? This will publish a new revision to your live website.'))return;
 await publish(h.content_key,h.previous_value);await showHistory();
}
const studio={
 async show(which){
  if(!authorized())return;
  mode=which;
  try{
   if(which==='management')return await showManagement();
   if(which==='success')return await showStories();
   if(which==='updates')return await showUpdates();
   if(which==='countries')return await showCountries();
   if(which==='history')return await showHistory();
  }catch(e){wrap('Unable to <em>Load</em>','Please try again.',panel('<p>'+E(e.message||e)+'</p>')); }
 }
};
window.ANStudio=studio;
// Legacy Android WebView cannot open <input type=file> without a native onShowFileChooser.
// Redirect only legacy installed APKs to Chrome, where the browser owns the file picker.
// Newer APKs may advertise hasNativeFilePicker() and keep the native Gallery chooser.
// Open complete original photos from editor cards without cropping or leaving the current tab.
let adminPhotoOpen=false;
const adminClosePhoto=()=>{
 const dlg=document.getElementById('an-admin-photo-dialog');if(dlg){try{dlg.close?.();}catch(_){ }dlg.removeAttribute('open');}
 adminPhotoOpen=false;
};
document.addEventListener('click',e=>{
 const img=e.target.closest('.studio-preview img,.studio-avatar,.studio-country-preview');
 if(!img||!authorized())return;
 const src=safeUrl(img.currentSrc||img.src);if(!src)return;
 e.preventDefault();e.stopPropagation();
 let dlg=document.getElementById('an-admin-photo-dialog');
 if(!dlg){dlg=document.createElement('dialog');dlg.id='an-admin-photo-dialog';dlg.className='an-admin-photo-dialog';document.body.appendChild(dlg);}
 dlg.innerHTML='<button type="button" aria-label="Close full photo" data-admin-photo-close>× Close</button><img src="'+E(src)+'" alt="Full uploaded photo">';
 dlg.showModal?.();
 adminPhotoOpen=true;
 history.pushState({anAdminPhoto:true},'',location.href);
},true);
window.addEventListener('popstate',()=>{if(adminPhotoOpen)adminClosePhoto();});
document.addEventListener('click',e=>{
 if(!e.target.closest('[data-admin-photo-close]'))return;
 if(adminPhotoOpen)history.back();else adminClosePhoto();
},true);
document.addEventListener('cancel',e=>{if(e.target?.id==='an-admin-photo-dialog'){e.preventDefault();if(adminPhotoOpen)history.back();else adminClosePhoto();}},true);
document.addEventListener('click',e=>{
 const input=e.target.closest('input[type="file"]');
 if(!input||!authorized()||!window.ANAndroid)return;
 try{if(typeof window.ANAndroid.hasNativeFilePicker==='function'&&window.ANAndroid.hasNativeFilePicker())return;}catch(_){}
 e.preventDefault();e.stopImmediatePropagation();
 const section=input.closest('#university-form')?'universities':(['management','countries','success','updates'].includes(mode)?mode:'management');
 location.assign(fallbackUrl(section));
},true);
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-studio]');if(!button||!authorized())return;
 e.preventDefault();e.stopImmediatePropagation();
 const command=button.dataset.studio,id=button.dataset.id||'';
 button.disabled=true;
 try{
  if(command==='add-team'){const i=management.length;management.push({});document.querySelector('#studio-team-list')?.insertAdjacentHTML('beforeend',teamRow({},i));}
  else if(command==='remove-team'){
   if(!confirm('Remove this person after publishing?'))return;
   const row=button.closest('.team-item');row?.remove();
  }else if(command==='save-team')await saveManagement();
  else if(command==='add-country'){const i=countries.length;countries.push(['','','']);document.querySelector('#studio-country-list')?.insertAdjacentHTML('beforeend',countryRow(['','',''],i));}
  else if(command==='remove-country'){button.closest('.country-item')?.remove();}
  else if(command==='save-countries')await saveCountries();
  else if(command==='adjust-team'||command==='adjust-country'){
    const row=button.closest(command==='adjust-team'?'.team-item':'.country-item');
    const src=row?.querySelector('[name="photo"]')?.value;
    if(!src)throw Error('Choose a photo first');
    const adjusted=await window.ANPhotoEditor.editUrl(src,command==='adjust-team'?'team':'country');
    if(adjusted){
     const url=await upload(adjusted,command==='adjust-team'?'team-adjust':'country-adjust');
     row.querySelector('[name="photo"]').value=url;
     let preview=row.querySelector(command==='adjust-team'?'.studio-avatar':'.studio-country-preview');
     if(!preview){preview=document.createElement('img');preview.className=command==='adjust-team'?'studio-avatar':'studio-country-preview';row.querySelector('.grid-fields')?.insertAdjacentElement('beforebegin',preview);}
     preview.src=url;progress('Adjusted photo ready. Press Publish to make the change live.');
    }
   }
  else if(command==='adjust-story'){
    const i=id.startsWith('index:')?Number(id.slice(6)):stories.findIndex(x=>String(x.id)===id);
    const story=stories[i];if(!story||story.type!=='image')throw Error('This item is not an image.');
    const adjusted=await window.ANPhotoEditor.editUrl(story.media_url,'success');
    if(adjusted){const url=await upload(adjusted,'success-adjust');const list=stories.map(x=>({...x}));list[i].media_url=url;await publish('success_stories',list);await showStories();}
   }
  else if(['toggle-story','remove-story','edit-story'].includes(command))await mutateStory(command,id);
  else if(['toggle-update','feature-update','remove-update','edit-update'].includes(command))await mutateUpdate(command,id);
  else if(['replace-update','replace-story'].includes(command)){
    const input=button.closest('.studio-media-row')?.querySelector('input[data-media-replace]');
    if(!input)throw Error('Media replacement input missing');
    input.click();
  }
  else if(command==='restore')await restore(id);
 }catch(err){progress(err.message||String(err));alert(err.message||String(err));}
 finally{if(button.isConnected)button.disabled=false;}
},true);
document.addEventListener('change',async e=>{
 const input=e.target.closest('input[data-media-replace]');
 if(!input||!authorized())return;
 const row=input.closest('.studio-media-row'),which=input.dataset.mediaReplace;
 const id=(which==='story'?row?.dataset.storyId:row?.dataset.updateId)||'';
 try{
  const file=await window.ANPhotoEditor.selectedFile(input);
  if(!file?.size)return;
  if(which==='story'&&!confirm('Confirm permission to publish this replacement student media.'))return;
  const media=await upload(file,which==='story'?'success-original':'update-original');
  const current=which==='story'?stories:updates;
  const i=id.startsWith('index:')?Number(id.slice(6)):current.findIndex(x=>String(x.id)===id);
  if(i<0||i>=current.length)throw Error('Post not found');
  const list=current.map(x=>({...x}));
  list[i].media_url=media;list[i].type=file.type.startsWith('video/')?'video':'image';
  progress('Saving full original media...');
  await publish(which==='story'?'success_stories':'study_insights',list);
  if(which==='story')await showStories();else await showUpdates();
 }catch(err){progress(err.message||String(err));alert(err.message||String(err));}
},true);
document.addEventListener('submit',async e=>{
 if(e.target.id!=='studio-update-form'||!authorized())return;
 e.preventDefault();e.stopImmediatePropagation();
 const b=e.target.querySelector('[type=submit]');if(b)b.disabled=true;
 try{await addUpdate(e.target);}catch(err){progress(err.message||String(err));alert(err.message||String(err));}
 finally{if(b&&b.isConnected)b.disabled=false;}
},true);
document.addEventListener('submit',async e=>{
 if(e.target.id!=='studio-story-form'||!authorized())return;
 e.preventDefault();e.stopImmediatePropagation();
 const b=e.target.querySelector('[type=submit]');if(b)b.disabled=true;
 try{await addStory(e.target);}catch(err){progress(err.message||String(err));alert(err.message||String(err));}
 finally{if(b&&b.isConnected)b.disabled=false;}
},true);
})();
