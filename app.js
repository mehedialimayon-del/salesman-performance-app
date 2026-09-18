'use strict';

/* =========================================================
   SALES PERFORMANCE HUB — FINAL PREMIUM V8
   Developed by KAM AYON
   Backend: Google Apps Script / Google Sheets source of truth

   FINAL LOCK:
   • Existing Premium UI preserved
   • Existing backend login/password preserved
   • Manager alias: manager → M21954
   • Final V8 Manager / ALL SR features enabled
   • Dynamic SR architecture
   • AYON AI Knowledge Manager
========================================================= */

const APP_BUILD = 'LAUNCH-FINAL-2026.09.18-1';
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

const n = v =>
  Number.isFinite(Number(v)) ? Number(v) : 0;

const money = v =>
  'RM ' +
  n(v).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const esc = (v = '') =>
  String(v).replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c]
  );

const idGen = () =>
  crypto?.randomUUID
    ? crypto.randomUUID()
    : 'id-' +
      Date.now() +
      '-' +
      Math.random().toString(36).slice(2);

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

/* =========================================================
   DATE / TIME
========================================================= */

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
  const [y, mo] = String(m)
    .split('-')
    .map(Number);

  return new Date(y, mo - 1, 1).toLocaleDateString('en-MY', {
    month: 'long',
    year: 'numeric'
  });
}

function pct(v) {
  return n(v).toFixed(1) + '%';
}

/* =========================================================
   COMMON
========================================================= */

function toast(msg, ms = 2400) {
  const t = $('#toast');

  if (!t) return;

  t.textContent = msg;
  t.classList.add('show');

  clearTimeout(window.__sphToast);

  window.__sphToast = setTimeout(
    () => t.classList.remove('show'),
    ms
  );
}

function getPref() {
  try {
    return JSON.parse(
      localStorage.getItem(PREF_KEY) || '{}'
    );
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

/* =========================================================
   LOGIN ID

   Historical Manager alias is preserved:
   manager → M21954

   Password itself is NOT changed here.
   Backend remains the authentication source of truth.
========================================================= */

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
  const role = String(
    session?.role || ''
  ).toUpperCase();

  return (
    session?.mode === 'manager' ||
    role.includes('MANAGER') ||
    role.includes('HR')
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

  return (
    localUser(viewedId())?.name ||
    viewedId()
  );
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
      throw new Error(
        'Server returned invalid response'
      );
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
    throw new Error(
      'Backend URL is missing'
    );
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
    throw new Error(
      'Backend URL is missing'
    );
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
        'Content-Type':
          'text/plain;charset=utf-8'
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
   BACKEND LOGIN
========================================================= */

async function backendLogin(
  rawId,
  password
) {
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
        'Content-Type':
          'text/plain;charset=utf-8'
      },
      body: JSON.stringify(body)
    },
    25000
  );

  if (!r?.ok) {
    throw new Error(
      r?.error || 'Login failed'
    );
  }

  return {
    id,
    user: r.user || {}
  };
}

/* =========================================================
   LOADING SCREEN
========================================================= */

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
      <div
        class="card"
        style="
          max-width:360px;
          width:100%;
          text-align:center
        "
      >
        <div
          style="
            font-size:30px;
            margin-bottom:10px
          "
        >
          ↻
        </div>

        <strong>
          ${esc(message)}
        </strong>

        <p
          class="muted"
          style="margin:8px 0 0"
        >
          Please keep this page open.
        </p>
      </div>
    `;

    document.body.appendChild(box);
  }

  if (box && on) {
    const strong =
      box.querySelector('strong');

    if (strong) {
      strong.textContent = message;
    }
  }

  if (!on && box) {
    box.remove();
  }
}

/* =========================================================
   CURRENT SR DATABASE
========================================================= */

async function loadCurrent({
  quiet = false
} = {}) {
  if (!session || !backendUrl()) {
    return false;
  }

  if (!quiet) {
    setBusy(
      true,
      'Loading live database…'
    );
  }

  try {
    const r = await apiPost(
      'bootstrap',
      {
        viewStaffId: viewedId(),
        month: selectedMonth,
        date: selectedDate
      }
    );

    if (!r?.ok) {
      throw new Error(
        r?.error ||
          'Cloud read failed'
      );
    }

    current = r.data || {};
    lastSyncAt = localTime();

    return true;
  } catch (e) {
    console.warn(e);

    if (!quiet) {
      toast(
        'Sync failed: ' +
          e.message,
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

/* =========================================================
   MANAGER TEAM DATABASE
========================================================= */

async function loadTeam({
  quiet = false
} = {}) {
  if (!session || !isManager()) {
    return false;
  }

  if (!quiet) {
    setBusy(
      true,
      'Loading team database…'
    );
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
        r?.error ||
          'Team database failed'
      );
    }

    teamSnapshot =
      Array.isArray(r.data)
        ? r.data
        : [];

    lastSyncAt = localTime();

    return true;
  } catch (e) {
    console.warn(e);

    if (!quiet) {
      toast(
        'Team sync failed: ' +
          e.message,
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
    isManagerMode() &&
    page === 'team'
      ? await loadTeam({
          quiet: !showToast
        })
      : await loadCurrent({
          quiet: !showToast
        });

  if (ok && showToast) {
    toast(
      'Live database updated'
    );
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
      localStorage.getItem(
        SESSION_KEY
      ) || 'null'
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
  localStorage.removeItem(
    SESSION_KEY
  );

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

  $('#appView')?.classList.add(
    'hidden'
  );

  $('#loginView')?.classList.remove(
    'hidden'
  );

  if ($('#loginPin')) {
    $('#loginPin').value = '';
  }
}

/* =========================================================
   FINAL WORKING LOGIN

   IMPORTANT:
   • "manager" is accepted as Manager ID alias.
   • It maps to M21954.
   • Existing backend password is used.
   • No fake frontend authentication.
========================================================= */

async function login(
  rawId,
  password
) {
  if (!backendUrl()) {
    toast(
      'Backend URL missing in config.js',
      3500
    );

    return;
  }

  setBusy(
    true,
    'Signing in…'
  );

  try {
    const result =
      await backendLogin(
        rawId,
        password
      );

    const u =
      result.user || {};

    const role = String(
      u.Role ||
      u.role ||
      localUser(result.id)?.role ||
      'SR'
    );

    const managerAlias =
      String(rawId || '')
        .trim()
        .toLowerCase() ===
      'manager';

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
        role
          .toUpperCase()
          .includes('HR')
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
      Manager initially opens
      Team Control Center.

      SR initially opens
      personal dashboard.
    */

    page =
      session.mode === 'manager'
        ? 'team'
        : 'dashboard';

    saveSession();

    openApp();

    /*
      Do not keep the user
      behind the spinner while
      Google Sheets loads.
    */

    setBusy(false);

    render();

    if (
      session.mode ===
      'manager'
    ) {
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
    toast(
      e.message ||
        'Login failed',
      3500
    );

    $('#appView')?.classList.add(
      'hidden'
    );

    $('#loginView')?.classList.remove(
      'hidden'
    );
  } finally {
    setBusy(false);
  }
}

/* =========================================================
   OPEN PREMIUM APP
========================================================= */

function openApp() {
  $('#loginView')?.classList.add(
    'hidden'
  );

  $('#appView')?.classList.remove(
    'hidden'
  );

  installShell();
  refreshTop();
  startLiveSync();
}

/* =========================================================
   PREMIUM SHELL / NAVIGATION
========================================================= */

function installShell() {
  const settingsBtn =
    $('#logoutBtn');

  if (settingsBtn) {
    settingsBtn.textContent = '⚙';
    settingsBtn.title =
      'Settings';

    settingsBtn.onclick = () =>
      setPage('settings');
  }

  const nav =
    $('#bottomNav');

  if (
    nav &&
    !nav.querySelector(
      '[data-page="proposal"]'
    )
  ) {
    const b =
      document.createElement(
        'button'
      );

    b.dataset.page =
      'proposal';

    b.innerHTML =
      '<span class="nav-icon">▤</span>' +
      '<small>PO Form</small>';

    nav.appendChild(b);

    nav.style.gridTemplateColumns =
      'repeat(6,1fr)';
  }

  const app =
    $('#appView');

  if (
    app &&
    !$('#developerCredit')
  ) {
    const c =
      document.createElement(
        'div'
      );

    c.id =
      'developerCredit';

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
      >
        KAM AYON
      </a>
    `;

    app.insertBefore(
      c,
      nav
    );
  }
}

/* =========================================================
   TOP HEADER
========================================================= */

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

/* =========================================================
   PAGE NAVIGATION
========================================================= */

function setPage(
  next,
  opts = {}
) {
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
        setPage(
          b.dataset.page
        );
    });
}

