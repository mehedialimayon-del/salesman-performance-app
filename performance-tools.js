/* Performance helpers reuse existing authenticated APIs and their permissions. */
window.FFH_CREATE_PERFORMANCE_TOOLS = function(ctx) {
 window.FFH_OPEN_DASHBOARD_SHORTCUT = page => {
  if (page === 'sales' || page === 'zero' || page === 'reports') ctx.open(page);
 };
 'use strict';
 const $=s=>document.querySelector(s), E=ctx.esc, sb=ctx.sb;
 let flushing=null, ticket=0, lastHistory=null, syncFilter={},syncSettingsOpen=false;
 const approvalFilters=new Map();
 const me=()=>ctx.user()?.id;
 const key=id=>'ffh_order_outbox_v1_'+id;
 const read=id=>{const raw=localStorage.getItem(key(id));if(!raw)return [];let rows;try{rows=JSON.parse(raw);}catch(e){throw Error('Saved orders could not be read. Keep app data and contact Ayon.');}if(!Array.isArray(rows)||rows.some(x=>!x||typeof x!=='object'||typeof x.id!=='string'||!x.id||typeof x.actor!=='string'||!x.actor||!x.order||typeof x.order!=='object'||typeof x.order.sr!=='string'||!x.order.sr))throw Error('Saved orders contain invalid data. Keep app data and contact an administrator; nothing has been deleted.');return rows;};
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
  if(!order||typeof order!=='object'||typeof order.id!=='string'||!order.id.trim())throw Error('Order ID is required before saving offline.');
  if(typeof order.sr!=='string'||!order.sr.trim())throw Error('Staff ID is required before saving offline.');
  if(!scopedIds().includes(order.sr))throw Error('Choose an assigned SR');
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
  $('#ffSyncRetry').onclick=async e=>{
   const button=e.currentTarget||e.target;
   button.disabled=true;
   const message=$('#ffSyncMessage');if(message)message.textContent='Checking saved orders…';
   try{
    await ctx.refreshStaff();
    // An account switch during an awaited permission refresh must never sync
    // another account's outbox or display the previous user's order counts.
    if(me()!==id)return;
    await flush(true);
    if(me()!==id||ctx.page()!=='offlineSync')return;
    const current=read(id),status=$('#ffSyncMessage');
    if(status)status.textContent=current.length?`${current.length} order(s) still require attention. Open Sync Settings for details.`:'All saved orders on this phone have been checked.';
   }catch(err){
    if(me()===id&&ctx.page()==='offlineSync'){const status=$('#ffSyncMessage');if(status)status.textContent=err.message;}
   }finally{if(button.isConnected)button.disabled=false;}
  };
 }
 async function approvals(){
  const id=me(), turn=++ticket;
  page('approvals','Approval Inbox','<div class="card" role="status">Loading your permitted requests…</div>');
  const inboxSources=[rows('ffh_tasks','created_at'),rpc('ffh_governance','state'),rpc('ffh_earnings','state'),rpc('ffh_claims_api','state'),ctx.refreshStaff(),rows('ffh_outlet_closures','created_at')];
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
  (gov.requests||[]).forEach(x=>items.push({kind:'Access / correction',id:x.id,staff:x.staff_id,title:x.module+' · '+x.action,detail:x.reason+' · Record '+x.record_id,status:x.status,date:x.created_at,reviewer:x.reviewed_by,reviewedAt:x.reviewed_at,can:false,canGovern:permissionsFresh&&x.status==='Pending'&&x.staff_id!==id&&(id==='M21954'||x.module==='sales'&&x.reviewer_staff_id===id&&ctx.isMgr()&&allowed.has(x.staff_id)&&ctx.may('sales')),open:'access',raw:x}));
  (earn.entries||[]).forEach(x=>items.push({kind:'Incentive / penalty',id:x.id,staff:x.staff_id,title:x.kind+' · '+ctx.rm(x.amount),detail:x.reason,status:x.status,date:x.created_at||x.entry_date,reviewer:x.approved_by,reviewedAt:x.reviewed_at,can:false,canIncomeReview:earn.can_approve===true&&x.status==='Pending'&&x.staff_id!==id,open:'incomeLedger',raw:x}));
  (claims.claims||[]).forEach(x=>items.push({kind:'Existing claim',id:x.id,staff:x.owner_staff_id,title:x.title,detail:x.kind,status:x.status,date:x.created_at,reviewer:x.reviewer_staff_id,reviewedAt:x.reviewed_at,can:false,open:'claim:'+x.id,raw:x}));
  const closureRequests=results[5].status==='fulfilled'?results[5].value:[];
  for(const x of closureRequests)items.push({kind:'Outlet closure',staff:x.requested_by,title:x.outlet_name+' · '+x.outlet_code,
   detail:[x.reason,x.review_reason,x.effective_on?'Reports exclude outlet activity from '+x.effective_on+' MYT':''].filter(Boolean).join(' · '),
   status:x.status,date:x.created_at,reviewer:x.reviewed_by,reviewedAt:x.reviewed_at,closure:x,
   canClose:permissionsFresh&&ctx.may('outlets')&&(allowed.has(x.outlet_sr_id)||x.outlet_sr_id===id)&&x.status==='Pending'});
  const errors=results.map((x,i)=>x.status==='rejected'?['Tasks','Access requests','Income requests','Claims','Permissions','Outlet closure'][i]+': '+x.reason.message:'').filter(Boolean);
  const icons={
   inbox:'<path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 4V2h8v5H8zM8 14l3 3 5-6"/>',
   settings:'<path d="M4 7h16M4 17h16M8 3v8m8 2v8"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
   search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
   types:'<path d="m12 2 10 5-10 5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/>',
   calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-14 4h2m3 0h2m3 0h2"/>',
   refresh:'<path d="M20 10a8 8 0 1 0-1 8m-2-9 4 2 1-5M4 14a8 8 0 0 0 1 4"/>',
   staff:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-4c0-5 14-5 14 0v4zM18 7h5m-2.5-2.5v5"/>',
   money:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 10c0 4 16 4 16 0M4 15c0 4 16 4 16 0"/>',
   add:'<path d="M13 3H5v18h14v-9M8 12h7m-7 4h7M17 4v6m-3-3h6"/>',
   outlet:'<path d="M3 21h18M5 21V9h5V3h7v18m-5-13h2m-2 5h2m-2 5h2M7 13h1m-1 4h1"/>',
   key:'<circle cx="16" cy="8" r="5"/><path d="m12 12-9 9v-4l3-3h3v-3"/>',
   incentive:'<path d="m3 13 10-10h8v8L11 21zM9 15l6-6M9 10h.01M15 15h.01"/>',
   claim:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M15 8h-5v4h4v4H9m3-10v12"/>',
   document:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8m-8 4h8"/>',
   bolt:'<path d="M14 2 4 14h7l-1 8 10-12h-7z"/>',
   history:'<path d="M4 21h16M6 17v-4m5 4V9m5 8V5m4 12V2"/>',
   empty:'<path d="M3 13l3-8h12l3 8v7H3zM3 13h5l2 4h4l2-4h5"/>',
   info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'
  };
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  const actionButton=(key,label,glyph)=>`<button type="button" class="secondary" data-approval-action="${key}">${icon(glyph)}<span>${label}</span></button>`;
  const quickActions=[
   ['new','New Request','add'],['outlet','Outlet Access','outlet'],['permission','Permission Request','key'],
   ['incentive','Incentive Claim','incentive'],['expense','Expense Claim','claim'],['document','Document Upload','document']
  ];
  const categories=[...new Set(items.map(x=>x.kind))];
  const states={pending:['Pending','Pending Review','Submitted'],approved:['Approved','Done'],returned:['Returned','Rejected']};
  const metrics=[['all','▤','All Requests','blue'],['pending','◷','Pending','gold'],['approved','✓','Approved','green'],['returned','✕','Rejected','red']];
  page('approvals','Approval Inbox',`<section class="ffApprovalScreen">
   <div class="ffApprovalTitle">${icon('inbox')}<h1><em>Approval</em> Inbox</h1><div class="ffApprovalHeaderTools"><button type="button" id="ffApprovalSearchToggle" aria-label="Search requests">${icon('search')}</button><button type="button" id="ffApprovalHeaderDate" aria-label="Select date">${icon('calendar')}</button><button type="button" id="ffApprovalHeaderStatus" aria-label="Filter status">${icon('settings')}</button><button type="button" id="ffApprovalMore" aria-label="More approval settings">⋮</button></div></div>
   <div class="card ffPerformanceIntro ffApprovalControls"><div class="two">
    <label><span>${icon('settings')} Status</span><select id="ffApprovalStatus"><option value="pending">Waiting for review</option><option value="approved">Approved / done</option><option value="returned">Returned / rejected</option><option value="all">All history</option></select></label>
    <label><span>${icon('search')} Search</span><input id="ffApprovalSearch" type="search" placeholder="Staff, outlet, task or request"></label>
    <label><span>${icon('types')} Request Type</span><select id="ffApprovalType"><option value="">All request types</option>${categories.map(kind=>`<option>${E(kind)}</option>`).join('')}</select></label>
    <div class="ffApprovalDateControl"><span>${icon('calendar')} Date Range</span><button type="button" id="ffApprovalDates" class="secondary">All dates ${icon('calendar')}</button></div>
   </div>${errors.map(s=>`<p role="alert">${E(s)} · Some requests could not load.</p>`).join('')}</div>
   <div class="ffApprovalAdmin"><button type="button" class="primary" id="ffApprovalReward">${icon('add')}<span>New Request</span><small>Create a new request (Incentive, Penalty, Access, Permission, Expense &amp; More)</small><b aria-hidden="true">›</b></button></div><div class="ffOfficialQuick">${[['outlet','Outlet Access','outlet'],['permission','Permission Request','key'],['expense','Expense Claim','claim'],['buyer','Buyer Bill','claim'],['document','Documents Upload','document']].map(action=>actionButton(...action)).join('')}</div>
   <div class="ffRefReportKpis" id="ffApprovalMetrics">${metrics.map(([key,glyph,label,tone])=>`<button type="button" data-approval-status="${key}" class="ffRefMetric" data-color="${tone}" aria-pressed="${key==='pending'}"><i aria-hidden="true">${glyph}</i><span>${label}</span><strong></strong></button>`).join('')}</div>
   <section class="ffApprovalPanel"><header><h2>${icon('bolt')} Quick Actions for SR</h2><button type="button" class="secondary" id="ffApprovalAllActions">View All →</button></header>
    <div class="ffApprovalQuick">${quickActions.map(action=>actionButton(...action)).join('')}</div>
   </section>
   <section class="ffApprovalPanel ffApprovalRequestPanel"><header><h2>${icon('history')} My Access &amp; Requests</h2><button type="button" class="secondary" id="ffApprovalHistory">View History →</button></header>
    <div class="ffApprovalRequestTabs" role="group" aria-label="Filter my requests"><button type="button" data-request-tab="all" aria-pressed="true">All</button><button type="button" data-request-tab="pending" aria-pressed="false">Pending</button><button type="button" data-request-tab="approved" aria-pressed="false">Approved</button><button type="button" data-request-tab="returned" aria-pressed="false">Rejected</button></div><div id="ffApprovalRecent"></div>
   </section>
   <p id="ffApprovalCount" role="status"></p><div id="ffApprovalList"></div>
   <aside class="ffApprovalHelp">${icon('info')}<ul><li>You see only requests allowed by your existing access.</li><li>SRs can follow their submissions.</li><li>Task review requires Manager access plus Tasks Edit.</li><li>Income review requires separate approval permission.</li><li>Claims stay with their assigned reviewer.</li><li>An authorized administrator applies permission changes after review.</li></ul></aside>
  </section>`);
  const inbox=$('.ffApprovalScreen');
  const filters=approvalFilters.get(id)||{status:'pending',type:'',search:'',from:'',to:''};
  approvalFilters.set(id,filters);
  $('#ffApprovalStatus').value=filters.status;
  $('#ffApprovalType').value=categories.includes(filters.type)?filters.type:'';
  $('#ffApprovalSearch').value=filters.search;
  const myItems=items.filter(x=>x.staff===id||(ctx.isMgr()&&allowed.has(x.staff))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const formatDate=value=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(value)):'';
  const dateKey=value=>{
   const date=new Date(value);
   return value&&!Number.isNaN(date.valueOf())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kuala_Lumpur'}).format(date):'';
  };
  const matchesDate=x=>{
   const day=dateKey(x.date);
   return (!filters.from&&!filters.to)||Boolean(day&&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to));
  };
  const dateButton=()=>{
   const {from,to}=filters;
   $('#ffApprovalDates').innerHTML=`<span>${!from&&!to?'All dates':from===to?formatDate(from):[formatDate(from),formatDate(to)].filter(Boolean).join(' – ')}</span>${icon('calendar')}`;
  };
  function approvalDialog(title,body){
   const dialog=document.createElement('dialog');
   dialog.className='ffApprovalDialog';
   dialog.setAttribute('aria-label',title);
   dialog.innerHTML=`<header><h2>${E(title)}</h2><button type="button" class="secondary" data-close>Close</button></header>${body}`;
   document.body.append(dialog);
   dialog.querySelector('[data-close]').onclick=()=>dialog.close();
   dialog.addEventListener('close',()=>dialog.remove(),{once:true});
   dialog.showModal();
   return dialog;
  }
  $('#ffApprovalDates').onclick=()=>{
   const dialog=approvalDialog('Date Range',`<form class="form"><label>From<input type="date" name="from" value="${E(filters.from)}"></label><label>To<input type="date" name="to" value="${E(filters.to)}"></label><button type="submit" class="primary">Apply</button><button type="button" class="secondary" data-date-clear>All dates</button><p role="alert"></p></form>`);
   const form=dialog.querySelector('form');
   form.onsubmit=event=>{
    event.preventDefault();
    const {from,to}=Object.fromEntries(new FormData(form));
    if(from&&to&&from>to){form.querySelector('[role=alert]').textContent='From date must be on or before To date.';return;}
    Object.assign(filters,{from,to});dialog.close();draw();
   };
   form.querySelector('[data-date-clear]').onclick=()=>{Object.assign(filters,{from:'',to:''});dialog.close();draw();};
  };
  function recentRow(x,index){
   const color=states.approved.includes(x.status)?'green':states.returned.includes(x.status)?'red':'gold';
   return `<button type="button" class="secondary ffApprovalRecentRow" data-approval-recent="${index}"><i aria-hidden="true">${color==='green'?'✓':color==='red'?'↩':'◷'}</i><span><b>${E(x.title)}</b><small>${E(who(x.staff))} · ${E(x.staff||'')} · ${E(x.detail||x.kind)}</small></span><span><strong class="ffRefStatus" data-color="${color}">${E(x.status)}</strong><small>${E(formatDate(dateKey(x.date)))}</small></span><span aria-hidden="true">›</span></button>`;
  }
  function bindRecent(root){
   root.querySelectorAll('[data-approval-recent]').forEach(button=>button.onclick=()=>{
    const x=myItems[Number(button.dataset.approvalRecent)];
    const history=button.closest('dialog');
    history?.close();
    const historyEvents=x.kind==='Incentive / penalty'?(earn.events||[]).filter(event=>event.entry_id===x.id):[];
    const audit=historyEvents.length?`<section class="ffApprovalAudit"><h3>Decision History</h3>${historyEvents.map(event=>`<article><strong>${E(event.action)}</strong> · ${E(who(event.actor))}<small>${E(stamp(event.created_at))}</small><p>${E(event.reason||'No note')}</p></article>`).join('')}</section>`:'';
    const actions=`${x.canGovern?'<button type="button" class="primary" data-recent-govern>Review Request</button>':''}${x.canIncomeReview?'<button type="button" class="primary" data-recent-income>Review Income</button>':''}${x.can?'<button type="button" class="primary" data-recent-task="Done">Approve Task</button><button type="button" class="secondary" data-recent-task="Rejected">Return Task</button>':''}`;
    const detail=approvalDialog(x.title,`<p>${E(x.kind)} · ${E(x.status)}</p><p>${E(x.detail)}</p><p>${E(stamp(x.date))}</p>${x.reviewer?`<p>Reviewer: ${E(who(x.reviewer))}</p>`:''}${audit}${safePhoto(x.photo)}<div class="ffRecentActions">${actions}${states.returned.includes(x.status)&&x.staff===id&&x.kind==='Access / correction'?'<button type="button" class="secondary" data-recent-appeal>Revise &amp; Resubmit</button>':''}</div>`);
    detail.querySelectorAll('[data-recent-task]').forEach(control=>control.onclick=async()=>{
     if(!x.can||id!==me()||control.disabled)return;
     if(!window.confirm(control.dataset.recentTask==='Done'?'Approve this task?':'Return this task?'))return;
     detail.querySelectorAll('[data-recent-task]').forEach(button=>button.disabled=true);
     try{await ctx.reviewTask(x.id,control.dataset.recentTask);detail.close();await approvals();}catch(error){alert(error.message);detail.querySelectorAll('[data-recent-task]').forEach(button=>button.disabled=false);}
    });
    const openReview=kind=>{
     detail.close();
     $('#ffApprovalStatus').value='all';$('#ffApprovalSearch').value='';$('#ffApprovalType').value='';Object.assign(filters,{from:'',to:''});draw();
     const index=items.filter(matchesDate).filter(item=>item.id===x.id).length;
     if(!index){alert('This request is not available in the current review list.');return;}
     const target=[...$('#ffApprovalList').querySelectorAll(kind==='income'?'[data-income-review]':'[data-govern-review]')].find(button=>button.closest('article')?.dataset.approvalRequestId===String(x.id));
     if(target)target.click();else alert('Review is not available for this request.');
    };
    detail.querySelector('[data-recent-appeal]')?.addEventListener('click',()=>{
     if(x.staff!==me()||!states.returned.includes(x.status))return;
     detail.close();
     const formDialog=approvalDialog('Revise & Resubmit',`<p>Original request: ${E(x.id)} · ${E(x.title)}</p><p>Previous decision: ${E(x.status)}</p><form class="form"><label>Corrected reason and details *<textarea name="reason" required maxlength="1000" placeholder="Explain the correction and why the request should be reviewed again"></textarea></label><button type="submit" class="primary">Submit Revised Request</button><p role="status" aria-live="polite"></p></form>`);
     const form=formDialog.querySelector('form'),submit=form.querySelector('[type=submit]'),feedback=form.querySelector('[role=status]');
     form.onsubmit=async event=>{
      event.preventDefault();if(!form.reportValidity()||submit.disabled||me()!==id)return;
      const correction=form.elements.namedItem('reason').value.trim();
      if(correction.length<10){feedback.textContent='Please explain the correction in at least 10 characters.';return;}
      if(!window.confirm('Submit a new review request? The original rejected record will remain unchanged.'))return;
      submit.disabled=true;
      try{
       const raw=x.raw||{};
       const module=raw.module;
       const action=raw.action;
       if(!module||!['edit','delete'].includes(action))throw Error('Original request details are unavailable. Please create a new request.');
       await rpc('ffh_governance','request',{module,action,record_id:raw.record_id||'',reviewer_staff_id:raw.reviewer_staff_id||'M21954',reason:'Resubmission of rejected request '+x.id+' | '+correction});
       formDialog.close();if(me()===id&&ctx.page()==='approvals')await approvals();
      }catch(error){feedback.textContent=error.message;}finally{submit.disabled=false;}
     };
    });
    detail.querySelector('[data-recent-govern]')?.addEventListener('click',()=>openReview('govern'));
    detail.querySelector('[data-recent-income]')?.addEventListener('click',()=>openReview('income'));
    bindPhotos();
   });
  }
  let requestTab='all';
  const renderRecent=()=>{
   const tabs={all:myItems,pending:myItems.filter(x=>states.pending.includes(x.status)),approved:myItems.filter(x=>states.approved.includes(x.status)),returned:myItems.filter(x=>states.returned.includes(x.status))};
   inbox.querySelectorAll('[data-request-tab]').forEach(button=>{
    const key=button.dataset.requestTab;
    button.textContent=({all:'All',pending:'Pending',approved:'Approved',returned:'Rejected'})[key]+' ('+tabs[key].length+')';
    button.setAttribute('aria-pressed',String(requestTab===key));
    button.onclick=()=>{requestTab=key;renderRecent();};
   });
   const visible=tabs[requestTab];
   $('#ffApprovalRecent').innerHTML=visible.length?visible.slice(0,5).map(x=>recentRow(x,myItems.indexOf(x))).join(''):'<p class="ffRefHint">No requests in this status.</p>';
   bindRecent(inbox);
  };
  renderRecent();
  $('#ffApprovalHistory').onclick=()=>{
   const dialog=approvalDialog('My Request History',myItems.length?myItems.map(recentRow).join(''):'<p>No requests submitted yet.</p>');
   bindRecent(dialog);
  };
  function openRequest(kind){
   if(kind==='new')return openOfficialRequest();
   const title=quickActions.find(action=>action[0]===kind)[1];
   const dialog=approvalDialog(title,`<form class="form">
    ${kind==='outlet'?'<label>Outlet name or code<input name="record_id" maxlength="120" required></label>':'<label>Module<select name="module" required>'+[['tasks','Tasks'],['outlets','Outlets'],['sales','Sales'],['catalogue','Catalogue'],['routes','Route Plan'],['reports','Reports'],['contacts','Contacts'],['income','Income'],['proposals','Proposal Library']].map(([value,label])=>`<option value="${value}">${label}</option>`).join('')+'</select></label>'}
    ${kind==='permission'?'<label>Permission needed<select name="permission"><option>View</option><option>Edit</option><option>Upload</option><option>Delete</option></select></label>':''}
    <label data-sales-approver hidden>Forward Sales Request To<select name="reviewer_staff_id"><option value="M21954">Owner</option>${gov.my_manager?.staff_id&&gov.my_manager.staff_id!=='M21954'?'<option value="'+E(gov.my_manager.staff_id)+'">'+E(gov.my_manager.full_name||gov.my_manager.staff_id)+' (My Manager)</option>':''}</select><small>Only sales requests can be assigned to a zonal manager. Other requests go to Owner.</small></label>
    <label>Reason<textarea name="reason" maxlength="1000" required></textarea></label>
    <button type="submit" class="primary">Submit request</button><p role="status"></p>
   </form>`);
   const form=dialog.querySelector('form'),submit=form.querySelector('[type=submit]');
   const reviewerField=form.elements.namedItem('reviewer_staff_id'),moduleField=form.elements.namedItem('module');
   const syncReviewer=()=>{const sales=kind==='permission'&&moduleField?.value==='sales';reviewerField.closest('label').hidden=!sales;reviewerField.disabled=!sales;if(!sales)reviewerField.value='M21954';};
   moduleField?.addEventListener('change',syncReviewer);syncReviewer();
   form.onsubmit=async event=>{
    event.preventDefault();if(submit.disabled||id!==me())return;
    const values=Object.fromEntries(new FormData(form)),reason=values.reason.trim(),record=values.record_id?.trim(),feedback=form.querySelector('[role=status]');
    if(!reason||(kind==='outlet'&&!record)){feedback.textContent='Complete the request details before submitting.';return;}
    submit.disabled=true;
    try{
     await rpc('ffh_governance','request',{module:kind==='outlet'?'outlets':values.module,action:'edit',record_id:kind==='permission'?'permission:'+values.permission.toLowerCase():record,reason:kind==='permission'?values.permission+' permission: '+reason:'Outlet access: '+reason,reviewer_staff_id:kind==='permission'&&values.module==='sales'&&values.reviewer_staff_id===gov.my_manager?.staff_id?values.reviewer_staff_id:'M21954'});
     if(dialog.open&&id===me()&&ctx.page()==='approvals'){dialog.close();await approvals();}
    }catch(error){feedback.textContent=error.message;}finally{submit.disabled=false;}
   };
  }
  function openOfficialRequest(){
   const types=[['incentive','🏆','Incentive Request'],['penalty','▤','Penalty Request'],['access','▣','Access Request'],['permission','⚿','Permission Request'],['expense','▧','Expense Claim'],['other','▦','Other Request']];
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
   const month=today.slice(0,7);
   const staffOptions=`<option value="${E(id)}" selected>${E(who(id))} · ${E(id)}</option>`;
   const dialog=approvalDialog('New Request',`<div class="ffOfficialIntro">Create a new official request (Incentive, Penalty, Access, Permission, Expense & More)</div>
    <div class="ffOfficialTabs">${types.map(([key,glyph,label],i)=>`<button type="button" data-official-type="${key}" aria-pressed="${i===0}"><span>${glyph}</span>${label}</button>`).join('')}</div>
    <form class="form ffOfficialForm">
     <h3 data-official-heading>🏆 Incentive Request Details</h3>
     <div class="two"><label><span data-official-type-label>Incentive Type *</span><select name="category" required><option value="">Select Incentive Type</option><option>Sales Target</option><option>Performance</option><option>Campaign</option><option>Attendance</option><option>Other</option></select></label><label>Related To *<select name="related" required><option value="">Select Related To</option><option>Sales</option><option>Activity</option><option>Target</option><option>Outlet</option><option>Other</option></select></label></div>
     <div class="two"><label><span data-official-amount-label>Incentive Amount (RM) *</span><input name="amount" type="number" min="0.01" max="1000000" step="0.01" required placeholder="0.00"></label><label>Period / Month *<input name="period" type="month" max="${month}" value="${month}" required></label></div>
     <h3>♙ Staff & Approval</h3>
     <div class="two"><label>Request for (Staff / SR) *<select name="staff_id" required>${staffOptions}</select><small>Requests are submitted under your own signed-in staff ID.</small></label><label>Forward to (Approver) *<select name="approver" required><option value="M21954">Owner (current governance reviewer)</option></select></label></div>
     <h3>▤ Request Reason & Details</h3>
     <label>Reason / Description *<textarea name="reason" maxlength="500" required placeholder="Describe your request with details (target, performance, campaign etc.)"></textarea><small data-official-count>0 / 500</small></label>
     <h3>♧ Proof / Attachment (Optional)</h3>
     <label class="ffOfficialDrop">☁ Tap to Add File / Document<input name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"><small>Photo (Camera/Gallery) | PDF · Maximum 10 MB</small></label><small data-official-proof role="status">No attachment selected</small><button type="button" class="secondary ffOfficialClearProof" data-official-clear-proof hidden>Remove Attachment</button>
     <section class="ffOfficialPreviewPanel" data-official-preview-panel hidden aria-live="polite"></section>
     <div class="ffOfficialActions"><button type="button" class="secondary" data-official-draft>Save as Draft</button><button type="button" class="secondary" data-official-discard>Discard Draft</button><button type="button" class="secondary" data-official-preview>Preview</button><button type="submit" class="primary">Submit Request</button></div><p role="status"></p>
    </form>`);
   dialog.classList.add('ffOfficialDialog');
   const form=dialog.querySelector('form'),status=form.querySelector('[role=status]'),file=form.elements.namedItem('proof');
   const draftKey='ffh_official_request_draft_'+id;let selected='incentive';
   const setType=key=>{
    selected=key;const existingPreview=form.querySelector('[data-official-preview-panel]');if(existingPreview)existingPreview.hidden=true;
    const title=types.find(x=>x[0]===key)?.[2]||'Other Request';
    dialog.querySelector('[data-official-heading]').textContent=title+' Details';
    dialog.querySelector('[data-official-type-label]').textContent=key==='penalty'?'Penalty Type *':'Request Type *';
    dialog.querySelector('[data-official-amount-label]').textContent=key==='penalty'?'Penalty Amount (RM) *':'Amount (RM) *';
    dialog.querySelectorAll('[data-official-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.officialType===key)));
    const financial=['incentive','penalty','expense'].includes(key);
    const related=form.elements.namedItem('related');
    related.closest('label').hidden=!financial;
    related.required=financial;
    const category=form.elements.namedItem('category');
    const labels={incentive:['Sales Target','Performance','Campaign','Attendance','Other'],penalty:['Attendance','Outlet Visit','Performance','Policy','Other'],access:['Outlet Access','System Access','Staff Access','Other'],permission:['View','Edit','Upload','Delete','Other'],expense:['Transport','Entertainment','Meals','Other'],other:['General Request','Document','Support','Other']};
    const previous=category.value;category.innerHTML='<option value="">Select '+title.replace(' Request','')+' Type</option>'+labels[key].map(x=>'<option>'+E(x)+'</option>').join('');if(labels[key].includes(previous))category.value=previous;
    form.elements.namedItem('amount').required=financial;
    form.elements.namedItem('amount').closest('label').hidden=!financial;
    form.elements.namedItem('period').closest('label').hidden=!financial;
    form.elements.namedItem('period').required=financial;
   };
   dialog.querySelectorAll('[data-official-type]').forEach(b=>b.onclick=()=>setType(b.dataset.officialType));
   setType('incentive');
   form.elements.namedItem('reason').oninput=()=>dialog.querySelector('[data-official-count]').textContent=form.elements.namedItem('reason').value.length+' / 500';
   const clearProof=dialog.querySelector('[data-official-clear-proof]');
   const proofMessage=dialog.querySelector('[data-official-proof]');
   const supportedProof=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
   file.onchange=()=>{
    const selectedFile=file.files[0];
    if(!selectedFile){proofMessage.textContent='No attachment selected';clearProof.hidden=true;return;}
    clearProof.hidden=false;
    if(!supportedProof.has(selectedFile.type)){proofMessage.textContent='Unsupported file. Select JPG, PNG, WebP or PDF.';return;}
    if(selectedFile.size>10*1024*1024){proofMessage.textContent='File exceeds 10 MB. Please select a smaller file.';return;}
    proofMessage.textContent=selectedFile.name+' · '+(selectedFile.size/1024/1024).toFixed(2)+' MB · Secure upload is not yet enabled. Remove file to submit this request.';
   };
   clearProof.onclick=()=>{file.value='';file.onchange();form.querySelector('[data-official-preview-panel]').hidden=true;};
   const previewPanel=form.querySelector('[data-official-preview-panel]');
   form.addEventListener('input',event=>{if(event.target!==file)previewPanel.hidden=true;});
   form.addEventListener('change',()=>{previewPanel.hidden=true;});
   const values=()=>Object.fromEntries([...new FormData(form)].filter(([key])=>key!=='proof'));
   const draftValues=()=>Object.fromEntries(Object.entries(values()).filter(([key])=>!['staff_id','approver'].includes(key)));
   try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(!Number.isFinite(draft?.savedAt)||draft.savedAt>Date.now()+60000||Date.now()-draft.savedAt>24*60*60*1000){sessionStorage.removeItem(draftKey);}else if(draft?.type&&types.some(x=>x[0]===draft.type)){setType(draft.type);for(const [key,value] of Object.entries(draft.values||{})){const field=form.elements.namedItem(key);if(field&&typeof value==='string'&&field.type!=='file'&&key!=='staff_id'&&key!=='approver')field.value=value;}form.elements.namedItem('reason').dispatchEvent(new Event('input'));}}catch{}
   form.querySelector('[data-official-draft]').onclick=()=>{try{sessionStorage.setItem(draftKey,JSON.stringify({type:selected,values:draftValues(),savedAt:Date.now()}));status.textContent=file.files.length?'Text draft saved on this device for this session; attachment is not stored.':'Text draft saved on this device for this session.';}catch(error){status.textContent=error.message;}};
   form.querySelector('[data-official-discard]').onclick=()=>{
    if(!sessionStorage.getItem(draftKey)){status.textContent='No saved draft to discard.';return;}
    if(!window.confirm('Discard the saved draft on this device? Your current form will remain unchanged.'))return;
    try{sessionStorage.removeItem(draftKey);status.textContent='Saved draft discarded. Current form is unchanged.';}catch(error){status.textContent=error.message;}
   };
   form.querySelector('[data-official-preview]').onclick=()=>{
    if(!form.reportValidity())return;
    const v=values(),financial=['incentive','penalty','expense'].includes(selected);
    const selectedFile=file.files[0];
    if(selectedFile&&(!supportedProof.has(selectedFile.type)||selectedFile.size>10*1024*1024)){status.textContent='Remove the unsupported or oversized attachment before previewing.';return;}
    if(financial&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.period)||v.period>month)){status.textContent='Choose a valid period up to the current month.';return;}
    const preview=form.querySelector('[data-official-preview-panel]');
    preview.innerHTML=`<h3>Request Preview</h3><p><strong>${E(types.find(x=>x[0]===selected)[2])}</strong> · ${E(who(id))} (${E(id)})</p><p>${E(v.category)}${financial?` · ${E(v.related)} · ${E(v.period)} · RM ${E(v.amount)}`:''}</p><p>${E(v.reason)}</p><p>Reviewer: Owner / Authorized Reviewer</p><p>${file.files.length?'Attachment selected but cannot be submitted until storage is connected.':'No attachment selected.'}</p>`;
    preview.hidden=false;preview.scrollIntoView({block:'nearest',behavior:'smooth'});
   };
   form.onsubmit=async event=>{
    event.preventDefault();
    const submit=form.querySelector('[type=submit]');
    if(submit.disabled||id!==me()||!form.reportValidity())return;
    const v=values(),proof=file.files[0];
    if(proof){status.textContent=!supportedProof.has(proof.type)?'Unsupported file type. Use JPG, PNG, WebP or PDF.':proof.size>10*1024*1024?'File exceeds 10 MB.':'Secure proof upload is not connected yet. Use Remove Attachment to submit without proof.';return;}
    if(v.staff_id!==id||v.approver!=='M21954'||(['incentive','penalty','expense'].includes(selected)&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.period)||v.period>month))){status.textContent='Invalid staff, approver or period.';return;}
    if(!v.reason.trim()){status.textContent='Reason is required.';return;}
    if(['incentive','penalty','expense'].includes(selected)&&(!Number.isFinite(Number(v.amount))||Number(v.amount)<=0||Number(v.amount)>1000000)){status.textContent='Enter a valid amount.';return;}
    const reason=`${types.find(x=>x[0]===selected)[2]} | Staff: ${id} | Category: ${v.category} | Related: ${['incentive','penalty','expense'].includes(selected)?v.related:'N/A'} | Period: ${['incentive','penalty','expense'].includes(selected)?v.period:'N/A'} | Amount RM: ${['incentive','penalty','expense'].includes(selected)?v.amount:'N/A'} | ${v.reason.trim()}`;
    if(!window.confirm('Submit this official request under your own staff ID? Approval does not automatically change income or permissions.'))return;
    submit.disabled=true;
    try{
     await rpc('ffh_governance','request',{module:['incentive','penalty','expense'].includes(selected)?'income':selected==='access'?'outlets':selected==='permission'?'tasks':'reports',action:'edit',record_id:'request:'+id+':'+crypto.randomUUID(),reason,reviewer_staff_id:'M21954'});
     sessionStorage.removeItem(draftKey);dialog.close();if(id===me()&&ctx.page()==='approvals')await approvals();
    }catch(error){status.textContent=error.message;}finally{submit.disabled=false;}
   };
  }
  function bindQuick(root){
   root.querySelectorAll('[data-approval-action]').forEach(button=>button.onclick=()=>{
    const key=button.dataset.approvalAction;
    button.closest('dialog')?.close();
    if(key==='incentive')return ctx.open('incentive');
    if(key==='expense'||key==='buyer')return ctx.open('claims');
    if(key==='document')return typeof window.FFH_OPEN_CLAIM_DOCUMENT==='function'?window.FFH_OPEN_CLAIM_DOCUMENT():ctx.open('claims');
    openRequest(key);
   });
  }
  bindQuick(inbox);

  $('#ffApprovalAllActions').onclick=()=>bindQuick(approvalDialog('Quick Actions for SR',`<div class="ffApprovalQuick">${quickActions.map(action=>actionButton(...action)).join('')}</div>`));
  const draw=()=>{
   const kind=$('#ffApprovalType').value,term=$('#ffApprovalSearch').value.trim().toLowerCase(),state=$('#ffApprovalStatus').value;
   Object.assign(filters,{type:kind,search:$('#ffApprovalSearch').value,status:state});
   const filtered=items.filter(matchesDate).filter(x=>(!kind||x.kind===kind)&&(!term||[x.kind,x.title,x.detail,who(x.staff),x.staff].join(' ').toLowerCase().includes(term)));
   inbox.querySelectorAll('[data-approval-status]').forEach(button=>{
    const key=button.dataset.approvalStatus;
    button.setAttribute('aria-pressed',String(key===state));
    button.querySelector('strong').textContent=filtered.filter(x=>!states[key]||states[key].includes(x.status)).length;
    button.onclick=()=>{$('#ffApprovalStatus').value=key;draw();};
   });
   dateButton();
   const shown=filtered.filter(x=>!states[state]||states[state].includes(x.status)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   $('#ffApprovalCount').textContent=shown.length+' request(s)';$('#ffApprovalList').innerHTML=shown.map((x,i)=>`<article class="card" data-approval-request-id="${E(x.id)}"><div class="row"><b>${E(x.title)}</b><span class="ffPerformanceStatus">${E(x.status)}</span></div><p>${E(x.kind)} · ${E(who(x.staff))}</p><p>${E(x.detail)}</p><p class="miniStat">Submitted / updated ${E(stamp(x.date))}</p>${x.reviewedAt?`<p class="miniStat">Reviewed ${E(stamp(x.reviewedAt))} · ${E(who(x.reviewer))}</p>`:x.reviewer?`<p>Reviewer: ${E(who(x.reviewer))}</p>`:''}${safePhoto(x.photo)}${x.location?`<p class="miniStat">Location proof: ${E(x.location.latitude)}, ${E(x.location.longitude)} · ${E(stamp(x.location.capturedAt))}</p>`:''}${x.can?`<button class="primary ffInboxDecision" data-index="${i}" data-status="Done">APPROVE TASK</button><button class="secondary ffInboxDecision" data-index="${i}" data-status="Rejected">RETURN TASK</button>`:''}${x.canGovern?`<button type="button" class="primary" data-govern-review="${i}">Approve / Reject Request</button>`:''}${x.canIncomeReview?`<button type="button" class="primary" data-income-review="${i}">Review Income Adjustment</button>`:''}${x.canClose?`<button type="button" class="primary" data-review-closure="${i}">Review closure</button>`:''}${x.open?`<button class="secondary ffInboxOpen" data-index="${i}">OPEN REQUEST / REVIEW</button>`:''}</article>`).join('')||'<div class="ffApprovalEmpty">'+icon('empty')+'<span>No requests match this selection.</span></div>';bindPhotos();document.querySelectorAll('.ffInboxOpen').forEach(b=>b.onclick=()=>{const x=shown[+b.dataset.index];ctx.open(x.open,x.raw);});document.querySelectorAll('.ffInboxDecision').forEach(b=>b.onclick=async()=>{const request=shown[+b.dataset.index];if(!request||!request.can||b.disabled)return;if(!window.confirm(b.dataset.status==='Done'?'Confirm approval of this task?':'Confirm returning/rejecting this task?'))return;const controls=[...document.querySelectorAll('.ffInboxDecision')].filter(el=>el.dataset.index===b.dataset.index);controls.forEach(el=>el.disabled=true);try{await ctx.reviewTask(request.id,b.dataset.status);await approvals();}catch(e){alert(e.message);controls.forEach(el=>el.disabled=false);}});
   document.querySelectorAll('[data-income-review]').forEach(button=>button.onclick=()=>{
    const request=shown[Number(button.dataset.incomeReview)];
    if(!request?.canIncomeReview||me()!==id)return;
    const dialog=approvalDialog('Review Income Adjustment',`<p>${E(who(request.staff))} · ${E(request.title)}</p><p>${E(request.detail)}</p><form class="form"><label>Decision<select name="action"><option value="approve">Approve</option><option value="reject">Reject</option></select></label><label>Decision Reason *<textarea name="reason" maxlength="2000" required></textarea></label><button class="primary" type="submit">Confirm Decision</button><p role="status"></p></form>`);
    const form=dialog.querySelector('form'),status=form.querySelector('[role=status]');
    form.onsubmit=async event=>{
     event.preventDefault();if(!form.reportValidity())return;
     const v=Object.fromEntries(new FormData(form));
     if(!v.reason.trim()){status.textContent='A decision reason is required.';return;}
     if(!window.confirm('Confirm '+v.action+' for '+who(request.staff)+'?'))return;
     const submit=form.querySelector('[type=submit]');submit.disabled=true;
     try{await rpc('ffh_earnings',v.action,{id:request.id,reason:v.reason.trim()});dialog.close();if(me()===id&&ctx.page()==='approvals')await approvals();}
     catch(error){status.textContent=error.message;submit.disabled=false;}
    };
   });
   document.querySelectorAll('[data-govern-review]').forEach(button=>button.onclick=()=>{
    const request=shown[Number(button.dataset.governReview)];
    if(!request?.canGovern||id!==me())return;
    const dialog=approvalDialog('Review request',`<p>${E(who(request.staff))} · ${E(request.title)}</p><p>${E(request.detail)}</p><form class="form"><label>Decision<select name="status"><option value="Approved">Approve</option><option value="Rejected">Reject</option></select></label><label>Review note (required for rejection)<textarea name="note" maxlength="1000"></textarea></label><button class="primary" type="submit">Confirm approval</button><p role="status"></p></form>`);
    const form=dialog.querySelector('form');
    form.onsubmit=async event=>{
     event.preventDefault();
     const values=Object.fromEntries(new FormData(form)),status=form.querySelector('[role=status]');
     if(values.status==='Rejected'){status.textContent='Rejection is unavailable here until the server can persist the rejection reason. Open the request management page instead.';return;}
     if(!window.confirm('Confirm '+values.status.toLowerCase()+' for this request?'))return;
     const submit=form.querySelector('[type=submit]');submit.disabled=true;
     try{await rpc('ffh_governance','review_request',{id:request.id,status:values.status});dialog.close();if(me()===id&&ctx.page()==='approvals')await approvals();}
     catch(error){status.textContent=error.message;submit.disabled=false;}
    };
   });
   document.querySelectorAll('[data-review-closure]').forEach(button=>button.onclick=()=>{
    const request=shown[Number(button.dataset.reviewClosure)];
    if(request?.canClose)reviewClosure(request.closure);
   });
  };
  $('#ffApprovalType').onchange=draw;$('#ffApprovalStatus').onchange=draw;$('#ffApprovalSearch').oninput=draw;
  $('#ffApprovalReward').onclick=()=>openOfficialRequest();
  $('#ffApprovalSearchToggle').onclick=()=>{
   const dialog=approvalDialog('Search Requests',`<form class="form"><label>Search staff, outlet, task or request<input type="search" name="term" placeholder="Type to search" value="${E($('#ffApprovalSearch').value)}" autofocus></label><button class="primary" type="submit">Apply Search</button><button class="secondary" type="button" data-clear>Clear Search</button></form>`);
   const form=dialog.querySelector('form');form.onsubmit=e=>{e.preventDefault();$('#ffApprovalSearch').value=form.elements.namedItem('term').value;draw();dialog.close();};
   dialog.querySelector('[data-clear]').onclick=()=>{$('#ffApprovalSearch').value='';draw();dialog.close();};
   form.elements.namedItem('term').focus();
  };
  $('#ffApprovalHeaderDate').onclick=()=>$('#ffApprovalDates').click();
  $('#ffApprovalHeaderStatus').onclick=()=>{
   const dialog=approvalDialog('Filter by Status',`<div class="ffApprovalMenu">${[['all','All Requests'],['pending','Waiting for Review'],['approved','Approved'],['returned','Returned / Rejected']].map(([value,label])=>`<button type="button" class="secondary" data-status-value="${value}" aria-pressed="${$('#ffApprovalStatus').value===value}">${label}</button>`).join('')}</div>`);
   dialog.querySelectorAll('[data-status-value]').forEach(button=>button.onclick=()=>{$('#ffApprovalStatus').value=button.dataset.statusValue;draw();dialog.close();});
  };
  $('#ffApprovalMore').onclick=()=>{
   const dialog=approvalDialog('Approval Inbox Settings',`<div class="ffApprovalMenu"><button type="button" class="secondary" data-refresh>Refresh Inbox</button><button type="button" class="secondary" data-type>Request Type Filter</button>${id==='M21954'?'<button type="button" class="secondary" data-staff>Staff / Task Access Settings</button><button type="button" class="secondary" data-income>Income Approval Settings</button>':''}</div>`);
   dialog.querySelector('[data-refresh]').onclick=()=>{dialog.close();approvals();};
   dialog.querySelector('[data-type]').onclick=()=>{
    dialog.close();
    const filter=approvalDialog('Filter Request Type',`<div class="ffApprovalMenu">${[['','All Request Types'],...categories.map(value=>[value,value])].map(([value,label])=>`<button type="button" class="secondary" data-type-value="${E(value)}">${E(label)}</button>`).join('')}</div>`);
    filter.querySelectorAll('[data-type-value]').forEach(button=>button.onclick=()=>{$('#ffApprovalType').value=button.dataset.typeValue;draw();filter.close();});
   };
   if(dialog.querySelector('[data-staff]'))dialog.querySelector('[data-staff]').onclick=()=>{dialog.close();ctx.open('access');};
   if(dialog.querySelector('[data-income]'))dialog.querySelector('[data-income]').onclick=()=>{dialog.close();ctx.open('incomeLedger');};
  };
  draw();
 }
 const outletBrands=[
  ['01','Giant_Hypermarket',/^giant/],['02','KK_Super_Mart',/^kksuper/],['03','NSK_Grocer',/^nsk/],
  ['04','MYDIN',/^mydin/],['08','The_Store',/^thestore/],['14','Jaya_Grocer',/^jayagrocer/],
  ['16','TF_Value_Mart',/^tfvaluemart/],['32','MR_DIY',/^mrdiy/]
 ];
 const brand=o=>outletBrands.find(([, ,match])=>[o.category,o.name].some(name=>match.test(String(name||'').toLowerCase().replace(/[^a-z0-9]/g,''))));
 const https=url=>/^https:\/\//i.test(url||'')?url:'';
 // Giant uses retailer item codes. These catalogue codes and costs were verified
 // against the published biscuit proposal's barcode and pack size.
 const giantBiscuitProposal=new Map([
  ['4216819',['102208',76.80]],['4216836',['102209',76.80]],['4216818',['102210',76.80]],
  ['4216810',['102211',76.80]],['4216834',['102267',187.20]],['4216838',['107676',57.60]],
  ['4216839',['107677',57.60]],['4216840',['107678',57.60]],['4216841',['107679',57.60]]
 ]);
 const staffPortrait=id=>{
  const profile=window.FFH_STAFF_PHOTOS?.find(id), url=https(profile?.photo_url||ctx.staff(id)?.photo);
  return `<span class="ffOutletPortrait" data-ff-staff-avatar="${E(id)}" aria-hidden="true">${url?`<img src="${E(url)}" loading="lazy" alt="">`:E(who(id).trim().charAt(0)||'•')}</span>`;
 };
 const managerLabel=id=>{
  const person=ctx.staff(id), mgr=person?.manager_id;
  return person?.managerLabel|| (mgr ? [who(mgr),mgr].join(' · ') : '');
 };
 const outletLogo=o=>{
  const chain=brand(o),src=chain?'proposal-assets/'+chain[0]+'_'+chain[1]+'.png':
   /^econsave/i.test(o.category||o.name)?'https://econsave.com.my/wp-content/uploads/2019/11/EconsaveLogo-FA.png':'';
  return src?`<img class="ffOutletBrand" src="${E(src)}" loading="lazy" referrerpolicy="no-referrer" alt="">`:'';
 };
 function outletDialog(title,body){
  const overlay=document.createElement('div');
  overlay.className='globalSearchOverlay ffInsetDialog ffOutletDialog';
  overlay.innerHTML=`<section class="globalSearchBox" role="dialog" aria-modal="true" aria-label="${E(title)}">
  <header class="row"><h2>${E(title)}</h2><button type="button" class="secondary" data-close>Close</button></header>${body}</section>`;
  document.body.append(overlay);
  const close=window.FFH_OVERLAY?.(overlay,()=>overlay.remove())||(()=>overlay.remove());
  overlay.querySelector('[data-close]').onclick=close;
  return overlay;
 }
 async function submitClosure(action,target,reason){
  const {data,error}=await sb.rpc('ffh_outlet_closure',{action,request_id:target,reason_text:reason});
  if(error)throw Error(error.message);
  return data;
 }
 function reviewClosure(request){
  const actor=me(), overlay=outletDialog('Review outlet closure',`<p><strong>${E(request.outlet_name)}</strong> · ${E(request.outlet_code)}</p>
    <p>${E(request.reason)}</p><p>Approval hides the outlet and blocks new sales immediately. Report exclusions apply from the following day (MYT).</p>
    <form class="form"><label>Decision note (required for rejection)<textarea name="reason" maxlength="1000"></textarea></label>
    <div class="two"><button class="primary" name="decision" value="approve">Approve closure</button><button class="secondary" name="decision" value="reject">Reject closure</button></div><p role="status"></p></form>`);
  const form=overlay.querySelector('form'), status=overlay.querySelector('[role=status]');
  form.onsubmit=async event=>{
   event.preventDefault();
   if(me()!==actor||!ctx.may('outlets'))return;
   const action=event.submitter.value,reason=form.elements.reason.value.trim();
   if(action==='reject'&&!reason){status.textContent='Enter the rejection reason.';return;}
   const buttons=form.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
   try{
    await submitClosure(action,request.id,reason);
    if(me()!==actor||!overlay.isConnected)return;
    overlay.querySelector('[data-close]').click();
    if(ctx.page()==='approvals')await approvals();
   }catch(error){status.textContent=error.message;buttons.forEach(b=>b.disabled=false);}
  };
 }
 function requestClosure(outlet){
  const actor=me(),overlay=outletDialog('Request outlet closure',`<p><strong>${E(outlet.name)}</strong> · ${E(outlet.code)}</p>
    <form class="form"><label>Reason<textarea name="reason" required maxlength="1000"></textarea></label>
    <button type="submit" class="primary">Send for approval</button><p role="status"></p></form>`);
  const form=overlay.querySelector('form'),status=overlay.querySelector('[role=status]');
  form.onsubmit=async event=>{
   event.preventDefault();
   if(me()!==actor)return;
   const button=event.submitter;button.disabled=true;
   try{
    await submitClosure('request',outlet.id,form.elements.reason.value.trim());
    if(me()===actor&&overlay.isConnected)status.textContent='Request submitted. Check Approval Inbox for the decision.';
   }catch(error){status.textContent=error.message;button.disabled=false;}
  };
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
   <div class="ffRefPanel ffRefFields ffOutletCompactFilters">
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
    <label class="ffRefSearch">Outlet status<select id="ffOutletStatus"><option value="">Active and issues</option><option>Active</option><option>Inactive</option><option>Issue</option></select></label>
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
   const scoped=outlets.map((o,i)=>({o,i})).filter(({o})=>(!zone||ctx.staff(o.sr)?.zone===zone)&&(!staff||staff===o.sr)&&(!chain||chain===o.category)&&
    (!term||[o.name,o.code,o.category,who(o.sr)].join(' ').toLowerCase().includes(term)));
   const list=scoped.filter(({o})=>status?status===state(o):o.active)
    .sort((a,b)=>who(a.o.sr).localeCompare(who(b.o.sr))||a.o.sr.localeCompare(b.o.sr)||a.o.name.localeCompare(b.o.name));
   filtered=list;
   const counts=[scoped.length,scoped.filter(({o})=>o.active).length,scoped.filter(({o})=>!o.active).length,scoped.filter(({o})=>onIssue(o)).length];
   document.querySelectorAll('.ffRefOutlet > .ffRefReportKpis .ffRefMetric strong').forEach((el,i)=>{el.textContent=counts[i];});
   $('#ffOutletCount').textContent='Outlet List ('+list.length+')';
   select.innerHTML=selectOptions(list.map(({o,i})=>[i,o.name+' ('+o.code+') · '+who(o.sr)]),'Choose an outlet');
   select.value=list.some(v=>String(v.i)===old)?old:list.length?String(list[0].i):'';
   if(select.value)draw();else $('#ffOutletHistoryDetail').innerHTML='<section class="ffRefPanel"><h2>Outlet Details</h2><p class="ffRefHint">No outlet selected.</p></section>';
   let group='', groupIndex=0;
   $('#ffOutletHistoryRows').innerHTML=list.map(({o,i})=>{
    const groupStart=group!==o.sr;
    group=o.sr;
    if(groupStart)groupIndex++;
    const manager=managerLabel(o.sr);
    return (groupStart?`<tr class="ffOutletGroup" data-tone="${groupIndex%2?'blue':'orange'}" data-outlet-staff="${E(o.sr)}"><th colspan="6" scope="rowgroup">${staffPortrait(o.sr)}<span><b>${E(who(o.sr))}</b> · ${E(o.sr)}${manager?`<small>Manager · ${E(manager)}</small>`:''}</span></th></tr>`:'')+
    `<tr class="ffOutletRecord"><td><button class="secondary" type="button" data-ref-outlet="${i}" aria-pressed="${String(select.value===String(i))}">${outletLogo(o)}<span>${E(o.name)}<small>${E(o.code)}</small></span></button></td>
     <td>${E(o.category||'—')}</td><td>${E(o.sr)}</td><td>${E(o.totalSku??'—')}</td><td>${E(lastVisit(o))}</td><td><span class="ffRefStatus" data-status="${state(o)}">${state(o)}</span></td></tr>`;
   }).join('')||'<tr><td colspan="6">No outlets match this selection.</td></tr>';
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
   document.querySelectorAll('[data-ref-outlet]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.refOutlet===select.value)));
   lastHistory={sr:o.sr,code:o.code};const from=$('#ffOutletHistoryFrom').value,to=$('#ffOutletHistoryTo').value;
   if(from&&to&&from>to){$('#ffOutletHistoryDetail').textContent='From date must be before To date.';return;}
   const range=d=>(!from||String(d||'').slice(0,10)>=from)&&(!to||String(d||'').slice(0,10)<=to);
   const match=r=>r.sr_id===o.sr&&(r.outlet_code?String(r.outlet_code)===String(o.code):r.outlet_name===o.name&&outlets.filter(v=>v.sr===o.sr&&v.name===o.name).length===1);
   const saleDay=r=>window.FFH_DAILY_CORE?.deliveryDay({date:r.sale_date,deliveredAt:r.delivered_at,status:r.status})||r.sale_date;
   const sales=data[0].filter(match).filter(r=>range(saleDay(r))),events=[];
   let total=0,pending=0;const skus=new Map();
   sales.forEach(r=>{if(r.status==='Delivered'){total+=+r.delivered_amount||0;if(r.sku)skus.set(r.sku,(skus.get(r.sku)||0)+(+r.delivered_amount||0));}else if(r.status==='Pending Delivery')pending+=+r.order_amount||0;events.push({date:saleDay(r),title:r.status+' · '+(r.sku||'Daily outlet summary'),detail:(+r.qty||0)+' cartons · Order '+ctx.rm(r.order_amount)+' · Delivered '+ctx.rm(r.delivered_amount),remarks:r.remarks});});
   data[1].filter(r=>r.assigned_to===o.sr&&r.outlet_name===o.name&&outlets.filter(v=>v.sr===o.sr&&v.name===o.name).length===1).filter(r=>range(r.created_date||r.created_at)).forEach(r=>events.push({date:r.created_date||r.created_at,title:'Task · '+r.title+' · '+r.status,detail:r.description,remarks:r.reviewed_at?'Reviewed '+stamp(r.reviewed_at):'',photo:r.proof_photo_url}));
   data[2].filter(match).filter(r=>range(r.execution_date)).forEach(r=>events.push({date:r.execution_date,title:'CPO / Promotion · '+r.status,detail:r.remarks,photo:r.photo_url}));
   data[5].filter(r=>String(r.payload?.outlet_code)===String(o.code)&&r.payload?.outlet_staff_id===o.sr&&range(r.created_at)).forEach(r=>events.push({date:r.created_at.slice(0,10),title:r.category+' · '+r.title,detail:r.payload.description,photo:r.payload.photo}));
   events.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   $('#ffOutletHistoryDetail').innerHTML=`<section class="card ffRefPanel">
    <header class="ffRefListHead"><h2>▣ Outlet Details</h2><div><span class="ffRefStatus" data-status="${state(o)}">${state(o)}</span></div></header>
    <div class="ffRefOutletDetailBody"><div>
     <h3>${outletLogo(o)}${E(o.name)}</h3><dl>
      <div><dt>Chain</dt><dd>${E(o.category||'—')}</dd></div>
      <div><dt>Outlet Code</dt><dd>${E(o.code)}</dd></div>
      <div><dt>Assigned SR</dt><dd>${staffPortrait(o.sr)} ${E(who(o.sr))}</dd></div>
      <div><dt>Manager / Zone</dt><dd>${E([managerLabel(o.sr),ctx.staff(o.sr)?.zone].filter(Boolean).join(' · ')||'—')}</dd></div>
      <div><dt>Listing / SKU</dt><dd>${E(o.totalSku??'—')}</dd></div>
      <div><dt>Last Proof</dt><dd>${E(lastVisit(o))}</dd></div>
      <div><dt>Delivered</dt><dd>${ctx.rm(total)}</dd></div>
      <div><dt>Pending Order</dt><dd>${ctx.rm(pending)}</dd></div>
     </dl>
    </div><div class="ffRefOutletDetailsActions">
    ${canEdit?'<button type="button" class="ffRefButton" id="ffOutletEdit">Edit / Update Listing</button>':''}
    <button type="button" class="ffRefButton" id="ffOutletIssue">Report Issue</button>
    ${o.active?'<button type="button" class="ffRefButton" id="ffOutletClosure">Request Closure</button>':''}
   <button type="button" class="ffRefButton" id="ffOutletViewActivity">◷ Visit / Activity History</button>
   </div></div></section><details id="ffOutletActivity" class="ffRefPanel ffRefManage"><summary>Outlet Activity (${events.length})</summary>
   <p>${skus.size} delivered SKU(s) in selected dates</p>${[...skus].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([sku,amount])=>`<p>${E(sku)} · ${ctx.rm(amount)}</p>`).join('')}
   ${events.map(x=>`<article class="card"><b>${E(x.title)}</b><p class="miniStat">${E(x.date)}</p><p>${E(x.detail||'')}</p>${x.remarks?`<p>${E(x.remarks)}</p>`:''}${safePhoto(x.photo)}</article>`).join('')||'<div class="card empty">No recorded activity in this selection.</div>'}</details>`;bindPhotos();
   $('#ffOutletViewActivity').onclick=()=>{const activity=$('#ffOutletActivity');activity.open=!activity.open;if(activity.open)activity.scrollIntoView({block:'nearest'});};
   $('#ffOutletEdit')?.addEventListener('click',()=>edit(o));
   $('#ffOutletIssue').onclick=()=>window.ffFindings?.outletFinding('Outlet issue',o);
   $('#ffOutletClosure')?.addEventListener('click',()=>requestClosure(o));
  };
  const fillStaff=()=>{
   const staff=$('#ffOutletStaff'),old=staff.value,zone=$('#ffOutletZone').value;
   const visible=ids.filter(sid=>!zone||ctx.staff(sid)?.zone===zone);
   staff.innerHTML=selectOptions(visible.map(sid=>[sid,who(sid)]),'All SRs');
   staff.value=visible.includes(old)?old:'';
   fill();
  };
  $('#ffOutletHistorySearch').oninput=fill;
  $('#ffOutletZone').onchange=fillStaff;
  for(const filter of ['ffOutletStaff','ffOutletChain','ffOutletStatus'])$('#'+filter).onchange=fill;select.onchange=draw;$('#ffOutletHistoryFrom').onchange=draw;$('#ffOutletHistoryTo').onchange=draw;$('#ffOutletHistoryReload').onclick=historyPage;$('#ffOutletVisitReport').onclick=outletSummary;$('#ffOutletManage')?.addEventListener('click',()=>edit(null));$('#ffOutletRequest')?.addEventListener('click',()=>window.ffFindings?.outletFinding('New outlet'));fill();
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
  $('#ffOutletListing').onclick=requireOutlet(async o=>{
   const popup=outletDialog('Listing / SKU',`<p>${outletLogo(o)} ${E(o.name)} · ${E(o.code)}</p><div data-sku-result role="status">Loading proposal SKUs…</div>`);
   const result=popup.querySelector('[data-sku-result]');
   const key=brand(o)?.[0];
   if(!key){result.textContent='No proposal template is linked to this chain.';return;}
   try{
    const templateKeys=key==='01'?['01','01-chill']:[key];
    const templates=await Promise.all(templateKeys.map(async templateKey=>{
     const {data,error}=await sb.from('ffh_proposal_item_templates').select('lines,source_pdf_url,chain_name').eq('chain_key',templateKey).maybeSingle();
     if(error)throw error;
     return {key:templateKey,data};
    }));
    const listed=new Map();
    for(const {key:sourceKey,data} of templates){
     const sameBiscuitVersion=sourceKey==='01'&&/\/(?:1790191455404-lpy3gt|1790185318847-e1yd7w)-giant-propose-order-form-biscuit\.new\.pdf(?:$|\?)/i.test(data?.source_pdf_url||'');
     for(const row of Array.isArray(data?.lines)?data.lines:[]){
      const code=String(row?.code||'').trim();
      if(code&&!listed.has(code))listed.set(code,{...row,code,sourceKey,sameBiscuitVersion});
     }
    }
    const lines=[...listed.values()];
    const catalogueCode=row=>String(row.catalogue_code||(row.sourceKey==='01'?giantBiscuitProposal.get(row.code)?.[0]:null)||row.code).trim();
    const codes=[...new Set(lines.map(catalogueCode))];
    const products=new Map();
    for(let i=0;i<codes.length;i+=80){
     const {data:catalogue,error}=await sb.from('ffh_catalogue_products').select('item_code,name,piece_price,carton_price,image_url')
      .eq('active',true).in('item_code',codes.slice(i,i+80)).order('id');
     if(error)throw error;
     for(const product of catalogue||[])if(!products.has(String(product.item_code)))products.set(String(product.item_code),product);
    }
    if(me()!==id||!popup.isConnected)return;
    const local=new Map(typeof window.ffhCatalogueRows==='function'?window.ffhCatalogueRows().map(product=>[String(product.itemCode),product]):[]);
    result.innerHTML=`<p>${lines.length} SKUs in the cloud proposal${Number(o.totalSku)>lines.length?` · ${E(o.totalSku)} recorded for this outlet. The remaining SKUs need the updated proposal.`:''}</p>
     ${templates.filter(({data})=>https(data?.source_pdf_url)).map(({key,data})=>`<a class="ffOutletProposalLink" href="${E(data.source_pdf_url)}" target="_blank" rel="noopener noreferrer">${E(key==='01'?'Giant Biscuit Proposal':data.chain_name||'Proposal source')} ↗</a>`).join('')}
     <div class="ffOutletCatalog">${lines.map(line=>{
      const code=catalogueCode(line),product=products.get(code),cached=local.get(code);
      const savedImage=String(cached?.image||''),image=https(product?.image_url||savedImage)||(/^catalogue-assets\/[\w./% -]+$/i.test(savedImage)?savedImage:'');
      const piece=product?.piece_price??(cached?.piecePrice>0?cached.piecePrice:null);
      const carton=product?.carton_price??(cached?.cartonPrice>0?cached.cartonPrice:null);
      const proposalCost=Number.isFinite(line.carton_cost)?line.carton_cost:line.sameBiscuitVersion?giantBiscuitProposal.get(line.code)?.[1]:null;
      return `<article>${image?`<img src="${E(image)}" loading="lazy" alt="">`:''}<div><b>${E(product?.name||cached?.name||line.name||line.code)}</b>
       <small>${E(String(line.code))}${code!==String(line.code)?' · Catalogue '+E(code):''}</small>
       <span>${product||cached?`Catalogue · Piece ${piece==null?'—':ctx.rm(piece)} · Carton ${carton==null?'—':ctx.rm(carton)}`:'Catalogue match unavailable'}
       ${proposalCost==null?'':`<small>Proposal carton cost · ${ctx.rm(proposalCost)}</small>`}</span>
       ${line.note?`<small class="ffRefHint">${E(line.note)}</small>`:''}</div></article>`;
     }).join('')||'<p>No SKUs saved for this proposal.</p>'}</div>`;
   }catch(error){if(popup.isConnected&&me()===id)result.textContent=error.message||'Could not load the listing.';}
  });
  const openActivity=()=>{const activity=$('#ffOutletActivity');if(activity){activity.open=true;jump('#ffOutletActivity');}else jump('#ffOutletHistoryDetail');};
  $('#ffOutletVisits').onclick=requireOutlet(openActivity);
  $('#ffOutletTopIssue').onclick=requireOutlet(o=>window.ffFindings?.outletFinding('Outlet issue',o));
  $('#ffOutletAssignment').onclick=()=>{if(canEdit)ctx.manageOutlets();else{select.closest('details').open=true;select.focus();}};
  $('#ffOutletImport')?.addEventListener('click',()=>{
   const popup=outletDialog('Bulk Import (Excel)',`<form class="form">
    <label>Sales Representative<select name="staff" required>${selectOptions(ids.map(sid=>[sid,who(sid)]),'Choose SR')}</select></label>
    <label>Excel or CSV file<input name="file" type="file" required accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label>
    <p>Columns: code, name, category and totalSku. The first sheet is imported. Matching outlet codes are updated for this SR.</p>
    <button type="submit" class="primary">Import outlets</button><p role="status"></p></form>`);
   const form=popup.querySelector('form'),feedback=form.querySelector('[role=status]');
   form.elements.staff.value=selected()?.sr||$('#ffOutletStaff').value||'';
   form.onsubmit=async e=>{
    e.preventDefault();
    const button=e.submitter, staff=form.elements.staff.value, file=form.elements.file.files[0];
    if(!file||!ids.includes(staff)||me()!==id)return;
    button.disabled=true;
    try{
     if(!/\.(xlsx|csv)$/i.test(file.name))throw Error('Choose an Excel (.xlsx) or CSV file.');
     if(file.size>10*1024*1024)throw Error('Choose a file of 10 MB or less.');
     if(typeof window.ffhEnsureXlsx!=='function')throw Error('Excel reader is unavailable. Refresh and retry.');
     const workbookAPI=await window.ffhEnsureXlsx();
     const bytes=await file.arrayBuffer();
     const workbook=workbookAPI.read(bytes,{type:'array'});
     const sheet=workbook.Sheets[workbook.SheetNames[0]];
     const [head,...records]=workbookAPI.utils.sheet_to_json(sheet,{header:1,raw:false,defval:'',blankrows:false});
     const columns=(head||[]).map(text=>String(text).toLowerCase().replace(/[^a-z]/g,''));
     const fields={code:columns.indexOf('code'),name:columns.indexOf('name'),category:columns.indexOf('category'),totalSku:columns.indexOf('totalsku')};
     if(Object.values(fields).some(index=>index<0))throw Error('Required headers: code, name, category, totalSku.');
     if(!records.length||records.length>2000)throw Error('Include 1 to 2,000 outlet rows.');
     const seen=new Set();
     const payload=records.map((row,index)=>{
      const value=key=>String(row[fields[key]]??'').trim(),outlet_code=value('code'),outlet_name=value('name'),category=value('category');
      const count=value('totalSku'),total_sku=Number(count);
      if(!outlet_code||outlet_code.length>120||!outlet_name||outlet_name.length>250||!category||category.length>160||!count||!Number.isInteger(total_sku)||total_sku<0||total_sku>999999)throw Error('Check the code, name, category and SKU count on row '+(index+2)+'.');
      if(seen.has(outlet_code))throw Error('Duplicate outlet code on row '+(index+2)+'.');
      seen.add(outlet_code);
      return {sr_id:staff,outlet_code,outlet_name,category,total_sku,updated_at:new Date().toISOString()};
     });
     if(me()!==id||!ctx.may('outlets')||!scopedIds().includes(staff)||!popup.isConnected)return;
     const {error}=await sb.from('ffh_outlets').upsert(payload,{onConflict:'sr_id,outlet_code',defaultToNull:false});
     if(error)throw Error(error.message);
     if(me()!==id||!popup.isConnected)return;
     popup.querySelector('[data-close]').click();
     if(ctx.page()==='outletHistory')await historyPage({staff});
     if($('#ffOutletActionStatus'))$('#ffOutletActionStatus').textContent=payload.length+' outlets imported for '+who(staff)+'.';
    }catch(error){if(popup.isConnected)feedback.textContent=error.message;}
    finally{button.disabled=false;}
   };
  });
  $('#ffOutletPerformance').onclick=()=>{
   if(result[0].status==='rejected'){
    outletDialog('Outlet Performance','<p>Sales could not load. Refresh Outlet Management and try again.</p>');
    return;
   }
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const to=$('#ffOutletHistoryTo').value||today;
   const from=$('#ffOutletHistoryFrom').value||to.slice(0,7)+'-01';
   if(from>to){outletDialog('Outlet Performance','<p>From date must be on or before To date.</p>');return;}
   const previous=date=>{
    const [year,month,day]=date.split('-').map(Number), last=new Date(Date.UTC(year,month-1,0)).getUTCDate();
    return new Date(Date.UTC(year,month-2,Math.min(day,last))).toISOString().slice(0,10);
   };
   const beforeFrom=previous(from),beforeTo=previous(to),current=selected();
   const scoped=filtered.filter(({o})=>o.active).map(({o})=>{
    const unique=outlets.filter(v=>v.sr===o.sr&&v.name===o.name).length===1;
    const matched=data[0].filter(row=>row.sr_id===o.sr&&row.status==='Delivered'&&
      (row.outlet_code?String(row.outlet_code)===String(o.code):unique&&row.outlet_name===o.name));
    const period=(start,end)=>matched.filter(row=>{
     const date=window.FFH_DAILY_CORE?.deliveryDay({date:row.sale_date,deliveredAt:row.delivered_at,status:row.status})||row.sale_date;
     return date>=start&&date<=end;
    });
    const sum=rows=>rows.reduce((n,row)=>n+(+row.delivered_amount||0),0);
    const previousRows=period(beforeFrom,beforeTo), delivered=sum(period(from,to));
    return {o,delivered,before:previousRows.length?sum(previousRows):null};
   });
   const popup=outletDialog('Outlet Performance',`<p>${E(from)} → ${E(to)} · Prior period ${E(beforeFrom)} → ${E(beforeTo)}</p>
    <div class="ffOutletPerfTabs"><button class="secondary" data-perf="selected" type="button">Selected outlet</button>
    <button class="secondary" data-perf="top" type="button">Top outlets</button>
    <button class="secondary" data-perf="zero" type="button">Zero sales</button>
    <button class="secondary" data-perf="focus" type="button">Focus outlets</button></div><div class="ffOutletPerfList" data-perf-rows></div>`);
   const drawPerformance=mode=>{
    const selection=scoped.filter(row=>mode==='selected'?row.o===current:mode==='zero'?row.delivered<=0:mode==='focus'?row.delivered>0&&row.before!==null&&row.delivered<row.before:true)
     .sort((a,b)=>mode==='focus'?a.delivered-a.before-(b.delivered-b.before):b.delivered-a.delivered);
    popup.querySelectorAll('[data-perf]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.perf===mode)));
    popup.querySelector('[data-perf-rows]').innerHTML=selection.map(({o,delivered,before})=>`<article>
     <h3>${outletLogo(o)} ${E(o.name)}</h3><p>${staffPortrait(o.sr)} ${E([who(o.sr),managerLabel(o.sr),ctx.staff(o.sr)?.zone].filter(Boolean).join(' · '))}</p>
     <dl><div><dt>Delivered</dt><dd>${ctx.rm(delivered)}</dd></div><div><dt>Prior period</dt><dd>${before===null?'—':ctx.rm(before)}</dd></div>
     <div><dt>Difference</dt><dd>${before===null?'—':ctx.rm(delivered-before)}</dd></div></dl></article>`).join('')||'<p>No outlets match this view.</p>';
   };
   popup.querySelectorAll('[data-perf]').forEach(b=>b.onclick=()=>drawPerformance(b.dataset.perf));
   drawPerformance(current?'selected':'top');
  };
  $('#ffOutletTopClosure').onclick=()=>{
   const o=selected();
   const popup=outletDialog('Outlet Closure / Inactive',`<p>${o?E(o.name):'Select an outlet to request closure.'}</p>
    ${o?.active?'<button type="button" class="secondary" data-closure-request>Request closure</button>':''}
    <button type="button" class="secondary" data-inactive-list>View inactive outlets</button>`);
   popup.querySelector('[data-closure-request]')?.addEventListener('click',()=>{
    popup.querySelector('[data-close]').click();requestClosure(o);
   });
   popup.querySelector('[data-inactive-list]').onclick=()=>{
    popup.querySelector('[data-close]').click();$('#ffOutletStatus').value='Inactive';fill();jump('#ffOutletCount');
   };
  };
  $('#ffOutletMap').onclick=()=>{
   const mapLink=o=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([o.name,o.category,'Malaysia'].filter(Boolean).join(' '));
   const current=selected();
   const options=current?[current,...filtered.map(({o})=>o).filter(o=>o!==current)]:filtered.map(({o})=>o);
   outletDialog('Outlet Mapping',`<div class="ffOutletCatalog">${options.map(o=>`<article>${outletLogo(o)}<div><b>${E(o.name)}</b><small>${E([o.code,who(o.sr)].join(' · '))}</small>
    <a rel="noopener noreferrer" target="_blank" href="${E(mapLink(o))}">Open in Google Maps</a></div></article>`).join('')||'<p>No outlets match your selected scope.</p>'}</div>`);
  };
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
