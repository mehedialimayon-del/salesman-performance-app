// ============================
// CONFIGURATION
// ============================
const CONFIG = {
  currency: 'RM',
  apiUrl: '', // Paste your deployed Google Apps Script /exec URL here. Leave blank for demo/local mode.
  users: [
    {id:'manager', name:'Manager', role:'manager', pin:'2468'},
    {id:'sayem', name:'Sayem', role:'sr', pin:'1111'},
    {id:'bappi', name:'Bappi', role:'sr', pin:'2222'},
    {id:'wasif', name:'Wasif', role:'sr', pin:'3333'},
    {id:'jamil', name:'Jamil', role:'sr', pin:'4444'},
  ],
  outlets: ['NSK Wangsa Maju','Giant Setapak','Mydin Danau Saujana','Hanifa Kota Raya','KK Super Mart','Jaya Grocer'],
  // Replace these samples with your actual 65 SKUs. Image can be e.g. assets/products/mango-juice.png
  products: [
    {id:'mango', name:'Mango Juice', image:'', icon:'🥭', incentiveTarget:100, incentiveRM:150},
    {id:'basil', name:'Basil Seed Drink', image:'', icon:'🧃', incentiveTarget:100, incentiveRM:150},
    {id:'crackers', name:'Potato Crackers', image:'', icon:'🍘', incentiveTarget:80, incentiveRM:100},
    {id:'noodles', name:'Mr. Noodles', image:'', icon:'🍜', incentiveTarget:120, incentiveRM:180},
    {id:'rusk', name:'Rusk', image:'', icon:'🍞', incentiveTarget:0, incentiveRM:0},
    {id:'puffed', name:'Puffed Rice', image:'', icon:'🌾', incentiveTarget:0, incentiveRM:0},
  ]
};

const $ = s => document.querySelector(s);
let session = null;
let page = 'dashboard';

const STORAGE_KEY = 'salesPerformanceHub.v1';
function seedState(){
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth()+1;
  return {
    daily: [
      {id:crypto.randomUUID(), userId:'sayem', date:`${y}-${String(m).padStart(2,'0')}-01`, outlet:'NSK Wangsa Maju', todaySales:850, lastMonthSameDay:700, activeOrder:450, pprTrip:120, note:''},
      {id:crypto.randomUUID(), userId:'sayem', date:`${y}-${String(m).padStart(2,'0')}-02`, outlet:'Giant Setapak', todaySales:620, lastMonthSameDay:590, activeOrder:300, pprTrip:80, note:''}
    ],
    skuSales: [
      {id:crypto.randomUUID(), userId:'sayem', date:`${y}-${String(m).padStart(2,'0')}-01`, outlet:'NSK Wangsa Maju', productId:'mango', cartons:8},
      {id:crypto.randomUUID(), userId:'sayem', date:`${y}-${String(m).padStart(2,'0')}-02`, outlet:'Giant Setapak', productId:'mango', cartons:5},
      {id:crypto.randomUUID(), userId:'sayem', date:`${y}-${String(m).padStart(2,'0')}-02`, outlet:'Giant Setapak', productId:'basil', cartons:7}
    ],
    plans: [
      {id:crypto.randomUUID(), userId:'sayem', month:`${y}-${String(m).padStart(2,'0')}`, outlet:'NSK Wangsa Maju', target:5000, skuIds:['mango','basil']},
      {id:crypto.randomUUID(), userId:'sayem', month:`${y}-${String(m).padStart(2,'0')}`, outlet:'Giant Setapak', target:4000, skuIds:['mango','noodles']}
    ],
    tasks: [
      {id:crypto.randomUUID(), userId:'sayem', title:'Focus Mango Juice display', note:'Target 10 cartons from NSK this week.', due:'', done:false, createdAt:new Date().toISOString()}
    ]
  };
}
function getState(){const raw=localStorage.getItem(STORAGE_KEY);if(raw) return JSON.parse(raw);const s=seedState();localStorage.setItem(STORAGE_KEY,JSON.stringify(s));return s}
function saveState(s){localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}
function money(n){return `${CONFIG.currency} ${Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2})}`}
function isoDate(){return new Date().toISOString().slice(0,10)}
function monthKey(){return isoDate().slice(0,7)}
function sum(arr, fn){return arr.reduce((a,x)=>a+Number(fn(x)||0),0)}
function userById(id){return CONFIG.users.find(u=>u.id===id)}
function productById(id){return CONFIG.products.find(p=>p.id===id)}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function visibleUserId(){return session.role==='manager' ? (session.viewUserId || CONFIG.users.find(u=>u.role==='sr')?.id) : session.id}

