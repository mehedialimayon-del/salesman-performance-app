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
const fileField=(name,label,types='image/jpeg,image/png,image/webp')=>'<label class="field wide studio-upload"><span>'+E(label)+'</span><input type="file" name="'+E(name)+'" accept="'+types+'"><small>Choose a file from your phone or computer</small></label>';
const action=(label,cmd,id='',cl='alt')=>'<button type="button" class="btn sm '+cl+'" data-studio="'+E(cmd)+'" data-id="'+E(id)+'">'+E(label)+'</button>';
const wrap=(title,sub,html)=>{document.querySelector('#main').innerHTML='<p class="eyebrow">A&N Overseas · Admin Studio</p><h1 class="title">'+title+'</h1><p class="sub">'+E(sub)+'</p>'+html;window.scrollTo(0,0);};
const panel=h=>'<section class="panel">'+h+'</section>';
const uuid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);
const store=D;
let management=[],stories=[],countries=[],historyRows=[],mode='';
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
 +'<p class="help">A portfolio is optional. If available, its website link will appear on the public profile card. No photo URL is required.</p></article>';
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
 if(!rows.length)throw Error('Keep at least one management member');
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
  const file=row.querySelector('[name="photo_file"]')?.files?.[0];
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
 '</div><div><b>'+E(s.title||'Untitled')+'</b><p>'+E(s.description||'')+'</p><small>'+dstr(s.created_at)+' · '+(s.approved?'Published':'Draft')+'</small></div><div class="actions">'+action(s.approved?'Unpublish':'Publish','toggle-story',s.id||'index:'+i)+' '+action('Edit','edit-story',s.id||'index:'+i)+' '+action('Remove','remove-story',s.id||'index:'+i,'danger')+'</div></article>';
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
 const media=data.get('media');if(!(media instanceof File)||!media.size)throw Error('Choose a photo or video');
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
function countryRow(c,i){
 return '<article class="studio-editor country-item" data-index="'+i+'"><div class="split"><b>Destination '+(i+1)+'</b>'+action('Remove','remove-country',i,'danger')+'</div>'+
 ((c[2]&&safeUrl(c[2]))?'<img class="studio-country-preview" src="'+E(c[2])+'" alt="" loading="lazy">':'')+
 '<div class="grid-fields">'+fld('name','Country Name',c[0])+fld('flag','Flag Emoji',c[1])+
 fileField('photo_file','Upload / Replace Country Photo')+
 '</div><input type="hidden" name="photo" value="'+E(c[2]||'')+'"><p class="help">Choose a new photo from your device; no URL needed.</p></article>';
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
   const file=row.querySelector('[name=photo_file]')?.files?.[0];
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
   if(which==='countries')return await showCountries();
   if(which==='history')return await showHistory();
  }catch(e){wrap('Unable to <em>Load</em>','Please try again.',panel('<p>'+E(e.message||e)+'</p>')); }
 }
};
window.ANStudio=studio;
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
  else if(['toggle-story','remove-story','edit-story'].includes(command))await mutateStory(command,id);
  else if(command==='restore')await restore(id);
 }catch(err){progress(err.message||String(err));alert(err.message||String(err));}
 finally{if(button.isConnected)button.disabled=false;}
},true);
document.addEventListener('submit',async e=>{
 if(e.target.id!=='studio-story-form'||!authorized())return;
 e.preventDefault();e.stopImmediatePropagation();
 const b=e.target.querySelector('[type=submit]');if(b)b.disabled=true;
 try{await addStory(e.target);}catch(err){progress(err.message||String(err));alert(err.message||String(err));}
 finally{if(b&&b.isConnected)b.disabled=false;}
},true);
})();
