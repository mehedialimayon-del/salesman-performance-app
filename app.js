
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
/* =========================================================
   COMMON UI
========================================================= */

function empty(text = 'No data found') {
  return `<div class="empty-state"><p>${esc(text)}</p></div>`;
}

function progressBar(value, label = '') {
  const v = Math.max(0, Math.min(100, n(value)));
  return `
    <div class="progress-wrap">
      ${label ? `<div class="row"><small>${esc(label)}</small><strong>${pct(v)}</strong></div>` : ''}
      <div class="progress"><span style="width:${v}%"></span></div>
    </div>`;
}

function metricCard(label, value, sub = '', cls = '') {
  return `
    <div class="metric-card ${cls}">
      <small>${esc(label)}</small>
      <strong>${value}</strong>
      ${sub ? `<p>${esc(sub)}</p>` : ''}
    </div>`;
}

function syncStatus() {
  return `
    <div class="sync-strip">
      <span>${navigator.onLine ? '● Online' : '● Offline'}</span>
      <span>${lastSyncAt ? 'Last sync ' + esc(lastSyncAt) : 'Waiting for live sync'}</span>
      <button type="button" id="refreshCloudBtn" class="mini-btn">↻ Refresh</button>
    </div>`;
}

function monthBar() {
  return `
    <div class="month-bar">
      <button type="button" id="prevMonthBtn">‹</button>
      <div>
        <small>REPORTING MONTH</small>
        <strong>${esc(monthName(selectedMonth))}</strong>
      </div>
      <button type="button" id="nextMonthBtn">›</button>
    </div>`;
}

function changeMonth(delta) {
  const [y, m] = selectedMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  selectedMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  selectedDate = selectedMonth === localDate().slice(0, 7) ? localDate() : selectedMonth + '-01';

  if (isManagerMode() && page === 'team') {
    loadTeam({ quiet: true }).then(render);
  } else {
    loadCurrent({ quiet: true }).then(render);
  }
}

function bindCommon() {
  if ($('#prevMonthBtn')) $('#prevMonthBtn').onclick = () => changeMonth(-1);
  if ($('#nextMonthBtn')) $('#nextMonthBtn').onclick = () => changeMonth(1);
  if ($('#refreshCloudBtn')) $('#refreshCloudBtn').onclick = () => refreshCloud(true);

  $$('[data-page-go]').forEach(b => {
    b.onclick = () => setPage(b.dataset.pageGo);
  });
}

function installVisibleBackButton() {
  let b = $('#sphBackBtn');

  if (!b) {
    b = document.createElement('button');
    b.id = 'sphBackBtn';
    b.type = 'button';
    b.innerHTML = '‹';
    b.title = 'Back';
    b.style.cssText =
      'position:fixed;left:10px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:220;width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#111820;color:#fff;font-size:28px;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.25)';

    document.body.appendChild(b);
  }

  b.style.display = page === 'dashboard' && !isManagerMode() ? 'none' : 'grid';

  b.onclick = () => {
    if (history.state?.sph && history.length > 1) history.back();
    else setPage(isManagerMode() ? 'team' : 'dashboard', { fromHistory: true });
  };
}

/* =========================================================
   ALERT / NOTIFICATION HELPERS
========================================================= */

function alertsForCurrent() {
  const a = [];
  const p = current?.performance || {};
  const tasks = current?.tasks || [];
  const zero = current?.zeroOutlets || [];
  const incentives = current?.incentives || [];
  const orders = current?.executionOrders || [];

  if (n(p.shortfall) > 0) {
    a.push({
      type: 'TARGET',
      title: 'Target Shortfall',
      text: `${money(p.shortfall)} remaining for ${monthName(selectedMonth)}.`,
      page: 'dashboard'
    });
  }

  if (zero.length) {
    a.push({
      type: 'ZERO',
      title: `${zero.length} Zero-Sales Outlet${zero.length > 1 ? 's' : ''}`,
      text: 'Follow up these outlets before month end.',
      page: 'zero'
    });
  }

  const pendingTasks = tasks.filter(x => String(x.Status || '').toUpperCase() !== 'DONE');
  if (pendingTasks.length) {
    a.push({
      type: 'TASK',
      title: `${pendingTasks.length} Pending Important Work`,
      text: 'Complete or update your important work.',
      page: 'tasks'
    });
  }

  const pendingOrders = orders.filter(x => ['PENDING', 'PARTIAL'].includes(String(x.status || '').toUpperCase()));
  if (pendingOrders.length) {
    a.push({
      type: 'DELIVERY',
      title: `${pendingOrders.length} Pending Delivery`,
      text: 'Order entered but full delivery is not completed.',
      page: 'execution'
    });
  }

  incentives
    .filter(x => !x.fulfilled && n(x.remaining) > 0)
    .slice(0, 2)
    .forEach(x => {
      a.push({
        type: 'INCENTIVE',
        title: x.name || 'Incentive',
        text: `${n(x.remaining)} remaining to achieve this incentive.`,
        page: 'incentives'
      });
    });

  return a;
}

function updateNotificationBadge() {
  const count = alertsForCurrent().length;
  const navBtn = $('#bottomNav [data-page="notifications"]');

  if (!navBtn) return;

  let badge = navBtn.querySelector('.sph-notification-badge');

  if (!badge && count) {
    badge = document.createElement('span');
    badge.className = 'sph-notification-badge';
    badge.style.cssText =
      'position:absolute;top:3px;right:14%;min-width:17px;height:17px;border-radius:20px;background:#ff5b36;color:white;font-size:10px;font-weight:900;display:grid;place-items:center;padding:0 4px';
    navBtn.style.position = 'relative';
    navBtn.appendChild(badge);
  }

  if (badge) {
    badge.textContent = String(count);
    badge.style.display = count ? 'grid' : 'none';
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  const p = current?.performance || {};
  const tasks = current?.tasks || [];
  const pendingTasks = tasks.filter(x => String(x.Status || '').toUpperCase() !== 'DONE').length;
  const zero = current?.zeroOutlets || [];
  const orders = current?.executionOrders || [];
  const pendingOrders = orders.filter(x => ['PENDING','PARTIAL'].includes(String(x.status || '').toUpperCase()));
  const incentives = current?.incentives || [];
  const earned = incentives.reduce((a, x) => a + n(x.earnedRM), 0);

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">${isManagerMode() ? 'INDIVIDUAL PERFORMANCE' : 'MY PERFORMANCE'}</p>
      <h2>${esc(viewedName())}</h2>
      <p class="muted">${esc(viewedId())} • ${esc(monthName(selectedMonth))}</p>
      ${syncStatus()}
    </section>

    <div class="metric-grid">
      ${metricCard('Monthly Target', money(p.target || 0))}
      ${metricCard('Delivered Sales', money(p.achievement || p.sales || 0))}
      ${metricCard('Achievement', pct(p.percent || p.achievementPercent || 0))}
      ${metricCard('Shortfall', money(p.shortfall || 0), '', n(p.shortfall) > 0 ? 'warning' : 'success')}
      ${metricCard('Today Sales', money(p.todaySales || 0))}
      ${metricCard('Pending Delivery', money(p.pendingDelivery || pendingOrders.reduce((a,x)=>a+n(x.pendingAmount),0)))}
    </div>

    <div class="card" style="margin-top:12px">
      <div class="row">
        <div>
          <p class="eyebrow">MONTHLY PROGRESS</p>
          <h3>${pct(p.percent || p.achievementPercent || 0)}</h3>
        </div>
        <strong>${money(p.achievement || p.sales || 0)}</strong>
      </div>
      ${progressBar(p.percent || p.achievementPercent || 0)}
      <p class="muted" style="margin-top:8px">
        Target ${money(p.target || 0)} • Remaining ${money(p.shortfall || 0)}
      </p>
    </div>

    <div class="quick-grid" style="margin-top:12px">
      <button class="quick-card" data-page-go="execution">
        <strong>📦 Order / Delivery</strong>
        <small>${pendingOrders.length} pending/partial</small>
      </button>

      <button class="quick-card" data-page-go="zero">
        <strong>🏪 Zero Sales</strong>
        <small>${zero.length} outlet(s)</small>
      </button>

      <button class="quick-card" data-page-go="tasks">
        <strong>✓ Important Work</strong>
        <small>${pendingTasks} pending</small>
      </button>

      <button class="quick-card" data-page-go="incentives">
        <strong>🏆 Incentive</strong>
        <small>${money(earned)} earned</small>
      </button>

      <button class="quick-card" data-page-go="cpo">
        <strong>📷 CPO</strong>
        <small>Proof & execution</small>
      </button>

      <button class="quick-card" data-page-go="opportunity">
        <strong>⚡ Opportunity</strong>
        <small>Where to focus next</small>
      </button>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="row">
        <div>
          <p class="eyebrow">TODAY MISSION</p>
          <h3>What needs attention?</h3>
        </div>
        <span class="pill orange">${alertsForCurrent().length}</span>
      </div>

      <div class="list" style="margin-top:10px">
        ${
          alertsForCurrent().length
            ? alertsForCurrent().slice(0,6).map(x => `
              <button class="list-item" data-page-go="${esc(x.page)}" style="width:100%;text-align:left">
                <div class="row">
                  <div>
                    <h4>${esc(x.title)}</h4>
                    <p>${esc(x.text)}</p>
                  </div>
                  <span>›</span>
                </div>
              </button>`).join('')
            : empty('No urgent action right now.')
        }
      </div>
    </div>
  `;

  bindCommon();
}

/* =========================================================
   DAILY SALES
========================================================= */

function renderDaily() {
  const p = current?.performance || {};

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">DAILY SALES UPDATE</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">Submit daily delivered sales and notes.</p>
      ${syncStatus()}
    </section>

    <form id="dailyForm" class="card">
      <label>Date
        <input type="date" name="date" value="${esc(selectedDate)}" required>
      </label>

      <label>Delivered Sales RM
        <input type="number" name="sales" min="0" step="0.01" value="" placeholder="0.00" required>
      </label>

      <label>Achievement Note
        <textarea name="note" rows="3" placeholder="What happened today?"></textarea>
      </label>

      <button class="btn primary" type="submit">SAVE DAILY UPDATE</button>
    </form>

    <div class="metric-grid" style="margin-top:12px">
      ${metricCard('Today', money(p.todaySales || 0))}
      ${metricCard('MTD', money(p.achievement || p.sales || 0))}
      ${metricCard('Shortfall', money(p.shortfall || 0))}
      ${metricCard('Achievement', pct(p.percent || p.achievementPercent || 0))}
    </div>
  `;

  bindCommon();

  $('#dailyForm').onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    setBusy(true, 'Saving daily sales…');

    try {
      const r = await apiPost('saveDaily', {
        date: fd.get('date'),
        sales: n(fd.get('sales')),
        note: String(fd.get('note') || ''),
        requestId: idGen()
      });

      if (!r?.ok) throw new Error(r?.error || 'Daily save failed');

      selectedDate = String(fd.get('date'));
      await loadCurrent({ quiet: true });

      toast('Daily sales saved');
      render();

    } catch (err) {
      toast(err.message, 3500);
    } finally {
      setBusy(false);
    }
  };
}

/* =========================================================
   ORDER → DELIVERY / ACTUAL SALES
========================================================= */

let executionLines = [];

function newExecutionLine() {
  return {
    id: idGen(),
    skuName: '',
    cartons: 0,
    price: 0,
    salesValue: 0
  };
}

function renderExecutionLines(outletName = '') {
  const box = $('#executionLines');
  if (!box) return;

  if (!executionLines.length) executionLines = [newExecutionLine()];

  box.innerHTML = executionLines.map((x, i) => `
    <div class="card compact" data-line="${esc(x.id)}" style="margin-top:8px">
      <div class="row">
        <strong>SKU ${i + 1}</strong>
        ${executionLines.length > 1 ? `<button type="button" class="mini-btn" data-remove-line="${esc(x.id)}">×</button>` : ''}
      </div>

      <label>Product
        <select data-line-sku="${esc(x.id)}">
          ${skuOptions(outletName, x.skuName)}
        </select>
      </label>

      <div class="two-col">
        <label>Cartons
          <input type="number" min="0" step="1" data-line-carton="${esc(x.id)}" value="${n(x.cartons)}">
        </label>

        <label>Price / Value
          <input type="number" min="0" step="0.01" data-line-price="${esc(x.id)}" value="${n(x.price)}">
        </label>
      </div>
    </div>
  `).join('');

  $$('[data-remove-line]').forEach(b => {
    b.onclick = () => {
      executionLines = executionLines.filter(x => x.id !== b.dataset.removeLine);
      renderExecutionLines(outletName);
    };
  });
}

