'use strict';

/* =========================================================
   SALES PERFORMANCE HUB — FINAL FRONTEND
   Developed by KAM AYON
   Backend: Google Apps Script / Google Sheets source of truth
========================================================= */

const APP_BUILD = 'FINAL-2026.09.15-5';
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

function pct(v) {
  return n(v).toFixed(1) + '%';
}

function toast(msg, ms = 2400) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__sphToast);
  window.__sphToast = setTimeout(() => t.classList.remove('show'), ms);
}

function getPref() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  } catch {
    return {};
  }
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
  return session?.mode === 'manager' ||
    String(session?.role || '').toUpperCase().includes('MANAGER') ||
    String(session?.role || '').toUpperCase().includes('HR');
}

function isManagerMode() {
  return session?.mode === 'manager';
}

function sessionName() {
  return session?.name || localUser(session?.id)?.name || session?.id || '';
}

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
    const r = await fetch(url, {
      cache: 'no-store',
      ...options,
      signal: controller.signal
    });

    const text = await r.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server returned invalid response');
    }

    return data;

  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('Server timeout');
    }

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

  const longAction = [
    'uploadProposal',
    'downloadProposal',
    'downloadBanner',
    'createIncentive',
    'saveIncentive'
  ].includes(action);

  return fetchJson(
    backendUrl(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        staffId: session.id,
        password: session.password,
        payload
      })
    },
    longAction ? 90000 : 40000
  );
}

async function backendLogin(rawId, password) {
  const id = normalizeId(rawId);

  const body = {
    action: 'login',
    staffId: id,
    password,
    payload: {}
  };

  const r = await fetchJson(
    backendUrl(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(body)
    },
    25000
  );

  if (!r?.ok) {
    throw new Error(r?.error || 'Login failed');
  }

  return {
    id,
    user: r.user || {}
  };
}

function setBusy(on, message = 'Loading live data…') {
  syncing = on;

  document.body.classList.toggle('sph-busy', !!on);

  let box = $('#sphLoading');

  if (on && !box) {
    box = document.createElement('div');

    box.id = 'sphLoading';

    box.style.cssText =
      'position:fixed;inset:0;z-index:999;background:rgba(5,7,9,.68);backdrop-filter:blur(4px);display:grid;place-items:center;padding:24px';

    box.innerHTML =
      `<div class="card" style="max-width:360px;width:100%;text-align:center">
        <div style="font-size:30px;margin-bottom:10px">↻</div>
        <strong>${esc(message)}</strong>
        <p class="muted" style="margin:8px 0 0">Please keep this page open.</p>
      </div>`;

    document.body.appendChild(box);
  }

  if (box && on) {
    box.querySelector('strong').textContent = message;
  }

  if (!on && box) {
    box.remove();
  }
}

async function loadCurrent({ quiet = false } = {}) {
  if (!session || !backendUrl()) return false;

  if (!quiet) {
    setBusy(true, 'Loading live database…');
  }

  try {
    const r = await apiPost('bootstrap', {
      viewStaffId: viewedId(),
      month: selectedMonth,
      date: selectedDate
    });

    if (!r?.ok) {
      throw new Error(r?.error || 'Cloud read failed');
    }

    current = r.data || {};
    lastSyncAt = localTime();

    return true;

  } catch (e) {
    console.warn(e);

    if (!quiet) {
      toast('Sync failed: ' + e.message, 3500);
    }

    return false;

  } finally {
    if (!quiet) {
      setBusy(false);
    }
  }
}

async function loadTeam({ quiet = false } = {}) {
  if (!session || !isManager()) return false;

  if (!quiet) {
    setBusy(true, 'Loading team database…');
  }

  try {
    const r = await apiPost('teamSnapshot', {
      month: selectedMonth,
      date: selectedDate
    });

    if (!r?.ok) {
      throw new Error(r?.error || 'Team database failed');
    }

    teamSnapshot = Array.isArray(r.data) ? r.data : [];
    lastSyncAt = localTime();

    return true;

  } catch (e) {
    console.warn(e);

    if (!quiet) {
      toast('Team sync failed: ' + e.message, 3500);
    }

    return false;

  } finally {
    if (!quiet) {
      setBusy(false);
    }
  }
}

async function refreshCloud(showToast = false) {
  const ok =
    isManagerMode() && page === 'team'
      ? await loadTeam({ quiet: !showToast })
      : await loadCurrent({ quiet: !showToast });

  if (ok && showToast) {
    toast('Live database updated');
  }

  if (ok) {
    render();
  }

  return ok;
}

/* =========================================================
   SESSION
========================================================= */

function saveSession() {
  if (!session) return;

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );
}

function restoreSession() {
  try {
    const x = JSON.parse(
      localStorage.getItem(SESSION_KEY) || 'null'
    );

    if (!x?.id || !x?.password) {
      return false;
    }

    session = x;

    managerView =
      x.managerView ||
      (x.mode === 'manager' ? 'M21954' : x.id);

    return true;

  } catch {
    return false;
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);

  session = null;
  current = null;
  teamSnapshot = [];

  if (liveTimer) {
    clearInterval(liveTimer);
  }

  liveTimer = null;

  try {
    oneSignalSdk?.logout?.();
  } catch {}

  $('#appView')?.classList.add('hidden');
  $('#loginView')?.classList.remove('hidden');

  if ($('#loginPin')) {
    $('#loginPin').value = '';
  }
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

    const role = String(
      u.Role ||
      u.role ||
      localUser(result.id)?.role ||
      'SR'
    );

    const managerAlias =
      String(rawId || '')
        .trim()
        .toLowerCase() === 'manager';

    session = {
      id: result.id,
      password,
      name:
        u['Full Name'] ||
        u.name ||
        localUser(result.id)?.name ||
        result.id,
      role,
      mode:
        managerAlias ||
        role.toUpperCase().includes('HR')
          ? 'manager'
          : 'sr',
      managerView:
        managerAlias
          ? 'M21954'
          : result.id
    };

    managerView =
      session.mode === 'manager'
        ? (session.managerView || 'M21954')
        : session.id;

    page =
      session.mode === 'manager'
        ? 'team'
        : 'dashboard';

    saveSession();

    openApp();

    setBusy(false);

    render();

    if (session.mode === 'manager') {
      await loadTeam({ quiet: true });
    } else {
      await loadCurrent({ quiet: true });
    }

    initPushSystem();

    render();

  } catch (e) {
    toast(
      e.message || 'Login failed',
      3500
    );

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

    settingsBtn.onclick = () => {
      page = 'settings';
      render();
    };
  }

  const nav = $('#bottomNav');

  if (
    nav &&
    !nav.querySelector('[data-page="proposal"]')
  ) {
    const b = document.createElement('button');

    b.dataset.page = 'proposal';

    b.innerHTML =
      '<span class="nav-icon">▤</span><small>PO Form</small>';

    nav.appendChild(b);

    nav.style.gridTemplateColumns =
      'repeat(6,1fr)';
  }

  const app = $('#appView');

  if (
    app &&
    !$('#developerCredit')
  ) {
    const c = document.createElement('div');

    c.id = 'developerCredit';

    c.style.cssText =
      'text-align:center;font-size:10px;color:#78828d;padding:8px 10px 90px;letter-spacing:.45px';

    c.innerHTML =
      `Developed by <a href="https://mehedialimayon-del.github.io/MEHEDI-ALIM-AYON-PORTFOLIO/" target="_blank" rel="noopener" style="color:#ff7414;text-decoration:none;font-weight:900;letter-spacing:.8px">KAM AYON</a>`;

    app.insertBefore(c, nav);
  }
}

