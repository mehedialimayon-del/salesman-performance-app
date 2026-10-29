/* A&N Overseas authenticated portal, hosted on GitHub Pages + Supabase with RLS.
 * No passwords or secret/service-role keys are embedded in this site. */
(function(){
'use strict';
const PROJECT_URL='https://svpgjrxeqnluipsgjywk.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_eR5TZxv2aWndxdwzU0RIUA_mXWcBcO3';
const PUBLIC_BUCKET='an-public-media',PRIVATE_BUCKET='an-student-files';
const AN=window.ANLive={db:null,user:null,isAdmin:false,isApproved:false,ready:false,stories:[],publicSettings:{},management:[],latestUpdates:[],loadedStory:false};
const ed=window.esc||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const msg=(str)=>{const el=document.querySelector('#an-feedback');if(el)el.textContent=String(str);else if(typeof toast==='function')toast(str);};
const errorText=e=>String(e?.message||'Request failed');
const route=()=>location.hash.replace(/^#\/?/,'').split('?')[0].split('/')[0]||'home';
const authRequired=()=>AN.user?true:false;
const needAuth=()=>'<div class="live-panel live-login"><h2>Secure Account Required</h2><p class="muted">Please log in before accessing private student information.</p><a class="btn" href="#/login">Student Login →</a></div>';
const statusBadge=s=>'<span class="live-badge">'+ed(s||'Pending')+'</span>';
const dt=s=>s?new Date(s).toLocaleDateString('en-MY',{year:'numeric',month:'short',day:'numeric'}):'—';
const ff={};
const B=(type,text)=>'<button type="'+(type||'button')+'" class="btn">'+ed(text)+'</button>';
async function loginAccount(email,password){
 const{data,error}=await AN.db.auth.signInWithPassword({email,password});if(error)throw error;await setUser(data.user);location.hash=AN.isAdmin?'#/admin':'#/dashboard';
}
async function setUser(user){
 AN.user=user||null;AN.isAdmin=false;AN.isApproved=false;
 if(!AN.user||!AN.db)return;
 const [admin,approved]=await Promise.all([
  AN.db.from('an_admins').select('user_id').eq('user_id',AN.user.id).maybeSingle(),
  AN.db.from('an_student_access').select('user_id').eq('user_id',AN.user.id).maybeSingle()
 ]);
 AN.isAdmin=!!admin.data&&!admin.error;AN.isApproved=!!approved.data&&!approved.error;
 try{let p=await AN.db.from('an_students').select('user_id').eq('user_id',AN.user.id).maybeSingle();
  if(!p.data&&!p.error){await AN.db.from('an_students').insert({user_id:AN.user.id,full_name:AN.user.user_metadata?.full_name||AN.user.email?.split('@')[0]||'Student',email:AN.user.email||'',phone:''});}
 }catch(_){}
}
async function publicContent(){
 if(!AN.db)return;
 const {data,error}=await AN.db.from('an_site_content').select('key,value').in('key',['settings','management','success_stories','university_overrides','services','countries','latest_updates']);
 if(error)return;
 const by=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
 AN.publicSettings=by.settings||{};AN.management=Array.isArray(by.management)?by.management:[];AN.stories=Array.isArray(by.success_stories)?by.success_stories:[];AN.latestUpdates=Array.isArray(by.latest_updates)?by.latest_updates:[];AN.loadedStory=true;
 if(Array.isArray(by.services)&&by.services.length&&typeof serviceList!=='undefined'){serviceList.splice(0,serviceList.length,...by.services.filter(v=>Array.isArray(v)&&v.length>=3).map(v=>[String(v[0]),String(v[1]),String(v[2])]));}
 if(Array.isArray(by.countries)&&by.countries.length&&typeof countries!=='undefined'){countries.splice(0,countries.length,...by.countries.filter(v=>Array.isArray(v)&&v.length>=3).map(v=>[String(v[0]),String(v[1]),String(v[2])]));}
 (Array.isArray(by.university_overrides)?by.university_overrides:[]).forEach(x=>{
  if(!x||!x.id)return;
  let u=U.find(z=>z.id===x.id);
  if(!u){
   if(!x.name||!x.site||!/^https:\/\//i.test(x.site))return;
   u={id:x.id,name:x.name,short:x.short||x.name,city:x.city||'',country:x.country||'Malaysia',kind:x.kind||'Private',site:x.site,programs:Array.isArray(x.programs)?x.programs:[],photo:''};
   U.push(u);
  }
  ['name','short','city','country','kind','site'].forEach(k=>{if(typeof x[k]==='string'&&x[k].trim())u[k]=x[k].trim();});
  if(Array.isArray(x.programs)&&x.programs.length)u.programs=x.programs;
  const urlOk=v=>typeof v==='string'&&/^https:\/\//i.test(v);
  if(urlOk(x.cardImageUrl))u.cardPhoto=x.cardImageUrl;
  if(urlOk(x.logoImageUrl))u.logoImage=x.logoImageUrl;
  if(Array.isArray(x.galleryImages))u.galleryImages=x.galleryImages.filter(urlOk).slice(0,15);
  const p=UNIVERSITY_PROFILES[u.id];
  if(p){
   if(urlOk(x.logoImageUrl))p.logo=x.logoImageUrl;
   if(u.galleryImages?.length)p.images=u.galleryImages.map((url,i)=>({url,label:u.name+' — gallery '+(i+1),source:url}));
   if(u.cardPhoto){if(!Array.isArray(p.images))p.images=[];if(!p.images.some(im=>im.url===u.cardPhoto))p.images.unshift({url:u.cardPhoto,label:u.name+' campus',source:u.cardPhoto});}
  }
 });
 repaintPublic();
}
function repaintPublic(){
 const s=AN.publicSettings;
 if(typeof window.ANUpdateTicker==='function')window.ANUpdateTicker(AN.latestUpdates,s.ticker);
 if(route()==='home'){
  const motto=document.querySelector('.campus-line');if(motto&&s.motto)motto.textContent=s.motto;
  const heroTitle=document.querySelector('.hero h1');if(heroTitle&&s.heroLead&&s.heroAccent)heroTitle.innerHTML=ed(s.heroLead)+'<br><span class="gradient">'+ed(s.heroAccent)+'</span>';
  const heroDescription=document.querySelector('.hero .home-description');if(heroDescription&&s.heroDescription)heroDescription.textContent=s.heroDescription;
  if(s.heroImage&&/^https:\/\//i.test(s.heroImage)){try{const u=new URL(s.heroImage);const hero=document.querySelector('.hero');if(hero){let style=document.getElementById('an-hero-image-override');if(!style){style=document.createElement('style');style.id='an-hero-image-override';document.head.appendChild(style);}style.textContent='body.home-view .hero:before{background-image:url("'+u.href.replace(/"/g,'%22')+'")!important;}';}}catch(e){}}
 }
 if(route()==='about'){
  let description=document.querySelector('.page-head p');if(description&&s.about)description.textContent=s.about;
  let container=document.querySelector('#app>.wrap.content');
  if(container&&AN.management.length&&!container.querySelector('#an-real-team')){
   let section=document.createElement('div');section.id='an-real-team';section.className='live-panel mt';
   section.innerHTML='<h2><span style="color:#ff8500">Our</span> Team</h2><div class="grid">'+AN.management.map(m=>{
    let image=/^https:\/\//i.test(m.photo||'')?'<img src="'+ed(m.photo)+'" alt="'+ed(m.name||'')+'" loading="lazy" style="display:block;width:100%;max-height:160px;object-fit:contain;background:#111">':'';
    return '<div class="card">'+image+'<div class="inside"><h3>'+ed(m.name||'')+'</h3><p>'+ed(m.designation||m.role||'')+'</p><p>'+ed(m.department||'')+'</p></div></div>';
   }).join('')+'</div>';container.appendChild(section);
  }
 }
}
authPage=function(mode){
 if(AN.user)return title('Your Student Account','You are currently signed in securely.')+'<div class="wrap content"><div class="live-panel live-login"><h2>Signed In</h2><p>'+ed(AN.user.email||'Account')+'</p><div class="live-controls"><a class="btn" href="'+(AN.isAdmin?'#/admin':'#/dashboard')+'">Open '+(AN.isAdmin?'Admin Panel':'My Dashboard')+'</a><button id="an-logout">Sign Out</button></div></div></div>';
 const register=mode==='register';
 return title(register?'Create Student Account':'Secure Student Login',register?'Sign up with your email. Your account is reviewed before you can submit applications.':'Sign in to access your personal student dashboard and application status.')
 +'<div class="wrap content"><div class="live-panel live-login"><h2><span style="color:#ff8500">'+(register?'Student':'Welcome')+'</span> '+(register?'Registration':'Login')+'</h2><form id="an-auth-form" autocomplete="on">'
 +(register?'<label class="field"><span>Full Name</span><input class="input" name="full_name" autocomplete="name" required maxlength="130"></label>':'')
 +'<label class="field"><span>Email Address</span><input class="input" name="email" type="email" autocomplete="email" required></label>'
 +'<label class="field"><span>Password (minimum 8 characters)</span><input class="input" name="password" type="password" autocomplete="'+(register?'new-password':'current-password')+'" minlength="8" required></label>'
 +B('submit',register?'Create Account':'Sign In')+'</form><div class="live-controls" style="margin-top:14px"><a href="'+(register?'#/login':'#/register')+'">'+(register?'Existing account? Sign in':'Create student account')+'</a><button id="an-reset-password">Reset Password</button></div><div id="an-feedback" class="live-form-msg" role="status" aria-live="polite"></div>'
 +'<p class="live-mini">Secure account sessions are handled by Supabase Auth. Your password is never stored in this website’s code.</p></div></div>';
};
dashPage=function(){
 if(!authRequired())return title('Student Portal','Secure student dashboard')+'<div class="wrap content">'+needAuth()+'</div>';
 const menu=[['dashboard','Overview'],['apply','Apply Now'],['tracking','Application Tracking'],['documents','My Documents'],['payments','Invoices'],['accommodation','Accommodation'],['messages','Messages']];
 return title('My Student Dashboard','Your personal applications, updates and university documents.')
 +'<div class="wrap content page-scroll"><div class="live-controls">'+menu.map(([to,label])=>'<a href="#/'+to+'">'+label+'</a>').join('')+(AN.isAdmin?'<a href="#/admin">Admin Control Panel</a>':'')+'<button id="an-logout">Sign Out</button></div>'
 +'<div class="live-panel mt"><h2>Welcome, '+ed(AN.user.user_metadata?.full_name||AN.user.email||'Student')+'</h2>'+(AN.isApproved||AN.isAdmin?'<p>Account approved for applications.</p>':'<p>Your account has been created. An administrator must approve it before you can submit an application or upload files.</p>')+'</div><div id="an-dashboard-data" class="live-panel"><p>Loading your applications...</p></div></div>';
};
trackingPage=function(){
 return title('Application Tracking','Your real application and EMGS milestones, updated by the A&N team.')
 +'<div class="wrap content page-scroll">'+(!authRequired()?needAuth():'<div class="live-panel" id="an-track-data">Loading your submitted applications...</div>')+'</div>';
};
documentsPage=function(){
 return title('My Documents','Secure, private supporting documents for your application.')
 +'<div class="wrap content page-scroll">'+(!authRequired()?needAuth():
 '<div class="live-panel"><h2>Upload a Document</h2><p class="live-mini">PDF, JPG, PNG or WEBP only; maximum 10 MB. Your file is kept in private storage, accessible only to you and authorized staff.</p>'
 +(!AN.isApproved&&!AN.isAdmin?'<p>Your account requires approval before uploads are enabled.</p>':'<form id="an-document-form"><div class="live-fieldgrid"><label>Application<select name="application_id" required id="an-document-app"></select></label><label>Document Category<select name="category"><option>Passport</option><option>Academic Certificate</option><option>Transcript</option><option>English Test</option><option>Offer Letter</option><option>Supporting document</option></select></label><label class="full">Choose File<input type="file" name="file" required accept="application/pdf,image/jpeg,image/png,image/webp"></label></div><div class="mt">'+B('submit','Secure Upload')+'</div></form>')
 +'<div id="an-feedback" class="live-form-msg"></div></div><div class="live-panel"><h2>My Files</h2><div id="an-doc-list">Loading...</div></div>')+'</div>';
};
paymentsPage=function(){
 return title('Payment & Invoices','View your official invoices, amounts and payment records.')
 +'<div class="wrap content page-scroll">'+(!authRequired()?needAuth():'<div class="live-panel"><div id="an-invoice-list">Loading invoices...</div><p class="live-mini">Never send funds based on unverified messages. Payment instructions must be verified directly with A&N staff.</p></div>')+'</div>';
};
accommodationPage=function(){
 return title('Accommodation Request','Request student housing support near your campus.')
 +'<div class="wrap content page-scroll">'+(!authRequired()?needAuth():
 '<div class="live-panel live-login"><form id="an-housing-form"><label class="field"><span>Room Type</span><select name="room_type" required><option value="Single Room">Single Room</option><option value="Shared Room">Shared Room</option><option value="University Hostel">University Hostel</option><option value="Apartment">Apartment</option></select></label><label class="field"><span>Preferred University / Location</span><input class="input" name="location" required maxlength="180"></label><label class="field"><span>Preferences</span><textarea name="notes" maxlength="1800"></textarea></label>'+B('submit','Submit Accommodation Request')+'</form><div id="an-feedback" class="live-form-msg"></div></div>')+'</div>';
};
function messagesPage(){
 return title('Student Messages','Direct messages between you and the A&N team.')
 +'<div class="wrap content page-scroll">'+(!authRequired()?needAuth():
 '<div class="live-panel"><div id="an-message-list" class="live-msg-list">Loading messages...</div><form id="an-message-form" class="mt"><label class="field"><span>Send a message</span><textarea name="body" required maxlength="4000" placeholder="Your question or update"></textarea></label>'+B('submit','Send Message')+'</form><div id="an-feedback" class="live-form-msg"></div></div>')+'</div>';
}
/* Replace old preview messaging with authenticated application workflow. */
const oldApply=applyPage,oldDrawApply=drawApply;
applyPage=function(id){
 if(!AN.user)return title('Secure Application','Log in before preparing your application.')+'<div class="wrap content">'+needAuth()+'</div>';
 if(!AN.isApproved&&!AN.isAdmin)return title('Account Approval Required','Your student account is awaiting administrator approval.')+'<div class="wrap content"><div class="live-panel"><h2>Awaiting Approval</h2><p>You may explore universities now. Your application form and private document uploads unlock once the team approves your account.</p><a class="btn" href="#/dashboard">My Dashboard →</a></div></div>';
 let html=oldApply(id);
 html=html.replace('<b>● PREVIEW MODE</b>','<b>● SECURE ACCOUNT</b>').replace('This is a design preview, not a submitted application. Please do not enter passport numbers or upload confidential documents until your private student portal is activated.','After reviewing the details, you can submit a real application to the secure student portal. Upload private files only via My Documents.');
 return html;
};
drawApply=function(){
 oldDrawApply();
 const el=document.querySelector('#apply-body');if(!el||!AN.user)return;
 if(draft.step===3){
  const h=el.querySelector('.notice');if(h)h.innerHTML='🔐 You can upload confidential application documents securely after submitting the application.';
  el.querySelectorAll('.doccard .badge').forEach(b=>b.textContent='Secure document portal');
  const row=el.querySelector('.row.between.mt');if(row)row.insertAdjacentHTML('beforebegin','<p><a class="cardlink" href="#/documents">Open My Private Documents →</a></p>');
 }
 if(draft.step===4){
  const notice=el.querySelector('.notice');if(notice)notice.textContent='Submitting here will create a real application record in your secure dashboard. Your admission and visa status are not guaranteed.';
  const finish=el.querySelector('[data-apply-nav="finish"]');if(finish)finish.textContent='Submit Application →';
 }
};
const oldSuccess=successPage;
successPage=function(){
 return title('Success Stories','Verified student experiences, university journeys and graduation moments.')
 +'<div class="wrap content page-scroll"><div id="an-story-grid" class="story-grid">'+storyMarkup()+'</div>'
 +'<div class="contact-action-card"><div><h3>Begin Your Own Journey</h3><p>Contact our team for university admission guidance and application support.</p></div><a class="btn" href="#/contact">Contact Our Team →</a></div></div>';
};
function storyMarkup(){
 if(!AN.loadedStory)return '<div class="story-empty">Loading published student journeys...</div>';
 const ss=AN.stories.filter(x=>x&&x.title&&/^https:\/\//i.test(x.media_url||'')&&x.approved===true);
 if(!ss.length)return '<div class="story-empty"><h3>Student Experiences</h3><p>Verified photos and videos will appear here when consent is recorded and our team publishes them.</p></div>';
 return ss.map(x=>'<article class="story-card">'
 +(x.type==='video'?'<video src="'+ed(x.media_url)+'" controls preload="metadata" playsinline></video>':'<img src="'+ed(x.media_url)+'" alt="'+ed(x.title)+'" loading="lazy">')
 +'<div class="inside"><h3>'+ed(x.title)+'</h3><p>'+ed(x.description||'')+'</p></div></article>').join('');
}
/* Keep the eight service cards and their single Contact Our Team CTA. */
contactPage=function(){
 return title('Contact Our Team','Reach out for university admission, accommodation and visa guidance.')
 +'<div class="wrap content"><div class="split"><div class="live-panel"><h2><span style="color:#ff8500">Our</span> Offices</h2><h3>🇲🇾 Malaysia Office</h3><p id="an-office-my">Kuala Lumpur, Malaysia</p><h3>🇧🇩 Bangladesh Office</h3><p id="an-office-bd">Rangpur, Bangladesh</p><p id="an-office-phone"></p><p id="an-office-email"></p></div><div class="live-panel"><h2>Send an Enquiry</h2><form id="an-contact-form"><div class="live-fieldgrid"><label>Your Name<input name="full_name" required maxlength="130"></label><label>Email<input type="email" name="email" required></label><label>Phone (optional)<input name="phone"></label><label>Interested Country<input name="country" placeholder="Malaysia"></label><label class="full">Message<textarea name="message" required maxlength="4000"></textarea></label></div><div class="mt">'+B('submit','Send Your Enquiry')+'</div></form><div id="an-feedback" class="live-form-msg"></div></div></div></div>';
};
function updateContact(){
 let s=AN.publicSettings;
 const map={'an-office-my':s.malaysiaOffice,'an-office-bd':s.bangladeshOffice,'an-office-phone':s.phone?'Phone: '+s.phone:'','an-office-email':s.email?'Email: '+s.email:''};
 for(let k in map){const el=document.getElementById(k);if(el&&map[k])el.textContent=map[k];}
}
async function hydrate(){
 repaintPublic();updateContact();
 const nav=document.getElementById('links');
 if(nav){let el=document.getElementById('an-admin-nav');if(AN.isAdmin&&!el){el=document.createElement('a');el.id='an-admin-nav';el.href='#/admin';el.textContent='Admin Panel';nav.appendChild(el);}else if(!AN.isAdmin&&el)el.remove();}
 if(!AN.user||!AN.db)return;
 const p=route();
 if(p==='dashboard'){const el=document.getElementById('an-dashboard-data');if(el){const{data,error}=await AN.db.from('an_applications').select('id,university_id,programme,status,emgs_percent,created_at').order('created_at',{ascending:false});if(!el.isConnected)return;el.innerHTML=error?ed(errorText(error)):data.length?'<h2>My Applications</h2>'+data.map(a=>'<div class="live-msg"><b>'+ed(a.university_id)+' — '+ed(a.programme)+'</b><p>'+statusBadge(a.status)+' EMGS '+Number(a.emgs_percent||0)+'% · '+dt(a.created_at)+'</p></div>').join(''):'<h2>No Applications Yet</h2><p>Your submitted applications will appear here.</p>';}}
 if(p==='tracking'){const el=document.getElementById('an-track-data');if(el){const {data,error}=await AN.db.from('an_applications').select('id,university_id,programme,emgs_percent,status,created_at').order('created_at',{ascending:false});if(el.isConnected)el.innerHTML=error?ed(errorText(error)):data.length?data.map(a=>'<div class="live-panel"><h2>'+ed(a.university_id)+' · '+ed(a.programme)+'</h2><p>'+statusBadge(a.status)+' · EMGS '+Number(a.emgs_percent||0)+'%</p><div class="progress"><div style="width:'+Math.min(100,Math.max(0,Number(a.emgs_percent||0)))+'%"></div></div><div class="live-msg-list" data-updates="'+ed(a.id)+'"></div></div>').join(''):'<p>No confirmed applications yet.</p>';if(data)for(const a of data){let q=document.querySelector('[data-updates="'+a.id+'"]');if(!q)continue;const updates=await AN.db.from('an_application_updates').select('title,body,created_at').eq('application_id',a.id).order('created_at',{ascending:false});q.innerHTML=(updates.data||[]).map(u=>'<p class="live-mini">'+dt(u.created_at)+' · '+ed(u.title)+': '+ed(u.body)+'</p>').join('');}}}
 if(p==='payments'){const el=document.getElementById('an-invoice-list');if(el){const {data,error}=await AN.db.from('an_invoices').select('title,amount,currency,status,note,created_at').order('created_at',{ascending:false});if(el.isConnected)el.innerHTML=error?ed(errorText(error)):data.length?'<h2>My Invoices</h2>'+data.map(x=>'<div class="live-msg"><b>'+ed(x.title)+' · '+ed(x.currency)+' '+Number(x.amount).toFixed(2)+'</b><p>'+statusBadge(x.status)+' · '+dt(x.created_at)+'</p><p>'+ed(x.note||'')+'</p></div>').join(''):'<h2>No Invoices</h2><p>Your verified invoices will appear here.</p>';}}
 if(p==='documents'){const list=document.getElementById('an-doc-list'),sel=document.getElementById('an-document-app');if(list){const [docs,apps]=await Promise.all([AN.db.from('an_documents').select('display_name,category,storage_path,created_at').order('created_at',{ascending:false}),AN.db.from('an_applications').select('id,university_id,programme').order('created_at',{ascending:false})]);if(!list.isConnected)return;sel&&(sel.innerHTML=(apps.data||[]).map(a=>'<option value="'+ed(a.id)+'">'+ed(a.university_id)+' · '+ed(a.programme)+'</option>').join(''));list.innerHTML=docs.error?ed(errorText(docs.error)):(docs.data||[]).map(d=>'<div class="live-msg"><b>'+ed(d.display_name)+'</b><p>'+ed(d.category)+' · '+dt(d.created_at)+'</p><button data-open-file="'+ed(d.storage_path)+'">Open securely ↗</button></div>').join('')||'<p>No documents uploaded.</p>';}}
 if(p==='messages')await loadMessages();
}
async function loadMessages(){
 let el=document.getElementById('an-message-list');if(!el||!AN.user)return;
 const{data,error}=await AN.db.from('an_messages').select('body,sender_id,created_at').eq('user_id',AN.user.id).order('created_at',{ascending:true}).limit(100);
 if(!el.isConnected)return;el.innerHTML=error?ed(errorText(error)):(data||[]).map(m=>'<div class="live-msg"><small>'+(m.sender_id===AN.user.id?'You':'A&N Team')+' · '+dt(m.created_at)+'</small>'+ed(m.body)+'</div>').join('')||'<p>No messages yet.</p>';
}
async function submitApplication(){
 if(!authRequired()){location.hash='#/login';return;}
 if(!AN.isApproved&&!AN.isAdmin){msg('Your student account needs staff approval before submission.');return;}
 saveStep();
 const university=U.find(u=>u.id===draft.university);
 const row={user_id:AN.user.id,country:draft.country||university?.country||'Malaysia',university_id:draft.university,programme:draft.programme, intake:draft.intake||'',applicant_name:draft.name||AN.user.user_metadata?.full_name||'Student',email:draft.email||AN.user.email||'',phone:draft.phone||'',nationality:draft.nationality||'',status:'submitted',emgs_percent:0};
 if(!row.university_id||!row.programme||!row.applicant_name){msg('Please complete the university, programme and applicant name fields.');return;}
 const {error}=await AN.db.from('an_applications').insert(row);if(error)msg('Could not submit: '+errorText(error));else{msg('Application submitted to your private dashboard.');location.hash='#/dashboard';}
}
document.addEventListener('click',async e=>{
 const final=e.target.closest('[data-apply-nav="finish"]');
 if(final){e.preventDefault();e.stopImmediatePropagation();if(!AN.db){msg('Secure connection not ready. Please try again.');return;}await submitApplication();return;}
 if(e.target.closest('#an-admin-switch-account')){if(AN.db)await AN.db.auth.signOut();await setUser(null);render();return;}
  if(e.target.closest('#an-logout')){await AN.db?.auth.signOut();await setUser(null);location.hash='#/home';return;}
 if(e.target.closest('#an-reset-password')){let email=document.querySelector('#an-auth-form [name=email]')?.value.trim();if(!email){msg('Enter your email address first.');return;}const{error}=await AN.db.auth.resetPasswordForEmail(email,{redirectTo:location.href.split('#')[0]});msg(error?errorText(error):'If the address is registered, you will receive a password reset email.');}
 const file=e.target.closest('[data-open-file]');if(file&&AN.db){let{data,error}=await AN.db.storage.from(PRIVATE_BUCKET).createSignedUrl(file.dataset.openFile,90);if(error)msg(errorText(error));else window.open(data.signedUrl,'_blank','noopener');}
},true);
document.addEventListener('submit',async e=>{
 const form=e.target,id=form.id;
 if(!['an-admin-auth-form','an-auth-form','an-housing-form','an-contact-form','an-document-form','an-message-form','an-change-password'].includes(id))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(!AN.db){msg('Secure platform is still connecting.');return;}
 const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
 try{
  const f=new FormData(form);
  if(id==='an-admin-auth-form'){
    const email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
    if(!email||!password)throw new Error('Enter the administrator email and password.');
    const {data,error}=await AN.db.auth.signInWithPassword({email,password});
    if(error)throw error;
    await setUser(data.user);
    if(!AN.isAdmin){
      await AN.db.auth.signOut();
      await setUser(null);
      render();
      throw new Error('It’s only for Admin. This email is not authorized to enter the Admin Panel.');
    }
    render();
    return;
   }
   if(id==='an-change-password'){const pw=String(f.get('password')||'');if(pw.length<8)throw Error('Password must be at least 8 characters.');const{error}=await AN.db.auth.updateUser({password:pw});if(error)throw error;msg('Password updated. You can now sign in.');location.hash='#/dashboard';}
  if(id==='an-auth-form'){
   const email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
   if(route()==='register'){if(password.length<8)throw Error('Password must be at least 8 characters.');const {data,error}=await AN.db.auth.signUp({email,password,options:{data:{full_name:String(f.get('full_name')||'').trim()},emailRedirectTo:location.href.split('#')[0]}});if(error)throw error;await setUser(data.user);msg(data.session?'Account created. Staff approval is required for application uploads.':'Check your email to confirm your account, then sign in.');if(data.session)location.hash='#/dashboard';}
   else{await loginAccount(email,password);}
  }
  if(id==='an-contact-form'){const row={full_name:String(f.get('full_name')||'').trim(),email:String(f.get('email')||'').trim(),phone:String(f.get('phone')||''),country:String(f.get('country')||''),message:String(f.get('message')||''),status:'new'};if(!row.full_name||!row.email||!row.message)throw Error('Please complete required fields.');const {error}=await AN.db.from('an_enquiries').insert(row);if(error)throw error;form.reset();msg('Your enquiry was submitted successfully.');}
  if(id==='an-housing-form'){if(!AN.user)throw Error('Please sign in.');const row={user_id:AN.user.id,room_type:String(f.get('room_type')),location:String(f.get('location')).trim(),notes:String(f.get('notes')||'')};const{error}=await AN.db.from('an_accommodation_requests').insert(row);if(error)throw error;form.reset();msg('Housing request submitted.');}
  if(id==='an-message-form'){if(!AN.user)throw Error('Please sign in.');const row={user_id:AN.user.id,sender_id:AN.user.id,body:String(f.get('body')||'').trim()};if(!row.body)throw Error('Type a message first.');const{error}=await AN.db.from('an_messages').insert(row);if(error)throw error;form.reset();msg('Message sent.');await loadMessages();}
  if(id==='an-document-form'){if(!AN.user||(!AN.isApproved&&!AN.isAdmin))throw Error('Account approval is required.');const file=f.get('file'),app=String(f.get('application_id')||'');const approved=['application/pdf','image/jpeg','image/png','image/webp'];if(!(file instanceof File)||!file.size||file.size>10485760||!approved.includes(file.type))throw Error('Choose PDF/JPG/PNG/WEBP no larger than 10 MB.');if(!app)throw Error('Please submit an application first.');const unique=(crypto.randomUUID?.()||Date.now().toString());const safeName=file.name.replace(/[^a-z0-9._-]/gi,'_').slice(-110);const path=AN.user.id+'/'+app+'/'+unique+'-'+safeName;const {error:uploadError}=await AN.db.storage.from(PRIVATE_BUCKET).upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;const row={application_id:app,owner_id:AN.user.id,storage_path:path,display_name:file.name,category:String(f.get('category')||'Supporting document'),mime_type:file.type,size_bytes:file.size,uploaded_by:AN.user.id};const{error}=await AN.db.from('an_documents').insert(row);if(error)throw Error('File uploaded but metadata failed. Please notify support: '+errorText(error));msg('Document securely uploaded.');await hydrate();}
 }catch(e2){const m=errorText(e2);msg(((id==='an-auth-form'||id==='an-admin-auth-form')&&/invalid login credentials/i.test(m))?'Email or password did not match a confirmed account. Check the address or use Reset Password below.':((id==='an-auth-form'||id==='an-admin-auth-form')&&/email not confirmed/i.test(m))?'Please verify your email using the confirmation link, then sign in.':m);}
 finally{if(submit&&submit.isConnected)submit.disabled=false;}
},true);
const originalRender=render;
render=function(){
 const p=route();
 if(p==='admin'){return window.ANRenderAdmin?.()||originalRender();}
 if(p==='messages'){document.body.classList.remove('home-view');app.innerHTML=messagesPage();document.title='Messages | A&N Overseas';window.scrollTo(0,0);}
 if(p==='reset-password'){
  document.body.classList.remove('home-view');
  app.innerHTML=title('Reset Password','Set a new password for your verified account.')+'<div class="wrap content"><div class="live-panel live-login"><form id="an-change-password"><label>New Password<input type="password" name="password" required minlength="8" autocomplete="new-password"></label><button class="btn mt" type="submit">Update Password</button></form><p id="an-feedback" class="live-form-msg"></p></div></div>';
  document.title='Reset Password | A&N Overseas';window.scrollTo(0,0);
 }
 else originalRender();
 queueMicrotask(()=>{repaintPublic();updateContact();if(typeof window.ANRenderPublicEnhancements==='function')window.ANRenderPublicEnhancements();hydrate();if(p==='success'){const grid=document.getElementById('an-story-grid');if(grid)grid.innerHTML=storyMarkup();}});
};
window.addEventListener('hashchange',()=>queueMicrotask(()=>render()));
function loadSDK(){
 const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.min.js';
 script.async=true;
 script.onload=async ()=>{
  try{const factory=window.supabase?.createClient;if(!factory)throw Error('Supabase SDK unavailable');
   AN.db=factory(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   const{data}=await AN.db.auth.getUser();await setUser(data.user);
   AN.ready=true;
   AN.db.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){location.hash='#/reset-password';}setTimeout(async()=>{await setUser(session?.user||null);render();},0);});
   await publicContent();render();
  }catch(e){msg('Secure platform could not connect: '+errorText(e));}
 };
 script.onerror=()=>msg('Secure login services could not be loaded. Check your connection.');
 document.head.appendChild(script);
}
window.ANLive.hydrate=hydrate;window.ANLive.refreshPublic=publicContent;window.ANLive.setUser=setUser;window.ANLive.msg=msg;window.ANLive.ed=ed;window.ANLive.dt=dt;window.ANLive.statusBadge=statusBadge;
loadSDK();
render();
})();