function pushHistoryState() {
  if (!history.state?.sph) {
    history.replaceState(
      {
        sph: true,
        page:
          page ||
          'dashboard'
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
   DATA HELPERS
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
  const cloud =
    skuMaster()
      .map(
        x =>
          String(
            x['Product Name'] ||
              ''
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

function productsForOutlet(
  outletName
) {
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
      outlet?.Category ||
        ''
    );

  const exactCloud =
    skuMaster()
      .filter(
        x =>
          String(
            x[
              'Outlet Category'
            ] || ''
          )
            .trim()
            .toLowerCase() ===
          category.toLowerCase()
      )
      .map(
        x =>
          String(
            x['Product Name'] ||
              ''
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
      .filter(x =>
        ['', 'all'].includes(
          String(
            x[
              'Outlet Category'
            ] || ''
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
    '<option value="">' +
    'Select outlet' +
    '</option>' +
    routeOutlets()
      .filter(
        x =>
          !q ||
          String(
            x['Outlet Name'] ||
              ''
          )
            .toLowerCase()
            .includes(q) ||
          String(
            x['Outlet Code'] ||
              ''
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
                x[
                  'Outlet Name'
                ]
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
    '<option value="">' +
    'Select SKU' +
    '</option>' +
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
    ).toUpperCase() ===
    'DONE'
  );
}

function activePenalty(x) {
  return (
    String(
      x.Status ||
        'ACTIVE'
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
/* =========================================================
   PREMIUM UI COMPONENTS
========================================================= */

function card(title, body, cls = '') {
  return `
    <section class="card ${cls}">
      ${
        title
          ? `<div class="card-title">${esc(title)}</div>`
          : ''
      }
      ${body}
    </section>
  `;
}

function emptyState(
  title = 'No data yet',
  text = 'Nothing has been recorded here yet.'
) {
  return `
    <div class="empty-state">
      <div class="empty-icon">◇</div>
      <strong>${esc(title)}</strong>
      <p class="muted">${esc(text)}</p>
    </div>
  `;
}

function kpi(
  label,
  value,
  sub = '',
  cls = ''
) {
  return `
    <div class="kpi ${cls}">
      <small>${esc(label)}</small>
      <strong>${esc(value)}</strong>
      ${
        sub
          ? `<span>${esc(sub)}</span>`
          : ''
      }
    </div>
  `;
}

function progressBar(
  value,
  max = 100,
  label = ''
) {
  const p =
    max > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (n(value) / n(max)) * 100
          )
        )
      : 0;

  return `
    <div class="progress-wrap">
      ${
        label
          ? `<div class="progress-label">
              <span>${esc(label)}</span>
              <b>${p.toFixed(1)}%</b>
            </div>`
          : ''
      }

      <div class="progress">
        <div
          class="progress-fill"
          style="width:${p}%"
        ></div>
      </div>
    </div>
  `;
}

function statusPill(status) {
  const s =
    String(status || '')
      .trim()
      .toUpperCase();

  let cls = 'neutral';

  if (
    [
      'DONE',
      'COMPLETED',
      'DELIVERED',
      'ACTIVE',
      'ACHIEVED'
    ].includes(s)
  ) {
    cls = 'success';
  } else if (
    [
      'PENDING',
      'PARTIAL',
      'PROOF MISSING',
      'VACANT'
    ].includes(s)
  ) {
    cls = 'warning';
  } else if (
    [
      'CANCELLED',
      'FAILED',
      'INACTIVE',
      'OVERDUE'
    ].includes(s)
  ) {
    cls = 'danger';
  }

  return `
    <span class="status-pill ${cls}">
      ${esc(status || '—')}
    </span>
  `;
}

function sectionTitle(
  title,
  subtitle = ''
) {
  return `
    <div class="section-head">
      <div>
        <h2>${esc(title)}</h2>
        ${
          subtitle
            ? `<p class="muted">${esc(subtitle)}</p>`
            : ''
        }
      </div>
    </div>
  `;
}

function field(
  label,
  input,
  help = ''
) {
  return `
    <label class="field">
      <span>${esc(label)}</span>
      ${input}
      ${
        help
          ? `<small class="muted">${esc(help)}</small>`
          : ''
      }
    </label>
  `;
}

function personalTargetProgress(t) {
  const target =
    n(
      t?.target ||
      current?.summary?.target ||
      current?.target ||
      0
    );

  const sales =
    n(
      t?.sales ||
      current?.summary?.sales ||
      current?.summary?.delivered ||
      0
    );

  const achievement =
    target > 0
      ? (sales / target) * 100
      : 0;

  const shortfall =
    Math.max(
      target - sales,
      0
    );

  return `
    <div class="target-progress">
      <div class="kpi-grid">
        ${kpi(
          'Monthly Target',
          money(target)
        )}

        ${kpi(
          'Delivered Sales',
          money(sales)
        )}

        ${kpi(
          'Achievement',
          pct(achievement)
        )}

        ${kpi(
          'Shortfall',
          money(shortfall)
        )}
      </div>

      ${progressBar(
        sales,
        target,
        'Monthly Progress'
      )}
    </div>
  `;
}

/* =========================================================
   PREMIUM DASHBOARD
========================================================= */

function renderDashboard() {
  if (!current) {
    return card(
      '',
      emptyState(
        'Loading dashboard',
        'Live database is being prepared.'
      )
    );
  }

  const s =
    current.summary || {};

  const target =
    n(
      s.target ||
      s.monthlyTarget ||
      current.target
    );

  const delivered =
    n(
      s.delivered ||
      s.sales ||
      s.deliveredSales
    );

  const today =
    n(
      s.todaySales ||
      current.todaySales
    );

  const pending =
    n(
      s.pendingDelivery ||
      s.pending
    );

  const shortfall =
    Math.max(
      target - delivered,
      0
    );

  const achievement =
    target > 0
      ? (delivered / target) * 100
      : 0;

  const outlets =
    routeOutlets();

  const zero =
    outlets.filter(
      x =>
        monthOutletSales(
          x['Outlet Name']
        ) <= 0
    );

  const tasks =
    current.tasks || [];

  const pendingTasks =
    tasks.filter(
      x => !taskDone(x)
    ).length;

  const cpo =
    current.cpo || [];

  const cpoPending =
    cpo.filter(
      x =>
        ![
          'DONE',
          'COMPLETED'
        ].includes(
          String(
            x.Status || ''
          ).toUpperCase()
        )
    ).length;

  const html = `
    ${sectionTitle(
      'Performance Dashboard',
      `${viewedName()} • ${monthName(selectedMonth)}`
    )}

    <div class="kpi-grid premium-kpi-grid">
      ${kpi(
        'Monthly Target',
        money(target)
      )}

      ${kpi(
        'Delivered Sales',
        money(delivered)
      )}

      ${kpi(
        'Achievement',
        pct(achievement)
      )}

      ${kpi(
        'Shortfall',
        money(shortfall)
      )}

      ${kpi(
        'Today Sales',
        money(today)
      )}

      ${kpi(
        'Pending Delivery',
        money(pending)
      )}

      ${kpi(
        'Total Outlet',
        String(outlets.length)
      )}

      ${kpi(
        'Zero Sales Outlet',
        String(zero.length)
      )}

      ${kpi(
        'Pending Tasks',
        String(pendingTasks)
      )}

      ${kpi(
        'CPO Pending',
        String(cpoPending)
      )}
    </div>

    ${card(
      'Monthly Achievement',
      progressBar(
        delivered,
        target,
        `${money(delivered)} / ${money(target)}`
      )
    )}

    ${renderTodayMission()}

    ${renderDashboardAlerts()}
  `;

  return html;
}

function renderTodayMission() {
  const tasks =
    (current?.tasks || [])
      .filter(x => !taskDone(x))
      .filter(x => {
        const d =
          String(
            x['Due Date'] ||
            x.Due ||
            ''
          ).slice(0, 10);

        return (
          !d ||
          d <= selectedDate
        );
      });

  const zero =
    routeOutlets()
      .filter(
        x =>
          dayOutletSales(
            x['Outlet Name'],
            selectedDate
          ) <= 0
      )
      .slice(0, 3);

  const task =
    tasks[0];

  const firstZero =
    zero[0];

  let mission =
    'Start with your highest-priority outlet and secure the first productive order.';

  if (task) {
    mission =
      task.Title ||
      task.Task ||
      task.Description ||
      mission;
  } else if (firstZero) {
    mission =
      `Follow up ${firstZero['Outlet Name']} — no sales recorded today.`;
  }

  return card(
    'Today Mission',
    `
      <div class="mission-box">
        <div class="mission-icon">◎</div>

        <div>
          <strong>
            ${esc(mission)}
          </strong>

          <p class="muted">
            Focus on the next actionable item instead of the whole month at once.
          </p>
        </div>
      </div>
    `,
    'action-plan'
  );
}

function renderDashboardAlerts() {
  const alerts = [];

  const tasks =
    current?.tasks || [];

  const overdue =
    tasks.filter(x => {
      if (taskDone(x)) {
        return false;
      }

      const d =
        String(
          x['Due Date'] ||
          x.Due ||
          ''
        ).slice(0, 10);

      return (
        d &&
        d < selectedDate
      );
    });

  if (overdue.length) {
    alerts.push(
      `${overdue.length} overdue Important Work item(s)`
    );
  }

  const cpoMissing =
    (current?.cpo || [])
      .filter(x =>
        [
          'PROOF MISSING',
          'VACANT'
        ].includes(
          String(
            x.Status || ''
          ).toUpperCase()
        )
      );

  if (cpoMissing.length) {
    alerts.push(
      `${cpoMissing.length} CPO proof item(s) need attention`
    );
  }

  const today =
    n(
      current?.summary?.todaySales ||
      current?.todaySales
    );

  if (today <= 0) {
    alerts.push(
      'No delivered sales recorded today'
    );
  }

  if (!alerts.length) {
    return card(
      'Action Alerts',
      `
        <div class="success-box">
          ✓ No critical exception is waiting right now.
        </div>
      `
    );
  }

  return card(
    'Action Alerts',
    `
      <div class="alert-list">
        ${alerts
          .map(
            x => `
              <div class="alert-row">
                <span>!</span>
                <strong>${esc(x)}</strong>
              </div>
            `
          )
          .join('')}
      </div>
    `,
    'action-task'
  );
}

/* =========================================================
   DAILY SALES
========================================================= */

function renderDaily() {
  const day =
    selectedDayData();

  const rows =
    Array.isArray(day?.daily)
      ? day.daily
      : [];

  return `
    ${sectionTitle(
      'Daily Sales',
      `${dateLabel(selectedDate)} • ${viewedName()}`
    )}

    ${card(
      'Add Daily Sales',
      `
        <form id="dailySalesForm">
          <div class="form-grid">

            ${field(
              'Date',
              `
                <input
                  id="dailyDate"
                  type="date"
                  value="${esc(selectedDate)}"
                  required
                >
              `
            )}

            ${field(
              'Outlet',
              `
                <select
                  id="dailyOutlet"
                  required
                >
                  ${outletOptions()}
                </select>
              `
            )}

            ${field(
              'SKU',
              `
                <select
                  id="dailySku"
                  required
                >
                  <option value="">
                    Select outlet first
                  </option>
                </select>
              `
            )}

            ${field(
              'Quantity / Carton',
              `
                <input
                  id="dailyQty"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="decimal"
                  required
                >
              `
            )}

            ${field(
              'Price',
              `
                <input
                  id="dailyPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  required
                >
              `
            )}

            ${field(
              'Remarks',
              `
                <input
                  id="dailyRemarks"
                  type="text"
                  placeholder="Optional remarks"
                >
              `
            )}

          </div>

          <button
            class="primary-btn"
            type="submit"
          >
            Save Sales
          </button>
        </form>
      `,
      'action-sales'
    )}

    ${card(
      'Today Entries',
      rows.length
        ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Outlet</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Sales</th>
                </tr>
              </thead>

              <tbody>
                ${rows
                  .map(
                    x => `
                      <tr>
                        <td>
                          ${esc(
                            x['Outlet Name'] ||
                            x.Outlet ||
                            '—'
                          )}
                        </td>

                        <td>
                          ${esc(
                            x['Product Name'] ||
                            x.SKU ||
                            '—'
                          )}
                        </td>

                        <td>
                          ${esc(
                            x.Quantity ||
                            x.Qty ||
                            0
                          )}
                        </td>

                        <td>
                          ${money(
                            x['Sales Value'] ||
                            x.Value ||
                            0
                          )}
                        </td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        : emptyState(
            'No sales entry',
            'No daily sales have been entered for this date.'
          )
    )}
  `;
}

function bindDaily() {
  const outlet =
    $('#dailyOutlet');

  const sku =
    $('#dailySku');

  if (outlet && sku) {
    outlet.onchange = () => {
      sku.innerHTML =
        skuOptions(
          outlet.value
        );
    };
  }

  const form =
    $('#dailySalesForm');

  if (!form) return;

  form.onsubmit =
    async e => {
      e.preventDefault();

      const outletName =
        $('#dailyOutlet')?.value;

      const outletRow =
        routeOutlets().find(
          x =>
            String(
              x['Outlet Name']
            ) ===
            String(outletName)
        );

      const payload = {
        viewStaffId:
          viewedId(),

        date:
          $('#dailyDate')?.value ||
          selectedDate,

        outletCode:
          outletRow?.[
            'Outlet Code'
          ] || '',

        outletName,

        sku:
          $('#dailySku')?.value ||
          '',

        quantity:
          n(
            $('#dailyQty')?.value
          ),

        price:
          n(
            $('#dailyPrice')?.value
          ),

        remarks:
          $('#dailyRemarks')?.value ||
          ''
      };

      try {
        setBusy(
          true,
          'Saving sales…'
        );

        const r =
          await apiPost(
            'saveDailySales',
            payload
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Unable to save'
          );
        }

        toast('Sales saved');

        selectedDate =
          payload.date;

        await loadCurrent({
          quiet: true
        });

        render();
      } catch (err) {
        toast(
          err.message ||
          'Save failed',
          3500
        );
      } finally {
        setBusy(false);
      }
    };
}

/* =========================================================
   EXECUTION / ORDER / DELIVERY
========================================================= */

function renderExecution() {
  const rows =
    current?.execution ||
    current?.orders ||
    [];

  return `
    ${sectionTitle(
      'Order & Delivery',
      'Track ordered, pending and actual delivered sales'
    )}

    ${card(
      'New Order / Delivery Update',
      `
        <form id="executionForm">
          <div class="form-grid">

            ${field(
              'Date',
              `
                <input
                  id="executionDate"
                  type="date"
                  value="${esc(selectedDate)}"
                  required
                >
              `
            )}

            ${field(
              'Outlet',
              `
                <select
                  id="executionOutlet"
                  required
                >
                  ${outletOptions()}
                </select>
              `
            )}

            ${field(
              'Order Value',
              `
                <input
                  id="executionOrder"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="RM"
                >
              `
            )}

            ${field(
              'Delivered Value',
              `
                <input
                  id="executionDelivered"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="RM"
                >
              `
            )}

            ${field(
              'Status',
              `
                <select id="executionStatus">
                  <option value="PENDING">
                    Pending
                  </option>
                  <option value="PARTIAL">
                    Partial
                  </option>
                  <option value="DELIVERED">
                    Delivered
                  </option>
                </select>
              `
            )}

            ${field(
              'Remarks',
              `
                <input
                  id="executionRemarks"
                  type="text"
                  placeholder="Delivery / buyer follow-up note"
                >
              `
            )}

          </div>

          <button
            type="submit"
            class="primary-btn"
          >
            Save Update
          </button>
        </form>
      `,
      'action-sales'
    )}

    ${card(
      'Execution History',
      rows.length
        ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Outlet</th>
                  <th>Order</th>
                  <th>Delivered</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                ${rows
                  .map(
                    x => `
                      <tr>
                        <td>
                          ${esc(
                            String(
                              x.Date ||
                              x['Order Date'] ||
                              ''
                            ).slice(0,10)
                          )}
                        </td>

                        <td>
                          ${esc(
                            x['Outlet Name'] ||
                            x.Outlet ||
                            '—'
                          )}
                        </td>

                        <td>
                          ${money(
                            x['Order Value'] ||
                            x.Order ||
                            0
                          )}
                        </td>

                        <td>
                          ${money(
                            x['Delivered Value'] ||
                            x.Delivered ||
                            0
                          )}
                        </td>

                        <td>
                          ${statusPill(
                            x.Status ||
                            'PENDING'
                          )}
                        </td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        : emptyState(
            'No execution data',
            'Order and delivery updates will appear here.'
          )
    )}
  `;
}

function bindExecution() {
  const form =
    $('#executionForm');

  if (!form) return;

  form.onsubmit =
    async e => {
      e.preventDefault();

      const outletName =
        $('#executionOutlet')?.value;

      const outlet =
        routeOutlets().find(
          x =>
            String(
              x['Outlet Name']
            ) ===
            String(outletName)
        );

      try {
        setBusy(
          true,
          'Saving delivery update…'
        );

        const r =
          await apiPost(
            'saveExecution',
            {
              viewStaffId:
                viewedId(),

              date:
                $('#executionDate')?.value ||
                selectedDate,

              outletCode:
                outlet?.[
                  'Outlet Code'
                ] || '',

              outletName,

              orderValue:
                n(
                  $('#executionOrder')?.value
                ),

              deliveredValue:
                n(
                  $('#executionDelivered')?.value
                ),

              status:
                $('#executionStatus')?.value ||
                'PENDING',

              remarks:
                $('#executionRemarks')?.value ||
                ''
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Save failed'
          );
        }

        toast(
          'Execution updated'
        );

        await loadCurrent({
          quiet: true
        });

        render();
      } catch (err) {
        toast(
          err.message ||
          'Save failed',
          3500
        );
      } finally {
        setBusy(false);
      }
    };
}

/* =========================================================
   ZERO SALES / OUTLET COVERAGE
========================================================= */

function renderZero() {
  const rows =
    routeOutlets()
      .map(x => {
        const outletName =
          x['Outlet Name'];

        const sales =
          monthOutletSales(
            outletName
          );

        return {
          ...x,
          sales,
          zero:
            sales <= 0
        };
      })
      .sort(
        (a, b) =>
          Number(b.zero) -
          Number(a.zero)
      );

  const zeroCount =
    rows.filter(
      x => x.zero
    ).length;

  return `
    ${sectionTitle(
      'Outlet Coverage',
      `${zeroCount} zero-sales outlet(s) • ${rows.length} total`
    )}

    <div class="kpi-grid">
      ${kpi(
        'Total Outlet',
        String(rows.length)
      )}

      ${kpi(
        'Active Outlet',
        String(
          rows.length -
          zeroCount
        )
      )}

      ${kpi(
        'Zero Sales',
        String(zeroCount)
      )}

      ${kpi(
        'Coverage',
        rows.length
          ? pct(
              (
                (rows.length -
                  zeroCount) /
                rows.length
              ) * 100
            )
          : '0.0%'
      )}
    </div>

    ${card(
      'Outlet Status',
      rows.length
        ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Outlet</th>
                  <th>Route</th>
                  <th>MTD Sales</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                ${rows
                  .map(
                    x => `
                      <tr>
                        <td>
                          <strong>
                            ${esc(
                              x['Outlet Name'] ||
                              '—'
                            )}
                          </strong>
                        </td>

                        <td>
                          ${esc(
                            x.Route ||
                            x.Area ||
                            '—'
                          )}
                        </td>

                        <td>
                          ${money(
                            x.sales
                          )}
                        </td>

                        <td>
                          ${
                            x.zero
                              ? statusPill(
                                  'ZERO SALES'
                                )
                              : statusPill(
                                  'ACTIVE'
                                )
                          }
                        </td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        : emptyState(
            'No outlet assigned',
            'Assigned outlets will appear here.'
          )
    )}
  `;
}

/* =========================================================
   MONTHLY PLANNING
========================================================= */

function renderPlanning() {
  const plans =
    current?.plans || [];

  return `
    ${sectionTitle(
      'Monthly Planning',
      'Set outlet and SKU-wise execution targets'
    )}

    ${card(
      'Outlet Plan',
      `
        <form id="planningForm">
          <div class="form-grid">

            ${field(
              'Month',
              `
                <input
                  id="planningMonth"
                  type="month"
                  value="${esc(selectedMonth)}"
                  required
                >
              `
            )}

            ${field(
              'Outlet',
              `
                <select
                  id="planningOutlet"
                  required
                >
                  ${outletOptions()}
                </select>
              `
            )}

            ${field(
              'Sales Target',
              `
                <input
                  id="planningTarget"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="RM"
                >
              `
            )}

            ${field(
              'SKU Target Count',
              `
                <input
                  id="planningSkuTarget"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 25"
                >
              `
            )}

            ${field(
              'Remarks',
              `
                <input
                  id="planningRemarks"
                  type="text"
                  placeholder="Monthly execution note"
                >
              `
            )}

          </div>

          <button
            class="primary-btn"
            type="submit"
          >
            Save Monthly Plan
          </button>
        </form>
      `,
      'action-plan'
    )}

    ${card(
      'Current Plans',
      plans.length
        ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Outlet</th>
                  <th>Sales Target</th>
                  <th>SKU Target</th>
                  <th>Achievement</th>
                </tr>
              </thead>

              <tbody>
                ${plans
                  .map(x => {
                    const outlet =
                      x['Outlet Name'] ||
                      x.Outlet ||
                      '';

                    const target =
                      n(
                        x[
                          'Sales Target'
                        ] ||
                        x.Target
                      );

                    const actual =
                      monthOutletSales(
                        outlet
                      );

                    return `
                      <tr>
                        <td>
                          ${esc(outlet)}
                        </td>

                        <td>
                          ${money(target)}
                        </td>

                        <td>
                          ${esc(
                            x[
                              'SKU Target'
                            ] ||
                            x[
                              'SKU Target Count'
                            ] ||
                            0
                          )}
                        </td>

                        <td>
                          ${
                            target
                              ? pct(
                                  (
                                    actual /
                                    target
                                  ) * 100
                                )
                              : '—'
                          }
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        : emptyState(
            'No monthly plan',
            'Create an outlet plan to start SKU-wise tracking.'
          )
    )}
  `;
}

function bindPlanning() {
  const form =
    $('#planningForm');

  if (!form) return;

  form.onsubmit =
    async e => {
      e.preventDefault();

      const outletName =
        $('#planningOutlet')?.value;

      const outlet =
        routeOutlets().find(
          x =>
            String(
              x['Outlet Name']
            ) ===
            String(outletName)
        );

      try {
        setBusy(
          true,
          'Saving monthly plan…'
        );

        const r =
          await apiPost(
            'savePlan',
            {
              viewStaffId:
                viewedId(),

              month:
                $('#planningMonth')?.value ||
                selectedMonth,

              outletCode:
                outlet?.[
                  'Outlet Code'
                ] || '',

              outletName,

              target:
                n(
                  $('#planningTarget')?.value
                ),

              skuTarget:
                n(
                  $('#planningSkuTarget')?.value
                ),

              remarks:
                $('#planningRemarks')?.value ||
                ''
            }
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Unable to save plan'
          );
        }

        selectedMonth =
          $('#planningMonth')?.value ||
          selectedMonth;

        toast(
          'Monthly plan saved'
        );

        await loadCurrent({
          quiet: true
        });

        render();
      } catch (err) {
        toast(
          err.message ||
          'Save failed',
          3500
        );
      } finally {
        setBusy(false);
      }
    };
}

/* =========================================================
   INCENTIVE HELPERS
========================================================= */

function incentiveSkuPicker() {
  const names =
    allSkuNames();

  if (!names.length) {
    return `
      <div class="muted">
        No SKU master found.
      </div>
    `;
  }

  return `
    <div class="sku-picker">
      ${names
        .map(
          x => `
            <label class="check-row">
              <input
                type="checkbox"
                class="incentiveSkuCheck"
                value="${esc(x)}"
              >
              <span>
                ${esc(x)}
              </span>
            </label>
          `
        )
        .join('')}
    </div>
  `;
}
/* =========================================================
   INCENTIVE CENTER
========================================================= */

let editingIncentiveId = null;
let incentiveSelectedSkus = [];

function teamUsers() {
  const cloud =
    Array.isArray(v8SRs) && v8SRs.length
      ? v8SRs.map(x => ({
          id: String(
            x['Staff ID'] ||
            x.staffId ||
            x.id ||
            ''
          ),
          name: String(
            x['Full Name'] ||
            x.name ||
            x['Staff ID'] ||
            ''
          )
        }))
      : [];

  if (cloud.length) return cloud;

  return (D.users || [])
    .filter(x => {
      const role =
        String(x.role || x.Role || '')
          .toUpperCase();

      return (
        role.includes('SR') &&
        String(
          x.active ??
          x.Active ??
          'TRUE'
        ).toUpperCase() !== 'FALSE'
      );
    })
    .map(x => ({
      id: String(
        x.id ||
        x['Staff ID'] ||
        ''
      ),
      name: String(
        x.name ||
        x['Full Name'] ||
        x.id ||
        ''
      )
    }));
}

function incentiveCard(i) {
  const actual =
    n(
      i.actual ??
      i.achievement ??
      i.currentValue
    );

  const target =
    n(
      i.target ??
      i.targetValue
    );

  const achieved =
    target > 0
      ? actual >= target
      : false;

  const remaining =
    Math.max(
      target - actual,
      0
    );

  return `
    <div class="card action-inc">
      <div class="row">
        <div>
          <p class="eyebrow">
            ${esc(
              i.category ||
              'INCENTIVE'
            )}
          </p>

          <h3>
            ${esc(
              i.name ||
              i.Name ||
              'Incentive'
            )}
          </h3>

          <p class="muted">
            ${esc(
              i.description ||
              ''
            )}
          </p>
        </div>

        ${statusPill(
          achieved
            ? 'ACHIEVED'
            : 'ACTIVE'
        )}
      </div>

      <div class="kpi-grid">
        ${kpi(
          'Target',
          String(target)
        )}

        ${kpi(
          'Actual',
          String(actual)
        )}

        ${kpi(
          'Remaining',
          String(remaining)
        )}

        ${kpi(
          'Reward',
          money(
            i.rewardRM ||
            i.reward ||
            0
          )
        )}
      </div>

      ${progressBar(
        actual,
        target,
        'Incentive Progress'
      )}

      ${
        Array.isArray(
          i.selectedSkus
        ) &&
        i.selectedSkus.length
          ? `
            <div class="status-strip">
              ${i.selectedSkus
                .map(
                  x => `
                    <span class="status-chip">
                      ${esc(x)}
                    </span>
                  `
                )
                .join('')}
            </div>
          `
          : ''
      }

      ${
        i.bannerFileId ||
        i.bannerId
          ? `
            <button
              class="btn secondary"
              data-banner="${esc(
                i.bannerFileId ||
                i.bannerId
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
                i.id ||
                i.incentiveId ||
                ''
              )}"
            >
              EDIT
            </button>
          `
          : ''
      }
    </div>
  `;
}

function renderIncentives() {
  const list =
    current?.incentives || [];

  const edit =
    editingIncentiveId
      ? list.find(
          x =>
            String(
              x.id ||
              x.incentiveId
            ) ===
            String(
              editingIncentiveId
            )
        )
      : null;

  incentiveSelectedSkus =
    Array.isArray(
      edit?.selectedSkus
    )
      ? [...edit.selectedSkus]
      : [];

  const managerForm =
    isManagerMode()
      ? `
        ${card(
          edit
            ? 'Update Incentive'
            : 'Create Incentive',
          `
            <form
              id="incForm"
              class="stack"
            >
              ${field(
                'Incentive Name',
                `
                  <input
                    name="name"
                    required
                    value="${esc(
                      edit?.name ||
                      ''
                    )}"
                    placeholder="e.g. Value Pack Incentive"
                  >
                `
              )}

              ${field(
                'Description',
                `
                  <textarea
                    name="description"
                    placeholder="Instruction for SR"
                  >${esc(
                    edit?.description ||
                    ''
                  )}</textarea>
                `
              )}

              <div class="form-grid">

                ${field(
                  'Category',
                  `
                    <select name="category">
                      <option
                        value="PRODUCT"
                        ${
                          (
                            edit?.category ||
                            'PRODUCT'
                          ) ===
                          'PRODUCT'
                            ? 'selected'
                            : ''
                        }
                      >
                        Product
                      </option>

                      <option
                        value="INDIVIDUAL"
                        ${
                          edit?.category ===
                          'INDIVIDUAL'
                            ? 'selected'
                            : ''
                        }
                      >
                        Individual
                      </option>

                      <option
                        value="GROWTH"
                        ${
                          edit?.category ===
                          'GROWTH'
                            ? 'selected'
                            : ''
                        }
                      >
                        Growth
                      </option>

                      <option
                        value="OTHER"
                        ${
                          edit?.category ===
                          'OTHER'
                            ? 'selected'
                            : ''
                        }
                      >
                        Other
                      </option>
                    </select>
                  `
                )}

                ${field(
                  'Incentive Basis',
                  `
                    <select
                      name="basis"
                      id="incBasis"
                    >
                      <option
                        value="SINGLE_SKU"
                      >
                        Single SKU
                      </option>

                      <option
                        value="MULTI_SKU"
                      >
                        Multiple SKU / Combo
                      </option>

                      <option
                        value="TOTAL_SALES"
                      >
                        Total Sales RM
                      </option>

                      <option
                        value="OUTLET_COVERAGE"
                      >
                        Outlet Coverage
                      </option>
                    </select>
                  `
                )}

              </div>

              <div
                id="incProductControls"
              >
                ${incentiveSkuPicker()}
              </div>

              <div class="form-grid">

                ${field(
                  'Target',
                  `
                    <input
                      name="target"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value="${
                        edit
                          ? n(
                              edit.target ||
                              edit.targetValue
                            )
                          : ''
                      }"
                    >
                  `
                )}

                ${field(
                  'Reward RM',
                  `
                    <input
                      name="reward"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value="${
                        edit
                          ? n(
                              edit.rewardRM ||
                              edit.reward
                            )
                          : ''
                      }"
                    >
                  `
                )}

              </div>

              <div class="form-grid">

                ${field(
                  'Start Date',
                  `
                    <input
                      name="startDate"
                      type="date"
                      required
                      value="${esc(
                        edit?.startDate ||
                        selectedMonth +
                        '-01'
                      )}"
                    >
                  `
                )}

                ${field(
                  'End Date',
                  `
                    <input
                      name="endDate"
                      type="date"
                      value="${esc(
                        edit?.endDate ||
                        ''
                      )}"
                    >
                  `
                )}

              </div>

              ${field(
                'Assign To',
                `
                  <select
                    name="scope"
                    id="incScope"
                  >
                    <option
                      value="SPECIFIC"
                    >
                      Selected SR
                    </option>

                    <option
                      value="ALL"
                    >
                      ALL SR
                    </option>

                    <option
                      value="SELF"
                    >
                      Manager Personal
                    </option>
                  </select>
                `
              )}

              <div id="incStaffWrap">
                ${field(
                  'Selected SR',
                  `
                    <select
                      name="staffId"
                    >
                      ${teamUsers()
                        .map(
                          u => `
                            <option
                              value="${esc(
                                u.id
                              )}"
                            >
                              ${esc(
                                u.name
                              )}
                              •
                              ${esc(
                                u.id
                              )}
                            </option>
                          `
                        )
                        .join('')}
                    </select>
                  `
                )}
              </div>

              ${field(
                'Banner / Image',
                `
                  <input
                    name="banner"
                    type="file"
                    accept="image/*"
                  >
                `,
                'Optional • max 3 MB'
              )}

              <button
                class="btn primary big-action"
                type="submit"
              >
                ${
                  edit
                    ? 'UPDATE INCENTIVE'
                    : 'CREATE INCENTIVE'
                }
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
          `
        )}
      `
      : '';

  return `
    ${sectionTitle(
      'Incentive Center',
      'Live achievement from sales database'
    )}

    ${managerForm}

    <div class="list">
      ${
        list.length
          ? list
              .map(
                incentiveCard
              )
              .join('')
          : emptyState(
              'No active incentive',
              'Assigned incentives will appear here.'
            )
      }
    </div>
  `;
}

function bindIncentives() {
  const scope =
    $('#incScope');

  if (scope) {
    const sync = () => {
      const wrap =
        $('#incStaffWrap');

      if (wrap) {
        wrap.style.display =
          scope.value ===
          'SPECIFIC'
            ? ''
            : 'none';
      }
    };

    scope.onchange = sync;
    sync();
  }

  $$('.incentiveSkuCheck')
    .forEach(x => {
      x.onchange = () => {
        incentiveSelectedSkus =
          $$('.incentiveSkuCheck')
            .filter(
              c => c.checked
            )
            .map(
              c => c.value
            );
      };
    });

  $$('[data-banner]')
    .forEach(b => {
      b.onclick = () =>
        downloadCloudFile(
          'downloadBanner',
          b.dataset.banner,
          true
        );
    });

  $$('[data-editinc]')
    .forEach(b => {
      b.onclick = () => {
        editingIncentiveId =
          b.dataset.editinc;

        render();

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      };
    });

  if ($('#cancelIncEdit')) {
    $('#cancelIncEdit').onclick =
      () => {
        editingIncentiveId =
          null;

        render();
      };
  }

  const form =
    $('#incForm');

  if (!form) return;

  form.onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const scopeValue =
        String(
          fd.get('scope') ||
          'SPECIFIC'
        );

      const file =
        fd.get('banner');

      let bannerBase64 = '';
      let bannerFileName = '';
      let bannerMimeType = '';

      try {
        setBusy(
          true,
          'Saving incentive…'
        );

        if (
          file instanceof File &&
          file.size
        ) {
          if (
            file.size >
            3 * 1024 * 1024
          ) {
            throw new Error(
              'Banner must be under 3 MB'
            );
          }

          bannerBase64 =
            await fileToBase64(
              file
            );

          bannerFileName =
            file.name;

          bannerMimeType =
            file.type;
        }

        const payload = {
          incentiveId:
            editingIncentiveId ||
            '',

          name:
            String(
              fd.get('name') ||
              ''
            ),

          description:
            String(
              fd.get(
                'description'
              ) || ''
            ),

          category:
            String(
              fd.get(
                'category'
              ) || 'PRODUCT'
            ),

          basis:
            String(
              fd.get('basis') ||
              'SINGLE_SKU'
            ),

          selectedSkus:
            [
              ...incentiveSelectedSkus
            ],

          targetValue:
            n(
              fd.get('target')
            ),

          rewardRM:
            n(
              fd.get('reward')
            ),

          startDate:
            String(
              fd.get(
                'startDate'
              ) || ''
            ),

          endDate:
            String(
              fd.get(
                'endDate'
              ) || ''
            ),

          scope:
            scopeValue,

          assignedStaff:
            scopeValue ===
            'ALL'
              ? []
              : scopeValue ===
                'SELF'
                ? [session.id]
                : [
                    String(
                      fd.get(
                        'staffId'
                      ) || ''
                    )
                  ],

          bannerBase64,
          bannerFileName,
          bannerMimeType
        };

        const action =
          editingIncentiveId
            ? 'saveIncentive'
            : 'createIncentive';

        const r =
          await apiPost(
            action,
            payload
          );

        if (!r?.ok) {
          throw new Error(
            r?.error ||
            'Incentive save failed'
          );
        }

        editingIncentiveId =
          null;

        incentiveSelectedSkus =
          [];

        toast(
          scopeValue === 'ALL'
            ? 'Incentive assigned to ALL SR'
            : 'Incentive saved'
        );

        if (
          isManagerMode()
        ) {
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

        render();
      } catch (err) {
        toast(
          err.message ||
          'Save failed',
          4000
        );
      } finally {
        setBusy(false);
      }
    };
}

/* =========================================================
   PERSONAL TARGET / INCENTIVE
========================================================= */

function personalTargetsSection() {
  const list =
    current?.personalTargets ||
    [];

  if (!list.length) {
    return '';
  }

  return card(
    'Personal Incentive Target',
    list
      .map(
        x => `
          <div class="list-item">
            <div class="row">
              <div>
                <strong>
                  ${esc(
                    x.Title ||
                    x.Name ||
                    'Personal Target'
                  )}
                </strong>

                <p class="muted">
                  ${esc(
                    x.Description ||
                    ''
                  )}
                </p>
              </div>

              <strong>
                ${money(
                  x.Reward ||
                  x['Reward RM'] ||
                  0
                )}
              </strong>
            </div>

            ${progressBar(
              n(
                x.Actual ||
                x.Achievement
              ),
              n(
                x.Target
              ),
              'Progress'
            )}
          </div>
        `
      )
      .join('')
  );
}

/* =========================================================
   IMPORTANT WORK / TASKS / PERSONAL REMINDER
========================================================= */

function renderTasks() {
  const tasks =
    current?.tasks || [];

  const manager =
    isManagerMode();

  const targetOptions =
    teamUsers();

  const form = `
    ${card(
      manager
        ? 'Assign Important Work'
        : 'My Reminder',
      `
        <form
          id="taskForm"
          class="stack"
        >

          ${
            manager
              ? field(
                  'Assign To',
                  `
                    <select
                      name="staffId"
                      id="taskStaff"
                    >
                      <option value="ALL">
                        ALL SR
                      </option>

                      <option value="${esc(
                        session.id
                      )}">
                        Myself •
                        ${esc(
                          session.id
                        )}
                      </option>

                      ${targetOptions
                        .map(
                          u => `
                            <option
                              value="${esc(
                                u.id
                              )}"
                            >
                              ${esc(
                                u.name
                              )}
                              •
                              ${esc(
                                u.id
                              )}
                            </option>
                          `
                        )
                        .join('')}
                    </select>
                  `
                )
              : `
                <input
                  type="hidden"
                  name="staffId"
                  value="${esc(
                    session.id
                  )}"
                >
              `
          }

          ${field(
            'Title',
            `
              <input
                name="title"
                required
                placeholder="${
                  manager
                    ? 'Important work title'
                    : 'e.g. Buyer meeting at Giant'
                }"
              >
            `
          )}

          ${field(
            'Instruction / Note',
            `
              <textarea
                name="instruction"
                placeholder="${
                  manager
                    ? 'Instruction for SR'
                    : 'Personal note / follow-up'
                }"
              ></textarea>
            `
          )}

          <div class="form-grid">

            ${field(
              'Due Date',
              `
                <input
                  name="due"
                  type="date"
                  value="${esc(
                    selectedDate
                  )}"
                >
              `
            )}

            ${field(
              'Due Time',
              `
                <input
                  name="dueTime"
                  type="time"
                >
              `
            )}

          </div>

          <div class="form-grid">

            ${field(
              'Priority',
              `
                <select
                  name="priority"
                >
                  <option value="NORMAL">
                    Normal
                  </option>

                  <option value="HIGH">
                    High
                  </option>

                  <option value="URGENT">
                    Urgent
                  </option>
                </select>
              `
            )}

            ${field(
              'Outlet',
              `
                <select
                  name="outletName"
                  id="taskOutlet"
                >
                  <option value="">
                    Optional
                  </option>

                  ${routeOutlets()
                    .map(
                      x => `
                        <option
                          value="${esc(
                            x[
                              'Outlet Name'
                            ]
                          )}"
                        >
                          ${esc(
                            x[
                              'Outlet Name'
                            ]
                          )}
                        </option>
                      `
                    )
                    .join('')}
                </select>
              `
            )}

          </div>

          ${
            !manager
              ? `
                <label class="check-row">
                  <input
                    type="checkbox"
                    name="shareManager"
                  >
                  <span>
                    Share / Notify Manager
                  </span>
                </label>
              `
              : ''
          }

          <label class="check-row">
            <input
              type="checkbox"
              name="reminderEnabled"
              checked
            >

            <span>
              Reminder notification enabled
            </span>
          </label>

          <button
            class="btn primary"
            type="submit"
          >
            ${
              manager
                ? 'SAVE IMPORTANT WORK'
                : 'SAVE MY REMINDER'
            }
          </button>
        </form>
      `,
      'action-task'
    )}
  `;

  const list =
    tasks.length
      ? tasks
          .map(t => {
            const done =
              taskDone(t);

            const source =
              String(
                t.Source ||
                t.source ||
                ''
              ).toUpperCase();

            const own =
              source === 'OWN';

            return `
              <div class="list-item task-item">

                <div class="row">

                  <div>
                    <div class="status-strip">

                      <span class="status-chip">
                        ${
                          own
                            ? 'MY REMINDER'
                            : 'MANAGER ASSIGNED'
                        }
                      </span>

                      ${
                        t.Priority
                          ? `
                            <span class="status-chip">
                              ${esc(
                                t.Priority
                              )}
                            </span>
                          `
                          : ''
                      }

                    </div>

                    <h4>
                      ${esc(
                        t.Title ||
                        'Important Work'
                      )}
                    </h4>

                    <p>
                      ${esc(
                        t.Instruction ||
                        ''
                      )}

                      ${
                        t[
                          'Outlet Name'
                        ]
                          ? `
                            <br>
                            Outlet:
                            ${esc(
                              t[
                                'Outlet Name'
                              ]
                            )}
                          `
                          : ''
                      }

                      ${
                        t['Due Date']
                          ? `
                            <br>
                            Due:
                            ${dateLabel(
                              t[
                                'Due Date'
                              ]
                            )}
                            ${
                              t[
                                'Due Time'
                              ]
                                ? ' • ' +
                                  esc(
                                    t[
                                      'Due Time'
                                    ]
                                  )
                                : ''
                            }
                          `
                          : ''
                      }

                      ${
                        t[
                          'Created At'
                        ]
                          ? `
                            <br>
                            Created:
                            ${esc(
                              String(
                                t[
                                  'Created At'
                                ]
                              )
                            )}
                          `
                          : ''
                      }

                      ${
                        t[
                          'Completed At'
                        ]
                          ? `
                            <br>
                            Completed:
                            ${esc(
                              String(
                                t[
                                  'Completed At'
                                ]
                              )
                            )}
                          `
                          : ''
                      }
                    </p>
                  </div>

                  ${statusPill(
                    done
                      ? 'DONE'
                      : 'PENDING'
                  )}

                </div>

                ${
                  !done &&
                  !manager
                    ? `
                      <button
                        class="btn secondary"
                        data-taskdone="${esc(
                          t[
                            'Task ID'
                          ] ||
                          t.taskId ||
                          t.ID ||
                          ''
                        )}"
                        data-tasktitle="${esc(
                          t.Title ||
                          ''
                        )}"
                      >
                        MARK COMPLETE
                      </button>
                    `
                    : ''
                }

              </div>
            `;
          })
          .join('')
      : emptyState(
          'No Important Work',
          manager
            ? 'Assigned work will appear here.'
            : 'Create your own reminder or wait for manager assignment.'
        );

  return `
    ${sectionTitle(
      'Important Work',
      manager
        ? 'Assign work to individual SR, ALL SR or yourself'
        : 'Manager-assigned work + your personal reminders'
    )}

    ${form}

    ${card(
      'Task History',
      `<div class="list">${list}</div>`
    )}
  `;
}

function bindTasks() {
  const form =
    $('#taskForm');

  if (form) {
    form.onsubmit =
      async e => {
        e.preventDefault();

        const fd =
          new FormData(
            e.target
          );

        const target =
          String(
            fd.get(
              'staffId'
            ) ||
            session.id
          );

        const outletName =
          String(
            fd.get(
              'outletName'
            ) || ''
          );

        const outlet =
          routeOutlets().find(
            x =>
              String(
                x[
                  'Outlet Name'
                ]
              ) ===
              outletName
          );

        const base = {
          title:
            String(
              fd.get('title') ||
              ''
            ),

          instruction:
            String(
              fd.get(
                'instruction'
              ) || ''
            ),

          due:
            String(
              fd.get('due') ||
              ''
            ),

          dueTime:
            String(
              fd.get(
                'dueTime'
              ) || ''
            ),

          priority:
            String(
              fd.get(
                'priority'
              ) || 'NORMAL'
            ),

          outletCode:
            outlet?.[
              'Outlet Code'
            ] || '',

          outletName,

          reminderEnabled:
            fd.get(
              'reminderEnabled'
            ) !== null,

          shareManager:
            fd.get(
              'shareManager'
            ) !== null,

          source:
            isManagerMode()
              ? 'MANAGER'
              : 'OWN'
        };

        try {
          setBusy(
            true,
            target === 'ALL'
              ? 'Assigning to ALL SR…'
              : 'Saving Important Work…'
          );

          if (
            target === 'ALL'
          ) {
            const users =
              teamUsers();

            if (!users.length) {
              throw new Error(
                'No active SR found'
              );
            }

            for (
              const u of users
            ) {
              const r =
                await apiPost(
                  'saveTask',
                  {
                    ...base,
                    staffId:
                      u.id
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
              `Important Work sent to ${users.length} SR`
            );
          } else {
            const r =
              await apiPost(
                'saveTask',
                {
                  ...base,
                  staffId:
                    target
                }
              );

            if (!r?.ok) {
              throw new Error(
                r?.error ||
                'Task save failed'
              );
            }

            toast(
              isManagerMode()
                ? 'Important Work sent'
                : 'Reminder saved'
            );
          }

          await loadCurrent({
            quiet: true
          });

          if (
            isManagerMode()
          ) {
            await loadTeam({
              quiet: true
            });
          }

          render();
        } catch (err) {
          toast(
            err.message ||
            'Task save failed',
            4000
          );
        } finally {
          setBusy(false);
        }
      };
  }

  $$('[data-taskdone]')
    .forEach(b => {
      b.onclick =
        async () => {
          try {
            setBusy(
              true,
              'Completing task…'
            );

            const r =
              await apiPost(
                'completeTask',
                {
                  taskId:
                    b.dataset
                      .taskdone,

                  title:
                    b.dataset
                      .tasktitle
                }
              );

            if (!r?.ok) {
              throw new Error(
                r?.error ||
                'Unable to complete task'
              );
            }

            toast(
              'Task completed'
            );

            await loadCurrent({
              quiet: true
            });

            render();
          } catch (err) {
            toast(
              err.message ||
              'Task update failed',
              3500
            );
          } finally {
            setBusy(false);
          }
        };
    });
}

/* =========================================================
   FILE HELPERS
========================================================= */

function fileToBase64(file) {
  return new Promise(
    (resolve, reject) => {
      const r =
        new FileReader();

      r.onload = () =>
        resolve(
          String(
            r.result || ''
          )
            .split(',')
            .pop() || ''
        );

      r.onerror = reject;

      r.readAsDataURL(
        file
      );
    }
  );
}

function base64ToBlob(
  base64,
  mime
) {
  const bytes =
    atob(base64);

  const chunks = [];

  for (
    let i = 0;
    i < bytes.length;
    i += 1024
  ) {
    const slice =
      bytes.slice(
        i,
        i + 1024
      );

    const arr =
      new Uint8Array(
        slice.length
      );

    for (
      let j = 0;
      j < slice.length;
      j++
    ) {
      arr[j] =
        slice.charCodeAt(j);
    }

    chunks.push(arr);
  }

  return new Blob(
    chunks,
    {
      type:
        mime ||
        'application/octet-stream'
    }
  );
}

async function downloadCloudFile(
  action,
  fileId,
  preview = false
) {
  if (!fileId) {
    return toast(
      'File missing'
    );
  }

  setBusy(
    true,
    'Preparing file…'
  );

  try {
    const r =
      await apiPost(
        action,
        {
          fileId
        }
      );

    if (!r?.ok) {
      throw new Error(
        r?.error ||
        'File failed'
      );
    }

    const blob =
      base64ToBlob(
        r.base64,
        r.mimeType
      );

    const url =
      URL.createObjectURL(
        blob
      );

    if (
      preview &&
      String(
        r.mimeType || ''
      ).startsWith(
        'image/'
      )
    ) {
      window.open(
        url,
        '_blank',
        'noopener'
      );
    } else {
      const a =
        document.createElement(
          'a'
        );

      a.href = url;

      a.download =
        r.fileName ||
        'file';

      document.body.appendChild(
        a
      );

      a.click();
      a.remove();
    }

    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      20000
    );
  } catch (e) {
    toast(
      e.message ||
      'File failed',
      3500
    );
  } finally {
    setBusy(false);
  }
}

/* =========================================================
   CPO EXECUTION
========================================================= */

function renderCpo() {
  const list =
    current?.cpo || [];

  const manager =
    isManagerMode();

  const form = card(
    manager
      ? 'Assign CPO'
      : 'CPO Execution',
    `
      <form
        id="cpoForm"
        class="stack"
      >

        ${
          manager
            ? field(
                'Assign To',
                `
                  <select
                    name="staffId"
                    id="cpoStaff"
                  >
                    <option value="ALL">
                      ALL SR
                    </option>

                    ${teamUsers()
                      .map(
                        u => `
                          <option
                            value="${esc(
                              u.id
                            )}"
                          >
                            ${esc(
                              u.name
                            )}
                            •
                            ${esc(
                              u.id
                            )}
                          </option>
                        `
                      )
                      .join('')}
                  </select>
                `
              )
            : `
              <input
                type="hidden"
                name="staffId"
                value="${esc(
                  session.id
                )}"
              >
            `
        }

        ${field(
          'Date',
          `
            <input
              name="date"
              type="date"
              value="${esc(
                selectedDate
              )}"
              required
            >
          `
        )}

        ${field(
          'Outlet',
          `
            <select
              name="outletName"
              required
            >
              ${outletOptions()}
            </select>
          `
        )}

        ${field(
          'CPO / Instruction',
          `
            <textarea
              name="note"
              placeholder="CPO execution instruction / note"
            ></textarea>
          `
        )}

        ${
          !manager
            ? field(
                'Photo / Proof',
                `
                  <input
                    name="proof"
                    type="file"
                    accept="image/*"
                  >
                `,
                'Upload execution proof where required'
              )
            : ''
        }

        ${field(
          'Status',
          `
            <select
              name="status"
            >
              ${
                manager
                  ? `
                    <option value="PENDING">
                      Pending
                    </option>

                    <option value="VACANT">
                      Vacant
                    </option>
                  `
                  : `
                    <option value="COMPLETED">
                      Completed
                    </option>

                    <option value="PROOF MISSING">
                      Proof Missing
                    </option>

                    <option value="PENDING">
                      Pending
                    </option>
                  `
              }
            </select>
          `
        )}

        <button
          class="btn primary"
          type="submit"
        >
          ${
            manager
              ? 'ASSIGN CPO'
              : 'UPDATE CPO'
          }
        </button>

      </form>
    `,
    'action-cpo'
  );

  const history =
    list.length
      ? list
          .map(
            x => `
              <div class="list-item">
                <div class="row">
                  <div>
                    <h4>
                      ${esc(
                        x[
                          'Outlet Name'
                        ] ||
                        x.Outlet ||
                        'CPO'
                      )}
                    </h4>

                    <p>
                      ${
                        x[
                          'Staff Name'
                        ]
                          ? esc(
                              x[
                                'Staff Name'
                              ]
                            ) +
                            ' • '
                          : ''
                      }

                      ${esc(
                        x[
                          'Staff ID'
                        ] ||
                        ''
                      )}

                      ${
                        x.Date
                          ? `
                            <br>
                            ${dateLabel(
                              String(
                                x.Date
                              ).slice(
                                0,
                                10
                              )
                            )}
                          `
                          : ''
                      }

                      ${
                        x.Note ||
                        x.Remarks
                          ? `
                            <br>
                            ${esc(
                              x.Note ||
                              x.Remarks
                            )}
                          `
                          : ''
                      }
                    </p>
                  </div>

                  ${statusPill(
                    x.Status ||
                    'PENDING'
                  )}
                </div>

                ${
                  x[
                    'Proof File ID'
                  ] ||
                  x.proofFileId
                    ? `
                      <button
                        class="btn secondary"
                        data-cpoproof="${esc(
                          x[
                            'Proof File ID'
                          ] ||
                          x.proofFileId
                        )}"
                      >
                        VIEW PROOF
                      </button>
                    `
                    : ''
                }
              </div>
            `
          )
          .join('')
      : emptyState(
          'No CPO record',
          'CPO assignments and proof status will appear here.'
        );

  return `
    ${sectionTitle(
      'CPO Execution',
      manager
        ? 'Assign individually or to ALL SR'
        : 'Complete assigned CPO and upload proof'
    )}

    ${form}

    ${card(
      'CPO History',
      `<div class="list">${history}</div>`
    )}
  `;
}