async function api(action, payload={}){
  if(!CONFIG.apiUrl) return null;
  const res = await fetch(CONFIG.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token:session?.token,payload})});
  return res.json();
}

function doLogin(user,pin){
  const u=CONFIG.users.find(x=>x.id.toLowerCase()===user.toLowerCase() && x.pin===pin);
  if(!u){toast('Wrong username or PIN');return}
  session={...u, viewUserId:u.role==='manager'?CONFIG.users.find(x=>x.role==='sr')?.id:null};
  sessionStorage.setItem('sph.session',JSON.stringify(session));
  openApp();
}
function openApp(){
  $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
  $('#roleLabel').textContent=session.role==='manager'?'MANAGER ACCESS':'SALES REPRESENTATIVE';
  $('#welcomeName').textContent=session.role==='manager'?'Team Control Center':`Hi, ${session.name}`;
  updateBadge();render();
}
function logout(){sessionStorage.removeItem('sph.session');session=null;$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden')}

function getUserMetrics(userId){
  const s=getState(), month=monthKey();
  const daily=s.daily.filter(x=>x.userId===userId && x.date.startsWith(month));
  const plans=s.plans.filter(x=>x.userId===userId && x.month===month);
  const achievement=sum(daily,x=>x.todaySales), target=sum(plans,x=>x.target), shortfall=Math.max(0,target-achievement);
  const lastMonthComparable=sum(daily,x=>x.lastMonthSameDay);
  const growth=lastMonthComparable?((achievement-lastMonthComparable)/lastMonthComparable*100):0;
  return {daily,plans,achievement,target,shortfall,lastMonthComparable,growth,activeOrder:sum(daily,x=>x.activeOrder),pprTrip:sum(daily,x=>x.pprTrip)};
}
function outletAchievement(userId,outlet){const s=getState();return sum(s.daily.filter(x=>x.userId===userId&&x.outlet===outlet&&x.date.startsWith(monthKey())),x=>x.todaySales)}
function skuCartons(userId,productId){const s=getState();return sum(s.skuSales.filter(x=>x.userId===userId&&x.productId===productId&&x.date.startsWith(monthKey())),x=>x.cartons)}

function render(){
  [...document.querySelectorAll('#bottomNav button')].forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  if(page==='dashboard') renderDashboard();
  if(page==='daily') renderDaily();
  if(page==='planning') renderPlanning();
  if(page==='incentive') renderIncentive();
  if(page==='summary') renderSummary();
}
function managerSwitcher(){if(session.role!=='manager')return '';return `<div class="manager-banner"><div class="row"><div><b>Viewing salesman</b><div class="muted" style="font-size:11px">Switch to review individual performance</div></div><select id="managerUserSelect" style="width:auto">${CONFIG.users.filter(u=>u.role==='sr').map(u=>`<option value="${u.id}" ${visibleUserId()===u.id?'selected':''}>${u.name}</option>`).join('')}</select></div></div>`}
function bindManagerSwitcher(){const el=$('#managerUserSelect');if(el)el.onchange=e=>{session.viewUserId=e.target.value;updateBadge();render()}}

function renderDashboard(){
  const uid=visibleUserId(), u=userById(uid), m=getUserMetrics(uid);const pct=m.target?Math.min(100,m.achievement/m.target*100):0;
  const tasks=getState().tasks.filter(t=>t.userId===uid&&!t.done);
  $('#mainContent').innerHTML=`${managerSwitcher()}
  <section class="hero" style="margin-top:${session.role==='manager'?'12px':'0'}"><p class="eyebrow">${new Date().toLocaleDateString(undefined,{month:'long',year:'numeric'}).toUpperCase()}</p><h3>${escapeHtml(u.name)} Performance</h3><p class="muted">You are <b class="${m.shortfall?'warn':'good'}">${money(m.shortfall)}</b> away from the monthly sales target.</p><div class="progress-wrap"><div class="progress ${pct>=100?'goodbar':''}" style="width:${pct}%"></div></div><div class="row" style="margin-top:8px"><small class="muted">${money(m.achievement)} achieved</small><small>${pct.toFixed(0)}%</small></div></section>
  <div class="grid kpi-grid">
    <div class="kpi"><div class="label">MONTH TARGET</div><div class="value">${money(m.target)}</div><div class="sub">Fixed from monthly plan</div></div>
    <div class="kpi"><div class="label">MTD ACHIEVEMENT</div><div class="value">${money(m.achievement)}</div><div class="sub">Daily updates combined</div></div>
    <div class="kpi"><div class="label">SHORTFALL</div><div class="value ${m.shortfall?'bad':'good'}">${money(m.shortfall)}</div><div class="sub">Remaining to target</div></div>
    <div class="kpi"><div class="label">VS LAST MONTH</div><div class="value ${m.growth>=0?'good':'bad'}">${m.growth>=0?'+':''}${m.growth.toFixed(1)}%</div><div class="sub">Comparable entered value</div></div>
    <div class="kpi"><div class="label">ACTIVE ORDER</div><div class="value">${money(m.activeOrder)}</div><div class="sub">Manual entry</div></div>
    <div class="kpi"><div class="label">PPR FOR TRIP</div><div class="value">${money(m.pprTrip)}</div><div class="sub">Manual entry</div></div>
  </div>
  <div class="section-title"><h3>Outlet Push List</h3><span class="pill red">SHORTFALL</span></div><div class="list">${m.plans.length?m.plans.map(p=>{const a=outletAchievement(uid,p.outlet),sf=Math.max(0,p.target-a),pp=p.target?Math.min(100,a/p.target*100):0;return `<div class="list-item"><div class="row"><div><h4>${escapeHtml(p.outlet)}</h4><p>${money(a)} / ${money(p.target)}</p></div><b class="${sf?'bad':'good'}">${sf?money(sf)+' left':'Done ✓'}</b></div><div class="progress-wrap" style="margin-top:10px"><div class="progress ${pp>=100?'goodbar':''}" style="width:${pp}%"></div></div></div>`}).join(''):'<div class="empty card">No monthly plan yet.</div>'}</div>
  <div class="section-title"><h3>Special Tasks</h3><span class="pill orange">${tasks.length} OPEN</span></div><div class="list">${tasks.length?tasks.slice(0,4).map(t=>`<div class="list-item"><div class="row"><div><h4>${escapeHtml(t.title)}</h4><p>${escapeHtml(t.note||'')}</p></div>${session.role==='manager'?`<button class="btn secondary taskDone" data-id="${t.id}">Done</button>`:'<span class="pill orange">ACTION</span>'}</div></div>`).join(''):'<div class="empty card">No pending special task 🎉</div>'}</div>`;
  bindManagerSwitcher();document.querySelectorAll('.taskDone').forEach(b=>b.onclick=()=>markTaskDone(b.dataset.id));
}

function renderDaily(){const uid=visibleUserId();$('#mainContent').innerHTML=`${managerSwitcher()}<div class="section-title"><h3>Daily Quick Update</h3><span class="pill orange">30–60 SEC</span></div><form id="dailyForm" class="card"><div class="form-grid">
  <div class="field"><label>Date<input name="date" type="date" value="${isoDate()}" required></label></div>
  <div class="field"><label>Outlet<select name="outlet" required><option value="">Select outlet</option>${CONFIG.outlets.map(x=>`<option>${escapeHtml(x)}</option>`).join('')}</select></label></div>
  <div class="field"><label>Today's Sales (${CONFIG.currency})<input name="todaySales" type="number" min="0" step="0.01" required placeholder="e.g. 1250"></label></div>
  <div class="field"><label>Last Month — Same Day (${CONFIG.currency})<input name="lastMonthSameDay" type="number" min="0" step="0.01" placeholder="Manual comparable value"></label></div>
  <div class="field"><label>Active Order (${CONFIG.currency})<input name="activeOrder" type="number" min="0" step="0.01" placeholder="Current active order"></label></div>
  <div class="field"><label>PPR for Trip (${CONFIG.currency})<input name="pprTrip" type="number" min="0" step="0.01" placeholder="Current PPR for trip"></label></div>
  <div class="field" style="grid-column:1/-1"><label>Note (optional)<textarea name="note" placeholder="Any important market note"></textarea></label></div></div>
  <div class="section-title"><h3>SKU Carton Update</h3><span class="pill">OPTIONAL</span></div><div id="skuEntryList" class="grid">${CONFIG.products.map(p=>`<div class="row list-item"><div class="row-start"><div style="font-size:25px">${p.icon}</div><div><h4>${escapeHtml(p.name)}</h4><p>Cartons sold today</p></div></div><input type="number" min="0" step="1" name="sku_${p.id}" value="0" style="width:85px"></div>`).join('')}</div>
  <div class="form-actions"><button class="btn primary" type="submit">Save Daily Update</button></div></form>`;bindManagerSwitcher();$('#dailyForm').onsubmit=e=>{e.preventDefault();saveDaily(new FormData(e.currentTarget),uid)} }
function saveDaily(fd,uid){const s=getState();const row={id:crypto.randomUUID(),userId:uid,date:fd.get('date'),outlet:fd.get('outlet'),todaySales:+fd.get('todaySales'),lastMonthSameDay:+fd.get('lastMonthSameDay'),activeOrder:+fd.get('activeOrder'),pprTrip:+fd.get('pprTrip'),note:fd.get('note')};s.daily.push(row);CONFIG.products.forEach(p=>{const q=+fd.get(`sku_${p.id}`);if(q>0)s.skuSales.push({id:crypto.randomUUID(),userId:uid,date:row.date,outlet:row.outlet,productId:p.id,cartons:q})});saveState(s);toast('Daily update saved');page='dashboard';render()}

function renderPlanning(){const uid=visibleUserId(), s=getState(), plans=s.plans.filter(x=>x.userId===uid&&x.month===monthKey());$('#mainContent').innerHTML=`${managerSwitcher()}<div class="section-title"><h3>Monthly Planning</h3><span class="pill orange">${monthKey()}</span></div><div class="card"><p class="muted">Fix outlet target once at the beginning of the month and choose the SKUs you will push.</p><form id="planForm"><div class="form-grid"><div class="field"><label>Outlet<select name="outlet" required><option value="">Select outlet</option>${CONFIG.outlets.map(x=>`<option>${escapeHtml(x)}</option>`).join('')}</select></label></div><div class="field"><label>Monthly Target (${CONFIG.currency})<input name="target" type="number" min="0" required></label></div></div><div class="section-title"><h3>Targeted SKUs</h3><span class="pill">SELECT</span></div><div class="product-grid">${CONFIG.products.map(p=>`<label class="product-card" style="cursor:pointer"><div class="product-image">${p.icon}</div><div class="product-body"><div class="row"><h4>${escapeHtml(p.name)}</h4><input name="skuIds" value="${p.id}" type="checkbox" style="width:18px"></div></div></label>`).join('')}</div><div class="form-actions"><button class="btn primary">Save Monthly Plan</button></div></form></div><div class="section-title"><h3>Current Outlet Plans</h3></div><div class="list">${plans.map(p=>`<div class="list-item"><div class="row"><div><h4>${escapeHtml(p.outlet)}</h4><p>${p.skuIds.map(id=>productById(id)?.name).filter(Boolean).join(' • ')||'No targeted SKU'}</p></div><b>${money(p.target)}</b></div></div>`).join('')||'<div class="empty card">No plan saved for this month.</div>'}</div>`;bindManagerSwitcher();$('#planForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),state=getState(),outlet=fd.get('outlet');state.plans=state.plans.filter(x=>!(x.userId===uid&&x.month===monthKey()&&x.outlet===outlet));state.plans.push({id:crypto.randomUUID(),userId:uid,month:monthKey(),outlet,target:+fd.get('target'),skuIds:fd.getAll('skuIds')});saveState(state);toast('Monthly plan saved');render()}}

function renderIncentive(){const uid=visibleUserId();const items=CONFIG.products.filter(p=>p.incentiveTarget>0);$('#mainContent').innerHTML=`${managerSwitcher()}<div class="section-title"><h3>Incentive Challenge</h3><span class="pill orange">GAME MODE</span></div><div class="product-grid">${items.map(p=>{const sold=skuCartons(uid,p.id),left=Math.max(0,p.incentiveTarget-sold),pct=Math.min(100,sold/p.incentiveTarget*100);return `<div class="product-card"><div class="product-image">${p.image?`<img src="${p.image}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:contain">`:p.icon}</div><div class="product-body"><h4>${escapeHtml(p.name)}</h4><div class="row"><b>${sold} / ${p.incentiveTarget} CTN</b><span class="pill ${pct>=100?'green':'orange'}">${pct.toFixed(0)}%</span></div><div class="progress-wrap" style="margin:9px 0"><div class="progress ${pct>=100?'goodbar':''}" style="width:${pct}%"></div></div><p class="muted" style="font-size:11px;margin:0">${left?`${left} cartons left to unlock ${money(p.incentiveRM)}`:`🎉 Incentive achieved: ${money(p.incentiveRM)}`}</p></div></div>`}).join('')}</div>`;bindManagerSwitcher()}

function renderSummary(){const uid=visibleUserId(),m=getUserMetrics(uid),s=getState();const outletRows=m.plans.map(p=>{const a=outletAchievement(uid,p.outlet),sf=Math.max(0,p.target-a);return `<tr><td>${escapeHtml(p.outlet)}</td><td>${money(p.target)}</td><td>${money(a)}</td><td class="${sf?'bad':'good'}">${money(sf)}</td></tr>`}).join('');const skuRows=CONFIG.products.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${skuCartons(uid,p.id)}</td><td>${p.incentiveTarget||'-'}</td><td>${p.incentiveTarget?Math.max(0,p.incentiveTarget-skuCartons(uid,p.id)):'-'}</td></tr>`).join('');$('#mainContent').innerHTML=`${managerSwitcher()}<div class="section-title"><h3>Excel-style Summary Board</h3><span class="pill">LIVE TOTAL</span></div><div class="card" style="overflow:auto"><h3>Outlet Performance</h3><table class="summary-table"><thead><tr><th>Outlet</th><th>Target</th><th>Achievement</th><th>Shortfall</th></tr></thead><tbody>${outletRows||'<tr><td colspan="4">No plan yet</td></tr>'}</tbody></table></div><div class="card" style="overflow:auto;margin-top:12px"><h3>SKU / Incentive Performance</h3><table class="summary-table"><thead><tr><th>SKU</th><th>Sold CTN</th><th>Target</th><th>Remaining</th></tr></thead><tbody>${skuRows}</tbody></table></div><div class="form-actions"><button id="csvBtn" class="btn primary">Download Excel-compatible CSV</button>${session.role==='manager'?'<button id="taskBtn" class="btn secondary">Assign Special Task</button>':''}</div>${session.role==='manager'?`<div id="taskPanel" class="card hidden" style="margin-top:12px"><h3>Assign Task to ${escapeHtml(userById(uid).name)}</h3><form id="taskForm" class="stack"><label>Task title<input name="title" required placeholder="e.g. Close 20 cartons Mango Juice"></label><label>Instruction<textarea name="note" placeholder="Manager note"></textarea></label><label>Due date<input name="due" type="date"></label><button class="btn primary">Send Task</button></form></div>`:''}`;bindManagerSwitcher();$('#csvBtn').onclick=()=>downloadCSV(uid);if($('#taskBtn'))$('#taskBtn').onclick=()=>$('#taskPanel').classList.toggle('hidden');if($('#taskForm'))$('#taskForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),st=getState();st.tasks.push({id:crypto.randomUUID(),userId:uid,title:fd.get('title'),note:fd.get('note'),due:fd.get('due'),done:false,createdAt:new Date().toISOString()});saveState(st);updateBadge();toast('Task sent to salesman');render()}}

function downloadCSV(uid){const s=getState();const rows=[['Date','Salesman','Outlet','Today Sales','Last Month Same Day','Active Order','PPR for Trip','Note']];s.daily.filter(x=>x.userId===uid).forEach(x=>rows.push([x.date,userById(uid)?.name,x.outlet,x.todaySales,x.lastMonthSameDay,x.activeOrder,x.pprTrip,x.note||'']));rows.push([]);rows.push(['SKU SALES']);rows.push(['Date','Outlet','SKU','Cartons']);s.skuSales.filter(x=>x.userId===uid).forEach(x=>rows.push([x.date,x.outlet,productById(x.productId)?.name||x.productId,x.cartons]));const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${uid}-sales-report-${isoDate()}.csv`;a.click();URL.revokeObjectURL(a.href)}
function markTaskDone(id){const s=getState(),t=s.tasks.find(x=>x.id===id);if(t)t.done=true;saveState(s);updateBadge();render()}
function updateBadge(){if(!session)return;const uid=visibleUserId(),n=getState().tasks.filter(t=>t.userId===uid&&!t.done).length;$('#notifBadge').textContent=n;$('#notifBadge').classList.toggle('hidden',!n)}

$('#loginForm').onsubmit=e=>{e.preventDefault();doLogin($('#loginUser').value.trim(),$('#loginPin').value.trim())};
$('#logoutBtn').onclick=logout;
$('#notifBtn').onclick=()=>{page='dashboard';render()};
$('#bottomNav').onclick=e=>{const b=e.target.closest('button[data-page]');if(!b)return;page=b.dataset.page;render()};
const saved=sessionStorage.getItem('sph.session');if(saved){session=JSON.parse(saved);openApp()}
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