function refreshTop() {
  if (!session) return;

  if ($('#roleLabel')) {
    $('#roleLabel').textContent =
      isManagerMode()
        ? 'MANAGER ACCESS • ' + session.id
        : (
            String(session.role || 'SR').toUpperCase() +
            ' • ' +
            session.id
          );
  }

  if ($('#welcomeName')) {
    $('#welcomeName').textContent =
      isManagerMode()
        ? ('Manager • ' + viewedName())
        : sessionName();
  }

  updateNotificationBadge();
}

function setPage(next) {
  page = next;
  render();
}

function bindNav() {
  $$('#bottomNav button[data-page]').forEach(b => {
    b.classList.toggle(
      'active',
      b.dataset.page === page
    );

    b.onclick = () => {
      setPage(b.dataset.page);
    };
  });
}

function pushHistoryState() {
  if (!history.state?.sph) {
    history.replaceState(
      { sph: true },
      '',
      location.href
    );
  }
}

window.addEventListener(
  'popstate',
  () => {
    if (!session) return;

    page = 'dashboard';

    render();

    history.pushState(
      { sph: true },
      '',
      location.href
    );
  }
);

/* =========================================================
   COMMON DATA HELPERS
========================================================= */

function routeOutlets() {
  return Array.isArray(current?.outlets)
    ? current.outlets
    : [];
}

function skuMaster() {
  return Array.isArray(current?.sku)
    ? current.sku
    : [];
}

function allSkuNames() {
  const cloud =
    skuMaster()
      .map(
        x =>
          String(
            x['Product Name'] || ''
          )
      )
      .filter(Boolean);

  const local =
    Array.isArray(D.products)
      ? D.products
      : [];

  return [
    ...new Set([
      ...cloud,
      ...local
    ])
  ].sort(
    (a, b) =>
      a.localeCompare(b)
  );
}

function productsForOutlet(outletName) {
  const outlet =
    routeOutlets().find(
      x =>
        String(x['Outlet Name']) ===
        String(outletName)
    );

  const category =
    String(
      outlet?.Category || ''
    );

  const exactCloud =
    skuMaster()
      .filter(
        x =>
          String(
            x['Outlet Category'] || ''
          )
            .trim()
            .toLowerCase() ===
          category.toLowerCase()
      )
      .map(
        x =>
          String(
            x['Product Name'] || ''
          )
      )
      .filter(Boolean);

  if (exactCloud.length) {
    return [
      ...new Set(exactCloud)
    ].sort();
  }

  const localList =
    D.categoryProducts?.[
      category
    ];

  if (
    Array.isArray(localList) &&
    localList.length
  ) {
    return [
      ...new Set(localList)
    ].sort();
  }

  const allCloud =
    skuMaster()
      .filter(
        x =>
          ['', 'all'].includes(
            String(
              x['Outlet Category'] || ''
            )
              .trim()
              .toLowerCase()
          )
      )
      .map(
        x =>
          String(
            x['Product Name'] || ''
          )
      )
      .filter(Boolean);

  if (allCloud.length) {
    return [
      ...new Set(allCloud)
    ].sort();
  }

  return allSkuNames();
}

function outletOptions(
  selected = '',
  filter = ''
) {
  const q =
    String(filter || '')
      .trim()
      .toLowerCase();

  return (
    '<option value="">Select outlet</option>' +
    routeOutlets()
      .filter(
        x =>
          !q ||
          String(
            x['Outlet Name'] || ''
          )
            .toLowerCase()
            .includes(q) ||
          String(
            x['Outlet Code'] || ''
          )
            .toLowerCase()
            .includes(q)
      )
      .map(
        x =>
          `<option value="${esc(x['Outlet Name'])}" ${String(x['Outlet Name']) === String(selected) ? 'selected' : ''}>${esc(x['Outlet Name'])}</option>`
      )
      .join('')
  );
}

function skuOptions(
  outletName,
  selected = '',
  filter = ''
) {
  const q =
    String(filter || '')
      .trim()
      .toLowerCase();

  return (
    '<option value="">Select SKU</option>' +
    productsForOutlet(
      outletName
    )
      .filter(
        x =>
          !q ||
          String(x)
            .toLowerCase()
            .includes(q)
      )
      .map(
        x =>
          `<option value="${esc(x)}" ${String(x) === String(selected) ? 'selected' : ''}>${esc(x)}</option>`
      )
      .join('')
  );
}

function planByOutlet(name) {
  return (
    current?.plans || []
  ).find(
    x =>
      String(
        x['Outlet Name']
      ) ===
      String(name)
  );
}

function dayOutletSales(
  name,
  date = selectedDate
) {
  return (
    current?.outletSales || []
  )
    .filter(
      x =>
        String(
          x['Outlet Name']
        ) === String(name) &&
        String(x.Date)
          .slice(0, 10) === date
    )
    .reduce(
      (a, x) =>
        a +
        n(
          x['Sales Value']
        ),
      0
    );
}

