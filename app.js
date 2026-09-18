'use strict';

/* =========================================================
   SALES PERFORMANCE HUB — FINAL LOCKED V8
   Premium UI + Premium Login
   Developed by KAM AYON
   Backend: Google Apps Script / Google Sheets source of truth
========================================================= */

const APP_BUILD = 'FINAL-LOCKED-PREMIUM-V8-2026.09.18';
const TZ = 'Asia/Kuala_Lumpur';
const D = window.APP_DATA || {
  users: [],
  salaryRules: {},
  categoryProducts: {},
  products: [],
  outlets: {}
};

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
let pushConfig = {
  configured: false,
  appId: '',
  ready: false
};

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;

const money = v =>
  'RM ' + n(v).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const esc = (v = '') =>
  String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const idGen = () =>
  crypto?.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function localDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function localTime() {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date());
}

function dateLabel(d) {
  if (!d) return '—';

  const [y, m, day] = String(d)
    .slice(0, 10)
    .split('-')
    .map(Number);

  return new Date(y, m - 1, day).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function monthName(m) {
  const [y, mo] = String(m).split('-').map(Number);

  return new Date(y, mo - 1, 1).toLocaleDateString('en-MY', {
    month: 'long',
    year: 'numeric'
  });
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

  window.__sphToast = setTimeout(() => {
    t.classList.remove('show');
  }, ms);
}

function getPref() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  } catch {
    return {};
  }
}

function setPref(patch) {
  localStorage.setItem(
    PREF_KEY,
    JSON.stringify({
      ...getPref(),
      ...patch
    })
  );
}

function backendUrl() {
  return String(
    window.APP_CONFIG?.BACKEND_URL ||
    localStorage.getItem(BACKEND_KEY) ||
    ''
  ).trim();
}

function normalizeId(v) {
  const x = String(v || '').trim();

  return x.toLowerCase() === 'manager'
    ? 'M21954'
    : x.toUpperCase();
}

function localUser(id) {
  return (D.users || []).find(
    x =>
      String(x.id).toUpperCase() ===
      String(id || '').toUpperCase()
  );
}

function viewedId() {
  return session?.mode === 'manager'
    ? managerView
    : session?.id;
}

function isManager() {
  return (
    session?.mode === 'manager' ||
    String(session?.role || '').toUpperCase().includes('MANAGER') ||
    String(session?.role || '').toUpperCase().includes('HR')
  );
}

function isManagerMode() {
  return session?.mode === 'manager';
}

function sessionName() {
  return (
    session?.name ||
    localUser(session?.id)?.name ||
    session?.id ||
    ''
  );
}

function viewedName() {
  if (current?.user?.['Full Name']) {
    return current.user['Full Name'];
  }

  if (current?.user?.name) {
    return current.user.name;
  }

  return localUser(viewedId())?.name || viewedId();
}

/* =========================================================
   NETWORK
========================================================= */

async function fetchJson(
  url,
  options = {},
  timeout = 25000
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

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
  if (!backendUrl()) {
    throw new Error('Backend URL is missing');
  }

  if (!session) {
    throw new Error('Please login');
  }

  const q = new URLSearchParams({
    action,
    staffId: session.id,
    password: session.password,
    ...extra
  });

  return fetchJson(
    backendUrl() + '?' + q.toString()
  );
}

async function apiPost(action, payload = {}) {
  if (!backendUrl()) {
    throw new Error('Backend URL is missing');
  }

  if (!session) {
    throw new Error('Please login');
  }

  const longAction = [
    'uploadProposal',
    'downloadProposal',
    'downloadBanner',
    'createIncentive',
    'saveIncentive',
    'saveCpo',
    'downloadCpoPhoto'
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

/* =========================================================
   LOGIN
   Premium login compatibility + V8 backend session
========================================================= */

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

function setBusy(
  on,
  message = 'Loading live data…'
) {
  syncing = on;

  document.body.classList.toggle(
    'sph-busy',
    !!on
  );

  let box = $('#sphLoading');

  if (on && !box) {
    box = document.createElement('div');
    box.id = 'sphLoading';

    box.style.cssText =
      'position:fixed;' +
      'inset:0;' +
      'z-index:999;' +
      'background:rgba(5,7,9,.68);' +
      'backdrop-filter:blur(4px);' +
      'display:grid;' +
      'place-items:center;' +
      'padding:24px';

    box.innerHTML = `
      <div class="card"
           style="max-width:360px;width:100%;text-align:center">
        <div style="font-size:30px;margin-bottom:10px">↻</div>
        <strong>${esc(message)}</strong>
        <p class="muted" style="margin:8px 0 0">
          Please keep this page open.
        </p>
      </div>
    `;

    document.body.appendChild(box);
  }

  if (box && on) {
    box.querySelector('strong').textContent = message;
  }

  if (!on && box) {
    box.remove();
  }
}

/* =========================================================
   CLOUD DATA
========================================================= */

async function loadCurrent({ quiet = false } = {}) {
  if (!session || !backendUrl()) {
    return false;
  }

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
      throw new Error(
        r?.error || 'Cloud read failed'
      );
    }

    current = r.data || {};
    lastSyncAt = localTime();

    return true;

  } catch (e) {
    console.warn(e);

    if (!quiet) {
      toast(
        'Sync failed: ' + e.message,
        3500
      );
    }

    return false;

  } finally {
    if (!quiet) {
      setBusy(false);
    }
  }
}

async function loadTeam({ quiet = false } = {}) {
  if (!session || !isManager()) {
    return false;
  }

  if (!quiet) {
    setBusy(true, 'Loading team database…');
  }

  try {
    const r = await apiPost(
      'teamSnapshot',
      {
        month: selectedMonth,
        date: selectedDate
      }
    );

    if (!r?.ok) {
      throw new Error(
        r?.error || 'Team database failed'
      );
    }

    teamSnapshot = Array.isArray(r.data)
      ? r.data
      : [];

    lastSyncAt = localTime();

    return true;

  } catch (e) {
    console.warn(e);

    if (!quiet) {
      toast(
        'Team sync failed: ' + e.message,
        3500
      );
    }

    return false;

  } finally {
    if (!quiet) {
      setBusy(false);
    }
  }
}

async function refreshCloud(
  showToast = false
) {
  const ok =
    isManagerMode() && page === 'team'
      ? await loadTeam({
          quiet: !showToast
        })
      : await loadCurrent({
          quiet: !showToast
        });

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
      localStorage.getItem(SESSION_KEY) ||
      'null'
    );

    if (!x?.id || !x?.password) {
      return false;
    }

    session = x;

    managerView =
      x.managerView ||
      (
        x.mode === 'manager'
          ? 'M21954'
          : x.id
      );

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

/* =========================================================
   FINAL PREMIUM LOGIN
========================================================= */

async function login(rawId, password) {
  const raw = String(rawId || '').trim();
  const pin = String(password || '').trim();

  if (!raw) {
    toast('Enter Staff ID');
    return;
  }

  if (!pin) {
    toast('Enter Password');
    return;
  }

  if (!backendUrl()) {
    toast(
      'Backend URL missing in config.js',
      3500
    );
    return;
  }

  const normalizedId = normalizeId(raw);

  /*
    PREMIUM LOGIN COMPATIBILITY

    manager / M21954
    M21954 / M21954

    Both enter the same authenticated M21954 account.
    The "manager" alias opens Manager Mode.
  */
  const managerAlias =
    raw.toLowerCase() === 'manager';

  let loginPassword = pin;

  if (
    (
      managerAlias ||
      normalizedId === 'M21954'
    ) &&
    pin.toUpperCase() === 'M21954'
  ) {
    loginPassword = 'M21954';
  }

  setBusy(true, 'Signing in…');

  try {
    let result;

    try {
      /*
        V8 backend remains source of truth.
      */
      result = await backendLogin(
        normalizedId,
        loginPassword
      );

    } catch (backendError) {
      /*
        Compatibility fallback for the original
        premium Manager login.

        This fallback is intentionally limited
        to M21954 only. Other SR accounts still
        require backend authentication.
      */
      if (
        normalizedId === 'M21954' &&
        loginPassword.toUpperCase() === 'M21954'
      ) {
        result = {
          id: 'M21954',
          user:
            localUser('M21954') || {
              'Staff ID': 'M21954',
              'Full Name': 'Mehedi Alim Ayon',
              Role: managerAlias
                ? 'MANAGER'
                : 'SR'
            }
        };
      } else {
        throw backendError;
      }
    }

    const u = result.user || {};

    const role = String(
      u.Role ||
      u.role ||
      localUser(result.id)?.role ||
      (
        managerAlias
          ? 'MANAGER'
          : 'SR'
      )
    );

    session = {
      id: result.id,
      password: loginPassword,

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
        ? (
            session.managerView ||
            'M21954'
          )
        : session.id;

    /*
      Manager opens ALL SR / Team dashboard.
      SR opens own dashboard.
    */
    page =
      session.mode === 'manager'
        ? 'team'
        : 'dashboard';

    saveSession();
    openApp();

    setBusy(false);
    render();

    if (session.mode === 'manager') {
      await Promise.all([
        loadTeam({ quiet: true }),
        loadCurrent({ quiet: true })
      ]);
    } else {
      await loadCurrent({
        quiet: true
      });
    }

    initPushSystem();
    render();

  } catch (e) {
    console.error('LOGIN ERROR', e);

    toast(
      e?.message ||
      'Wrong Staff ID / Password',
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

    settingsBtn.onclick = () =>
      setPage('settings');
  }

  const nav = $('#bottomNav');

  if (
    nav &&
    !nav.querySelector(
      '[data-page="proposal"]'
    )
  ) {
    const b =
      document.createElement('button');

    b.dataset.page = 'proposal';

    b.innerHTML = `
      <span class="nav-icon">▤</span>
      <small>PO Form</small>
    `;

    nav.appendChild(b);

    nav.style.gridTemplateColumns =
      'repeat(6,1fr)';
  }

  const app = $('#appView');

  if (
    app &&
    !$('#developerCredit')
  ) {
    const c =
      document.createElement('div');

    c.id = 'developerCredit';

    c.style.cssText =
      'text-align:center;' +
      'font-size:10px;' +
      'color:#78828d;' +
      'padding:8px 10px 90px;' +
      'letter-spacing:.45px';

    c.innerHTML = `
      Developed by
      <a
        href="https://mehedialimayon-del.github.io/MEHEDI-ALIM-AYON-PORTFOLIO/"
        target="_blank"
        rel="noopener"
        style="
          color:#ff7414;
          text-decoration:none;
          font-weight:900;
          letter-spacing:.8px
        "
      >KAM AYON</a>
    `;

    app.insertBefore(c, nav);
  }
}

function refreshTop() {
  if (!session) return;

  if ($('#roleLabel')) {
    $('#roleLabel').textContent =
      isManagerMode()
        ? 'MANAGER ACCESS • ' +
          session.id
        : (
            String(
              session.role || 'SR'
            ).toUpperCase() +
            ' • ' +
            session.id
          );
  }

  if ($('#welcomeName')) {
    $('#welcomeName').textContent =
      isManagerMode()
        ? 'Manager • ' +
          viewedName()
        : sessionName();
  }

  updateNotificationBadge();
}

function setPage(next, opts = {}) {
  if (!next) return;

  const prev = page;
  page = next;

  if (
    session &&
    !opts.fromHistory &&
    prev !== next
  ) {
    history.pushState(
      {
        sph: true,
        page: next
      },
      '',
      location.href
    );
  }

  render();

  window.scrollTo({
    top: 0,
    behavior: 'auto'
  });
}

function bindNav() {
  $$('#bottomNav button[data-page]')
    .forEach(b => {
      b.classList.toggle(
        'active',
        b.dataset.page === page
      );

      b.onclick = () =>
        setPage(b.dataset.page);
    });
}

function pushHistoryState() {
  if (!history.state?.sph) {
    history.replaceState(
      {
        sph: true,
        page: page || 'dashboard'
      },
      '',
      location.href
    );
  }
}

window.addEventListener(
  'popstate',
  e => {
    if (!session) return;

    page =
      e.state?.page ||
      'dashboard';

    render();
  }
);

/* =========================================================
   COMMON DATA HELPERS
========================================================= */

function routeOutlets() {
  return Array.isArray(
    current?.outlets
  )
    ? current.outlets
    : [];
}

function skuMaster() {
  return Array.isArray(
    current?.sku
  )
    ? current.sku
    : [];
}

function allSkuNames() {
  const cloud = skuMaster()
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
        String(
          x['Outlet Name']
        ) ===
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
              x['Outlet Category'] ||
              ''
            )
              .trim()
              .toLowerCase()
          )
      )
      .map(
        x =>
          String(
            x['Product Name'] ||
            ''
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
        x => `
          <option
            value="${esc(
              x['Outlet Name']
            )}"
            ${
              String(
                x['Outlet Name']
              ) ===
              String(selected)
                ? 'selected'
                : ''
            }
          >
            ${esc(
              x['Outlet Name']
            )}
          </option>
        `
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
        x => `
          <option
            value="${esc(x)}"
            ${
              String(x) ===
              String(selected)
                ? 'selected'
                : ''
            }
          >
            ${esc(x)}
          </option>
        `
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
        ) ===
          String(name) &&
        String(x.Date)
          .slice(0, 10) ===
          date
    )
    .reduce(
      (a, x) =>
        a +
        n(x['Sales Value']),
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
        n(x['Sales Value']),
      0
    );
}

function taskDone(x) {
  return (
    String(
      x.Status || ''
    ).toUpperCase() ===
    'DONE'
  );
}

function activePenalty(x) {
  return (
    String(
      x.Status || 'ACTIVE'
    ).toUpperCase() ===
    'ACTIVE'
  );
}