function bindCpo() {
  $$('[data-cpoproof]')
    .forEach(b => {
      b.onclick = () =>
        downloadCloudFile(
          'downloadCpoPhoto',
          b.dataset.cpoproof,
          true
        );
    });

  const form =
    $('#cpoForm');

  if (!form) return;

  form.onsubmit =
    async e => {
      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const target =
        String(
          fd.get(
            'staffId'
          ) ||
          session.id
        );

      const outletName =
        String(
          fd.get(
            'outletName'
          ) || ''
        );

      const outlet =
        routeOutlets().find(
          x =>
            String(
              x[
                'Outlet Name'
              ]
            ) ===
            outletName
        );

      let proofBase64 = '';
      let proofFileName = '';
      let proofMimeType = '';

      try {
        setBusy(
          true,
          target === 'ALL'
            ? 'Assigning CPO to ALL SR…'
            : 'Saving CPO…'
        );

        const file =
          fd.get('proof');

        if (
          file instanceof File &&
          file.size
        ) {
          if (
            file.size >
            3 * 1024 * 1024
          ) {
            throw new Error(
              'CPO proof must be under 3 MB'
            );
          }

          proofBase64 =
            await fileToBase64(
              file
            );

          proofFileName =
            file.name;

          proofMimeType =
            file.type;
        }

        const base = {
          date:
            String(
              fd.get('date') ||
              selectedDate
            ),

          outletCode:
            outlet?.[
              'Outlet Code'
            ] || '',

          outletName,

          note:
            String(
              fd.get('note') ||
              ''
            ),

          status:
            String(
              fd.get('status') ||
              'PENDING'
            ),

          proofBase64,
          proofFileName,
          proofMimeType
        };

        if (
          target === 'ALL'
        ) {
          const users =
            teamUsers();

          if (!users.length) {
            throw new Error(
              'No active SR found'
            );
          }

          for (
            const u of users
          ) {
            const r =
              await apiPost(
                'saveCpo',
                {
                  ...base,
                  staffId:
                    u.id
                }
              );

            if (!r?.ok) {
              throw new Error(
                r?.error ||
                `CPO failed for ${u.id}`
              );
            }
          }

          toast(
            `CPO assigned to ${users.length} SR`
          );
        } else {
          const r =
            await apiPost(
              'saveCpo',
              {
                ...base,
                staffId:
                  target
              }
            );

          if (!r?.ok) {
            throw new Error(
              r?.error ||
              'CPO save failed'
            );
          }

          toast(
            'CPO updated'
          );
        }

        await loadCurrent({
          quiet: true
        });

        if (
          isManagerMode()
        ) {
          await loadTeam({
            quiet: true
          });
        }

        render();
      } catch (err) {
        toast(
          err.message ||
          'CPO save failed',
          4000
        );
      } finally {
        setBusy(false);
      }
    };
}