function monthOutletSales(name) {
  return (
    current?.outletSales || []
  )
    .filter(
      x =>
        String(
          x['Outlet Name']
        ) ===
        String(name)
    )
    .reduce(
      (a, x) =>
        a +
        n(
          x['Sales Value']
        ),
      0
    );
}

function taskDone(x) {
  return (
    String(
      x.Status || ''
    ).toUpperCase() === 'DONE'
  );
}

function activePenalty(x) {
  return (
    String(
      x.Status || 'ACTIVE'
    ).toUpperCase() === 'ACTIVE'
  );
}

function selectedDayData() {
  return (
    current?.dayData ||
    {
      daily: [],
      outletSales: [],
      skuSales: []
    }
  );
}

function personalTargetProgress(t) {
  const metric =
    String(
      t.Metric ||
      'SALES_RM'
    ).toUpperCase();

  const start =
    String(
      t['Start Date'] ||
      selectedMonth + '-01'
    ).slice(0, 10);

  const end =
    String(
      t['End Date'] ||
      '9999-12-31'
    ).slice(0, 10);

  const sku =
    String(
      t['SKU Name'] || ''
    );

  let actual = 0;

  if (metric === 'CARTONS') {
    actual =
      (
        current?.skuSales || []
      )
        .filter(
          x =>
            String(x.Date)
              .slice(0, 10) >= start &&
            String(x.Date)
              .slice(0, 10) <= end &&
            (
              !sku ||
              String(
                x['SKU Name']
              ) === sku
            )
        )
        .reduce(
          (a, x) =>
            a + n(x.Cartons),
          0
        );

  } else if (
    metric === 'SKU_SALES_RM'
  ) {
    actual =
      (
        current?.skuSales || []
      )
        .filter(
          x =>
            String(x.Date)
              .slice(0, 10) >= start &&
            String(x.Date)
              .slice(0, 10) <= end &&
            (
              !sku ||
              String(
                x['SKU Name']
              ) === sku
            )
        )
        .reduce(
          (a, x) =>
            a +
            n(
              x['Sales Value']
            ),
          0
        );

  } else {
    actual =
      (
        current?.daily || []
      )
        .filter(
          x =>
            String(x.Date)
              .slice(0, 10) >= start &&
            String(x.Date)
              .slice(0, 10) <= end
        )
        .reduce(
          (a, x) =>
            a +
            n(
              x['Today Sales']
            ),
          0
        );
  }

  const target =
    n(
      t['Target Value']
    );

  return {
    actual,
    target,
    remaining:
      Math.max(
        0,
        target - actual
      ),
    percent:
      target
        ? actual / target * 100
        : 0
  };
}

/* =========================================================
   COMPONENTS
========================================================= */

function kpi(
  label,
  value,
  sub = '',
  cls = ''
) {
  return `<div class="kpi">
    <div class="label">${esc(label)}</div>
    <div class="value ${cls}">${esc(value)}</div>
    <div class="sub">${esc(sub)}</div>
  </div>`;
}

function progressBar(value) {
  const v =
    Math.max(
      0,
      Math.min(
        100,
        n(value)
      )
    );

  return `<div class="progress-wrap">
    <div class="progress ${v >= 100 ? 'goodbar' : ''}" style="width:${v}%"></div>
  </div>`;
}

function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}

function table(
  title,
  heads,
  rows
) {
  return `<div class="card" style="margin-top:12px;overflow:auto">
    <h3>${esc(title)}</h3>
    <table class="summary-table" style="min-width:${Math.max(620, heads.length * 120)}px">
      <thead>
        <tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  r =>
                    `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`
                )
                .join('')
            : `<tr><td colspan="${heads.length}">No data</td></tr>`
        }
      </tbody>
    </table>
  </div>`;
}

function syncStatus() {
  const online =
    navigator.onLine;

  return `<div class="status-strip">
    <span class="status-chip ${online ? 'ok' : 'bad'}">
      <span class="sync-dot ${online ? 'ok' : ''}"></span>
      ${online ? 'Online' : 'Offline'}
    </span>
    <span class="status-chip ${backendUrl() ? 'ok' : 'bad'}">
      ☁ ${backendUrl() ? 'Cloud connected' : 'Cloud missing'}
    </span>
    <span class="status-chip">
      ↻ ${lastSyncAt ? 'Synced ' + lastSyncAt : 'Not synced yet'}
    </span>
    <span class="status-chip">
      Build ${APP_BUILD}
    </span>
  </div>`;
}

function monthBar({
  showManager = true
} = {}) {
  const managerChooser =
    showManager &&
    isManagerMode()
      ? `<label style="flex:1;min-width:190px;margin:0">
          View SR
          <select id="managerPick">
            ${
              teamUsers()
                .map(
                  u =>
                    `<option value="${esc(u.id)}" ${u.id === managerView ? 'selected' : ''}>${esc(u.name)} • ${u.id}</option>`
                )
                .join('')
            }
          </select>
        </label>`
      : '';

  const mode =
    String(
      session?.role || ''
    )
      .toUpperCase()
      .includes('MANAGER')
      ? `<div class="mode-toggle" style="flex:1;min-width:190px">
          <button id="mySrMode" class="${session.mode === 'sr' ? 'active' : ''}">
            My SR
          </button>
          <button id="managerMode" class="${session.mode === 'manager' ? 'active' : ''}">
            Manager
          </button>
        </div>`
      : '';

  return `<div class="monthbar">
    <label style="margin:0;flex:1;min-width:145px">
      Month
      <input id="monthPick" type="month" value="${selectedMonth}">
    </label>
    ${mode}
    ${managerChooser}
  </div>`;
}

function dateFilter(
  label = 'Report Date'
) {
  return `<label>
    ${esc(label)}
    <input id="datePick" type="date" value="${selectedDate}">
  </label>`;
}

function teamUsers() {
  const fromTeam =
    teamSnapshot.map(
      x => ({
        id: x.staffId,
        name: x.name
      })
    );

  if (fromTeam.length) {
    return fromTeam;
  }

  return (
    D.users || []
  )
    .filter(
      x =>
        x.role === 'SR' ||
        String(x.role)
          .includes('MANAGER')
    )
    .map(
      x => ({
        id: x.id,
        name: x.name
      })
    );
}