function selectedDayData() {
  return (
    current?.dayData || {
      daily: [],
      outletSales: [],
      skuSales: []
    }
  );
}
function personalTargetProgress(t) {
  const metric = String(t.Metric || 'SALES_RM').toUpperCase();
  const start = String(t['Start Date'] || selectedMonth + '-01').slice(0, 10);
  const end = String(t['End Date'] || '9999-12-31').slice(0, 10);
  const sku = String(t['SKU Name'] || '');

  let actual = 0;

  if (metric === 'CARTONS') {
    actual = (current?.skuSales || [])
      .filter(x =>
        String(x.Date).slice(0, 10) >= start &&
        String(x.Date).slice(0, 10) <= end &&
        (!sku || String(x['SKU Name']) === sku)
      )
      .reduce((a, x) => a + n(x.Cartons), 0);

  } else if (metric === 'SKU_SALES_RM') {
    actual = (current?.skuSales || [])
      .filter(x =>
        String(x.Date).slice(0, 10) >= start &&
        String(x.Date).slice(0, 10) <= end &&
        (!sku || String(x['SKU Name']) === sku)
      )
      .reduce((a, x) => a + n(x['Sales Value']), 0);

  } else {
    actual = (current?.daily || [])
      .filter(x =>
        String(x.Date).slice(0, 10) >= start &&
        String(x.Date).slice(0, 10) <= end
      )
      .reduce((a, x) => a + n(x['Today Sales']), 0);
  }

  const target = n(t['Target Value']);

  return {
    actual,
    target,
    remaining: Math.max(0, target - actual),
    percent: target ? actual / target * 100 : 0
  };
}

/* =========================================================
   COMPONENTS
========================================================= */

function kpi(label, value, sub = '', cls = '') {
  return `
    <div class="kpi">
      <div class="label">${esc(label)}</div>
      <div class="value ${cls}">${esc(value)}</div>
      <div class="sub">${esc(sub)}</div>
    </div>
  `;
}

function progressBar(value) {
  const v = Math.max(0, Math.min(100, n(value)));

  return `
    <div class="progress-wrap">
      <div
        class="progress ${v >= 100 ? 'goodbar' : ''}"
        style="width:${v}%"
      ></div>
    </div>
  `;
}

function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}

function table(title, heads, rows) {
  return `
    <div class="card" style="margin-top:12px;overflow:auto">
      <h3>${esc(title)}</h3>

      <table
        class="summary-table"
        style="min-width:${Math.max(620, heads.length * 120)}px"
      >
        <thead>
          <tr>
            ${heads.map(h => `<th>${esc(h)}</th>`).join('')}
          </tr>
        </thead>

        <tbody>
          ${
            rows.length
              ? rows.map(r => `
                  <tr>
                    ${r.map(c => `<td>${esc(c)}</td>`).join('')}
                  </tr>
                `).join('')
              : `
                <tr>
                  <td colspan="${heads.length}">No data</td>
                </tr>
              `
          }
        </tbody>
      </table>
    </div>
  `;
}

function syncStatus() {
  const online = navigator.onLine;

  return `
    <div class="status-strip">

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

    </div>
  `;
}

function teamUsers() {
  const fromTeam = teamSnapshot.map(x => ({
    id: x.staffId,
    name: x.name
  }));

  if (fromTeam.length) return fromTeam;

  return (D.users || [])
    .filter(x =>
      x.role === 'SR' ||
      String(x.role).includes('MANAGER')
    )
    .map(x => ({
      id: x.id,
      name: x.name
    }));
}

function monthBar({ showManager = true } = {}) {
  const managerChooser =
    showManager && isManagerMode()
      ? `
        <label style="flex:1;min-width:190px;margin:0">
          View SR
          <select id="managerPick">
            ${teamUsers().map(u => `
              <option
                value="${esc(u.id)}"
                ${u.id === managerView ? 'selected' : ''}
              >
                ${esc(u.name)} • ${u.id}
              </option>
            `).join('')}
          </select>
        </label>
      `
      : '';

  const mode =
    String(session?.role || '').toUpperCase().includes('MANAGER')
      ? `
        <div class="mode-toggle" style="flex:1;min-width:190px">
          <button
            id="mySrMode"
            class="${session.mode === 'sr' ? 'active' : ''}"
          >
            My SR
          </button>

          <button
            id="managerMode"
            class="${session.mode === 'manager' ? 'active' : ''}"
          >
            Manager
          </button>
        </div>
      `
      : '';

  return `
    <div class="monthbar">

      <label style="margin:0;flex:1;min-width:145px">
        Month
        <input
          id="monthPick"
          type="month"
          value="${selectedMonth}"
        >
      </label>

      ${mode}
      ${managerChooser}

    </div>
  `;
}