function renderExecution() {
  const orders = current?.executionOrders || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">ORDER → DELIVERY</p>
      <h3>Actual Sales Execution</h3>
      <p class="muted">Order is not counted as achievement until delivery is confirmed.</p>
      ${syncStatus()}
    </section>

    <form id="executionForm" class="card">
      <label>Order Date
        <input type="date" name="date" value="${esc(selectedDate)}" required>
      </label>

      <label>Outlet
        <select id="executionOutlet" name="outletName" required>
          ${outletOptions()}
        </select>
      </label>

      <div id="executionLines"></div>

      <button type="button" id="addExecutionLine" class="btn secondary" style="width:100%;margin-top:10px">+ ADD SKU</button>

      <label style="margin-top:10px">Remarks
        <textarea name="note" rows="2" placeholder="Order / buyer / delivery note"></textarea>
      </label>

      <button class="btn primary" type="submit">SAVE ORDER</button>
    </form>

    <div class="section-title">
      <div>
        <p class="eyebrow">ORDER HISTORY</p>
        <h3>${orders.length} order(s)</h3>
      </div>
    </div>

    <div class="list">
      ${
        orders.length
          ? orders.map(o => `
            <div class="card">
              <div class="row">
                <div>
                  <span class="pill ${
                    o.status === 'DELIVERED' ? 'green' :
                    o.status === 'PARTIAL' ? 'orange' :
                    o.status === 'CANCELLED' ? 'red' : ''
                  }">${esc(o.status || 'PENDING')}</span>
                  <h3 style="margin:8px 0 3px">${esc(o.outletName || 'Outlet')}</h3>
                  <p class="muted">${dateLabel(o.date)} • ${esc(o.orderId || '')}</p>
                </div>
                <div style="text-align:right">
                  <strong>${money(o.deliveredAmount || 0)}</strong>
                  <p class="muted">of ${money(o.orderedAmount || 0)}</p>
                </div>
              </div>

              ${
                Array.isArray(o.items) && o.items.length
                  ? `<div class="list" style="margin-top:10px">
                      ${o.items.map(i => `
                        <div class="list-item">
                          <div class="row">
                            <div>
                              <h4>${esc(i.skuName)}</h4>
                              <p>${n(i.deliveredCartons)} / ${n(i.orderedCartons)} CTN delivered</p>
                            </div>
                            <strong>${money(i.deliveredValue || 0)}</strong>
                          </div>
                        </div>`).join('')}
                    </div>`
                  : ''
              }

              ${
                isManager()
                  ? `<div class="button-row" style="margin-top:10px">
                      <button class="btn secondary" data-deliver-order="${esc(o.orderId)}">UPDATE DELIVERY</button>
                      <button class="btn danger" data-reset-order="${esc(o.orderId)}">RESET / CANCEL</button>
                    </div>`
                  : `<button class="btn secondary" data-deliver-order="${esc(o.orderId)}" style="width:100%;margin-top:10px">UPDATE DELIVERY</button>`
              }
            </div>`).join('')
          : empty('No order found.')
      }
    </div>
  `;

  bindCommon();

  executionLines = [newExecutionLine()];
  renderExecutionLines('');

  $('#executionOutlet').onchange = e => {
    executionLines.forEach(x => x.skuName = '');
    renderExecutionLines(e.target.value);
  };

  $('#addExecutionLine').onclick = () => {
    executionLines.push(newExecutionLine());
    renderExecutionLines($('#executionOutlet').value);
  };

  $('#executionForm').onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const outletName = String(fd.get('outletName') || '');
    const outlet = routeOutlets().find(x => String(x['Outlet Name']) === outletName);

    const items = executionLines.map(x => {
      const skuName = $(`[data-line-sku="${x.id}"]`)?.value || '';
      const cartons = n($(`[data-line-carton="${x.id}"]`)?.value);
      const price = n($(`[data-line-price="${x.id}"]`)?.value);

      return {
        skuName,
        cartons,
        price,
        salesValue: price
      };
    }).filter(x => x.skuName && (x.cartons > 0 || x.salesValue > 0));

    if (!outletName) return toast('Select outlet');
    if (!items.length) return toast('Add at least one SKU');

    setBusy(true, 'Saving order…');

    try {
      const r = await apiPost('saveOrder', {
        date: fd.get('date'),
        outletCode: outlet?.['Outlet Code'] || '',
        outletName,
        note: fd.get('note'),
        items,
        requestId: idGen()
      });

      if (!r?.ok) throw new Error(r?.error || 'Order save failed');

      await loadCurrent({ quiet: true });
      toast('Order saved');
      executionLines = [newExecutionLine()];
      render();

    } catch (err) {
      toast(err.message, 4000);
    } finally {
      setBusy(false);
    }
  };

  $$('[data-deliver-order]').forEach(b => {
    b.onclick = async () => {
      const order = orders.find(x => String(x.orderId) === String(b.dataset.deliverOrder));
      if (!order) return;

      const amount = prompt(
        `Delivered amount for ${order.outletName}\nOrdered: ${money(order.orderedAmount)}\nEnter actual delivered RM:`,
        String(order.deliveredAmount || order.orderedAmount || 0)
      );

      if (amount === null) return;

      const deliveryDate = prompt('Delivery date (YYYY-MM-DD):', localDate());
      if (deliveryDate === null) return;

      setBusy(true, 'Updating delivery…');

      try {
        const r = await apiPost('updateDelivery', {
          orderId: order.orderId,
          deliveredAmount: n(amount),
          deliveryDate,
          status: n(amount) >= n(order.orderedAmount) ? 'DELIVERED' : n(amount) > 0 ? 'PARTIAL' : 'PENDING'
        });

        if (!r?.ok) throw new Error(r?.error || 'Delivery update failed');

        await loadCurrent({ quiet: true });
        toast('Delivery updated');
        render();

      } catch (err) {
        toast(err.message, 4000);
      } finally {
        setBusy(false);
      }
    };
  });

  $$('[data-reset-order]').forEach(b => {
    b.onclick = async () => {
      if (!isManager()) return;
      if (!confirm('Reset this order/delivery to zero?')) return;

      const reason = prompt('Manager correction / reset reason:');
      if (!reason) return toast('Reason is required');

      setBusy(true, 'Applying manager correction…');

      try {
        const r = await apiPost('managerResetExecution', {
          orderId: b.dataset.resetOrder,
          note: reason,
          deliveryDate: localDate()
        });

        if (!r?.ok) throw new Error(r?.error || 'Reset failed');

        await loadCurrent({ quiet: true });
        toast('Manager correction saved');
        render();

      } catch (err) {
        toast(err.message, 4000);
      } finally {
        setBusy(false);
      }
    };
  });
}

/* =========================================================
   CPO
========================================================= */

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS is not supported'));

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  });
}

function renderCpo() {
  const list = current?.cpo || current?.cpoProofs || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">CPO EXECUTION</p>
      <h3>Outlet Proof</h3>
      <p class="muted">Upload CPO photo with outlet and GPS proof.</p>
      ${syncStatus()}
    </section>

    <form id="cpoForm" class="card">
      <label>Date
        <input type="date" name="date" value="${esc(selectedDate)}" required>
      </label>

      <label>Outlet
        <select name="outletName" id="cpoOutlet" required>
          ${outletOptions()}
        </select>
      </label>

      <label>Title
        <input name="title" value="CPO Proof" placeholder="CPO Proof">
      </label>

      <label>Photo
        <input type="file" name="photo" accept="image/*" capture="environment" required>
      </label>

      <label>Note
        <textarea name="note" rows="2" placeholder="Optional note"></textarea>
      </label>

      <button class="btn primary" type="submit">CAPTURE GPS & SUBMIT CPO</button>
    </form>

    <div class="section-title">
      <div>
        <p class="eyebrow">CPO HISTORY</p>
        <h3>${list.length} record(s)</h3>
      </div>
    </div>

    <div class="list">
      ${
        list.length
          ? list.map(x => `
            <div class="card">
              <div class="row">
                <div>
                  <span class="pill ${String(x.Status || x.status).toUpperCase() === 'ACTIVE' ? 'green' : 'orange'}">
                    ${esc(x.Status || x.status || 'ACTIVE')}
                  </span>
                  <h3 style="margin:8px 0 3px">${esc(x['Outlet Name'] || x.outletName || 'Outlet')}</h3>
                  <p class="muted">${dateLabel(x.Date || x.date)} • ${esc(x.Title || x.title || 'CPO Proof')}</p>
                </div>
                <button class="mini-btn" data-cpo-download="${esc(x['CPO ID'] || x.cpoId || '')}">PHOTO</button>
              </div>
            </div>`).join('')
          : empty('No CPO proof found.')
      }
    </div>
  `;

  bindCommon();

  $('#cpoForm').onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const file = fd.get('photo');
    const outletName = String(fd.get('outletName') || '');
    const outlet = routeOutlets().find(x => String(x['Outlet Name']) === outletName);

    if (!(file instanceof File) || !file.size) return toast('Select CPO photo');

    setBusy(true, 'Getting GPS & uploading CPO…');

    try {
      const pos = await getCurrentPosition();
      const dataUrl = await fileToDataUrl(file);
      const base64 = dataUrl.split(',').pop();

      const r = await apiPost('saveCpo', {
        date: fd.get('date'),
        outletCode: outlet?.['Outlet Code'] || '',
        outletName,
        title: fd.get('title'),
        note: fd.get('note'),
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        base64,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name || `CPO-${Date.now()}.jpg`
      });

      if (!r?.ok) throw new Error(r?.error || 'CPO save failed');

      await loadCurrent({ quiet: true });
      toast('CPO proof submitted');
      render();

    } catch (err) {
      toast(err.message || 'CPO upload failed', 4500);
    } finally {
      setBusy(false);
    }
  };

  $$('[data-cpo-download]').forEach(b => {
    b.onclick = async () => {
      setBusy(true, 'Loading CPO photo…');

      try {
        const r = await apiPost('downloadCpoPhoto', { cpoId: b.dataset.cpoDownload });
        if (!r?.ok) throw new Error(r?.error || 'Photo unavailable');

        const a = document.createElement('a');
        a.href = `data:${r.mimeType || 'image/jpeg'};base64,${r.base64}`;
        a.download = r.fileName || 'CPO-photo.jpg';
        a.click();

      } catch (err) {
        toast(err.message, 4000);
      } finally {
        setBusy(false);
      }
    };
  });
}

/* =========================================================
   MONTHLY PLANNING
========================================================= */