async function handleCommonFilterChange() {
  setPref({
    month: selectedMonth,
    date: selectedDate
  });

  if (
    isManagerMode() &&
    page === 'team'
  ) {
    await loadTeam();
  } else {
    await loadCurrent();
  }

  render();
}

function bindCommon() {
  const mp = $('#monthPick');

  if (mp) {
    mp.onchange =
      async e => {
        selectedMonth =
          e.target.value;

        if (
          !selectedDate.startsWith(
            selectedMonth
          )
        ) {
          selectedDate =
            selectedMonth +
            '-01';
        }

        await handleCommonFilterChange();
      };
  }

  const dp = $('#datePick');

  if (dp) {
    dp.onchange =
      async e => {
        selectedDate =
          e.target.value ||
          localDate();

        selectedMonth =
          selectedDate.slice(
            0,
            7
          );

        await handleCommonFilterChange();
      };
  }

  const mm =
    $('#managerPick');

  if (mm) {
    mm.onchange =
      async e => {
        managerView =
          e.target.value;

        session.managerView =
          managerView;

        saveSession();

        await loadCurrent();

        render();
      };
  }

  const sr =
    $('#mySrMode');

  if (sr) {
    sr.onclick =
      async () => {
        session.mode = 'sr';

        managerView =
          session.id;

        session.managerView =
          managerView;

        saveSession();

        page =
          'dashboard';

        await loadCurrent();

        render();
      };
  }

  const mgr =
    $('#managerMode');

  if (mgr) {
    mgr.onclick =
      async () => {
        session.mode =
          'manager';

        managerView =
          session.managerView ||
          'M21954';

        saveSession();

        page = 'team';

        await loadTeam();

        render();
      };
  }

  $$('[data-go]')
    .forEach(
      b =>
        b.onclick =
          () =>
            setPage(
              b.dataset.go
            )
    );
}

/* =========================================================
   DASHBOARD
========================================================= */

function alertsForCurrent() {
  if (!current) {
    return [];
  }

  const a = [];

  const perf =
    current.performance || {};

  const pending =
    (
      current.tasks || []
    )
      .filter(
        x =>
          !taskDone(x)
      );

  if (pending.length) {
    a.push({
      icon: '✅',
      title:
        pending.length +
        ' pending task(s)',
      text:
        'Open Tasks to review manager instructions.',
      page: 'tasks'
    });
  }

  if (
    n(perf.shortfall) > 0
  ) {
    a.push({
      icon: '🎯',
      title:
        money(perf.shortfall) +
        ' shortfall',
      text:
        'Current achievement ' +
        pct(perf.percent) +
        '.',
      page: 'summary'
    });
  }

  if (
    n(perf.zeroOutlets) > 0
  ) {
    a.push({
      icon: '🏪',
      title:
        perf.zeroOutlets +
        ' zero-sales outlet(s)',
      text:
        'Use Outlet Report to prioritize coverage.',
      page: 'zero'
    });
  }

  const inc =
    current.incentives || [];

  inc
    .filter(
      x =>
        !x.fulfilled &&
        n(x.remaining) > 0
    )
    .slice(
      0,
      3
    )
    .forEach(
      x =>
        a.push({
          icon: '🏆',
          title:
            x.name ||
            'Incentive',
          text:
            `${x.actual} / ${x.target} • ${x.remaining} remaining • RM ${n(x.rewardRM).toFixed(2)} reward`,
          page:
            'incentives'
        })
    );

  return a;
}

function renderDashboard() {
  if (!current) {
    $('#mainContent').innerHTML =
      monthBar() +
      `<div class="card">
        ${empty('Live database is not loaded yet.')}
        <button id="loadNow" class="btn primary">
          LOAD DATABASE
        </button>
      </div>`;

    bindCommon();

    $('#loadNow').onclick =
      () =>
        refreshCloud(true);

    return;
  }

  const p =
    current.performance || {};

  const f =
    current.forecast || {};

  const inc =
    current.incomeSummary || {};

  const cmp =
    current.comparisons || {};

  const alerts =
    alertsForCurrent();

  $('#mainContent').innerHTML =
    `${monthBar()}
    <section class="hero">
      <p class="eyebrow">LIVE SALES DATABASE</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">
        ${monthName(selectedMonth)} • Source of truth: Google Sheets
      </p>
      ${progressBar(p.percent)}
      ${syncStatus()}
      <div class="form-actions">
        <button id="syncNow" class="btn secondary">
          ↻ REFRESH LIVE
        </button>
        ${
          isManagerMode()
            ? '<button class="btn secondary" data-go="team">👥 TEAM</button>'
            : ''
        }
      </div>
    </section>

    <div class="grid kpi-grid">
      ${kpi('MONTH TARGET', money(p.target), monthName(selectedMonth))}
      ${kpi('ACHIEVEMENT', money(p.achievement), pct(p.percent), p.percent >= 100 ? 'good' : '')}
      ${kpi('SHORTFALL', money(p.shortfall), 'Remaining', p.shortfall ? 'bad' : 'good')}
      ${kpi('TODAY SALES', money(p.todaySales), dateLabel(selectedDate))}
      ${kpi('OUTLET COVERAGE', pct(p.coverage), `${n(p.coveredOutlets)}/${n(p.routeOutlets)} outlets`, p.zeroOutlets ? 'warn' : 'good')}
      ${kpi('ZERO OUTLETS', String(n(p.zeroOutlets)), 'Month-to-date', p.zeroOutlets ? 'bad' : 'good')}
      ${kpi('PROJECTED MONTH', money(f.projectedSales), f.onTrack ? 'On track' : 'Needs acceleration', f.onTrack ? 'good' : 'warn')}
      ${kpi('FINAL INCOME', money(inc.finalIncome), 'After incentive & penalty')}
      ${kpi('LAST MONTH SAME DAY', money(cmp.lastMonthSameDay), cmp.lastMonthDate ? dateLabel(cmp.lastMonthDate) : '—')}
      ${kpi('LAST YEAR SAME DAY', money(cmp.lastYearSameDay), cmp.lastYearDate ? dateLabel(cmp.lastYearDate) : '—')}
    </div>

    <div class="section-title">
      <h3>Smart Actions</h3>
    </div>

    <div class="mini-grid">
      <button class="btn secondary" data-go="daily">＋ Add Sales</button>
      <button class="btn secondary" data-go="zero">🏪 Outlet Report</button>
      <button class="btn secondary" data-go="incentives">🏆 Incentives</button>
      <button class="btn secondary" data-go="opportunity">⚡ Opportunity</button>
      <button class="btn secondary" data-go="tasks">✅ Tasks</button>
      <button class="btn secondary" data-go="activity">🕘 Timeline</button>
      <button class="btn secondary" data-go="planning">◎ Monthly Plan</button>
      <button class="btn secondary" data-go="summary">▦ Full Summary</button>
    </div>

    <div class="section-title">
      <h3>Attention</h3>
    </div>

    ${
      alerts.length
        ? `<div class="notification-list">
            ${
              alerts
                .map(
                  x =>
                    `<button class="notification-item" data-go="${x.page}" style="text-align:left;width:100%;color:inherit">
                      <div class="notification-icon">${x.icon}</div>
                      <div>
                        <h4>${esc(x.title)}</h4>
                        <p>${esc(x.text)}</p>
                      </div>
                    </button>`
                )
                .join('')
            }
          </div>`
        : `<div class="card">
            <span class="pill green">ALL CLEAR</span>
            <p class="muted" style="margin:10px 0 0">
              No urgent item found for the selected period.
            </p>
          </div>`
    }`;

  bindCommon();

  $('#syncNow').onclick =
    () =>
      refreshCloud(true);
}