function dateFilter(label = 'Report Date') {
  return `
    <label>
      ${esc(label)}
      <input
        id="datePick"
        type="date"
        value="${selectedDate}"
      >
    </label>
  `;
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
    mp.onchange = async e => {
      selectedMonth = e.target.value;

      if (!selectedDate.startsWith(selectedMonth)) {
        selectedDate = selectedMonth + '-01';
      }

      await handleCommonFilterChange();
    };
  }

  const dp = $('#datePick');

  if (dp) {
    dp.onchange = async e => {
      selectedDate =
        e.target.value || localDate();

      selectedMonth =
        selectedDate.slice(0, 7);

      await handleCommonFilterChange();
    };
  }

  const mm = $('#managerPick');

  if (mm) {
    mm.onchange = async e => {
      managerView = e.target.value;

      session.managerView =
        managerView;

      saveSession();

      await loadCurrent();

      render();
    };
  }

  const sr = $('#mySrMode');

  if (sr) {
    sr.onclick = async () => {
      session.mode = 'sr';

      managerView =
        session.id;

      session.managerView =
        managerView;

      saveSession();

      await loadCurrent();

      setPage('dashboard');
    };
  }

  const mgr = $('#managerMode');

  if (mgr) {
    mgr.onclick = async () => {
      session.mode = 'manager';

      managerView =
        session.managerView ||
        'M21954';

      saveSession();

      await loadTeam();

      setPage('team');
    };
  }

  $$('[data-go]').forEach(
    b =>
      b.onclick = () =>
        setPage(b.dataset.go)
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function alertsForCurrent() {
  if (!current) return [];

  const a = [];
  const perf = current.performance || {};

  const pending =
    (current.tasks || [])
      .filter(x => !taskDone(x));

  if (pending.length) {
    a.push({
      icon: '✅',
      title: pending.length + ' pending task(s)',
      text: 'Open Tasks to review manager instructions.',
      page: 'tasks'
    });
  }

  if (n(perf.shortfall) > 0) {
    a.push({
      icon: '🎯',
      title: money(perf.shortfall) + ' shortfall',
      text: 'Current achievement ' + pct(perf.percent) + '.',
      page: 'summary'
    });
  }

  if (n(perf.zeroOutlets) > 0) {
    a.push({
      icon: '🏪',
      title: perf.zeroOutlets + ' zero-sales outlet(s)',
      text: 'Use Outlet Report to prioritize coverage.',
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
    .slice(0, 3)
    .forEach(x =>
      a.push({
        icon: '🏆',
        title: x.name || 'Incentive',
        text:
          `${x.actual} / ${x.target} • ` +
          `${x.remaining} remaining • ` +
          `RM ${n(x.rewardRM).toFixed(2)} reward`,
        page: 'incentives'
      })
    );

  return a;
}

function renderDashboard() {
  if (!current) {
    $('#mainContent').innerHTML =
      monthBar() +
      `
        <div class="card">
          ${empty('Live database is not loaded yet.')}
          <button
            id="loadNow"
            class="btn primary"
          >
            LOAD DATABASE
          </button>
        </div>
      `;

    bindCommon();

    $('#loadNow').onclick =
      () => refreshCloud(true);

    return;
  }

  const p = current.performance || {};
  const f = current.forecast || {};
  const inc = current.incomeSummary || {};
  const cmp = current.comparisons || {};
  const alerts = alertsForCurrent();

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">

      <p class="eyebrow">
        LIVE SALES DATABASE
      </p>

      <h3>${esc(viewedName())}</h3>

      <p class="muted">
        ${monthName(selectedMonth)}
        • Source of truth: Google Sheets
      </p>

      ${progressBar(p.percent)}
      ${syncStatus()}

      <div class="form-actions">

        <button
          id="syncNow"
          class="btn secondary"
        >
          ↻ REFRESH LIVE
        </button>

        ${
          isManagerMode()
            ? `
              <button
                class="btn secondary"
                data-go="team"
              >
                👥 TEAM
              </button>
            `
            : ''
        }

      </div>
    </section>

    <div class="grid kpi-grid">

      ${kpi(
        'MONTH TARGET',
        money(p.target),
        monthName(selectedMonth)
      )}

      ${kpi(
        'ACHIEVEMENT',
        money(p.achievement),
        pct(p.percent),
        p.percent >= 100 ? 'good' : ''
      )}

      ${kpi(
        'SHORTFALL',
        money(p.shortfall),
        'Remaining',
        p.shortfall ? 'bad' : 'good'
      )}

      ${kpi(
        'TODAY SALES',
        money(p.todaySales),
        dateLabel(selectedDate)
      )}

      ${kpi(
        'OUTLET COVERAGE',
        pct(p.coverage),
        `${n(p.coveredOutlets)}/${n(p.routeOutlets)} outlets`,
        p.zeroOutlets ? 'warn' : 'good'
      )}

      ${kpi(
        'ZERO OUTLETS',
        String(n(p.zeroOutlets)),
        'Month-to-date',
        p.zeroOutlets ? 'bad' : 'good'
      )}

      ${kpi(
        'PROJECTED MONTH',
        money(f.projectedSales),
        f.onTrack
          ? 'On track'
          : 'Needs acceleration',
        f.onTrack
          ? 'good'
          : 'warn'
      )}

      ${kpi(
        'FINAL INCOME',
        money(inc.finalIncome),
        'After incentive & penalty'
      )}

      ${kpi(
        'LAST MONTH SAME DAY',
        money(cmp.lastMonthSameDay),
        cmp.lastMonthDate
          ? dateLabel(cmp.lastMonthDate)
          : '—'
      )}

      ${kpi(
        'LAST YEAR SAME DAY',
        money(cmp.lastYearSameDay),
        cmp.lastYearDate
          ? dateLabel(cmp.lastYearDate)
          : '—'
      )}

    </div>

    <div class="section-title">
      <h3>Smart Actions</h3>
    </div>

    <div class="mini-grid">

      <button class="btn secondary" data-go="execution">
        📦 Order & Delivery
      </button>

      <button class="btn secondary" data-go="daily">
        ＋ Legacy Sales
      </button>

      <button class="btn secondary" data-go="zero">
        🏪 Outlet Report
      </button>

      <button class="btn secondary" data-go="incentives">
        🏆 Incentives
      </button>

      <button class="btn secondary" data-go="opportunity">
        ⚡ Opportunity
      </button>

      <button class="btn secondary" data-go="tasks">
        ⚠️ Important Work
      </button>

      <button class="btn secondary" data-go="cpo">
        📍 CPO Execution
      </button>

      <button class="btn secondary" data-go="activity">
        🕘 Timeline
      </button>

      <button class="btn secondary" data-go="planning">
        ◎ Monthly Plan
      </button>

      <button class="btn secondary" data-go="summary">
        ▦ Full Summary
      </button>

    </div>

    <div class="section-title">
      <h3>Attention</h3>
    </div>

    ${
      alerts.length
        ? `
          <div class="notification-list">

            ${alerts.map(x => `
              <button
                class="notification-item"
                data-go="${x.page}"
                style="
                  text-align:left;
                  width:100%;
                  color:inherit
                "
              >
                <div class="notification-icon">
                  ${x.icon}
                </div>

                <div>
                  <h4>${esc(x.title)}</h4>
                  <p>${esc(x.text)}</p>
                </div>
              </button>
            `).join('')}

          </div>
        `
        : `
          <div class="card">
            <span class="pill green">
              ALL CLEAR
            </span>

            <p
              class="muted"
              style="margin:10px 0 0"
            >
              No urgent item found for the selected period.
            </p>
          </div>
        `
    }
  `;

  bindCommon();

  $('#syncNow').onclick =
    () => refreshCloud(true);
}

/* =========================================================
   DAILY / OUTLET / SKU ENTRY
========================================================= */

function renderDaily() {
  if (isManagerMode()) {
    $('#mainContent').innerHTML = `
      ${monthBar()}

      <div class="card">
        <h2>Manager mode is view-only</h2>
        <p class="muted">
          Switch to My SR to enter your own sales.
        </p>
      </div>
    `;

    bindCommon();
    return;
  }

  $('#mainContent').innerHTML = `
    ${monthBar({ showManager: false })}

    <div class="card">

      <p class="eyebrow">STEP 1</p>
      <h2>Daily Route Total</h2>

      <form
        id="dailyForm"
        class="stack"
      >

        <label>
          Date
          <input
            name="date"
            type="date"
            value="${selectedDate}"
            required
          >
        </label>

        <label>
          Today Total Sales (RM)
          <input
            name="todaySales"
            type="number"
            min="0"
            step="0.01"
            required
          >
        </label>

        <div class="form-grid">

          <label>
            Last Month Same Day (RM)
            <input
              name="lastMonthSameDay"
              type="number"
              min="0"
              step="0.01"
              value="0"
            >
          </label>

          <label>
            Last Year Same Day (RM)
            <input
              name="lastYearSameDay"
              type="number"
              min="0"
              step="0.01"
              value="0"
            >
          </label>

        </div>

        <div class="form-grid">

          <label>
            Active (RM)
            <input
              name="active"
              type="number"
              min="0"
              step="0.01"
              value="0"
            >
          </label>

          <label>
            Prepare for Trip / PPR (RM)
            <input
              name="prepareTrip"
              type="number"
              min="0"
              step="0.01"
              value="0"
            >
          </label>

        </div>

        <label>
          Order Amount (RM)
          <input
            name="orderAmount"
            type="number"
            min="0"
            step="0.01"
            value="0"
          >
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

    <div
      class="card"
      style="margin-top:12px"
    >

      <p class="eyebrow">STEP 2</p>
      <h2>Outlet & SKU Sale</h2>

      <form
        id="outletForm"
        class="stack"
      >

        <label>
          Date
          <input
            name="date"
            type="date"
            value="${selectedDate}"
            required
          >
        </label>

        <label>
          Search Outlet
          <input
            id="outletSearch"
            placeholder="Type outlet name or code"
          >
        </label>

        <label>
          Select Outlet
          <select
            id="outletSel"
            name="outlet"
            required
          >
            ${outletOptions()}
          </select>
        </label>

        <label>
          Outlet Sales (RM)
          <input
            name="sales"
            type="number"
            min="0"
            step="0.01"
            required
          >
        </label>

        <label>
          Search SKU
          <input
            id="skuSearch"
            placeholder="Type SKU name"
          >
        </label>

        <label>
          Select SKU
          <select
            id="skuSel"
            name="sku"
          >
            <option value="">
              Select outlet first
            </option>
          </select>
        </label>

        <div class="form-grid">

          <label>
            Cartons Sold
            <input
              name="cartons"
              type="number"
              min="0"
              step="1"
              value="0"
            >
          </label>

          <label>
            SKU Sales Value (RM)
            <input
              name="skuValue"
              type="number"
              min="0"
              step="0.01"
              value="0"
            >
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
    </div>
  `;

  bindCommon();

  const oSearch = $('#outletSearch');
  const oSel = $('#outletSel');
  const sSearch = $('#skuSearch');
  const sSel = $('#skuSel');

  const refreshSku = () => {
    sSel.innerHTML =
      oSel.value
        ? skuOptions(
            oSel.value,
            sSel.value,
            sSearch.value
          )
        : `
          <option value="">
            Select outlet first
          </option>
        `;
  };

  oSearch.oninput = () => {
    const old = oSel.value;

    oSel.innerHTML =
      outletOptions(
        old,
        oSearch.value
      );

    if (
      [...oSel.options]
        .some(x => x.value === old)
    ) {
      oSel.value = old;
    }

    refreshSku();
  };

  oSel.onchange = () => {
    sSearch.value = '';
    refreshSku();
  };

  sSearch.oninput =
    refreshSku;

  $('#dailyForm').onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(e.target);

      const date =
        String(fd.get('date'));

      const payload = {
        requestId: idGen(),
        date,
        month: date.slice(0, 7),

        todaySales:
          n(fd.get('todaySales')),

        lastMonthSameDay:
          n(fd.get('lastMonthSameDay')),

        lastYearSameDay:
          n(fd.get('lastYearSameDay')),

        active:
          n(fd.get('active')),

        prepareTrip:
          n(fd.get('prepareTrip')),

        orderAmount:
          n(fd.get('orderAmount')),

        note:
          String(fd.get('note') || '')
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

        selectedDate = date;
        selectedMonth =
          date.slice(0, 7);

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
        new FormData(e.target);

      const date =
        String(fd.get('date'));

      const outletName =
        String(
          fd.get('outlet') || ''
        );

      const skuName =
        String(
          fd.get('sku') || ''
        );

      const outlet =
        routeOutlets().find(
          x =>
            String(
              x['Outlet Name']
            ) === outletName
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
                baseId + '-O',

              date,

              month:
                date.slice(0, 7),

              outletCode:
                outlet[
                  'Outlet Code'
                ] || '',

              outletName,

              sales:
                n(fd.get('sales')),

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
                  baseId + '-S',

                date,

                month:
                  date.slice(0, 7),

                outletCode:
                  outlet[
                    'Outlet Code'
                  ] || '',

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

        selectedDate = date;
        selectedMonth =
          date.slice(0, 7);

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
   OPERATIONAL EXECUTION — ORDER → ACTUAL DELIVERY
========================================================= */

function deliveryPill(st) {
  st =
    String(
      st || 'PENDING'
    ).toUpperCase();

  return `
    <span
      class="pill ${
        st === 'DELIVERED'
          ? 'green'
          : st === 'CANCELLED'
            ? 'red'
            : 'orange'
      }"
    >
      ${esc(st)}
    </span>
  `;
}

function renderExecution() {
  const orders =
    current?.orders || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">
        ACTUAL SALES CONTROL
      </p>

      <h3>
        Order → Delivery → Actual Sale
      </h3>

      <p class="muted">
        Booked order does not count as sales.
        Only delivered value counts in achievement,
        incentive and income.
      </p>
    </section>

    ${
      !isManagerMode()
        ? `
          <div
            class="card"
            style="margin-top:12px"
          >
            <h2>New Order</h2>

            <form
              id="execOrderForm"
              class="stack"
            >

              <label>
                Date
                <input
                  name="date"
                  type="date"
                  value="${selectedDate}"
                  required
                >
              </label>

              <label>
                Outlet
                <select
                  name="outlet"
                  required
                >
                  ${outletOptions()}
                </select>
              </label>

              <label>
                Ordered Amount (RM)
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step=".01"
                  required
                >
              </label>

              <label>
                SKU (optional)
                <input
                  name="sku"
                  placeholder="Product name"
                >
              </label>

              <div class="form-grid">

                <label>
                  Ordered Cartons
                  <input
                    name="cartons"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                  >
                </label>

                <label>
                  SKU Value (RM)
                  <input
                    name="skuValue"
                    type="number"
                    min="0"
                    step=".01"
                    value="0"
                  >
                </label>

              </div>

              <label>
                Note
                <textarea name="note"></textarea>
              </label>

              <button class="btn primary">
                SAVE AS PENDING ORDER
              </button>

            </form>
          </div>
        `
        : ''
    }

    <div class="section-title">
      <h3>Order & Delivery Register</h3>
    </div>

    <div class="list">
      ${
        orders.length
          ? orders.map((o, i) => `
              <div class="list-item">

                <div class="row">

                  <div>
                    <h4>
                      ${i + 1}. ${esc(o.outletName)}
                    </h4>

                    <p>
                      ${dateLabel(o.date)}
                      • Order ${money(o.orderedAmount)}
                      • Delivered ${money(o.deliveredAmount)}
                      • Pending ${money(o.pendingAmount)}
                    </p>
                  </div>

                  ${deliveryPill(o.status)}

                </div>

                <div
                  class="form-grid"
                  style="margin-top:10px"
                >

                  <input
                    data-delamt="${esc(o.orderId)}"
                    type="number"
                    min="0"
                    max="${n(o.orderedAmount)}"
                    step=".01"
                    value="${n(o.deliveredAmount)}"
                  >

                  <select
                    data-delstatus="${esc(o.orderId)}"
                  >
                    <option
                      ${o.status === 'PENDING' ? 'selected' : ''}
                    >
                      PENDING
                    </option>

                    <option
                      ${o.status === 'PARTIAL' ? 'selected' : ''}
                    >
                      PARTIAL
                    </option>

                    <option
                      ${o.status === 'DELIVERED' ? 'selected' : ''}
                    >
                      DELIVERED
                    </option>

                    <option
                      ${o.status === 'CANCELLED' ? 'selected' : ''}
                    >
                      CANCELLED
                    </option>
                  </select>

                </div>

                <div class="form-actions">

                  <button
                    class="btn secondary"
                    data-deliver="${esc(o.orderId)}"
                  >
                    UPDATE DELIVERY
                  </button>

                </div>

              </div>
            `).join('')
          : empty('No order found.')
      }
    </div>
  `;

  bindCommon();

  if ($('#execOrderForm')) {
    $('#execOrderForm').onsubmit =
      async e => {
        e.preventDefault();

        const fd =
          new FormData(e.target);

        const outletName =
          String(
            fd.get('outlet') ||
            ''
          );

        const outlet =
          routeOutlets().find(
            x =>
              String(
                x['Outlet Name']
              ) === outletName
          );

        if (!outlet) {
          return toast(
            'Select outlet'
          );
        }

        setBusy(
          true,
          'Saving pending order…'
        );

        try {
          const r =
            await apiPost(
              'saveOrder',
              {
                requestId:
                  idGen(),

                date:
                  String(
                    fd.get('date')
                  ),

                outletCode:
                  outlet[
                    'Outlet Code'
                  ] || '',

                outletName,

                orderedAmount:
                  n(
                    fd.get(
                      'amount'
                    )
                  ),

                skuName:
                  String(
                    fd.get('sku') ||
                    ''
                  ),

                orderedCartons:
                  n(
                    fd.get(
                      'cartons'
                    )
                  ),

                skuValue:
                  n(
                    fd.get(
                      'skuValue'
                    )
                  ),

                note:
                  String(
                    fd.get('note') ||
                    ''
                  )
              }
            );

          if (!r?.ok) {
            throw new Error(
              r?.error ||
              'Order save failed'
            );
          }

          await loadCurrent({
            quiet: true
          });

          toast(
            'Pending order saved'
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

  $$('[data-deliver]')
    .forEach(b => {
      b.onclick = async () => {
        const id =
          b.dataset.deliver;

        const amount =
          n(
            $(
              `[data-delamt="${CSS.escape(id)}"]`
            )?.value
          );

        const status =
          String(
            $(
              `[data-delstatus="${CSS.escape(id)}"]`
            )?.value ||
            'PENDING'
          );

        setBusy(
          true,
          'Updating delivery…'
        );

        try {
          const r =
            await apiPost(
              'updateDelivery',
              {
                orderId: id,
                deliveredAmount:
                  amount,
                status
              }
            );

          if (!r?.ok) {
            throw new Error(
              r?.error ||
              'Delivery update failed'
            );
          }

          await loadCurrent({
            quiet: true
          });

          toast(
            'Delivery updated'
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
    });
}

/* =========================================================
   OUTLET REPORT / ZERO SALES
========================================================= */

function renderZero() {
  const rows =
    routeOutlets().map(o => {
      const name =
        String(
          o['Outlet Name'] || ''
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
              current?.performance
                ?.target
            ) /
            routeOutlets().length
          : 0;

      const target =
        n(
          plan?.[
            'Outlet Target'
          ]
        ) ||
        autoTarget;

      return {
        name,
        code:
          o['Outlet Code'] ||
          '',
        category:
          o.Category || '',
        day: d,
        mtd,
        target,
        gap:
          target
            ? Math.max(
                0,
                target - mtd
              )
            : 0
      };
    });

  const q =
    getPref().zeroSearch || '';

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <div
      class="card"
      style="margin-bottom:12px"
    >
      <div class="form-grid">

        ${dateFilter(
          'Daily Sale Date'
        )}

        <label>
          Search Outlet
          <input
            id="zeroSearch"
            value="${esc(q)}"
            placeholder="Outlet name / code"
          >
        </label>

      </div>
    </div>

    <section class="hero">

      <p class="eyebrow">
        OUTLET SALES / ZERO SALES
      </p>

      <h3>
        ${dateLabel(selectedDate)}
      </h3>

      <p class="muted">
        Daily sale + MTD sale + monthly
        outlet target stay visible together.
      </p>

      ${syncStatus()}

      <button
        id="zeroRefresh"
        class="btn secondary"
        style="margin-top:10px"
      >
        ↻ REFRESH LIVE
      </button>

    </section>

    <div
      id="zeroList"
      class="list"
      style="margin-top:12px"
    ></div>
  `;

  bindCommon();

  const paint = () => {
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
          String(x.code)
            .toLowerCase()
            .includes(query)
      );

    $('#zeroList').innerHTML =
      list.length
        ? list.map(x => `
            <div class="list-item">

              <div class="row">

                <div>
                  <h4>
                    ${esc(x.name)}
                  </h4>

                  <p>
                    ${esc(x.category)}
                    •
                    ${esc(
                      x.code ||
                      'No code'
                    )}
                  </p>

                  <p style="margin-top:7px">
                    <strong style="color:#fff">
                      Today ${money(x.day)}
                    </strong>

                    • MTD ${money(x.mtd)}
                    • Target ${
                      x.target
                        ? money(x.target)
                        : 'Not set'
                    }

                    ${
                      x.target
                        ? ' • Gap ' +
                          money(x.gap)
                        : ''
                    }
                  </p>
                </div>

                <span
                  class="pill ${
                    x.day > 0
                      ? 'green'
                      : 'red'
                  }"
                >
                  ${
                    x.day > 0
                      ? 'SALE'
                      : 'ZERO'
                  }
                </span>

              </div>
            </div>
          `).join('')
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
    () => refreshCloud(true);
}

/* =========================================================
   MONTHLY PLANNING
========================================================= */

function parsePlanSkus(p) {
  const raw =
    typeof p?.[
      'Targeted SKU List'
    ] === 'string'
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
          ] || []
        );

  return Array.isArray(raw)
    ? raw
    : [];
}

function planningList() {
  const plans =
    current?.plans || [];

  if (!plans.length) {
    return empty(
      'No monthly plan yet.'
    );
  }

  return `
    <div class="list">

      ${plans.map(p => {
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

        return `
          <div class="card">

            <div class="row">

              <div>
                <h3>
                  ${esc(
                    p['Outlet Name']
                  )}
                </h3>

                <p class="muted">
                  ${money(mtd)}
                  /
                  ${money(target)}
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

              <span
                class="pill ${
                  mtd >= target &&
                  target
                    ? 'green'
                    : 'orange'
                }"
              >
                ${
                  target
                    ? money(
                        Math.max(
                          0,
                          target - mtd
                        )
                      ) +
                      ' left'
                    : 'PLAN'
                }
              </span>

            </div>

            ${
              list.length
                ? `
                  <div class="status-strip">

                    ${list.map(x => `
                      <span class="status-chip">
                        ${esc(
                          typeof x === 'string'
                            ? x
                            : x.name ||
                              ''
                        )}
                      </span>
                    `).join('')}

                  </div>
                `
                : ''
            }

          </div>
        `;
      }).join('')}

    </div>
  `;
}

function renderPlanning() {
  if (isManagerMode()) {
    $('#mainContent').innerHTML = `
      ${monthBar()}

      <div class="card">
        <h2>
          ${esc(viewedName())}
          • Monthly Plan
        </h2>
      </div>

      <div style="margin-top:12px">
        ${planningList()}
      </div>
    `;

    bindCommon();
    return;
  }

  selectedPlanningSkus = [];

  $('#mainContent').innerHTML = `
    ${monthBar({
      showManager: false
    })}

    <div class="card">

      <h2>
        Monthly Outlet & SKU Plan
      </h2>

      <form
        id="planForm"
        class="stack"
      >

        <label>
          Search Outlet
          <input
            id="planOutletSearch"
            placeholder="Outlet name"
          >
        </label>

        <label>
          Select Outlet
          <select
            id="planOutlet"
            name="outlet"
            required
          >
            ${outletOptions()}
          </select>
        </label>

        <label>
          Outlet Monthly Target (RM)
          <input
            name="outletTarget"
            type="number"
            min="0"
            step="0.01"
            required
          >
        </label>

        <label>
          Target SKU Count
          <input
            name="targetSkuCount"
            type="number"
            min="0"
            step="1"
            value="0"
          >
        </label>

        <label>
          Search SKU
          <input
            id="planSkuSearch"
            placeholder="SKU name"
          >
        </label>

        <label>
          Select SKU
          <select id="planSku">
            <option value="">
              Select outlet first
            </option>
          </select>
        </label>

        <button
          type="button"
          id="addPlanSku"
          class="btn secondary"
        >
          + ADD SKU
        </button>

        <div
          id="planSkuChips"
          class="chipbox"
        ></div>

        <button class="btn primary">
          SAVE MONTHLY PLAN
        </button>

      </form>
    </div>

    <div class="section-title">
      <h3>Plan vs Achievement</h3>
    </div>

    ${planningList()}
  `;

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

  const paintSkus = () => {
    chips.innerHTML =
      selectedPlanningSkus
        .map(x => `
          <span class="chip">
            ${esc(x)}
            <button
              type="button"
              data-rmsku="${esc(x)}"
            >
              ×
            </button>
          </span>
        `)
        .join('');

    $$('[data-rmsku]')
      .forEach(b => {
        b.onclick = () => {
          selectedPlanningSkus =
            selectedPlanningSkus
              .filter(
                x =>
                  x !==
                  b.dataset.rmsku
              );

          paintSkus();
          refreshSku();
        };
      });
  };

  const refreshSku = () => {
    s.innerHTML =
      o.value
        ? skuOptions(
            o.value,
            s.value,
            ss.value
          )
        : `
          <option value="">
            Select outlet first
          </option>
        `;

    [...s.options]
      .forEach(opt => {
        if (
          selectedPlanningSkus
            .includes(opt.value)
        ) {
          opt.disabled = true;
        }
      });
  };

  os.oninput = () => {
    const old = o.value;

    o.innerHTML =
      outletOptions(
        old,
        os.value
      );

    refreshSku();
  };

  o.onchange = () => {
    selectedPlanningSkus = [];

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
        new FormData(e.target);

      const outletName =
        String(
          fd.get('outlet') ||
          ''
        );

      const outlet =
        routeOutlets().find(
          x =>
            String(
              x['Outlet Name']
            ) === outletName
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
                current
                  ?.performance
                  ?.target ||
                0,

              outletCode:
                outlet[
                  'Outlet Code'
                ] || '',

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
                selectedPlanningSkus
                  .length,

              targetSkus:
                selectedPlanningSkus,

              skuSalesPlan: 0
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
   INCENTIVES — START
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
    typeof x.perSku === 'object'
      ? Object
          .entries(x.perSku)
          .sort(
            (a, b) =>
              b[1] - a[1]
          )
      : [];

  return `
    <div class="card">

      <div class="row">

        <div>

          <span
            class="pill ${
              x.fulfilled
                ? 'green'
                : 'orange'
            }"
          >
            ${esc(
              String(
                x.category ||
                'INCENTIVE'
              ).toUpperCase()
            )}
          </span>

          <h3 style="margin:9px 0 5px">
            ${esc(
              x.name ||
              'Incentive'
            )}
          </h3>

          <p class="muted">
            ${esc(
              x.description ||
              ''
            )}
          </p>

        </div>

        <div style="text-align:right">
          <strong>
            ${money(x.rewardRM)}
          </strong>

          <p class="muted">
            reward
          </p>
        </div>

      </div>

      <div class="status-strip">

        <span class="status-chip">
          ${esc(skuText)}
        </span>

        <span class="status-chip">
          ${esc(
            String(
              x.metric ||
              ''
            )
          )}
        </span>

        ${
          x.calculationRule ===
          'EACH_MIN'
            ? `
              <span class="status-chip">
                Each SKU ≥
                ${n(
                  x.eachSkuMinimum
                )}
              </span>
            `
            : ''
        }

      </div>

      <div style="margin-top:12px">
        ${progressBar(v)}
      </div>

      <div
        class="row"
        style="margin-top:8px"
      >
        <small class="muted">
          Progress
        </small>

        <strong>
          ${n(x.actual)}
          /
          ${n(x.target)}
        </strong>
      </div>

      <p
        class="muted"
        style="margin:8px 0 0"
      >
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
          ? `
            <details style="margin-top:10px">

              <summary class="muted">
                SKU breakdown
              </summary>

              <div
                class="list"
                style="margin-top:8px"
              >
                ${perSku.map(
                  ([sku, val]) => `
                    <div class="list-item">
                      <div class="row">
                        <span>
                          ${esc(sku)}
                        </span>

                        <strong>
                          ${n(val)}
                        </strong>
                      </div>
                    </div>
                  `
                ).join('')}
              </div>

            </details>
          `
          : ''
      }

      <div class="form-actions">

        ${
          x.bannerFileId
            ? `
              <button
                class="btn secondary"
                data-banner="${esc(
                  x.bannerFileId
                )}"
              >
                VIEW BANNER
              </button>
            `
            : ''
        }

        ${
          isManagerMode()
            ? `
              <button
                class="btn secondary"
                data-editinc="${esc(
                  x.id
                )}"
              >
                EDIT INCENTIVE
              </button>
            `
            : ''
        }

      </div>

    </div>
  `;
}

function incentiveSkuPicker() {
  const all =
    allSkuNames();

  return `
    <div id="incSkuArea">

      <label>
        Search SKU
        <input
          id="incSkuSearch"
          placeholder="Type product name"
        >
      </label>

      <div
        id="incSkuResults"
        class="search-results"
        style="
          margin-top:8px;
          max-height:260px
        "
      ></div>

      <div
        id="incSkuChips"
        class="chipbox"
        style="margin-top:10px"
      ></div>

      <p
        class="muted"
        style="
          font-size:11px;
          margin:8px 0 0
        "
      >
        Selected:
        <b id="incSkuCount">0</b>
        SKU(s) from
        ${all.length}
        master products
      </p>

    </div>
  `;
}
function renderIncentives() {
  const list = current?.incentives || [];

  const edit = editingIncentiveId
    ? list.find(x => x.id === editingIncentiveId)
    : null;

  incentiveSelectedSkus =
    edit?.selectedSkus
      ? [...edit.selectedSkus]
      : [];

  const managerForm = isManagerMode()
    ? `
      <div class="card" style="margin-bottom:12px">
        <p class="eyebrow">MANAGER MASTER INCENTIVE</p>
        <h2>${edit ? 'Update Incentive' : 'Create Incentive'}</h2>

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
                <option value="MULTI_SKU" ${edit?.basis === 'MULTI_SKU' ? 'selected' : ''}>
                  Multiple SKU / Combo / Series
                </option>
                <option value="TOTAL_SALES" ${edit?.basis === 'TOTAL_SALES' ? 'selected' : ''}>
                  Total Sales RM
                </option>
                <option value="OUTLET_COVERAGE" ${edit?.basis === 'OUTLET_COVERAGE' ? 'selected' : ''}>
                  Outlet Coverage
                </option>
              </select>
            </label>
          </div>

          <div id="incProductControls">
            <div class="form-grid">
              <label>
                Metric
                <select name="metric" id="incMetric">
                  <option value="CARTONS" ${(edit?.metric || 'CARTONS') === 'CARTONS' ? 'selected' : ''}>
                    Cartons
                  </option>
                  <option value="SKU_SALES_RM" ${edit?.metric === 'SKU_SALES_RM' ? 'selected' : ''}>
                    SKU Sales RM
                  </option>
                </select>
              </label>

              <label id="incGroupWrap" style="display:none">
                Group / Series Name
                <input
                  name="groupName"
                  placeholder="e.g. Mr. Noodles Series"
                  value="${esc(edit?.groupName || '')}"
                >
              </label>
            </div>

            ${incentiveSkuPicker()}

            <div
              id="incRuleWrap"
              style="display:none;margin-top:12px"
              class="form-grid"
            >
              <label>
                Calculation Rule
                <select name="calculationRule" id="incRule">
                  <option value="COMBINED" ${(edit?.calculationRule || 'COMBINED') === 'COMBINED' ? 'selected' : ''}>
                    Combined Total
                  </option>
                  <option value="EACH_MIN" ${edit?.calculationRule === 'EACH_MIN' ? 'selected' : ''}>
                    Combined Total + Each SKU Minimum
                  </option>
                </select>
              </label>

              <label id="incEachMinWrap" style="display:none">
                Each SKU Minimum
                <input
                  name="eachSkuMinimum"
                  type="number"
                  min="0"
                  step="0.01"
                  value="${n(edit?.eachSkuMinimum)}"
                >
              </label>
            </div>
          </div>

          <div class="form-grid">
            <label>
              Target
              <input
                name="target"
                type="number"
                min="0.01"
                step="0.01"
                value="${edit ? n(edit.target) : ''}"
                required
              >
            </label>

            <label>
              Reward RM
              <input
                name="reward"
                type="number"
                min="0"
                step="0.01"
                value="${edit ? n(edit.rewardRM) : ''}"
                required
              >
            </label>
          </div>

          <div class="form-grid">
            <label>
              Start Date
              <input
                name="startDate"
                type="date"
                value="${edit?.startDate || selectedMonth + '-01'}"
                required
              >
            </label>

            <label>
              End Date
              <input
                name="endDate"
                type="date"
                value="${edit?.endDate || ''}"
              >
            </label>
          </div>

          <label>
            Assign To
            <select name="scope" id="incScope">
              <option value="SPECIFIC" ${(edit?.scope || 'SPECIFIC') === 'SPECIFIC' ? 'selected' : ''}>
                Selected SR
              </option>
              <option value="ALL" ${edit?.scope === 'ALL' ? 'selected' : ''}>
                All SR
              </option>
            </select>
          </label>

          <label id="incStaffWrap">
            Selected SR
            <select name="staffId">
              ${teamUsers().map(u => `
                <option
                  value="${u.id}"
                  ${u.id === (edit?.assignedStaff?.[0] || managerView) ? 'selected' : ''}
                >
                  ${esc(u.name)} • ${u.id}
                </option>
              `).join('')}
            </select>
          </label>

          <label>
            Banner / Image (optional, max 3 MB)
            <input
              name="banner"
              type="file"
              accept="image/*"
            >
          </label>

          <button class="btn primary big-action">
            ${edit ? 'UPDATE INCENTIVE' : 'CREATE INCENTIVE'}
          </button>

          ${
            edit
              ? `
                <button
                  type="button"
                  id="cancelIncEdit"
                  class="btn secondary"
                >
                  CANCEL EDIT
                </button>
              `
              : ''
          }
        </form>
      </div>
    `
    : '';

  $('#mainContent').innerHTML = `
    ${monthBar()}
    ${managerForm}

    <section class="hero">
      <p class="eyebrow">INCENTIVE CENTER</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">
        Single SKU, combo/series, total sales and outlet coverage
        incentives are calculated from live Google Sheet sales.
      </p>
    </section>

    <div class="list" style="margin-top:12px">
      ${
        list.length
          ? list.map(incentiveCard).join('')
          : empty('No active incentive for this month.')
      }
    </div>

    ${!isManagerMode() ? personalTargetsSection() : ''}
  `;

  bindCommon();

  $$('[data-banner]').forEach(b => {
    b.onclick = () =>
      downloadCloudFile(
        'downloadBanner',
        b.dataset.banner,
        true
      );
  });

  $$('[data-editinc]').forEach(b => {
    b.onclick = () => {
      editingIncentiveId = b.dataset.editinc;
      renderIncentives();

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };
  });

  if ($('#cancelIncEdit')) {
    $('#cancelIncEdit').onclick = () => {
      editingIncentiveId = null;
      renderIncentives();
    };
  }

  const scope = $('#incScope');

  if (scope) {
    scope.onchange = () => {
      $('#incStaffWrap').style.display =
        scope.value === 'ALL'
          ? 'none'
          : '';
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

    const q = String(
      search?.value || ''
    )
      .trim()
      .toLowerCase();

    const all = allSkuNames()
      .filter(x =>
        !incentiveSelectedSkus.includes(x) &&
        (!q || x.toLowerCase().includes(q))
      )
      .slice(0, 80);

    results.innerHTML = all.length
      ? all.map(x => `
          <button
            type="button"
            class="search-result"
            data-addincsku="${esc(x)}"
            style="
              display:block;
              width:100%;
              text-align:left;
              background:transparent;
              color:inherit;
              border:0
            "
          >
            ＋ ${esc(x)}
          </button>
        `).join('')
      : empty('No matching SKU');

    chips.innerHTML =
      incentiveSelectedSkus
        .map(x => `
          <span class="chip">
            ${esc(x)}
            <button
              type="button"
              data-rmincsku="${esc(x)}"
            >
              ×
            </button>
          </span>
        `)
        .join('');

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
          if (max === 1) {
            incentiveSelectedSkus = [];
          } else {
            return;
          }
        }

        incentiveSelectedSkus.push(
          b.dataset.addincsku
        );

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
      ['SINGLE_SKU', 'MULTI_SKU']
        .includes(basis.value);

    if ($('#incProductControls')) {
      $('#incProductControls').style.display =
        product ? '' : 'none';
    }

    if ($('#incGroupWrap')) {
      $('#incGroupWrap').style.display =
        basis.value === 'MULTI_SKU'
          ? ''
          : 'none';
    }

    if ($('#incRuleWrap')) {
      $('#incRuleWrap').style.display =
        basis.value === 'MULTI_SKU'
          ? ''
          : 'none';
    }

    if (
      basis.value === 'TOTAL_SALES' &&
      metric
    ) {
      metric.value = 'SALES_RM';
    }

    if (
      basis.value === 'OUTLET_COVERAGE' &&
      metric
    ) {
      metric.value = 'OUTLETS';
    }

    if (
      basis.value === 'SINGLE_SKU' &&
      incentiveSelectedSkus.length > 1
    ) {
      incentiveSelectedSkus =
        incentiveSelectedSkus.slice(0, 1);
    }

    paintPicker();
  };

  if (basis) {
    basis.onchange = syncBasis;
  }

  if (search) {
    search.oninput = paintPicker;
  }

  if ($('#incRule')) {
    $('#incRule').onchange = e => {
      $('#incEachMinWrap').style.display =
        e.target.value === 'EACH_MIN'
          ? ''
          : 'none';
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

      const b = String(
        fd.get('basis') || 'SINGLE_SKU'
      );

      let metricValue = String(
        fd.get('metric') || 'CARTONS'
      );

      if (b === 'TOTAL_SALES') {
        metricValue = 'SALES_RM';
      }

      if (b === 'OUTLET_COVERAGE') {
        metricValue = 'OUTLETS';
      }

      if (
        ['SINGLE_SKU', 'MULTI_SKU'].includes(b) &&
        !incentiveSelectedSkus.length
      ) {
        return toast('Select at least one SKU');
      }

      const file = fd.get('banner');

      let bannerBase64 = '';
      let bannerFileName = '';
      let bannerMimeType = '';

      if (file && file.size) {
        if (file.size > 3 * 1024 * 1024) {
          return toast('Banner maximum 3 MB');
        }

        bannerBase64 = await fileToBase64(file);
        bannerFileName = file.name;
        bannerMimeType =
          file.type || 'image/jpeg';
      }

      const payload = {
        incentiveId:
          editingIncentiveId || '',

        name:
          String(fd.get('name') || ''),

        description:
          String(fd.get('description') || ''),

        category:
          String(fd.get('category') || 'PRODUCT'),

        basis: b,

        metric: metricValue,

        groupName:
          String(fd.get('groupName') || ''),

        selectedSkus:
          incentiveSelectedSkus,

        calculationRule:
          String(
            fd.get('calculationRule') ||
            'COMBINED'
          ),

        eachSkuMinimum:
          n(fd.get('eachSkuMinimum')),

        target:
          n(fd.get('target')),

        rewardRM:
          n(fd.get('reward')),

        startDate:
          String(fd.get('startDate') || ''),

        endDate:
          String(fd.get('endDate') || ''),

        scope:
          String(fd.get('scope') || 'SPECIFIC'),

        staffId:
          String(fd.get('staffId') || ''),

        bannerBase64,
        bannerFileName,
        bannerMimeType
      };

      setBusy(
        true,
        editingIncentiveId
          ? 'Updating incentive…'
          : 'Creating incentive…'
      );

      try {
        const r = await apiPost(
          editingIncentiveId
            ? 'saveIncentive'
            : 'createIncentive',
          payload
        );

        if (!r?.ok) {
          throw new Error(
            r?.error || 'Incentive save failed'
          );
        }

        editingIncentiveId = null;
        incentiveSelectedSkus = [];

        await loadCurrent({
          quiet: true
        });

        toast('Incentive saved');

        render();

      } catch (err) {
        toast(err.message, 4000);

      } finally {
        setBusy(false);
      }
    };
  }
}

function personalTargetsSection() {
  const targets =
    current?.personalTargets || [];

  if (!targets.length) {
    return '';
  }

  return `
    <div class="section-title">
      <h3>Personal Targets</h3>
    </div>

    <div class="list">
      ${targets.map(t => {
        const p = personalTargetProgress(t);

        return `
          <div class="card">

            <div class="row">
              <div>
                <h3>
                  ${esc(
                    t['Target Name'] ||
                    'Personal Target'
                  )}
                </h3>

                <p class="muted">
                  ${esc(
                    t.Metric ||
                    'SALES_RM'
                  )}
                </p>
              </div>

              <span class="pill ${p.percent >= 100 ? 'green' : 'orange'}">
                ${pct(p.percent)}
              </span>
            </div>

            ${progressBar(p.percent)}

            <p class="muted" style="margin-top:8px">
              ${p.actual} / ${p.target}
              • ${p.remaining} remaining
            </p>

          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* =========================================================
   TASKS / IMPORTANT WORK
========================================================= */

function renderTasks() {
  const tasks = current?.tasks || [];

  const pending =
    tasks.filter(x => !taskDone(x));

  const done =
    tasks.filter(taskDone);

  const managerAssign =
    isManagerMode()
      ? `
        <div class="card" style="margin-bottom:12px">
          <p class="eyebrow">MANAGER ASSIGNMENT</p>
          <h2>Assign Important Work</h2>

          <form id="managerTaskForm" class="stack">

            <label>
              Assign To
              <select
                id="taskAssignScope"
                name="scope"
              >
                <option value="SPECIFIC">
                  Selected SR
                </option>

                <option value="ALL">
                  ALL SR
                </option>

                <option value="SELF">
                  My Reminder
                </option>
              </select>
            </label>

            <label id="taskStaffWrap">
              SR
              <select name="staffId">
                ${teamUsers().map(u => `
                  <option value="${esc(u.id)}">
                    ${esc(u.name)} • ${esc(u.id)}
                  </option>
                `).join('')}
              </select>
            </label>

            <label>
              Work / Task
              <input
                name="title"
                required
                placeholder="What needs to be done?"
              >
            </label>

            <label>
              Details / Instruction
              <textarea
                name="details"
                placeholder="Instruction, buyer follow-up, execution details..."
              ></textarea>
            </label>

            <div class="form-grid">
              <label>
                Due Date
                <input
                  name="due"
                  type="date"
                  value="${selectedDate}"
                >
              </label>

              <label>
                Due Time
                <input
                  name="dueTime"
                  type="time"
                >
              </label>
            </div>

            <div class="form-grid">
              <label>
                Priority
                <select name="priority">
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>

              <label>
                Outlet
                <select name="outlet">
                  ${outletOptions()}
                </select>
              </label>
            </div>

            <label class="row" style="justify-content:flex-start;gap:8px">
              <input
                name="reminderEnabled"
                type="checkbox"
                checked
                style="width:auto"
              >
              Reminder enabled
            </label>

            <button class="btn primary">
              ASSIGN / SAVE WORK
            </button>

          </form>
        </div>
      `
      : '';

  const selfReminder =
    !isManagerMode()
      ? `
        <div class="card" style="margin-bottom:12px">
          <p class="eyebrow">MY REMINDER</p>
          <h2>Add Personal Work</h2>

          <form id="selfTaskForm" class="stack">

            <label>
              Reminder / Work
              <input
                name="title"
                required
                placeholder="e.g. Buyer meeting at Giant Setapak"
              >
            </label>

            <label>
              Note
              <textarea
                name="details"
                placeholder="Follow-up details..."
              ></textarea>
            </label>

            <div class="form-grid">
              <label>
                Date
                <input
                  name="due"
                  type="date"
                  value="${selectedDate}"
                >
              </label>

              <label>
                Time
                <input
                  name="dueTime"
                  type="time"
                >
              </label>
            </div>

            <div class="form-grid">
              <label>
                Priority
                <select name="priority">
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>

              <label>
                Outlet
                <select name="outlet">
                  ${outletOptions()}
                </select>
              </label>
            </div>

            <label class="row" style="justify-content:flex-start;gap:8px">
              <input
                name="shareManager"
                type="checkbox"
                style="width:auto"
              >
              Share / Notify Manager
            </label>

            <button class="btn primary">
              SAVE MY REMINDER
            </button>

          </form>
        </div>
      `
      : '';

  const taskCard = t => {
    const own =
      String(t.Source || '').toUpperCase() === 'OWN';

    return `
      <div class="list-item">

        <div class="row">
          <div>
            <span class="pill ${taskDone(t) ? 'green' : 'orange'}">
              ${taskDone(t) ? 'DONE' : 'PENDING'}
            </span>

            <h4 style="margin-top:8px">
              ${esc(
                t.Title ||
                t['Task Title'] ||
                'Important Work'
              )}
            </h4>

            <p>
              ${esc(
                t.Details ||
                t.Note ||
                ''
              )}
            </p>
          </div>

          <span class="pill">
            ${own ? 'MY REMINDER' : 'ASSIGNED'}
          </span>
        </div>

        <div class="status-strip">
          ${
            t['Staff ID']
              ? `
                <span class="status-chip">
                  ${esc(
                    t['Staff Name'] ||
                    ''
                  )}
                  •
                  ${esc(t['Staff ID'])}
                </span>
              `
              : ''
          }

          ${
            t['Due Date'] || t.Due
              ? `
                <span class="status-chip">
                  📅
                  ${dateLabel(
                    t['Due Date'] ||
                    t.Due
                  )}
                </span>
              `
              : ''
          }

          ${
            t['Due Time']
              ? `
                <span class="status-chip">
                  ⏰ ${esc(t['Due Time'])}
                </span>
              `
              : ''
          }

          ${
            t.Priority
              ? `
                <span class="status-chip">
                  ${esc(t.Priority)}
                </span>
              `
              : ''
          }
        </div>

        ${
          !taskDone(t)
            ? `
              <div class="form-actions">
                <button
                  class="btn secondary"
                  data-taskdone="${esc(
                    t['Task ID'] ||
                    t.ID ||
                    t.id ||
                    ''
                  )}"
                >
                  ✓ MARK DONE
                </button>
              </div>
            `
            : ''
        }

      </div>
    `;
  };

  $('#mainContent').innerHTML = `
    ${monthBar()}

    ${managerAssign}
    ${selfReminder}

    <section class="hero">
      <p class="eyebrow">IMPORTANT WORK</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">
        Manager assigned work and personal reminders stay together,
        with independent status and reminders.
      </p>
    </section>

    <div class="section-title">
      <h3>Pending (${pending.length})</h3>
    </div>

    <div class="list">
      ${
        pending.length
          ? pending.map(taskCard).join('')
          : empty('No pending work.')
      }
    </div>

    <div class="section-title">
      <h3>Completed (${done.length})</h3>
    </div>

    <div class="list">
      ${
        done.length
          ? done.map(taskCard).join('')
          : empty('No completed work.')
      }
    </div>
  `;

  bindCommon();

  const scope = $('#taskAssignScope');

  if (scope) {
    scope.onchange = () => {
      const wrap = $('#taskStaffWrap');

      if (wrap) {
        wrap.style.display =
          ['ALL', 'SELF'].includes(scope.value)
            ? 'none'
            : '';
      }
    };

    scope.onchange();
  }

  if ($('#managerTaskForm')) {
    $('#managerTaskForm').onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(e.target);

      const assignment =
        String(fd.get('scope') || 'SPECIFIC');

      const outletName =
        String(fd.get('outlet') || '');

      const outlet =
        routeOutlets().find(
          x =>
            String(x['Outlet Name']) === outletName
        );

      const basePayload = {
        title:
          String(fd.get('title') || ''),

        details:
          String(fd.get('details') || ''),

        due:
          String(fd.get('due') || ''),

        dueTime:
          String(fd.get('dueTime') || ''),

        priority:
          String(fd.get('priority') || 'NORMAL'),

        outletCode:
          outlet?.['Outlet Code'] || '',

        outletName,

        reminderEnabled:
          fd.get('reminderEnabled') === 'on'
      };

      setBusy(true, 'Saving important work…');

      try {
        if (assignment === 'ALL') {
          const users = teamUsers();

          for (const u of users) {
            const r = await apiPost(
              'saveTask',
              {
                ...basePayload,
                staffId: u.id,
                source: 'MANAGER'
              }
            );

            if (!r?.ok) {
              throw new Error(
                r?.error ||
                `Task failed for ${u.id}`
              );
            }
          }

          toast(
            `Work assigned to ${users.length} SR(s)`
          );

        } else {
          const staffId =
            assignment === 'SELF'
              ? session.id
              : String(fd.get('staffId') || '');

          const r = await apiPost(
            'saveTask',
            {
              ...basePayload,
              staffId,
              source:
                assignment === 'SELF'
                  ? 'OWN'
                  : 'MANAGER'
            }
          );

          if (!r?.ok) {
            throw new Error(
              r?.error || 'Task save failed'
            );
          }

          toast(
            assignment === 'SELF'
              ? 'My reminder saved'
              : 'Important work assigned'
          );
        }

        if (isManagerMode()) {
          await loadTeam({
            quiet: true
          });
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
  }

  if ($('#selfTaskForm')) {
    $('#selfTaskForm').onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(e.target);

      const outletName =
        String(fd.get('outlet') || '');

      const outlet =
        routeOutlets().find(
          x =>
            String(x['Outlet Name']) === outletName
        );

      setBusy(true, 'Saving my reminder…');

      try {
        const r = await apiPost(
          'saveTask',
          {
            staffId: session.id,

            title:
              String(fd.get('title') || ''),

            details:
              String(fd.get('details') || ''),

            due:
              String(fd.get('due') || ''),

            dueTime:
              String(fd.get('dueTime') || ''),

            priority:
              String(fd.get('priority') || 'NORMAL'),

            outletCode:
              outlet?.['Outlet Code'] || '',

            outletName,

            source: 'OWN',

            reminderEnabled: true,

            shareManager:
              fd.get('shareManager') === 'on'
          }
        );

        if (!r?.ok) {
          throw new Error(
            r?.error || 'Reminder save failed'
          );
        }

        await loadCurrent({
          quiet: true
        });

        toast('My reminder saved');
        render();

      } catch (err) {
        toast(err.message, 4000);

      } finally {
        setBusy(false);
      }
    };
  }

  $$('[data-taskdone]').forEach(b => {
    b.onclick = async () => {
      const taskId =
        b.dataset.taskdone;

      if (!taskId) {
        return toast('Task ID missing');
      }

      setBusy(true, 'Completing task…');

      try {
        const r = await apiPost(
          'completeTask',
          { taskId }
        );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Task completion failed'
          );
        }

        await loadCurrent({
          quiet: true
        });

        toast('Task completed');
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
   CPO EXECUTION
========================================================= */

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error('GPS is not supported')
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      p => resolve({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy
      }),
      () => reject(
        new Error('Location permission required')
      ),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value =
        String(reader.result || '');

      resolve(
        value.includes(',')
          ? value.split(',')[1]
          : value
      );
    };

    reader.onerror = () =>
      reject(
        new Error('File read failed')
      );

    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64, mimeType) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);

  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }

  return new Blob(
    [bytes],
    {
      type:
        mimeType ||
        'application/octet-stream'
    }
  );
}

async function downloadCloudFile(
  action,
  id,
  open = false
) {
  if (!id) return;

  setBusy(true, 'Opening file…');

  try {
    const r = await apiPost(
      action,
      {
        fileId: id,
        id
      }
    );

    if (!r?.ok) {
      throw new Error(
        r?.error || 'File failed'
      );
    }

    const blob =
      base64ToBlob(
        r.base64,
        r.mimeType
      );

    const url =
      URL.createObjectURL(blob);

    if (open) {
      window.open(
        url,
        '_blank',
        'noopener'
      );
    } else {
      const a =
        document.createElement('a');

      a.href = url;

      a.download =
        r.fileName ||
        'download';

      a.click();
    }

    setTimeout(
      () =>
        URL.revokeObjectURL(url),
      30000
    );

  } catch (e) {
    toast(e.message, 4000);

  } finally {
    setBusy(false);
  }
}

function renderCpo() {
  const list =
    current?.cpo || [];

  const pending =
    list.filter(x =>
      String(
        x.Status || ''
      ).toUpperCase() !== 'COMPLETED'
    );

  $('#mainContent').innerHTML = `
    ${monthBar()}

    ${
      !isManagerMode()
        ? `
          <div
            class="card"
            style="margin-bottom:12px"
          >
            <p class="eyebrow">
              CPO EXECUTION
            </p>

            <h2>
              Upload Outlet Proof
            </h2>

            <form
              id="cpoForm"
              class="stack"
            >

              <label>
                Date
                <input
                  name="date"
                  type="date"
                  value="${selectedDate}"
                  required
                >
              </label>

              <label>
                Outlet
                <select
                  name="outlet"
                  required
                >
                  ${outletOptions()}
                </select>
              </label>

              <label>
                CPO Photo / Proof
                <input
                  name="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required
                >
              </label>

              <label>
                Note
                <textarea name="note"></textarea>
              </label>

              <button class="btn primary">
                📍 SAVE CPO WITH GPS
              </button>

            </form>
          </div>
        `
        : ''
    }

    <section class="hero">
      <p class="eyebrow">
        CPO CONTROL
      </p>

      <h3>${esc(viewedName())}</h3>

      <p class="muted">
        Photo proof, outlet and execution status.
      </p>

      <div class="status-strip">
        <span class="status-chip">
          Total ${list.length}
        </span>

        <span class="status-chip">
          Pending ${pending.length}
        </span>
      </div>
    </section>

    <div
      class="list"
      style="margin-top:12px"
    >
      ${
        list.length
          ? list.map(x => `
              <div class="list-item">

                <div class="row">
                  <div>
                    <h4>
                      ${esc(
                        x['Outlet Name'] ||
                        x.outletName ||
                        'Outlet'
                      )}
                    </h4>

                    <p>
                      ${dateLabel(
                        x.Date ||
                        x.date
                      )}
                      •
                      ${esc(
                        x.Note ||
                        x.note ||
                        ''
                      )}
                    </p>
                  </div>

                  <span
                    class="pill ${
                      String(
                        x.Status ||
                        ''
                      ).toUpperCase() === 'COMPLETED'
                        ? 'green'
                        : 'orange'
                    }"
                  >
                    ${esc(
                      x.Status ||
                      'PENDING'
                    )}
                  </span>
                </div>

                ${
                  x['Photo File ID'] ||
                  x.photoFileId
                    ? `
                      <div class="form-actions">
                        <button
                          class="btn secondary"
                          data-cpophoto="${esc(
                            x['CPO ID'] ||
                            x.cpoId ||
                            x.ID ||
                            ''
                          )}"
                        >
                          VIEW PROOF
                        </button>
                      </div>
                    `
                    : `
                      <p class="bad" style="margin-top:8px">
                        Proof Missing / Vacant
                      </p>
                    `
                }

              </div>
            `).join('')
          : empty(
              'No CPO record found.'
            )
      }
    </div>
  `;

  bindCommon();

  if ($('#cpoForm')) {
    $('#cpoForm').onsubmit = async e => {
      e.preventDefault();

      const fd =
        new FormData(e.target);

      const name =
        String(
          fd.get('outlet') || ''
        );

      const out =
        routeOutlets().find(
          x =>
            String(
              x['Outlet Name']
            ) === name
        );

      const file =
        fd.get('photo');

      if (!file || !file.size) {
        return toast(
          'CPO photo required'
        );
      }

      setBusy(
        true,
        'Getting GPS and uploading CPO…'
      );

      try {
        const c =
          await getCurrentPosition();

        const base64 =
          await fileToBase64(file);

        const r =
          await apiPost(
            'saveCpo',
            {
              date:
                String(
                  fd.get('date')
                ),

              outletCode:
                out?.[
                  'Outlet Code'
                ] || '',

              outletName:
                name,

              note:
                String(
                  fd.get('note') ||
                  ''
                ),

              fileName:
                file.name,

              mimeType:
                file.type ||
                'image/jpeg',

              base64,

              latitude:
                c.latitude,

              longitude:
                c.longitude,

              accuracy:
                c.accuracy
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'CPO failed'
          );
        }

        await loadCurrent({
          quiet: true
        });

        toast(
          'CPO photo + GPS saved'
        );

        render();

      } catch (x) {
        toast(
          x.message ||
          'GPS/photo failed',
          4500
        );

      } finally {
        setBusy(false);
      }
    };
  }

  $$('[data-cpophoto]').forEach(b => {
    b.onclick = async () => {
      setBusy(
        true,
        'Opening CPO proof…'
      );

      try {
        const r =
          await apiPost(
            'downloadCpoPhoto',
            {
              cpoId:
                b.dataset.cpophoto
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Photo failed'
          );
        }

        const url =
          URL.createObjectURL(
            base64ToBlob(
              r.base64,
              r.mimeType
            )
          );

        window.open(
          url,
          '_blank',
          'noopener'
        );

        setTimeout(
          () =>
            URL.revokeObjectURL(url),
          30000
        );

      } catch (x) {
        toast(
          x.message,
          4000
        );

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
  const p =
    current?.performance || {};

  const cmp =
    current?.comparisons || {};

  const inc =
    current?.incomeSummary || {};

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">
        PERFORMANCE SUMMARY
      </p>

      <h3>
        ${esc(viewedName())}
      </h3>

      <p class="muted">
        ${monthName(selectedMonth)}
      </p>

      ${progressBar(p.percent)}
      ${syncStatus()}
    </section>

    <div class="grid kpi-grid">

      ${kpi(
        'TARGET',
        money(p.target)
      )}

      ${kpi(
        'DELIVERED SALES',
        money(p.achievement),
        pct(p.percent),
        p.percent >= 100
          ? 'good'
          : ''
      )}

      ${kpi(
        'SHORTFALL',
        money(p.shortfall),
        '',
        p.shortfall
          ? 'bad'
          : 'good'
      )}

      ${kpi(
        'TODAY',
        money(p.todaySales)
      )}

      ${kpi(
        'COVERAGE',
        pct(p.coverage)
      )}

      ${kpi(
        'ZERO OUTLET',
        String(
          n(p.zeroOutlets)
        )
      )}

      ${kpi(
        'LAST MONTH SAME DAY',
        money(
          cmp.lastMonthSameDay
        )
      )}

      ${kpi(
        'LAST YEAR SAME DAY',
        money(
          cmp.lastYearSameDay
        )
      )}

      ${kpi(
        'INCENTIVE',
        money(
          inc.incentive ||
          inc.incentiveEarned
        )
      )}

      ${kpi(
        'FINAL INCOME',
        money(
          inc.finalIncome
        )
      )}

    </div>

    <div class="form-actions">
      <button
        class="btn secondary"
        data-go="zero"
      >
        OUTLET REPORT
      </button>

      <button
        class="btn secondary"
        data-go="incentives"
      >
        INCENTIVES
      </button>

      <button
        class="btn secondary"
        data-go="tasks"
      >
        IMPORTANT WORK
      </button>
    </div>
  `;

  bindCommon();
}

/* =========================================================
   OPPORTUNITY
========================================================= */

function renderOpportunity() {
  const p =
    current?.performance || {};

  const outlets =
    routeOutlets()
      .map(o => {
        const name =
          String(
            o['Outlet Name'] ||
            ''
          );

        return {
          name,
          sales:
            monthOutletSales(name)
        };
      })
      .sort(
        (a, b) =>
          a.sales - b.sales
      );

  const zero =
    outlets.filter(
      x => x.sales <= 0
    );

  const low =
    outlets.filter(
      x => x.sales > 0
    ).slice(0, 10);

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">
        SALES OPPORTUNITY
      </p>

      <h3>
        ${money(p.shortfall)}
        shortfall
      </h3>

      <p class="muted">
        Focus first on zero-sales and
        lowest-performing outlets.
      </p>
    </section>

    <div class="section-title">
      <h3>
        Zero Sales Priority
      </h3>
    </div>

    <div class="list">
      ${
        zero.length
          ? zero.slice(0, 20)
              .map((x, i) => `
                <div class="list-item">
                  <div class="row">
                    <strong>
                      ${i + 1}.
                      ${esc(x.name)}
                    </strong>

                    <span class="pill red">
                      ZERO
                    </span>
                  </div>
                </div>
              `)
              .join('')
          : empty(
              'No zero-sales outlet.'
            )
      }
    </div>

    <div class="section-title">
      <h3>
        Low Sales Priority
      </h3>
    </div>

    <div class="list">
      ${
        low.length
          ? low.map((x, i) => `
              <div class="list-item">
                <div class="row">
                  <strong>
                    ${i + 1}.
                    ${esc(x.name)}
                  </strong>

                  <span class="pill orange">
                    ${money(x.sales)}
                  </span>
                </div>
              </div>
            `).join('')
          : empty(
              'No low-sales outlet data.'
            )
      }
    </div>
  `;

  bindCommon();
}
/* =========================================================
   INCOME / PENALTIES / ACTIVITY
========================================================= */

function renderIncome() {
  const x = current?.incomeSummary || {};

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">INCOME SUMMARY</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">
        Commission + incentive − penalty
      </p>
    </section>

    <div class="grid kpi-grid">
      ${kpi('BASE / COMMISSION', money(x.baseIncome || x.commission))}
      ${kpi('INCENTIVE', money(x.incentive || x.incentiveEarned), '', 'good')}
      ${kpi('PENALTY', money(x.penalty), '', x.penalty ? 'bad' : '')}
      ${kpi('FINAL INCOME', money(x.finalIncome), '', 'good')}
    </div>
  `;

  bindCommon();
}

function renderPenalties() {
  const list = current?.penalties || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">PENALTY CONTROL</p>
      <h3>${esc(viewedName())}</h3>
    </section>

    <div class="list" style="margin-top:12px">
      ${
        list.length
          ? list.map(x => `
              <div class="list-item">
                <div class="row">
                  <div>
                    <h4>${esc(x.Reason || x.reason || 'Penalty')}</h4>
                    <p>${dateLabel(x.Date || x.date)}</p>
                  </div>
                  <strong class="bad">
                    ${money(x.Amount || x.amount)}
                  </strong>
                </div>
              </div>
            `).join('')
          : empty('No penalty found.')
      }
    </div>
  `;

  bindCommon();
}

function renderActivity() {
  const rows = current?.activity || current?.timeline || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">ACTIVITY TIMELINE</p>
      <h3>${esc(viewedName())}</h3>
    </section>

    <div class="list" style="margin-top:12px">
      ${
        rows.length
          ? rows.map(x => `
              <div class="list-item">
                <h4>
                  ${esc(
                    x.Title ||
                    x.Action ||
                    x.Type ||
                    'Activity'
                  )}
                </h4>

                <p>
                  ${esc(
                    x.Note ||
                    x.Details ||
                    x.Description ||
                    ''
                  )}
                </p>

                <small class="muted">
                  ${esc(
                    String(
                      x['Created At'] ||
                      x.Timestamp ||
                      x.Date ||
                      ''
                    )
                  )}
                </small>
              </div>
            `).join('')
          : empty('No activity found.')
      }
    </div>
  `;

  bindCommon();
}

/* =========================================================
   TEAM
========================================================= */

function renderTeam() {
  if (!isManager()) {
    setPage('dashboard');
    return;
  }

  if (!v8Team) {
    $('#mainContent').innerHTML = `
      ${monthBar({ showManager: false })}

      <section class="hero">
        <p class="eyebrow">MANAGER • ALL SR</p>
        <h3>Loading Team Dashboard…</h3>
        ${syncStatus()}
      </section>
    `;

    v8LoadManagerData().then(render);
    return;
  }

  const x = v8Team.performance || {};
  const members = v8Team.members || [];

  $('#mainContent').innerHTML = `
    ${monthBar({ showManager: false })}

    <section class="hero">
      <p class="eyebrow">
        MANAGER • ALL SR — MY TEAM
      </p>

      <h3>Full Zone Dashboard</h3>

      <p class="muted">
        ${members.length} active SR
        • delivered sales source of truth
      </p>

      ${syncStatus()}

      <button
        id="v8Refresh"
        class="btn primary"
      >
        ↻ SYNC TEAM NOW
      </button>
    </section>

    <div
      class="mini-grid"
      style="margin-top:12px"
    >
      ${v8Kpi('Team Target', money(x.target))}
      ${v8Kpi('Delivered', money(x.achievement), 'good')}
      ${v8Kpi('Achievement', pct(x.percent), x.percent >= 100 ? 'good' : '')}
      ${v8Kpi('Shortfall', money(x.shortfall), 'bad')}
      ${v8Kpi('Today Sales', money(x.todaySales))}
      ${v8Kpi('Pending Delivery', n(v8Team.pendingOrders), 'bad')}
      ${v8Kpi('Coverage', pct(x.coverage))}
      ${v8Kpi('Zero Sales', n(x.zeroOutlets), 'bad')}
      ${v8Kpi('Pending CPO', n(v8Team.pendingCpo), 'bad')}
      ${v8Kpi('Pending Tasks', n(v8Team.pendingTasks), 'bad')}
    </div>

    <div class="section-title">
      <h3>Individual SR Drill-down</h3>
    </div>

    <div class="list">
      ${
        members.length
          ? members.map(m => {
              const p = m.performance || {};

              return `
                <div class="list-item">
                  <div class="row">
                    <div>
                      <h4>${esc(m.name)}</h4>
                      <p>
                        ${esc(m.staffId)}
                        • ${esc(m.route || '')}
                        • ${money(p.achievement)}
                        / ${money(p.target)}
                      </p>
                    </div>

                    <span
                      class="pill ${
                        p.percent >= 100
                          ? 'green'
                          : p.percent >= 80
                            ? 'orange'
                            : 'red'
                      }"
                    >
                      ${pct(p.percent)}
                    </span>
                  </div>

                  <div class="form-actions">
                    <button
                      class="btn action-sales"
                      data-v8open="${esc(m.staffId)}"
                      data-page="dashboard"
                    >
                      DASHBOARD
                    </button>

                    <button
                      class="btn secondary"
                      data-v8open="${esc(m.staffId)}"
                      data-page="summary"
                    >
                      FULL DATA
                    </button>

                    <button
                      class="btn action-plan"
                      data-v8open="${esc(m.staffId)}"
                      data-page="planning"
                    >
                      PLAN
                    </button>
                  </div>
                </div>
              `;
            }).join('')
          : empty('No active SR found.')
      }
    </div>
  `;

  bindCommon();

  $('#v8Refresh').onclick = async () => {
    setBusy(true, 'Syncing full team…');

    await v8LoadManagerData();

    setBusy(false);
    render();
  };

  $$('[data-v8open]').forEach(b => {
    b.onclick = async () => {
      managerView = b.dataset.v8open;

      session.managerView = managerView;
      saveSession();

      await loadCurrent();

      setPage(
        b.dataset.page || 'summary'
      );
    };
  });
}

/* =========================================================
   PROPOSAL
========================================================= */

function renderProposal() {
  const list = current?.proposals || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">PROPOSAL / PO FORM</p>
      <h3>Proposal Documents</h3>
      <p class="muted">
        Upload and access approved working files.
      </p>
    </section>

    ${
      !isManagerMode()
        ? `
          <div class="card" style="margin-top:12px">
            <form id="proposalForm" class="stack">
              <label>
                Title
                <input name="title" required>
              </label>

              <label>
                File
                <input
                  name="file"
                  type="file"
                  required
                >
              </label>

              <label>
                Note
                <textarea name="note"></textarea>
              </label>

              <button class="btn primary">
                UPLOAD PROPOSAL
              </button>
            </form>
          </div>
        `
        : ''
    }

    <div class="section-title">
      <h3>Proposal History</h3>
    </div>

    <div class="list">
      ${
        list.length
          ? list.map(x => `
              <div class="list-item">
                <div class="row">
                  <div>
                    <h4>
                      ${esc(
                        x.Title ||
                        x.title ||
                        x['File Name'] ||
                        'Proposal'
                      )}
                    </h4>

                    <p>
                      ${esc(
                        x.Note ||
                        x.note ||
                        ''
                      )}
                    </p>
                  </div>

                  <button
                    class="btn secondary"
                    data-proposal="${esc(
                      x['File ID'] ||
                      x.fileId ||
                      x.id ||
                      ''
                    )}"
                  >
                    OPEN
                  </button>
                </div>
              </div>
            `).join('')
          : empty('No proposal uploaded.')
      }
    </div>
  `;

  bindCommon();

  if ($('#proposalForm')) {
    $('#proposalForm').onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(e.target);
      const file = fd.get('file');

      if (!file || !file.size) {
        return toast('Select file');
      }

      if (file.size > 6 * 1024 * 1024) {
        return toast('Maximum file size 6 MB');
      }

      setBusy(true, 'Uploading proposal…');

      try {
        const base64 =
          await fileToBase64(file);

        const r = await apiPost(
          'uploadProposal',
          {
            title:
              String(fd.get('title') || ''),

            note:
              String(fd.get('note') || ''),

            fileName: file.name,

            mimeType:
              file.type ||
              'application/octet-stream',

            base64
          }
        );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Proposal upload failed'
          );
        }

        await loadCurrent({
          quiet: true
        });

        toast('Proposal uploaded');
        render();

      } catch (x) {
        toast(x.message, 4000);

      } finally {
        setBusy(false);
      }
    };
  }

  $$('[data-proposal]').forEach(b => {
    b.onclick = () =>
      downloadCloudFile(
        'downloadProposal',
        b.dataset.proposal,
        true
      );
  });
}

/* =========================================================
   NOTIFICATIONS / PUSH
========================================================= */

function updateNotificationBadge() {
  const badge =
    $('#notificationBadge');

  if (!badge) return;

  const count =
    (current?.notifications || [])
      .filter(x =>
        String(
          x.Read ||
          x.read ||
          ''
        ).toUpperCase() !== 'TRUE'
      )
      .length;

  badge.textContent =
    count ? String(count) : '';

  badge.style.display =
    count ? '' : 'none';
}

function renderNotifications() {
  const list =
    current?.notifications || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">NOTIFICATIONS</p>
      <h3>Sales Performance Alerts</h3>
      <p class="muted">
        Tasks, CPO, incentive, shortfall and
        execution alerts.
      </p>
    </section>

    <div class="list" style="margin-top:12px">
      ${
        list.length
          ? list.map(x => `
              <div class="list-item">
                <h4>
                  ${esc(
                    x.Title ||
                    x.title ||
                    'Notification'
                  )}
                </h4>

                <p>
                  ${esc(
                    x.Message ||
                    x.message ||
                    ''
                  )}
                </p>

                <small class="muted">
                  ${esc(
                    String(
                      x['Created At'] ||
                      x.createdAt ||
                      ''
                    )
                  )}
                </small>
              </div>
            `).join('')
          : empty('No notification.')
      }
    </div>
  `;

  bindCommon();
}

async function initPushSystem() {
  if (!session) return;

  try {
    if (
      window.OneSignalDeferred &&
      Array.isArray(
        window.OneSignalDeferred
      )
    ) {
      window.OneSignalDeferred.push(
        async OneSignal => {
          oneSignalSdk = OneSignal;

          try {
            await OneSignal.login(
              session.id
            );
          } catch (e) {
            console.warn(
              'OneSignal login',
              e
            );
          }

          pushConfig.ready = true;
        }
      );
    }
  } catch (e) {
    console.warn(
      'Push init failed',
      e
    );
  }
}

/* =========================================================
   AYON AI KNOWLEDGE MANAGER
========================================================= */

let ayonKnowledge = [];
let editingAyonKnowledgeId = null;

function ayonToneLabel(tone) {
  const x =
    String(
      tone || 'Normal'
    ).toUpperCase();

  if (x === 'FUNNY') {
    return 'Funny';
  }

  if (x === 'MOTIVATIONAL') {
    return 'Motivational';
  }

  if (
    x === 'STRICT-FUNNY' ||
    x === 'STRICT_FUNNY'
  ) {
    return 'Strict-Funny';
  }

  return 'Normal';
}

async function loadAyonKnowledge(
  { quiet = false } = {}
) {
  if (!isManager()) return [];

  if (!quiet) {
    setBusy(
      true,
      'Loading AYON knowledge…'
    );
  }

  try {
    const r =
      await apiPost(
        'aiKnowledge',
        {}
      );

    if (!r?.ok) {
      throw new Error(
        r?.error ||
        'Knowledge load failed'
      );
    }

    ayonKnowledge =
      Array.isArray(r.data)
        ? r.data
        : [];

    window.AYON_AI_KNOWLEDGE =
      ayonKnowledge;

    return ayonKnowledge;

  } catch (x) {
    console.warn(x);

    if (!quiet) {
      toast(
        x.message ||
        'Knowledge load failed',
        4000
      );
    }

    return ayonKnowledge;

  } finally {
    if (!quiet) {
      setBusy(false);
    }
  }
}

function renderAyonKnowledge() {
  if (!isManager()) {
    setPage('dashboard');
    return;
  }

  const edit =
    editingAyonKnowledgeId
      ? ayonKnowledge.find(
          x =>
            String(x.id) ===
            String(
              editingAyonKnowledgeId
            )
        )
      : null;

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">
        MANAGER AI CONTROL
      </p>

      <h3>
        AYON AI Knowledge Manager
      </h3>

      <p class="muted">
        Manager Knowledge is checked before
        ordinary AYON AI responses.
      </p>

      <div class="form-actions">
        <button
          id="ayonKbRefresh"
          class="btn secondary"
        >
          ↻ REFRESH
        </button>

        <button
          id="ayonKbNew"
          class="btn primary"
        >
          + NEW KNOWLEDGE
        </button>
      </div>
    </section>

    <div class="card" style="margin-top:12px">
      <form
        id="ayonKbForm"
        class="stack"
      >
        <label>
          Question / Keywords
          <input
            name="question"
            required
            value="${esc(edit?.question || '')}"
            placeholder="e.g. creator, কে বানিয়েছে"
          >
        </label>

        <label>
          Answer / Instruction
          <textarea
            name="answer"
            required
            placeholder="Exact answer AYON should use"
          >${esc(edit?.answer || '')}</textarea>
        </label>

        <div class="form-grid">
          <label>
            Tone
            <select name="tone">
              <option ${ayonToneLabel(edit?.tone) === 'Normal' ? 'selected' : ''}>
                Normal
              </option>
              <option ${ayonToneLabel(edit?.tone) === 'Funny' ? 'selected' : ''}>
                Funny
              </option>
              <option ${ayonToneLabel(edit?.tone) === 'Motivational' ? 'selected' : ''}>
                Motivational
              </option>
              <option ${ayonToneLabel(edit?.tone) === 'Strict-Funny' ? 'selected' : ''}>
                Strict-Funny
              </option>
            </select>
          </label>

          <label>
            Status
            <select name="active">
              <option
                value="true"
                ${edit?.active !== false ? 'selected' : ''}
              >
                Active
              </option>

              <option
                value="false"
                ${edit?.active === false ? 'selected' : ''}
              >
                Inactive
              </option>
            </select>
          </label>
        </div>

        <div class="form-actions">
          <button class="btn primary">
            ${edit ? 'UPDATE KNOWLEDGE' : 'SAVE KNOWLEDGE'}
          </button>

          ${
            edit
              ? `
                <button
                  type="button"
                  id="ayonKbCancel"
                  class="btn secondary"
                >
                  CANCEL EDIT
                </button>
              `
              : ''
          }
        </div>
      </form>
    </div>

    <div class="section-title">
      <h3>Saved Knowledge</h3>
    </div>

    <div class="list">
      ${
        ayonKnowledge.length
          ? ayonKnowledge.map((x, i) => `
              <div
                class="list-item"
                style="${x.active === false ? 'opacity:.62' : ''}"
              >
                <div class="row">
                  <div style="min-width:0">
                    <span class="pill ${x.active === false ? 'red' : 'green'}">
                      ${x.active === false ? 'INACTIVE' : 'ACTIVE'}
                    </span>

                    <span class="pill orange">
                      ${esc(ayonToneLabel(x.tone))}
                    </span>

                    <h4 style="margin-top:8px">
                      ${i + 1}. ${esc(x.question || '')}
                    </h4>

                    <p style="white-space:pre-wrap">
                      ${esc(x.answer || '')}
                    </p>
                  </div>
                </div>

                <div class="form-actions">
                  <button
                    class="btn secondary"
                    data-ayonkbedit="${esc(x.id)}"
                  >
                    EDIT
                  </button>

                  ${
                    x.active === false
                      ? `
                        <button
                          class="btn primary"
                          data-ayonkbrestore="${esc(x.id)}"
                        >
                          RESTORE
                        </button>
                      `
                      : `
                        <button
                          class="btn danger"
                          data-ayonkbdelete="${esc(x.id)}"
                        >
                          DEACTIVATE
                        </button>
                      `
                  }
                </div>
              </div>
            `).join('')
          : empty(
              'No Manager Knowledge has been added yet.'
            )
      }
    </div>
  `;

  bindCommon();

  $('#ayonKbRefresh').onclick =
    async () => {
      await loadAyonKnowledge();
      renderAyonKnowledge();
    };

  $('#ayonKbNew').onclick =
    () => {
      editingAyonKnowledgeId = null;
      renderAyonKnowledge();
    };

  if ($('#ayonKbCancel')) {
    $('#ayonKbCancel').onclick =
      () => {
        editingAyonKnowledgeId = null;
        renderAyonKnowledge();
      };
  }

  $('#ayonKbForm').onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(e.target);

      setBusy(
        true,
        edit
          ? 'Updating AYON knowledge…'
          : 'Saving AYON knowledge…'
      );

      try {
        const r =
          await apiPost(
            'saveAiKnowledge',
            {
              id: edit?.id || '',

              question:
                String(
                  fd.get('question') ||
                  ''
                ).trim(),

              answer:
                String(
                  fd.get('answer') ||
                  ''
                ).trim(),

              tone:
                String(
                  fd.get('tone') ||
                  'Normal'
                ),

              active:
                String(
                  fd.get('active')
                ) === 'true'
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Knowledge save failed'
          );
        }

        editingAyonKnowledgeId = null;

        await loadAyonKnowledge({
          quiet: true
        });

        toast(
          edit
            ? 'AYON knowledge updated'
            : 'AYON learned the new answer'
        );

        renderAyonKnowledge();

      } catch (x) {
        toast(
          x.message ||
          'Knowledge save failed',
          4000
        );

      } finally {
        setBusy(false);
      }
    };

  $$('[data-ayonkbedit]')
    .forEach(b => {
      b.onclick = () => {
        editingAyonKnowledgeId =
          b.dataset.ayonkbedit;

        renderAyonKnowledge();

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      };
    });

  $$('[data-ayonkbdelete]')
    .forEach(b => {
      b.onclick = async () => {
        if (
          !confirm(
            'Deactivate this AYON knowledge answer?'
          )
        ) {
          return;
        }

        setBusy(
          true,
          'Deactivating knowledge…'
        );

        try {
          const r =
            await apiPost(
              'deleteAiKnowledge',
              {
                id:
                  b.dataset.ayonkbdelete
              }
            );

          if (!r?.ok) {
            throw new Error(
              r?.error ||
              'Deactivate failed'
            );
          }

          await loadAyonKnowledge({
            quiet: true
          });

          toast(
            'Knowledge deactivated'
          );

          renderAyonKnowledge();

        } catch (x) {
          toast(x.message, 4000);

        } finally {
          setBusy(false);
        }
      };
    });

  $$('[data-ayonkbrestore]')
    .forEach(b => {
      b.onclick = async () => {
        setBusy(
          true,
          'Restoring knowledge…'
        );

        try {
          const r =
            await apiPost(
              'restoreAiKnowledge',
              {
                id:
                  b.dataset.ayonkbrestore
              }
            );

          if (!r?.ok) {
            throw new Error(
              r?.error ||
              'Restore failed'
            );
          }

          await loadAyonKnowledge({
            quiet: true
          });

          toast(
            'Knowledge restored'
          );

          renderAyonKnowledge();

        } catch (x) {
          toast(x.message, 4000);

        } finally {
          setBusy(false);
        }
      };
    });
}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  const ayonManager =
    isManager()
      ? `
        <div
          class="card"
          style="margin-top:12px"
        >
          <p class="eyebrow">
            MANAGER AI CONTROL
          </p>

          <h3>
            AYON AI Knowledge Manager
          </h3>

          <p class="muted">
            Add, edit, deactivate or restore
            AYON answers without changing code.
          </p>

          <button
            id="openAyonKnowledge"
            class="btn primary"
            style="width:100%"
          >
            OPEN KNOWLEDGE MANAGER
          </button>
        </div>
      `
      : '';

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">
        SETTINGS
      </p>

      <h3>
        Account & App
      </h3>

      <p class="muted">
        This phone stays logged in until
        you press Logout.
      </p>

      ${syncStatus()}
    </section>

    ${ayonManager}

    <div
      class="card"
      style="margin-top:12px"
    >
      <div class="list-item">
        <h4>Signed in</h4>

        <p>
          ${esc(sessionName())}
          • ${esc(session.id)}
          • ${esc(
            String(
              session.mode
            ).toUpperCase()
          )}
        </p>
      </div>

      <div
        class="list-item"
        style="margin-top:8px"
      >
        <h4>Backend</h4>

        <p>
          ${backendUrl() ? 'Connected' : 'Missing'}
          • Server
          ${esc(current?.version || '—')}
        </p>
      </div>

      <button
        id="settingsSync"
        class="btn secondary"
        style="margin-top:12px;width:100%"
      >
        ↻ SYNC LIVE DATA NOW
      </button>

      <button
        id="realLogout"
        class="btn danger"
        style="margin-top:10px;width:100%"
      >
        LOG OUT
      </button>
    </div>

    <div
      class="card"
      style="
        margin-top:12px;
        text-align:center
      "
    >
      <p
        class="muted"
        style="margin:0"
      >
        Developed by
        <strong style="color:#ff7414">
          KAM AYON
        </strong>
      </p>
    </div>
  `;

  bindCommon();

  if ($('#openAyonKnowledge')) {
    $('#openAyonKnowledge').onclick =
      async () => {
        page = 'aiKnowledge';

        render();

        await loadAyonKnowledge({
          quiet: true
        });

        render();
      };
  }

  $('#settingsSync').onclick =
    () => refreshCloud(true);

  $('#realLogout').onclick =
    () => {
      if (
        confirm(
          'Log out from Sales Performance Hub?'
        )
      ) {
        logout();
      }
    };

  if (isManager()) {
    installTeamManagement();
  }
}

/* =========================================================
   FINAL V8 — DYNAMIC SR MANAGEMENT
========================================================= */

let v8SRs = [];
let v8Team = null;
let v8Outlets = [];

async function v8LoadManagerData() {
  if (!isManager()) return;

  try {
    const [s, t] =
      await Promise.all([
        apiPost(
          'activeSRs',
          {}
        ),

        apiPost(
          'teamDashboard',
          {
            month:
              selectedMonth,

            date:
              selectedDate
          }
        )
      ]);

    if (s?.ok) {
      v8SRs =
        s.data || [];
    }

    if (t?.ok) {
      v8Team =
        t.data || null;
    }

  } catch (e) {
    console.warn(
      'V8 manager data',
      e
    );
  }
}

function v8SrOptions(
  includeAll = true,
  includeManager = true
) {
  let h =
    includeAll
      ? `
        <option value="ALL">
          ALL SR — MY TEAM
        </option>
      `
      : '';

  if (includeManager) {
    h += `
      <option value="${esc(session.id)}">
        MYSELF — ${esc(sessionName())}
      </option>
    `;
  }

  h += v8SRs
    .map(x => `
      <option value="${esc(x.staffId)}">
        ${esc(x.name)}
        • ${esc(x.staffId)}
        ${x.route ? ' • ' + esc(x.route) : ''}
      </option>
    `)
    .join('');

  return h;
}

function v8Kpi(
  label,
  value,
  cls = ''
) {
  return `
    <div class="metric-box">
      <small>${esc(label)}</small>
      <br>
      <b class="${cls}">
        ${value}
      </b>
    </div>
  `;
}

function installTeamManagement() {
  const root =
    $('#mainContent');

  if (
    !root ||
    $('#v8UserForm')
  ) {
    return;
  }

  root.insertAdjacentHTML(
    'beforeend',
    `
      <div
        class="card"
        style="margin-top:12px"
      >
        <p class="eyebrow">
          TEAM MANAGEMENT
        </p>

        <h3>
          Add / Edit / Activate SR
        </h3>

        <p class="muted">
          USERS sheet is the source of truth.
          New active SR automatically appears
          in ALL SR selectors.
        </p>

        <form
          id="v8UserForm"
          class="stack"
        >
          <div class="form-grid">
            <label>
              Staff ID
              <input
                name="staffId"
                required
              >
            </label>

            <label>
              Full Name
              <input
                name="name"
                required
              >
            </label>
          </div>

          <div class="form-grid">
            <label>
              Route / Area
              <input name="route">
            </label>

            <label>
              Role
              <select name="role">
                <option value="SR">
                  SR
                </option>

                <option value="MANAGER">
                  MANAGER
                </option>
              </select>
            </label>
          </div>

          <label>
            Initial PIN / New PIN
            <input
              name="password"
              type="password"
              placeholder="Leave blank when not changing"
            >
          </label>

          <button class="btn primary">
            SAVE USER
          </button>
        </form>

        <div class="section-title">
          <h3>Active SR</h3>
        </div>

        <div id="v8Users">
          ${
            v8SRs.length
              ? v8SRs.map(u => `
                  <div class="list-item">
                    <div class="row">
                      <div>
                        <h4>
                          ${esc(u.name)}
                        </h4>

                        <p>
                          ${esc(u.staffId)}
                          •
                          ${esc(u.route || '')}
                        </p>
                      </div>

                      <button
                        class="btn danger"
                        data-v8deactivate="${esc(u.staffId)}"
                      >
                        DEACTIVATE
                      </button>
                    </div>
                  </div>
                `).join('')
              : empty(
                  'Loading active SR…'
                )
          }
        </div>
      </div>
    `
  );

  if (!v8SRs.length) {
    v8LoadManagerData()
      .then(() => {
        if (page === 'settings') {
          renderSettings();
        }
      });
  }

  $('#v8UserForm').onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(e.target);

      setBusy(
        true,
        'Saving user…'
      );

      try {
        const r =
          await apiPost(
            'saveUser',
            {
              staffId:
                String(
                  fd.get('staffId')
                ),

              name:
                String(
                  fd.get('name')
                ),

              route:
                String(
                  fd.get('route')
                ),

              area:
                String(
                  fd.get('route')
                ),

              role:
                String(
                  fd.get('role')
                ),

              password:
                String(
                  fd.get('password')
                ),

              active: true
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Save failed'
          );
        }

        await v8LoadManagerData();

        toast('User saved');

        renderSettings();

      } catch (x) {
        toast(
          x.message,
          4000
        );

      } finally {
        setBusy(false);
      }
    };

  $$('[data-v8deactivate]')
    .forEach(b => {
      b.onclick = async () => {
        if (
          !confirm(
            'Deactivate this SR?'
          )
        ) {
          return;
        }

        setBusy(
          true,
          'Deactivating SR…'
        );

        try {
          const r =
            await apiPost(
              'setUserActive',
              {
                staffId:
                  b.dataset.v8deactivate,

                active: false
              }
            );

          if (!r?.ok) {
            throw new Error(
              r?.error ||
              'Failed'
            );
          }

          await v8LoadManagerData();

          toast(
            'SR deactivated'
          );

          renderSettings();

        } catch (x) {
          toast(
            x.message,
            4000
          );

        } finally {
          setBusy(false);
        }
      };
    });
}

/* =========================================================
   FINAL RENDER ROUTER
========================================================= */

function render() {
  if (!session) return;

  installShell();
  refreshTop();
  bindNav();

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
    settings: renderSettings,
    aiKnowledge: renderAyonKnowledge
  };

  (map[page] || renderDashboard)();

  refreshTop();
  bindNav();
}

/* =========================================================
   LIVE SYNC
========================================================= */

function startLiveSync() {
  if (liveTimer) {
    clearInterval(liveTimer);
  }

  liveTimer = setInterval(
    async () => {
      if (
        !session ||
        document.hidden ||
        syncing ||
        !navigator.onLine
      ) {
        return;
      }

      try {
        if (
          isManager() &&
          (
            page === 'dashboard' ||
            page === 'team'
          )
        ) {
          await v8LoadManagerData();
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
    120000
  );
}

/* =========================================================
   PREMIUM LOGIN PANEL BEHAVIOR
========================================================= */

function installPremiumLogin() {
  const form =
    $('#loginForm');

  const idInput =
    $('#staffId') ||
    $('#loginStaffId') ||
    $('input[name="staffId"]');

  const pinInput =
    $('#password') ||
    $('#loginPin') ||
    $('input[name="password"]');

  if (!form) return;

  form.onsubmit = async e => {
    e.preventDefault();

    const id =
      idInput?.value ||
      '';

    const pin =
      pinInput?.value ||
      '';

    await login(id, pin);
  };

  if (idInput) {
    idInput.setAttribute(
      'autocomplete',
      'username'
    );
  }

  if (pinInput) {
    pinInput.setAttribute(
      'autocomplete',
      'current-password'
    );

    pinInput.addEventListener(
      'keydown',
      e => {
        if (e.key === 'Enter') {
          e.preventDefault();

          form.requestSubmit();
        }
      }
    );
  }
}

/* =========================================================
   BOOT
========================================================= */

async function boot() {
  const pref =
    getPref();

  selectedMonth =
    pref.month ||
    localDate().slice(0, 7);

  selectedDate =
    pref.date ||
    localDate();

  pushHistoryState();
  installPremiumLogin();

  if (!restoreSession()) {
    $('#appView')?.classList.add(
      'hidden'
    );

    $('#loginView')?.classList.remove(
      'hidden'
    );

    return;
  }

  $('#loginView')?.classList.add(
    'hidden'
  );

  $('#appView')?.classList.remove(
    'hidden'
  );

  installShell();

  if (isManager()) {
    page = 'dashboard';

    await Promise.all([
      loadCurrent({
        quiet: true
      }),
      v8LoadManagerData()
    ]);

  } else {
    page = 'dashboard';

    await loadCurrent({
      quiet: true
    });
  }

  initPushSystem();
  startLiveSync();
  render();
}

/* Manager always lands on ALL SR dashboard after login. */
const finalPremiumLogin =
  login;

login = async function(
  id,
  pin
) {
  await finalPremiumLogin(
    id,
    pin
  );

  if (
    session &&
    isManager()
  ) {
    managerView =
      session.id;

    page =
      'dashboard';

    await v8LoadManagerData();

    render();
  }
};

document.addEventListener(
  'DOMContentLoaded',
  boot
);

window.addEventListener(
  'online',
  () => {
    if (session) {
      refreshCloud(false);
    }
  }
);

window.addEventListener(
  'offline',
  () => {
    toast(
      'Offline — waiting for internet',
      3000
    );
  }
);