function renderPlanning() {
  const plans = current?.plans || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">MONTHLY PLANNING</p>
      <h3>Outlet & SKU Target</h3>
      <p class="muted">Set outlet target and target SKU count for ${esc(monthName(selectedMonth))}.</p>
      ${syncStatus()}
    </section>

    <form id="planningForm" class="card">
      <label>Outlet
        <select id="planningOutlet" name="outletName" required>
          ${outletOptions()}
        </select>
      </label>

      <label>Outlet Target RM
        <input type="number" name="outletTarget" min="0" step="0.01" placeholder="0.00">
      </label>

      <label>Target SKU Count
        <input type="number" name="targetSkuCount" min="0" step="1" placeholder="25">
      </label>

      <label>Search SKU
        <input id="planningSkuSearch" placeholder="Type product name">
      </label>

      <div id="planningSkuResults" class="search-results"></div>
      <div id="planningSkuChips" class="chip-wrap"></div>

      <button class="btn primary" type="submit">SAVE MONTHLY PLAN</button>
    </form>

    <div class="section-title">
      <div>
        <p class="eyebrow">OUTLET PLANS</p>
        <h3>${plans.length} planned outlet(s)</h3>
      </div>
    </div>

    <div class="list">
      ${
        plans.length
          ? plans.map(x => {
              let skuList = [];
              try { skuList = JSON.parse(x['Targeted SKU List'] || '[]'); } catch {}
              return `
                <div class="card">
                  <div class="row">
                    <div>
                      <h3>${esc(x['Outlet Name'] || '')}</h3>
                      <p class="muted">${esc(x['Outlet Code'] || '')}</p>
                    </div>
                    <strong>${money(x['Outlet Target'] || 0)}</strong>
                  </div>
                  <div class="status-strip" style="margin-top:8px">
                    <span class="status-chip">Target SKU ${n(x['Targeted SKU Count'])}</span>
                    <span class="status-chip">${skuList.length} selected</span>
                  </div>
                </div>`;
            }).join('')
          : empty('No monthly outlet plan yet.')
      }
    </div>
  `;

  bindCommon();

  selectedPlanningSkus = [];

  const refreshSku = () => {
    const q = String($('#planningSkuSearch')?.value || '').trim().toLowerCase();
    const all = allSkuNames()
      .filter(x => !selectedPlanningSkus.includes(x))
      .filter(x => !q || x.toLowerCase().includes(q))
      .slice(0, 80);

    $('#planningSkuResults').innerHTML = all.length
      ? all.map(x => `<button type="button" class="search-result" data-plan-add="${esc(x)}">＋ ${esc(x)}</button>`).join('')
      : empty('No matching SKU');

    $('#planningSkuChips').innerHTML = selectedPlanningSkus
      .map(x => `<span class="chip">${esc(x)}<button type="button" data-plan-remove="${esc(x)}">×</button></span>`)
      .join('');

    $$('[data-plan-add]').forEach(b => {
      b.onclick = () => {
        selectedPlanningSkus.push(b.dataset.planAdd);
        refreshSku();
      };
    });

    $$('[data-plan-remove]').forEach(b => {
      b.onclick = () => {
        selectedPlanningSkus = selectedPlanningSkus.filter(x => x !== b.dataset.planRemove);
        refreshSku();
      };
    });
  };

  $('#planningSkuSearch').oninput = refreshSku;
  refreshSku();

  $('#planningForm').onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const outletName = String(fd.get('outletName') || '');
    const outlet = routeOutlets().find(x => String(x['Outlet Name']) === outletName);

    if (!outlet) return toast('Select outlet');

    setBusy(true, 'Saving monthly plan…');

    try {
      const r = await apiPost('savePlan', {
        month: selectedMonth,
        routeTarget: current?.performance?.target || 0,
        outletCode: outlet['Outlet Code'] || '',
        outletName,
        outletTarget: n(fd.get('outletTarget')),
        targetedSkuCount: n(fd.get('targetSkuCount')) || selectedPlanningSkus.length,
        targetSkus: selectedPlanningSkus,
        skuSalesPlan: 0
      });

      if (!r?.ok) throw new Error(r?.error || 'Plan save failed');

      await loadCurrent({ quiet: true });
      toast('Monthly plan saved');
      render();

    } catch (err) {
      toast(err.message, 3500);
    } finally {
      setBusy(false);
    }
  };
}

/* =========================================================
   ZERO SALES / OUTLET STATUS
========================================================= */

function renderZero() {
  const all = routeOutlets();
  const zero = current?.zeroOutlets || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">OUTLET COVERAGE</p>
      <h3>Zero Sales Tracker</h3>
      <p class="muted">Find outlets with no sales in ${esc(monthName(selectedMonth))}.</p>
      ${syncStatus()}
    </section>

    <div class="metric-grid">
      ${metricCard('Total Outlet', String(all.length))}
      ${metricCard('Zero Sales', String(zero.length))}
      ${metricCard('Active Outlet', String(Math.max(0, all.length - zero.length)))}
      ${metricCard('Coverage', pct(all.length ? ((all.length - zero.length) / all.length * 100) : 0))}
    </div>

    <div class="card" style="margin-top:12px">
      <input id="zeroSearch" placeholder="Search outlet / code / route">
    </div>

    <div id="zeroList" class="list" style="margin-top:12px"></div>
  `;

  bindCommon();

  const paint = () => {
    const q = String($('#zeroSearch')?.value || '').trim().toLowerCase();

    const rows = zero.filter(x => {
      const text = [
        x['Outlet Name'],
        x['Outlet Code'],
        x.Route,
        x.route,
        x.Category
      ].join(' ').toLowerCase();

      return !q || text.includes(q);
    });

    $('#zeroList').innerHTML = rows.length
      ? rows.map(x => `
        <div class="card">
          <div class="row">
            <div>
              <span class="pill red">ZERO SALES</span>
              <h3 style="margin:8px 0 3px">${esc(x['Outlet Name'] || x.outletName || '')}</h3>
              <p class="muted">${esc(x['Outlet Code'] || x.outletCode || '')} • ${esc(x.Route || x.route || '')}</p>
            </div>
            <strong>${money(0)}</strong>
          </div>
        </div>`).join('')
      : empty('No zero-sales outlet found.');
  };

  $('#zeroSearch').oninput = paint;
  paint();
}
/* =========================================================
   INCENTIVES
========================================================= */

let incentiveSelectedSkus = [];
let editingIncentiveId = null;

function incentiveCard(x) {
  const v = n(x.percent);

  const skuText =
    Array.isArray(x.selectedSkus) && x.selectedSkus.length
      ? (
          x.selectedSkus.length === 1
            ? x.selectedSkus[0]
            : `${x.selectedSkus.length} SKUs • ${x.groupName || 'Combo / Series'}`
        )
      : (
          x.metric === 'SALES_RM'
            ? 'Total Sales'
            : x.metric === 'OUTLETS'
              ? 'Outlet Coverage'
              : 'No SKU'
        );

  const perSku =
    x.perSku && typeof x.perSku === 'object'
      ? Object.entries(x.perSku).sort((a,b) => b[1] - a[1])
      : [];

  return `
    <div class="card">
      <div class="row">
        <div>
          <span class="pill ${x.fulfilled ? 'green' : 'orange'}">
            ${esc(String(x.category || 'INCENTIVE').toUpperCase())}
          </span>

          <h3 style="margin:9px 0 5px">
            ${esc(x.name || 'Incentive')}
          </h3>

          <p class="muted">${esc(x.description || '')}</p>
        </div>

        <div style="text-align:right">
          <strong>${money(x.rewardRM)}</strong>
          <p class="muted">reward</p>
        </div>
      </div>

      <div class="status-strip">
        <span class="status-chip">${esc(skuText)}</span>
        <span class="status-chip">${esc(String(x.metric || ''))}</span>

        ${
          x.calculationRule === 'EACH_MIN'
            ? `<span class="status-chip">Each SKU ≥ ${n(x.eachSkuMinimum)}</span>`
            : ''
        }
      </div>

      <div style="margin-top:12px">
        ${progressBar(v)}
      </div>

      <div class="row" style="margin-top:8px">
        <small class="muted">Progress</small>
        <strong>${n(x.actual)} / ${n(x.target)}</strong>
      </div>

      <p class="muted" style="margin:8px 0 0">
        ${
          x.fulfilled
            ? '✓ Fulfilled • Earned ' + money(x.earnedRM)
            : n(x.remaining) + ' remaining'
        }
        • ${dateLabel(x.startDate)}
        → ${x.endDate ? dateLabel(x.endDate) : 'Open end'}
      </p>

      ${
        perSku.length > 1
          ? `
            <div class="list" style="margin-top:10px">
              ${perSku.map(([sku, val]) => `
                <div class="list-item">
                  <div class="row">
                    <span>${esc(sku)}</span>
                    <strong>${n(val)}</strong>
                  </div>
                </div>
              `).join('')}
            </div>`
          : ''
      }

      ${
        x.bannerFileId
          ? `<button class="btn secondary" data-banner="${esc(x.bannerFileId)}" style="margin-top:10px;width:100%">VIEW BANNER</button>`
          : ''
      }

      ${
        isManagerMode()
          ? `
            <div class="button-row" style="margin-top:10px">
              <button class="btn secondary" data-editinc="${esc(x.id || x.incentiveId || '')}">
                EDIT
              </button>
              <button class="btn danger" data-stopinc="${esc(x.id || x.incentiveId || '')}">
                DEACTIVATE
              </button>
            </div>`
          : ''
      }
    </div>`;
}

function personalTargetProgress(t) {
  const metric = String(t.Metric || t.metric || 'SALES_RM').toUpperCase();
  const target = n(t['Target Value'] || t.targetValue);

  let actual = 0;

  if (metric === 'SALES_RM') {
    actual = n(current?.performance?.achievement || current?.performance?.sales);
  } else if (metric === 'CARTONS') {
    actual = (current?.skuSales || []).reduce((a,x) => a + n(x.Cartons), 0);
  } else if (metric === 'SKU_SALES_RM') {
    const sku = String(t['SKU Name'] || t.skuName || '');
    actual = (current?.skuSales || [])
      .filter(x => !sku || String(x['SKU Name']) === sku)
      .reduce((a,x) => a + n(x['Sales Value']), 0);
  }

  return {
    target,
    actual,
    remaining: Math.max(0, target - actual),
    percent: target ? Math.min(100, actual / target * 100) : 0
  };
}

function teamUsers() {
  const fromSnapshot = (teamSnapshot || [])
    .map(x => ({
      id: String(x.staffId || x.id || x['Staff ID'] || ''),
      name: String(x.name || x.fullName || x['Full Name'] || x.staffId || '')
    }))
    .filter(x => x.id);

  if (fromSnapshot.length) {
    return [...new Map(fromSnapshot.map(x => [x.id, x])).values()];
  }

  return (D.users || [])
    .filter(x => String(x.role || '').toUpperCase() === 'SR')
    .map(x => ({
      id: String(x.id || ''),
      name: String(x.name || x.id || '')
    }))
    .filter(x => x.id);
}