/* =========================================================
   SUMMARY
========================================================= */

function renderSummary() {
  const s =
    current?.summary || {};

  const target =
    n(
      s.target ||
      s.monthlyTarget
    );

  const delivered =
    n(
      s.delivered ||
      s.sales
    );

  const shortfall =
    Math.max(
      target -
      delivered,
      0
    );

  const achievement =
    target > 0
      ? (
          delivered /
          target
        ) * 100
      : 0;

  const outlets =
    routeOutlets();

  const zero =
    outlets.filter(
      x =>
        monthOutletSales(
          x[
            'Outlet Name'
          ]
        ) <= 0
    ).length;

  return `
    ${sectionTitle(
      'Performance Summary',
      `${monthName(
        selectedMonth
      )} • ${viewedName()}`
    )}

    <div class="kpi-grid">
      ${kpi(
        'Target',
        money(target)
      )}

      ${kpi(
        'Delivered',
        money(delivered)
      )}

      ${kpi(
        'Achievement',
        pct(achievement)
      )}

      ${kpi(
        'Shortfall',
        money(shortfall)
      )}

      ${kpi(
        'Today Sales',
        money(
          s.todaySales ||
          current?.todaySales
        )
      )}

      ${kpi(
        'Pending Delivery',
        money(
          s.pendingDelivery ||
          0
        )
      )}

      ${kpi(
        'Total Outlet',
        String(
          outlets.length
        )
      )}

      ${kpi(
        'Zero Outlet',
        String(zero)
      )}
    </div>

    ${card(
      'Monthly Progress',
      progressBar(
        delivered,
        target,
        `${money(
          delivered
        )} / ${money(
          target
        )}`
      ),
      'action-summary'
    )}
  `;
}