/* =========================================================
   DAILY / OUTLET / SKU ENTRY
========================================================= */

function renderDaily() {
  if (isManagerMode()) {
    $('#mainContent').innerHTML =
      `${monthBar()}
      <div class="card">
        <h2>Manager mode is view-only</h2>
        <p class="muted">
          Switch to My SR to enter your own sales.
        </p>
      </div>`;

    bindCommon();
    return;
  }

  $('#mainContent').innerHTML =
    `${monthBar({ showManager: false })}

    <div class="card">
      <p class="eyebrow">STEP 1</p>
      <h2>Daily Route Total</h2>

      <form id="dailyForm" class="stack">
        <label>
          Date
          <input name="date" type="date" value="${selectedDate}" required>
        </label>

        <label>
          Today Total Sales (RM)
          <input name="todaySales" type="number" min="0" step="0.01" required>
        </label>

        <div class="form-grid">
          <label>
            Last Month Same Day (RM)
            <input name="lastMonthSameDay" type="number" min="0" step="0.01" value="0">
          </label>

          <label>
            Last Year Same Day (RM)
            <input name="lastYearSameDay" type="number" min="0" step="0.01" value="0">
          </label>
        </div>

        <div class="form-grid">
          <label>
            Active (RM)
            <input name="active" type="number" min="0" step="0.01" value="0">
          </label>

          <label>
            Prepare for Trip / PPR (RM)
            <input name="prepareTrip" type="number" min="0" step="0.01" value="0">
          </label>
        </div>

        <label>
          Order Amount (RM)
          <input name="orderAmount" type="number" min="0" step="0.01" value="0">
        </label>

        <label>
          Note
          <textarea name="note"></textarea>
        </label>

        <button class="btn primary big-action">
          SAVE DAILY TOTAL
        </button>
      </form>
    </div>

    <div class="card" style="margin-top:12px">
      <p class="eyebrow">STEP 2</p>
      <h2>Outlet & SKU Sale</h2>

      <form id="outletForm" class="stack">
        <label>
          Date
          <input name="date" type="date" value="${selectedDate}" required>
        </label>

        <label>
          Search Outlet
          <input id="outletSearch" placeholder="Type outlet name or code">
        </label>

        <label>
          Select Outlet
          <select id="outletSel" name="outlet" required>
            ${outletOptions()}
          </select>
        </label>

        <label>
          Outlet Sales (RM)
          <input name="sales" type="number" min="0" step="0.01" required>
        </label>

        <label>
          Search SKU
          <input id="skuSearch" placeholder="Type SKU name">
        </label>

        <label>
          Select SKU
          <select id="skuSel" name="sku">
            <option value="">Select outlet first</option>
          </select>
        </label>

        <div class="form-grid">
          <label>
            Cartons Sold
            <input name="cartons" type="number" min="0" step="1" value="0">
          </label>

          <label>
            SKU Sales Value (RM)
            <input name="skuValue" type="number" min="0" step="0.01" value="0">
          </label>
        </div>

        <label>
          Note
          <textarea name="note"></textarea>
        </label>

        <button class="btn primary big-action">
          SAVE OUTLET / SKU SALE
        </button>
      </form>
    </div>`;

  bindCommon();

  const oSearch =
    $('#outletSearch');

  const oSel =
    $('#outletSel');

  const sSearch =
    $('#skuSearch');

  const sSel =
    $('#skuSel');

  const refreshSku =
    () => {
      sSel.innerHTML =
        oSel.value
          ? skuOptions(
              oSel.value,
              sSel.value,
              sSearch.value
            )
          : '<option value="">Select outlet first</option>';
    };

  oSearch.oninput =
    () => {
      const old =
        oSel.value;

      oSel.innerHTML =
        outletOptions(
          old,
          oSearch.value
        );

      if (
        [...oSel.options]
          .some(
            x =>
              x.value === old
          )
      ) {
        oSel.value = old;
      }

      refreshSku();
    };

  oSel.onchange =
    () => {
      sSearch.value = '';
      refreshSku();
    };

  sSearch.oninput =
    refreshSku;

  $('#dailyForm').onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const date =
        String(
          fd.get('date')
        );

      const payload = {
        requestId:
          idGen(),

        date,

        month:
          date.slice(
            0,
            7
          ),

        todaySales:
          n(
            fd.get(
              'todaySales'
            )
          ),

        lastMonthSameDay:
          n(
            fd.get(
              'lastMonthSameDay'
            )
          ),

        lastYearSameDay:
          n(
            fd.get(
              'lastYearSameDay'
            )
          ),

        active:
          n(
            fd.get(
              'active'
            )
          ),

        prepareTrip:
          n(
            fd.get(
              'prepareTrip'
            )
          ),

        orderAmount:
          n(
            fd.get(
              'orderAmount'
            )
          ),

        note:
          String(
            fd.get('note') ||
            ''
          )
      };

      setBusy(
        true,
        'Saving daily sales…'
      );

      try {
        const r =
          await apiPost(
            'saveDaily',
            payload
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Save failed'
          );
        }

        selectedDate =
          date;

        selectedMonth =
          date.slice(
            0,
            7
          );

        await loadCurrent({
          quiet: true
        });

        toast(
          r.duplicate
            ? 'Already saved — duplicate ignored'
            : 'Daily sales saved to cloud'
        );

        render();

      } catch (err) {
        toast(
          err.message,
          3500
        );

      } finally {
        setBusy(false);
      }
    };

  $('#outletForm').onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const date =
        String(
          fd.get('date')
        );

      const outletName =
        String(
          fd.get('outlet') ||
          ''
        );

      const skuName =
        String(
          fd.get('sku') ||
          ''
        );

      const outlet =
        routeOutlets()
          .find(
            x =>
              String(
                x['Outlet Name']
              ) ===
              outletName
          );

      if (!outlet) {
        return toast(
          'Select an outlet'
        );
      }

      setBusy(
        true,
        'Saving outlet / SKU sale…'
      );

      try {
        const baseId =
          idGen();

        const ro =
          await apiPost(
            'saveOutlet',
            {
              requestId:
                baseId +
                '-O',

              date,

              month:
                date.slice(
                  0,
                  7
                ),

              outletCode:
                outlet['Outlet Code'] ||
                '',

              outletName,

              sales:
                n(
                  fd.get(
                    'sales'
                  )
                ),

              note:
                String(
                  fd.get('note') ||
                  ''
                )
            }
          );

        if (!ro?.ok) {
          throw new Error(
            ro?.error ||
            'Outlet sale failed'
          );
        }

        if (skuName) {
          const rs =
            await apiPost(
              'saveSku',
              {
                requestId:
                  baseId +
                  '-S',

                date,

                month:
                  date.slice(
                    0,
                    7
                  ),

                outletCode:
                  outlet['Outlet Code'] ||
                  '',

                outletName,

                skuName,

                cartons:
                  n(
                    fd.get(
                      'cartons'
                    )
                  ),

                salesValue:
                  n(
                    fd.get(
                      'skuValue'
                    )
                  )
              }
            );

          if (!rs?.ok) {
            throw new Error(
              rs?.error ||
              'SKU sale failed'
            );
          }
        }

        selectedDate =
          date;

        selectedMonth =
          date.slice(
            0,
            7
          );

        await loadCurrent({
          quiet: true
        });

        toast(
          'Outlet / SKU sale saved to cloud'
        );

        render();

      } catch (err) {
        toast(
          err.message,
          3500
        );

      } finally {
        setBusy(false);
      }
    };
}