function renderIncentives() {
  const list = current?.incentives || [];

  const managerForm = isManagerMode()
    ? `
      <div class="card">
        <p class="eyebrow">MANAGER INCENTIVE CONTROL</p>
        <h2>${editingIncentiveId ? 'Edit Incentive' : 'Create Incentive'}</h2>

        <form id="incForm" class="stack">

          <label>Incentive Name
            <input name="name" required placeholder="e.g. Basil Seed Push">
          </label>

          <label>Description
            <textarea name="description" rows="2"></textarea>
          </label>

          <div class="form-grid">
            <label>Category
              <select name="category">
                <option value="PRODUCT">Product</option>
                <option value="GROWTH">Growth</option>
                <option value="COVERAGE">Coverage</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label>Basis
              <select id="incBasis" name="basis">
                <option value="SINGLE_SKU">Single SKU</option>
                <option value="MULTI_SKU">Multi SKU / Combo</option>
                <option value="TOTAL_SALES">Total Sales</option>
                <option value="OUTLET_COVERAGE">Outlet Coverage</option>
              </select>
            </label>
          </div>

          <div id="incProductControls">
            <label>Search SKU
              <input id="incSkuSearch" placeholder="Search product">
            </label>

            <div id="incSkuResults" class="search-results"></div>

            <div class="row" style="margin-top:8px">
              <small class="muted">Selected SKU</small>
              <strong id="incSkuCount">0</strong>
            </div>

            <div id="incSkuChips" class="chip-wrap"></div>
          </div>

          <div id="incGroupWrap">
            <label>Combo / Group Name
              <input name="groupName" placeholder="e.g. Juice Series">
            </label>
          </div>

          <div class="form-grid">
            <label>Metric
              <select id="incMetric" name="metric">
                <option value="CARTONS">Cartons</option>
                <option value="SKU_SALES_RM">SKU Sales RM</option>
                <option value="SALES_RM">Total Sales RM</option>
                <option value="OUTLETS">Outlet Count</option>
              </select>
            </label>

            <label>Target
              <input name="target" type="number" min="0" step="0.01" required>
            </label>
          </div>

          <div id="incRuleWrap">
            <label>Calculation Rule
              <select id="incRule" name="calculationRule">
                <option value="COMBINED">Combined Total</option>
                <option value="EACH_MIN">Each SKU Minimum</option>
              </select>
            </label>
          </div>

          <div id="incEachMinWrap">
            <label>Minimum for Each SKU
              <input name="eachSkuMinimum" type="number" min="0" step="0.01">
            </label>
          </div>

          <div class="form-grid">
            <label>Reward RM
              <input name="reward" type="number" min="0" step="0.01" required>
            </label>

            <label>Scope
              <select id="incScope" name="scope">
                <option value="SPECIFIC">Specific SR</option>
                <option value="ALL">ALL SR</option>
              </select>
            </label>
          </div>

          <div id="incStaffWrap">
            <label>Assigned SR
              <select name="staffId">
                ${teamUsers().map(u => `
                  <option value="${esc(u.id)}" ${u.id === managerView ? 'selected' : ''}>
                    ${esc(u.name)} • ${esc(u.id)}
                  </option>
                `).join('')}
              </select>
            </label>
          </div>

          <div class="form-grid">
            <label>Start Date
              <input name="startDate" type="date" value="${selectedMonth + '-01'}">
            </label>

            <label>End Date
              <input name="endDate" type="date">
            </label>
          </div>

          <label>Banner
            <input name="banner" type="file" accept="image/*">
          </label>

          <button class="btn primary">
            ${editingIncentiveId ? 'UPDATE INCENTIVE' : 'CREATE INCENTIVE'}
          </button>
        </form>
      </div>`
    : '';

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">INCENTIVE CENTER</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">Live incentive progress based on actual database.</p>
      ${syncStatus()}
    </section>

    ${managerForm}

    <div class="section-title">
      <div>
        <p class="eyebrow">ACTIVE INCENTIVES</p>
        <h3>${list.length} incentive(s)</h3>
      </div>
    </div>

    <div class="list">
      ${list.length ? list.map(incentiveCard).join('') : empty('No active incentive.')}
    </div>

    ${personalTargetsSection()}
  `;

  bindCommon();

  $$('[data-banner]').forEach(b => {
    b.onclick = async () => {
      setBusy(true, 'Loading banner…');

      try {
        const r = await apiPost('downloadBanner', {
          fileId: b.dataset.banner
        });

        if (!r?.ok) throw new Error(r?.error || 'Banner unavailable');

        const a = document.createElement('a');
        a.href = `data:${r.mimeType || 'image/jpeg'};base64,${r.base64}`;
        a.download = r.fileName || 'incentive-banner.jpg';
        a.click();

      } catch (e) {
        toast(e.message, 3500);
      } finally {
        setBusy(false);
      }
    };
  });

  $$('[data-editinc]').forEach(b => {
    b.onclick = () => {
      editingIncentiveId = b.dataset.editinc;

      const x = list.find(z =>
        String(z.id || z.incentiveId || '') === editingIncentiveId
      );

      incentiveSelectedSkus = Array.isArray(x?.selectedSkus)
        ? [...x.selectedSkus]
        : [];

      render();
    };
  });

  $$('[data-stopinc]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Deactivate this incentive?')) return;

      setBusy(true, 'Updating incentive…');

      try {
        const r = await apiPost('setIncentiveStatus', {
          incentiveId: b.dataset.stopinc,
          status: 'INACTIVE'
        });

        if (!r?.ok) throw new Error(r?.error || 'Update failed');

        await loadCurrent({ quiet: true });
        toast('Incentive deactivated');
        render();

      } catch (e) {
        toast(e.message, 3500);
      } finally {
        setBusy(false);
      }
    };
  });

  if (isManagerMode()) {
    const scope = $('#incScope');

    if (scope) {
      scope.onchange = () => {
        $('#incStaffWrap').style.display =
          scope.value === 'ALL' ? 'none' : '';
      };

      scope.onchange();
    }

    const basis = $('#incBasis');
    const metric = $('#incMetric');
    const search = $('#incSkuSearch');
    const results = $('#incSkuResults');
    const chips = $('#incSkuChips');

    const paintPicker = () => {
      if (!results || !chips) return;

      const q = String(search?.value || '')
        .trim()
        .toLowerCase();

      const all = allSkuNames()
        .filter(x => !incentiveSelectedSkus.includes(x))
        .filter(x => !q || x.toLowerCase().includes(q))
        .slice(0,80);

      results.innerHTML = all.length
        ? all.map(x =>
            `<button type="button" class="search-result" data-addincsku="${esc(x)}" style="display:block;width:100%;text-align:left;background:transparent;color:inherit;border:0">＋ ${esc(x)}</button>`
          ).join('')
        : empty('No matching SKU');

      chips.innerHTML = incentiveSelectedSkus
        .map(x =>
          `<span class="chip">${esc(x)}<button type="button" data-rmincsku="${esc(x)}">×</button></span>`
        ).join('');

      if ($('#incSkuCount')) {
        $('#incSkuCount').textContent =
          String(incentiveSelectedSkus.length);
      }

      $$('[data-addincsku]').forEach(b => {
        b.onclick = () => {
          const max =
            basis?.value === 'SINGLE_SKU'
              ? 1
              : 100;

          if (incentiveSelectedSkus.length >= max) {
            if (max === 1) incentiveSelectedSkus = [];
            else return;
          }

          incentiveSelectedSkus.push(b.dataset.addincsku);
          paintPicker();
        };
      });

      $$('[data-rmincsku]').forEach(b => {
        b.onclick = () => {
          incentiveSelectedSkus =
            incentiveSelectedSkus.filter(
              x => x !== b.dataset.rmincsku
            );

          paintPicker();
        };
      });
    };

    const syncBasis = () => {
      if (!basis) return;

      const product =
        ['SINGLE_SKU','MULTI_SKU'].includes(basis.value);

      if ($('#incProductControls')) {
        $('#incProductControls').style.display =
          product ? '' : 'none';
      }

      if ($('#incGroupWrap')) {
        $('#incGroupWrap').style.display =
          basis.value === 'MULTI_SKU' ? '' : 'none';
      }

      if ($('#incRuleWrap')) {
        $('#incRuleWrap').style.display =
          basis.value === 'MULTI_SKU' ? '' : 'none';
      }

      if (basis.value === 'TOTAL_SALES') {
        if (metric) metric.value = 'SALES_RM';
      }

      if (basis.value === 'OUTLET_COVERAGE') {
        if (metric) metric.value = 'OUTLETS';
      }

      if (
        basis.value === 'SINGLE_SKU' &&
        incentiveSelectedSkus.length > 1
      ) {
        incentiveSelectedSkus =
          incentiveSelectedSkus.slice(0,1);
      }

      paintPicker();
    };

    if (basis) basis.onchange = syncBasis;
    if (search) search.oninput = paintPicker;

    if ($('#incRule')) {
      $('#incRule').onchange = e => {
        $('#incEachMinWrap').style.display =
          e.target.value === 'EACH_MIN' ? '' : 'none';
      };

      $('#incRule').onchange({
        target: $('#incRule')
      });
    }

    syncBasis();

    if ($('#incForm')) {
      $('#incForm').onsubmit = async e => {
        e.preventDefault();

        const fd = new FormData(e.target);
        const b = String(fd.get('basis') || 'SINGLE_SKU');

        let metricValue =
          String(fd.get('metric') || 'CARTONS');

        if (b === 'TOTAL_SALES') metricValue = 'SALES_RM';
        if (b === 'OUTLET_COVERAGE') metricValue = 'OUTLETS';

        if (
          b === 'SINGLE_SKU' &&
          incentiveSelectedSkus.length !== 1
        ) {
          return toast('Please select exactly 1 SKU');
        }

        if (
          b === 'MULTI_SKU' &&
          incentiveSelectedSkus.length < 2
        ) {
          return toast(
            'Please select at least 2 SKUs for combo / series'
          );
        }

        const file = fd.get('banner');

        setBusy(true, 'Creating incentive…');

        try {
          let bannerBase64 = '';
          let bannerFileName = '';
          let bannerMimeType = '';

          if (file instanceof File && file.size) {
            if (file.size > 3 * 1024 * 1024) {
              throw new Error('Banner must be under 3 MB');
            }

            bannerBase64 = await fileToBase64(file);
            bannerFileName = file.name;
            bannerMimeType = file.type;
          }

          const scopeValue =
            String(fd.get('scope'));

          const r = await apiPost('createIncentive', {
            incentiveId: editingIncentiveId || '',
            name: String(fd.get('name') || ''),
            description: String(fd.get('description') || ''),
            category: String(fd.get('category') || 'PRODUCT'),
            basis: b,
            metric: metricValue,
            selectedSkus: [...incentiveSelectedSkus],
            groupName: String(fd.get('groupName') || ''),
            calculationRule:
              String(fd.get('calculationRule') || 'COMBINED'),
            eachSkuMinimum:
              n(fd.get('eachSkuMinimum')),
            targetValue:
              n(fd.get('target')),
            rewardRM:
              n(fd.get('reward')),
            startDate:
              String(fd.get('startDate') || ''),
            endDate:
              String(fd.get('endDate') || ''),
            scope: scopeValue,
            assignedStaff:
              scopeValue === 'ALL'
                ? []
                : [String(fd.get('staffId') || managerView)],
            bannerBase64,
            bannerFileName,
            bannerMimeType
          });

          if (!r?.ok) {
            throw new Error(
              r?.error || 'Incentive save failed'
            );
          }

          const selectedStaff =
            scopeValue === 'ALL'
              ? managerView
              : String(fd.get('staffId') || managerView);

          if (scopeValue !== 'ALL') {
            managerView = selectedStaff;
            session.managerView = managerView;
            saveSession();
          }

          editingIncentiveId = null;

          await loadCurrent({
            quiet: true
          });

          toast(
            editingIncentiveId
              ? 'Incentive updated'
              : 'Incentive created'
          );

          render();

        } catch (err) {
          toast(err.message, 4000);
        } finally {
          setBusy(false);
        }
      };
    }

    bindPersonalTargetForm();
  }
}

/* =========================================================
   PERSONAL / ADDITIONAL TARGET
========================================================= */

function personalTargetsSection() {
  const list = current?.personalTargets || [];

  return `
    <div class="section-title">
      <h3>My Additional / Personal Target</h3>
    </div>

    <div class="card">
      <form id="personalTargetForm" class="stack">

        <label>Target Name
          <input name="name" required placeholder="e.g. My Extra Mango Target">
        </label>

        <label>Description
          <textarea name="description"></textarea>
        </label>

        <label>SKU (optional)
          <select name="skuName">
            <option value="">No specific SKU</option>
            ${allSkuNames().map(x =>
              `<option value="${esc(x)}">${esc(x)}</option>`
            ).join('')}
          </select>
        </label>

        <div class="form-grid">
          <label>Metric
            <select name="metric">
              <option value="SALES_RM">Total Sales RM</option>
              <option value="CARTONS">Cartons</option>
              <option value="SKU_SALES_RM">SKU Sales RM</option>
            </select>
          </label>

          <label>Target
            <input name="targetValue" type="number" min="0" step="0.01" required>
          </label>
        </div>

        <div class="form-grid">
          <label>Start Date
            <input name="startDate" type="date" value="${selectedMonth + '-01'}">
          </label>

          <label>End Date
            <input name="endDate" type="date">
          </label>
        </div>

        <button class="btn secondary">
          SAVE PERSONAL TARGET
        </button>
      </form>
    </div>

    <div class="list" style="margin-top:12px">
      ${
        list.length
          ? list.map(t => {
              const p = personalTargetProgress(t);

              return `
                <div class="list-item">
                  <div class="row">
                    <div>
                      <h4>${esc(t.Name)}</h4>
                      <p>${esc(t.Description || '')}</p>
                    </div>

                    <span class="pill ${
                      p.actual >= p.target && p.target
                        ? 'green'
                        : 'orange'
                    }">
                      ${p.actual.toFixed(1)} / ${p.target.toFixed(1)}
                    </span>
                  </div>

                  ${progressBar(p.percent)}

                  <p style="margin-top:7px">
                    ${p.remaining.toFixed(1)} remaining
                  </p>
                </div>`;
            }).join('')
          : empty('No personal target yet.')
      }
    </div>`;
}

function bindPersonalTargetForm() {
  const form = $('#personalTargetForm');

  if (!form) return;

  form.onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.target);

    setBusy(true, 'Saving personal target…');

    try {
      const r = await apiPost('savePersonalTarget', {
        month: selectedMonth,
        name: String(fd.get('name') || ''),
        description: String(fd.get('description') || ''),
        category: 'PERSONAL',
        skuName: String(fd.get('skuName') || ''),
        metric: String(fd.get('metric') || 'SALES_RM'),
        targetValue: n(fd.get('targetValue')),
        startDate: String(fd.get('startDate') || ''),
        endDate: String(fd.get('endDate') || '')
      });

      if (!r?.ok) {
        throw new Error(
          r?.error || 'Save failed'
        );
      }

      await loadCurrent({
        quiet: true
      });

      toast('Personal target saved');
      render();

    } catch (err) {
      toast(err.message, 3500);
    } finally {
      setBusy(false);
    }
  };
}

/* =========================================================
   PENALTIES
========================================================= */

function activePenalty(x) {
  return String(x.Status || 'ACTIVE').toUpperCase() === 'ACTIVE';
}

function renderPenalties() {
  const list = current?.penalties || [];

  const form = isManagerMode()
    ? `
      <div class="card">
        <p class="eyebrow">MANAGER / HR</p>
        <h2>Add Penalty</h2>

        <form id="penaltyForm" class="stack">

          <label>Assigned SR
            <select name="staffId">
              ${teamUsers().map(u => `
                <option value="${u.id}" ${u.id === managerView ? 'selected' : ''}>
                  ${esc(u.name)} • ${u.id}
                </option>
              `).join('')}
            </select>
          </label>

          <div class="form-grid">
            <label>Date
              <input name="date" type="date" value="${selectedDate}" required>
            </label>

            <label>Type
              <select name="type">
                <option>Late attendance</option>
                <option>Poor display</option>
                <option>Product unavailable</option>
                <option>Other company penalty</option>
              </select>
            </label>
          </div>

          <label>Reason
            <input name="reason" required>
          </label>

          <label>Description
            <textarea name="description"></textarea>
          </label>

          <label>Amount RM
            <input name="amount" type="number" min="0" step="0.01" required>
          </label>

          <button class="btn danger">
            ADD PENALTY
          </button>
        </form>
      </div>`
    : '';

  $('#mainContent').innerHTML = `
    ${monthBar()}

    ${form}

    <div class="section-title">
      <h3>Penalty History</h3>
    </div>

    <div class="list">
      ${
        list.length
          ? list.map(x => `
            <div class="list-item">
              <div class="row">
                <div>
                  <h4>${esc(x.Reason || x.Type || 'Penalty')}</h4>

                  <p>
                    ${dateLabel(x.Date)}
                    • ${esc(x.Type || '')}
                    ${
                      x.Description
                        ? '<br>' + esc(x.Description)
                        : ''
                    }
                  </p>
                </div>

                <div style="text-align:right">
                  <strong class="bad">
                    -${money(x.Amount)}
                  </strong>

                  <br>

                  <span class="pill ${activePenalty(x) ? 'red' : ''}">
                    ${esc(x.Status || 'ACTIVE')}
                  </span>
                </div>
              </div>

              ${
                isManagerMode() && activePenalty(x)
                  ? `<button class="btn secondary" data-voidpen="${esc(x['Penalty ID'])}" style="margin-top:8px">VOID PENALTY</button>`
                  : ''
              }
            </div>`).join('')
          : empty('No penalty record for this month.')
      }
    </div>`;

  bindCommon();

  if ($('#penaltyForm')) {
    $('#penaltyForm').onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(e.target);

      setBusy(true, 'Saving penalty…');

      try {
        const r = await apiPost('savePenalty', {
          staffId: String(fd.get('staffId')),
          date: String(fd.get('date')),
          type: String(fd.get('type')),
          reason: String(fd.get('reason')),
          description: String(fd.get('description') || ''),
          amount: n(fd.get('amount'))
        });

        if (!r?.ok) {
          throw new Error(
            r?.error || 'Penalty failed'
          );
        }

        managerView =
          String(fd.get('staffId'));

        await loadCurrent({
          quiet: true
        });

        toast('Penalty added');
        render();

      } catch (err) {
        toast(err.message, 3500);
      } finally {
        setBusy(false);
      }
    };
  }

  $$('[data-voidpen]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Void this penalty?')) return;

      const r = await apiPost('voidPenalty', {
        penaltyId: b.dataset.voidpen
      });

      if (r?.ok) {
        await loadCurrent({
          quiet: true
        });

        toast('Penalty voided');
        render();
      } else {
        toast(r?.error || 'Failed');
      }
    };
  });
}

/* =========================================================
   INCOME
========================================================= */

function incomeRow(label, value, cls = '') {
  return `
    <div class="row" style="padding:9px 0">
      <span class="muted">${esc(label)}</span>
      <strong class="${cls}">${money(value)}</strong>
    </div>`;
}

function renderIncome() {
  const x = current?.incomeSummary || {};

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">FINAL MONTHLY INCOME</p>

      <div class="salary-total">
        ${money(x.finalIncome)}
      </div>

      <p class="muted">
        Automatically calculated from sales, incentive and penalty.
      </p>
    </section>

    <div class="card" style="margin-top:12px">
      ${incomeRow('Basic Salary', x.baseSalary)}
      ${incomeRow('Fuel / Oil', x.fuel)}
      ${incomeRow('House Rent', x.houseRent)}
      ${incomeRow('Food Allowance', x.food)}
      ${incomeRow('Sales Commission', x.salesCommission)}
      ${incomeRow('Zero Sales Incentive', x.zeroSalesIncentive, 'good')}
      ${incomeRow('Product Incentive', x.productIncentive, 'good')}
      ${incomeRow('Other Incentive', x.otherIncentive, 'good')}
      ${incomeRow('Individual Incentive', x.individualIncentive, 'good')}

      <hr style="border:0;border-top:1px solid var(--line)">

      ${incomeRow('TOTAL INCENTIVE', x.totalIncentive, 'good')}
      ${incomeRow('PENALTY', -n(x.penalty), 'bad')}

      <hr style="border:0;border-top:1px solid var(--line)">

      ${incomeRow('FINAL SALARY / INCOME', x.finalIncome)}
    </div>

    <div class="mini-grid" style="margin-top:12px">
      <button class="btn secondary" data-page-go="incentives">
        🏆 INCENTIVE DETAILS
      </button>

      <button class="btn secondary" data-page-go="penalties">
        − PENALTY HISTORY
      </button>
    </div>`;

  bindCommon();
}

