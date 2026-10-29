/* A&N Overseas: password-free pre-application, student ID portal,
 * administrative credential issuance and assisted password recovery.
 * Reuses only an_portal_* tables on the existing Supabase project. */
(function(){
'use strict';
const AN=window.ANLive;
if(!AN)return;
const E=window.esc||((v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])));
const currentRoute=()=>location.hash.replace(/^#\/?/,'').split('?')[0].split('/')[0];
const getUniversity=()=>location.hash.replace(/^#\/?/,'').split('?')[0].split('/')[1]||'';
const W=(text)=>'<div class="wrap content page-scroll"><section class="live-panel an-portal-panel">'+text+'</section></div>';
const heading=(name,sub)=>typeof title==='function'?title(name,sub):'<h1>'+E(name)+'</h1>';
const field=(label,name,type='text',required=true,value='')=>'<label class="an-portal-field"><span>'+E(label)+'</span><input type="'+type+'" name="'+name+'" '+(required?'required':'')+' value="'+E(value)+'" maxlength="254"></label>';
const intro=(which='')=>{
 const u=typeof U!=='undefined'?U.find(x=>x.id===which):null;
 return W('<h2>Start Your Application — No Password Required</h2><p>Submit your basic details and our admission team will contact you. This is an initial enquiry, not a confirmed university admission. A private account will be issued only after our team verifies the application and payment.</p>'+
 '<form id="an-portal-lead" class="an-portal-form">'+
 field('Full Name','full_name')+field('Contact Email','email','email')+field('Phone / WhatsApp','mobile','tel')+
 field('Preferred Country','country','text',true,u?.country||'Malaysia')+
 field('University (optional)','university','text',false,u?.name||'')+
 field('Programme (optional)','programme','text',false)+
 '<label class="an-portal-field"><span>Additional Notes (optional)</span><textarea name="note" rows="2" maxlength="900"></textarea></label>'+
 '<label style="display:none" aria-hidden="true">Website<input type="text" tabindex="-1" autocomplete="off" name="website_url"></label>'+
 '<button class="btn" type="submit">Submit Initial Application →</button></form>'+
 '<p id="an-portal-note" class="an-portal-note" role="status" aria-live="polite"></p>'+
 '<div class="an-portal-actions"><a href="#/login">Already have a Student ID? Sign In →</a></div>');
};
const studentLogin=()=>{
 if(AN.user)return previousAuth('login');
 if(location.hash.includes('method=email'))return previousAuth('login');
 return W('<h2>Student ID Login</h2><p>After confirmation, the A&N office provides a unique Student ID and temporary password. If your previous student account uses an email, use the alternate login below.</p>'+
 '<form id="an-portal-login" class="an-portal-form">'+
 field('Student ID','student_code','text',true)+
 field('Password','password','password',true)+
 '<button type="submit" class="btn">Open My Dashboard →</button></form>'+
 '<p id="an-portal-note" class="an-portal-note" role="status" aria-live="polite"></p>'+
 '<div class="an-portal-actions"><a href="#/password-help">Forgot Student ID / Password?</a><a href="#/register">First-time applicant? Apply Without Password</a><a href="#/login?method=email">Existing Email Login →</a></div>');
};
const ownerSetup=()=>heading('Owner Account Setup','Create the new A&N Overseas Admin identity securely.')+W(
 '<h2>A&N Overseas Owner Setup</h2><p>This is a one-time Auth registration for the owner email. It does not automatically grant administrator privileges; email ownership must be verified first. Please choose a <strong>new password</strong> that has never been posted in a chat.</p>'+
 '<form id="an-portal-owner-setup" class="an-portal-form">'+
 '<label class="an-portal-field"><span>Owner Email</span><input type="email" name="email" value="mehedialimayon@gmail.com" readonly required></label>'+
 field('Choose New Password (12+ characters)','password','password')+
 field('Confirm New Password','confirm_password','password')+
 '<button class="btn" type="submit">Create My Owner Login</button></form>'+
 '<p id="an-portal-note" class="an-portal-note" role="status"></p>'+
 '<p>After verification, your ownership can be added to the A&N administrator access table. The old FieldForce account will not be touched.</p>'
);
const help=()=>heading('Password Help','Ask the A&N team to verify and reset your student account.')+W(
 '<h2>Forgot Student ID / Password</h2><p>Send a request to our team. Your identity will be checked before a temporary password is issued. We do not retrieve or send old passwords.</p>'+
 '<form id="an-portal-help" class="an-portal-form">'+field('Student ID (optional — leave blank if forgotten)','student_code','text',false)+
 field('Your Name','contact_name','text',false)+field('Your Email or Phone','contact_method')+
 '<label class="an-portal-field"><span>Request Notes (optional)</span><textarea name="note" maxlength="450" rows="2"></textarea></label>'+
 '<button class="btn" type="submit">Send Help Request →</button></form>'+
 '<p id="an-portal-note" role="status" class="an-portal-note"></p>'+
 '<div class="an-portal-actions"><a href="#/login">← Student Login</a><a href="#/contact">Contact Our Office</a></div>');
const previousAuth=window.authPage,previousApply=window.applyPage;
window.authPage=function(mode){if(mode==='register'&&!AN.user)return heading('Apply Without Password','First-time student enquiries')+intro();if(mode==='login')return heading('Secure Student Login','Use your issued Student ID or existing email account')+studentLogin();return previousAuth(mode);};
window.applyPage=function(id){if(!AN.user)return heading('Start Your Application','No password required for your first enquiry')+intro(id||'');return previousApply(id);};
function status(msg,error=false){
 const el=document.getElementById('an-portal-note');
 if(el){el.textContent=msg;el.style.color=error?'#ff8e88':'#b8f1c8';}
}
async function invokePublic(body){
 if(!AN.db)throw new Error('Connection is still loading. Please try again.');
 const {data,error}=await AN.db.functions.invoke('an-portal-public',{body});
 if(error)throw new Error(data?.error||error.message||'Service unavailable');
 if(data?.error)throw new Error(data.error);
 return data;
}
async function invokeAdmin(body){
 if(!AN.isAdmin||!AN.db)throw new Error('Only an authorized administrator can perform this action.');
 const{data,error}=await AN.db.functions.invoke('an-portal-admin',{body});
 if(error)throw new Error(data?.error||error.message||'Secure admin request failed');
 if(data?.error)throw new Error(data.error);
 return data;
}
async function dashboard(){
 if(!AN.isAdmin)return heading('Admin Restricted','Only the registered A&N administrator may open this page.')+W('<h2>Admin Only</h2><a class="btn" href="#/admin">Secure Admin Login →</a>');
 return heading('Student Enquiries & Accounts','Manage initial applications, verified payments, Student IDs and password assistance.')+
 '<div class="wrap content page-scroll"><div class="an-portal-actions"><a href="#/admin">← Admin Control Panel</a><a href="#/home">Website</a></div>'+
 '<section class="live-panel an-portal-panel"><h2>Student Portal Management</h2><p>Confirm payments only after you personally verify them. Credentials are generated securely and displayed once; they are never stored in this history.</p>'+
 '<label class="an-portal-field"><span>Search Name / Email / Mobile / Student ID</span><input type="search" id="an-portal-search" placeholder="Search all records..."></label>'+
 '<div class="an-portal-tabs"><button class="btn" type="button" data-portal-tab="leads">New Applications</button><button class="btn outline" type="button" data-portal-tab="accounts">Student Accounts</button><button class="btn outline" type="button" data-portal-tab="help">Forgot Password</button><button class="btn outline" type="button" data-portal-tab="history">History</button></div>'+
 '<p id="an-portal-note" class="an-portal-note" role="status"></p><div id="an-portal-secret"></div><div id="an-portal-records"><p>Loading records…</p></div></section></div>';
}
let cache={leads:[],accounts:[],help:[],history:[]},tab='leads';
async function loadAdmin(){
 if(currentRoute()!=='student-requests'||!AN.isAdmin||!AN.db)return;
 const tables=[['leads','an_portal_leads'],['accounts','an_portal_accounts'],['help','an_portal_help'],['history','an_portal_history']];
 const data=await Promise.all(tables.map(async([key,table])=>{
  const {data,error}=await AN.db.from(table).select('*').order('created_at',{ascending:false}).limit(150);
  return {key,items:data||[],error:error?.message};
 }));
 const errors=data.filter(x=>x.error);if(errors.length)status('Some records could not be loaded: '+errors.map(x=>x.key).join(', '),true);
 for(const item of data)cache[item.key]=item.items;
 paint();
}
function card(text){return '<article class="an-portal-item">'+text+'</article>';}
function paint(){
 const node=document.getElementById('an-portal-records');if(!node)return;
 const term=(document.getElementById('an-portal-search')?.value||'').trim().toLowerCase();
 const matches=r=>!term||JSON.stringify(r).toLowerCase().includes(term);
 const items=(cache[tab]||[]).filter(matches);
 const safeDate=v=>v?new Date(v).toLocaleString('en-MY'):'—';
 const byTab={
 leads:r=>card('<h3>'+E(r.full_name)+'</h3><p>'+E(r.email)+' · '+E(r.mobile)+'</p><p>'+E(r.country)+' / '+E(r.university||'Any university')+' / '+E(r.programme||'Programme not chosen')+'</p><p>Status: '+E(r.state)+' · Payment: '+E(r.payment_status)+' · '+safeDate(r.created_at)+'</p>'+
 (r.payment_status==='confirmed'?'<button class="btn" data-portal-issue="'+E(r.id)+'">Issue Student ID + Password</button>':'<button class="btn outline" data-portal-confirm="'+E(r.id)+'">I Verified Payment — Approve</button>')),
 accounts:r=>card('<h3>'+E(r.full_name)+' · '+E(r.student_code)+'</h3><p>'+E(r.contact_email)+' · '+E(r.mobile)+'</p><p>Status: '+E(r.account_status)+' · '+(r.first_password_change_due?'Temporary password active':'Password changed')+'</p><label class="an-portal-field"><span>How did you verify this student?</span><input name="verify-'+E(r.student_code)+'" placeholder="Verified via known phone / in person" maxlength="130"></label><button class="btn outline" data-portal-reset="'+E(r.student_code)+'">Issue New Temporary Password</button>'),
 help:r=>card('<h3>'+E(r.student_code)+' · '+E(r.status)+'</h3><p>'+E(r.contact_name)+' · '+E(r.contact_method)+'</p><p>'+E(r.note)+'</p><p>'+safeDate(r.created_at)+'</p><a href="#/contact">Contact details / Verify identity</a>'),
 history:r=>card('<h3>'+E(r.action)+'</h3><p>'+E(r.student_code)+' · '+safeDate(r.created_at)+'</p><p>'+E(JSON.stringify(r.details||{}))+'</p>')
 };
 node.innerHTML=items.length?items.map(byTab[tab]).join(''):'<p>No matching records.</p>';
 document.querySelectorAll('[data-portal-tab]').forEach(b=>b.classList.toggle('outline',b.dataset.portalTab!==tab));
}
function showTemporary(data){
 const el=document.getElementById('an-portal-secret');if(!el)return;
 el.innerHTML='<div class="an-portal-credentials"><h3>Show This Once — Private Student Credentials</h3><p>Student ID: <strong>'+E(data.student_code)+'</strong></p><p>Temporary Password: <code>'+E(data.temporary_password)+'</code></p><button type="button" class="btn" id="an-portal-copy-credentials">Copy Credentials</button> <button type="button" class="btn outline" id="an-portal-hide-credentials">Dismiss & Clear</button><p>Share privately with the verified student. The temporary password is not stored in portal history.</p></div>';
 el.dataset.studentCode=data.student_code;el.dataset.temporaryPassword=data.temporary_password;
}
document.addEventListener('input',e=>{if(e.target?.id==='an-portal-search')paint();});
document.addEventListener('submit',async e=>{
 const form=e.target;
 if(!['an-portal-lead','an-portal-login','an-portal-help','an-portal-owner-setup'].includes(form?.id))return;
 e.preventDefault();e.stopImmediatePropagation();
 const btn=form.querySelector('button[type=submit]');if(btn)btn.disabled=true;
 const f=Object.fromEntries(new FormData(form).entries());
 try{
  if(form.id==='an-portal-owner-setup'){
    const email=String(f.email||'').trim().toLowerCase();
    const password=String(f.password||'');
    if(email!=='mehedialimayon@gmail.com')throw new Error('This owner setup is only for the approved A&N email.');
    if(password.length<12||password!==String(f.confirm_password||''))throw new Error('Choose a unique password of at least 12 characters and confirm it correctly.');
    if(!AN.db)throw new Error('Login service is not ready.');
    const {data,error}=await AN.db.auth.signUp({email,password,options:{emailRedirectTo:'https://mehedialimayon-del.github.io/salesman-performance-app/an-overseas/'}});
    if(error)throw error;
    form.reset();
    status(data.session?'Account created. Please contact A&N management for role activation.':'Registration request accepted. Verify your email, then request admin role activation.');
  }else if(form.id==='an-portal-lead'){
    const d=await invokePublic({...f,action:'lead'});
    form.reset();status(d.message||'Your application has been submitted.');
  }else if(form.id==='an-portal-help'){
    const d=await invokePublic({...f,action:'help'});
    form.reset();status(d.message||'Your request has been submitted.');
  }else{
    const d=await invokePublic({...f,action:'login'});
    const {data,error}=await AN.db.auth.setSession({access_token:d.access_token,refresh_token:d.refresh_token});
    if(error||!data?.user)throw new Error('Unable to open your account. Contact the team.');
    await AN.setUser(data.user);
    location.hash='#/dashboard';
    window.render();
  }
 }catch(err){status(err?.message||'Unable to submit. Please try again.',true);}
 finally{if(btn?.isConnected)btn.disabled=false;}
},true);
document.addEventListener('click',async e=>{
 const t=e.target.closest('[data-portal-confirm],[data-portal-issue],[data-portal-reset],[data-portal-tab],#an-portal-hide-credentials,#an-portal-copy-credentials');
 if(!t)return;
 if(t.dataset.portalTab){tab=t.dataset.portalTab;paint();return;}
 if(t.id==='an-portal-hide-credentials'){const el=document.getElementById('an-portal-secret');if(el){el.replaceChildren();el.dataset.studentCode='';el.dataset.temporaryPassword='';}return;}
 if(t.id==='an-portal-copy-credentials'){
  const el=document.getElementById('an-portal-secret');const str='Student ID: '+(el?.dataset.studentCode||'')+'\nTemporary Password: '+(el?.dataset.temporaryPassword||'');
  try{await navigator.clipboard.writeText(str);status('Credentials copied. Share only through a verified private channel.');}catch{status('Clipboard unavailable. Copy the credentials manually.',true);}return;
 }
 if(!AN.isAdmin)return;
 if(t.dataset.portalConfirm&&!window.confirm('Have you personally verified that this student paid? This is a manual administrative confirmation.'))return;
 if(t.dataset.portalReset&&!window.confirm('Have you independently verified this student’s identity? The previous password will be invalidated.'))return;
 t.disabled=true;
 try{
  let action=t.dataset.portalConfirm?'confirm_payment':t.dataset.portalIssue?'issue':'reset';
  let body={action};
  if(action==='confirm_payment'||action==='issue')body.lead_id=t.dataset.portalConfirm||t.dataset.portalIssue;
  if(action==='reset'){
   body.student_code=t.dataset.portalReset;
   body.verification_method=document.querySelector('[name="verify-'+body.student_code+'"]')?.value||'';
   if(body.verification_method.trim().length<8)throw new Error('Describe how the student’s identity was verified before resetting.');
  }
  const result=await invokeAdmin(body);
  if(result.temporary_password)showTemporary(result);
  status(result.message||'Admin action completed.');
  await loadAdmin();
 }catch(err){status(err?.message||'Unable to save.',true);}
 finally{if(t.isConnected)t.disabled=false;}
});
const oldAdmin=window.ANRenderAdmin;
if(typeof oldAdmin==='function'){
 window.ANRenderAdmin=function(){
   const result=oldAdmin();
   if(AN.isAdmin){
    const wrap=document.querySelector('.wrap.content.page-scroll .live-controls');
    if(wrap&&!document.getElementById('an-portal-admin-link')){
      const a=document.createElement('a');a.id='an-portal-admin-link';a.href='#/student-requests';a.textContent='Student Applications & Password Help';wrap.appendChild(a);
    }
   }
   return result;
 };
}
const priorRender=window.render;
window.render=function(){
 if(currentRoute()==='student-requests'){
  document.body.classList.remove('home-view');
  const appNode=document.getElementById('app');
  if(appNode)appNode.innerHTML=AN.isAdmin?dashboard():heading('Admin Access Required','Private Student Management')+W('<h2>Only for Admin</h2><a class="btn" href="#/admin">Go to Secure Admin Login →</a>');
  document.title='Student Management | A&N Overseas';
  if(AN.isAdmin)void loadAdmin();
  return;
 }
 if(currentRoute()==='owner-setup'){
  document.body.classList.remove('home-view');document.getElementById('app').innerHTML=ownerSetup();document.title='Owner Login Setup | A&N Overseas';return;
 }
 if(currentRoute()==='password-help'){
  document.body.classList.remove('home-view');document.getElementById('app').innerHTML=help();document.title='Password Help | A&N Overseas';return;
 }
 return priorRender();
};
window.ANPortal={refresh:loadAdmin};
})();
