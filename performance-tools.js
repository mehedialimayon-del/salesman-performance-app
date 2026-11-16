/* Performance helpers reuse existing authenticated APIs and their permissions. */
window.FFH_CREATE_PERFORMANCE_TOOLS = function(ctx) {
 'use strict';
 const $=s=>document.querySelector(s), E=ctx.esc, sb=ctx.sb;
 let flushing=null, ticket=0, lastHistory=null, syncFilter={},syncSettingsOpen=false;
 const me=()=>ctx.user()?.id;
 const key=id=>'ffh_order_outbox_v1_'+id;
 const read=id=>{const raw=localStorage.getItem(key(id));if(!raw)return [];let rows;try{rows=JSON.parse(raw);}catch(e){throw Error('Saved orders could not be read. Keep app data and contact Ayon.');}if(!Array.isArray(rows))throw Error('Saved orders could not be read. Keep app data and contact Ayon.');return rows;};
 const write=(id,rows)=>localStorage.setItem(key(id),JSON.stringify(rows));
 const historyKey=id=>'ffh_order_sync_history_v1_'+id;
 const history=id=>{try{const rows=JSON.parse(localStorage.getItem(historyKey(id))||'[]');return Array.isArray(rows)?rows.filter(x=>x&&x.id&&x.order).slice(0,30):[];}catch{return [];}};
 const recordSynced=(id,item)=>{try{const previous=history(id).filter(x=>x.id!==item.id);localStorage.setItem(historyKey(id),JSON.stringify([{id:item.id,order:item.order,queuedAt:item.queuedAt,syncedAt:new Date().toISOString(),state:'Synced'},...previous].slice(0,30)));}catch(error){console.warn('Could not save local sync history',error);}};

 const online=()=>navigator.onLine!==false;
 const scopedIds=()=>ctx.isMgr()?ctx.ids():[me()];
 const who=id=>ctx.staff(id)?.name||id||'';
 const page=(name,title,body)=>{ctx.setPage(name);ctx.shell(ctx.back(title)+body);ctx.bindBack();};
 const stamp=s=>{const d=new Date(s);return !s?'Time not recorded':Number.isNaN(d.getTime())?s:d.toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'});};
 const safePhoto=url=>/^https:\/\//i.test(url||'')?`<button class="secondary ffPerformancePhoto" data-photo="${E(url)}">VIEW PROOF PHOTO</button>`:'';
 const metric=(icon,label,color,value)=>`<div class="ffRefMetric" data-color="${color}"><i aria-hidden="true">${icon}</i><span>${label}</span><strong>${E(value)}</strong></div>`;
 const bindPhotos=()=>document.querySelectorAll('.ffPerformancePhoto').forEach(b=>b.onclick=()=>window.FFH_OPEN_IMAGE?.(b.dataset.photo));
 const rpc=async(name,action,payload={})=>{const {data,error}=await sb.rpc(name,{action,payload});if(error)throw Error(error.message);return data;};
 async function rows(table,order) {
  const all=[];
  for(let offset=0;;offset+=1000){const {data,error}=await sb.from(table).select('*').order(order,{ascending:false}).order('id',{ascending:false}).range(offset,offset+999);if(error)throw Error(error.message);all.push(...data||[]);if((data||[]).length<1000)return all;}
 }
 const retryable=e=>!e?.code&&(!e?.status||e.status>=500)||['PGRST000','PGRST001','PGRST002'].includes(e?.code);
 async function queueOrder(order) {
  const id=me();if(!id)throw Error('Login required');
  if(!scopedIds().includes(order.sr))throw Error('Choose an assigned SR');
  if(!order||typeof order!=='object'||typeof order.id!=='string'||!order.id.trim())throw Error('Order ID is required before saving offline.');
  if(typeof order.sr!=='string'||!order.sr.trim())throw Error('Staff ID is required before saving offline.');
  if(!order.outletName||!order.sku||!order.date||!Number.isFinite(Number(order.qty))||Number(order.qty)<=0||
     !Number.isFinite(Number(order.orderAmount))||Number(order.orderAmount)<0)
   throw Error('Complete the outlet, SKU, date, quantity and amount before saving offline.');
  const all=read(id), record={id:order.id,actor:id,order:{...order,cloudConfirmed:false},queuedAt:new Date().toISOString(),state:'Pending',error:''};
  if(all.some(x=>x.id===order.id))throw Error('This order is already saved. Open Offline Sync.');
  // Persist before attempting the network; a storage failure must never claim a saved draft.
  write(id,[...all,record]);
  await flush();
  if(me()!==id)return {pending:true};
  const left=read(id).find(x=>x.id===order.id);
  return {pending:!!left,blocked:left?.state==='Blocked',error:left?.error||''};
 }
 async function flush(manual=false) {
  if(flushing)return flushing;
  const id=me();if(!id||!online())return;
  flushing=(async()=>{
   const snapshot=read(id);
   for(const item of snapshot){
    if(me()!==id||!online())break;
    if(item.actor!==id||item.state==='Blocked'&&!manual)continue;
    let failure=null;
    try{
     // A prior request may have reached the cloud before its response was lost.
     // Check the stable order ID before replaying it; never treat a failed lookup as absence.
     const {data:existing,error:lookupError}=await sb.from('ffh_sales').select('id,sr_id,sale_date,outlet_name,sku,qty,order_amount').eq('id',item.id).maybeSingle();
     if(lookupError)throw lookupError;
     if(existing){
      if(existing.sr_id!==item.order.sr)throw Object.assign(Error('Saved order ID belongs to a different staff member. Contact an administrator.'),{code:'ORDER_ID_CONFLICT'});
      // A matching ID is not sufficient: never discard an unsent order if its
      // payload differs from the cloud row (even when the staff ID matches).
      const order=item.order;
      const sameText=(a,b)=>String(a??'').trim()===String(b??'').trim();
      const sameNumber=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<0.000001;
      if(!sameText(existing.sale_date,order.date)||!sameText(existing.outlet_name,order.outletName)||
         !sameText(existing.sku,order.sku)||!sameNumber(existing.qty,order.qty)||
         !sameNumber(existing.order_amount,order.orderAmount))
       throw Object.assign(Error('Cloud order ID already exists with different details. Saved order was kept for administrator review.'),{code:'ORDER_ID_CONFLICT'});
     }else await ctx.saveSale(item.order);
    }catch(e){failure=e;}
    // Never update a different account's cache after a session switch.
    if(me()!==id)break;
    const current=read(id), found=current.find(x=>x.id===item.id);if(!found)continue;
    if(failure){found.state=retryable(failure)?'Pending':'Blocked';found.error=String(failure.message||failure);found.lastAttempt=new Date().toISOString();write(id,current);}
    else {
     // Cloud save has succeeded. Remove the outbox record before updating the
     // in-memory UI so a local rendering error cannot resend a confirmed order.
     write(id,current.filter(x=>x.id!==item.id));
     recordSynced(id,item);
     try{const countKey='ffh_order_sync_count_'+id;localStorage.setItem(countKey,String((Number(localStorage.getItem(countKey))||0)+1));}catch(error){console.warn('Could not store sync count',error);}
     try{ctx.acceptSale(item.order);}catch(error){console.warn('Cloud order saved; local sales view needs refresh',error);}
     try{localStorage.setItem('ffh_order_sync_time_'+id,new Date().toISOString());}catch(error){console.warn('Could not store last sync time',error);}
    }
   }
  })().finally(()=>{flushing=null;if(ctx.page()==='offlineSync')syncPage();});
  return flushing;
 }
 function syncPage(){
  const id=me();if(!id)return;let list;
  try{list=read(id);}catch(e){return page('offlineSync','Offline Sync',`<div class="card" role="alert">${E(e.message)}</div>`);}
  const last=localStorage.getItem('ffh_order_sync_time_'+id);
  if(syncFilter.owner!==id)syncFilter={owner:id,status:'',query:''};
  const pending=list.filter(x=>x.state!=='Blocked').length,failed=list.length-pending;
  const syncedHistory=history(id).filter(x=>!list.some(p=>p.id===x.id)),visibleOrders=[...list,...syncedHistory];
  const syncCountKey='ffh_order_sync_count_'+id;
  const synced=Math.max(syncedHistory.length,Number(localStorage.getItem(syncCountKey))||0);
  page('offlineSync','Offline Sync',`<div class="ffRefSync ffSyncReference">
    <div class="ffSyncHero" aria-hidden="true"><div class="ffSyncCloud">☁<span>↑↓</span></div><div class="ffSyncPhone">↻</div><div class="ffSyncHeroBase"></div></div>
    <h2 class="ffSyncHeadline">Work Offline · <em>Sync Later</em></h2>
    <div class="ffSyncBenefits">
      <div><i aria-hidden="true">▱</i><span>Create orders offline. Attendance and proof require a connection.</span></div>
      <div><i aria-hidden="true">☁</i><span>Saved orders can sync automatically when internet is available.</span></div>
      <div><i aria-hidden="true">⬡</i><span>Only cloud-confirmed orders enter Sales &amp; Reports.</span></div>
      <div><i aria-hidden="true">ⓘ</i><span>Delivery confirmation, attendance, photo proof and approvals require a connection.</span></div>
    </div>
    <div class="ffSyncStats" aria-label="Offline sync summary">
      <div class="ffSyncStat pending"><i aria-hidden="true">▤</i><strong>${pending}</strong><span>Pending</span></div>
      <div class="ffSyncStat synced"><i aria-hidden="true">☁</i><strong>${synced}</strong><span>Synced</span></div>
      <div class="ffSyncStat failed"><i aria-hidden="true">⚠</i><strong>${failed}</strong><span>Failed</span></div>
    </div>
    <button id="ffSyncRetry" class="ffSyncNow" ${flushing||!online()?'disabled':''}><span aria-hidden="true">⟳</span> ${flushing?'SENDING…':'Sync Now'}</button>
    <p id="ffSyncMessage" role="status" aria-live="polite"></p>
    <details class="ffSyncSettings" ${syncSettingsOpen?'open':''}><summary><span aria-hidden="true">⚙</span> Sync Settings <b aria-hidden="true">›</b></summary>
      <div class="ffSyncSettingsBody"><p>Connection: ${online()?'Online':'Offline'} · Last confirmed send: ${last?E(stamp(last)):'Not recorded on this phone'}</p>
        <div class="ffRefFields"><label>Order status<select id="ffSyncState"><option value="">All orders &amp; history</option><option value="waiting">Waiting to send</option><option value="blocked">Needs attention</option><option value="synced">Synced history</option></select></label>
        <label>Search<input type="search" id="ffSyncSearch" placeholder="Outlet, SKU or staff"></label></div>
        <div id="ffSyncQueue">${visibleOrders.map((x,i)=>`<article class="card ffSyncHistoryCard" data-tone="${x.state==='Blocked'?'red':x.state==='Synced'?'teal':['blue','violet','teal','amber'][i%4]}" data-queued-order="${E(x.id)}"><div class="row"><b>${E(x.order.outletName)}</b><span class="ffPerformanceStatus">${E(x.state==='Blocked'?'Needs attention':x.state==='Synced'?'Synced to cloud':'Saved · waiting to send')}</span></div><p>${E(x.order.sku)} · ${E(x.order.qty)} cartons · ${ctx.rm(x.order.orderAmount)}</p><p>${E(who(x.order.sr))} · ${E(x.order.date)}</p><p class="miniStat">${x.state==='Synced'?'Synced '+E(stamp(x.syncedAt)):'Saved '+E(stamp(x.queuedAt))} · ${E(x.id)}</p>${x.error?`<p role="status">${E(x.error)}</p>`:''}</article>`).join('')||'<div class="card empty">No orders waiting to send on this phone.</div>'}<p id="ffSyncNoMatch" hidden>No orders match these filters.</p></div>
      </div>
    </details>
    <div class="ffSyncSafety"><i aria-hidden="true">ⓘ</i><span>Sign in online first. This screen does not enable offline sign-in. Keep app data until pending orders are sent.</span></div>
  </div>`);
  const state=$('#ffSyncState'),search=$('#ffSyncSearch'),byId=new Map(visibleOrders.map(record=>[record.id,record]));
  state.value=syncFilter.status;search.value=syncFilter.query;
  const apply=()=>{
   syncFilter.status=state.value;syncFilter.query=search.value;
   const term=search.value.trim().toLowerCase();let count=0;
   document.querySelectorAll('[data-queued-order]').forEach(card=>{
    const row=byId.get(card.dataset.queuedOrder),blocked=row.state==='Blocked',syncedRow=row.state==='Synced';
    card.hidden=(state.value==='waiting'&&(blocked||syncedRow))||(state.value==='blocked'&&!blocked)||(state.value==='synced'&&!syncedRow)||
     ![row.order.outletName,row.order.sku,who(row.order.sr),row.order.sr,row.id].join(' ').toLowerCase().includes(term);
    if(!card.hidden)count++;
   });
   $('#ffSyncNoMatch').hidden=!visibleOrders.length||count>0;
  };
  search.oninput=apply;state.onchange=apply;apply();
  const settings=$('.ffSyncSettings');settings.addEventListener('toggle',()=>{if(settings.isConnected)syncSettingsOpen=settings.open;});
  if(window.ffDaily){const queue=$('.ffSyncSettingsBody');if(queue){queue.insertAdjacentHTML('beforeend',window.ffDaily.outboxHtml());window.ffDaily.bindOutbox();}}
  $('#ffSyncRetry').onclick=async e=>{e.target.disabled=true;const message=$('#ffSyncMessage');if(message)message.textContent='Checking saved orders…';try{await ctx.refreshStaff();await flush(true);if(ctx.page()==='offlineSync'){const current=read(id);const status=$('#ffSyncMessage');if(status)status.textContent=current.length?`${current.length} order(s) still require attention. Open Sync Settings for details.`:'All saved orders on this phone have been checked.';}}catch(err){const status=$('#ffSyncMessage');if(status)status.textContent=err.message;}finally{if(e.target.isConnected)e.target.disabled=false;}};
 }
 async function approvals(){
  const id=me(), turn=++ticket;
  page('approvals','Approval Inbox','<div class="card" role="status">Loading your permitted requests…</div>');
  const inboxSources=[rows('ffh_tasks','created_at'),rpc('ffh_governance','state'),rpc('ffh_earnings','state'),rpc('ffh_claims_api','state'),ctx.refreshStaff()];
  // A stalled backend must not leave the inbox on its loading screen forever.
  const limited=promise=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Request timed out. Tap REFRESH INBOX to retry.')),15000);Promise.resolve(promise).then(value=>{clearTimeout(timeout);resolve(value);},error=>{clearTimeout(timeout);reject(error);});});
  const results=await Promise.allSettled(inboxSources.map(limited));
  if(me()!==id||ticket!==turn||ctx.page()!=='approvals')return;
  const tasks=results[0].status==='fulfilled'?results[0].value:[],gov=results[1].status==='fulfilled'?results[1].value:{},earn=results[2].status==='fulfilled'?results[2].value:{},claims=results[3].status==='fulfilled'?results[3].value:{};
  // If permission refresh fails, server-backed review pages remain available; no direct task decision.
  const permissionsFresh=results[4].status==='fulfilled';
  const taskReview=permissionsFresh&&ctx.isMgr()&&ctx.may('tasks');
  const allowed=new Set(scopedIds()), items=[];
  tasks.filter(x=>x.assigned_to===id||ctx.isMgr()&&allowed.has(x.assigned_to)).filter(x=>['Pending Review','Done','Rejected'].includes(x.status)).forEach(x=>items.push({kind:'Task proof',id:x.id,staff:x.assigned_to,title:x.title,detail:x.description||'',status:x.status,date:x.updated_at||x.created_at,photo:x.proof_photo_url,location:x.proof_location,reviewer:x.reviewed_by,reviewedAt:x.reviewed_at,can:taskReview&&x.status==='Pending Review'&&x.assigned_to!==id,raw:x}));
  (gov.requests||[]).forEach(x=>items.push({kind:'Access / correction',id:x.id,staff:x.staff_id,title:x.module+' · '+x.action,detail:x.reason+' · Record '+x.record_id,status:x.status,date:x.created_at,reviewer:x.reviewed_by,reviewedAt:x.reviewed_at,can:false,open:'access',raw:x}));
  (earn.entries||[]).forEach(x=>items.push({kind:'Incentive / penalty',id:x.id,staff:x.staff_id,title:x.kind+' · '+ctx.rm(x.amount),detail:x.reason,status:x.status,date:x.created_at||x.entry_date,reviewer:x.approved_by,reviewedAt:x.reviewed_at,can:false,open:'incomeLedger',raw:x}));
  (claims.claims||[]).forEach(x=>items.push({kind:'Existing claim',id:x.id,staff:x.owner_staff_id,title:x.title,detail:x.kind,status:x.status,date:x.created_at,reviewer:x.reviewer_staff_id,reviewedAt:x.reviewed_at,can:false,open:'claim:'+x.id,raw:x}));
  const errors=results.map((x,i)=>x.status==='rejected'?['Tasks','Access requests','Income requests','Claims','Permissions'][i]+': '+x.reason.message:'').filter(Boolean);
  page('approvals','Approval Inbox',`<div class="card ffPerformanceIntro ffApprovalControls"><div class="two"><label>Status<select id="ffApprovalStatus"><option value="pending">Waiting for review</option><option value="approved">Approved / done</option><option value="returned">Returned / rejected</option><option value="all">All history</option></select></label><label>Search<input id="ffApprovalSearch" placeholder="Staff, outlet, task or request"></label></div><button class="secondary" id="ffApprovalReload">REFRESH INBOX</button>${id==='M21954'?'<button class="secondary" id="ffApprovalPermissions">STAFF / TASK ACCESS SETTINGS</button><button class="secondary" id="ffIncomeApprovalPermissions">INCOME APPROVAL SETTINGS</button>':''}${errors.map(s=>`<p role="alert">${E(s)} · Some requests could not load.</p>`).join('')}</div><p id="ffApprovalCount" role="status"></p><div id="ffApprovalList"></div><div class="ffApprovalHelp"><p>You see only requests allowed by your existing access. SRs can follow their submissions. Task review needs Manager access plus Tasks Edit; income review needs separate approval permission. Claims keep their assigned reviewer. Access decisions stay with the owner / delegated administrator.</p><p>Approving an access request records a decision. An authorized administrator must separately change the actual permissions.</p></div>`);
  const inbox=$('.ffApprovalControls');
  inbox.insertAdjacentHTML('afterend',`<div class="ffRefReportKpis" id="ffApprovalMetrics">
   ${metric('▤','All Requests','blue',items.length)}
   ${metric('◷','Waiting','gold',items.filter(x=>['Pending','Pending Review','Submitted'].includes(x.status)).length)}
   ${metric('✓','Approved','green',items.filter(x=>['Approved','Done'].includes(x.status)).length)}
   ${metric('↩','Returned / Rejected','red',items.filter(x=>['Returned','Rejected'].includes(x.status)).length)}
  </div>`);
  const categories=[...new Set(items.map(x=>x.kind))];
  inbox.querySelector('.two').insertAdjacentHTML('beforeend',`<label>Request Type<select id="ffApprovalType"><option value="">All request types</option>${categories.map(kind=>`<option>${E(kind)}</option>`).join('')}</select></label>`);
  const draw=()=>{const kind=$('#ffApprovalType').value,term=$('#ffApprovalSearch').value.trim().toLowerCase(),state=$('#ffApprovalStatus').value;const states={pending:['Pending','Pending Review','Submitted'],approved:['Approved','Done'],returned:['Returned','Rejected']};const shown=items.filter(x=>(!kind||x.kind===kind)&&(!states[state]||states[state].includes(x.status))).filter(x=>!term||[x.kind,x.title,x.detail,who(x.staff),x.staff].join(' ').toLowerCase().includes(term)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));$('#ffApprovalCount').textContent=shown.length+' request(s)';$('#ffApprovalList').innerHTML=shown.map((x,i)=>`<article class="card"><div class="row"><b>${E(x.title)}</b><span class="ffPerformanceStatus">${E(x.status)}</span></div><p>${E(x.kind)} · ${E(who(x.staff))}</p><p>${E(x.detail)}</p><p class="miniStat">Submitted / updated ${E(stamp(x.date))}</p>${x.reviewedAt?`<p class="miniStat">Reviewed ${E(stamp(x.reviewedAt))} · ${E(who(x.reviewer))}</p>`:x.reviewer?`<p>Reviewer: ${E(who(x.reviewer))}</p>`:''}${safePhoto(x.photo)}${x.location?`<p class="miniStat">Location proof: ${E(x.location.latitude)}, ${E(x.location.longitude)} · ${E(stamp(x.location.capturedAt))}</p>`:''}${x.can?`<button class="primary ffInboxDecision" data-index="${i}" data-status="Done">APPROVE TASK</button><button class="secondary ffInboxDecision" data-index="${i}" data-status="Rejected">RETURN TASK</button>`:''}${x.open?`<button class="secondary ffInboxOpen" data-index="${i}">OPEN REQUEST / REVIEW</button>`:''}</article>`).join('')||'<div class="card empty">No requests match this selection.</div>';bindPhotos();document.querySelectorAll('.ffInboxOpen').forEach(b=>b.onclick=()=>{const x=shown[+b.dataset.index];ctx.open(x.open,x.raw);});document.querySelectorAll('.ffInboxDecision').forEach(b=>b.onclick=async()=>{const request=shown[+b.dataset.index];if(!request||!request.can||b.disabled)return;const controls=[...document.querySelectorAll('.ffInboxDecision')].filter(el=>el.dataset.index===b.dataset.index);controls.forEach(el=>el.disabled=true);try{await ctx.reviewTask(request.id,b.dataset.status);await approvals();}catch(e){alert(e.message);controls.forEach(el=>el.disabled=false);}});};
  $('#ffApprovalType').onchange=draw;$('#ffApprovalStatus').onchange=draw;$('#ffApprovalSearch').oninput=draw;$('#ffApprovalReload').onclick=approvals;
  if($('#ffApprovalPermissions'))$('#ffApprovalPermissions').onclick=()=>ctx.open('access');if($('#ffIncomeApprovalPermissions'))$('#ffIncomeApprovalPermissions').onclick=()=>ctx.open('incomeLedger');draw();
 }
 async function historyPage(selection={}){
  const id=me(), turn=++ticket;
  page('outletHistory','Outlet Management','<div class="card" role="status">Loading assigned outlets and history…</div>');
  let errors=[];try{await ctx.refreshStaff();await ctx.refreshOutlets();}catch(e){errors.push('Outlet access: '+e.message);}
  if(me()!==id||turn!==ticket||ctx.page()!=='outletHistory')return;
  // Permission/assignment failure never falls back to another person's cached history.
  if(errors.length)return page('outletHistory','Outlet Management',`<div class="card" role="alert">${E(errors.join(' '))}<button id="ffHistoryRetry" class="primary">RETRY</button></div>`),$('#ffHistoryRetry').onclick=historyPage;
  const result=await Promise.allSettled([
   rows('ffh_sales','created_at'),rows('ffh_tasks','created_at'),rows('ffh_campaign_executions','created_at'),
   globalThis.ffDaily?.refresh(),rows('ffh_outlets','id'),rows('ffh_findings','updated_at')
  ]);
  if(me()!==id||turn!==ticket||ctx.page()!=='outletHistory')return;
  const ids=scopedIds(), data=result.map((r,i)=>{if(r.status==='fulfilled')return r.value;errors.push(['Sales','Task proof','CPO / Promotion','Daily sales','Outlet directory','Outlet issues'][i]+': '+r.reason.message);return [];});
  const outlets=data[4].filter(o=>ids.includes(o.sr_id)).map(o=>({id:o.id,sr:o.sr_id,code:o.outlet_code,name:o.outlet_name,category:o.category,totalSku:o.total_sku,active:o.active!==false,updated:o.updated_at}));
  const onIssue=o=>data[5].some(r=>r.kind==='route'&&r.category==='Outlet issue'&&String(r.payload?.outlet_code)===String(o.code)&&
   r.payload?.outlet_staff_id===o.sr&&(!r.recipients?.length||r.recipients.some(sid=>r.states?.[sid]?.status!=='Done')));
  const canEdit=ctx.may('outlets');
  const state=o=>!o.active?'Inactive':onIssue(o)?'Issue':'Active';
  if(globalThis.ffDaily&&window.FFH_DAILY_CORE){const source=data[0].map(s=>({id:s.id,sr:s.sr_id,date:s.sale_date,status:s.status,outletCode:s.outlet_code,outletName:s.outlet_name,sku:s.sku,qty:s.qty,orderAmount:s.order_amount,deliveredAmount:s.delivered_amount,deliveredAt:s.delivered_at,remarks:s.remarks}));data[0]=window.FFH_DAILY_CORE.coverageRows({...globalThis.ffDaily.data(),sales:source},ids).map(s=>({id:s.id,sr_id:s.sr,sale_date:s.date,status:s.status,outlet_code:s.outletCode,outlet_name:s.outletName,sku:s.sku,qty:s.qty,order_amount:s.orderAmount,delivered_amount:s.deliveredAmount,remarks:s.remarks}));}
  const zones=[...new Set(outlets.map(o=>ctx.staff(o.sr)?.zone).filter(Boolean))].sort();
  const chains=[...new Set(outlets.map(o=>o.category).filter(Boolean))].sort();
  const selectOptions=(values,label)=>'<option value="">'+label+'</option>'+values.map(([value,text])=>`<option value="${E(value)}">${E(text)}</option>`).join('');
  page('outletHistory','Outlet Management',`<section class="ffRefOutlet">
   <div class="ffRefPanel ffRefFields">
     <div class="ffRefOutletDates"><span>Date Range</span>
      <div><input id="ffOutletHistoryFrom" type="date" aria-label="From date" value="${E(selection.day||'')}"><input id="ffOutletHistoryTo" type="date" aria-label="To date" value="${E(selection.day||'')}"></div>
     </div>
     <label><span>Zone<select id="ffOutletZone">${selectOptions(zones.map(z=>[z,z]),'All permitted zones')}</select></span></label>
     <label><span>Sales Representative<select id="ffOutletStaff">${selectOptions(ids.map(id=>[id,who(id)]),'All SRs')}</select></span></label>
     <label><span>Chain / Channel<select id="ffOutletChain">${selectOptions(chains.map(c=>[c,c]),'All chains')}</select></span></label>
   </div>
   <div class="ffRefReportKpis">
    ${metric('▣','Total Outlets','green',outlets.length)}
    ${metric('✓','Active Outlets','blue',outlets.filter(o=>o.active).length)}
    ${metric('Ⅱ','Inactive','gold',outlets.filter(o=>!o.active).length)}
    ${metric('⚠','With Issues','red',outlets.filter(onIssue).length)}
   </div>
   <div class="ffRefOutletTools">
    ${[
      ['▣','Outlet List','ffOutletJumpList'],['▥','Listing / SKU','ffOutletListing'],['⌖','Outlet Visit','ffOutletVisits'],
      ['⚠','Outlet Issue','ffOutletTopIssue'],['⊕','New Outlet Request','ffOutletRequest'],
      ['♙','Outlet Assignment','ffOutletAssignment'],['▥','Outlet Performance','ffOutletPerformance'],
      ['⊖','Outlet Closure / Inactive','ffOutletTopClosure'],['⌖','Outlet Mapping','ffOutletMap'],['◷','Outlet History','ffOutletJumpHistory']
    ].map(([icon,label,id])=>`<button type="button" class="ffRefButton" id="${id}"><i aria-hidden="true">${icon}</i><span>${label}</span></button>`).join('')}
   </div>
   <section class="ffRefPanel">
    <header class="ffRefListHead"><h2 id="ffOutletCount">Outlet List</h2>
     <label class="ffRefSearch"><i aria-hidden="true">⌕</i><input type="search" id="ffOutletHistorySearch" aria-label="Search outlets" placeholder="Search outlet / code / chain"></label>
    </header>
    <details class="ffRefOutletFilters ffRefManage"><summary>Outlet status / select by name</summary>
    <label class="ffRefSearch">Outlet status<select id="ffOutletStatus"><option value="">All statuses</option><option>Active</option><option>Inactive</option><option>Issue</option></select></label>
    <label class="ffRefSearch">Assigned Outlet<select id="ffOutletHistorySelect"></select></label></details>
    <div class="ffRefOutletViewport"><table><thead><tr><th>Outlet</th><th>Chain</th><th>SR</th><th>Listing</th><th>Last Proof</th><th>Status</th></tr></thead><tbody id="ffOutletHistoryRows"></tbody></table></div>
   </section>
   ${errors.map(e=>`<p role="alert">${E(e)} · History is incomplete.</p>`).join('')}
   <div id="ffOutletHistoryDetail"></div>
   <section class="ffRefPanel ffRefQuickActions"><h2>⚡ Quick Actions</h2>
    <div class="ffRefReportKpis">
     ${canEdit?'<button type="button" class="ffRefButton" data-color="green" id="ffOutletManage">＋ Add New Outlet</button>':'<button type="button" class="ffRefButton" data-color="green" id="ffOutletQuickRequest">＋ New Outlet Request</button>'}
     ${canEdit?'<button type="button" class="ffRefButton" data-color="blue" id="ffOutletImport">⇧ Bulk Import (Excel)</button>':'<button type="button" class="ffRefButton" data-color="blue" id="ffOutletExcel" data-outlet-export="xlsx">⇩ Outlet List (Excel)</button>'}
     <button type="button" class="ffRefButton" data-color="red" id="ffOutletPdf" data-outlet-export="pdf">⇩ Outlet List (PDF)</button>
     <button type="button" class="ffRefButton" data-color="purple" id="ffOutletVisitReport">▤ Outlet Summary Report</button>
    </div>
    <p id="ffOutletActionStatus" class="ffRefHint" role="status"></p>
   </section>
   <div class="ffRefOutletSecondary">
    ${canEdit?'<button type="button" class="secondary" id="ffOutletExcel" data-outlet-export="xlsx">⇩ Export Outlet List (Excel)</button>':''}
    <button type="button" class="secondary" id="ffOutletHistoryReload">↻ Refresh History</button>
   </div>
  </section>`);
  const select=$('#ffOutletHistorySelect'),previousOutlet=lastHistory;
  const visits=new Map();
  for(const row of data[2]){
   if(!row.outlet_code)continue;
   const key=JSON.stringify([row.sr_id,String(row.outlet_code)]),date=row.execution_date;
   if(date&&date>(visits.get(key)||''))visits.set(key,date);
  }
  const lastVisit=o=>visits.get(JSON.stringify([o.sr,String(o.code)]))||'—';
  let filtered=[];
  const fill=()=>{
   const term=$('#ffOutletHistorySearch').value.trim().toLowerCase(),old=select.value;
   const zone=$('#ffOutletZone').value,staff=$('#ffOutletStaff').value,chain=$('#ffOutletChain').value,status=$('#ffOutletStatus').value;
   const list=outlets.map((o,i)=>({o,i})).filter(({o})=>(!zone||ctx.staff(o.sr)?.zone===zone)&&(!staff||staff===o.sr)&&(!chain||chain===o.category)&&(!status||status===state(o))&&
    (!term||[o.name,o.code,o.category,who(o.sr)].join(' ').toLowerCase().includes(term)));
   filtered=list;
   const counts=[list.length,list.filter(({o})=>o.active).length,list.filter(({o})=>!o.active).length,list.filter(({o})=>onIssue(o)).length];
   document.querySelectorAll('.ffRefOutlet > .ffRefReportKpis .ffRefMetric strong').forEach((el,i)=>{el.textContent=counts[i];});
   $('#ffOutletCount').textContent='Outlet List ('+list.length+')';
   select.innerHTML=selectOptions(list.map(({o,i})=>[i,o.name+' ('+o.code+') · '+who(o.sr)]),'Choose an outlet');
   select.value=list.some(v=>String(v.i)===old)?old:list.length?String(list[0].i):'';
   if(select.value)draw();else $('#ffOutletHistoryDetail').innerHTML='<section class="ffRefPanel"><h2>Outlet Details</h2><p class="ffRefHint">No outlet selected.</p></section>';
   $('#ffOutletHistoryRows').innerHTML=list.map(({o,i})=>`<tr><td><button class="secondary" type="button" data-ref-outlet="${i}">${E(o.name)}<small>${E(o.code)}</small></button></td><td>${E(o.category||'—')}</td><td>${E(who(o.sr))}</td><td>${E(o.totalSku??'—')}</td><td>${E(lastVisit(o))}</td><td><span class="ffRefStatus" data-status="${state(o)}">${state(o)}</span></td></tr>`).join('')||
     '<tr><td colspan="6">No outlets match this selection.</td></tr>';
   document.querySelectorAll('[data-ref-outlet]').forEach(button=>button.onclick=()=>{
     select.value=button.dataset.refOutlet;
     draw();
     $('#ffOutletHistoryDetail').scrollIntoView({block:'nearest',behavior:'smooth'});
   });
  };
  function edit(o){
   const overlay=document.createElement('div');
   overlay.className='globalSearchOverlay ffInsetDialog';
   overlay.innerHTML=`<section class="globalSearchBox" role="dialog" aria-modal="true" aria-label="Outlet assignment"><form class="form">
    <div class="row"><h2>${o?'Edit Outlet':'Add New Outlet'}</h2><button type="button" data-close>Close</button></div>
    ${o?'<p>'+E(who(o.sr))+' · '+E(o.code)+'</p>':`<label>Sales Representative<select name="sr" required>${selectOptions(ids.map(sid=>[sid,who(sid)]),'Choose SR')}</select></label><label>Outlet code<input name="code" required maxlength="120"></label>`}
    <label>Outlet name<input name="name" value="${E(o?.name||'')}" required maxlength="250"></label>
    <label>Chain / Channel<input name="category" value="${E(o?.category||'')}" required maxlength="160"></label>
    <label>Listing / SKU count<input name="sku" type="number" min="0" max="999999" required value="${Number(o?.totalSku)||0}"></label>
    <label>Status<select name="active"><option value="yes" ${o?.active===false?'':'selected'}>Active</option><option value="no" ${o?.active===false?'selected':''}>Inactive</option></select></label>
    <button type="submit" class="primary">Save Outlet</button><p role="status"></p>
   </form></section>`;
   document.body.append(overlay);
   const close=window.FFH_OVERLAY?.(overlay,()=>overlay.remove())||(()=>overlay.remove());
   overlay.querySelector('[data-close]').onclick=close;
   overlay.querySelector('form').onsubmit=async e=>{
     e.preventDefault();
     if(me()!==id)return close();
     const values=Object.fromEntries(new FormData(e.currentTarget)), button=e.submitter;
     const patch={outlet_name:values.name.trim(),category:values.category.trim(),total_sku:Number(values.sku),active:values.active==='yes',updated_at:new Date().toISOString()};
     if(o?.active&&!patch.active&&!confirm('Mark '+o.name+' inactive?'))return;
     if(!patch.outlet_name||!patch.category)return;
     button.disabled=true;
     try{
       let query=o?sb.from('ffh_outlets').update(patch).eq('id',o.id):sb.from('ffh_outlets').insert({...patch,sr_id:values.sr,outlet_code:values.code.trim()});
       if(o?.updated)query=query.eq('updated_at',o.updated);
       const {data,error}=await query.select('id');
       if(error||!data?.length)throw Error(error?.message||'The outlet changed or you no longer have edit access. Refresh and retry.');
       close();
       if(ctx.page()==='outletHistory')await historyPage();
     }catch(err){overlay.querySelector('[role=status]').textContent=err.message;button.disabled=false;}
   };
  }
  const draw=()=>{
   const o=outlets[+select.value];if(select.value===''||!o)return;
   lastHistory={sr:o.sr,code:o.code};const from=$('#ffOutletHistoryFrom').value,to=$('#ffOutletHistoryTo').value;
   if(from&&to&&from>to){$('#ffOutletHistoryDetail').textContent='From date must be before To date.';return;}
   const range=d=>(!from||String(d||'').slice(0,10)>=from)&&(!to||String(d||'').slice(0,10)<=to);
   const match=r=>r.sr_id===o.sr&&(r.outlet_code?String(r.outlet_code)===String(o.code):r.outlet_name===o.name&&outlets.filter(v=>v.sr===o.sr&&v.name===o.name).length===1);
   const sales=data[0].filter(match).filter(r=>range(r.sale_date)),events=[];
   let total=0,pending=0;const skus=new Map();
   sales.forEach(r=>{if(r.status==='Delivered'){total+=+r.delivered_amount||0;if(r.sku)skus.set(r.sku,(skus.get(r.sku)||0)+(+r.delivered_amount||0));}else if(r.status==='Pending Delivery')pending+=+r.order_amount||0;events.push({date:r.sale_date,title:r.status+' · '+(r.sku||'Daily outlet summary'),detail:(+r.qty||0)+' cartons · Order '+ctx.rm(r.order_amount)+' · Delivered '+ctx.rm(r.delivered_amount),remarks:r.remarks});});
   data[1].filter(r=>r.assigned_to===o.sr&&r.outlet_name===o.name&&outlets.filter(v=>v.sr===o.sr&&v.name===o.name).length===1).filter(r=>range(r.created_date||r.created_at)).forEach(r=>events.push({date:r.created_date||r.created_at,title:'Task · '+r.title+' · '+r.status,detail:r.description,remarks:r.reviewed_at?'Reviewed '+stamp(r.reviewed_at):'',photo:r.proof_photo_url}));
   data[2].filter(match).filter(r=>range(r.execution_date)).forEach(r=>events.push({date:r.execution_date,title:'CPO / Promotion · '+r.status,detail:r.remarks,photo:r.photo_url}));
   data[5].filter(r=>String(r.payload?.outlet_code)===String(o.code)&&r.payload?.outlet_staff_id===o.sr&&range(r.created_at)).forEach(r=>events.push({date:r.created_at.slice(0,10),title:r.category+' · '+r.title,detail:r.payload.description,photo:r.payload.photo}));
   events.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   $('#ffOutletHistoryDetail').innerHTML=`<section class="card ffRefPanel">
    <header class="ffRefListHead"><h2>▣ Outlet Details</h2><div><span class="ffRefStatus" data-status="${state(o)}">${state(o)}</span></div></header>
    <div class="ffRefOutletDetailBody"><div>
     <h3>${E(o.name)}</h3><dl>
      <div><dt>Chain</dt><dd>${E(o.category||'—')}</dd></div>
      <div><dt>Outlet Code</dt><dd>${E(o.code)}</dd></div>
      <div><dt>Assigned SR</dt><dd>${E(who(o.sr))}</dd></div>
      <div><dt>Listing / SKU</dt><dd>${E(o.totalSku??'—')}</dd></div>
      <div><dt>Last Proof</dt><dd>${E(lastVisit(o))}</dd></div>
      <div><dt>Delivered</dt><dd>${ctx.rm(total)}</dd></div>
      <div><dt>Pending Order</dt><dd>${ctx.rm(pending)}</dd></div>
     </dl>
    </div><div class="ffRefOutletDetailsActions">
    ${canEdit?'<button type="button" class="ffRefButton" id="ffOutletEdit">Edit / Update Listing</button>':''}
    <button type="button" class="ffRefButton" id="ffOutletIssue">Report Issue</button>
    ${canEdit?'':'<button type="button" class="ffRefButton" id="ffOutletClosure">Request Closure</button>'}
   <button type="button" class="ffRefButton" id="ffOutletViewActivity">◷ Visit / Activity History</button>
   </div></div></section><details id="ffOutletActivity" class="ffRefPanel ffRefManage"><summary>Outlet Activity (${events.length})</summary>
   <p>${skus.size} delivered SKU(s) in selected dates</p>${[...skus].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([sku,amount])=>`<p>${E(sku)} · ${ctx.rm(amount)}</p>`).join('')}
   ${events.map(x=>`<article class="card"><b>${E(x.title)}</b><p class="miniStat">${E(x.date)}</p><p>${E(x.detail||'')}</p>${x.remarks?`<p>${E(x.remarks)}</p>`:''}${safePhoto(x.photo)}</article>`).join('')||'<div class="card empty">No recorded activity in this selection.</div>'}</details>`;bindPhotos();
   $('#ffOutletViewActivity').onclick=()=>{const activity=$('#ffOutletActivity');activity.open=!activity.open;if(activity.open)activity.scrollIntoView({block:'nearest'});};
   $('#ffOutletEdit')?.addEventListener('click',()=>edit(o));
   $('#ffOutletIssue').onclick=()=>window.ffFindings?.outletFinding('Outlet issue',o);
   $('#ffOutletClosure')?.addEventListener('click',()=>window.ffFindings?.outletFinding('Outlet closure',o));
  };
  $('#ffOutletHistorySearch').oninput=fill;for(const id of ['ffOutletZone','ffOutletStaff','ffOutletChain','ffOutletStatus'])$('#'+id).onchange=fill;select.onchange=draw;$('#ffOutletHistoryFrom').onchange=draw;$('#ffOutletHistoryTo').onchange=draw;$('#ffOutletHistoryReload').onclick=historyPage;$('#ffOutletVisitReport').onclick=outletSummary;$('#ffOutletManage')?.addEventListener('click',()=>edit(null));$('#ffOutletRequest')?.addEventListener('click',()=>window.ffFindings?.outletFinding('New outlet'));fill();
  function outletSummary(){
   const from=$('#ffOutletHistoryFrom').value,to=$('#ffOutletHistoryTo').value;
   const feedback=$('#ffOutletActionStatus');
   if(from&&to&&from>to){feedback.textContent='From date must be on or before To date.';return;}
   const summary=filtered.map(({o})=>{
    const sameOutlet=row=>row.sr_id===o.sr&&(row.outlet_code?String(row.outlet_code)===String(o.code):
     row.outlet_name===o.name&&outlets.filter(v=>v.sr===o.sr&&v.name===o.name).length===1);
    const matches=data[0].filter(row=>sameOutlet(row)&&(!from||row.sale_date>=from)&&(!to||row.sale_date<=to));
    const delivered=matches.filter(row=>row.status==='Delivered');
    return [o.name,o.code,o.category,who(o.sr),delivered.reduce((sum,row)=>sum+(+row.delivered_amount||0),0),
     matches.filter(row=>row.status==='Pending Delivery').reduce((sum,row)=>sum+(+row.order_amount||0),0),lastVisit(o),state(o)];
   });
   const columns=['Outlet','Code','Chain','Assigned SR','Delivered (RM)','Pending (RM)','Last Proof','Status'];
   const overlay=document.createElement('div');overlay.className='globalSearchOverlay ffInsetDialog';
   overlay.innerHTML=`<section class="globalSearchBox" role="dialog" aria-modal="true" aria-label="Outlet Summary Report">
    <div class="row"><h2>Outlet Summary Report</h2><button type="button" class="secondary" data-close>Close</button></div>
    <p>${E(from||'First record')} → ${E(to||'Latest record')} · ${summary.length} outlets</p>
    <div class="ffRefOutletViewport"><table><thead><tr>${columns.map(v=>'<th>'+E(v)+'</th>').join('')}</tr></thead>
    <tbody>${summary.map(row=>'<tr>'+row.map(v=>'<td>'+E(v??'')+'</td>').join('')+'</tr>').join('')}</tbody></table></div>
    <div class="ffRefExports"><button type="button" class="ffRefButton" data-outlet-export="pdf">PDF</button>
    <button type="button" class="ffRefButton" data-outlet-export="xlsx">Excel</button></div><p role="status"></p></section>`;
   document.body.append(overlay);
   const close=window.FFH_OVERLAY?.(overlay,()=>overlay.remove())||(()=>overlay.remove());
   overlay.querySelector('[data-close]').onclick=close;
   overlay.querySelectorAll('[data-outlet-export]').forEach(button=>button.onclick=()=>{
    return ctx.exportFile(button,'Outlet Summary',[columns,...summary],overlay.querySelector('[role=status]'));
   });
  }
  const jump=(selector)=>$(selector)?.scrollIntoView({block:'start'});
  const selected=()=>select.value===''?null:outlets[Number(select.value)];
  const requireOutlet=action=>()=>{
   const outlet=selected();
   if(outlet)action(outlet);
   else {$('#ffOutletActionStatus').textContent='Select an outlet first.';jump('#ffOutletCount');}
  };
  $('#ffOutletJumpList').onclick=()=>{jump('#ffOutletCount');$('#ffOutletHistorySearch').focus({preventScroll:true});};
  $('#ffOutletListing').onclick=requireOutlet(o=>canEdit?edit(o):jump('#ffOutletHistoryDetail'));
  const openActivity=()=>{const activity=$('#ffOutletActivity');if(activity){activity.open=true;jump('#ffOutletActivity');}else jump('#ffOutletHistoryDetail');};
  $('#ffOutletVisits').onclick=requireOutlet(openActivity);
  $('#ffOutletTopIssue').onclick=requireOutlet(o=>window.ffFindings?.outletFinding('Outlet issue',o));
  $('#ffOutletAssignment').onclick=()=>{if(canEdit)ctx.manageOutlets();else{select.closest('details').open=true;select.focus();}};
  $('#ffOutletImport')?.addEventListener('click',()=>ctx.manageOutlets());
  $('#ffOutletPerformance').onclick=requireOutlet(()=>jump('#ffOutletHistoryDetail'));
  $('#ffOutletTopClosure').onclick=requireOutlet(o=>canEdit?edit(o):window.ffFindings?.outletFinding('Outlet closure',o));
  $('#ffOutletMap').onclick=requireOutlet(o=>{
   const query=encodeURIComponent([o.name,o.category,'Malaysia'].filter(Boolean).join(' '));
   window.open('https://www.google.com/maps/search/?api=1&query='+query,'_blank','noopener');
  });
  $('#ffOutletJumpHistory').onclick=requireOutlet(openActivity);
  $('#ffOutletQuickRequest')?.addEventListener('click',()=>$('#ffOutletRequest').click());
  for(const button of document.querySelectorAll('[data-outlet-export]')){
   button.onclick=()=>ctx.exportFile(button,'Outlet List',[
    ['Outlet','Code','Chain','Sales Representative','Listing / SKU','Last Proof','Status'],
    ...filtered.map(({o})=>[o.name,o.code,o.category,who(o.sr),o.totalSku,lastVisit(o),state(o)])
   ],$('#ffOutletActionStatus'));
  }
  if(selection.staff&&ids.includes(selection.staff)){$('#ffOutletStaff').value=selection.staff;fill();}
  const requested=previousOutlet;
  if(requested){const i=outlets.findIndex(o=>o.sr===requested.sr&&o.code===requested.code);if(i>=0&&filtered.some(item=>item.i===i)){select.value=String(i);draw();}}
 }
 window.addEventListener('online',()=>flush().catch(console.warn));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush().catch(console.warn);});
 return {queueOrder,flush,syncPage,approvals,historyPage};
};