/* =========================================================
   IMPORTANT WORK / PERSONAL REMINDER
========================================================= */

function renderTasks() {
  const tasks = current?.tasks || [];

  const canAssignTeam = isManagerMode();

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">IMPORTANT WORK</p>
      <h3>Task & Personal Reminder</h3>
      <p class="muted">
        Keep meetings, buyer follow-up and important work in one place.
      </p>
      ${syncStatus()}
    </section>

    <div class="card">
      <form id="taskForm" class="stack">

        ${
          canAssignTeam
            ? `
              <label>Assign To
                <select name="staffId" id="taskStaff">
                  <option value="${esc(session.id)}">MYSELF • ${esc(sessionName())}</option>
                  <option value="ALL">ALL SR</option>
                  ${teamUsers().map(u => `
                    <option value="${esc(u.id)}">
                      ${esc(u.name)} • ${esc(u.id)}
                    </option>
                  `).join('')}
                </select>
              </label>`
            : `
              <input type="hidden" name="staffId" value="${esc(session.id)}">
            `
        }

        <label>Title
          <input name="title" required placeholder="e.g. Buyer Meeting / Follow-up">
        </label>

        <label>Instruction / Note
          <textarea name="instruction" rows="3" placeholder="Important details"></textarea>
        </label>

        <div class="form-grid">
          <label>Due Date
            <input name="due" type="date" value="${localDate()}">
          </label>

          <label>Due Time
            <input name="dueTime" type="time">
          </label>
        </div>

        <div class="form-grid">
          <label>Priority
            <select name="priority">
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          <label>Type
            <select name="source">
              <option value="OWN">My Reminder</option>
              <option value="MEETING">Meeting</option>
              <option value="BUYER">Buyer Follow-up</option>
              <option value="OUTLET">Outlet Work</option>
              <option value="MANAGER">Manager Assigned</option>
            </select>
          </label>
        </div>

        <label>Outlet (optional)
          <select name="outletName">
            ${outletOptions()}
          </select>
        </label>

        <label style="display:flex;align-items:center;gap:8px">
          <input name="reminderEnabled" type="checkbox" checked style="width:auto">
          Push reminder enabled
        </label>

        <button class="btn primary">
          SAVE IMPORTANT WORK
        </button>
      </form>
    </div>

    <div class="section-title">
      <div>
        <p class="eyebrow">WORK LIST</p>
        <h3>${tasks.length} item(s)</h3>
      </div>
    </div>

    <div class="list">
      ${
        tasks.length
          ? tasks.map(t => {
              const done =
                String(t.Status || '').toUpperCase() === 'DONE';

              const source =
                String(t.Source || 'OWN').toUpperCase();

              return `
                <div class="card">
                  <div class="row">
                    <div>
                      <span class="pill ${done ? 'green' : source === 'OWN' ? '' : 'orange'}">
                        ${done ? 'DONE' : esc(source)}
                      </span>

                      <h3 style="margin:8px 0 3px">
                        ${esc(t.Title || 'Important Work')}
                      </h3>

                      <p class="muted">
                        ${dateLabel(t['Due Date'])}
                        ${t['Due Time'] ? ' • ' + esc(t['Due Time']) : ''}
                        • ${esc(t.Priority || 'NORMAL')}
                      </p>
                    </div>

                    ${
                      !done
                        ? `<button class="btn secondary" data-taskdone="${esc(t['Task ID'])}">DONE</button>`
                        : '✓'
                    }
                  </div>

                  ${
                    t.Instruction
                      ? `<p style="margin-top:8px">${esc(t.Instruction)}</p>`
                      : ''
                  }

                  ${
                    t['Outlet Name']
                      ? `<p class="muted" style="margin-top:5px">🏪 ${esc(t['Outlet Name'])}</p>`
                      : ''
                  }
                </div>`;
            }).join('')
          : empty('No important work yet.')
      }
    </div>`;

  bindCommon();

  $('#taskForm').onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.target);

    const target =
      String(fd.get('staffId') || session.id);

    setBusy(true, 'Saving important work…');

    try {
      if (target === 'ALL' && isManagerMode()) {
        const users = teamUsers();

        for (const u of users) {
          const r = await apiPost('saveTask', {
            staffId: u.id,
            title: String(fd.get('title') || ''),
            instruction: String(fd.get('instruction') || ''),
            due: String(fd.get('due') || ''),
            dueTime: String(fd.get('dueTime') || ''),
            priority: String(fd.get('priority') || 'NORMAL'),
            source: 'MANAGER',
            outletName: String(fd.get('outletName') || ''),
            reminderEnabled: fd.get('reminderEnabled') === 'on'
          });

          if (!r?.ok) {
            throw new Error(
              r?.error || `Task failed for ${u.id}`
            );
          }
        }

        toast(`Important Work assigned to ${users.length} SR`);

      } else {
        const own =
          normalizeId(target) === normalizeId(session.id);

        const r = await apiPost('saveTask', {
          staffId: target,
          title: String(fd.get('title') || ''),
          instruction: String(fd.get('instruction') || ''),
          due: String(fd.get('due') || ''),
          dueTime: String(fd.get('dueTime') || ''),
          priority: String(fd.get('priority') || 'NORMAL'),
          source: own
            ? String(fd.get('source') || 'OWN')
            : 'MANAGER',
          outletName: String(fd.get('outletName') || ''),
          reminderEnabled: fd.get('reminderEnabled') === 'on'
        });

        if (!r?.ok) {
          throw new Error(
            r?.error || 'Task save failed'
          );
        }

        toast(
          own
            ? 'Personal reminder saved'
            : 'Important Work assigned'
        );
      }

      await loadCurrent({
        quiet: true
      });

      render();

    } catch (err) {
      toast(err.message, 4000);
    } finally {
      setBusy(false);
    }
  };

  $$('[data-taskdone]').forEach(b => {
    b.onclick = async () => {
      setBusy(true, 'Completing task…');

      try {
        const r = await apiPost('completeTask', {
          taskId: b.dataset.taskdone
        });

        if (!r?.ok) {
          throw new Error(
            r?.error || 'Task completion failed'
          );
        }

        await loadCurrent({
          quiet: true
        });

        toast('Task completed');
        render();

      } catch (e) {
        toast(e.message, 3500);
      } finally {
        setBusy(false);
      }
    };
  });
}

/* =========================================================
   SUMMARY
========================================================= */

function renderSummary() {
  const p = current?.performance || {};
  const orders = current?.executionOrders || [];
  const tasks = current?.tasks || [];
  const zero = current?.zeroOutlets || [];
  const inc = current?.incentives || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">PERFORMANCE SUMMARY</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">${esc(viewedId())} • ${esc(monthName(selectedMonth))}</p>
      ${syncStatus()}
    </section>

    <div class="metric-grid">
      ${metricCard('Target', money(p.target || 0))}
      ${metricCard('Delivered', money(p.achievement || p.sales || 0))}
      ${metricCard('Achievement', pct(p.percent || p.achievementPercent || 0))}
      ${metricCard('Shortfall', money(p.shortfall || 0))}
      ${metricCard('Orders', String(orders.length))}
      ${metricCard('Zero Outlet', String(zero.length))}
      ${metricCard('Tasks', String(tasks.length))}
      ${metricCard('Incentives', String(inc.length))}
    </div>

    <div class="card" style="margin-top:12px">
      <h3>Database Snapshot</h3>

      <div class="list" style="margin-top:10px">
        <div class="list-item">
          <div class="row">
            <span>Outlet Master</span>
            <strong>${routeOutlets().length}</strong>
          </div>
        </div>

        <div class="list-item">
          <div class="row">
            <span>SKU Master</span>
            <strong>${skuMaster().length}</strong>
          </div>
        </div>

        <div class="list-item">
          <div class="row">
            <span>Outlet Sales Records</span>
            <strong>${(current?.outletSales || []).length}</strong>
          </div>
        </div>

        <div class="list-item">
          <div class="row">
            <span>SKU Sales Records</span>
            <strong>${(current?.skuSales || []).length}</strong>
          </div>
        </div>
      </div>
    </div>`;
    
  bindCommon();
}