/* =========================================================
   OPPORTUNITY ENGINE
========================================================= */

function renderOpportunity() {
  const data =
    current?.opportunity ||
    [];

  return `
    ${sectionTitle(
      'Opportunity Engine',
      'Where should I push next?'
    )}

    ${
      data.length
        ? `
          <div class="list">
            ${data
              .map(
                i => `
                  <div class="card">
                    <div class="row">
                      <div>
                        <h3>
                          ${esc(
                            i.name ||
                            'Opportunity'
                          )}
                        </h3>

                        <p class="muted">
                          ${esc(
                            i.groupName ||
                            (
                              i.selectedSkus ||
                              []
                            ).join(', ')
                          )}
                        </p>
                      </div>

                      <strong>
                        ${money(
                          i.rewardRM ||
                          0
                        )}
                      </strong>
                    </div>

                    ${progressBar(
                      n(i.actual),
                      n(i.target),
                      'Progress'
                    )}

                    <div class="status-strip">
                      <span class="status-chip">
                        ${n(
                          i.remaining
                        )} remaining
                      </span>

                      <span class="status-chip">
                        ${esc(
                          i.metric ||
                          ''
                        )}
                      </span>
                    </div>

                    <div class="list">
                      ${(i.outlets || [])
                        .slice(0, 80)
                        .map(
                          o => `
                            <div class="list-item">
                              <div class="row">
                                <div>
                                  <h4>
                                    ${esc(
                                      o.outletName ||
                                      ''
                                    )}
                                  </h4>

                                  <p>
                                    ${n(
                                      o.value ??
                                      o.cartons
                                    )}
                                    ${esc(
                                      o.category ||
                                      ''
                                    )}
                                  </p>
                                </div>

                                ${statusPill(
                                  o.status ||
                                  'OPPORTUNITY'
                                )}
                              </div>
                            </div>
                          `
                        )
                        .join('')}
                    </div>
                  </div>
                `
              )
              .join('')}
          </div>
        `
        : emptyState(
            'No opportunity data',
            'The engine becomes active from live incentive and outlet performance.'
          )
    }
  `;
}
/* =========================================================
   INCOME
========================================================= */

