(function(){
'use strict';
const URL_ROOT='https://svpgjrxeqnluipsgjywk.supabase.co';
const PUBLIC_KEY='sb_publishable_eR5TZxv2aWndxdwzU0RIUA_mXWcBcO3';
const WEBSITE='https://mehedialimayon-del.github.io/salesman-performance-app/an-overseas/';
const ADMIN_EMAIL='mehedialimayon@gmail.com';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(v).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'}):'';
const option=(value,selected)=>'<option value="'+esc(value)+'"'+(String(value)===String(selected)?' selected':'')+'>'+esc(value.replaceAll('_',' '))+'</option>';
const field=(key,label,value,wide=false,textarea=false,type='text')=>'<label class="field'+(wide?' wide':'')+'">'+esc(label)+(textarea?'<textarea name="'+esc(key)+'">'+esc(value||'')+'</textarea>':'<input name="'+esc(key)+'" type="'+type+'" value="'+esc(value||'')+'" autocomplete="off">')+'</label>';
const head=(first,last,sub)=>'<p class="eyebrow">A&N Overseas · Admin</p><h1 class="title">'+esc(first)+' <em>'+esc(last)+'</em></h1><p class="sub">'+esc(sub)+'</p>';
const panel=x=>'<section class="panel">'+x+'</section>';
const empty=x=>'<div class="empty">'+esc(x)+'</div>';
const btn=(label,action,extra='')=>'<button class="btn '+extra+'" type="button" data-action="'+esc(action)+'">'+esc(label)+'</button>';
const phoneLink=v=>{let n=String(v||'').replace(/[^0-9]/g,'');return n.length>=8?'https://wa.me/'+n:'';};
let db=null,user=null,admin=false,tab='overview',showEnquiries=true,selectedStudent='',content={},latest=[],management=[],students=[],messages=[],enquiries=[],leads=[],applications=[],requests=[],universityItems=[],badgeSnapshot=null,watch=null;
function toast(msg){const e=$('toast');e.textContent=String(msg);e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),4800);}
function errorMsg(e){toast(e?.message||String(e));}
function loading(){ $('main').innerHTML='<div class="loading"><div class="spinner"></div><p>Loading securely…</p></div>'; }
function page(s){ $('main').innerHTML=s;window.scrollTo(0,0);}
async function query(table,options={}){let q=db.from(table).select('*');if(options.order)q=q.order(options.order,{ascending:false});if(options.limit)q=q.limit(options.limit);const {data,error}=await q;if(error)throw error;return data||[];}
async function getContent(key,fallback){const {data,error}=await db.from('an_site_content').select('value').eq('key',key).maybeSingle();if(error)throw error;return data?.value??fallback;}
async function publish(key,value){if(!admin||!user)throw Error('Admin access required.');const {error}=await db.from('an_site_content').upsert({key,value,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;toast('Published to live website.');}
function loginUI(message=''){
 $('nav').hidden=true;
 page('<div class="panel hero-panel" style="margin-top:14px"><p class="eyebrow">Secure management access</p><strong>A&N <span style="color:#ff961b">Overseas</span></strong><small>ADMIN APP · AUTHORIZED ACCOUNT ONLY</small></div>'
 +panel('<h2>Welcome back</h2><p class="sub">Sign in once. Your secure login stays saved on this device until sign-out or session expiry.</p><form id="login-form">'
 +field('email','Admin Email',ADMIN_EMAIL,false,false,'email')+field('password','Password','',false,false,'password')
 +'<button class="btn" style="width:100%;margin-top:20px" type="submit">Sign In Securely</button></form>'
 +(message?'<p class="sub" style="color:#f88">'+esc(message)+'</p>':'')
 +'<p class="help">Your password is never included in website code. Student and application data is protected by database access rules.</p></section>'));
}
async function checkAuth(){
 const {data:{user:current},error}=await db.auth.getUser();
 if(error||!current){user=null;admin=false;loginUI();return;}
 user=current;
 const {data, error:ae}=await db.from('an_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(ae||!data){admin=false;loginUI('This email is not authorized for A&N administration.');return;}
 admin=true;$('nav').hidden=false;await draw();
 startWatch();
}
async function signOut(){if(watch){db.removeChannel(watch);watch=null;}await db.auth.signOut();user=null;admin=false;badgeSnapshot=null;loginUI();}
function setNav(active){document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===active));}
async function draw(next,fromBack=false){
 if(next&&next!==tab){if(!fromBack)history.pushState({anAdminTab:next},'', '#'+next);tab=next;}
 if(!admin)return loginUI();
 loading();setNav(tab);
 try{
  if(tab==='overview')await overview();
  else if(tab==='inbox')await inbox();
  else if(tab==='applications')await files();
  else if(tab==='website')await website();
  else if(tab==='management')await managementPage();
  else if(tab==='universities')await universityPage();
  else if(tab==='services')await servicesPage();
  else await more();
 }catch(e){page(head('Unable to','Load','Please retry.')+panel('<p>'+esc(e.message||e)+'</p>'+btn('Retry','refresh','alt')));}
}
async function overview(){
 const tables=['an_portal_leads','an_enquiries','an_applications','an_messages'];
 const all=await Promise.all(tables.map(t=>db.from(t).select('id',{count:'exact',head:true})));
 const counts=all.map(x=>x.error?'—':x.count??0);
 let unread=await db.from('an_enquiries').select('id',{count:'exact',head:true}).eq('status','new');
 const news=unread.error?0:unread.count||0;
 page(head('Admin','Dashboard','Everything important in one private place.')
 +'<div class="panel hero-panel"><div class="split"><div><p class="eyebrow">ADMIN ACCESS ACTIVE</p><strong>Welcome to A&N</strong><small>Live data · synced with your website</small></div><span style="font-size:40px">✦</span></div></div>'
 +'<div class="stats">'+[['Student Leads',counts[0]],['Enquiries',counts[1]],['Applications',counts[2]],['Messages',counts[3]]].map(x=>'<div class="stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('')+'</div>'
 +panel('<div class="split"><div><h2>Action Center</h2><p class="muted">'+news+' new enquiries need attention.</p></div><span class="pill">LIVE</span></div><div class="actions">'+btn('Open Inbox','open-inbox')+btn('Manage Files','open-files','alt')+'</div>')
 +panel('<h2>Quick Publish</h2><p class="muted">Update the homepage, scrolling announcements, phone and other public information from your app.</p>'+btn('Edit Website','open-website','alt'))
 +'<a class="link-card" href="'+WEBSITE+'" target="_blank" rel="noopener">Visit Public Website <span>↗</span></a>');
 await badgeUpdate(false);
}
async function inbox(){
 [enquiries,students,messages]=await Promise.all([
 query('an_enquiries',{order:'created_at',limit:200}),
 query('an_students',{limit:300}),
 query('an_messages',{order:'created_at',limit:300})]);
 const unread=enquiries.filter(x=>x.status==='new').length;
 const controls='<div class="chipbar"><button class="chip '+(showEnquiries?'active':'')+'" data-action="show-enquiries">Enquiries ('+unread+' new)</button><button class="chip '+(!showEnquiries?'active':'')+'" data-action="show-messages">Student Chat ('+messages.length+')</button></div>';
 const intro=head('Inbox &','Messages','Reply quickly to students and follow up on enquiries.');
 if(showEnquiries){
 page(intro+controls+(enquiries.length?panel(enquiries.map(e=>'<div class="record"><div class="split"><b>'+esc(e.full_name)+'</b><span class="pill">'+esc(e.status)+'</span></div><p class="meta">'+date(e.created_at)+' · '+esc(e.email||'')+'</p><p>'+esc(e.message)+'</p><p>'+esc([e.country,e.institution,e.programme].filter(Boolean).join(' · '))+'</p><div class="actions">'
 +(e.email?'<a class="btn sm alt" href="mailto:'+encodeURIComponent(e.email)+'?subject='+encodeURIComponent('A&N Overseas – your enquiry')+'">Reply Email ↗</a>':'')
 +(phoneLink(e.phone)?'<a class="btn sm alt" target="_blank" rel="noopener" href="'+phoneLink(e.phone)+'">WhatsApp ↗</a>':'')
 +'<button class="btn sm" data-enquiry="'+esc(e.id)+'" data-status="contacted">Contacted</button><button class="btn sm ghost" data-enquiry="'+esc(e.id)+'" data-status="closed">Close</button></div></div>').join('')):empty('No enquiries yet. New submissions will appear here.')));
 }else{
 if(!selectedStudent)selectedStudent=students[0]?.user_id||'';
 const nameOf=id=>students.find(s=>s.user_id===id)?.full_name||students.find(s=>s.user_id===id)?.email||id;
 const users=[...new Set(messages.map(x=>x.user_id).concat(students.map(s=>s.user_id)))];
 const opts=users.map(id=>'<option value="'+esc(id)+'"'+(id===selectedStudent?' selected':'')+'>'+esc(nameOf(id))+'</option>').join('');
 const chat=messages.filter(m=>m.user_id===selectedStudent).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 page(intro+controls+(users.length?panel('<label class="field">Select Student<select id="choose-student">'+opts+'</select></label><div class="line"></div>'+ (chat.length?chat.map(m=>'<div class="message '+(m.sender_id===user.id?'me':'')+'"><small>'+esc(m.sender_id===user.id?'You':'Student')+' · '+date(m.created_at)+'</small>'+esc(m.body)+'</div>').join(''):empty('No messages for this student yet.'))
 +'<form id="chat-form">'+field('body','Reply to Student','',true,true)+'<button class="btn" type="submit" style="width:100%;margin-top:12px">Send Message</button></form>'):empty('No students have registered for chat yet.')));
 }
 await badgeUpdate(false);
}
async function files(){
 const docsPromise=query('an_documents',{order:'created_at',limit:250});
 [applications,leads]=await Promise.all([query('an_applications',{order:'created_at',limit:250}),query('an_portal_leads',{order:'created_at',limit:250})]);
 const documents=await docsPromise;
 let statuses=['submitted','review','documents_required','offer','visa_processing','visa_approved','arrived','closed'];
 const apps=applications.map(a=>'<article class="record"><div class="split"><b>'+esc(a.applicant_name)+'</b><span class="pill">'+esc(a.status)+'</span></div><p>'+esc(a.university_id||'')+' · '+esc(a.programme||'')+'</p><p class="meta">'+date(a.created_at)+' · '+esc(a.email||'')+'</p><form data-application="'+esc(a.id)+'"><div class="grid-fields"><label class="field">Application Status<select name="status">'+statuses.map(s=>option(s,a.status)).join('')+'</select></label><label class="field">EMGS Progress (0–100%)<input type="number" name="emgs_percent" min="0" max="100" value="'+Number(a.emgs_percent||0)+'"></label></div><button class="btn sm" type="submit" style="margin-top:10px">Save Live Status</button></form></article>').join('');
 const ls=leads.map(x=>'<div class="record"><div class="split"><b>'+esc(x.full_name)+'</b><span class="pill">'+esc(x.state)+'</span></div><p>'+esc(x.email)+' · '+esc(x.mobile)+'</p><p>'+esc(x.country||'')+' / '+esc(x.university||'')+'</p><form data-lead="'+esc(x.id)+'"><div class="grid-fields"><label class="field">Review<select name="state">'+['new','review','approved','closed'].map(s=>option(s,x.state)).join('')+'</select></label><label class="field">Payment<select name="payment_status">'+['unpaid','pending','confirmed'].map(s=>option(s,x.payment_status)).join('')+'</select></label></div><button type="submit" class="btn sm" style="margin-top:10px">Update</button></form></div>').join('');
 const docsHtml=documents.map(d=>'<div class="record"><b>'+esc(d.display_name||'Student document')+'</b><p>'+esc(d.category||'')+' · '+date(d.created_at)+'</p><button type="button" class="btn sm alt" data-private-document="'+esc(d.storage_path)+'">Open Secure File ↗</button></div>').join('');
 page(head('Student','Files','Application management and verified EMGS progress.')+panel('<h2>Applications ('+applications.length+')</h2>'+(apps||empty('No applications submitted yet.')))+panel('<h2>Student Leads ('+leads.length+')</h2>'+(ls||empty('No new student registration leads yet.')))+panel('<h2>Private Documents ('+documents.length+')</h2><p class="help">Access restricted; links expire after 90 seconds.</p>'+(docsHtml||empty('No private documents yet.'))));
}
async function website(){
 content=await getContent('settings',{});
 latest=await getContent('latest_updates',[]);
 page(head('Edit','Website','Saving publishes to the shared live website database.')
 +panel('<h2>Homepage & Company</h2><form id="settings-form"><div class="grid-fields">'
 +field('heroLead','Headline — First Line',content.heroLead||'',true)
 +field('heroAccent','Headline — Highlight',content.heroAccent||'',true)
 +field('heroDescription','Homepage Description',content.heroDescription||'',true,true)
 +field('motto','Company Motto',content.motto||'')
 +field('phone','Phone',content.phone||'')
 +field('whatsapp','WhatsApp',content.whatsapp||'')
 +field('email','Contact Email',content.email||'')
 +field('about','About Us',content.about||'',true,true)
 +field('malaysiaOffice','Malaysia Office Address',content.malaysiaOffice||'',true,true)
 +field('bangladeshOffice','Bangladesh Office Address',content.bangladeshOffice||'',true,true)
 +'</div><button class="btn" type="submit" style="width:100%;margin-top:19px">Publish Website Changes</button></form>')
 +panel('<h2>Live News / Announcements</h2><p class="muted">One message per line. These appear on the website in Orange and White.</p><form id="ticker-form">'+field('ticker','Scrolling Announcements',(Array.isArray(latest)&&latest.length?latest.map(x=>x.text).join('\n'):content.ticker||''),true,true)
 +'<button class="btn" type="submit" style="width:100%;margin-top:13px">Publish Announcements</button></form>')
 +'<a class="link-card" href="'+WEBSITE+'" target="_blank" rel="noopener">Check Live Website <span>↗</span></a>');
}
async function managementPage(){
 management=await getContent('management',[]);
 page(head('Team &','Management','Update public team member profiles.')+panel('<h2>Public Management Cards</h2><form id="management-form"><div id="management-list">'+management.map((m,i)=>cardTeam(m,i)).join('')+'</div><div class="actions">'+btn('Add New Person','add-person','alt')+'<button type="submit" class="btn">Publish Team</button></div></form>')+'<p class="help">Use public image URLs that you own or have permission to share.</p>');
}
function cardTeam(m,i){return '<div class="record team-item" data-i="'+i+'"><div class="split"><b>Team Member '+(i+1)+'</b><button class="btn sm danger" data-remove-person="'+i+'" type="button">Remove</button></div>'+field('name','Full Name',m.name||'')+field('role','Designation',m.role||'')+field('photo','Public Photo URL',m.photo||'')+field('description','Description',m.description||'',false,true)+'</div>';}
async function universityPage(){
 universityItems=await getContent('university_overrides',[]);
 page(head('University','Editor','Manage catalogue overrides published to the website.')+panel('<h2>Add / Edit a University</h2><p class="muted">Use the exact lowercase ID from the public catalogue, for example <b>upm</b>, to update an existing university.</p><form id="university-form"><div class="grid-fields">'
 +field('id','University ID', '',true)
 +field('name','Official Name','',true)+field('short','Short Name')
 +field('city','City / Campus Location')+field('country','Country','Malaysia')
 +'<label class="field">Type<select name="kind"><option>Public</option><option>Private</option></select></label>'
 +field('site','Official Website URL','https://',true)
 +field('programs','Courses (comma separated)','',true,true)
 +'</div><button class="btn" type="submit" style="width:100%;margin-top:15px">Save / Publish University</button></form>')
 +panel('<h2>Published Overrides ('+universityItems.length+')</h2>'+(universityItems.length?universityItems.map(u=>'<div class="record"><b>'+esc(u.name||u.id)+'</b><p>'+esc(u.id)+' · '+esc(u.city||'')+'</p><button class="btn sm alt" data-edit-university="'+esc(u.id)+'">Edit in Form</button></div>').join(''):empty('No overrides added yet. The default university catalogue is unchanged.'))));
}
async function servicesPage(){
 requests=await query('an_service_requests',{order:'created_at',limit:150});
 page(head('Service','Requests','See requests for student support services.')
 +panel('<h2>Active Requests ('+requests.length+')</h2>'+(requests.length?requests.map(r=>'<div class="record"><b>'+esc(r.service_title||r.service_key)+'</b><p>'+esc(r.status)+' · '+date(r.created_at)+'</p><form data-service="'+esc(r.id)+'"><div class="grid-fields"><label class="field">Status<select name="status">'+['requested','reviewing','quoted','approved','in_progress','completed','cancelled'].map(s=>option(s,r.status)).join('')+'</select></label><label class="field">Progress %<input name="progress" type="number" min="0" max="100" value="'+Number(r.progress||0)+'"></label></div><button class="btn sm" type="submit" style="margin-top:10px">Save Request</button></form></div>').join(''):empty('No service requests yet.'))));
}
async function more(){
 page(head('Admin','Tools','Manage the entire A&N Overseas business.')+panel('<h2>Additional Management</h2>'
 +'<button class="link-card" data-action="team" style="width:100%">Management / Team <span>↗</span></button>'
 +'<button class="link-card" data-action="unis" style="width:100%">University Catalogue <span>↗</span></button>'
 +'<button class="link-card" data-action="service" style="width:100%">Student Service Requests <span>↗</span></button>')
 +panel('<h2>Account & Website</h2><p class="muted">'+esc(user.email||'')+'</p>'
 +'<a class="link-card" target="_blank" rel="noopener" href="'+WEBSITE+'">Visit Main Website <span>↗</span></a>'
 +'<div class="actions">'+btn('Sign Out','logout','danger')+btn('Enable Notifications','notifications','alt')+'</div><p class="help">Alerts work when the app is running. Background push requires a separately configured push service.</p>'));
}
async function badgeUpdate(alertNew){
 if(!admin)return;
 const ts=['an_enquiries','an_messages','an_portal_leads'];
 const fetched=await Promise.all(ts.map(t=>db.from(t).select('id,created_at').order('created_at',{ascending:false}).limit(1)));
 const snapshot=fetched.map(x=>x.error?null:(x.data?.[0]?.id||null));
 if(alertNew&&badgeSnapshot&&snapshot.some((x,i)=>x&&badgeSnapshot[i]!==x))notifyUser('New A&N Overseas update','Open your admin inbox to review the latest student activity.');
 badgeSnapshot=snapshot;
 const en=await db.from('an_enquiries').select('id',{count:'exact',head:true}).eq('status','new');
 const n=en.error?0:en.count||0;const bubble=$('inbox-count');bubble.hidden=!n;bubble.textContent=n>99?'99+':n;
}
async function notifyUser(title,body){
 if(window.ANAndroid&&typeof window.ANAndroid.notifyNew==='function'){window.ANAndroid.notifyNew(title,body);return;}
 if(!('Notification' in window)||Notification.permission!=='granted'||!('serviceWorker' in navigator))return;
 try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'./icon.svg',tag:'an-admin-alert'});}catch(_){}
}
function startWatch(){
 if(watch||!admin)return;
 watch=db.channel('an-admin-active-notice').on('postgres_changes',{event:'INSERT',schema:'public',table:'an_enquiries'},()=>badgeUpdate(true))
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'an_messages'},()=>badgeUpdate(true))
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'an_portal_leads'},()=>badgeUpdate(true)).subscribe();
 badgeUpdate(false);
}
async function notifications(){
 if(window.ANAndroid&&typeof window.ANAndroid.notifyNew==='function'){toast('Android app alerts are available while the app is open. Allow notifications in Android Settings.');return;}
 if(!('Notification' in window)){toast('This browser does not support notification permission.');return;}
 if(Notification.permission==='granted'){toast('Notifications enabled while the app is active.');return;}
 const p=await Notification.requestPermission();toast(p==='granted'?'Alerts enabled for this device.':'Notification permission not granted.');
}
document.addEventListener('click',async e=>{
 const nav=e.target.closest('[data-nav]');if(nav){await draw(nav.dataset.nav);return;}
 const act=e.target.closest('[data-action]');
 if(act){
  const a=act.dataset.action;
  if(a==='refresh')await draw();
  if(a==='open-inbox')await draw('inbox');if(a==='open-files')await draw('applications');if(a==='open-website')await draw('website');
  if(a==='team')await draw('management');if(a==='unis')await draw('universities');if(a==='service')await draw('services');
  if(a==='logout')await signOut();if(a==='notifications')await notifications();
  if(a==='show-enquiries'){showEnquiries=true;await inbox();}
  if(a==='show-messages'){showEnquiries=false;await inbox();}
  if(a==='add-person'){management.push({name:'',role:'',photo:'',description:''});$('management-list').insertAdjacentHTML('beforeend',cardTeam({},management.length-1));}
  return;
 }
 const rm=e.target.closest('[data-remove-person]');if(rm){rm.closest('.team-item').remove();return;}
 const en=e.target.closest('[data-enquiry]');
 if(en){try{const{error}=await db.from('an_enquiries').update({status:en.dataset.status}).eq('id',en.dataset.enquiry);if(error)throw error;toast('Enquiry updated.');await inbox();}catch(err){errorMsg(err);}return;}
 const file=e.target.closest('[data-private-document]');if(file){try{const{data,error}=await db.storage.from('an-student-files').createSignedUrl(file.dataset.privateDocument,90);if(error)throw error;window.open(data.signedUrl,'_blank','noopener');}catch(err){errorMsg(err);}return;}
 const uni=e.target.closest('[data-edit-university]');if(uni){const u=universityItems.find(x=>x.id===uni.dataset.editUniversity);if(u){const f=$('university-form');Object.keys(u).forEach(k=>{const c=f.elements.namedItem(k);if(c)c.value=Array.isArray(u[k])?u[k].join(', '):u[k]||'';});f.scrollIntoView({behavior:'smooth'});}return;}
});
document.addEventListener('change',async e=>{if(e.target.id==='choose-student'){selectedStudent=e.target.value;await inbox();}});
document.addEventListener('submit',async e=>{
 const form=e.target;
 if(!(form instanceof HTMLFormElement))return;
 if(!['login-form','chat-form','settings-form','ticker-form','management-form','university-form'].includes(form.id)&&!form.dataset.application&&!form.dataset.lead&&!form.dataset.service)return;
 e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());
 const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
 try{
  if(form.id==='login-form'){
   if(String(data.email).trim().toLowerCase()!==ADMIN_EMAIL)throw Error('Only the registered A&N administrator can sign in.');
   const{error}=await db.auth.signInWithPassword({email:data.email,password:data.password});if(error)throw error;await checkAuth();return;
  }
  if(!admin)throw Error('Admin login required.');
  if(form.id==='chat-form'){if(!selectedStudent||!String(data.body||'').trim())throw Error('Choose a student and write a reply.');const{error}=await db.from('an_messages').insert({user_id:selectedStudent,sender_id:user.id,body:String(data.body).trim()});if(error)throw error;toast('Message sent to student.');await inbox();return;}
  if(form.dataset.application){const pct=Number(data.emgs_percent);if(!Number.isInteger(pct)||pct<0||pct>100)throw Error('Progress must be 0–100.');const{error}=await db.from('an_applications').update({status:data.status,emgs_percent:pct}).eq('id',form.dataset.application);if(error)throw error;toast('Student application updated.');await files();return;}
  if(form.dataset.lead){const{error}=await db.from('an_portal_leads').update({state:data.state,payment_status:data.payment_status}).eq('id',form.dataset.lead);if(error)throw error;toast('Lead updated.');await files();return;}
  if(form.dataset.service){const pct=Number(data.progress);if(!Number.isInteger(pct)||pct<0||pct>100)throw Error('Progress must be 0–100.');const{error}=await db.from('an_service_requests').update({status:data.status,progress:pct}).eq('id',form.dataset.service);if(error)throw error;toast('Request updated.');await servicesPage();return;}
  if(form.id==='settings-form'){const next={...content};Object.keys(data).forEach(k=>next[k]=String(data[k]).trim());await publish('settings',next);content=next;return;}
  if(form.id==='ticker-form'){const lines=String(data.ticker||'').split('\n').map(s=>s.trim()).filter(Boolean);if(lines.some(s=>s.length>400))throw Error('Each announcement must be under 400 characters.');await publish('latest_updates',lines.map((text,i)=>({text,color:i%2?'white':'orange'})));await publish('settings',{...content,ticker:lines.join(' • ')});return;}
  if(form.id==='management-form'){
   const people=Array.from(form.querySelectorAll('.team-item')).map(row=>Object.fromEntries(new FormData(newFormFromRow(row)).entries()));
   if(people.some(p=>!p.name.trim()||!p.role.trim()))throw Error('Provide a name and designation for every person.');
   await publish('management',people);management=people;await managementPage();return;
  }
  if(form.id==='university-form'){
   const id=String(data.id||'').trim().toLowerCase();
   if(!/^[a-z0-9-]{2,80}$/.test(id)||!data.name?.trim())throw Error('Enter a valid lowercase university ID and official name.');
   if(data.site&&data.site!=='https://'&&!/^https:\/\//.test(data.site))throw Error('Official URL must begin https://');
   const item={id,name:String(data.name).trim(),short:String(data.short||'').trim(),country:String(data.country||'Malaysia').trim(),city:String(data.city||'').trim(),kind:data.kind==='Private'?'Private':'Public',site:data.site||'',programs:String(data.programs||'').split(',').map(s=>s.trim()).filter(Boolean)};
   const list=universityItems.filter(x=>x.id!==id);list.push(item);await publish('university_overrides',list);universityItems=list;await universityPage();return;
  }
 }catch(err){errorMsg(err);}
 finally{if(submit)submit.disabled=false;}
});
function newFormFromRow(row){const form=document.createElement('form');row.querySelectorAll('input,textarea,select').forEach(x=>{const c=x.cloneNode(true);c.value=x.value;form.appendChild(c);});return form;}
$('notify').addEventListener('click',notifications);
$('refresh').addEventListener('click',()=>draw());
$('refresh').addEventListener('click',()=>{void draw();});
$('notify').addEventListener('click',()=>{void notifications();});
window.addEventListener('popstate',event=>{const requested=event.state?.anAdminTab||location.hash.slice(1)||'overview';const allowed=['overview','inbox','applications','website','management','universities','services','more'];void draw(allowed.includes(requested)?requested:'overview',true);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&admin)badgeUpdate(true);});
setInterval(()=>{if(admin&&document.visibilityState==='visible')badgeUpdate(true);},45000);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
if(!window.supabase||!window.supabase.createClient){loginUI('Connection library unavailable. Please check your internet access.');return;}
db=window.supabase.createClient(URL_ROOT,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'an-admin-app-session'}});
void checkAuth();
})();