/* =========================================================
   OPPORTUNITY ENGINE
========================================================= */

function renderOpportunity() {
  const list =
    current?.opportunities ||
    current?.opportunity ||
    [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">OPPORTUNITY ENGINE</p>
      <h3>Where Should I Focus?</h3>
      <p class="muted">
        Uses current incentive, SKU movement and outlet performance.
      </p>
      ${syncStatus()}
    </section>

    <div class="list">
      ${
        list.length
          ? list.map(i => `
            <div class="card">
              <div class="row">
                <div>
                  <h3>${esc(i.name || i.incentiveName || 'Opportunity')}</h3>
                  <p class="muted">
                    ${esc(i.description || '')}
                  </p>
                </div>

                <strong>
                  ${n(i.actual)} / ${n(i.target)}
                </strong>
              </div>

              ${progressBar(i.percent || (i.target ? i.actual / i.target * 100 : 0))}

              <div class="status-strip">
                <span class="status-chip">
                  ${(i.selectedSkus || []).length} SKU(s)
                </span>

                <span class="status-chip">
                  ${esc(i.metric || '')}
                </span>
              </div>

              <div class="list" style="margin-top:12px">
                ${(i.outlets || []).slice(0,80).map(o => `
                  <div class="list-item">
                    <div class="row">
                      <div>
                        <h4>${esc(o.outletName)}</h4>
                        <p>
                          ${n(o.value ?? o.cartons)}
                          ${i.metric === 'CARTONS' ? 'CTN' : ''}
                          • ${esc(o.category || '')}
                        </p>
                      </div>

                      <span class="pill ${
                        o.status === 'HIGH_OPPORTUNITY'
                          ? 'red'
                          : o.status === 'OPPORTUNITY'
                            ? 'orange'
                            : 'green'
                      }">
                        ${
                          o.status === 'HIGH_OPPORTUNITY'
                            ? '🔴 HIGH'
                            : o.status === 'OPPORTUNITY'
                              ? '🟠 OPPORTUNITY'
                              : '🟢 PERFORMING'
                        }
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')
          : empty(
              'Opportunity Engine becomes active when a product/combination incentive is running.'
            )
      }
    </div>`;

  bindCommon();
}

/* =========================================================
   ACTIVITY TIMELINE
========================================================= */

function renderActivity() {
  const list = current?.activity || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">PROOF / HISTORY</p>
      <h3>Activity Timeline</h3>
      <p class="muted">
        Sales, tasks, incentive, penalty and important records with date/time.
      </p>
    </section>

    <div class="notification-list">
      ${
        list.length
          ? list.map(x => `
            <div class="notification-item">
              <div class="notification-icon">
                ${activityIcon(x.Type)}
              </div>

              <div style="flex:1">
                <div class="row">
                  <h4>${esc(x.Title || x.Type || 'Activity')}</h4>

                  ${
                    n(x.Amount)
                      ? `<strong class="${n(x.Amount) < 0 ? 'bad' : 'good'}">
                          ${n(x.Amount) < 0 ? '-' : ''}
                          ${money(Math.abs(n(x.Amount)))}
                        </strong>`
                      : ''
                  }
                </div>

                <p>
                  ${esc(x.Description || '')}
                  <br>
                  ${esc(String(x.Timestamp || x.Date || ''))}
                </p>
              </div>
            </div>
          `).join('')
          : empty('No activity record for this month.')
      }
    </div>`;

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

    r.onload = () =>
      resolve(
        String(r.result || '')
          .split(',')
          .pop() || ''
      );

    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function renderProposal() {
  const list = current?.proposals || current?.proposalForms || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">PROPOSAL ORDER FORM</p>
      <h3>PO / Proposal Files</h3>
      <p class="muted">
        Manager can upload proposal/order documents for field use.
      </p>
      ${syncStatus()}
    </section>

    ${
      isManagerMode()
        ? `
          <form id="proposalForm" class="card">
            <label>Title
              <input name="title" required placeholder="Proposal / Order Form">
            </label>

            <label>Note
              <textarea name="note" rows="2"></textarea>
            </label>

            <label>File
              <input name="file" type="file" required>
            </label>

            <button class="btn primary">
              UPLOAD FILE
            </button>
          </form>`
        : ''
    }

    <div class="list" style="margin-top:12px">
      ${
        list.length
          ? list.map(x => `
            <div class="card">
              <div class="row">
                <div>
                  <h3>${esc(x.Title || x.title || x['File Name'] || 'Proposal')}</h3>

                  <p class="muted">
                    ${esc(x.Note || x.note || '')}
                    ${
                      x['Uploaded At']
                        ? '<br>' + esc(String(x['Uploaded At']))
                        : ''
                    }
                  </p>
                </div>

                <button class="btn secondary" data-proposal-download="${esc(x['Form ID'] || x.id || '')}">
                  DOWNLOAD
                </button>
              </div>
            </div>
          `).join('')
          : empty('No proposal file.')
      }
    </div>`;

  bindCommon();

  if ($('#proposalForm')) {
    $('#proposalForm').onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(e.target);
      const file = fd.get('file');

      if (!(file instanceof File) || !file.size) {
        return toast('Select a file');
      }

      if (file.size > 6 * 1024 * 1024) {
        return toast('File must be under 6 MB');
      }

      setBusy(true, 'Uploading proposal…');

      try {
        const base64 =
          await fileToBase64(file);

        const r = await apiPost('uploadProposal', {
          title: String(fd.get('title') || ''),
          note: String(fd.get('note') || ''),
          fileName: file.name,
          mimeType:
            file.type ||
            'application/octet-stream',
          base64
        });

        if (!r?.ok) {
          throw new Error(
            r?.error || 'Upload failed'
          );
        }

        await loadCurrent({
          quiet: true
        });

        toast('Proposal uploaded');
        render();

      } catch (e) {
        toast(e.message, 4000);
      } finally {
        setBusy(false);
      }
    };
  }

  $$('[data-proposal-download]').forEach(b => {
    b.onclick = async () => {
      setBusy(true, 'Downloading file…');

      try {
        const r = await apiPost('downloadProposal', {
          formId: b.dataset.proposalDownload
        });

        if (!r?.ok) {
          throw new Error(
            r?.error || 'Download failed'
          );
        }

        const a =
          document.createElement('a');

        a.href =
          `data:${r.mimeType || 'application/octet-stream'};base64,${r.base64}`;

        a.download =
          r.fileName || 'proposal-file';

        a.click();

      } catch (e) {
        toast(e.message, 4000);
      } finally {
        setBusy(false);
      }
    };
  });
}

/* =========================================================
   TEAM MANAGER
========================================================= */

function renderTeam() {
  if (!isManagerMode()) {
    return renderDashboard();
  }

  const list =
    Array.isArray(teamSnapshot)
      ? teamSnapshot
      : [];

  const teamTarget =
    list.reduce(
      (a,x) =>
        a + n(
          x.target ||
          x.performance?.target
        ),
      0
    );

  const teamSales =
    list.reduce(
      (a,x) =>
        a + n(
          x.sales ||
          x.achievement ||
          x.performance?.achievement ||
          x.performance?.sales
        ),
      0
    );

  const teamShortfall =
    Math.max(
      0,
      teamTarget - teamSales
    );

  const teamPercent =
    teamTarget
      ? teamSales / teamTarget * 100
      : 0;

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">ALL SR — MY TEAM</p>
      <h2>Manager Dashboard</h2>
      <p class="muted">
        Live team performance • ${esc(monthName(selectedMonth))}
      </p>
      ${syncStatus()}
    </section>

    <div class="metric-grid">
      ${metricCard('Team Target', money(teamTarget))}
      ${metricCard('Delivered Sales', money(teamSales))}
      ${metricCard('Achievement', pct(teamPercent))}
      ${metricCard('Shortfall', money(teamShortfall))}
      ${metricCard('Active SR', String(list.length))}
    </div>

    <div class="card" style="margin-top:12px">
      <div class="row">
        <div>
          <p class="eyebrow">TEAM PROGRESS</p>
          <h3>${pct(teamPercent)}</h3>
        </div>

        <button id="teamRefresh" class="mini-btn">
          ↻ REFRESH
        </button>
      </div>

      ${progressBar(teamPercent)}
    </div>

    <div class="section-title">
      <div>
        <p class="eyebrow">SR PERFORMANCE</p>
        <h3>${list.length} active SR</h3>
      </div>
    </div>

    <div class="list">
      ${
        list.length
          ? list.map(x => {
              const p =
                x.performance || x;

              const id =
                x.staffId ||
                x.id ||
                x['Staff ID'] ||
                '';

              const name =
                x.name ||
                x.fullName ||
                x['Full Name'] ||
                id;

              const target =
                n(p.target);

              const sales =
                n(
                  p.achievement ||
                  p.sales
                );

              const percent =
                n(
                  p.percent ||
                  p.achievementPercent ||
                  (
                    target
                      ? sales / target * 100
                      : 0
                  )
                );

              const shortfall =
                Math.max(
                  0,
                  target - sales
                );

              return `
                <div class="card">
                  <div class="row">
                    <div>
                      <span class="pill ${percent >= 100 ? 'green' : percent >= 70 ? 'orange' : 'red'}">
                        ${pct(percent)}
                      </span>

                      <h3 style="margin:8px 0 3px">
                        ${esc(name)}
                      </h3>

                      <p class="muted">
                        ${esc(id)}
                      </p>
                    </div>

                    <div style="text-align:right">
                      <strong>${money(sales)}</strong>
                      <p class="muted">
                        of ${money(target)}
                      </p>
                    </div>
                  </div>

                  ${progressBar(percent)}

                  <div class="status-strip" style="margin-top:8px">
                    <span class="status-chip">
                      Shortfall ${money(shortfall)}
                    </span>

                    <span class="status-chip">
                      Zero ${n(p.zeroOutlets || p.zeroOutletCount || 0)}
                    </span>

                    <span class="status-chip">
                      Tasks ${n(p.pendingTasks || 0)}
                    </span>
                  </div>

                  <div class="button-row" style="margin-top:10px">
                    <button class="btn secondary" data-openstaff="${esc(id)}" data-openpage="dashboard">
                      OPEN DASHBOARD
                    </button>

                    <button class="btn secondary" data-openstaff="${esc(id)}" data-openpage="summary">
                      SEE DATABASE
                    </button>
                  </div>
                </div>`;
            }).join('')
          : empty('No team data loaded.')
      }
    </div>`;

  bindCommon();

  $('#teamRefresh').onclick = async () => {
    await loadTeam();
    render();
  };

  $$('[data-openstaff]').forEach(b => {
    b.onclick = async () => {
      managerView =
        b.dataset.openstaff;

      session.managerView =
        managerView;

      saveSession();

      await loadCurrent();

      page =
        b.dataset.openpage ||
        'summary';

      render();
    };
  });
}
/* =========================================================
   NOTIFICATIONS
========================================================= */

function renderNotifications() {
  const alerts = alertsForCurrent();
  const historyList =
    current?.notifications ||
    current?.notificationHistory ||
    [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">NOTIFICATION CENTER</p>
      <h3>Alerts & Reminders</h3>
      <p class="muted">
        Target, task, CPO, delivery and incentive alerts.
      </p>
      ${syncStatus()}
    </section>

    <div class="card">
      <div class="row">
        <div>
          <h3>Mobile Push</h3>
          <p class="muted">
            ${pushConfig.ready ? 'Push system ready' : 'Push permission/setup required'}
          </p>
        </div>

        <button id="enablePushBtn" class="btn secondary">
          ENABLE
        </button>
      </div>
    </div>

    <div class="section-title">
      <h3>Action Required</h3>
    </div>

    <div class="notification-list">
      ${
        alerts.length
          ? alerts.map(x => `
            <button class="notification-item" data-page-go="${esc(x.page)}" style="width:100%;text-align:left">
              <div class="notification-icon">
                ${activityIcon(x.type)}
              </div>

              <div style="flex:1">
                <h4>${esc(x.title)}</h4>
                <p>${esc(x.text)}</p>
              </div>

              <span>›</span>
            </button>
          `).join('')
          : empty('No urgent notification.')
      }
    </div>

    <div class="section-title">
      <h3>Notification History</h3>
    </div>

    <div class="notification-list">
      ${
        historyList.length
          ? historyList.map(x => `
            <div class="notification-item">
              <div class="notification-icon">🔔</div>

              <div style="flex:1">
                <h4>${esc(x.Title || x.title || 'Notification')}</h4>

                <p>
                  ${esc(x.Message || x.message || '')}
                  <br>
                  ${esc(String(x.Timestamp || x.timestamp || x.Date || ''))}
                </p>
              </div>
            </div>
          `).join('')
          : empty('No notification history.')
      }
    </div>`;

  bindCommon();

  if ($('#enablePushBtn')) {
    $('#enablePushBtn').onclick = enablePushPermission;
  }
}

/* =========================================================
   ONESIGNAL PUSH
========================================================= */

async function initPushSystem() {
  if (!backendUrl() || !window.OneSignalDeferred) return;

  try {
    const r =
      await fetchJson(
        backendUrl() + '?action=publicConfig'
      );

    const cfg =
      r?.data || {};

    pushConfig = {
      configured: !!cfg.pushConfigured,
      appId: String(cfg.oneSignalAppId || ''),
      ready: false
    };

    if (!pushConfig.appId) return;

    const path =
      location.pathname.endsWith('/')
        ? location.pathname
        : location.pathname.replace(/[^/]+$/, '');

    const workerPath =
      path.replace(/^\//, '') +
      'push/onesignal/OneSignalSDKWorker.js';

    window.OneSignalDeferred.push(
      async OneSignal => {
        try {
          await OneSignal.init({
            appId: pushConfig.appId,
            serviceWorkerPath: workerPath,
            serviceWorkerParam: {
              scope: path + 'push/onesignal/'
            }
          });

          oneSignalSdk =
            OneSignal;

          pushConfig.ready =
            true;

          if (session) {
            await OneSignal.login(
              session.id
            );
          }

        } catch (e) {
          console.warn(
            'OneSignal',
            e
          );
        }
      }
    );

  } catch (e) {
    console.warn(
      'Push config',
      e
    );
  }
}

async function enablePushPermission() {
  try {
    if (!oneSignalSdk) {
      await initPushSystem();
      await sleep(1000);
    }

    if (!oneSignalSdk) {
      return toast(
        'Push service is not configured yet.',
        3500
      );
    }

    if (
      oneSignalSdk.Notifications?.requestPermission
    ) {
      await oneSignalSdk.Notifications.requestPermission();
    }

    if (session) {
      await oneSignalSdk.login(
        session.id
      );
    }

    pushConfig.ready = true;

    toast(
      'Mobile notification enabled'
    );

    render();

  } catch (e) {
    toast(
      'Notification permission was not enabled.',
      3500
    );
  }
}

/* =========================================================
   TEAM MANAGEMENT
========================================================= */

function renderTeamManagement() {
  if (!isManagerMode()) {
    return renderDashboard();
  }

  const users =
    current?.users ||
    current?.teamUsers ||
    teamUsers();

  $('#mainContent').innerHTML = `
    <section class="hero">
      <p class="eyebrow">TEAM MANAGEMENT</p>
      <h3>SR Management</h3>
      <p class="muted">
        Add, edit or deactivate team members without changing app code.
      </p>
      ${syncStatus()}
    </section>

    <form id="teamUserForm" class="card">
      <input type="hidden" name="originalStaffId">

      <label>Staff ID
        <input name="staffId" required placeholder="Staff ID">
      </label>

      <label>Full Name
        <input name="fullName" required placeholder="Full Name">
      </label>

      <label>Route / Area
        <input name="route" placeholder="Route / Area">
      </label>

      <div class="form-grid">
        <label>Role
          <select name="role">
            <option value="SR">SR</option>
            <option value="MANAGER">Manager</option>
            <option value="HR">HR</option>
          </select>
        </label>

        <label>Status
          <select name="active">
            <option value="TRUE">Active</option>
            <option value="FALSE">Inactive</option>
          </select>
        </label>
      </div>

      <label>Password / Initial PIN
        <input name="password" type="text" placeholder="Initial PIN">
      </label>

      <button class="btn primary">
        SAVE TEAM MEMBER
      </button>
    </form>

    <div class="section-title">
      <h3>Team Members</h3>
    </div>

    <div class="list">
      ${
        users.length
          ? users.map(u => {
              const id =
                u['Staff ID'] ||
                u.staffId ||
                u.id ||
                '';

              const name =
                u['Full Name'] ||
                u.fullName ||
                u.name ||
                id;

              const active =
                String(
                  u.Active ??
                  u.active ??
                  'TRUE'
                ).toUpperCase() !== 'FALSE';

              return `
                <div class="card">
                  <div class="row">
                    <div>
                      <span class="pill ${active ? 'green' : 'red'}">
                        ${active ? 'ACTIVE' : 'INACTIVE'}
                      </span>

                      <h3 style="margin:8px 0 3px">
                        ${esc(name)}
                      </h3>

                      <p class="muted">
                        ${esc(id)}
                        • ${esc(u.Role || u.role || 'SR')}
                        • ${esc(u.Route || u.route || '')}
                      </p>
                    </div>

                    <button
                      class="btn secondary"
                      data-edit-user="${esc(id)}">
                      EDIT
                    </button>
                  </div>
                </div>`;
            }).join('')
          : empty('No team member found.')
      }
    </div>`;

  bindCommon();

  $('#teamUserForm').onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(e.target);

      setBusy(
        true,
        'Saving team member…'
      );

      try {
        const r =
          await apiPost(
            'saveUser',
            {
              originalStaffId:
                String(
                  fd.get(
                    'originalStaffId'
                  ) || ''
                ),

              staffId:
                normalizeId(
                  fd.get('staffId')
                ),

              fullName:
                String(
                  fd.get('fullName') ||
                  ''
                ),

              route:
                String(
                  fd.get('route') ||
                  ''
                ),

              role:
                String(
                  fd.get('role') ||
                  'SR'
                ),

              password:
                String(
                  fd.get('password') ||
                  ''
                ),

              active:
                String(
                  fd.get('active') ||
                  'TRUE'
                )
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Team member save failed'
          );
        }

        await Promise.all([
          loadCurrent({
            quiet: true
          }),

          loadTeam({
            quiet: true
          })
        ]);

        toast(
          'Team member saved'
        );

        render();

      } catch (err) {
        toast(
          err.message,
          4000
        );
      } finally {
        setBusy(false);
      }
    };

  $$('[data-edit-user]').forEach(
    b => {
      b.onclick = () => {
        const id =
          b.dataset.editUser;

        const u =
          users.find(x =>
            String(
              x['Staff ID'] ||
              x.staffId ||
              x.id ||
              ''
            ) === id
          );

        if (!u) return;

        const f =
          $('#teamUserForm');

        f.elements.originalStaffId.value =
          id;

        f.elements.staffId.value =
          id;

        f.elements.fullName.value =
          u['Full Name'] ||
          u.fullName ||
          u.name ||
          '';

        f.elements.route.value =
          u.Route ||
          u.route ||
          '';

        f.elements.role.value =
          String(
            u.Role ||
            u.role ||
            'SR'
          ).toUpperCase();

        f.elements.active.value =
          String(
            u.Active ??
            u.active ??
            'TRUE'
          ).toUpperCase() === 'FALSE'
            ? 'FALSE'
            : 'TRUE';

        f.elements.password.value =
          '';

        f.scrollIntoView({
          behavior: 'smooth'
        });
      };
    }
  );
}

/* =========================================================
   AYON AI KNOWLEDGE MANAGER
========================================================= */

let ayonKnowledgeCache = [];

async function loadAyonKnowledge() {
  if (!session || !isManager()) return [];

  try {
    const r =
      await apiPost(
        'aiKnowledgeList',
        {}
      );

    if (!r?.ok) {
      throw new Error(
        r?.error ||
        'Knowledge load failed'
      );
    }

    ayonKnowledgeCache =
      Array.isArray(r.data)
        ? r.data
        : [];

    return ayonKnowledgeCache;

  } catch (e) {
    console.warn(
      'AYON Knowledge',
      e
    );

    ayonKnowledgeCache = [];
    return [];
  }
}

function renderAyonKnowledgeManager() {
  if (!isManagerMode()) return '';

  return `
    <div class="card" style="margin-top:12px">
      <div class="row">
        <div>
          <p class="eyebrow">AYON AI CONTROL</p>
          <h3>Knowledge Manager</h3>
          <p class="muted">
            Teach AYON AI your own questions, instructions and answers.
          </p>
        </div>

        <span class="pill orange">
          MANAGER
        </span>
      </div>

      <form id="aiKnowledgeForm" class="stack" style="margin-top:12px">
        <input type="hidden" name="id">

        <label>Question / Keywords
          <input
            name="question"
            required
            placeholder="e.g. buyer order না দিলে কী করব">
        </label>

        <label>Answer / Instruction
          <textarea
            name="answer"
            rows="4"
            required
            placeholder="AYON AI কী উত্তর দেবে লিখুন"></textarea>
        </label>

        <div class="form-grid">
          <label>Tone
            <select name="tone">
              <option value="NORMAL">Normal</option>
              <option value="FUNNY">Funny</option>
              <option value="MOTIVATIONAL">Motivational</option>
              <option value="STRICT-FUNNY">Strict-Funny</option>
            </select>
          </label>

          <label>Status
            <select name="active">
              <option value="TRUE">Active</option>
              <option value="FALSE">Inactive</option>
            </select>
          </label>
        </div>

        <div class="button-row">
          <button class="btn primary">
            SAVE KNOWLEDGE
          </button>

          <button
            id="clearAiKnowledgeForm"
            type="button"
            class="btn secondary">
            CLEAR
          </button>
        </div>
      </form>

      <div id="aiKnowledgeList" class="list" style="margin-top:12px">
        ${empty('Loading AYON AI knowledge…')}
      </div>
    </div>`;
}

function paintAyonKnowledge() {
  const box =
    $('#aiKnowledgeList');

  if (!box) return;

  box.innerHTML =
    ayonKnowledgeCache.length
      ? ayonKnowledgeCache.map(x => {
          const id =
            x.ID ||
            x.id ||
            '';

          const q =
            x['Question / Keywords'] ||
            x.question ||
            '';

          const a =
            x.Answer ||
            x.answer ||
            '';

          const tone =
            x.Tone ||
            x.tone ||
            'NORMAL';

          const active =
            String(
              x.Active ??
              x.active ??
              'TRUE'
            ).toUpperCase() !== 'FALSE';

          return `
            <div class="list-item">
              <div class="row">
                <div style="flex:1">
                  <span class="pill ${active ? 'green' : 'red'}">
                    ${active ? 'ACTIVE' : 'INACTIVE'}
                  </span>

                  <h4 style="margin-top:7px">
                    ${esc(q)}
                  </h4>

                  <p>
                    ${esc(a)}
                  </p>

                  <small class="muted">
                    Tone: ${esc(tone)}
                  </small>
                </div>
              </div>

              <div class="button-row" style="margin-top:8px">
                <button
                  class="btn secondary"
                  data-ai-edit="${esc(id)}">
                  EDIT
                </button>

                <button
                  class="btn danger"
                  data-ai-delete="${esc(id)}">
                  DELETE
                </button>
              </div>
            </div>`;
        }).join('')
      : empty(
          'No AYON AI knowledge added yet.'
        );

  $$('[data-ai-edit]').forEach(
    b => {
      b.onclick = () => {
        const x =
          ayonKnowledgeCache.find(
            z =>
              String(
                z.ID ||
                z.id ||
                ''
              ) ===
              String(
                b.dataset.aiEdit
              )
          );

        if (!x) return;

        const f =
          $('#aiKnowledgeForm');

        f.elements.id.value =
          x.ID ||
          x.id ||
          '';

        f.elements.question.value =
          x['Question / Keywords'] ||
          x.question ||
          '';

        f.elements.answer.value =
          x.Answer ||
          x.answer ||
          '';

        f.elements.tone.value =
          x.Tone ||
          x.tone ||
          'NORMAL';

        f.elements.active.value =
          String(
            x.Active ??
            x.active ??
            'TRUE'
          ).toUpperCase() === 'FALSE'
            ? 'FALSE'
            : 'TRUE';

        f.scrollIntoView({
          behavior: 'smooth'
        });
      };
    }
  );

  $$('[data-ai-delete]').forEach(
    b => {
      b.onclick = async () => {
        if (
          !confirm(
            'Delete this AYON AI knowledge?'
          )
        ) return;

        setBusy(
          true,
          'Deleting AI knowledge…'
        );

        try {
          const r =
            await apiPost(
              'deleteAiKnowledge',
              {
                id:
                  b.dataset.aiDelete
              }
            );

          if (!r?.ok) {
            throw new Error(
              r?.error ||
              'Delete failed'
            );
          }

          await loadAyonKnowledge();
          paintAyonKnowledge();

          toast(
            'AYON AI knowledge deleted'
          );

        } catch (e) {
          toast(
            e.message,
            3500
          );
        } finally {
          setBusy(false);
        }
      };
    }
  );
}

function bindAyonKnowledgeManager() {
  const f =
    $('#aiKnowledgeForm');

  if (!f) return;

  f.onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(e.target);

      setBusy(
        true,
        'Saving AYON AI knowledge…'
      );

      try {
        const r =
          await apiPost(
            'saveAiKnowledge',
            {
              id:
                String(
                  fd.get('id') ||
                  ''
                ),

              question:
                String(
                  fd.get('question') ||
                  ''
                ),

              answer:
                String(
                  fd.get('answer') ||
                  ''
                ),

              tone:
                String(
                  fd.get('tone') ||
                  'NORMAL'
                ),

              active:
                String(
                  fd.get('active') ||
                  'TRUE'
                )
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Knowledge save failed'
          );
        }

        e.target.reset();
        e.target.elements.id.value = '';

        await loadAyonKnowledge();
        paintAyonKnowledge();

        toast(
          'AYON AI knowledge saved'
        );

      } catch (err) {
        toast(
          err.message,
          3500
        );
      } finally {
        setBusy(false);
      }
    };

  if ($('#clearAiKnowledgeForm')) {
    $('#clearAiKnowledgeForm').onclick =
      () => {
        f.reset();
        f.elements.id.value = '';
      };
  }

  loadAyonKnowledge().then(
    paintAyonKnowledge
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  $('#mainContent').innerHTML = `
    <section class="hero">
      <p class="eyebrow">SETTINGS</p>
      <h3>Sales Performance Hub</h3>
      <p class="muted">
        ${esc(APP_BUILD)}
      </p>
    </section>

    <div class="card">
      <div class="row">
        <div>
          <h3>${esc(sessionName())}</h3>
          <p class="muted">
            ${esc(session.id)}
            • ${esc(session.role)}
          </p>
        </div>

        <span class="pill green">
          SIGNED IN
        </span>
      </div>
    </div>

    ${
      isManagerMode()
        ? `
          <div class="card" style="margin-top:12px">
            <p class="eyebrow">MANAGER CONTROL</p>
            <h3>Team & Database</h3>

            <div class="quick-grid" style="margin-top:10px">
              <button class="quick-card" data-page-go="team">
                <strong>👥 Team Dashboard</strong>
                <small>ALL SR performance</small>
              </button>

              <button class="quick-card" data-page-go="teamManagement">
                <strong>⚙ Team Management</strong>
                <small>Add / edit / deactivate SR</small>
              </button>

              <button class="quick-card" data-page-go="tasks">
                <strong>✓ Important Work</strong>
                <small>Assign individual or ALL SR</small>
              </button>

              <button class="quick-card" data-page-go="incentives">
                <strong>🏆 Incentive Control</strong>
                <small>Create & track plans</small>
              </button>
            </div>
          </div>
        `
        : ''
    }

    ${renderAyonKnowledgeManager()}

    <div class="card" style="margin-top:12px">
      <h3>Mobile Notification</h3>

      <p class="muted">
        Allow notification permission for task, CPO, incentive and target reminders.
      </p>

      <button
        id="settingsPushBtn"
        class="btn secondary"
        style="width:100%">
        ENABLE PUSH NOTIFICATION
      </button>
    </div>

    <div class="card" style="margin-top:12px">
      <h3>Cloud Connection</h3>

      <p class="muted">
        Backend is configured through config.js.
      </p>

      <code style="word-break:break-all">
        ${esc(backendUrl() || 'Not configured')}
      </code>
    </div>

    <button
      id="settingsLogoutBtn"
      class="btn danger"
      style="width:100%;margin-top:12px">
      LOG OUT
    </button>`;

  bindCommon();

  bindAyonKnowledgeManager();

  if ($('#settingsPushBtn')) {
    $('#settingsPushBtn').onclick =
      enablePushPermission;
  }

  if ($('#settingsLogoutBtn')) {
    $('#settingsLogoutBtn').onclick =
      logout;
  }
}

/* =========================================================
   MAIN RENDER ROUTER
========================================================= */

function render() {
  if (!session) return;

  refreshTop();
  bindNav();

  const routes = {
    dashboard: renderDashboard,
    daily: renderDaily,
    execution: renderExecution,
    cpo: renderCpo,
    planning: renderPlanning,
    zero: renderZero,
    incentives: renderIncentives,
    penalties: renderPenalties,
    income: renderIncome,
    tasks: renderTasks,
    summary: renderSummary,
    opportunity: renderOpportunity,
    activity: renderActivity,
    proposal: renderProposal,
    team: renderTeam,
    notifications: renderNotifications,
    settings: renderSettings,
    teamManagement: renderTeamManagement
  };

  const fn =
    routes[page] ||
    renderDashboard;

  fn();

  bindNav();
  bindCommon();
  installVisibleBackButton();
  updateNotificationBadge();
}

/* =========================================================
   LIVE SYNC
========================================================= */

function startLiveSync() {
  if (liveTimer) {
    clearInterval(liveTimer);
  }

  liveTimer =
    setInterval(
      async () => {
        if (
          !session ||
          syncing ||
          document.hidden ||
          !navigator.onLine
        ) return;

        try {
          if (
            isManagerMode() &&
            page === 'team'
          ) {
            await loadTeam({
              quiet: true
            });
          } else {
            await loadCurrent({
              quiet: true
            });
          }

          render();

        } catch (e) {
          console.warn(
            'Live sync',
            e
          );
        }
      },
      60000
    );
}

document.addEventListener(
  'visibilitychange',
  () => {
    if (
      !document.hidden &&
      session &&
      navigator.onLine
    ) {
      refreshCloud(false);
    }
  }
);

window.addEventListener(
  'online',
  () => {
    toast('Internet connected');

    if (session) {
      refreshCloud(false);
    }
  }
);

window.addEventListener(
  'offline',
  () => {
    toast(
      'Offline — live database paused'
    );
  }
);

/* =========================================================
   LOGIN BINDINGS
========================================================= */

function bindLogin() {
  const form =
    $('#loginForm');

  if (!form) return;

  form.onsubmit =
    async e => {
      e.preventDefault();

      const id =
        $('#loginId')?.value ||
        form.elements.staffId?.value ||
        form.elements.id?.value ||
        '';

      const pin =
        $('#loginPin')?.value ||
        form.elements.password?.value ||
        form.elements.pin?.value ||
        '';

      if (!String(id).trim()) {
        return toast(
          'Enter Staff ID'
        );
      }

      if (!String(pin)) {
        return toast(
          'Enter password'
        );
      }

      await login(
        id,
        pin
      );
    };
}

/* =========================================================
   STARTUP
========================================================= */

async function startup() {
  bindLogin();
  pushHistoryState();

  if (!restoreSession()) {
    $('#loginView')?.classList.remove('hidden');
    $('#appView')?.classList.add('hidden');
    return;
  }

  openApp();

  /* Render shell immediately. */
  render();

  try {
    if (isManagerMode()) {
      await Promise.all([
        loadTeam({
          quiet: true
        }),

        loadCurrent({
          quiet: true
        })
      ]);
    } else {
      await loadCurrent({
        quiet: true
      });
    }

    initPushSystem();
    render();

  } catch (e) {
    console.warn(
      'Startup sync',
      e
    );

    render();
  }
}

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    startup
  );
} else {
  startup();
}

/* =========================================================
   GLOBAL ACCESS FOR AYON AI
========================================================= */

window.SPH = {
  getSession: () => session,

  getCurrent: () => current,

  getTeamSnapshot: () =>
    teamSnapshot,

  getManagerView: () =>
    managerView,

  isManager: () =>
    isManager(),

  getSelectedMonth: () =>
    selectedMonth,

  getSelectedDate: () =>
    selectedDate,

  getBackendUrl: () =>
    backendUrl(),

  apiPost: (
    action,
    payload = {}
  ) =>
    apiPost(
      action,
      payload
    ),

  refresh: async () => {
    if (
      isManagerMode() &&
      page === 'team'
    ) {
      await loadTeam({
        quiet: true
      });
    } else {
      await loadCurrent({
        quiet: true
      });
    }

    render();

    return current;
  },

  openPage: p =>
    setPage(p)
};

/* =========================================================
   END OF app.js
========================================================= */