/* =========================================================
   OUTLET REPORT / ZERO SALES
========================================================= */

function renderZero() {
  const rows =
    routeOutlets()
      .map(
        o => {
          const name =
            String(
              o['Outlet Name'] ||
              ''
            );

          const d =
            dayOutletSales(name);

          const mtd =
            monthOutletSales(name);

          const plan =
            planByOutlet(name);

          const autoTarget =
            routeOutlets().length
              ? n(
                  current?.performance?.target
                ) /
                routeOutlets().length
              : 0;

          const target =
            n(
              plan?.['Outlet Target']
            ) ||
            autoTarget;

          return {
            name,
            code:
              o['Outlet Code'] ||
              '',
            category:
              o.Category ||
              '',
            day:
              d,
            mtd,
            target,
            gap:
              target
                ? Math.max(
                    0,
                    target -
                    mtd
                  )
                : 0
          };
        }
      );

  const q =
    getPref().zeroSearch ||
    '';

  $('#mainContent').innerHTML =
    `${monthBar()}

    <div class="card" style="margin-bottom:12px">
      <div class="form-grid">
        ${dateFilter('Daily Sale Date')}

        <label>
          Search Outlet
          <input id="zeroSearch" value="${esc(q)}" placeholder="Outlet name / code">
        </label>
      </div>
    </div>

    <section class="hero">
      <p class="eyebrow">OUTLET SALES / ZERO SALES</p>
      <h3>${dateLabel(selectedDate)}</h3>
      <p class="muted">
        Daily sale + MTD sale + monthly outlet target stay visible together.
      </p>
      ${syncStatus()}
      <button id="zeroRefresh" class="btn secondary" style="margin-top:10px">
        ↻ REFRESH LIVE
      </button>
    </section>

    <div id="zeroList" class="list" style="margin-top:12px"></div>`;

  bindCommon();

  const paint =
    () => {
      const query =
        String(
          $('#zeroSearch')?.value ||
          ''
        ).toLowerCase();

      const list =
        rows.filter(
          x =>
            !query ||
            x.name
              .toLowerCase()
              .includes(query) ||
            String(
              x.code
            )
              .toLowerCase()
              .includes(query)
        );

      $('#zeroList').innerHTML =
        list.length
          ? list
              .map(
                x =>
                  `<div class="list-item">
                    <div class="row">
                      <div>
                        <h4>${esc(x.name)}</h4>
                        <p>${esc(x.category)} • ${esc(x.code || 'No code')}</p>
                        <p style="margin-top:7px">
                          <strong style="color:#fff">
                            Today ${money(x.day)}
                          </strong>
                          • MTD ${money(x.mtd)}
                          • Target ${x.target ? money(x.target) : 'Not set'}
                          ${x.target ? ' • Gap ' + money(x.gap) : ''}
                        </p>
                      </div>
                      <span class="pill ${x.day > 0 ? 'green' : 'red'}">
                        ${x.day > 0 ? 'SALE' : 'ZERO'}
                      </span>
                    </div>
                  </div>`
              )
              .join('')
          : empty(
              'No outlet found'
            );
    };

  paint();

  $('#zeroSearch').oninput =
    () => {
      setPref({
        zeroSearch:
          $('#zeroSearch').value
      });

      paint();
    };

  $('#zeroRefresh').onclick =
    () =>
      refreshCloud(true);
}