function renderIncome() {
  const s = current?.incomeSummary || {};

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">MONTHLY INCOME</p>
      <h3>${esc(viewedName())}</h3>
      <p class="muted">
        Salary + commission + incentive − penalty
      </p>
    </section>

    <div class="kpi-grid">
      ${kpi('BASE SALARY', money(s.baseSalary || 0))}
      ${kpi('COMMISSION', money(s.commission || 0))}
      ${kpi('INCENTIVE', money(s.incentive || s.incentiveEarned || 0))}
      ${kpi('PENALTY', money(s.penalty || 0))}
      ${kpi('FINAL INCOME', money(s.finalIncome || 0))}
    </div>

    ${personalTargetsSection()}
  `;

  bindCommon();
}

/* =========================================================
   PENALTIES
========================================================= */

function renderPenalties() {
  const rows = current?.penalties || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">PENALTY</p>
      <h3>Penalty & Adjustment</h3>
    </section>

    <div class="list">
      ${
        rows.length
          ? rows.map(x => `
              <div class="list-item">
                <div class="row">
                  <div>
                    <h4>${esc(x.Title || x.Reason || 'Penalty')}</h4>
                    <p>
                      ${esc(x.Note || x.Remarks || '')}
                      ${x.Date ? '<br>' + dateLabel(String(x.Date).slice(0,10)) : ''}
                    </p>
                  </div>

                  <strong>
                    ${money(x.Amount || x.Penalty || 0)}
                  </strong>
                </div>
              </div>
            `).join('')
          : emptyState(
              'No penalty',
              'No active penalty record is available.'
            )
      }
    </div>
  `;

  bindCommon();
}

