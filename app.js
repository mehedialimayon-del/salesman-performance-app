'use strict';

/* =========================================================
   SALES PERFORMANCE HUB — FINAL FRONTEND
   Developed by KAM AYON
   Backend: Google Apps Script / Google Sheets source of truth
========================================================= */

const APP_BUILD = 'LAUNCH-FINAL-2026.09.18-1';
const TZ = 'Asia/Kuala_Lumpur';
const D = window.APP_DATA || { users: [], salaryRules: {}, categoryProducts: {}, products: [], outlets: {} };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const SESSION_KEY = 'sph.final.session.v6';
const PREF_KEY = 'sph.final.pref.v6';
const BACKEND_KEY = 'sph.backendUrl';

let session = null;
let page = 'dashboard';
let selectedMonth = localDate().slice(0, 7);
let selectedDate = localDate();
let managerView = 'M21954';
let current = null;
let teamSnapshot = [];
let lastSyncAt = '';
let syncing = false;
let liveTimer = null;
let selectedPlanningSkus = [];
let oneSignalSdk = null;
let pushConfig = { configured: false, appId: '', ready: false };

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const money = v => 'RM ' + n(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const idGen = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function localDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function localTime() {
  return new Intl.DateTimeFormat('en-MY', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
}
function dateLabel(d) {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}
function monthName(m) {
  const [y, mo] = String(m).split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}
function pct(v) { return n(v).toFixed(1) + '%'; }
function toast(msg, ms = 2400) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__sphToast);
  window.__sphToast = setTimeout(() => t.classList.remove('show'), ms);
}
function getPref() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
}
function setPref(patch) {
  localStorage.setItem(PREF_KEY, JSON.stringify({ ...getPref(), ...patch }));
}
function backendUrl() {
  return String(window.APP_CONFIG?.BACKEND_URL || localStorage.getItem(BACKEND_KEY) || '').trim();
}
function normalizeId(v) {
  const x = String(v || '').trim();
  return x.toLowerCase() === 'manager' ? 'M21954' : x.toUpperCase();
}
function localUser(id) {
  return (D.users || []).find(x => String(x.id).toUpperCase() === String(id || '').toUpperCase());
}
function viewedId() {
  return session?.mode === 'manager' ? managerView : session?.id;
}
function isManager() {
  return session?.mode === 'manager' || String(session?.role || '').toUpperCase().includes('MANAGER') || String(session?.role || '').toUpperCase().includes('HR');
}
function isManagerMode() { return session?.mode === 'manager'; }
function sessionName() { return session?.name || localUser(session?.id)?.name || session?.id || ''; }
function viewedName() {
  if (current?.user?.['Full Name']) return current.user['Full Name'];
  if (current?.user?.name) return current.user.name;
  return localUser(viewedId())?.name || viewedId();
}

/* =========================================================
   NETWORK
========================================================= */

async function fetchJson(url, options = {}, timeout = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Server returned invalid response'); }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Server timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function apiGet(action, extra = {}) {
  if (!backendUrl()) throw new Error('Backend URL is missing');
  if (!session) throw new Error('Please login');
  const q = new URLSearchParams({
    action,
    staffId: session.id,
    password: session.password,
    ...extra
  });
  return fetchJson(backendUrl() + '?' + q.toString());
}

async function apiPost(action, payload = {}) {
  if (!backendUrl()) throw new Error('Backend URL is missing');
  if (!session) throw new Error('Please login');
  const longAction = ['uploadProposal','downloadProposal','downloadBanner','createIncentive','saveIncentive','saveCpo','downloadCpoPhoto'].includes(action);
  return fetchJson(backendUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, staffId: session.id, password: session.password, payload })
  }, longAction ? 90000 : 40000);
}

async function backendLogin(rawId, password) {
  const id = normalizeId(rawId);
  const body = { action: 'login', staffId: id, password, payload: {} };
  const r = await fetchJson(backendUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }, 25000);
  if (!r?.ok) throw new Error(r?.error || 'Login failed');
  return { id, user: r.user || {} };
}

function setBusy(on, message = 'Loading live data…') {
  syncing = on;
  document.body.classList.toggle('sph-busy', !!on);
  let box = $('#sphLoading');
  if (on && !box) {
    box = document.createElement('div');
    box.id = 'sphLoading';
    box.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(5,7,9,.68);backdrop-filter:blur(4px);display:grid;place-items:center;padding:24px';
    box.innerHTML = `<div class="card" style="max-width:360px;width:100%;text-align:center"><div style="font-size:30px;margin-bottom:10px">↻</div><strong>${esc(message)}</strong><p class="muted" style="margin:8px 0 0">Please keep this page open.</p></div>`;
    document.body.appendChild(box);
  }
  if (box && on) box.querySelector('strong').textContent = message;
  if (!on && box) box.remove();
}

async function loadCurrent({ quiet = false } = {}) {
  if (!session || !backendUrl()) return false;
  if (!quiet) setBusy(true, 'Loading live database…');
  try {
    const r = await apiPost('bootstrap', {
      viewStaffId: viewedId(),
      month: selectedMonth,
      date: selectedDate
    });
    if (!r?.ok) throw new Error(r?.error || 'Cloud read failed');
    current = r.data || {};
    lastSyncAt = localTime();
    return true;
  } catch (e) {
    console.warn(e);
    if (!quiet) toast('Sync failed: ' + e.message, 3500);
    return false;
  } finally {
    if (!quiet) setBusy(false);
  }
}

async function loadTeam({ quiet = false } = {}) {
  if (!session || !isManager()) return false;
  if (!quiet) setBusy(true, 'Loading team database…');
  try {
    const r = await apiPost('teamSnapshot', { month: selectedMonth, date: selectedDate });
    if (!r?.ok) throw new Error(r?.error || 'Team database failed');
    teamSnapshot = Array.isArray(r.data) ? r.data : [];
    lastSyncAt = localTime();
    return true;
  } catch (e) {
    console.warn(e);
    if (!quiet) toast('Team sync failed: ' + e.message, 3500);
    return false;
  } finally {
    if (!quiet) setBusy(false);
  }
}

async function refreshCloud(showToast = false) {
  const ok = isManagerMode() && page === 'team' ? await loadTeam({ quiet: !showToast }) : await loadCurrent({ quiet: !showToast });
  if (ok && showToast) toast('Live database updated');
  if (ok) render();
  return ok;
}

/* =========================================================
   SESSION
========================================================= */

function saveSession() {
  if (!session) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function restoreSession() {
  try {
    const x = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!x?.id || !x?.password) return false;
    session = x;
    managerView = x.managerView || (x.mode === 'manager' ? 'M21954' : x.id);
    return true;
  } catch { return false; }
}
function logout() {
  localStorage.removeItem(SESSION_KEY);
  session = null;
  current = null;
  teamSnapshot = [];
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = null;
  try { oneSignalSdk?.logout?.(); } catch {}
  $('#appView')?.classList.add('hidden');
  $('#loginView')?.classList.remove('hidden');
  if ($('#loginPin')) $('#loginPin').value = '';
}

async function login(rawId, password) {
  if (!backendUrl()) {
    toast('Backend URL missing in config.js', 3500);
    return;
  }

  setBusy(true, 'Signing in…');
  try {
    const result = await backendLogin(rawId, password);
    const u = result.user || {};
    const role = String(u.Role || u.role || localUser(result.id)?.role || 'SR');
    const managerAlias = String(rawId || '').trim().toLowerCase() === 'manager';

    session = {
      id: result.id,
      password,
      name: u['Full Name'] || u.name || localUser(result.id)?.name || result.id,
      role,
      mode: managerAlias || role.toUpperCase().includes('HR') ? 'manager' : 'sr',
      managerView: managerAlias ? 'M21954' : result.id
    };

    managerView = session.mode === 'manager' ? (session.managerView || 'M21954') : session.id;
    page = session.mode === 'manager' ? 'team' : 'dashboard';
    saveSession();
    openApp();

    /* Do not keep the user behind a spinner while Google Sheets loads. */
    setBusy(false);
    render();

    if (session.mode === 'manager') {
      await Promise.all([loadTeam({ quiet: true }), loadCurrent({ quiet: true })]);
    } else {
      await loadCurrent({ quiet: true });
    }

    initPushSystem();
    render();
  } catch (e) {
    toast(e.message || 'Login failed', 3500);
    $('#appView')?.classList.add('hidden');
    $('#loginView')?.classList.remove('hidden');
  } finally {
    setBusy(false);
  }
}

function openApp() {
  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.remove('hidden');
  installShell();
  refreshTop();
  startLiveSync();
}

/* =========================================================
   SHELL / NAVIGATION
========================================================= */

function installShell() {
  const settingsBtn = $('#logoutBtn');
  if (settingsBtn) {
    settingsBtn.textContent = '⚙';
    settingsBtn.title = 'Settings';
    settingsBtn.onclick = () => setPage('settings');
  }

  const nav = $('#bottomNav');
  if (nav && !nav.querySelector('[data-page="proposal"]')) {
    const b = document.createElement('button');
    b.dataset.page = 'proposal';
    b.innerHTML = '<span class="nav-icon">▤</span><small>PO Form</small>';
    nav.appendChild(b);
    nav.style.gridTemplateColumns = 'repeat(6,1fr)';
  }

  const app = $('#appView');
  if (app && !$('#developerCredit')) {
    const c = document.createElement('div');
    c.id = 'developerCredit';
    c.style.cssText = 'text-align:center;font-size:10px;color:#78828d;padding:8px 10px 90px;letter-spacing:.45px';
    c.innerHTML = `Developed by <a href="https://mehedialimayon-del.github.io/MEHEDI-ALIM-AYON-PORTFOLIO/" target="_blank" rel="noopener" style="color:#ff7414;text-decoration:none;font-weight:900;letter-spacing:.8px">KAM AYON</a>`;
    app.insertBefore(c, nav);
  }
}

function refreshTop() {
  if (!session) return;
  if ($('#roleLabel')) {
    $('#roleLabel').textContent = isManagerMode() ? 'MANAGER ACCESS • ' + session.id : (String(session.role || 'SR').toUpperCase() + ' • ' + session.id);
  }
  if ($('#welcomeName')) {
    $('#welcomeName').textContent = isManagerMode() ? ('Manager • ' + viewedName()) : sessionName();
  }
  updateNotificationBadge();
}

function setPage(next, opts = {}) {
  if (!next) return;
  const prev = page;
  page = next;
  if (session && !opts.fromHistory && prev !== next) {
    history.pushState({ sph: true, page: next }, '', location.href);
  }
  render();
  window.scrollTo({top:0, behavior:'auto'});
}

function bindNav() {
  $$('#bottomNav button[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
    b.onclick = () => setPage(b.dataset.page);
  });
}

function pushHistoryState() {
  if (!history.state?.sph) history.replaceState({ sph: true, page: page || 'dashboard' }, '', location.href);
}

window.addEventListener('popstate', e => {
  if (!session) return;
  page = e.state?.page || 'dashboard';
  render();
});

/* =========================================================
   COMMON DATA HELPERS
========================================================= */

function routeOutlets() {
  return Array.isArray(current?.outlets) ? current.outlets : [];
}
function skuMaster() {
  return Array.isArray(current?.sku) ? current.sku : [];
}
function allSkuNames() {
  const cloud = skuMaster().map(x => String(x['Product Name'] || '')).filter(Boolean);
  const local = Array.isArray(D.products) ? D.products : [];
  return [...new Set([...cloud, ...local])].sort((a, b) => a.localeCompare(b));
}

function productsForOutlet(outletName) {
  const outlet = routeOutlets().find(x => String(x['Outlet Name']) === String(outletName));
  const category = String(outlet?.Category || '');

  const exactCloud = skuMaster()
    .filter(x => String(x['Outlet Category'] || '').trim().toLowerCase() === category.toLowerCase())
    .map(x => String(x['Product Name'] || ''))
    .filter(Boolean);
  if (exactCloud.length) return [...new Set(exactCloud)].sort();

  const localList = D.categoryProducts?.[category];
  if (Array.isArray(localList) && localList.length) return [...new Set(localList)].sort();

  const allCloud = skuMaster()
    .filter(x => ['','all'].includes(String(x['Outlet Category'] || '').trim().toLowerCase()))
    .map(x => String(x['Product Name'] || ''))
    .filter(Boolean);
  if (allCloud.length) return [...new Set(allCloud)].sort();

  return allSkuNames();
}

function outletOptions(selected = '', filter = '') {
  const q = String(filter || '').trim().toLowerCase();
  return '<option value="">Select outlet</option>' + routeOutlets()
    .filter(x => !q || String(x['Outlet Name'] || '').toLowerCase().includes(q) || String(x['Outlet Code'] || '').toLowerCase().includes(q))
    .map(x => `<option value="${esc(x['Outlet Name'])}" ${String(x['Outlet Name']) === String(selected) ? 'selected' : ''}>${esc(x['Outlet Name'])}</option>`).join('');
}
function skuOptions(outletName, selected = '', filter = '') {
  const q = String(filter || '').trim().toLowerCase();
  return '<option value="">Select SKU</option>' + productsForOutlet(outletName)
    .filter(x => !q || String(x).toLowerCase().includes(q))
    .map(x => `<option value="${esc(x)}" ${String(x) === String(selected) ? 'selected' : ''}>${esc(x)}</option>`).join('');
}
function planByOutlet(name) {
  return (current?.plans || []).find(x => String(x['Outlet Name']) === String(name));
}
function dayOutletSales(name, date = selectedDate) {
  return (current?.outletSales || []).filter(x => String(x['Outlet Name']) === String(name) && String(x.Date).slice(0, 10) === date).reduce((a, x) => a + n(x['Sales Value']), 0);
}
function monthOutletSales(name) {
  return (current?.outletSales || []).filter(x => String(x['Outlet Name']) === String(name)).reduce((a, x) => a + n(x['Sales Value']), 0);
}
function taskDone(x) { return String(x.Status || '').toUpperCase() === 'DONE'; }
function activePenalty(x) { return String(x.Status || 'ACTIVE').toUpperCase() === 'ACTIVE'; }
function selectedDayData() { return current?.dayData || { daily: [], outletSales: [], skuSales: [] }; }
function personalTargetProgress(t) {
  const metric = String(t.Metric || 'SALES_RM').toUpperCase();
  const start = String(t['Start Date'] || selectedMonth + '-01').slice(0, 10);
  const end = String(t['End Date'] || '9999-12-31').slice(0, 10);
  const sku = String(t['SKU Name'] || '');
  let actual = 0;
  if (metric === 'CARTONS') {
    actual = (current?.skuSales || []).filter(x => String(x.Date).slice(0, 10) >= start && String(x.Date).slice(0, 10) <= end && (!sku || String(x['SKU Name']) === sku)).reduce((a, x) => a + n(x.Cartons), 0);
  } else if (metric === 'SKU_SALES_RM') {
    actual = (current?.skuSales || []).filter(x => String(x.Date).slice(0, 10) >= start && String(x.Date).slice(0, 10) <= end && (!sku || String(x['SKU Name']) === sku)).reduce((a, x) => a + n(x['Sales Value']), 0);
  } else {
    actual = (current?.daily || []).filter(x => String(x.Date).slice(0, 10) >= start && String(x.Date).slice(0, 10) <= end).reduce((a, x) => a + n(x['Today Sales']), 0);
  }
  const target = n(t['Target Value']);
  return { actual, target, remaining: Math.max(0, target - actual), percent: target ? actual / target * 100 : 0 };
}