/* =========================================================
   MONTHLY PLANNING
========================================================= */

function parsePlanSkus(p) {
  const raw =
    typeof p?.['Targeted SKU List'] ===
    'string'
      ? (() => {
          try {
            return JSON.parse(
              p[
                'Targeted SKU List'
              ]
            );
          } catch {
            return [];
          }
        })()
      : (
          p?.[
            'Targeted SKU List'
          ] ||
          []
        );

  return Array.isArray(raw)
    ? raw
    : [];
}

function planningList() {
  const plans =
    current?.plans ||
    [];

  if (!plans.length) {
    return empty(
      'No monthly plan yet.'
    );
  }

  return `<div class="list">
    ${
      plans
        .map(
          p => {
            const mtd =
              monthOutletSales(
                p['Outlet Name']
              );

            const target =
              n(
                p[
                  'Outlet Target'
                ]
              );

            const list =
              parsePlanSkus(p);

            return `<div class="card">
              <div class="row">
                <div>
                  <h3>${esc(p['Outlet Name'])}</h3>
                  <p class="muted">
                    ${money(mtd)} / ${money(target)}
                    •
                    ${
                      target
                        ? pct(
                            mtd /
                            target *
                            100
                          )
                        : 'No target'
                    }
                  </p>
                </div>

                <span class="pill ${mtd >= target && target ? 'green' : 'orange'}">
                  ${
                    target
                      ? money(
                          Math.max(
                            0,
                            target -
                            mtd
                          )
                        ) +
                        ' left'
                      : 'PLAN'
                  }
                </span>
              </div>

              ${
                list.length
                  ? `<div class="status-strip">
                      ${
                        list
                          .map(
                            x =>
                              `<span class="status-chip">${esc(typeof x === 'string' ? x : x.name || '')}</span>`
                          )
                          .join('')
                      }
                    </div>`
                  : ''
              }
            </div>`;
          }
        )
        .join('')
    }
  </div>`;
}

function renderPlanning() {
  if (isManagerMode()) {
    $('#mainContent').innerHTML =
      `${monthBar()}
      <div class="card">
        <h2>${esc(viewedName())} • Monthly Plan</h2>
      </div>
      <div style="margin-top:12px">
        ${planningList()}
      </div>`;

    bindCommon();
    return;
  }

  selectedPlanningSkus = [];

  $('#mainContent').innerHTML =
    `${monthBar({ showManager: false })}

    <div class="card">
      <h2>Monthly Outlet & SKU Plan</h2>

      <form id="planForm" class="stack">
        <label>
          Search Outlet
          <input id="planOutletSearch" placeholder="Outlet name">
        </label>

        <label>
          Select Outlet
          <select id="planOutlet" name="outlet" required>
            ${outletOptions()}
          </select>
        </label>

        <label>
          Outlet Monthly Target (RM)
          <input name="outletTarget" type="number" min="0" step="0.01" required>
        </label>

        <label>
          Target SKU Count
          <input name="targetSkuCount" type="number" min="0" step="1" value="0">
        </label>

        <label>
          Search SKU
          <input id="planSkuSearch" placeholder="SKU name">
        </label>

        <label>
          Select SKU
          <select id="planSku">
            <option value="">Select outlet first</option>
          </select>
        </label>

        <button type="button" id="addPlanSku" class="btn secondary">
          + ADD SKU
        </button>

        <div id="planSkuChips" class="chipbox"></div>

        <button class="btn primary">
          SAVE MONTHLY PLAN
        </button>
      </form>
    </div>

    <div class="section-title">
      <h3>Plan vs Achievement</h3>
    </div>

    ${planningList()}`;

  bindCommon();

  const os =
    $('#planOutletSearch');

  const o =
    $('#planOutlet');

  const ss =
    $('#planSkuSearch');

  const s =
    $('#planSku');

  const chips =
    $('#planSkuChips');

  const paintSkus =
    () => {
      chips.innerHTML =
        selectedPlanningSkus
          .map(
            x =>
              `<span class="chip">
                ${esc(x)}
                <button type="button" data-rmsku="${esc(x)}">×</button>
              </span>`
          )
          .join('');

      $$('[data-rmsku]')
        .forEach(
          b =>
            b.onclick =
              () => {
                selectedPlanningSkus =
                  selectedPlanningSkus
                    .filter(
                      x =>
                        x !==
                        b.dataset.rmsku
                    );

                paintSkus();
                refreshSku();
              }
        );
    };

  const refreshSku =
    () => {
      s.innerHTML =
        o.value
          ? skuOptions(
              o.value,
              s.value,
              ss.value
            )
          : '<option value="">Select outlet first</option>';

      [...s.options]
        .forEach(
          opt => {
            if (
              selectedPlanningSkus
                .includes(
                  opt.value
                )
            ) {
              opt.disabled =
                true;
            }
          }
        );
    };

  os.oninput =
    () => {
      const old =
        o.value;

      o.innerHTML =
        outletOptions(
          old,
          os.value
        );

      refreshSku();
    };

  o.onchange =
    () => {
      selectedPlanningSkus =
        [];

      paintSkus();
      refreshSku();
    };

  ss.oninput =
    refreshSku;

  $('#addPlanSku').onclick =
    () => {
      if (!s.value) {
        return toast(
          'Select SKU'
        );
      }

      if (
        !selectedPlanningSkus
          .includes(s.value)
      ) {
        selectedPlanningSkus
          .push(s.value);
      }

      paintSkus();
      refreshSku();
    };

  $('#planForm').onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const outletName =
        String(
          fd.get('outlet') ||
          ''
        );

      const outlet =
        routeOutlets()
          .find(
            x =>
              String(
                x['Outlet Name']
              ) ===
              outletName
          );

      if (!outlet) {
        return toast(
          'Select outlet'
        );
      }

      setBusy(
        true,
        'Saving monthly plan…'
      );

      try {
        const r =
          await apiPost(
            'savePlan',
            {
              month:
                selectedMonth,

              routeTarget:
                current?.performance?.target ||
                0,

              outletCode:
                outlet['Outlet Code'] ||
                '',

              outletName,

              outletTarget:
                n(
                  fd.get(
                    'outletTarget'
                  )
                ),

              targetedSkuCount:
                n(
                  fd.get(
                    'targetSkuCount'
                  )
                ) ||
                selectedPlanningSkus.length,

              targetSkus:
                selectedPlanningSkus,

              skuSalesPlan:
                0
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Plan save failed'
          );
        }

        await loadCurrent({
          quiet: true
        });

        toast(
          'Monthly plan saved'
        );

        render();

      } catch (err) {
        toast(
          err.message,
          3500
        );

      } finally {
        setBusy(false);
      }
    };

  refreshSku();
}