/* =========================================================
   ACTIVITY
========================================================= */

function renderActivity() {
  const rows = current?.activity || current?.timeline || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">ACTIVITY</p>
      <h3>Recent Timeline</h3>
    </section>

    <div class="list">
      ${
        rows.length
          ? rows.map(x => `
              <div class="list-item">
                <h4>${esc(x.Title || x.Action || 'Activity')}</h4>

                <p>
                  ${esc(x.Description || x.Note || '')}
                  ${
                    x.Timestamp || x['Created At']
                      ? '<br>' + esc(String(x.Timestamp || x['Created At']))
                      : ''
                  }
                </p>
              </div>
            `).join('')
          : emptyState(
              'No recent activity',
              'Recent system activity will appear here.'
            )
      }
    </div>
  `;

  bindCommon();
}

/* =========================================================
   PROPOSAL FORM
========================================================= */

function renderProposal() {
  const rows = current?.proposals || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">PROPOSAL / PO FORM</p>
      <h3>Proposal Document Center</h3>
    </section>

    <div class="card">
      <form id="proposalForm" class="stack">

        <label>
          Title
          <input
            name="title"
            required
            placeholder="Proposal title"
          >
        </label>

        <label>
          Outlet / Buyer
          <input
            name="outlet"
            placeholder="Outlet / buyer"
          >
        </label>

        <label>
          File
          <input
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
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

    <div class="section-title">
      <h3>Uploaded Proposal</h3>
    </div>

    <div class="list">
      ${
        rows.length
          ? rows.map(x => `
              <div class="list-item">
                <div class="row">
                  <div>
                    <h4>${esc(x.Title || x.FileName || 'Proposal')}</h4>
                    <p>${esc(x.Outlet || x.Note || '')}</p>
                  </div>

                  ${
                    x['File ID'] || x.fileId
                      ? `
                        <button
                          class="btn secondary"
                          data-proposal="${esc(x['File ID'] || x.fileId)}"
                        >
                          OPEN
                        </button>
                      `
                      : ''
                  }
                </div>
              </div>
            `).join('')
          : emptyState('No proposal uploaded')
      }
    </div>
  `;

  bindCommon();

  $$('[data-proposal]').forEach(b => {
    b.onclick = () =>
      downloadCloudFile(
        'downloadProposal',
        b.dataset.proposal
      );
  });

  const form = $('#proposalForm');

  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(e.target);
      const file = fd.get('file');

      try {
        if (!(file instanceof File) || !file.size) {
          throw new Error('Select proposal file');
        }

        if (file.size > 6 * 1024 * 1024) {
          throw new Error('Proposal file must be under 6 MB');
        }

        setBusy(true, 'Uploading proposal…');

        const r = await apiPost('uploadProposal', {
          title: String(fd.get('title') || ''),
          outlet: String(fd.get('outlet') || ''),
          note: String(fd.get('note') || ''),
          fileName: file.name,
          mimeType: file.type,
          base64: await fileToBase64(file)
        });

        if (!r?.ok) {
          throw new Error(r?.error || 'Proposal upload failed');
        }

        toast('Proposal uploaded');

        await loadCurrent({ quiet: true });
        render();

      } catch (x) {
        toast(x.message || 'Upload failed', 4000);
      } finally {
        setBusy(false);
      }
    };
  }
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function updateNotificationBadge() {
  const badge = $('#notificationBadge');

  if (!badge) return;

  const rows = current?.notifications || [];

  const unread = rows.filter(
    x =>
      String(x.Read || x.read || 'FALSE').toUpperCase() !== 'TRUE'
  ).length;

  badge.textContent = unread ? String(unread) : '';
  badge.style.display = unread ? '' : 'none';
}