/* =========================================================
   COMPONENTS
========================================================= */

function kpi(label, value, sub = '', cls = '') {
  return `<div class="kpi"><div class="label">${esc(label)}</div><div class="value ${cls}">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`;
}
function progressBar(value) {
  const v = Math.max(0, Math.min(100, n(value)));
  return `<div class="progress-wrap"><div class="progress ${v >= 100 ? 'goodbar' : ''}" style="width:${v}%"></div></div>`;
}
function empty(message) { return `<div class="empty">${esc(message)}</div>`; }
function table(title, heads, rows) {
  return `<div class="card" style="margin-top:12px;overflow:auto"><h3>${esc(title)}</h3><table class="summary-table" style="min-width:${Math.max(620, heads.length * 120)}px"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${heads.length}">No data</td></tr>`}</tbody></table></div>`;
}
function syncStatus() {
  const online = navigator.onLine;
  return `<div class="status-strip"><span class="status-chip ${online ? 'ok' : 'bad'}"><span class="sync-dot ${online ? 'ok' : ''}"></span>${online ? 'Online' : 'Offline'}</span><span class="status-chip ${backendUrl() ? 'ok' : 'bad'}">☁ ${backendUrl() ? 'Cloud connected' : 'Cloud missing'}</span><span class="status-chip">↻ ${lastSyncAt ? 'Synced ' + lastSyncAt : 'Not synced yet'}</span><span class="status-chip">Build ${APP_BUILD}</span></div>`;
}
function monthBar({ showManager = true } = {}) {
  const managerChooser = showManager && isManagerMode() ? `<label style="flex:1;min-width:190px;margin:0">View SR<select id="managerPick">${teamUsers().map(u => `<option value="${esc(u.id)}" ${u.id === managerView ? 'selected' : ''}>${esc(u.name)} • ${u.id}</option>`).join('')}</select></label>` : '';
  const mode = String(session?.role || '').toUpperCase().includes('MANAGER') ? `<div class="mode-toggle" style="flex:1;min-width:190px"><button id="mySrMode" class="${session.mode === 'sr' ? 'active' : ''}">My SR</button><button id="managerMode" class="${session.mode === 'manager' ? 'active' : ''}">Manager</button></div>` : '';
  return `<div class="monthbar"><label style="margin:0;flex:1;min-width:145px">Month<input id="monthPick" type="month" value="${selectedMonth}"></label>${mode}${managerChooser}</div>`;
}
function dateFilter(label = 'Report Date') {
  return `<label>${esc(label)}<input id="datePick" type="date" value="${selectedDate}"></label>`;
}
function teamUsers() {
  const fromTeam = teamSnapshot.map(x => ({ id: x.staffId, name: x.name }));
  if (fromTeam.length) return fromTeam;
  return (D.users || []).filter(x => x.role === 'SR' || String(x.role).includes('MANAGER')).map(x => ({ id: x.id, name: x.name }));
}

async function handleCommonFilterChange() {
  setPref({ month: selectedMonth, date: selectedDate });
  if (isManagerMode() && page === 'team') await loadTeam();
  else await loadCurrent();
  render();
}

function bindCommon() {
  const mp = $('#monthPick');
  if (mp) mp.onchange = async e => {
    selectedMonth = e.target.value;
    if (!selectedDate.startsWith(selectedMonth)) selectedDate = selectedMonth + '-01';
    await handleCommonFilterChange();
  };
  const dp = $('#datePick');
  if (dp) dp.onchange = async e => {
    selectedDate = e.target.value || localDate();
    selectedMonth = selectedDate.slice(0, 7);
    await handleCommonFilterChange();
  };
  const mm = $('#managerPick');
  if (mm) mm.onchange = async e => {
    managerView = e.target.value;
    session.managerView = managerView;
    saveSession();
    await loadCurrent();
    render();
  };
  const sr = $('#mySrMode');
  if (sr) sr.onclick = async () => {
    session.mode = 'sr';
    managerView = session.id;
    session.managerView = managerView;
    saveSession();
    page = 'dashboard';
    await loadCurrent();
    render();
  };
  const mgr = $('#managerMode');
  if (mgr) mgr.onclick = async () => {
    session.mode = 'manager';
    managerView = session.managerView || 'M21954';
    saveSession();
    page = 'team';
    await loadTeam();
    render();
  };
  $$('[data-go]').forEach(b => b.onclick = () => setPage(b.dataset.go));
}

/* =========================================================
   DASHBOARD
========================================================= */

function alertsForCurrent() {
  if (!current) return [];
  const a = [];
  const perf = current.performance || {};
  const pending = (current.tasks || []).filter(x => !taskDone(x));
  if (pending.length) a.push({ icon: '✅', title: pending.length + ' pending task(s)', text: 'Open Tasks to review manager instructions.', page: 'tasks' });
  if (n(perf.shortfall) > 0) a.push({ icon: '🎯', title: money(perf.shortfall) + ' shortfall', text: 'Current achievement ' + pct(perf.percent) + '.', page: 'summary' });
  if (n(perf.zeroOutlets) > 0) a.push({ icon: '🏪', title: perf.zeroOutlets + ' zero-sales outlet(s)', text: 'Use Outlet Report to prioritize coverage.', page: 'zero' });
  const inc = current.incentives || [];
  inc.filter(x => !x.fulfilled && n(x.remaining) > 0).slice(0, 3).forEach(x => a.push({ icon: '🏆', title: x.name || 'Incentive', text: `${x.actual} / ${x.target} • ${x.remaining} remaining • RM ${n(x.rewardRM).toFixed(2)} reward`, page: 'incentives' }));
  return a;
}

function renderDashboard() {
  if (!current) {
    $('#mainContent').innerHTML = monthBar() + `<div class="card">${empty('Live database is not loaded yet.')}<button id="loadNow" class="btn primary">LOAD DATABASE</button></div>`;
    bindCommon();
    $('#loadNow').onclick = () => refreshCloud(true);
    return;
  }
  const p = current.performance || {};
  const f = current.forecast || {};
  const inc = current.incomeSummary || {};
  const cmp = current.comparisons || {};
  const alerts = alertsForCurrent();
  $('#mainContent').innerHTML = `${monthBar()}<section class="hero"><p class="eyebrow">LIVE SALES DATABASE</p><h3>${esc(viewedName())}</h3><p class="muted">${monthName(selectedMonth)} • Source of truth: Google Sheets</p>${progressBar(p.percent)}${syncStatus()}<div class="form-actions"><button id="syncNow" class="btn secondary">↻ REFRESH LIVE</button>${isManagerMode() ? '<button class="btn secondary" data-go="team">👥 TEAM</button>' : ''}</div></section>
  <div class="grid kpi-grid">${kpi('MONTH TARGET', money(p.target), monthName(selectedMonth))}${kpi('ACHIEVEMENT', money(p.achievement), pct(p.percent), p.percent >= 100 ? 'good' : '')}${kpi('SHORTFALL', money(p.shortfall), 'Remaining', p.shortfall ? 'bad' : 'good')}${kpi('TODAY SALES', money(p.todaySales), dateLabel(selectedDate))}${kpi('OUTLET COVERAGE', pct(p.coverage), `${n(p.coveredOutlets)}/${n(p.routeOutlets)} outlets`, p.zeroOutlets ? 'warn' : 'good')}${kpi('ZERO OUTLETS', String(n(p.zeroOutlets)), 'Month-to-date', p.zeroOutlets ? 'bad' : 'good')}${kpi('PROJECTED MONTH', money(f.projectedSales), f.onTrack ? 'On track' : 'Needs acceleration', f.onTrack ? 'good' : 'warn')}${kpi('FINAL INCOME', money(inc.finalIncome), 'After incentive & penalty')}${kpi('LAST MONTH SAME DAY', money(cmp.lastMonthSameDay), cmp.lastMonthDate ? dateLabel(cmp.lastMonthDate) : '—')}${kpi('LAST YEAR SAME DAY', money(cmp.lastYearSameDay), cmp.lastYearDate ? dateLabel(cmp.lastYearDate) : '—')}</div>
  <div class="section-title"><h3>Smart Actions</h3></div><div class="mini-grid"><button class="btn secondary" data-go="execution">📦 Order & Delivery</button><button class="btn secondary" data-go="daily">＋ Legacy Sales</button><button class="btn secondary" data-go="zero">🏪 Outlet Report</button><button class="btn secondary" data-go="incentives">🏆 Incentives</button><button class="btn secondary" data-go="opportunity">⚡ Opportunity</button><button class="btn secondary" data-go="tasks">⚠️ Important Work</button><button class="btn secondary" data-go="cpo">📍 CPO Execution</button><button class="btn secondary" data-go="activity">🕘 Timeline</button><button class="btn secondary" data-go="planning">◎ Monthly Plan</button><button class="btn secondary" data-go="summary">▦ Full Summary</button></div>
  <div class="section-title"><h3>Attention</h3></div>${alerts.length ? `<div class="notification-list">${alerts.map(x => `<button class="notification-item" data-go="${x.page}" style="text-align:left;width:100%;color:inherit"><div class="notification-icon">${x.icon}</div><div><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p></div></button>`).join('')}</div>` : `<div class="card"><span class="pill green">ALL CLEAR</span><p class="muted" style="margin:10px 0 0">No urgent item found for the selected period.</p></div>`}`;
  bindCommon();
  $('#syncNow').onclick = () => refreshCloud(true);
}

/* =========================================================
   DAILY / OUTLET / SKU ENTRY
========================================================= */

function renderDaily() {
  if (isManagerMode()) {
    $('#mainContent').innerHTML = `${monthBar()}<div class="card"><h2>Manager mode is view-only</h2><p class="muted">Switch to My SR to enter your own sales.</p></div>`;
    bindCommon();
    return;
  }
  $('#mainContent').innerHTML = `${monthBar({ showManager: false })}<div class="card"><p class="eyebrow">STEP 1</p><h2>Daily Route Total</h2><form id="dailyForm" class="stack"><label>Date<input name="date" type="date" value="${selectedDate}" required></label><label>Today Total Sales (RM)<input name="todaySales" type="number" min="0" step="0.01" required></label><div class="form-grid"><label>Last Month Same Day (RM)<input name="lastMonthSameDay" type="number" min="0" step="0.01" value="0"></label><label>Last Year Same Day (RM)<input name="lastYearSameDay" type="number" min="0" step="0.01" value="0"></label></div><div class="form-grid"><label>Active (RM)<input name="active" type="number" min="0" step="0.01" value="0"></label><label>Prepare for Trip / PPR (RM)<input name="prepareTrip" type="number" min="0" step="0.01" value="0"></label></div><label>Order Amount (RM)<input name="orderAmount" type="number" min="0" step="0.01" value="0"></label><label>Note<textarea name="note"></textarea></label><button class="btn primary big-action">SAVE DAILY TOTAL</button></form></div>
  <div class="card" style="margin-top:12px"><p class="eyebrow">STEP 2</p><h2>Outlet & SKU Sale</h2><form id="outletForm" class="stack"><label>Date<input name="date" type="date" value="${selectedDate}" required></label><label>Search Outlet<input id="outletSearch" placeholder="Type outlet name or code"></label><label>Select Outlet<select id="outletSel" name="outlet" required>${outletOptions()}</select></label><label>Outlet Sales (RM)<input name="sales" type="number" min="0" step="0.01" required></label><label>Search SKU<input id="skuSearch" placeholder="Type SKU name"></label><label>Select SKU<select id="skuSel" name="sku"><option value="">Select outlet first</option></select></label><div class="form-grid"><label>Cartons Sold<input name="cartons" type="number" min="0" step="1" value="0"></label><label>SKU Sales Value (RM)<input name="skuValue" type="number" min="0" step="0.01" value="0"></label></div><label>Note<textarea name="note"></textarea></label><button class="btn primary big-action">SAVE OUTLET / SKU SALE</button></form></div>`;
  bindCommon();

  const oSearch = $('#outletSearch'), oSel = $('#outletSel'), sSearch = $('#skuSearch'), sSel = $('#skuSel');
  const refreshSku = () => { sSel.innerHTML = oSel.value ? skuOptions(oSel.value, sSel.value, sSearch.value) : '<option value="">Select outlet first</option>'; };
  oSearch.oninput = () => { const old = oSel.value; oSel.innerHTML = outletOptions(old, oSearch.value); if ([...oSel.options].some(x => x.value === old)) oSel.value = old; refreshSku(); };
  oSel.onchange = () => { sSearch.value = ''; refreshSku(); };
  sSearch.oninput = refreshSku;

  $('#dailyForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), date = String(fd.get('date'));
    const payload = { requestId: idGen(), date, month: date.slice(0, 7), todaySales: n(fd.get('todaySales')), lastMonthSameDay: n(fd.get('lastMonthSameDay')), lastYearSameDay: n(fd.get('lastYearSameDay')), active: n(fd.get('active')), prepareTrip: n(fd.get('prepareTrip')), orderAmount: n(fd.get('orderAmount')), note: String(fd.get('note') || '') };
    setBusy(true, 'Saving daily sales…');
    try {
      const r = await apiPost('saveDaily', payload);
      if (!r?.ok) throw new Error(r?.error || 'Save failed');
      selectedDate = date; selectedMonth = date.slice(0, 7);
      await loadCurrent({ quiet: true });
      toast(r.duplicate ? 'Already saved — duplicate ignored' : 'Daily sales saved to cloud');
      render();
    } catch (err) { toast(err.message, 3500); } finally { setBusy(false); }
  };

  $('#outletForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), date = String(fd.get('date')), outletName = String(fd.get('outlet') || ''), skuName = String(fd.get('sku') || '');
    const outlet = routeOutlets().find(x => String(x['Outlet Name']) === outletName);
    if (!outlet) return toast('Select an outlet');
    setBusy(true, 'Saving outlet / SKU sale…');
    try {
      const baseId = idGen();
      const ro = await apiPost('saveOutlet', { requestId: baseId + '-O', date, month: date.slice(0, 7), outletCode: outlet['Outlet Code'] || '', outletName, sales: n(fd.get('sales')), note: String(fd.get('note') || '') });
      if (!ro?.ok) throw new Error(ro?.error || 'Outlet sale failed');
      if (skuName) {
        const rs = await apiPost('saveSku', { requestId: baseId + '-S', date, month: date.slice(0, 7), outletCode: outlet['Outlet Code'] || '', outletName, skuName, cartons: n(fd.get('cartons')), salesValue: n(fd.get('skuValue')) });
        if (!rs?.ok) throw new Error(rs?.error || 'SKU sale failed');
      }
      selectedDate = date; selectedMonth = date.slice(0, 7);
      await loadCurrent({ quiet: true });
      toast('Outlet / SKU sale saved to cloud');
      render();
    } catch (err) { toast(err.message, 3500); } finally { setBusy(false); }
  };
}


/* =========================================================
   OPERATIONAL EXECUTION — ORDER -> ACTUAL DELIVERY
========================================================= */
function deliveryPill(st){
  st=String(st||'PENDING').toUpperCase();
  return `<span class="pill ${st==='DELIVERED'?'green':st==='CANCELLED'?'red':'orange'}">${esc(st)}</span>`;
}
function renderExecution(){
  const orders=current?.orders||[], outlets=routeOutlets();
  const canEdit=isManagerMode();
  $('#mainContent').innerHTML=`${monthBar()}<section class="hero"><p class="eyebrow">ACTUAL SALES CONTROL</p><h3>Order → Delivery → Actual Sale</h3><p class="muted">Booked order does not count as sales. Only delivered value counts in achievement, incentive and income.</p></section>
  ${!isManagerMode()?`<div class="card" style="margin-top:12px"><h2>New Order</h2><form id="execOrderForm" class="stack"><label>Date<input name="date" type="date" value="${selectedDate}" required></label><label>Outlet<select name="outlet" required>${outletOptions()}</select></label><label>Ordered Amount (RM)<input name="amount" type="number" min="0" step=".01" required></label><label>SKU (optional)<input name="sku" placeholder="Product name"></label><div class="form-grid"><label>Ordered Cartons<input name="cartons" type="number" min="0" step="1" value="0"></label><label>SKU Value (RM)<input name="skuValue" type="number" min="0" step=".01" value="0"></label></div><label>Note<textarea name="note"></textarea></label><button class="btn primary">SAVE AS PENDING ORDER</button></form></div>`:''}
  <div class="section-title"><h3>Order & Delivery Register</h3></div><div class="list">${orders.length?orders.map((o,i)=>`<div class="list-item"><div class="row"><div><h4>${i+1}. ${esc(o.outletName)}</h4><p>${dateLabel(o.date)} • Order ${money(o.orderedAmount)} • Delivered ${money(o.deliveredAmount)} • Pending ${money(o.pendingAmount)}</p></div>${deliveryPill(o.status)}</div>
  <div class="form-grid" style="margin-top:10px"><input data-delamt="${esc(o.orderId)}" type="number" min="0" max="${n(o.orderedAmount)}" step=".01" value="${n(o.deliveredAmount)}"><select data-delstatus="${esc(o.orderId)}"><option>PENDING</option><option ${o.status==='PARTIAL'?'selected':''}>PARTIAL</option><option ${o.status==='DELIVERED'?'selected':''}>DELIVERED</option><option ${o.status==='CANCELLED'?'selected':''}>CANCELLED</option></select></div><div class="form-actions"><button class="btn secondary" data-deliver="${esc(o.orderId)}">UPDATE DELIVERY</button>${canEdit?`<button class="btn danger" data-reset="${esc(o.orderId)}">RESET TO ZERO</button>`:''}</div></div>`).join(''):empty('No execution orders yet.')}</div>`;
  bindCommon();
  if($('#execOrderForm')) $('#execOrderForm').onsubmit=async e=>{
    e.preventDefault(); const fd=new FormData(e.target), name=String(fd.get('outlet')||''), out=outlets.find(x=>String(x['Outlet Name'])===name);
    setBusy(true,'Saving pending order…');
    try{
      const sku=String(fd.get('sku')||'').trim(), items=sku?[{skuName:sku,orderedCartons:n(fd.get('cartons')),orderedValue:n(fd.get('skuValue'))}]:[];
      const r=await apiPost('saveExecutionOrder',{requestId:idGen(),date:String(fd.get('date')),outletCode:out?.['Outlet Code']||'',outletName:name,orderedAmount:n(fd.get('amount')),note:String(fd.get('note')||''),items});
      if(!r?.ok) throw new Error(r?.error||'Order failed'); await loadCurrent({quiet:true}); toast('Order saved as PENDING — not counted as actual sale'); render();
    }catch(x){toast(x.message,4000)}finally{setBusy(false)}
  };
  $$('[data-deliver]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.deliver, amount=$(`[data-delamt="${CSS.escape(id)}"]`)?.value||0, status=$(`[data-delstatus="${CSS.escape(id)}"]`)?.value||'PENDING';
    setBusy(true,'Updating actual delivery…'); try{const r=await apiPost('updateExecutionDelivery',{orderId:id,status,deliveredAmount:n(amount),deliveryDate:localDate()});if(!r?.ok)throw new Error(r?.error||'Update failed');await loadCurrent({quiet:true});toast('Actual delivery updated');render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}
  });
  $$('[data-reset]').forEach(b=>b.onclick=async()=>{if(!confirm('Reset this order actual sale to RM0?'))return;setBusy(true,'Resetting…');try{const r=await apiPost('managerResetExecution',{orderId:b.dataset.reset,note:'Manager reset to zero'});if(!r?.ok)throw new Error(r?.error||'Reset failed');await loadCurrent({quiet:true});toast('Actual sale reset to RM0');render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}});
}

/* =========================================================
   CPO EXECUTION — PHOTO + GPS
========================================================= */
function gpsNow(){return new Promise((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(x=>resolve(x.coords),reject,{enableHighAccuracy:true,timeout:20000,maximumAge:0}):reject(new Error('GPS not supported')))}
function renderCpo(){
 const proofs=current?.cpo||[], route=current?.outletSummary||[], proofKeys=new Set(proofs.map(x=>String(x.outletCode||x.outletName).toUpperCase()));
 $('#mainContent').innerHTML=`${monthBar()}<section class="hero"><p class="eyebrow">CPO EXECUTION TRACKER</p><h3>Photo + GPS Proof</h3><p class="muted">Outlet without CPO proof remains RED.</p></section>
 ${!isManagerMode()?`<div class="card" style="margin-top:12px"><form id="cpoForm" class="stack"><label>Date<input name="date" type="date" value="${selectedDate}" required></label><label>Outlet<select name="outlet" required>${outletOptions()}</select></label><label>Current CPO Photo<input name="photo" type="file" accept="image/*" capture="environment" required></label><label>Note<textarea name="note"></textarea></label><button class="btn primary">CAPTURE GPS & SAVE CPO</button></form></div>`:''}
 <div class="section-title"><h3>Route CPO Status</h3></div><div class="list">${route.map(x=>{const key=String(x.outletCode||x.outletName).toUpperCase(),ok=proofKeys.has(key)||x.cpo;return `<div class="list-item"><div class="row"><div><h4>${x.serial||''}. ${esc(x.outletName)}</h4><p>${esc(x.outletCode||'')}</p></div><span class="pill ${ok?'green':'red'}">${ok?'CPO ✓':'NO CPO'}</span></div></div>`}).join('')}</div>
 <div class="section-title"><h3>Proof History</h3></div><div class="list">${proofs.length?proofs.map(x=>`<div class="list-item"><h4>${esc(x.outletName)}</h4><p>${dateLabel(x.date)} • GPS ${n(x.latitude).toFixed(5)}, ${n(x.longitude).toFixed(5)} • Accuracy ${n(x.accuracy).toFixed(0)}m</p><div class="form-actions"><button class="btn secondary" data-cpophoto="${esc(x.id)}">VIEW PHOTO</button>${x.locationUrl?`<a class="btn secondary" href="${esc(x.locationUrl)}" target="_blank" rel="noopener">MAP</a>`:''}</div></div>`).join(''):empty('No CPO proof uploaded yet.')}</div>`;
 bindCommon();
 if($('#cpoForm')) $('#cpoForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),file=fd.get('photo'),name=String(fd.get('outlet')||''),out=routeOutlets().find(x=>String(x['Outlet Name'])===name);if(!(file instanceof File)||!file.size)return toast('Take/select CPO photo');setBusy(true,'Getting GPS and uploading CPO…');try{const c=await gpsNow(),base64=await fileToBase64(file),r=await apiPost('saveCpo',{date:String(fd.get('date')),outletCode:out?.['Outlet Code']||'',outletName:name,note:String(fd.get('note')||''),fileName:file.name,mimeType:file.type||'image/jpeg',base64,latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy});if(!r?.ok)throw new Error(r?.error||'CPO failed');await loadCurrent({quiet:true});toast('CPO photo + GPS saved');render()}catch(x){toast(x.message||'GPS/photo failed',4500)}finally{setBusy(false)}};
 $$('[data-cpophoto]').forEach(b=>b.onclick=async()=>{setBusy(true,'Opening CPO proof…');try{const r=await apiPost('downloadCpoPhoto',{cpoId:b.dataset.cpophoto});if(!r?.ok)throw new Error(r?.error||'Photo failed');const url=URL.createObjectURL(base64ToBlob(r.base64,r.mimeType));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),30000)}catch(x){toast(x.message,4000)}finally{setBusy(false)}});
}

/* =========================================================
   OUTLET REPORT / ZERO SALES
========================================================= */

function renderZero() {
  const rows = routeOutlets().map(o => {
    const name = String(o['Outlet Name'] || '');
    const d = dayOutletSales(name);
    const mtd = monthOutletSales(name);
    const plan = planByOutlet(name);
    const autoTarget = routeOutlets().length ? n(current?.performance?.target) / routeOutlets().length : 0;
    const target = n(plan?.['Outlet Target']) || autoTarget;
    return { name, code: o['Outlet Code'] || '', category: o.Category || '', day: d, mtd, target, gap: target ? Math.max(0, target - mtd) : 0 };
  });
  const q = getPref().zeroSearch || '';
  $('#mainContent').innerHTML = `${monthBar()}<div class="card" style="margin-bottom:12px"><div class="form-grid">${dateFilter('Daily Sale Date')}<label>Search Outlet<input id="zeroSearch" value="${esc(q)}" placeholder="Outlet name / code"></label></div></div><section class="hero"><p class="eyebrow">OUTLET SALES / ZERO SALES</p><h3>${dateLabel(selectedDate)}</h3><p class="muted">Daily sale + MTD sale + monthly outlet target stay visible together.</p>${syncStatus()}<button id="zeroRefresh" class="btn secondary" style="margin-top:10px">↻ REFRESH LIVE</button></section><div id="zeroList" class="list" style="margin-top:12px"></div>`;
  bindCommon();
  const paint = () => {
    const query = String($('#zeroSearch')?.value || '').toLowerCase();
    const list = rows.filter(x => !query || x.name.toLowerCase().includes(query) || String(x.code).toLowerCase().includes(query));
    $('#zeroList').innerHTML = list.length ? list.map(x => `<div class="list-item"><div class="row"><div><h4>${esc(x.name)}</h4><p>${esc(x.category)} • ${esc(x.code || 'No code')}</p><p style="margin-top:7px"><strong style="color:#fff">Today ${money(x.day)}</strong> • MTD ${money(x.mtd)} • Target ${x.target ? money(x.target) : 'Not set'}${x.target ? ' • Gap ' + money(x.gap) : ''}</p></div><span class="pill ${x.day > 0 ? 'green' : 'red'}">${x.day > 0 ? 'SALE' : 'ZERO'}</span></div></div>`).join('') : empty('No outlet found');
  };
  paint();
  $('#zeroSearch').oninput = () => { setPref({ zeroSearch: $('#zeroSearch').value }); paint(); };
  $('#zeroRefresh').onclick = () => refreshCloud(true);
}

/* =========================================================
   MONTHLY PLANNING
========================================================= */

function parsePlanSkus(p) {
  const raw = typeof p?.['Targeted SKU List'] === 'string' ? (() => { try { return JSON.parse(p['Targeted SKU List']); } catch { return []; } })() : (p?.['Targeted SKU List'] || []);
  return Array.isArray(raw) ? raw : [];
}

function planningList() {
  const plans = current?.plans || [];
  if (!plans.length) return empty('No monthly plan yet.');
  return `<div class="list">${plans.map(p => { const mtd = monthOutletSales(p['Outlet Name']); const target = n(p['Outlet Target']); const list = parsePlanSkus(p); return `<div class="card"><div class="row"><div><h3>${esc(p['Outlet Name'])}</h3><p class="muted">${money(mtd)} / ${money(target)} • ${target ? pct(mtd / target * 100) : 'No target'}</p></div><span class="pill ${mtd >= target && target ? 'green' : 'orange'}">${target ? money(Math.max(0, target - mtd)) + ' left' : 'PLAN'}</span></div>${list.length ? `<div class="status-strip">${list.map(x => `<span class="status-chip">${esc(typeof x === 'string' ? x : x.name || '')}</span>`).join('')}</div>` : ''}</div>`; }).join('')}</div>`;
}

function renderPlanning() {
  if (isManagerMode()) {
    $('#mainContent').innerHTML = `${monthBar()}<div class="card"><h2>${esc(viewedName())} • Monthly Plan</h2></div><div style="margin-top:12px">${planningList()}</div>`;
    bindCommon();
    return;
  }
  selectedPlanningSkus = [];
  $('#mainContent').innerHTML = `${monthBar({ showManager: false })}<div class="card"><h2>Monthly Outlet & SKU Plan</h2><form id="planForm" class="stack"><label>Search Outlet<input id="planOutletSearch" placeholder="Outlet name"></label><label>Select Outlet<select id="planOutlet" name="outlet" required>${outletOptions()}</select></label><label>Outlet Monthly Target (RM)<input name="outletTarget" type="number" min="0" step="0.01" required></label><label>Target SKU Count<input name="targetSkuCount" type="number" min="0" step="1" value="0"></label><label>Search SKU<input id="planSkuSearch" placeholder="SKU name"></label><label>Select SKU<select id="planSku"><option value="">Select outlet first</option></select></label><button type="button" id="addPlanSku" class="btn secondary">+ ADD SKU</button><div id="planSkuChips" class="chipbox"></div><button class="btn primary">SAVE MONTHLY PLAN</button></form></div><div class="section-title"><h3>Plan vs Achievement</h3></div>${planningList()}`;
  bindCommon();
  const os = $('#planOutletSearch'), o = $('#planOutlet'), ss = $('#planSkuSearch'), s = $('#planSku'), chips = $('#planSkuChips');
  const paintSkus = () => { chips.innerHTML = selectedPlanningSkus.map(x => `<span class="chip">${esc(x)} <button type="button" data-rmsku="${esc(x)}">×</button></span>`).join(''); $$('[data-rmsku]').forEach(b => b.onclick = () => { selectedPlanningSkus = selectedPlanningSkus.filter(x => x !== b.dataset.rmsku); paintSkus(); refreshSku(); }); };
  const refreshSku = () => { s.innerHTML = o.value ? skuOptions(o.value, s.value, ss.value) : '<option value="">Select outlet first</option>'; [...s.options].forEach(opt => { if (selectedPlanningSkus.includes(opt.value)) opt.disabled = true; }); };
  os.oninput = () => { const old = o.value; o.innerHTML = outletOptions(old, os.value); refreshSku(); };
  o.onchange = () => { selectedPlanningSkus = []; paintSkus(); refreshSku(); };
  ss.oninput = refreshSku;
  $('#addPlanSku').onclick = () => { if (!s.value) return toast('Select SKU'); if (!selectedPlanningSkus.includes(s.value)) selectedPlanningSkus.push(s.value); paintSkus(); refreshSku(); };
  $('#planForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), outletName = String(fd.get('outlet') || ''), outlet = routeOutlets().find(x => String(x['Outlet Name']) === outletName);
    if (!outlet) return toast('Select outlet');
    setBusy(true, 'Saving monthly plan…');
    try {
      const r = await apiPost('savePlan', { month: selectedMonth, routeTarget: current?.performance?.target || 0, outletCode: outlet['Outlet Code'] || '', outletName, outletTarget: n(fd.get('outletTarget')), targetedSkuCount: n(fd.get('targetSkuCount')) || selectedPlanningSkus.length, targetSkus: selectedPlanningSkus, skuSalesPlan: 0 });
      if (!r?.ok) throw new Error(r?.error || 'Plan save failed');
      await loadCurrent({ quiet: true });
      toast('Monthly plan saved');
      render();
    } catch (err) { toast(err.message, 3500); } finally { setBusy(false); }
  };
  refreshSku();
}

/* =========================================================
   INCENTIVES
========================================================= */

let incentiveSelectedSkus = [];
let editingIncentiveId = null;

function incentiveCard(x) {
  const v = n(x.percent);
  const skuText = Array.isArray(x.selectedSkus) && x.selectedSkus.length
    ? (x.selectedSkus.length === 1 ? x.selectedSkus[0] : `${x.selectedSkus.length} SKUs • ${x.groupName || 'Combo / Series'}`)
    : (x.metric === 'SALES_RM' ? 'Total Sales' : x.metric === 'OUTLETS' ? 'Outlet Coverage' : 'No SKU');

  const perSku = x.perSku && typeof x.perSku === 'object'
    ? Object.entries(x.perSku).sort((a,b)=>b[1]-a[1])
    : [];

  return `<div class="card">
    <div class="row">
      <div>
        <span class="pill ${x.fulfilled ? 'green' : 'orange'}">${esc(String(x.category || 'INCENTIVE').toUpperCase())}</span>
        <h3 style="margin:9px 0 5px">${esc(x.name || 'Incentive')}</h3>
        <p class="muted">${esc(x.description || '')}</p>
      </div>
      <div style="text-align:right"><strong>${money(x.rewardRM)}</strong><p class="muted">reward</p></div>
    </div>
    <div class="status-strip"><span class="status-chip">${esc(skuText)}</span><span class="status-chip">${esc(String(x.metric || ''))}</span>${x.calculationRule === 'EACH_MIN' ? `<span class="status-chip">Each SKU ≥ ${n(x.eachSkuMinimum)}</span>` : ''}</div>
    <div style="margin-top:12px">${progressBar(v)}</div>
    <div class="row" style="margin-top:8px"><small class="muted">Progress</small><strong>${n(x.actual)} / ${n(x.target)}</strong></div>
    <p class="muted" style="margin:8px 0 0">${x.fulfilled ? '✓ Fulfilled • Earned ' + money(x.earnedRM) : n(x.remaining) + ' remaining'} • ${dateLabel(x.startDate)} → ${x.endDate ? dateLabel(x.endDate) : 'Open end'}</p>
    ${perSku.length > 1 ? `<details style="margin-top:10px"><summary class="muted">SKU breakdown</summary><div class="list" style="margin-top:8px">${perSku.map(([sku,val])=>`<div class="list-item"><div class="row"><span>${esc(sku)}</span><strong>${n(val)}</strong></div></div>`).join('')}</div></details>` : ''}
    <div class="form-actions">${x.bannerFileId ? `<button class="btn secondary" data-banner="${esc(x.bannerFileId)}">VIEW BANNER</button>` : ''}${isManagerMode() ? `<button class="btn secondary" data-editinc="${esc(x.id)}">EDIT INCENTIVE</button>` : ''}</div>
  </div>`;
}

function incentiveSkuPicker() {
  const all = allSkuNames();
  return `<div id="incSkuArea">
    <label>Search SKU<input id="incSkuSearch" placeholder="Type product name"></label>
    <div id="incSkuResults" class="search-results" style="margin-top:8px;max-height:260px"></div>
    <div id="incSkuChips" class="chipbox" style="margin-top:10px"></div>
    <p class="muted" style="font-size:11px;margin:8px 0 0">Selected: <b id="incSkuCount">0</b> SKU(s) from ${all.length} master products</p>
  </div>`;
}

function renderIncentives() {
  const list = current?.incentives || [];
  const edit = editingIncentiveId ? list.find(x => x.id === editingIncentiveId) : null;
  incentiveSelectedSkus = edit?.selectedSkus ? [...edit.selectedSkus] : [];

  const managerForm = isManagerMode() ? `<div class="card" style="margin-bottom:12px">
    <p class="eyebrow">MANAGER MASTER INCENTIVE</p><h2>${edit ? 'Update Incentive' : 'Create Incentive'}</h2>
    <form id="incForm" class="stack">
      <label>Incentive Name<input name="name" required placeholder="e.g. Value Pack Combo Incentive" value="${esc(edit?.name || '')}"></label>
      <label>Description<textarea name="description" placeholder="Simple instruction for SR">${esc(edit?.description || '')}</textarea></label>
      <div class="form-grid">
        <label>Category<select name="category"><option value="PRODUCT" ${edit?.category==='PRODUCT'?'selected':''}>Product</option><option value="INDIVIDUAL" ${edit?.category==='INDIVIDUAL'?'selected':''}>Individual</option><option value="GROWTH" ${edit?.category==='GROWTH'?'selected':''}>Growth</option><option value="OTHER" ${edit?.category==='OTHER'?'selected':''}>Other</option></select></label>
        <label>Incentive Basis<select name="basis" id="incBasis"><option value="SINGLE_SKU" ${(edit?.basis||'SINGLE_SKU')==='SINGLE_SKU'?'selected':''}>Single SKU</option><option value="MULTI_SKU" ${edit?.basis==='MULTI_SKU'?'selected':''}>Multiple SKU / Combo / Series</option><option value="TOTAL_SALES" ${edit?.basis==='TOTAL_SALES'?'selected':''}>Total Sales RM</option><option value="OUTLET_COVERAGE" ${edit?.basis==='OUTLET_COVERAGE'?'selected':''}>Outlet Coverage</option></select></label>
      </div>
      <div id="incProductControls">
        <div class="form-grid">
          <label>Metric<select name="metric" id="incMetric"><option value="CARTONS" ${(edit?.metric||'CARTONS')==='CARTONS'?'selected':''}>Cartons</option><option value="SKU_SALES_RM" ${edit?.metric==='SKU_SALES_RM'?'selected':''}>SKU Sales RM</option></select></label>
          <label id="incGroupWrap" style="display:none">Group / Series Name<input name="groupName" placeholder="e.g. Mr. Noodles Series" value="${esc(edit?.groupName || '')}"></label>
        </div>
        ${incentiveSkuPicker()}
        <div id="incRuleWrap" style="display:none;margin-top:12px" class="form-grid">
          <label>Calculation Rule<select name="calculationRule" id="incRule"><option value="COMBINED" ${(edit?.calculationRule||'COMBINED')==='COMBINED'?'selected':''}>Combined Total</option><option value="EACH_MIN" ${edit?.calculationRule==='EACH_MIN'?'selected':''}>Combined Total + Each SKU Minimum</option></select></label>
          <label id="incEachMinWrap" style="display:none">Each SKU Minimum<input name="eachSkuMinimum" type="number" min="0" step="0.01" value="${n(edit?.eachSkuMinimum)}"></label>
        </div>
      </div>
      <div class="form-grid"><label>Target<input name="target" type="number" min="0.01" step="0.01" value="${edit ? n(edit.target) : ''}" required></label><label>Reward RM<input name="reward" type="number" min="0" step="0.01" value="${edit ? n(edit.rewardRM) : ''}" required></label></div>
      <div class="form-grid"><label>Start Date<input name="startDate" type="date" value="${edit?.startDate || selectedMonth + '-01'}" required></label><label>End Date<input name="endDate" type="date" value="${edit?.endDate || ''}"></label></div>
      <label>Assign To<select name="scope" id="incScope"><option value="SPECIFIC" ${(edit?.scope||'SPECIFIC')==='SPECIFIC'?'selected':''}>Selected SR</option><option value="ALL" ${edit?.scope==='ALL'?'selected':''}>All SR</option></select></label>
      <label id="incStaffWrap">Selected SR<select name="staffId">${teamUsers().map(u=>`<option value="${u.id}" ${u.id===(edit?.assignedStaff?.[0] || managerView)?'selected':''}>${esc(u.name)} • ${u.id}</option>`).join('')}</select></label>
      <label>Banner / Image (optional, max 3 MB)<input name="banner" type="file" accept="image/*"></label>
      <button class="btn primary big-action">${edit ? 'UPDATE INCENTIVE' : 'CREATE INCENTIVE'}</button>${edit ? '<button type="button" id="cancelIncEdit" class="btn secondary">CANCEL EDIT</button>' : ''}
    </form>
  </div>` : '';

  $('#mainContent').innerHTML = `${monthBar()}${managerForm}<section class="hero"><p class="eyebrow">INCENTIVE CENTER</p><h3>${esc(viewedName())}</h3><p class="muted">Single SKU, combo/series, total sales and outlet coverage incentives are calculated from live Google Sheet sales.</p></section><div class="list" style="margin-top:12px">${list.length ? list.map(incentiveCard).join('') : empty('No active incentive for this month.')}</div>${!isManagerMode() ? personalTargetsSection() : ''}`;
  bindCommon();
  $$('[data-banner]').forEach(b => b.onclick = () => downloadCloudFile('downloadBanner', b.dataset.banner, true));
  $$('[data-editinc]').forEach(b => b.onclick = () => { editingIncentiveId = b.dataset.editinc; renderIncentives(); window.scrollTo({top:0,behavior:'smooth'}); });
  if ($('#cancelIncEdit')) $('#cancelIncEdit').onclick = () => { editingIncentiveId = null; renderIncentives(); };

  const scope = $('#incScope');
  if (scope) { scope.onchange = () => { $('#incStaffWrap').style.display = scope.value === 'ALL' ? 'none' : ''; }; scope.onchange(); }

  const basis = $('#incBasis'), metric = $('#incMetric'), search = $('#incSkuSearch'), results = $('#incSkuResults'), chips = $('#incSkuChips');
  const paintPicker = () => {
    if (!results || !chips) return;
    const q = String(search?.value || '').trim().toLowerCase();
    const all = allSkuNames().filter(x => !incentiveSelectedSkus.includes(x) && (!q || x.toLowerCase().includes(q))).slice(0,80);
    results.innerHTML = all.length ? all.map(x=>`<button type="button" class="search-result" data-addincsku="${esc(x)}" style="display:block;width:100%;text-align:left;background:transparent;color:inherit;border:0">＋ ${esc(x)}</button>`).join('') : empty('No matching SKU');
    chips.innerHTML = incentiveSelectedSkus.map(x=>`<span class="chip">${esc(x)}<button type="button" data-rmincsku="${esc(x)}">×</button></span>`).join('');
    if ($('#incSkuCount')) $('#incSkuCount').textContent = String(incentiveSelectedSkus.length);
    $$('[data-addincsku]').forEach(b=>b.onclick=()=>{ const max = basis?.value === 'SINGLE_SKU' ? 1 : 100; if(incentiveSelectedSkus.length>=max){ if(max===1) incentiveSelectedSkus=[]; else return; } incentiveSelectedSkus.push(b.dataset.addincsku); paintPicker(); });
    $$('[data-rmincsku]').forEach(b=>b.onclick=()=>{ incentiveSelectedSkus=incentiveSelectedSkus.filter(x=>x!==b.dataset.rmincsku); paintPicker(); });
  };
  const syncBasis = () => {
    if (!basis) return;
    const product = ['SINGLE_SKU','MULTI_SKU'].includes(basis.value);
    if ($('#incProductControls')) $('#incProductControls').style.display = product ? '' : 'none';
    if ($('#incGroupWrap')) $('#incGroupWrap').style.display = basis.value === 'MULTI_SKU' ? '' : 'none';
    if ($('#incRuleWrap')) $('#incRuleWrap').style.display = basis.value === 'MULTI_SKU' ? '' : 'none';
    if (basis.value === 'TOTAL_SALES') { if(metric) metric.value='SALES_RM'; }
    if (basis.value === 'OUTLET_COVERAGE') { if(metric) metric.value='OUTLETS'; }
    if (basis.value === 'SINGLE_SKU' && incentiveSelectedSkus.length > 1) incentiveSelectedSkus = incentiveSelectedSkus.slice(0,1);
    paintPicker();
  };
  if (basis) basis.onchange = syncBasis;
  if (search) search.oninput = paintPicker;
  if ($('#incRule')) { $('#incRule').onchange = e => { $('#incEachMinWrap').style.display = e.target.value === 'EACH_MIN' ? '' : 'none'; }; $('#incRule').onchange({target:$('#incRule')}); }
  syncBasis();

  if ($('#incForm')) $('#incForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), b = String(fd.get('basis') || 'SINGLE_SKU');
    let metricValue = String(fd.get('metric') || 'CARTONS');
    if (b === 'TOTAL_SALES') metricValue = 'SALES_RM';
    if (b === 'OUTLET_COVERAGE') metricValue = 'OUTLETS';
    if (b === 'SINGLE_SKU' && incentiveSelectedSkus.length !== 1) return toast('Please select exactly 1 SKU');
    if (b === 'MULTI_SKU' && incentiveSelectedSkus.length < 2) return toast('Please select at least 2 SKUs for combo / series');

    const file = fd.get('banner');
    setBusy(true, 'Creating incentive…');
    try {
      let bannerBase64='', bannerFileName='', bannerMimeType='';
      if (file instanceof File && file.size) {
        if (file.size > 3*1024*1024) throw new Error('Banner must be under 3 MB');
        bannerBase64 = await fileToBase64(file); bannerFileName=file.name; bannerMimeType=file.type;
      }
      const scopeValue=String(fd.get('scope'));
      const r=await apiPost('createIncentive',{
        incentiveId: editingIncentiveId || '',
        name:String(fd.get('name')||''), description:String(fd.get('description')||''), category:String(fd.get('category')||'PRODUCT'),
        basis:b, metric:metricValue, selectedSkus:[...incentiveSelectedSkus], groupName:String(fd.get('groupName')||''),
        calculationRule:String(fd.get('calculationRule')||'COMBINED'), eachSkuMinimum:n(fd.get('eachSkuMinimum')),
        targetValue:n(fd.get('target')), rewardRM:n(fd.get('reward')), startDate:String(fd.get('startDate')||''), endDate:String(fd.get('endDate')||''),
        scope:scopeValue, assignedStaff:scopeValue==='ALL'?[]:[String(fd.get('staffId')||managerView)],
        bannerBase64,bannerFileName,bannerMimeType
      });
      if(!r?.ok) throw new Error(r?.error||'Incentive save failed');
      const selectedStaff = scopeValue==='ALL' ? managerView : String(fd.get('staffId')||managerView);
      if (scopeValue !== 'ALL') { managerView = selectedStaff; session.managerView = managerView; saveSession(); }
      editingIncentiveId = null; await loadCurrent({quiet:true}); toast(edit ? 'Incentive updated' : 'Incentive created'); render();
    } catch(err){ toast(err.message,4000); } finally { setBusy(false); }
  };

  bindPersonalTargetForm();
}

function personalTargetsSection() {
  const list = current?.personalTargets || [];
  return `<div class="section-title"><h3>My Additional / Personal Target</h3></div><div class="card"><form id="personalTargetForm" class="stack"><label>Target Name<input name="name" required placeholder="e.g. My Extra Mango Target"></label><label>Description<textarea name="description"></textarea></label><label>SKU (optional)<select name="skuName"><option value="">No specific SKU</option>${allSkuNames().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><div class="form-grid"><label>Metric<select name="metric"><option value="SALES_RM">Total Sales RM</option><option value="CARTONS">Cartons</option><option value="SKU_SALES_RM">SKU Sales RM</option></select></label><label>Target<input name="targetValue" type="number" min="0" step="0.01" required></label></div><div class="form-grid"><label>Start Date<input name="startDate" type="date" value="${selectedMonth + '-01'}"></label><label>End Date<input name="endDate" type="date"></label></div><button class="btn secondary">SAVE PERSONAL TARGET</button></form></div><div class="list" style="margin-top:12px">${list.length?list.map(t=>{const p=personalTargetProgress(t);return `<div class="list-item"><div class="row"><div><h4>${esc(t.Name)}</h4><p>${esc(t.Description||'')}</p></div><span class="pill ${p.actual>=p.target&&p.target?'green':'orange'}">${p.actual.toFixed(1)} / ${p.target.toFixed(1)}</span></div>${progressBar(p.percent)}<p style="margin-top:7px">${p.remaining.toFixed(1)} remaining</p></div>`}).join(''):empty('No personal target yet.')}</div>`;
}

function bindPersonalTargetForm() {
  const form=$('#personalTargetForm'); if(!form)return;
  form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);setBusy(true,'Saving personal target…');try{const r=await apiPost('savePersonalTarget',{month:selectedMonth,name:String(fd.get('name')||''),description:String(fd.get('description')||''),category:'PERSONAL',skuName:String(fd.get('skuName')||''),metric:String(fd.get('metric')||'SALES_RM'),targetValue:n(fd.get('targetValue')),startDate:String(fd.get('startDate')||''),endDate:String(fd.get('endDate')||'')});if(!r?.ok)throw new Error(r?.error||'Save failed');await loadCurrent({quiet:true});toast('Personal target saved');render()}catch(err){toast(err.message,3500)}finally{setBusy(false)}};
}

/* =========================================================
   PENALTIES
========================================================= */

function renderPenalties() {
  const list = current?.penalties || [];
  const form = isManagerMode() ? `<div class="card"><p class="eyebrow">MANAGER / HR</p><h2>Add Penalty</h2><form id="penaltyForm" class="stack"><label>Assigned SR<select name="staffId">${teamUsers().map(u => `<option value="${u.id}" ${u.id === managerView ? 'selected' : ''}>${esc(u.name)} • ${u.id}</option>`).join('')}</select></label><div class="form-grid"><label>Date<input name="date" type="date" value="${selectedDate}" required></label><label>Type<select name="type"><option>Late attendance</option><option>Poor display</option><option>Product unavailable</option><option>Other company penalty</option></select></label></div><label>Reason<input name="reason" required></label><label>Description<textarea name="description"></textarea></label><label>Amount RM<input name="amount" type="number" min="0" step="0.01" required></label><button class="btn danger">ADD PENALTY</button></form></div>` : '';
  $('#mainContent').innerHTML = `${monthBar()}${form}<div class="section-title"><h3>Penalty History</h3></div><div class="list">${list.length ? list.map(x => `<div class="list-item"><div class="row"><div><h4>${esc(x.Reason || x.Type || 'Penalty')}</h4><p>${dateLabel(x.Date)} • ${esc(x.Type || '')}${x.Description ? '<br>' + esc(x.Description) : ''}</p></div><div style="text-align:right"><strong class="bad">-${money(x.Amount)}</strong><br><span class="pill ${activePenalty(x) ? 'red' : ''}">${esc(x.Status || 'ACTIVE')}</span></div></div>${isManagerMode() && activePenalty(x) ? `<button class="btn secondary" data-voidpen="${esc(x['Penalty ID'])}" style="margin-top:8px">VOID PENALTY</button>` : ''}</div>`).join('') : empty('No penalty record for this month.')}</div>`;
  bindCommon();
  if ($('#penaltyForm')) $('#penaltyForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    setBusy(true, 'Saving penalty…');
    try {
      const r = await apiPost('savePenalty', { staffId: String(fd.get('staffId')), date: String(fd.get('date')), type: String(fd.get('type')), reason: String(fd.get('reason')), description: String(fd.get('description') || ''), amount: n(fd.get('amount')) });
      if (!r?.ok) throw new Error(r?.error || 'Penalty failed');
      managerView = String(fd.get('staffId')); await loadCurrent({ quiet: true }); toast('Penalty added'); render();
    } catch (err) { toast(err.message, 3500); } finally { setBusy(false); }
  };
  $$('[data-voidpen]').forEach(b => b.onclick = async () => {
    if (!confirm('Void this penalty?')) return;
    const r = await apiPost('voidPenalty', { penaltyId: b.dataset.voidpen });
    if (r?.ok) { await loadCurrent({ quiet: true }); toast('Penalty voided'); render(); } else toast(r?.error || 'Failed');
  });
}

/* =========================================================
   INCOME
========================================================= */

function incomeRow(label, value, cls = '') { return `<div class="row" style="padding:9px 0"><span class="muted">${esc(label)}</span><strong class="${cls}">${money(value)}</strong></div>`; }
function renderIncome() {
  const x = current?.incomeSummary || {};
  $('#mainContent').innerHTML = `${monthBar()}<section class="hero"><p class="eyebrow">FINAL MONTHLY INCOME</p><div class="salary-total">${money(x.finalIncome)}</div><p class="muted">Automatically calculated from sales, incentive and penalty.</p></section><div class="card" style="margin-top:12px">${incomeRow('Basic Salary', x.baseSalary)}${incomeRow('Fuel / Oil', x.fuel)}${incomeRow('House Rent', x.houseRent)}${incomeRow('Food Allowance', x.food)}${incomeRow('Sales Commission', x.salesCommission)}${incomeRow('Zero Sales Incentive', x.zeroSalesIncentive, 'good')}${incomeRow('Product Incentive', x.productIncentive, 'good')}${incomeRow('Other Incentive', x.otherIncentive, 'good')}${incomeRow('Individual Incentive', x.individualIncentive, 'good')}<hr style="border:0;border-top:1px solid var(--line)">${incomeRow('TOTAL INCENTIVE', x.totalIncentive, 'good')}${incomeRow('PENALTY', -n(x.penalty), 'bad')}<hr style="border:0;border-top:1px solid var(--line)">${incomeRow('FINAL SALARY / INCOME', x.finalIncome)}</div><div class="mini-grid" style="margin-top:12px"><button class="btn secondary" data-go="incentives">🏆 INCENTIVE DETAILS</button><button class="btn secondary" data-go="penalties">− PENALTY HISTORY</button></div>`;
  bindCommon();
}

/* =========================================================
   TASKS
========================================================= */

function renderTasks() {
  const tasks = (current?.tasks || []).slice().sort((a, b) => String(b['Created At'] || '').localeCompare(String(a['Created At'] || '')));
  const form = isManagerMode() ? `<div class="card"><p class="eyebrow">MANAGER TASK</p><form id="taskForm" class="stack"><label>Assign To<select name="staffId">${teamUsers().map(u => `<option value="${u.id}" ${u.id === managerView ? 'selected' : ''}>${esc(u.name)} • ${u.id}</option>`).join('')}</select></label><div class="form-grid"><label>Source<select name="source"><option>MD</option><option>HOS</option><option selected>OWN</option><option>BUYER</option><option>DIC</option><option>OTHERS</option></select></label><label>Priority<select name="priority"><option>CRITICAL</option><option>HIGH</option><option selected>NORMAL</option></select></label></div><label>Task Title<input name="title" required></label><label>Instruction<textarea name="instruction" required></textarea></label><div class="form-grid"><label>Due Date<input name="due" type="date"></label><label>Due Time<input name="dueTime" type="time"></label></div><button class="btn primary">SAVE IMPORTANT WORK</button></form></div>` : '';
  $('#mainContent').innerHTML = `${monthBar()}${form}<div class="section-title"><h3>Complete Task History</h3></div><div class="list">${tasks.length ? tasks.map(t => `<div class="list-item"><div class="row"><div><h4>${esc(t.Title || '')}</h4><p>${esc(t.Instruction || '')}<br>Created: ${esc(String(t['Created At'] || ''))}${t['Due Date'] ? ' • Due: ' + dateLabel(t['Due Date']) : ''}${t['Completed At'] ? '<br>Completed: ' + esc(String(t['Completed At'])) : ''}</p></div><span class="pill ${taskDone(t) ? 'green' : 'red'}">${taskDone(t) ? 'DONE' : 'PENDING'}</span></div>${!isManagerMode() && !taskDone(t) ? `<button class="btn secondary" data-taskdone="${esc(t['Task ID'])}" data-tasktitle="${esc(t.Title || '')}" style="margin-top:8px">MARK COMPLETE</button>` : ''}</div>`).join('') : empty('No task history yet.')}</div>`;
  bindCommon();
  if ($('#taskForm')) $('#taskForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    setBusy(true, 'Sending task…');
    try { const r = await apiPost('saveTask', { staffId: String(fd.get('staffId')), title: String(fd.get('title')), instruction: String(fd.get('instruction')), due: String(fd.get('due') || ''), dueTime:String(fd.get('dueTime')||''), source:String(fd.get('source')||'OWN'), priority:String(fd.get('priority')||'NORMAL') }); if (!r?.ok) throw new Error(r?.error || 'Task failed'); managerView = String(fd.get('staffId')); await loadCurrent({ quiet: true }); toast('Task sent'); render(); } catch (err) { toast(err.message, 3500); } finally { setBusy(false); }
  };
  $$('[data-taskdone]').forEach(b => b.onclick = async () => {
    setBusy(true, 'Completing task…');
    try { const r = await apiPost('completeTask', { taskId: b.dataset.taskdone, title: b.dataset.tasktitle }); if (!r?.ok) throw new Error(r?.error || 'Failed'); await loadCurrent({ quiet: true }); toast('Task completed'); render(); } catch (err) { toast(err.message, 3500); } finally { setBusy(false); }
  });
}

/* =========================================================
   OPPORTUNITY ENGINE
========================================================= */

function renderOpportunity() {
  const data = current?.opportunity || [];
  $('#mainContent').innerHTML = `${monthBar()}<section class="hero"><p class="eyebrow">OPPORTUNITY ENGINE</p><h3>Where should I push next?</h3><p class="muted">Single SKU and combo/series incentives are analysed outlet by outlet.</p></section><div class="list" style="margin-top:12px">${data.length ? data.map(i => `<div class="card"><div class="row"><div><h3>${esc(i.name)}</h3><p class="muted">${esc(i.groupName || (i.selectedSkus||[]).join(', '))} • ${n(i.actual)} / ${n(i.target)} • ${n(i.remaining)} remaining</p></div><strong>${money(i.rewardRM)}</strong></div>${progressBar(i.target ? i.actual / i.target * 100 : 0)}<div class="status-strip"><span class="status-chip">${(i.selectedSkus||[]).length} SKU(s)</span><span class="status-chip">${esc(i.metric||'')}</span></div><div class="list" style="margin-top:12px">${(i.outlets || []).slice(0, 80).map(o => `<div class="list-item"><div class="row"><div><h4>${esc(o.outletName)}</h4><p>${n(o.value ?? o.cartons)} ${i.metric==='CARTONS'?'CTN':''} • ${esc(o.category || '')}</p></div><span class="pill ${o.status === 'HIGH_OPPORTUNITY' ? 'red' : o.status === 'OPPORTUNITY' ? 'orange' : 'green'}">${o.status === 'HIGH_OPPORTUNITY' ? '🔴 HIGH' : o.status === 'OPPORTUNITY' ? '🟠 OPPORTUNITY' : '🟢 PERFORMING'}</span></div></div>`).join('')}</div></div>`).join('') : empty('Opportunity Engine becomes active when a product/combination incentive is running.')}</div>`;
  bindCommon();
}

/* =========================================================
   ACTIVITY TIMELINE
========================================================= */

function renderActivity() {
  const list = current?.activity || [];
  $('#mainContent').innerHTML = `${monthBar()}<section class="hero"><p class="eyebrow">PROOF / HISTORY</p><h3>Activity Timeline</h3><p class="muted">Sales, tasks, incentive, penalty and important records with date/time.</p></section><div class="notification-list">${list.length ? list.map(x => `<div class="notification-item"><div class="notification-icon">${activityIcon(x.Type)}</div><div style="flex:1"><div class="row"><h4>${esc(x.Title || x.Type || 'Activity')}</h4>${n(x.Amount) ? `<strong class="${n(x.Amount) < 0 ? 'bad' : 'good'}">${n(x.Amount) < 0 ? '-' : ''}${money(Math.abs(n(x.Amount)))}</strong>` : ''}</div><p>${esc(x.Description || '')}<br>${esc(String(x.Timestamp || x.Date || ''))}</p></div></div>`).join('') : empty('No activity record for this month.')}</div>`;
  bindCommon();
}
function activityIcon(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('TASK')) return '✅';
  if (t.includes('PENALTY')) return '−';
  if (t.includes('INCENTIVE')) return '🏆';
  if (t.includes('SKU')) return '📦';
  if (t.includes('OUTLET')) return '🏪';
  if (t.includes('SALE')) return 'RM';
  if (t.includes('PROPOSAL')) return '▤';
  return '•';
}

/* =========================================================
   PROPOSAL ORDER FORM
========================================================= */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || '').split(',').pop() || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function base64ToBlob(base64, mime) {
  const bytes = atob(base64), chunks = [];
  for (let i = 0; i < bytes.length; i += 1024) {
    const slice = bytes.slice(i, i + 1024), arr = new Uint8Array(slice.length);
    for (let j = 0; j < slice.length; j++) arr[j] = slice.charCodeAt(j);
    chunks.push(arr);
  }
  return new Blob(chunks, { type: mime || 'application/octet-stream' });
}

async function downloadCloudFile(action, fileId, preview = false) {
  if (!fileId) return toast('File missing');
  setBusy(true, 'Preparing file…');
  try {
    const r = await apiPost(action, { fileId });
    if (!r?.ok) throw new Error(r?.error || 'Download failed');
    const blob = base64ToBlob(r.base64, r.mimeType), url = URL.createObjectURL(blob);
    if (preview && String(r.mimeType || '').startsWith('image/')) window.open(url, '_blank', 'noopener');
    else { const a = document.createElement('a'); a.href = url; a.download = r.fileName || 'file'; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  } catch (e) { toast(e.message, 3500); } finally { setBusy(false); }
}

function proposalChains(){
 const fromOutlets=[...new Set((current?.outlets||[]).map(x=>String(x.Category||x.Chain||x['Outlet Category']||'').trim()).filter(Boolean))];
 const fallback=['KK Supermart','The Store','TF Value Mart','Aneka','NSK Grocer','Giant Hypermarket','Econsave','Jaya Grocer','Mydin','MR DIY','Other'];
 return [...new Set([...fromOutlets,...fallback])];
}
function renderProposal() {
  const list=current?.proposalForms||[], chains=proposalChains();
  const form=isManagerMode()?`<div class="card"><p class="eyebrow">MANAGER MASTER PDF</p><h2>Upload / Replace Proposal Form</h2><form id="poForm" class="stack"><label>Chain<select name="chain" required>${chains.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label><label>PDF (max 6 MB)<input name="file" type="file" accept="application/pdf,.pdf" required></label><label>Note<textarea name="note"></textarea></label><button class="btn primary">UPLOAD / REPLACE CURRENT PDF</button></form><p class="muted">Replacing keeps the previous version in backend history.</p></div>`:'';
  $('#mainContent').innerHTML=`${monthBar()}${form}<section class="hero" style="margin-top:${form?'12px':'0'}"><p class="eyebrow">CHAIN-WISE PROPOSAL MASTER</p><h3>Current Proposal Forms</h3><p class="muted">One current PDF per chain. Manager controls replacement.</p></section><div class="list" style="margin-top:12px">${chains.map((c,i)=>{const f=list.find(x=>String(x.chain||x.title).toLowerCase()===c.toLowerCase());return `<div class="list-item" style="border-left:4px solid hsl(${(i*47)%360} 70% 50%)"><div class="row"><div><h4>${esc(c)}</h4><p>${f?`PDF Available • Version ${n(f.version)||1}`:'Not Uploaded'}${f?.uploadedAt?'<br>'+esc(String(f.uploadedAt)):''}</p></div>${f?`<button class="btn secondary" data-podownload="${esc(f.fileId)}">DOWNLOAD PDF</button>`:'<span class="pill red">NO PDF</span>'}</div></div>`}).join('')}</div>`;
  bindCommon(); $$('[data-podownload]').forEach(b=>b.onclick=()=>downloadCloudFile('downloadProposal',b.dataset.podownload));
  if($('#poForm')) $('#poForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),file=fd.get('file');if(!(file instanceof File)||!file.size)return toast('Choose PDF');if(file.size>6*1024*1024)return toast('PDF must be under 6 MB');setBusy(true,'Uploading / replacing proposal PDF…');try{const base64=await fileToBase64(file),chain=String(fd.get('chain')),r=await apiPost('uploadProposal',{chain,title:chain,note:String(fd.get('note')||''),fileName:file.name,mimeType:file.type||'application/pdf',base64});if(!r?.ok)throw new Error(r?.error||'Upload failed');await loadCurrent({quiet:true});toast(r.replaced?'Proposal replaced — history preserved':'Proposal uploaded');render()}catch(x){toast(x.message,4500)}finally{setBusy(false)}};
}

/* =========================================================
   SUMMARY / DAY FILTER / EXCEL
========================================================= */

function renderSummary() {
  const p = current?.performance || {}, d = selectedDayData(), inc = current?.incomeSummary || {};
  $('#mainContent').innerHTML = `${monthBar()}<div class="card" style="margin-bottom:12px">${dateFilter('Specific Day')}</div><section class="hero"><p class="eyebrow">COMPLETE DATABASE SUMMARY</p><h3>${esc(viewedName())}</h3><p class="muted">${monthName(selectedMonth)} • Day view: ${dateLabel(selectedDate)}</p>${syncStatus()}<div class="form-actions"><button id="summaryRefresh" class="btn secondary">↻ REFRESH LIVE</button><button id="xlsx" class="btn primary">DOWNLOAD EXCEL</button></div></section><div class="grid kpi-grid">${kpi('TARGET', money(p.target), 'Month')}${kpi('MTD SALES', money(p.achievement), pct(p.percent))}${kpi('DAY SALES', money((d.daily || []).reduce((a, x) => a + n(x['Today Sales']), 0)), dateLabel(selectedDate))}${kpi('SHORTFALL', money(p.shortfall), 'Remaining')}${kpi('COVERAGE', pct(p.coverage), `${n(p.coveredOutlets)}/${n(p.routeOutlets)}`)}${kpi('FINAL INCOME', money(inc.finalIncome), 'After penalty')}${kpi('LAST MONTH SAME DAY', money(current?.comparisons?.lastMonthSameDay), current?.comparisons?.lastMonthDate ? dateLabel(current.comparisons.lastMonthDate) : '—')}${kpi('LAST YEAR SAME DAY', money(current?.comparisons?.lastYearSameDay), current?.comparisons?.lastYearDate ? dateLabel(current.comparisons.lastYearDate) : '—')}</div>${table('Day-by-Day Sales', ['Date', 'Sales', 'Last Month', 'Active', 'PPR', 'Order'], (current?.daily || []).map(x => [String(x.Date).slice(0,10), money(x['Today Sales']), money(x['Last Month Same Day']), money(x.Active), money(x['Prepare for Trip']), money(x['Order Amount'])]))}${table('Outlet Sales', ['Date', 'Outlet', 'Sales', 'Note'], (current?.outletSales || []).map(x => [String(x.Date).slice(0,10), x['Outlet Name'], money(x['Sales Value']), x.Note || '']))}${table('SKU Sales', ['Date', 'Outlet', 'SKU', 'Cartons', 'Value'], (current?.skuSales || []).map(x => [String(x.Date).slice(0,10), x['Outlet Name'], x['SKU Name'], String(n(x.Cartons)), money(x['Sales Value'])]))}${table('Selected Day Outlet Sales', ['Outlet', 'Sales'], (d.outletSales || []).map(x => [x['Outlet Name'], money(x['Sales Value'])]))}${table('Selected Day SKU Sales', ['Outlet', 'SKU', 'Cartons', 'Value'], (d.skuSales || []).map(x => [x['Outlet Name'], x['SKU Name'], String(n(x.Cartons)), money(x['Sales Value'])]))}`;
  bindCommon();
  $('#summaryRefresh').onclick = () => refreshCloud(true);
  $('#xlsx').onclick = exportXlsx;
}

async function loadXlsx() {
  if (window.XLSX) return true;
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false); document.head.appendChild(s);
  });
}
async function exportXlsx() {
  if (!(await loadXlsx())) return toast('Excel library unavailable');
  const wb = XLSX.utils.book_new();
  const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'No data' }]), name.slice(0, 31));
  add('Summary', [{ Month: selectedMonth, Date: selectedDate, 'Staff ID': viewedId(), Salesman: viewedName(), Target: current?.performance?.target || 0, Achievement: current?.performance?.achievement || 0, Shortfall: current?.performance?.shortfall || 0, Coverage: current?.performance?.coverage || 0, 'Final Income': current?.incomeSummary?.finalIncome || 0 }]);
  add('Daily', (current?.daily || []).map(x => ({ Date: x.Date, Sales: x['Today Sales'], 'Last Month': x['Last Month Same Day'], Active: x.Active, PPR: x['Prepare for Trip'], Order: x['Order Amount'], Note: x.Note })));
  add('Outlet Sales', (current?.outletSales || []).map(x => ({ Date: x.Date, Code: x['Outlet Code'], Outlet: x['Outlet Name'], Sales: x['Sales Value'], Note: x.Note })));
  add('SKU Sales', (current?.skuSales || []).map(x => ({ Date: x.Date, Outlet: x['Outlet Name'], SKU: x['SKU Name'], Cartons: x.Cartons, Value: x['Sales Value'] })));
  add('Tasks', (current?.tasks || []).map(x => ({ 'Task ID': x['Task ID'], Created: x['Created At'], Due: x['Due Date'], Title: x.Title, Instruction: x.Instruction, Status: x.Status, Completed: x['Completed At'] })));
  add('Incentives', (current?.incentives || []).map(x => ({ Name: x.name, Category: x.category, SKU: x.skuName, Metric: x.metric, Target: x.target, Actual: x.actual, Remaining: x.remaining, Reward: x.rewardRM, Earned: x.earnedRM, Fulfilled: x.fulfilled })));
  add('Penalties', (current?.penalties || []).map(x => ({ Date: x.Date, Type: x.Type, Reason: x.Reason, Description: x.Description, Amount: x.Amount, Status: x.Status })));
  XLSX.writeFile(wb, `${viewedId()}_${selectedMonth}_Sales_Performance.xlsx`);
}

/* =========================================================
   MANAGER TEAM / ATTENTION
========================================================= */

function attentionScore(x) {
  return n(x.performance?.zeroOutlets) * 10 + (100 - Math.min(100, n(x.performance?.percent))) + n(x.pendingTasks) * 5;
}
function renderTeam() {
  if (!isManager()) { page = 'dashboard'; return render(); }
  const sorted = teamSnapshot.slice().sort((a, b) => attentionScore(b) - attentionScore(a));
  $('#mainContent').innerHTML = `${monthBar({ showManager: false })}<div class="card" style="margin-bottom:12px">${dateFilter('Snapshot Date')}</div><section class="hero"><p class="eyebrow">MANAGER LIVE DATABASE</p><h3>Team Control Center</h3><p class="muted">Every SR database is separate and loaded from Google Sheets.</p>${syncStatus()}<button id="teamRefresh" class="btn primary" style="margin-top:10px">↻ SYNC TEAM NOW</button></section><div class="section-title"><h3>Manager Attention Panel</h3></div><div class="list">${sorted.length ? sorted.map(x => { const p = x.performance || {}, f = x.forecast || {}; return `<div class="card"><div class="row"><div><h3 style="margin:0">${esc(x.name)}</h3><p class="muted" style="margin:5px 0 0">${esc(x.staffId)} • ${money(p.achievement)} / ${money(p.target)}</p></div><span class="pill ${p.percent >= 100 ? 'green' : p.percent >= 80 ? 'orange' : 'red'}">${pct(p.percent)}</span></div><div class="mini-grid" style="margin-top:10px"><div class="metric-box"><small>Today</small><br><b>${money(p.todaySales)}</b></div><div class="metric-box"><small>Shortfall</small><br><b>${money(p.shortfall)}</b></div><div class="metric-box"><small>Zero Outlet</small><br><b>${n(p.zeroOutlets)}</b></div><div class="metric-box"><small>Pending Task</small><br><b>${n(x.pendingTasks)}</b></div><div class="metric-box"><small>Coverage</small><br><b>${pct(p.coverage)}</b></div><div class="metric-box"><small>Forecast</small><br><b class="${f.onTrack ? 'good' : 'warn'}">${f.onTrack ? 'ON TRACK' : 'WATCH'}</b></div></div><div class="form-actions"><button class="btn secondary" data-openstaff="${esc(x.staffId)}" data-openpage="dashboard">OPEN DASHBOARD</button><button class="btn secondary" data-openstaff="${esc(x.staffId)}" data-openpage="summary">SEE DATABASE</button></div></div>`; }).join('') : empty('No team data loaded.')}</div>`;
  bindCommon();
  $('#teamRefresh').onclick = async () => { await loadTeam(); render(); };
  $$('[data-openstaff]').forEach(b => b.onclick = async () => {
    managerView = b.dataset.openstaff; session.managerView = managerView; saveSession();
    await loadCurrent(); page = b.dataset.openpage || 'summary'; render();
  });
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function updateNotificationBadge() {
  const badge = $('#notifBadge');
  if (!badge || !current) return;
  const count = alertsForCurrent().length;
  badge.textContent = String(count);
  badge.classList.toggle('hidden', !count);
}
function renderNotifications() {
  const a = alertsForCurrent();
  $('#mainContent').innerHTML = `${monthBar()}<section class="hero"><p class="eyebrow">NOTIFICATION CENTER</p><h3>Tasks, Targets & Incentives</h3><p class="muted">Only meaningful alerts are shown.</p></section><div class="notification-list">${a.length ? a.map(x => `<button class="notification-item" data-go="${x.page}" style="text-align:left;width:100%;color:inherit"><div class="notification-icon">${x.icon}</div><div><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p></div></button>`).join('') : empty('No active alert.')}</div><div class="card" style="margin-top:12px"><button id="enablePush" class="btn primary">ENABLE PHONE NOTIFICATIONS</button><button id="testPush" class="btn secondary" style="margin-top:8px">SEND TEST PUSH</button></div>`;
  bindCommon();
  $('#enablePush').onclick = async () => {
    try {
      if (oneSignalSdk) { await oneSignalSdk.Notifications.requestPermission(); await oneSignalSdk.login(session.id); toast('Notification permission updated'); }
      else if ('Notification' in window) toast('Permission: ' + await Notification.requestPermission());
      else toast('Notifications not supported');
    } catch { toast('Could not enable push'); }
  };
  $('#testPush').onclick = async () => { try { const r = await apiPost('testPush', {}); toast(r?.result?.ok ? 'Test push sent' : 'Push is not configured yet'); } catch (e) { toast(e.message); } };
}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  $('#mainContent').innerHTML = `${monthBar()}<section class="hero"><p class="eyebrow">SETTINGS</p><h3>Account & App</h3><p class="muted">This phone stays logged in until you press Logout.</p>${syncStatus()}</section><div class="card" style="margin-top:12px"><div class="list-item"><h4>Signed in</h4><p>${esc(sessionName())} • ${esc(session.id)} • ${esc(String(session.mode).toUpperCase())}</p></div><div class="list-item" style="margin-top:8px"><h4>Backend</h4><p>${backendUrl() ? 'Connected' : 'Missing'} • Server ${esc(current?.version || '—')}</p></div><button id="settingsSync" class="btn secondary" style="margin-top:12px;width:100%">↻ SYNC LIVE DATA NOW</button><button id="realLogout" class="btn danger" style="margin-top:10px;width:100%">LOG OUT</button></div><div class="card" style="margin-top:12px;text-align:center"><p class="muted" style="margin:0">Developed by <a href="https://mehedialimayon-del.github.io/MEHEDI-ALIM-AYON-PORTFOLIO/" target="_blank" rel="noopener" style="color:#ff7414;text-decoration:none;font-weight:900">KAM AYON</a></p></div>`;
  bindCommon();
  $('#settingsSync').onclick = () => refreshCloud(true);
  $('#realLogout').onclick = () => { if (confirm('Log out from Sales Performance Hub?')) logout(); };
}

/* =========================================================
   RENDER ROUTER
========================================================= */

function render() {
  if (!session) return;
  installShell(); refreshTop(); bindNav();
  const map = {
    dashboard: renderDashboard,
    execution: renderExecution,
    cpo: renderCpo,
    daily: renderDaily,
    planning: renderPlanning,
    income: renderIncome,
    summary: renderSummary,
    tasks: renderTasks,
    zero: renderZero,
    incentives: renderIncentives,
    penalties: renderPenalties,
    opportunity: renderOpportunity,
    activity: renderActivity,
    team: renderTeam,
    proposal: renderProposal,
    notifications: renderNotifications,
    settings: renderSettings
  };
  (map[page] || renderDashboard)();
  refreshTop(); bindNav();
}

/* =========================================================
   LIVE SYNC
========================================================= */

function startLiveSync() {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = setInterval(async () => {
    if (!session || document.hidden || !navigator.onLine || syncing) return;
    try {
      if (isManagerMode() && page === 'team') {
        await loadTeam({ quiet: true });
        render();
        return;
      }
      if (['dashboard','summary','zero','tasks','incentives','income','cpo','execution','notifications','opportunity'].includes(page)) {
        await loadCurrent({ quiet: true });
        render();
      }
    } catch (_) {}
  }, 45000);
}

document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && session && navigator.onLine && !syncing) {
    if (isManagerMode() && page === 'team') await loadTeam({ quiet: true });
    else await loadCurrent({ quiet: true });
    render();
  }
});
window.addEventListener('online', () => { toast('Back online • syncing…'); refreshCloud(false); });
window.addEventListener('offline', () => toast('Offline • live database unavailable'));

/* =========================================================
   ONESIGNAL
========================================================= */

async function initPushSystem() {
  if (!backendUrl() || !window.OneSignalDeferred) return;
  try {
    const r = await fetchJson(backendUrl() + '?action=publicConfig');
    const cfg = r?.data || {};
    pushConfig = { configured: !!cfg.pushConfigured, appId: String(cfg.oneSignalAppId || ''), ready: false };
    if (!pushConfig.appId) return;
    const path = location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/[^/]+$/, '');
    const workerPath = path.replace(/^\//, '') + 'push/onesignal/OneSignalSDKWorker.js';
    window.OneSignalDeferred.push(async OneSignal => {
      try {
        await OneSignal.init({ appId: pushConfig.appId, serviceWorkerPath: workerPath, serviceWorkerParam: { scope: path + 'push/onesignal/' } });
        oneSignalSdk = OneSignal; pushConfig.ready = true; if (session) await OneSignal.login(session.id);
      } catch (e) { console.warn('OneSignal', e); }
    });
  } catch (e) { console.warn('Push config', e); }
}

/* =========================================================
   STARTUP
========================================================= */

if ($('#loginForm')) $('#loginForm').onsubmit = e => { e.preventDefault(); login($('#loginUser').value, $('#loginPin').value); };
if ($('#notifBtn')) $('#notifBtn').onclick = () => { page = 'notifications'; render(); };

async function forceServiceWorkerUpdate() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    regs.forEach(r => r.update().catch(() => {}));
  } catch {}
}

(async function start() {
  const pref = getPref();
  selectedMonth = pref.month || localDate().slice(0, 7);
  selectedDate = pref.date || localDate();
  if (!selectedDate.startsWith(selectedMonth)) selectedDate = selectedMonth + '-01';
  installShell(); pushHistoryState(); forceServiceWorkerUpdate();

  if (!restoreSession()) {
    $('#loginView')?.classList.remove('hidden');
    $('#appView')?.classList.add('hidden');
    return;
  }

  openApp();
  try {
    if (session.mode === 'manager') await loadTeam({ quiet: true });
    else await loadCurrent({ quiet: true });
  } catch {}
  initPushSystem();
  const deep = new URLSearchParams(location.search).get('open');
  const allowed = ['dashboard','execution','cpo','daily','planning','income','summary','tasks','zero','incentives','penalties','opportunity','activity','team','proposal','notifications','settings'];
  if (allowed.includes(deep)) page = deep;
  render();
})();


/* =========================================================
   LAUNCH FINAL UI OVERRIDES — 2026-09-18
========================================================= */
(function installLaunchFinalVisuals(){
  if (document.getElementById('launchFinalVisuals')) return;
  const st=document.createElement('style'); st.id='launchFinalVisuals';
  st.textContent=`
    .action-sales{background:#173f75!important;color:#fff!important;border-color:#173f75!important}
    .action-zero,.alert-red{background:#8f1d24!important;color:#fff!important;border-color:#8f1d24!important}
    .action-task{background:#7a1d63!important;color:#fff!important;border-color:#7a1d63!important}
    .action-inc{background:#8a5a00!important;color:#fff!important;border-color:#8a5a00!important}
    .action-cpo{background:#00695c!important;color:#fff!important;border-color:#00695c!important}
    .action-plan{background:#4a3f8f!important;color:#fff!important;border-color:#4a3f8f!important}
    .action-summary{background:#37474f!important;color:#fff!important;border-color:#37474f!important}
    .important-critical{border-left:6px solid #b71c1c!important;background:rgba(183,28,28,.08)!important}
    .important-high{border-left:6px solid #ef6c00!important;background:rgba(239,108,0,.08)!important}
    .important-normal{border-left:6px solid #1565c0!important;background:rgba(21,101,192,.07)!important}
    .launch-back{margin:0 0 10px;padding:8px 12px;border-radius:10px}
    .cpo-program{border-left:5px solid #00695c}
  `;
  document.head.appendChild(st);
})();

function alertsForCurrent() {
  if (!current) return [];
  const a=[], perf=current.performance||{}, pending=(current.tasks||[]).filter(x=>!taskDone(x));
  if (pending.length) a.push({icon:'⚠️',title:`IMPORTANT WORK • ${pending.length} PENDING`,text:'Senior/manager assigned work requires attention.',page:'tasks',danger:true});
  else a.push({icon:'✓',title:'IMPORTANT WORK • NO TASK AVAILABLE',text:'No pending important work.',page:'tasks'});
  if (n(perf.zeroOutlets)>0) a.push({icon:'🔴',title:`ZERO SALES • ${n(perf.zeroOutlets)} OUTLET(S)`,text:'Coverage gap requires follow-up.',page:'zero',danger:true});
  if (n(perf.shortfall)>0) a.push({icon:'🎯',title:`SHORTFALL • ${money(perf.shortfall)}`,text:`Achievement ${pct(perf.percent)}.`,page:'summary',danger:true});
  const inc=current.incentives||[], earned=inc.reduce((z,x)=>z+n(x.earnedRM),0);
  a.push({icon:'RM',title:`INCENTIVE EARNED • ${money(earned)}`,text:'Delivered-sales based earned incentive.',page:'incentives'});
  inc.filter(x=>!x.fulfilled&&n(x.remaining)>0).slice(0,3).forEach(x=>a.push({icon:'🏆',title:`${x.name||'INCENTIVE'} • ${n(x.remaining)} LEFT`,text:`${n(x.actual)} / ${n(x.target)} • Reward ${money(x.rewardRM)}`,page:'incentives'}));
  return a;
}

function renderDashboard() {
  if (!current) {
    $('#mainContent').innerHTML=monthBar()+`<div class="card">${empty('Live database is not loaded yet.')}<button id="loadNow" class="btn primary">LOAD DATABASE</button></div>`;
    bindCommon(); $('#loadNow').onclick=()=>refreshCloud(true); return;
  }
  const p=current.performance||{}, f=current.forecast||{}, inc=current.incomeSummary||{}, cmp=current.comparisons||{}, alerts=alertsForCurrent();
  $('#mainContent').innerHTML=`${monthBar()}<section class="hero"><p class="eyebrow">LIVE SALES DATABASE</p><h3>${esc(viewedName())}</h3><p class="muted">${monthName(selectedMonth)} • Actual delivered value is the sales source of truth</p>${progressBar(p.percent)}${syncStatus()}<div class="form-actions"><button id="syncNow" class="btn secondary">↻ REFRESH LIVE</button>${isManagerMode()?'<button class="btn secondary" data-go="team">👥 TEAM CONTROL</button>':''}</div></section>
  <div class="grid kpi-grid">${kpi('MONTH TARGET',money(p.target),monthName(selectedMonth))}${kpi('ACHIEVEMENT',money(p.achievement),pct(p.percent),p.percent>=100?'good':'')}${kpi('SHORTFALL',money(p.shortfall),'Remaining',p.shortfall?'bad':'good')}${kpi('TODAY DELIVERED',money(p.todaySales),dateLabel(selectedDate))}${kpi('OUTLET COVERAGE',pct(p.coverage),`${n(p.coveredOutlets)}/${n(p.routeOutlets)} outlets`,p.zeroOutlets?'warn':'good')}${kpi('ZERO OUTLETS',String(n(p.zeroOutlets)),'Month-to-date',p.zeroOutlets?'bad':'good')}${kpi('PROJECTED MONTH',money(f.projectedSales),f.onTrack?'On track':'Needs acceleration',f.onTrack?'good':'warn')}${kpi('FINAL INCOME',money(inc.finalIncome),'Commission + incentive − penalty')}${kpi('LAST MONTH SAME DAY',money(cmp.lastMonthSameDay),cmp.lastMonthDate?dateLabel(cmp.lastMonthDate):'—')}${kpi('LAST YEAR SAME DAY',money(cmp.lastYearSameDay),cmp.lastYearDate?dateLabel(cmp.lastYearDate):'—')}</div>
  <div class="section-title"><h3>Smart Actions</h3></div><div class="mini-grid">
  <button class="btn action-sales" data-go="execution">📦 Order & Delivery</button>
  <button class="btn action-zero" data-go="zero">🏪 Zero / Outlet Report</button>
  <button class="btn action-inc" data-go="incentives">🏆 Incentives</button>
  <button class="btn action-task" data-go="tasks">⚠️ Important Work</button>
  <button class="btn action-cpo" data-go="cpo">📍 CPO Execution</button>
  <button class="btn action-plan" data-go="planning">◎ Monthly Plan</button>
  <button class="btn action-summary" data-go="summary">▦ Full Summary</button>
  <button class="btn secondary" data-go="opportunity">⚡ SKU Opportunity</button>
  <button class="btn secondary" data-go="income">RM Income</button>
  <button class="btn secondary" data-go="activity">🕘 Timeline</button></div>
  <div class="section-title"><h3>Notification & Attention</h3></div><div class="notification-list">${alerts.map(x=>`<button class="notification-item ${x.danger?'alert-red':''}" data-go="${x.page}" style="text-align:left;width:100%"><div class="notification-icon">${x.icon}</div><div><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p></div></button>`).join('')}</div>`;
  bindCommon(); $('#syncNow').onclick=()=>refreshCloud(true);
}

function renderDaily(){
  $('#mainContent').innerHTML=`${monthBar()}<section class="hero"><p class="eyebrow">SALES ENTRY</p><h3>Use Order & Delivery</h3><p class="muted">Manual/legacy sales entry is disabled for launch. Book an order first; only actual delivered amount/cartons count as sales, incentive and income.</p></section><button class="btn action-sales big-action" data-go="execution">OPEN ORDER & DELIVERY</button>`;
  bindCommon();
}

function renderPlanning(){
  const plans=current?.plans||[];
  if(!isManagerMode()){
    $('#mainContent').innerHTML=`${monthBar()}<section class="hero"><p class="eyebrow">MONTHLY PLAN • LOCKED</p><h3>${esc(viewedName())}</h3><p class="muted">Monthly target and plan are fixed by Manager. SR access is view-only.</p></section><div style="margin-top:12px">${planningList()}</div>`;
    bindCommon(); return;
  }
  selectedPlanningSkus=[];
  const users=teamUsers(), target=current?.performance?.target||0, teamTarget=current?.teamTarget||0;
  $('#mainContent').innerHTML=`${monthBar()}<section class="hero"><p class="eyebrow">MANAGER MONTHLY CONTROL</p><h3>Target & Plan Lock</h3><p class="muted">Manager is the only editor. Saved monthly values become the working target for calculations.</p></section>
  <div class="card" style="margin-top:12px"><h3>Monthly Target</h3><form id="monthlyTargetForm" class="stack"><label>Target Type<select id="targetScope" name="scope"><option value="STAFF">Selected SR / My Route</option><option value="TEAM">Manager Team Total</option></select></label><label id="targetStaffWrap">Staff<select name="staffId">${users.map(u=>`<option value="${esc(u.id)}" ${u.id===managerView?'selected':''}>${esc(u.name)} • ${esc(u.id)}</option>`).join('')}</select></label><label>Target RM<input name="targetRM" type="number" min="0" step=".01" value="${n(target)}" required></label><button class="btn primary">SAVE & LOCK MONTHLY TARGET</button><p class="muted">Current Team Target: ${money(teamTarget)}</p></form></div>
  <div class="card" style="margin-top:12px"><h3>Outlet & SKU Monthly Plan</h3><form id="planForm" class="stack"><label>Search Outlet<input id="planOutletSearch" placeholder="Outlet name or code"></label><label>Outlet<select id="planOutlet" name="outlet" required>${outletOptions()}</select></label><label>Outlet Monthly Target RM<input name="outletTarget" type="number" min="0" step=".01" required></label><label>Target SKU Count<input name="targetSkuCount" type="number" min="0" step="1" value="0"></label><label>Search SKU<input id="planSkuSearch" placeholder="SKU name"></label><label>SKU<select id="planSku"><option value="">Select outlet first</option></select></label><button type="button" id="addPlanSku" class="btn secondary">+ ADD SKU</button><div id="planSkuChips" class="chipbox"></div><button class="btn action-plan">SAVE / UPDATE MONTHLY PLAN</button></form></div>
  <div class="section-title"><h3>Plan vs Actual Delivered</h3></div>${planningList()}`;
  bindCommon();
  const scope=$('#targetScope'), sw=$('#targetStaffWrap'); scope.onchange=()=>sw.style.display=scope.value==='TEAM'?'none':''; scope.onchange();
  $('#monthlyTargetForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);setBusy(true,'Saving target…');try{const r=await apiPost('saveMonthlyTarget',{scope:String(fd.get('scope')),staffId:String(fd.get('staffId')||managerView),month:selectedMonth,targetRM:n(fd.get('targetRM'))});if(!r?.ok)throw new Error(r?.error||'Target save failed');await Promise.all([loadCurrent({quiet:true}),loadTeam({quiet:true})]);toast('Monthly target saved & locked');render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}};
  const os=$('#planOutletSearch'),o=$('#planOutlet'),ss=$('#planSkuSearch'),sk=$('#planSku'),chips=$('#planSkuChips');
  const paint=()=>{chips.innerHTML=selectedPlanningSkus.map(x=>`<span class="chip">${esc(x)} <button type="button" data-rmsku="${esc(x)}">×</button></span>`).join('');$$('[data-rmsku]').forEach(b=>b.onclick=()=>{selectedPlanningSkus=selectedPlanningSkus.filter(x=>x!==b.dataset.rmsku);paint();refresh()})};
  const refresh=()=>{sk.innerHTML=o.value?skuOptions(o.value,sk.value,ss.value):'<option value="">Select outlet first</option>';[...sk.options].forEach(z=>{if(selectedPlanningSkus.includes(z.value))z.disabled=true})};
  os.oninput=()=>{const old=o.value;o.innerHTML=outletOptions(old,os.value);refresh()};o.onchange=()=>{selectedPlanningSkus=[];paint();refresh()};ss.oninput=refresh;
  $('#addPlanSku').onclick=()=>{if(!sk.value)return toast('Select SKU');if(!selectedPlanningSkus.includes(sk.value))selectedPlanningSkus.push(sk.value);paint();refresh()};
  $('#planForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),name=String(fd.get('outlet')||''),out=routeOutlets().find(x=>String(x['Outlet Name'])===name);if(!out)return toast('Select outlet');setBusy(true,'Saving plan…');try{const r=await apiPost('savePlan',{staffId:managerView,month:selectedMonth,outletCode:out['Outlet Code']||'',outletName:name,outletTarget:n(fd.get('outletTarget')),targetedSkuCount:n(fd.get('targetSkuCount'))||selectedPlanningSkus.length,targetSkus:selectedPlanningSkus,skuSalesPlan:0});if(!r?.ok)throw new Error(r?.error||'Plan failed');await loadCurrent({quiet:true});toast('Monthly plan saved');render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}};refresh();
}

function renderTasks(){
  const tasks=(current?.tasks||[]).slice().sort((a,b)=>String(b['Created At']||'').localeCompare(String(a['Created At']||'')));
  const form=isManagerMode()?`<div class="card"><p class="eyebrow">MANAGER • IMPORTANT WORK</p><form id="taskForm" class="stack"><label>Assign To<select name="staffId">${teamUsers().map(u=>`<option value="${u.id}" ${u.id===managerView?'selected':''}>${esc(u.name)} • ${u.id}</option>`).join('')}</select></label><div class="form-grid"><label>Source<select name="source"><option>MD</option><option>HOS</option><option selected>OWN</option><option>BUYER</option><option>DIC</option><option>OTHERS</option></select></label><label>Priority<select name="priority"><option>CRITICAL</option><option>HIGH</option><option selected>NORMAL</option></select></label></div><label>Important Work Title<input name="title" required></label><label>Instruction<textarea name="instruction" required></textarea></label><div class="form-grid"><label>Due Date<input name="due" type="date"></label><label>Due Time<input name="dueTime" type="time"></label></div><button class="btn action-task">ASSIGN IMPORTANT WORK</button></form></div>`:'';
  $('#mainContent').innerHTML=`${monthBar()}${form}<div class="section-title"><h3>Important Work</h3></div><div class="list">${tasks.length?tasks.map(t=>{const done=taskDone(t),pr=String(t.Priority||'NORMAL').toUpperCase(),cls=done?'':pr==='CRITICAL'?'important-critical':pr==='HIGH'?'important-high':'important-normal';return `<div class="list-item ${cls}"><div class="row"><div><span class="pill ${done?'green':'red'}">${done?'DONE':pr+' • PENDING'}</span><h4>${esc(t.Title||'Important Work')}</h4><p>${esc(t.Instruction||'')}<br>${esc(t.Source||'OWN')}${t['Due Date']?' • Due '+dateLabel(t['Due Date']):''}${t['Due Time']?' '+esc(t['Due Time']):''}${t['Completed At']?'<br>Completed: '+esc(String(t['Completed At'])):''}</p></div></div>${!isManagerMode()&&!done?`<button class="btn action-task" data-taskdone="${esc(t['Task ID'])}" data-tasktitle="${esc(t.Title||'')}">MARK COMPLETE</button>`:''}</div>`}).join(''):empty('NO TASK AVAILABLE')}</div>`;
  bindCommon();
  if($('#taskForm'))$('#taskForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);setBusy(true,'Assigning…');try{const r=await apiPost('saveTask',{staffId:String(fd.get('staffId')),title:String(fd.get('title')),instruction:String(fd.get('instruction')),due:String(fd.get('due')||''),dueTime:String(fd.get('dueTime')||''),source:String(fd.get('source')||'OWN'),priority:String(fd.get('priority')||'NORMAL')});if(!r?.ok)throw new Error(r?.error||'Task failed');managerView=String(fd.get('staffId'));await loadCurrent({quiet:true});toast('Important Work assigned');render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}};
  $$('[data-taskdone]').forEach(b=>b.onclick=async()=>{setBusy(true,'Completing…');try{const r=await apiPost('completeTask',{taskId:b.dataset.taskdone,title:b.dataset.tasktitle});if(!r?.ok)throw new Error(r?.error||'Failed');await loadCurrent({quiet:true});toast('Work completed');render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}});
}

function renderCpo(){
  const proofs=current?.cpo||[], route=current?.outletSummary||[], programs=current?.cpoPrograms||[];
  const proofKeys=new Set(proofs.map(x=>String(x.outletCode||x.outletName).toUpperCase()));
  const routeList=route.map(x=>`<option value="${esc(x.outletName)}" data-code="${esc(x.outletCode||'')}"></option>`).join('');
  const managerProgram=isManagerMode()?`<div class="card" style="margin-top:12px"><p class="eyebrow">MANAGER CPO PROGRAM</p><form id="cpoProgramForm" class="stack"><label>Program Title<input name="title" required></label><label>Chain / Outlet Group<input name="chain" placeholder="e.g. Giant / KK Supermart"></label><label>Description<textarea name="description"></textarea></label><div class="form-grid"><label>Start Date<input name="startDate" type="date"></label><label>End Date<input name="endDate" type="date"></label></div><label>Program File / Image<input name="file" type="file" accept="image/*,.pdf"></label><button class="btn action-cpo">UPLOAD CPO PROGRAM</button></form></div>`:'';
  const proofForm=!isManagerMode()?`<div class="card" style="margin-top:12px"><form id="cpoForm" class="stack"><label>CPO Program<select name="programId"><option value="">General / No program</option>${programs.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}${p.chain?' • '+esc(p.chain):''}</option>`).join('')}</select></label><label>Date<input name="date" type="date" value="${selectedDate}" required></label><label>Outlet Name<input id="cpoOutletName" name="outletName" list="cpoOutletList" placeholder="Select from route OR type manually" required><datalist id="cpoOutletList">${routeList}</datalist></label><label>Outlet Code<input id="cpoOutletCode" name="outletCode" placeholder="Type code if outside route"></label><label>Current CPO Photo<input name="photo" type="file" accept="image/*" capture="environment" required></label><label>Note<textarea name="note"></textarea></label><button class="btn action-cpo">CAPTURE GPS & SAVE FOR VERIFICATION</button></form></div>`:'';
  $('#mainContent').innerHTML=`${monthBar()}<section class="hero"><p class="eyebrow">CPO EXECUTION TRACKER</p><h3>Program → Outlet → Photo + GPS → Manager Verification</h3><p class="muted">Route outlet can be selected by typing; outside-route outlet can be entered manually with its code.</p></section>${managerProgram}${proofForm}
  <div class="section-title"><h3>Active CPO Programs</h3></div><div class="list">${programs.length?programs.map(p=>`<div class="list-item cpo-program"><h4>${esc(p.title)}</h4><p>${esc(p.chain||'All / General')}${p.description?'<br>'+esc(p.description):''}${p.startDate?'<br>'+dateLabel(p.startDate)+(p.endDate?' → '+dateLabel(p.endDate):''):''}</p></div>`).join(''):empty('No CPO program uploaded.')}</div>
  <div class="section-title"><h3>Route CPO Status</h3></div><div class="list">${route.map(x=>{const key=String(x.outletCode||x.outletName).toUpperCase(),ok=proofKeys.has(key)||x.cpo;return `<div class="list-item"><div class="row"><div><h4>${x.serial||''}. ${esc(x.outletName)}</h4><p>${esc(x.outletCode||'')}</p></div><span class="pill ${ok?'green':'red'}">${ok?'CPO ✓':'NO CPO'}</span></div></div>`}).join('')}</div>
  <div class="section-title"><h3>Proof & Verification</h3></div><div class="list">${proofs.length?proofs.map(x=>`<div class="list-item"><div class="row"><div><h4>${esc(x.outletName)}</h4><p>${esc(x.outletCode||'')} • ${dateLabel(x.date)}<br>GPS ${n(x.latitude).toFixed(5)}, ${n(x.longitude).toFixed(5)}</p></div><span class="pill ${x.verificationStatus==='VERIFIED'?'green':x.verificationStatus==='REJECTED'?'red':'orange'}">${esc(x.verificationStatus||'PENDING')}</span></div><div class="form-actions"><button class="btn secondary" data-cpophoto="${esc(x.id)}">VIEW PHOTO</button>${x.locationUrl?`<a class="btn secondary" href="${esc(x.locationUrl)}" target="_blank" rel="noopener">MAP</a>`:''}${isManagerMode()?`<button class="btn action-cpo" data-cpoverify="${esc(x.id)}">VERIFY</button><button class="btn danger" data-cporeject="${esc(x.id)}">REJECT</button>`:''}</div>${x.verificationNote?`<p class="muted">Manager note: ${esc(x.verificationNote)}</p>`:''}</div>`).join(''):empty('No CPO proof uploaded yet.')}</div>`;
  bindCommon();
  const name=$('#cpoOutletName'), code=$('#cpoOutletCode');
  if(name)name.onchange=name.oninput=()=>{const r=route.find(x=>String(x.outletName).toLowerCase()===String(name.value).trim().toLowerCase());if(r&&code)code.value=r.outletCode||''};
  if($('#cpoProgramForm'))$('#cpoProgramForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),f=fd.get('file');setBusy(true,'Uploading CPO program…');try{let base64='',fileName='',mimeType='';if(f instanceof File&&f.size){if(f.size>8*1024*1024)throw new Error('File must be under 8 MB');base64=await fileToBase64(f);fileName=f.name;mimeType=f.type}const r=await apiPost('saveCpoProgram',{title:String(fd.get('title')),chain:String(fd.get('chain')||''),description:String(fd.get('description')||''),startDate:String(fd.get('startDate')||''),endDate:String(fd.get('endDate')||''),base64,fileName,mimeType});if(!r?.ok)throw new Error(r?.error||'Upload failed');await loadCurrent({quiet:true});toast('CPO program uploaded');render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}};
  if($('#cpoForm'))$('#cpoForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),f=fd.get('photo');if(!(f instanceof File)||!f.size)return toast('Take/upload CPO photo');setBusy(true,'Getting GPS & saving proof…');try{const c=await gpsNow(),base64=await fileToBase64(f),r=await apiPost('saveCpo',{programId:String(fd.get('programId')||''),date:String(fd.get('date')),outletCode:String(fd.get('outletCode')||''),outletName:String(fd.get('outletName')||''),note:String(fd.get('note')||''),base64,fileName:f.name,mimeType:f.type,latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy});if(!r?.ok)throw new Error(r?.error||'CPO failed');await loadCurrent({quiet:true});toast('CPO saved • waiting for Manager verification');render()}catch(x){toast(x.message||'GPS/CPO failed',4500)}finally{setBusy(false)}};
  $$('[data-cpophoto]').forEach(b=>b.onclick=()=>{const x=proofs.find(z=>z.id===b.dataset.cpophoto);if(x?.proofUrl)window.open(x.proofUrl,'_blank');else toast('Proof link unavailable')});
  const verify=async(id,status)=>{const note=prompt(status==='VERIFIED'?'Verification note (optional)':'Reason for rejection')||'';setBusy(true,'Updating verification…');try{const r=await apiPost('verifyCpo',{cpoId:id,status,note});if(!r?.ok)throw new Error(r?.error||'Verification failed');await loadCurrent({quiet:true});toast('CPO '+status);render()}catch(x){toast(x.message,4000)}finally{setBusy(false)}};
  $$('[data-cpoverify]').forEach(b=>b.onclick=()=>verify(b.dataset.cpoverify,'VERIFIED'));$$('[data-cporeject]').forEach(b=>b.onclick=()=>verify(b.dataset.cporeject,'REJECTED'));
}

function renderTeam(){
  if(!isManager()){page='dashboard';return render()}
  const sorted=teamSnapshot.slice().sort((a,b)=>attentionScore(b)-attentionScore(a)),tt=n(current?.teamTarget);
  $('#mainContent').innerHTML=`${monthBar({showManager:false})}<section class="hero"><p class="eyebrow">MANAGER LIVE DATABASE</p><h3>Team Control Center</h3><p class="muted">Team Target: ${money(tt)} • Actual delivered sales only</p>${syncStatus()}<button id="teamRefresh" class="btn primary">↻ SYNC TEAM NOW</button></section><div class="list" style="margin-top:12px">${sorted.length?sorted.map(x=>{const p=x.performance||{},ii=x.incomeSummary||{};return `<div class="card"><div class="row"><div><h3>${esc(x.name)}</h3><p class="muted">${esc(x.staffId)} • ${money(p.achievement)} / ${money(p.target)}</p></div><span class="pill ${p.percent>=100?'green':p.percent>=80?'orange':'red'}">${pct(p.percent)}</span></div><div class="mini-grid"><div class="metric-box"><small>Shortfall</small><br><b class="bad">${money(p.shortfall)}</b></div><div class="metric-box"><small>Zero Sale</small><br><b class="bad">${n(p.zeroOutlets)}</b></div><div class="metric-box"><small>Pending Work</small><br><b class="bad">${n(x.pendingTasks)}</b></div><div class="metric-box"><small>Income</small><br><b>${money(ii.finalIncome)}</b></div></div><div class="form-actions"><button class="btn action-sales" data-openstaff="${esc(x.staffId)}" data-openpage="dashboard">DASHBOARD</button><button class="btn action-summary" data-openstaff="${esc(x.staffId)}" data-openpage="summary">FULL DATABASE</button><button class="btn action-plan" data-openstaff="${esc(x.staffId)}" data-openpage="planning">TARGET / PLAN</button></div></div>`}).join(''):empty('No team data loaded.')}</div>`;
  bindCommon();$('#teamRefresh').onclick=async()=>{await Promise.all([loadTeam(),loadCurrent({quiet:true})]);render()};$$('[data-openstaff]').forEach(b=>b.onclick=async()=>{managerView=b.dataset.openstaff;session.managerView=managerView;saveSession();await loadCurrent();setPage(b.dataset.openpage||'summary')});
}