/* =========================================================
   INCENTIVES
========================================================= */

let incentiveSelectedSkus = [];
let editingIncentiveId = null;

function incentiveCard(x) {
  const v =
    n(x.percent);

  const skuText =
    Array.isArray(
      x.selectedSkus
    ) &&
    x.selectedSkus.length
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
    x.perSku &&
    typeof x.perSku ===
      'object'
      ? Object.entries(
          x.perSku
        ).sort(
          (a, b) =>
            b[1] -
            a[1]
        )
      : [];

  return `<div class="card">
    <div class="row">
      <div>
        <span class="pill ${x.fulfilled ? 'green' : 'orange'}">
          ${esc(String(x.category || 'INCENTIVE').toUpperCase())}
        </span>

        <h3 style="margin:9px 0 5px">
          ${esc(x.name || 'Incentive')}
        </h3>

        <p class="muted">
          ${esc(x.description || '')}
        </p>
      </div>

      <div style="text-align:right">
        <strong>${money(x.rewardRM)}</strong>
        <p class="muted">reward</p>
      </div>
    </div>

    <div class="status-strip">
      <span class="status-chip">
        ${esc(skuText)}
      </span>

      <span class="status-chip">
        ${esc(String(x.metric || ''))}
      </span>

      ${
        x.calculationRule === 'EACH_MIN'
          ? `<span class="status-chip">
              Each SKU ≥ ${n(x.eachSkuMinimum)}
            </span>`
          : ''
      }
    </div>

    <div style="margin-top:12px">
      ${progressBar(v)}
    </div>

    <div class="row" style="margin-top:8px">
      <small class="muted">
        Progress
      </small>

      <strong>
        ${n(x.actual)} / ${n(x.target)}
      </strong>
    </div>

    <p class="muted" style="margin:8px 0 0">
      ${
        x.fulfilled
          ? '✓ Fulfilled • Earned ' +
            money(x.earnedRM)
          : n(x.remaining) +
            ' remaining'
      }
      •
      ${dateLabel(x.startDate)}
      →
      ${
        x.endDate
          ? dateLabel(x.endDate)
          : 'Open end'
      }
    </p>

    ${
      perSku.length > 1
        ? `<details style="margin-top:10px">
            <summary class="muted">
              SKU breakdown
            </summary>

            <div class="list" style="margin-top:8px">
              ${
                perSku
                  .map(
                    ([sku, val]) =>
                      `<div class="list-item">
                        <div class="row">
                          <span>${esc(sku)}</span>
                          <strong>${n(val)}</strong>
                        </div>
                      </div>`
                  )
                  .join('')
              }
            </div>
          </details>`
        : ''
    }

    <div class="form-actions">
      ${
        x.bannerFileId
          ? `<button class="btn secondary" data-banner="${esc(x.bannerFileId)}">
              VIEW BANNER
            </button>`
          : ''
      }

      ${
        isManagerMode()
          ? `<button class="btn secondary" data-editinc="${esc(x.id)}">
              EDIT INCENTIVE
            </button>`
          : ''
      }
    </div>
  </div>`;
}

function incentiveSkuPicker() {
  const all =
    allSkuNames();

  return `<div id="incSkuArea">
    <label>
      Search SKU
      <input id="incSkuSearch" placeholder="Type product name">
    </label>

    <div id="incSkuResults" class="search-results" style="margin-top:8px;max-height:260px"></div>

    <div id="incSkuChips" class="chipbox" style="margin-top:10px"></div>

    <p class="muted" style="font-size:11px;margin:8px 0 0">
      Selected:
      <b id="incSkuCount">0</b>
      SKU(s) from ${all.length} master products
    </p>
  </div>`;
}

function renderIncentives() {
  const list =
    current?.incentives ||
    [];

  const edit =
    editingIncentiveId
      ? list.find(
          x =>
            x.id ===
            editingIncentiveId
        )
      : null;

  incentiveSelectedSkus =
    edit?.selectedSkus
      ? [...edit.selectedSkus]
      : [];

  const managerForm =
    isManagerMode()
      ? `<div class="card" style="margin-bottom:12px">
          <p class="eyebrow">
            MANAGER MASTER INCENTIVE
          </p>

          <h2>
            ${edit ? 'Update Incentive' : 'Create Incentive'}
          </h2>

          <form id="incForm" class="stack">
            <label>
              Incentive Name
              <input
                name="name"
                required
                placeholder="e.g. Value Pack Combo Incentive"
                value="${esc(edit?.name || '')}"
              >
            </label>

            <label>
              Description
              <textarea
                name="description"
                placeholder="Simple instruction for SR"
              >${esc(edit?.description || '')}</textarea>
            </label>

            <div class="form-grid">
              <label>
                Category
                <select name="category">
                  <option value="PRODUCT" ${edit?.category === 'PRODUCT' ? 'selected' : ''}>
                    Product
                  </option>
                  <option value="INDIVIDUAL" ${edit?.category === 'INDIVIDUAL' ? 'selected' : ''}>
                    Individual
                  </option>
                  <option value="GROWTH" ${edit?.category === 'GROWTH' ? 'selected' : ''}>
                    Growth
                  </option>
                  <option value="OTHER" ${edit?.category === 'OTHER' ? 'selected' : ''}>
                    Other
                  </option>
                </select>
              </label>

              <label>
                Incentive Basis
                <select name="basis" id="incBasis">
                  <option value="SINGLE_SKU" ${(edit?.basis || 'SINGLE_SKU') === 'SINGLE_SKU' ? 'selected' : ''}>
                    Single SKU
                  </option>
                  <option value="MULTI_SK