function renderNotifications() {
  const rows = current?.notifications || [];

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">NOTIFICATIONS</p>
      <h3>Alerts & Reminder History</h3>

      <button
        id="enablePush"
        class="btn primary"
      >
        ENABLE PHONE NOTIFICATION
      </button>
    </section>

    <div class="list" style="margin-top:12px">
      ${
        rows.length
          ? rows.map(x => `
              <div class="list-item">
                <h4>${esc(x.Title || x.title || 'Notification')}</h4>

                <p>
                  ${esc(x.Message || x.message || '')}

                  ${
                    x['Created At'] || x.createdAt
                      ? '<br>' + esc(String(x['Created At'] || x.createdAt))
                      : ''
                  }
                </p>
              </div>
            `).join('')
          : emptyState(
              'No notification',
              'Task, CPO, incentive and performance reminders will appear here.'
            )
      }
    </div>
  `;

  bindCommon();

  if ($('#enablePush')) {
    $('#enablePush').onclick = async () => {
      try {
        await initPushSystem(true);
        toast('Notification setup completed');
      } catch (x) {
        toast(x.message || 'Notification permission failed', 4000);
      }
    };
  }
}

async function initPushSystem(forcePrompt = false) {
  try {
    if (!window.OneSignalDeferred) {
      window.OneSignalDeferred = [];
    }

    window.OneSignalDeferred.push(async function(OneSignal) {
      oneSignalSdk = OneSignal;

      const appId =
        window.APP_CONFIG?.ONESIGNAL_APP_ID ||
        window.ONESIGNAL_APP_ID ||
        '';

      if (!appId) return;

      pushConfig.appId = appId;
      pushConfig.configured = true;

      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'OneSignalSDKWorker.js'
      });

      try {
        await OneSignal.login(session.id);
      } catch {}

      if (forcePrompt) {
        try {
          await OneSignal.Notifications.requestPermission();
        } catch {}
      }

      pushConfig.ready = true;
    });
  } catch (e) {
    console.warn('Push init', e);
  }
}

/* =========================================================
   AYON AI KNOWLEDGE MANAGER
========================================================= */

let ayonKnowledge = [];
let editingAyonKnowledgeId = null;

function ayonToneLabel(v) {
  return String(v || 'Normal');
}

async function loadAyonKnowledge({ quiet = false } = {}) {
  if (!isManager()) return [];

  try {
    if (!quiet) {
      setBusy(true, 'Loading AYON knowledge…');
    }

    const r = await apiPost('aiKnowledge', {});

    if (!r?.ok) {
      throw new Error(r?.error || 'Knowledge load failed');
    }

    ayonKnowledge = Array.isArray(r.data) ? r.data : [];

    try {
      localStorage.setItem(
        'ayon.ai.knowledge.cache',
        JSON.stringify(ayonKnowledge)
      );
    } catch {}

    return ayonKnowledge;

  } catch (x) {
    console.warn(x);

    try {
      ayonKnowledge = JSON.parse(
        localStorage.getItem('ayon.ai.knowledge.cache') || '[]'
      );
    } catch {
      ayonKnowledge = [];
    }

    return ayonKnowledge;

  } finally {
    if (!quiet) setBusy(false);
  }
}

function renderAyonKnowledge() {
  if (!isManager()) {
    page = 'settings';
    return renderSettings();
  }

  const edit = editingAyonKnowledgeId
    ? ayonKnowledge.find(
        x => String(x.id) === String(editingAyonKnowledgeId)
      )
    : null;

  $('#mainContent').innerHTML = `
    ${monthBar()}

    <section class="hero">
      <p class="eyebrow">MANAGER AI CONTROL</p>
      <h3>AYON AI Knowledge Manager</h3>

      <p class="muted">
        Add your own answer/instruction. AYON AI will use active Manager Knowledge
        before ordinary coaching answers.
      </p>

      <div class="form-actions">
        <button id="ayonKbRefresh" class="btn secondary">
          ↻ REFRESH
        </button>

        <button id="ayonKbNew" class="btn primary">
          + NEW KNOWLEDGE
        </button>
      </div>
    </section>

    <div class="card" style="margin-top:12px">
      <form id="ayonKbForm" class="stack">

        <label>
          Question / Keywords
          <input
            name="question"
            required
            value="${esc(edit?.question || '')}"
            placeholder="e.g. buyer order দিতে চায় না"
          >
        </label>

        <label>
          Answer / Instruction
          <textarea
            name="answer"
            required
            placeholder="AYON AI কী উত্তর দেবে লিখুন"
          >${esc(edit?.answer || '')}</textarea>
        </label>

        <div class="form-grid">
          <label>
            Tone
            <select name="tone">
              ${['Normal','Funny','Motivational','Strict-Funny']
                .map(x => `
                  <option
                    value="${x}"
                    ${String(edit?.tone || 'Normal') === x ? 'selected' : ''}
                  >
                    ${x}
                  </option>
                `).join('')}
            </select>
          </label>

          <label>
            Status
            <select name="active">
              <option value="true" ${edit?.active === false ? '' : 'selected'}>
                Active
              </option>

              <option value="false" ${edit?.active === false ? 'selected' : ''}>
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
          : emptyState(
              'No Manager Knowledge',
              'Add the first AYON AI answer above.'
            )
      }
    </div>
  `;

  bindCommon();

  $('#ayonKbRefresh').onclick = async () => {
    await loadAyonKnowledge();
    renderAyonKnowledge();
  };

  $('#ayonKbNew').onclick = () => {
    editingAyonKnowledgeId = null;
    renderAyonKnowledge();
  };

  if ($('#ayonKbCancel')) {
    $('#ayonKbCancel').onclick = () => {
      editingAyonKnowledgeId = null;
      renderAyonKnowledge();
    };
  }

  $('#ayonKbForm').onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.target);

    setBusy(
      true,
      edit
        ? 'Updating AYON knowledge…'
        : 'Saving AYON knowledge…'
    );

    try {
      const r = await apiPost('saveAiKnowledge', {
        id: edit?.id || '',
        question: String(fd.get('question') || '').trim(),
        answer: String(fd.get('answer') || '').trim(),
        tone: String(fd.get('tone') || 'Normal'),
        active: String(fd.get('active')) === 'true'
      });

      if (!r?.ok) {
        throw new Error(r?.error || 'Knowledge save failed');
      }

      editingAyonKnowledgeId = null;

      await loadAyonKnowledge({ quiet: true });

      toast(
        edit
          ? 'AYON knowledge updated'
          : 'AYON learned the new answer'
      );

      renderAyonKnowledge();

    } catch (x) {
      toast(x.message || 'Knowledge save failed', 4000);
    } finally {
      setBusy(false);
    }
  };

  $$('[data-ayonkbedit]').forEach(b => {
    b.onclick = () => {
      editingAyonKnowledgeId = b.dataset.ayonkbedit;
      renderAyonKnowledge();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  $$('[data-ayonkbdelete]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Deactivate this AYON knowledge answer?')) return;

      setBusy(true, 'Deactivating knowledge…');

      try {
        const r = await apiPost('deleteAiKnowledge', {
          id: b.dataset.ayonkbdelete
        });

        if (!r?.ok) throw new Error(r?.error || 'Deactivate failed');

        await loadAyonKnowledge({ quiet: true });

        toast('Knowledge deactivated');
        renderAyonKnowledge();

      } catch (x) {
        toast(x.message, 4000);
      } finally {
        setBusy(false);
      }
    };
  });

  $$('[data-ayonkbrestore]').forEach(b => {
    b.onclick = async () => {
      setBusy(true, 'Restoring knowledge…');

      try {
        const r = await apiPost('restoreAiKnowledge', {
          id: b.dataset.ayonkbrestore
        });

        if (!r?.ok) throw new Error(r?.error || 'Restore failed');

        await loadAyonKnowledge({ quiet: true });

        toast('Knowledge restored');
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
   FINAL V8 — DYNAMIC SR / MANAGER ALL SR
========================================================= */

let v8SRs = [];
let v8Team = null;
let v8Outlets = [];

async function v8LoadManagerData() {
  if (!isManager()) return;

  try {
    const [s, t] = await Promise.all([
      apiPost('activeSRs', {}),
      apiPost('teamDashboard', {
        month: selectedMonth,
        date: selectedDate
      })
    ]);

    if (s?.ok) v8SRs = s.data || [];
    if (t?.ok) v8Team = t.data || null;

  } catch (e) {
    console.warn('V8 manager data', e);
  }
}

function v8SrOptions(includeAll = true, includeManager = true) {
  let h = includeAll
    ? '<option value="ALL">ALL SR — MY TEAM</option>'
    : '';

  if (includeManager) {
    h += `
      <option value="${esc(session.id)}">
        MYSELF — ${esc(sessionName())}
      </option>
    `;
  }

  h += v8SRs.map(x => `
    <option value="${esc(x.staffId)}">
      ${esc(x.name)} • ${esc(x.staffId)}
      ${x.route ? ' • ' + esc(x.route) : ''}
    </option>
  `).join('');

  return h;
}

function v8Kpi(label, value, cls = '') {
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

/* =========================================================
   MANAGER ALL SR DASHBOARD
========================================================= */

function renderManagerTeamDashboard() {
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
        ${members.length} active SR • Delivered sales source of truth
      </p>

      ${syncStatus()}

      <button
        id="v8Refresh"
        class="btn primary"
      >
        ↻ SYNC TEAM NOW
      </button>
    </section>

    <div class="mini-grid" style="margin-top:12px">
      ${v8Kpi('TEAM TARGET', money(x.target))}
      ${v8Kpi('DELIVERED SALES', money(x.achievement), 'good')}
      ${v8Kpi('ACHIEVEMENT', pct(x.percent), x.percent >= 100 ? 'good' : '')}
      ${v8Kpi('SHORTFALL', money(x.shortfall), 'bad')}
      ${v8Kpi('TODAY SALES', money(x.todaySales))}
      ${v8Kpi('PENDING DELIVERY', n(v8Team.pendingOrders), 'bad')}
      ${v8Kpi('COVERAGE', pct(x.coverage))}
      ${v8Kpi('ZERO SALES', n(x.zeroOutlets), 'bad')}
      ${v8Kpi('PENDING CPO', n(v8Team.pendingCpo), 'bad')}
      ${v8Kpi('PENDING TASKS', n(v8Team.pendingTasks), 'bad')}
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
          : emptyState('No active SR found')
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
   DYNAMIC TEAM MANAGEMENT
========================================================= */

function installTeamManagement() {
  if (!isManager()) return '';

  return `
    <div class="card" style="margin-top:12px">
      <p class="eyebrow">
        TEAM MANAGEMENT
      </p>

      <h3>Add / Edit / Activate SR</h3>

      <p class="muted">
        USERS sheet is the source of truth.
        New active SR automatically appears throughout Manager controls.
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
              placeholder="e.g. M22001"
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
                      <h4>${esc(u.name)}</h4>

                      <p>
                        ${esc(u.staffId)}
                        • ${esc(u.route || '')}
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
            : emptyState('Loading active SR…')
        }
      </div>
    </div>
  `;
}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  const ai = isManager()
    ? `
      <div class="card" style="margin-top:12px">
        <p class="eyebrow">
          MANAGER AI CONTROL
        </p>

        <h3>
          AYON AI Knowledge Manager
        </h3>

        <p class="muted">
          Add, edit, deactivate or restore AYON answers without changing code.
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
      <p class="eyebrow">SETTINGS</p>
      <h3>Account & App</h3>

      <p class="muted">
        This phone stays logged in until you press Logout.
      </p>

      ${syncStatus()}
    </section>

    ${ai}

    ${isManager() ? installTeamManagement() : ''}

    <div class="card" style="margin-top:12px">

      <div class="list-item">
        <h4>Signed in</h4>

        <p>
          ${esc(sessionName())}
          • ${esc(session.id)}
          • ${esc(String(session.mode).toUpperCase())}
        </p>
      </div>

      <div class="list-item" style="margin-top:8px">
        <h4>Backend</h4>

        <p>
          ${backendUrl() ? 'Connected' : 'Missing'}
          • Server ${esc(current?.version || '—')}
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
  `;

  bindCommon();

  if ($('#openAyonKnowledge')) {
    $('#openAyonKnowledge').onclick = async () => {
      page = 'aiKnowledge';

      render();

      await loadAyonKnowledge({
        quiet: true
      });

      render();
    };
  }

  if ($('#settingsSync')) {
    $('#settingsSync').onclick = () =>
      refreshCloud(true);
  }

  if ($('#realLogout')) {
    $('#realLogout').onclick = () => {
      if (
        confirm(
          'Log out from Sales Performance Hub?'
        )
      ) {
        logout();
      }
    };
  }

  if (!isManager()) return;

  if (!v8SRs.length) {
    v8LoadManagerData().then(() => {
      if (page === 'settings') {
        renderSettings();
      }
    });
  }

  const userForm = $('#v8UserForm');

  if (userForm) {
    userForm.onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(e.target);

      setBusy(true, 'Saving user…');

      try {
        const r = await apiPost('saveUser', {
          staffId: String(fd.get('staffId') || '').trim(),
          name: String(fd.get('name') || '').trim(),
          route: String(fd.get('route') || '').trim(),
          area: String(fd.get('route') || '').trim(),
          role: String(fd.get('role') || 'SR'),
          password: String(fd.get('password') || ''),
          active: true
        });

        if (!r?.ok) {
          throw new Error(r?.error || 'User save failed');
        }

        await v8LoadManagerData();

        toast('User saved');
        renderSettings();

      } catch (x) {
        toast(x.message || 'User save failed', 4000);
      } finally {
        setBusy(false);
      }
    };
  }

  $$('[data-v8deactivate]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Deactivate this SR?')) return;

      setBusy(true, 'Deactivating SR…');

      try {
        const r = await apiPost('setUserActive', {
          staffId: b.dataset.v8deactivate,
          active: false
        });

        if (!r?.ok) {
          throw new Error(r?.error || 'Deactivate failed');
        }

        await v8LoadManagerData();

        toast('SR deactivated');
        renderSettings();

      } catch (x) {
        toast(x.message || 'Deactivate failed', 4000);
      } finally {
        setBusy(false);
      }
    };
  });
}

/* =========================================================
   TEAM PAGE
========================================================= */

function renderTeam() {
  if (!isManager()) {
    return renderDashboard();
  }

  renderManagerTeamDashboard();
}

/* =========================================================
   MONTH / COMMON CONTROLS
========================================================= */

function monthBar() {
  return `
    <div class="month-bar">
      <input
        id="globalMonth"
        type="month"
        value="${esc(selectedMonth)}"
      >

      <input
        id="globalDate"
        type="date"
        value="${esc(selectedDate)}"
      >

      <button
        id="globalRefresh"
        class="btn secondary"
      >
        ↻
      </button>
    </div>
  `;
}

function syncStatus() {
  return `
    <p class="muted">
      ${
        lastSyncAt
          ? 'Last live sync • ' + esc(lastSyncAt)
          : 'Waiting for live sync'
      }
    </p>
  `;
}

function bindCommon() {
  const m = $('#globalMonth');

  if (m) {
    m.onchange = async () => {
      selectedMonth = m.value || selectedMonth;

      if (isManager()) {
        await Promise.all([
          loadCurrent({ quiet: true }),
          v8LoadManagerData()
        ]);
      } else {
        await loadCurrent({ quiet: true });
      }

      render();
    };
  }

  const d = $('#globalDate');

  if (d) {
    d.onchange = async () => {
      selectedDate = d.value || selectedDate;

      if (isManager()) {
        await Promise.all([
          loadCurrent({ quiet: true }),
          v8LoadManagerData()
        ]);
      } else {
        await loadCurrent({ quiet: true });
      }

      render();
    };
  }

  if ($('#globalRefresh')) {
    $('#globalRefresh').onclick = () =>
      refreshCloud(true);
  }

  $$('[data-go]').forEach(b => {
    b.onclick = () =>
      setPage(b.dataset.go);
  });
}

/* =========================================================
   FINAL ROUTER
========================================================= */

function render() {
  if (!session) return;

  installShell();
  refreshTop();
  bindNav();

  const map = {
    dashboard:
      isManager()
        ? renderManagerTeamDashboard
        : renderDashboard,

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

  const fn =
    map[page] ||
    (
      isManager()
        ? renderManagerTeamDashboard
        : renderDashboard
    );

  fn();

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
        syncing ||
        document.hidden
      ) {
        return;
      }

      try {
        if (isManager()) {
          await Promise.all([
            loadCurrent({ quiet: true }),
            v8LoadManagerData()
          ]);
        } else {
          await loadCurrent({
            quiet: true
          });
        }

        render();

      } catch (e) {
        console.warn('Live sync', e);
      }
    },
    120000
  );
}

/* =========================================================
   PREMIUM LOGIN PANEL
========================================================= */

function installPremiumLogin() {
  const form = $('#loginForm');

  if (!form) return;

  const staff = $('#loginStaff');
  const pin = $('#loginPin');

  if (staff) {
    staff.placeholder =
      'Staff ID or manager';
  }

  if (pin) {
    pin.placeholder =
      'Password / PIN';
  }

  form.onsubmit = async e => {
    e.preventDefault();

    await login(
      staff?.value || '',
      pin?.value || ''
    );
  };
}

/* =========================================================
   BOOT
========================================================= */

async function boot() {
  installPremiumLogin();
  pushHistoryState();

  if (!restoreSession()) {
    $('#appView')?.classList.add('hidden');
    $('#loginView')?.classList.remove('hidden');
    return;
  }

  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.remove('hidden');

  installShell();

  /*
    IMPORTANT:
    Restored session still uses the same saved backend password.
    No password override or local bypass is used.
  */

  if (isManager()) {
    page = 'dashboard';

    render();

    await Promise.all([
      loadCurrent({ quiet: true }),
      v8LoadManagerData()
    ]);
  } else {
    page = 'dashboard';

    render();

    await loadCurrent({
      quiet: true
    });
  }

  initPushSystem();

  startLiveSync();

  render();
}

/* =========================================================
   CONNECTION STATUS
========================================================= */

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
      'Internet disconnected',
      3500
    );
  }
);

/* =========================================================
   START APPLICATION
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  boot
);
