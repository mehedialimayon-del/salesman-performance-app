window.FFH_CREATE_ACCOUNTS=ctx=>async function(){
 'use strict';const {FFH_SUPABASE:sb,shell,back,esc:E,bindBack,q,qa}=ctx,me=ctx.user(),owner=me.id==='M21954';let admin=owner;const headId='PERVES_HIRA';
 const moduleLabels={accounts:'SR Management / Zones / Access',sales:'Daily Sales',income:'Income / Targets / Incentives & Penalties',tasks:'Tasks / Notes / Reminders',cpo:'CPO / Promotion',catalogue:'Catalogue / Product Master',outlets:'Outlet Assignment',routes:'Route Plan / Monthly Plan',proposals:'Proposal PDF Library',briefings:'Meeting / Notice Board',settings:'Notification Timing / App Settings',claims:'Bills & Claims',notifications:'Send Notifications / Alarms',contacts:'Contacts / Company Directory',income_salary:'Income → Basic / Allowances',income_targets:'Income → Actual / Planning / SKU Targets',income_commission:'Income → Commission Categories / Rates',income_incentives:'Income → Issue Incentive',income_penalties:'Income → Issue Penalty'};
 const modules=['accounts','sales','income','tasks','cpo','catalogue','outlets','routes','proposals','briefings','settings','claims','notifications','contacts','income_salary','income_targets','income_commission','income_incentives','income_penalties'];
 const rpc=async(action,payload={})=>{const {data,error}=await sb.rpc('ffh_governance',{action,payload});if(error)throw Error(error.message);return data;};
 const api=async body=>{let {data,error}=await sb.functions.invoke('ffh-accounts',{body});if(error){try{const detail=await error.context?.json();if(detail?.error)throw Error(detail.error);}catch(e){if(e.message!==error.message&&e.message!=='Unexpected end of JSON input')throw e;}throw Error(error.message+' · Your changes were not confirmed. Retry after reconnecting.');}if(data?.error)throw Error(data.error);return data;};
 let accountReturnScreen=null,skipNextAccountHistory=false;
 const page=(title,html)=>{
  const root=title==='Staff, Zones & Permissions'||title==='Staff Management';
  const returnScreen=root?null:(title==='Owner · Archived staff data'?'deleted-history':'directory');
  if(returnScreen&&!skipNextAccountHistory){
   window.history.pushState({ffhPage:'control:users',ffhAccountSubview:true,returnScreen},'',window.location.href);
  }
  accountReturnScreen=returnScreen;
  ctx.setPage?.('control:users');
  const header=back(title)
   .replace('class="head ffNoScreenBack"','class="head ffAccountNavHeader" data-ff-account-subpage="'+(returnScreen?'true':'false')+'"')
   .replace('<h1>','<button type="button" id="back" class="secondary ffAccountPageBack" aria-label="Back to previous screen">‹ BACK</button><h1>');
  shell(header+html);bindBack();
  const goBack=q('#back');
  if(goBack)goBack.onclick=()=>{if(window.history.length>1)window.history.back();else if(accountReturnScreen)home();};
 };
 const accountHardwareBack=e=>{
  if(!accountReturnScreen||!q('.ffAccountNavHeader[data-ff-account-subpage="true"]'))return;
  e.stopImmediatePropagation();
  const target=accountReturnScreen;accountReturnScreen=null;skipNextAccountHistory=true;
  const restore=target==='deleted-history'?deletedStaffHistory():home();
  Promise.resolve(restore).catch(error=>alert(error.message)).finally(()=>{skipNextAccountHistory=false;});
 };
 window.__FFH_ACCOUNT_BACK_HANDLER=accountHardwareBack;
 if(!window.__FFH_ACCOUNT_BACK_BOUND){
  window.__FFH_ACCOUNT_BACK_BOUND=true;
  window.addEventListener('popstate',e=>window.__FFH_ACCOUNT_BACK_HANDLER?.(e),true);
 }

 const busy=async(button,work)=>{button.disabled=true;try{await work();}catch(e){alert(e.message);}finally{if(button.isConnected)button.disabled=false;}};
 let data;
 async function load(){data=await rpc('state');admin=owner||data.administrator===true;data.profiles??=[];data.zones??=[];data.grants??=[];data.zone_access??=[];data.requests??=[];}
 function editor(p={}){
  if(!admin||p.staff_id==='M21954'||(!owner&&(p.staff_id===me.id||p.staff_id===headId)))return;const existing=!!p.staff_id,access=data.zone_access.filter(x=>x.staff_id===p.staff_id).map(x=>x.zone_id),grants=data.grants.filter(x=>x.staff_id===p.staff_id);
  const designation=p.designation||p.role||'SR',head=p.staff_id===headId;
  page(existing?'Edit staff, team & access':'Create staff account',`<div class="card"><form class="form" id="ffAccountForm">
  ${existing?`<input name="staff_id" type="hidden" readonly value="${E(p.staff_id)}"><label>Staff ID / Login User ID · editable by Ayon<input name="company_staff_id" pattern="[A-Za-z][A-Za-z0-9_-]{2,29}" ${owner?'':'readonly'} value="${E(p.company_staff_id??(Object.hasOwn(p,'company_staff_id')?'':p.staff_id))}" placeholder="Not assigned — add later"></label>`:`<label>Staff ID / Login User ID<input name="staff_id" required pattern="[A-Za-z][A-Za-z0-9_-]{2,29}"></label>`}
  <p id="ffLoginIdPreview" aria-live="polite">Login User ID: <b>${E(String((p.company_staff_id ?? p.staff_id) || '').toUpperCase())||'—'}</b> · Same as Staff ID${existing&&p.has_login===false?' · Set a password below to enable login.':''}</p><p id="ffLoginIdConflict" role="alert" hidden></p><button type="button" class="secondary" id="ffEditExistingLoginId" hidden>EDIT EXISTING STAFF ACCOUNT</button><label>Full name<input name="full_name" required maxlength="150" value="${E(p.full_name||'')}"></label>
  <label>Position<select name="designation">${['SR','MANAGER','SALES_ADMIN','HEAD_OF_SALES','MD','ACCOUNTS'].map(r=>`<option ${r===designation?'selected':''}>${r}</option>`).join('')}</select></label>
  <label>Dashboard title (optional)<input name="display_title" maxlength="150" value="${E(p.display_title||'')}" placeholder="e.g. Sales Admin / Regional Manager"></label>
  <label>Home zone<select name="zone_id">${data.zones.filter(z=>z.active).map(z=>`<option value="${E(z.id)}" ${z.id===p.zone_id?'selected':''}>${E(z.name)}</option>`).join('')}</select></label>
  <label>Reports to manager<select name="manager_id"><option value="">Not assigned</option>${data.profiles.filter(x=>x.can_manage&&x.active&&x.staff_id!==p.staff_id).map(x=>`<option value="${E(x.staff_id)}" data-zone="${E(x.zone_id)}" ${x.staff_id===p.manager_id?'selected':''}>${E(x.full_name)} · ${E(x.zone_id)}</option>`).join('')}</select></label>
  <label>Team name<input name="team_name" value="${E(p.team_name||'')}"></label><label>Route name<input name="route_name" maxlength="150" value="${E(p.route_name||'')}"></label>
  <label><input name="can_sell" type="checkbox" ${p.can_sell===true||!existing?'checked':''}> Own SR route (dual role; one basic salary)</label>
  <fieldset><legend>Dashboard & reports: permitted zones</legend><label><input type="checkbox" id="ffAllZones" ${access.includes('*')?'checked':''} ${owner?'':'disabled'}> All zones, including future zones</label>${data.zones.filter(z=>z.active||access.includes(z.id)).map(z=>`<label><input class="ffAccessZone" type="checkbox" value="${E(z.id)}" ${access.includes(z.id)?'checked':''}> ${E(z.name)}${z.active?'':' · INACTIVE'}</label>`).join('')}<p>Home-zone managers see their zone. Additional zones above extend that scope. SR sees own operational data.</p></fieldset>
  ${owner&&existing?(window.FFH_ACCOUNT_OUTLETS?.markup(p)||''):''}<fieldset><legend>Edit / Upload / Delete · owner delegation</legend><div class="ffPermissionTable"><div class="ffPermissionRow"><b>Module</b><b>Edit</b><b>Upload</b><b>Delete</b></div>${modules.map(m=>{const g=grants.find(x=>x.module===m)||(m.startsWith('income_')?grants.find(x=>x.module==='income'):null)||grants.find(x=>x.module==='*')||{};return `<div class="ffPermissionRow" data-module="${m}"><span>${E(moduleLabels[m]||m)}</span>${['edit','upload','delete'].map(v=>`<label><input aria-label="${m} ${v}" type="checkbox" data-verb="${v}" ${g['can_'+v]?'checked':''}></label>`).join('')}</div>`}).join('')}</div><p>Home buttons covered: Offline Sync, Approval Inbox, Attendance, Live Communication, Tasks, Meeting / Notice, SR Tracking, Daily Sales, Dashboard, Zero Sales, Route Plan, Reports, Outlet History, CPO / Promotion / Incentives, Income, Proposals, Catalogue, Contacts, Manager Control, Access Requests and AI. Offline Sync, Reports, Dashboard, Zero Sales and Outlet History read permitted operational data; attendance, own task proof and private chat are personal actions. Staff and zone scopes above control visibility. SR accounts do not show Manager Control or Access Requests. Ticker changes and passwords are owner-only.</p><p>Unchecked means view only within the assigned zone/team. Edit, Upload and Delete are independent. Only Ayon changes passwords, delegates administrators, or grants AI_ACCESS. A position alone does not grant edits.</p></fieldset>
  ${owner&&!head?`<fieldset><legend>AI_BASE · separate owner permission</legend><label><input name="ai_access" type="checkbox" ${grants.some(g=>g.module==='kb'&&g.can_edit)?'checked':''}> AI_ACCESS — open and manage AI_BASE</label><p>Off by default. Only Ayon can grant or revoke this access. All-module and administrator access do not enable it.</p></fieldset>`:''}
  ${owner&&!head?`<label><input name="administrator" type="checkbox" ${p.owner_access?'checked':''}> Delegated administrator (cannot change Ayon; owner can revoke)</label>`:''}
  ${head?'<p>PERVES HIRA · Only Ayon controls this account. AI_BASE editing is disabled. Unchecked module permissions mean view only.</p>':''}<label id="ffOwnRouteTarget">Own SR route monthly target RM<input name="monthly_target" type="number" min="${p.target_pending?0:50000}" value="${p.target_pending?0:p.monthly_target||50000}" required></label><p id="ffManagementTargetNote">Management sales targets and planning targets combine automatically from permitted SR routes. Personal income is set separately.</p>
  ${owner||!existing?`<label>${existing&&p.has_login!==false?'New password (blank keeps current, minimum 6 characters)':'Set initial login password (minimum 6 characters)'}<input name="password" type="password" minlength="6" autocomplete="new-password" ${existing?'':'required'}></label>
  <label>Confirm password<input name="confirm_password" type="password" autocomplete="new-password"></label>`:''}
  <label><input name="active" type="checkbox" ${p.active!==false?'checked':''}> Active login</label>
  <button class="primary">SAVE ACCOUNT & ACCESS</button><button type="button" class="secondary" id="ffCancelAccount">BACK TO STAFF</button><p id="ffAccountResult" role="status"></p></form></div>`);
  const f=q('#ffAccountForm');
  // Baseline SR rights are role-derived, not a new delegated permission grant.
  // Show the effective right as a readonly tick without granting cross-staff edits.
  const ffSrUpload=f.querySelector('.ffPermissionRow[data-module="sales"] [data-verb="upload"]');
  const ffExplicitSalesUpload=grants.some(g=>g.module==='sales'&&g.can_upload===true);
  const ffSyncBuiltIn=()=>{
   if(!ffSrUpload||ffExplicitSalesUpload)return;
   const required=f.elements.can_sell.checked||f.elements.designation.value==='SR';
   ffSrUpload.dataset.ffBuiltIn=required?'1':'0';
   ffSrUpload.checked=required;
   ffSrUpload.disabled=required;
   ffSrUpload.title=required?'Included in SR role: own Daily Sales submission. To revoke, change SR role/access in the supported staff settings.':'Additional Daily Sales upload delegation';
   const row=ffSrUpload.closest('.ffPermissionRow');
   let note=row?.querySelector('.ffBuiltInAccessNote');
   if(required&&!note){note=document.createElement('small');note.className='ffBuiltInAccessNote';note.textContent='✓ Built-in SR permission · own Daily Sales. Separate Edit/Delete grants are optional.';row.querySelector('span')?.append(note);}
   if(!required)note?.remove();
  };
  f.elements.can_sell.addEventListener('change',ffSyncBuiltIn);
  f.elements.designation.addEventListener('change',ffSyncBuiltIn);
  ffSyncBuiltIn();

  if(owner&&existing&&window.FFH_ACCOUNT_OUTLETS){
   window.FFH_ACCOUNT_OUTLETS.wire({form:f,staff:p,client:sb,onRefresh:()=>ctx.ffhLoadCloud?.()});
  }
  const loginIdInput=f.elements.company_staff_id||f.elements.staff_id;const conflictingStaff=()=>{const value=String(loginIdInput.value||'').trim().toUpperCase();return value?data.profiles.find(x=>x.staff_id!==p.staff_id&&(String(x.staff_id||'').toUpperCase()===value||String(x.company_staff_id||'').toUpperCase()===value)):null;};const syncLoginPreview=()=>{const value=String(loginIdInput.value||'').trim().toUpperCase();q('#ffLoginIdPreview b').textContent=value||'—';const duplicate=conflictingStaff(),notice=q('#ffLoginIdConflict'),jump=q('#ffEditExistingLoginId');notice.hidden=!duplicate;jump.hidden=!duplicate;if(duplicate){notice.textContent='Staff ID '+value+' is already assigned to '+(duplicate.full_name||duplicate.staff_id)+' ('+duplicate.staff_id+'). To set that ID and password, edit the existing account instead. No accounts or history will be merged automatically.';jump.onclick=()=>editor(duplicate);}};loginIdInput.addEventListener('input',syncLoginPreview);loginIdInput.addEventListener('blur',()=>{if(!loginIdInput.readOnly){loginIdInput.value=String(loginIdInput.value||'').trim().toUpperCase();syncLoginPreview();}});syncLoginPreview();const syncTarget=()=>{const own=f.elements.designation.value==='SR'||f.elements.can_sell.checked;f.elements.monthly_target.disabled=!own;f.elements.monthly_target.required=own;q('#ffOwnRouteTarget').hidden=!own;q('#ffManagementTargetNote').hidden=own;};f.elements.can_sell.onchange=syncTarget;f.elements.designation.onchange=syncTarget;syncTarget();const showManagers=()=>{[...f.elements.manager_id.options].forEach(o=>{o.hidden=!!o.value&&o.dataset.zone!==f.elements.zone_id.value;});if(f.elements.manager_id.selectedOptions[0]?.hidden)f.elements.manager_id.value='';};showManagers();f.elements.zone_id.onchange=showManagers;
  q('#ffCancelAccount').onclick=home;q('#ffAllZones').onchange=e=>qa('.ffAccessZone').forEach(x=>x.disabled=e.target.checked);q('#ffAllZones').dispatchEvent(new Event('change'));
  f.onsubmit=async e=>{e.preventDefault();await busy(e.submitter,async()=>{
   const duplicate=conflictingStaff();if(duplicate)throw Error('Staff ID '+String(loginIdInput.value||'').trim().toUpperCase()+' is already in use by '+(duplicate.full_name||duplicate.staff_id)+' ('+duplicate.staff_id+'). Use EDIT EXISTING STAFF ACCOUNT above.');const b=Object.fromEntries(new FormData(f));if(!owner)delete b.company_staff_id;if(b.password!==b.confirm_password)throw Error('Passwords do not match');delete b.confirm_password;if(!b.password)delete b.password;
   b.role=b.designation==='SR'?'SR':'MANAGER';b.business_title=b.designation;b.can_sell=b.designation==='SR'||f.elements.can_sell.checked;if(!b.can_sell)b.monthly_target=0;b.active=f.elements.active.checked;b.owner_access=owner&&!head?f.elements.administrator.checked:false;b.action=existing?'update':'create';
   // Account creation uses Auth Admin; access changes use the owner's authenticated DB transaction.
   const result=await api(b);const id=result.staff_id||b.staff_id;
   try{await rpc('save_access',{staff_id:id,designation:b.designation,manager_id:b.manager_id,team_name:b.team_name,route_name:b.route_name,zones:q('#ffAllZones').checked?['*']:qa('.ffAccessZone:checked').map(x=>x.value),...(owner?{administrator:!head&&f.elements.administrator.checked}:{}),grants:[...qa('.ffPermissionRow[data-module]').map(row=>({module:row.dataset.module,...Object.fromEntries(['edit','upload','delete'].map(v=>['can_'+v,(row.querySelector('[data-verb='+v+']').dataset.ffBuiltIn==='1'?false:row.querySelector('[data-verb='+v+']').checked)]))})),...(owner?[{module:'kb',can_edit:!head&&f.elements.ai_access.checked,can_upload:!head&&f.elements.ai_access.checked,can_delete:!head&&f.elements.ai_access.checked}]:[])]});}
   catch(err){throw Error('Account profile saved; access settings were not saved. Open Edit and retry: '+err.message);}
   if(f.elements.password){f.elements.password.value='';f.elements.confirm_password.value='';}q('#ffAccountResult').textContent='Account and permissions saved. Password changes are owner-only.';await load();await ctx.ffhLoadCloud();
  });};
 }

 function replaceSR(p){
  if(!owner||!p||p.can_sell!==true||p.can_manage===true)return;
  const current=String(p.company_staff_id||p.staff_id||'').toUpperCase();
  page('Replace SR · Keep Route & Sales','<div class="card"><div class="cardTitle">REPLACE SR · SAME DASHBOARD</div>'
   +'<p>Existing SR: <b>'+E(p.full_name||'')+'</b> · '+E(current)+'</p>'
   +'<p><b>Route, outlets, target, past sales and reporting records stay on this dashboard.</b> Only the staff name, login ID and password change. The outgoing SR loses access. No route transfer or deletion is needed.</p>'
   +'<form id="ffReplaceSRForm" class="form">'
   +'<label>New SR full name<input name="full_name" maxlength="150" required placeholder="New SR name"></label>'
   +'<label>New SR Staff ID / Login User ID<input name="new_staff_id" required pattern="[A-Za-z][A-Za-z0-9_-]{2,29}" placeholder="e.g. M22550" autocomplete="off"></label>'
   +'<p id="ffReplaceSrConflict" role="alert" hidden></p>'
   +'<label>New password (minimum 6 characters)<input type="password" name="password" minlength="6" required autocomplete="new-password"></label>'
   +'<label>Confirm password<input type="password" name="confirm_password" minlength="6" required autocomplete="new-password"></label>'
   +'<button class="primary" type="submit">REPLACE SR · KEEP DASHBOARD</button>'
   +'<button type="button" class="secondary" id="ffReplaceSrBack">BACK TO STAFF</button>'
   +'</form></div>');
  const f=q('#ffReplaceSRForm'),note=q('#ffReplaceSrConflict');
  const conflict=()=>{const id=String(f.elements.new_staff_id.value||'').trim().toUpperCase();return data.profiles.find(x=>x.staff_id!==p.staff_id&&(String(x.staff_id||'').toUpperCase()===id||String(x.company_staff_id||'').toUpperCase()===id));};
  const validate=()=>{
   const duplicate=conflict(),id=String(f.elements.new_staff_id.value||'').trim().toUpperCase();
   note.hidden=!duplicate&&id!==current&&id!==p.staff_id;
   if(duplicate)note.textContent='This ID belongs to '+(duplicate.full_name||duplicate.staff_id)+' ('+duplicate.staff_id+'). Existing profiles cannot be replaced or merged. Use an unused Staff ID.';
   else if(id===current||id===p.staff_id)note.textContent='Enter the NEW employee Staff ID; it must be different from the outgoing ID.';
   return duplicate;
  };
  f.elements.new_staff_id.addEventListener('input',validate);
  q('#ffReplaceSrBack').onclick=home;
  f.onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{
   const newId=String(f.elements.new_staff_id.value||'').trim().toUpperCase(),name=String(f.elements.full_name.value||'').trim();
   if(validate()||newId===current||newId===p.staff_id)throw Error(note.textContent||'Choose an unused Staff ID');
   if(f.elements.password.value!==f.elements.confirm_password.value)throw Error('Passwords do not match');
   if(f.elements.password.value.length<6)throw Error('Password needs at least 6 characters');
   if(!confirm('Replace '+p.full_name+' with '+name+' ('+newId+') on the SAME route? Previous sales, target, outlets and history remain attached to this dashboard; the departing SR login will be disabled.'))return;
   const result=await api({action:'replace_sr',staff_id:p.staff_id,new_staff_id:newId,full_name:name,password:f.elements.password.value});
   f.elements.password.value='';f.elements.confirm_password.value='';
   if(result.old_login_banned===false)alert('New SR login saved. The former account is disconnected from app data, but automatic suspension of its Auth login could not be confirmed.');
   await home();await ctx.ffhLoadCloud();
   alert('SR replaced. '+newId+' is the new login ID. Route, targets and historical sales remain unchanged.');
  });};
 }

 async function deleteStaff(p){
  if(!owner||!p||p.staff_id==='M21954')return;
  const preview=await api({action:'delete_preview',staff_id:p.staff_id});
  const loginId=String(preview.login_id||p.staff_id).toUpperCase();
  const records=Object.entries(preview.affected_tables||{}).sort((a,b)=>b[1]-a[1]);
  page('Owner-only · Permanent staff deletion',
   '<div class="card"><div class="cardTitle">PERMANENT DELETE · STAFF ACCOUNT</div>'
   +'<p><b>'+E(preview.name)+'</b> · '+E(loginId)+' · '+E(preview.role)+' · '+E(preview.zone)+'</p>'
   +'<p role="alert" style="color:#ff9c7c">This action removes the selected employee from FieldForce Hub and deletes their linked operational records, files and login wherever cleanup succeeds. The route, outlets, sales, tasks, messages, tracking, claims and related records can be affected. It does not delete the whole company website.</p>'
   +'<p><b>'+Number(preview.direct_record_count||0).toLocaleString('en-MY')+'</b> directly linked records detected. More dependent rows and files may be affected.</p>'
   +'<details><summary>VIEW RECORD COUNTS BEFORE DELETION</summary>'
   +(records.map(x=>'<div class="row"><b>'+E(String(x[0]).replace(/^ffh_/,''))+'</b><span>'+Number(x[1]||0)+'</span></div>').join('')||'<p>No directly linked records in the scanned tables.</p>')
   +'</details>'
   +'<p>Private row snapshots and the deletion log stay available only to the Owner under DELETED STAFF HISTORY. Other employees cannot open that archive.</p>'
   +'<form id="ffOwnerDeleteStaffForm" class="form">'
   +'<label>Type the exact Staff ID to confirm: <b>'+E(loginId)+'</b><input name="confirm_staff_id" autocomplete="off" required placeholder="'+E(loginId)+'"></label>'
   +'<label><input type="checkbox" name="accepted" required> I understand that this permanently removes the account and its active records. This is NOT Replace SR.</label>'
   +'<button class="danger" type="submit">PERMANENT DELETE STAFF & DATA</button>'
   +'<button type="button" class="secondary" id="ffOwnerDeleteBack">CANCEL · BACK</button>'
   +'<p role="status" id="ffOwnerDeleteStatus"></p></form></div>');
  const form=q('#ffOwnerDeleteStaffForm');q('#ffOwnerDeleteBack').onclick=home;
  form.onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{
    const confirmed=String(form.elements.confirm_staff_id.value||'').trim().toUpperCase();
    if(confirmed!==loginId)throw Error('Staff ID does not match. Nothing was deleted.');
    if(!form.elements.accepted.checked)throw Error('Please acknowledge the deletion.');
    if(!confirm('FINAL CONFIRMATION: Permanently remove '+preview.name+' ('+loginId+') and associated FieldForce records? The archive is Owner-only.'))return;
    q('#ffOwnerDeleteStatus').textContent='Deleting records and removing login/files…';
    const result=await api({action:'delete_staff',staff_id:p.staff_id,confirm_staff_id:confirmed});
    if(!result.database_deleted)throw Error('Staff deletion was not confirmed');
    const warnings=Array.isArray(result.cleanup_warnings)?result.cleanup_warnings:[];
    const msg='Staff removed from database. Owner-only history #'+result.archive_id
     +(result.auth_deleted?' · Login removed':' · Login cleanup needs review')
     +(result.storage_deleted?' · Files removed':' · File cleanup needs review')
     +(warnings.length?'\nWarnings: '+warnings.join('; '):'');
    await ctx.ffhLoadCloud().catch(()=>{});
    await home();
    alert(msg);
  });};
 }
 async function deletedStaffHistory(){
  if(!owner)return;
  const {data:records,error}=await sb.rpc('ffh_owner_staff_delete_history');if(error)throw Error(error.message);
  page('OWNER · Deleted staff history','<div class="card"><div class="cardTitle">DELETED STAFF · PRIVATE ARCHIVE</div>'
   +'<p>Only the Owner can access this history and archived data. Deleted accounts no longer appear in active staff management.</p>'
   +'<button type="button" class="secondary" id="ffDeletedStaffBack">BACK TO STAFF</button></div>'
   +(Array.isArray(records)?records:[]).map(r=>'<div class="card"><b>'+E(r.name||r.staff_id)+'</b>'
     +'<p>'+E(r.login_id||r.staff_id)+' · '+E(new Date(r.deleted_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}))+'</p>'
     +'<p>'+E(JSON.stringify(r.record_counts||{}))+'</p>'
     +'<p>Auth: '+(r.auth_deleted?'removed':'cleanup pending')+' · Storage: '+(r.storage_deleted?'removed':'cleanup pending')+'</p>'
     +'<button type="button" class="secondary ffDeletedStaffArchive" data-event="'+E(r.id)+'">VIEW PRIVATE ARCHIVED RECORDS</button></div>').join('')
   ||'<div class="card">No deleted-staff history yet.</div>');
  q('#ffDeletedStaffBack').onclick=home;
  qa('.ffDeletedStaffArchive').forEach(b=>b.onclick=async()=>{
    const event=Number(b.dataset.event);let offset=0;const all=[];
    const draw=()=>{
      page('Owner · Archived staff data','<div class="card"><div class="cardTitle">ARCHIVE #'+event+'</div>'
       +'<p>Archived data is restricted to the owner.</p><button class="secondary" id="ffArchiveBack">BACK TO HISTORY</button>'
       +'<button class="primary" id="ffArchiveMore">LOAD NEXT 100</button></div>'
       +all.map(x=>'<details class="card"><summary>'+E(x.table||'Record')+'</summary><pre class="ffAuditJson">'+E(JSON.stringify(x.data,null,2))+'</pre></details>').join(''));
      q('#ffArchiveBack').onclick=deletedStaffHistory;
      q('#ffArchiveMore').onclick=loadArchive;
    };
    const loadArchive=async()=>{
      const {data:part,error:ae}=await sb.rpc('ffh_owner_staff_delete_archive',{event_id:event,offset_rows:offset});
      if(ae)return alert(ae.message);
      if(Array.isArray(part)){all.push(...part);offset+=part.length;}draw();
      if(!Array.isArray(part)||part.length<100)q('#ffArchiveMore').disabled=true;
    };
    await loadArchive();
  });
 }
 async function history(){try{let m=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit'}).format(new Date()).replace('/','-');m=new Date(Date.now()+8*3600000).toISOString().slice(0,7);
  let records=[];const render=async(append=false)=>{const batch=await rpc('history',{month:m,offset:append?records.length:0,limit:1000});const rows=records=append?[...records,...batch]:batch;page(owner?'Company change history':'My change history',`<div class="card"><label>Choose month<input id="ffHistoryMonth" type="month" value="${E(m)}"></label><p>Actor, time, zone and original/new values are retained. Use Load More to read further changes in the month.</p><button id="ffHistoryBack" class="secondary">BACK</button></div>${rows.map(r=>`<details class="card"><summary>${E(r.operation)} · ${E(r.table_name)} · ${E(r.actor_name||r.actor||'System')}</summary><p>${E(r.occurred_at)} · ${E(r.actor_zone||'')} · ${E(JSON.stringify(r.row_key))}</p><pre class="ffAuditJson">Before: ${E(JSON.stringify(r.before_data,null,2))}\nAfter: ${E(JSON.stringify(r.after_data,null,2))}</pre></details>`).join('')||'<div class="card">No changes this month.</div>'}`);q('#ffHistoryMonth').onchange=e=>{m=e.target.value;render().catch(e=>alert(e.message));};q('#ffHistoryBack').onclick=home;if(batch.length===1000){q('#ffHistoryBack').parentElement.insertAdjacentHTML('beforeend','<button id="ffHistoryMore" class="primary">LOAD MORE HISTORY</button>');q('#ffHistoryMore').onclick=()=>render(true).catch(e=>alert(e.message));}};await render();}catch(e){alert(e.message);}}
 async function trash(){try{const rows=await rpc('trash');page(owner?'Company Trash Bin':'My Trash Bin',`<div class="card"><p>Undo restores the original record. Permanent deletion cannot be undone. Linked records may need their parent restored first.</p><button id="ffTrashBack" class="secondary">BACK</button>${owner?'<label><input type="checkbox" id="ffTrashSelectAll"> SELECT ALL</label><button class="primary" id="ffTrashRestoreSelected">RESTORE SELECTED</button><button class="danger" id="ffTrashPurgeSelected">PERMANENT DELETE SELECTED</button>':''}</div>${rows.map(r=>`<div class="card">${owner?`<input type="checkbox" data-trash-bulk="${E(r.id)}">`:""}<b>${E(r.table_name)}</b><p>${E(JSON.stringify(r.row_key))} · ${E(r.deleted_by||'System')} · ${E(r.deleted_at)}</p>${owner?`<button class="primary ffTrashAction" data-action="restore" data-id="${r.id}">UNDO</button><button class="danger ffTrashAction" data-action="purge" data-id="${r.id}">PERMANENT DELETE</button>`:'<p>Contact the owner to restore.</p>'}</div>`).join('')||'<div class="card">Trash Bin is empty.</div>'}`);q('#ffTrashBack').onclick=home;if(q('#ffTrashSelectAll')){q('#ffTrashSelectAll').onchange=e=>qa('[data-trash-bulk]').forEach(b=>b.checked=e.target.checked);const bulk=async(action,button)=>busy(button,async()=>{const ids=qa('[data-trash-bulk]:checked').map(b=>b.dataset.trashBulk);if(!ids.length)return;if(action==='purge'&&!confirm('Permanently erase '+ids.length+' selected records? This cannot be undone.'))return;let done=0;const errors=[];for(const id of ids){try{await rpc(action,{id});done++;}catch(e){errors.push(e.message);}}await trash();await ctx.ffhLoadCloud();if(errors.length)alert(done+' completed; '+errors.length+' failed: '+errors.join('; '));});q('#ffTrashRestoreSelected').onclick=e=>bulk('restore',e.target);q('#ffTrashPurgeSelected').onclick=e=>bulk('purge',e.target);}qa('.ffTrashAction').forEach(b=>b.onclick=()=>busy(b,async()=>{if(b.dataset.action==='purge'&&!confirm('Permanently erase this deleted record? This cannot be undone.'))return;await rpc(b.dataset.action,{id:b.dataset.id});await trash();await ctx.ffhLoadCloud();}));}catch(e){alert(e.message);}}
 function changeMyPassword(){
  if(!owner)return;
  page('Owner · Change My Password',
   '<section class="card"><div class="cardTitle">MY ACCOUNT · CHANGE PASSWORD</div>'
   +'<p>Account: <b>'+E(me.name||'MEHEDI ALIM AYON')+'</b> · M21954</p>'
   +'<p>Only the account password changes. Staff ID, owner access, zones and staff records stay the same.</p>'
   +'<form class="form" id="ffOwnerOwnPasswordForm">'
   +'<label>New password<input type="password" name="password" minlength="8" autocomplete="new-password" required></label>'
   +'<label>Confirm new password<input type="password" name="confirm_password" minlength="8" autocomplete="new-password" required></label>'
   +'<button class="primary" type="submit">SAVE NEW PASSWORD</button>'
   +'<button class="secondary" type="button" id="ffOwnerPasswordBack">BACK TO STAFF</button>'
   +'<p id="ffOwnerPasswordStatus" role="status"></p></form></section>');
  const form=q('#ffOwnerOwnPasswordForm');
  q('#ffOwnerPasswordBack').onclick=home;
  form.onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{
   const password=form.elements.password.value;
   if(password.length<8)throw Error('Use at least 8 characters for your password.');
   if(password!==form.elements.confirm_password.value)throw Error('Passwords do not match.');
   const response=await api({action:'password',staff_id:'M21954',password});
   if(!response?.password_changed)throw Error('Password change was not confirmed.');
   form.reset();
   q('#ffOwnerPasswordStatus').textContent='Password successfully changed. Use the new password for your next login.';
  });};
 }
 async function home(){try{await load();page('Staff, Zones & Permissions',`<div class="card"><div class="cardTitle">${owner?'Owner control':admin?'Sales Admin control · Ayon is protected':'Your assigned scope'}</div>${owner?'<button class="primary" id="ffCompanyRoster">COMPANY ZONES & TEAMS</button>':''}${admin?'<button class="primary" id="ffCreateAccount">CREATE STAFF / MANAGER / ADMIN</button>':''}${owner?'<p>For an SR change on the same route, use REPLACE SR beside the current account. Sales and targets stay on that dashboard.</p>':''}${owner?'<button class="secondary" id="ffDeletedStaffHistory">DELETED STAFF HISTORY · OWNER ONLY</button>':''}${admin?'<button class="secondary" id="ffHistory">CHANGE HISTORY</button><button class="secondary" id="ffTrash">TRASH BIN</button>':''}</div>${admin?`<details class="card"><summary>ADD ZONE</summary><form class="form" id="ffZoneForm"><label>Zone code<input name="zone_id" required pattern="[A-Za-z0-9_-]{1,40}"></label><label>Zone name<input name="name" required></label><button class="primary">SAVE ZONE</button></form></details>${owner?`<details class="card"><summary>ZONE ACTIVE / INACTIVE</summary>${data.zones.map(z=>`<div class="row"><span>${E(z.name)} · ${z.active?'ACTIVE':'INACTIVE'}</span><button class="secondary ffZoneToggle" data-zone="${E(z.id)}" data-active="${!z.active}">${z.active?'DEACTIVATE':'ACTIVATE'}</button></div>`).join('')}<p>Inactive zones are hidden from Head Office. Records and assignments are retained.</p></details>`:''}<details class="card"><summary>TRANSFER A ROUTE</summary><form class="form" id="ffTransferRoute"><label>Current route holder<select name="from">${data.profiles.filter(p=>p.can_sell||(data.outlets||[]).some(o=>o.sr_id===p.staff_id&&o.active)).map(p=>`<option value="${E(p.staff_id)}">${E(p.full_name)}</option>`).join('')}</select></label><label>New SR<select name="to">${data.profiles.filter(p=>p.can_sell&&p.active).map(p=>`<option value="${E(p.staff_id)}">${E(p.full_name)}</option>`).join('')}</select></label><p>Past sales stay with the original staff ID. The former holder becomes management-only.</p><button class="primary">TRANSFER ROUTE</button></form></details>`:''}${window.FFH_STAFF_DIRECTORY?.render({profiles:data.profiles,zones:data.zones,owner,admin,viewerId:me.id,escape:E})||'<div class="card">Staff directory unavailable. Reload to retry.</div>'}
  <details class="card"><summary>REQUEST EDIT / DELETE</summary><form class="form" id="ffChangeRequest"><label>Module<select name="module">${modules.map(m=>`<option value="${m}">${E(moduleLabels[m]||m)}</option>`).join('')}</select></label><label>Record ID<input name="record_id" required></label><label>Action<select name="action"><option>edit</option><option>delete</option></select></label><label>Reason<textarea name="reason" required></textarea></label><button class="primary">SEND REQUEST</button></form></details><div class="card"><b>Requests</b>${data.requests.map(r=>`<div class="row"><div>${E(r.staff_id)} · ${E(r.action)} · ${E(r.module)} · ${E(r.record_id)}<p>${E(r.reason)} · ${E(r.status)}</p></div>${(admin||(me.can_manage&&r.module==='sales'&&ctx.may?.('sales',r.action)))&&r.status==='Pending'?`<button class="secondary ffReview" data-id="${r.id}" data-status="Approved">APPROVE</button><button class="danger ffReview" data-id="${r.id}" data-status="Rejected">REJECT</button>`:''}</div>`).join('')}</div>`);
  if(owner){q('#ffCompanyRoster').onclick=()=>window.ffhCompanyRosterUI?.();qa('.ffZoneToggle').forEach(b=>b.onclick=()=>busy(b,async()=>{await rpc('set_zone_active',{zone_id:b.dataset.zone,active:b.dataset.active==='true'});await home();await ctx.ffhLoadCloud();}));}if(admin){q('#ffCreateAccount').onclick=()=>editor();qa('.ffEditAccount').forEach(b=>b.onclick=()=>editor(data.profiles.find(p=>p.staff_id===b.dataset.id)));qa('.ffReplaceAccount').forEach(b=>b.onclick=()=>replaceSR(data.profiles.find(p=>p.staff_id===b.dataset.id)));if(owner)qa('.ffDeleteStaff').forEach(b=>b.onclick=()=>deleteStaff(data.profiles.find(p=>p.staff_id===b.dataset.id)).catch(e=>alert(e.message)));q('#ffZoneForm').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{await api({action:'zone',...Object.fromEntries(new FormData(e.target))});await home();});};q('#ffTransferRoute').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{await rpc('transfer_route',Object.fromEntries(new FormData(e.target)));await home();await ctx.ffhLoadCloud();});};}
  window.FFH_STAFF_DIRECTORY?.bindSearch(document);if(owner)qa('.ffOwnerOwnPassword').forEach(b=>b.onclick=changeMyPassword);if(admin){q('#ffHistory').onclick=history;q('#ffTrash').onclick=trash;}if(owner)q('#ffDeletedStaffHistory').onclick=()=>deletedStaffHistory().catch(e=>alert(e.message));q('#ffChangeRequest').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{await rpc('request',Object.fromEntries(new FormData(e.target)));await home();});};qa('.ffReview').forEach(b=>b.onclick=()=>busy(b,async()=>{await rpc('review_request',{id:b.dataset.id,status:b.dataset.status});await home();}));
 }catch(e){page('Staff Management',`<div class="card"><p role="alert">${E(e.message)}</p><button id="ffAccountsRetry" class="primary">RETRY CONNECTION</button></div>`);q('#ffAccountsRetry').onclick=home;}}
 await home();
};
