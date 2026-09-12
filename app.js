/* =========================================================
   SALES PERFORMANCE HUB — FINAL CONCEPT BUILD
   Works with current index.html + data.js + styles.css
   NO DEMO DATA — EVERY MONTH STARTS FROM ZERO
========================================================= */

const D = window.APP_DATA || {
  users: [],
  salaryRules: {},
  categoryProducts: {},
  products: [],
  outlets: {}
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const STORAGE_KEY = 'SPH_CONCEPT_FINAL_20260912_V1';
const BACKEND_URL_KEY = 'sph.backendUrl';
const SESSION_KEY = 'sph.session.final';

let session = null;
let page = 'dashboard';
let selectedMonth = new Date().toISOString().slice(0, 7);
let managerView = 'M21954';
let planSelectedSkus = [];


/* =========================================================
   BASIC HELPERS
========================================================= */

function number(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function money(v) {
  return 'RM ' + number(v).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function idGen() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthName(m) {
  const [y, mo] = m.split('-').map(Number);

  return new Date(y, mo - 1, 1).toLocaleDateString('en-MY', {
    month: 'long',
    year: 'numeric'
  });
}

function daysInMonth(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

function remainingDays(m) {

  const now = new Date();

  const [y, mo] = m.split('-').map(Number);

  const end = new Date(y, mo, 0);

  if (
    now.getFullYear() !== y ||
    now.getMonth() + 1 !== mo
  ) {

    if (now > end) return 0;

    return daysInMonth(m);
  }

  return Math.max(
    1,
    end.getDate() - now.getDate() + 1
  );
}

function toast(message) {

  const el = $('#toast');

  if (!el) return;

  el.textContent = message;

  el.classList.add('show');

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2300);
}

function userById(id) {

  return (D.users || []).find(
    u =>
      String(u.id).toUpperCase() ===
      String(id).toUpperCase()
  );
}

function allSalesUsers() {

  return (D.users || []).filter(
    u =>
      u.role === 'SR' ||
      String(u.role).includes('MANAGER')
  );
}

function currentStaffId() {

  if (!session) return '';

  return session.mode === 'manager'
    ? managerView
    : session.id;
}

function fixedRouteTarget(id) {

  const u = userById(id);

  const minimum =
    number(
      D.salaryRules?.minMonthlyTarget || 50000
    );

  return Math.max(
    minimum,
    number(u?.target)
  );
}


/* =========================================================
   STORAGE
========================================================= */

function blankState() {

  return {

    daily: [],

    outletSales: [],

    skuSales: [],

    plans: [],

    incentives: [],

    tasks: [],

    incomePlans: [],

    customOutlets: {},

    lastCloudSync: null
  };
}

function getState() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
      );

    return Object.assign(
      blankState(),
      saved
    );

  } catch (e) {

    return blankState();
  }
}

function setState(st) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(st)
  );
}

function parseJSON(value, fallback) {

  try {

    if (typeof value === 'string') {
      return JSON.parse(value);
    }

    return value ?? fallback;

  } catch {

    return fallback;
  }
}


/* =========================================================
   BACKEND / CLOUD
========================================================= */

function backendUrl() {

  return (
    localStorage.getItem(BACKEND_URL_KEY) || ''
  ).trim();
}

async function apiGet(
  action,
  viewStaffId = currentStaffId(),
  month = selectedMonth
) {

  const base = backendUrl();

  if (!base || !session) return null;

  const qs = new URLSearchParams({

    action,

    staffId: session.id,

    password: session.password,

    viewStaffId,

    month
  });

  const res = await fetch(
    base + '?' + qs.toString(),
    {
      cache: 'no-store'
    }
  );

  return res.json();
}

async function apiPost(action, payload) {

  const base = backendUrl();

  if (!base || !session) return null;

  const res = await fetch(base, {

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
  });

  return res.json();
}

async function safeCloudPost(
  action,
  payload
) {

  if (!backendUrl()) return;

  try {

    const r =
      await apiPost(
        action,
        payload
      );

    if (!r?.ok) {

      throw new Error(
        r?.error ||
        'Cloud save failed'
      );
    }

  } catch (err) {

    console.warn(err);

    toast(
      'Saved on this phone. Cloud sync is not connected yet.'
    );
  }
}

function normalizeSheetDate(v) {

  if (!v) return '';

  if (typeof v === 'string') {
    return v.slice(0, 10);
  }

  try {

    return new Date(v)
      .toISOString()
      .slice(0, 10);

  } catch {

    return '';
  }
}

async function syncCloud(
  staffId = currentStaffId(),
  month = selectedMonth
) {

  if (!backendUrl()) return false;

  try {

    const res =
      await apiGet(
        'bootstrap',
        staffId,
        month
      );

    if (!res?.ok) {

      throw new Error(
        res?.error ||
        'Cloud read failed'
      );
    }

    const d = res.data || {};

    const st = getState();


    if (
      Array.isArray(d.outlets) &&
      d.outlets.length
    ) {

      st.customOutlets[staffId] =
        d.outlets
          .map(x => ({

            code:
              String(
                x['Outlet Code'] || ''
              ),

            name:
              String(
                x['Outlet Name'] || ''
              ),

            category:
              String(
                x.Category || 'Other'
              ),

            totalSku:
              number(
                x['Total SKU']
              )

          }))
          .filter(x => x.name);
    }


    st.daily =
      st.daily.filter(
        x =>
          !(
            x.staffId === staffId &&
            x.month === month
          )
      );

    st.daily.push(
      ...(d.daily || []).map(x => ({

        id: idGen(),

        staffId,

        month:
          String(
            x.Month || month
          ),

        date:
          normalizeSheetDate(
            x.Date
          ),

        todaySales:
          number(
            x['Today Sales']
          ),

        lastMonthSameDay:
          number(
            x['Last Month Same Day']
          ),

        active:
          number(
            x.Active
          ),

        prepareTrip:
          number(
            x['Prepare for Trip']
          ),

        orderAmount:
          number(
            x['Order Amount']
          ),

        note:
          String(
            x.Note || ''
          )

      }))
    );


    st.outletSales =
      st.outletSales.filter(
        x =>
          !(
            x.staffId === staffId &&
            x.month === month
          )
      );

    st.outletSales.push(
      ...(d.outletSales || []).map(x => ({

        id: idGen(),

        staffId,

        month:
          String(
            x.Month || month
          ),

        date:
          normalizeSheetDate(
            x.Date
          ),

        outletCode:
          String(
            x['Outlet Code'] || ''
          ),

        outletName:
          String(
            x['Outlet Name'] || ''
          ),

        sales:
          number(
            x['Sales Value']
          ),

        note:
          String(
            x.Note || ''
          )

      }))
    );


    st.skuSales =
      st.skuSales.filter(
        x =>
          !(
            x.staffId === staffId &&
            x.month === month
          )
      );

    st.skuSales.push(
      ...(d.skuSales || []).map(x => ({

        id: idGen(),

        staffId,

        month:
          String(
            x.Month || month
          ),

        date:
          normalizeSheetDate(
            x.Date
          ),

        outletCode:
          String(
            x['Outlet Code'] || ''
          ),

        outletName:
          String(
            x['Outlet Name'] || ''
          ),

        skuName:
          String(
            x['SKU Name'] || ''
          ),

        cartons:
          number(
            x.Cartons
          ),

        salesValue:
          number(
            x['Sales Value']
          )

      }))
    );


    st.plans =
      st.plans.filter(
        x =>
          !(
            x.staffId === staffId &&
            x.month === month
          )
      );

    st.plans.push(
      ...(d.plans || []).map(x => {

        const raw =
          parseJSON(
            x['Targeted SKU List'],
            []
          );

        const skuTargets = {};

        const targetSkus = [];

        (
          Array.isArray(raw)
            ? raw
            : []
        ).forEach(item => {

          if (
            typeof item === 'string'
          ) {

            targetSkus.push(item);

            skuTargets[item] = {
              cartons: 0,
              value: 0
            };

          } else if (
            item &&
            item.name
          ) {

            targetSkus.push(
              item.name
            );

            skuTargets[item.name] = {

              cartons:
                number(
                  item.cartons
                ),

              value:
                number(
                  item.value
                )
            };
          }
        });

        return {

          id: idGen(),

          staffId,

          month:
            String(
              x.Month || month
            ),

          outletCode:
            String(
              x['Outlet Code'] || ''
            ),

          outletName:
            String(
              x['Outlet Name'] || ''
            ),

          outletTarget:
            number(
              x['Outlet Target']
            ),

          targetSkuCount:
            number(
              x['Targeted SKU Count']
            ) ||
            targetSkus.length,

          targetSkus,

          skuTargets
        };
      })
    );


    st.tasks =
      st.tasks.filter(
        x =>
          x.staffId !== staffId
      );

    st.tasks.push(
      ...(d.tasks || []).map(x => ({

        id:
          String(
            x['Task ID'] ||
            idGen()
          ),

        staffId,

        title:
          String(
            x.Title || ''
          ),

        note:
          String(
            x.Instruction || ''
          ),

        due:
          normalizeSheetDate(
            x['Due Date']
          ),

        done:
          String(
            x.Status || ''
          ).toUpperCase() ===
          'DONE',

        createdAt:
          String(
            x['Created At'] || ''
          )

      }))
    );


    if (
      Array.isArray(d.income) &&
      d.income.length
    ) {

      const x =
        d.income[
          d.income.length - 1
        ];

      st.incomePlans =
        st.incomePlans.filter(
          y =>
            !(
              y.staffId === staffId &&
              y.month === month
            )
        );

      st.incomePlans.push({

        staffId,

        month,

        expected:
          number(
            x['Expected Total Income']
          ),

        growthActual:
          number(
            x['Growth Incentive Target']
          ),

        productManual:
          number(
            x['Product Incentive Target']
          ),

        managerActual:
          number(
            x['Manager Incentive Target']
          ),

        otherActual:
          number(
            x['Other Incentive Target']
          )
      });
    }

    st.lastCloudSync =
      new Date().toISOString();

    setState(st);

    return true;

  } catch (err) {

    console.warn(err);

    toast(
      'Cloud sync unavailable. Local app continues.'
    );

    return false;
  }
}


/* =========================================================
   OUTLET / PRODUCT MASTER
========================================================= */

function outletsFor(staffId) {

  const st = getState();

  const base =
    Array.isArray(
      D.outlets?.[staffId]
    )
      ? D.outlets[staffId]
      : [];

  const custom =
    Array.isArray(
      st.customOutlets?.[staffId]
    )
      ? st.customOutlets[staffId]
      : [];

  const map = new Map();

  [
    ...base,
    ...custom
  ].forEach(o => {

    const key =
      String(
        o.code ||
        o.name ||
        ''
      )
        .trim()
        .toUpperCase();

    if (key) {
      map.set(
        key,
        o
      );
    }
  });

  return [...map.values()]
    .sort(
      (a, b) =>
        String(a.name)
          .localeCompare(
            String(b.name)
          )
    );
}

function productsForOutlet(
  staffId,
  outletName
) {

  const o =
    outletsFor(staffId)
      .find(
        x =>
          x.name === outletName
      );

  const category =
    o?.category ||
    'Other';

  const chain =
    D.categoryProducts?.[
      category
    ];

  return (
    Array.isArray(chain) &&
    chain.length
  )
    ? chain
    : (D.products || []);
}

function outletOptions(
  staffId,
  selected = ''
) {

  const list =
    outletsFor(staffId);

  if (!list.length) {

    return `
      <option value="">
        No outlet master yet — add outlet in Plan
      </option>
    `;
  }

  return (
    '<option value="">Select outlet</option>' +

    list
      .map(o => `

        <option
          value="${esc(o.name)}"
          ${selected === o.name
            ? 'selected'
            : ''}
        >
          ${esc(o.name)}
        </option>

      `)
      .join('')
  );
}

function addCustomOutlet(
  staffId,
  code,
  name,
  category,
  totalSku
) {

  const st = getState();

  if (
    !st.customOutlets[
      staffId
    ]
  ) {

    st.customOutlets[
      staffId
    ] = [];
  }

  const exists =
    outletsFor(staffId)
      .some(
        o =>
          String(o.name)
            .trim()
            .toLowerCase() ===
          String(name)
            .trim()
            .toLowerCase()
      );

  if (exists) {
    return false;
  }

  st.customOutlets[
    staffId
  ].push({

    code:
      String(
        code || ''
      ).trim(),

    name:
      String(
        name || ''
      ).trim(),

    category:
      String(
        category || 'Other'
      ).trim(),

    totalSku:
      number(totalSku)
  });

  setState(st);

  return true;
}


/* =========================================================
   PERFORMANCE CALCULATIONS
========================================================= */

function monthDaily(
  staffId,
  month = selectedMonth
) {

  return getState()
    .daily
    .filter(
      x =>
        x.staffId === staffId &&
        x.month === month
    );
}

function monthOutletSales(
  staffId,
  month = selectedMonth
) {

  return getState()
    .outletSales
    .filter(
      x =>
        x.staffId === staffId &&
        x.month === month
    );
}

function monthSkuSales(
  staffId,
  month = selectedMonth
) {

  return getState()
    .skuSales
    .filter(
      x =>
        x.staffId === staffId &&
        x.month === month
    );
}

function monthPlans(
  staffId,
  month = selectedMonth
) {

  return getState()
    .plans
    .filter(
      x =>
        x.staffId === staffId &&
        x.month === month
    );
}

function routeAchievement(
  staffId,
  month = selectedMonth
) {

  return monthDaily(
    staffId,
    month
  ).reduce(
    (sum, x) =>
      sum +
      number(
        x.todaySales
      ),
    0
  );
}

function previousComparable(
  staffId,
  month = selectedMonth
) {

  return monthDaily(
    staffId,
    month
  ).reduce(
    (sum, x) =>
      sum +
      number(
        x.lastMonthSameDay
      ),
    0
  );
}

function latestField(
  staffId,
  field,
  month = selectedMonth
) {

  const list =
    monthDaily(
      staffId,
      month
    )
      .slice()
      .sort(
        (a, b) =>
          String(a.date)
            .localeCompare(
              String(b.date)
            )
      );

  return list.length
    ? number(
        list[
          list.length - 1
        ][field]
      )
    : 0;
}

function outletAchievement(
  staffId,
  outletName,
  month = selectedMonth
) {

  return monthOutletSales(
    staffId,
    month
  )
    .filter(
      x =>
        x.outletName ===
        outletName
    )
    .reduce(
      (sum, x) =>
        sum +
        number(
          x.sales
        ),
      0
    );
}

function skuAchievement(
  staffId,
  outletName,
  skuName,
  month = selectedMonth
) {

  const list =
    monthSkuSales(
      staffId,
      month
    )
      .filter(
        x =>
          x.outletName ===
            outletName &&
          x.skuName ===
            skuName
      );

  return {

    cartons:
      list.reduce(
        (sum, x) =>
          sum +
          number(
            x.cartons
          ),
        0
      ),

    value:
      list.reduce(
        (sum, x) =>
          sum +
          number(
            x.salesValue
          ),
        0
      )
  };
}

function skuTotalAcrossRoute(
  staffId,
  skuName,
  month = selectedMonth
) {

  const list =
    monthSkuSales(
      staffId,
      month
    )
      .filter(
        x =>
          x.skuName ===
          skuName
      );

  return {

    cartons:
      list.reduce(
        (sum, x) =>
          sum +
          number(
            x.cartons
          ),
        0
      ),

    value:
      list.reduce(
        (sum, x) =>
          sum +
          number(
            x.salesValue
          ),
        0
      )
  };
}

function performance(
  staffId,
  month = selectedMonth
) {

  const target =
    fixedRouteTarget(
      staffId
    );

  const achievement =
    routeAchievement(
      staffId,
      month
    );

  const shortfall =
    Math.max(
      0,
      target - achievement
    );

  const previous =
    previousComparable(
      staffId,
      month
    );

  const growth =
    previous > 0
      ? (
          (
            achievement -
            previous
          ) /
          previous
        ) * 100
      : 0;

  const days =
    remainingDays(
      month
    );

  const requiredPerDay =
    days > 0
      ? shortfall / days
      : shortfall;

  const dailyTarget =
    target /
    daysInMonth(month);

  const todaySales =
    monthDaily(
      staffId,
      month
    )
      .filter(
        x =>
          x.date ===
          todayISO()
      )
      .reduce(
        (sum, x) =>
          sum +
          number(
            x.todaySales
          ),
        0
      );

  const routeOutlets =
    outletsFor(
      staffId
    );

  const outletSales =
    monthOutletSales(
      staffId,
      month
    );

  const coveredKeys =
    new Set(

      outletSales

        .filter(
          x =>
            number(
              x.sales
            ) > 0
        )

        .map(
          x =>
            String(
              x.outletCode ||
              x.outletName
            )
              .trim()
              .toUpperCase()
        )
    );

  const covered =
    routeOutlets
      .filter(
        o =>
          coveredKeys.has(
            String(
              o.code ||
              o.name
            )
              .trim()
              .toUpperCase()
          )
      );

  const zeroSales =
    routeOutlets
      .filter(
        o =>
          !coveredKeys.has(
            String(
              o.code ||
              o.name
            )
              .trim()
              .toUpperCase()
          )
      );

  const coverage =
    routeOutlets.length
      ? (
          covered.length /
          routeOutlets.length
        ) * 100
      : 0;

  return {

    target,

    achievement,

    shortfall,

    previous,

    growth,

    requiredPerDay,

    dailyTarget,

    todaySales,

    active:
      latestField(
        staffId,
        'active',
        month
      ),

    prepareTrip:
      latestField(
        staffId,
        'prepareTrip',
        month
      ),

    orderAmount:
      latestField(
        staffId,
        'orderAmount',
        month
      ),

    routeOutlets,

    covered,

    zeroSales,

    coverage
  };
}


/* =========================================================
   SALARY / INCENTIVE
========================================================= */

function commissionAmount(
  sales,
  target
) {

  const pct =
    target > 0
      ? sales / target
      : 0;

  if (pct < 0.8) {

    return (
      sales *
      0.005
    );
  }

  if (pct <= 1) {

    return (
      sales *
      0.01
    );
  }

  return (
    target * 0.01
  ) + (
    sales - target
  ) * 0.02;
}

function incomePlan(
  staffId,
  month = selectedMonth
) {

  return (
    getState()
      .incomePlans
      .find(
        x =>
          x.staffId === staffId &&
          x.month === month
      )
  ) || {

    staffId,

    month,

    expected: 0,

    growthActual: 0,

    productManual: 0,

    managerActual: 0,

    otherActual: 0
  };
}

function productIncentives(
  staffId,
  month = selectedMonth
) {

  return getState()
    .incentives
    .filter(
      x =>
        x.staffId === staffId &&
        x.month === month &&
        x.type === 'PRODUCT'
    );
}

function productIncentiveUnlocked(
  staffId,
  month = selectedMonth
) {

  return productIncentives(
    staffId,
    month
  )
    .reduce(
      (sum, inc) => {

        const sold =
          skuTotalAcrossRoute(
            staffId,
            inc.skuName,
            month
          ).cartons;

        return sum +
          (
            sold >=
            number(
              inc.targetQty
            )
              ? number(
                  inc.reward
                )
              : 0
          );
      },
      0
    );
}

function salary(
  staffId,
  month = selectedMonth
) {

  const r =
    D.salaryRules || {};

  const p =
    performance(
      staffId,
      month
    );

  const plan =
    incomePlan(
      staffId,
      month
    );

  const basic =
    number(
      r.basic || 1700
    );

  const fuel =
    number(
      r.fuel || 300
    );

  const rent =
    number(
      r.houseRent || 250
    );

  const food =
    p.achievement >=
      number(
        r.foodThreshold || 50000
      )
      ? number(
          r.foodHigh || 250
        )
      : number(
          r.foodLow || 100
        );

  let zeroSales = 0;

  if (
    p.routeOutlets.length > 0 &&
    p.zeroSales.length === 0
  ) {

    zeroSales =
      (
        p.achievement /
        p.target
      ) >= 0.8

        ? number(
            r.zeroSalesHigh || 200
          )

        : number(
            r.zeroSalesLow || 100
          );
  }

  const commission =
    commissionAmount(
      p.achievement,
      p.target
    );

  const product =
    productIncentiveUnlocked(
      staffId,
      month
    ) +
    number(
      plan.productManual
    );

  const growth =
    number(
      plan.growthActual
    );

  const manager =
    number(
      plan.managerActual
    );

  const other =
    number(
      plan.otherActual
    );

  const total =
    basic +
    fuel +
    rent +
    food +
    zeroSales +
    commission +
    product +
    growth +
    manager +
    other;

  return {

    basic,

    fuel,

    rent,

    food,

    zeroSales,

    commission,

    product,

    growth,

    manager,

    other,

    total,

    expected:
      number(
        plan.expected
      )
  };
}


/* =========================================================
   SMART ALERTS
========================================================= */

function smartAlerts(
  staffId,
  month = selectedMonth
) {

  const st = getState();

  const p =
    performance(
      staffId,
      month
    );

  const alerts = [];


  if (
    p.shortfall > 0
  ) {

    alerts.push({

      bad: true,

      text:
        `Route shortfall ${money(p.shortfall)}. ` +
        `Required around ${money(p.requiredPerDay)} per remaining day.`
    });

  } else {

    alerts.push({

      bad: false,

      text:
        'Monthly route target achieved. Keep outlet coverage at 100%.'
    });
  }


  if (
    p.zeroSales.length
  ) {

    alerts.push({

      bad: true,

      text:
        `${p.zeroSales.length} outlet(s) still have zero sales this month.`
    });
  }


  monthPlans(
    staffId,
    month
  ).forEach(plan => {

    const actual =
      outletAchievement(
        staffId,
        plan.outletName,
        month
      );

    const short =
      Math.max(
        0,
        number(
          plan.outletTarget
        ) - actual
      );

    if (
      short > 0
    ) {

      alerts.push({

        bad: true,

        text:
          `${plan.outletName}: ${money(short)} outlet shortfall remains.`
      });
    }


    (
      plan.targetSkus || []
    ).forEach(sku => {

      const target =
        plan.skuTargets?.[
          sku
        ] || {
          cartons: 0,
          value: 0
        };

      const actualSku =
        skuAchievement(
          staffId,
          plan.outletName,
          sku,
          month
        );

      const ctnLeft =
        Math.max(
          0,
          number(
            target.cartons
          ) -
          actualSku.cartons
        );

      const valueLeft =
        Math.max(
          0,
          number(
            target.value
          ) -
          actualSku.value
        );

      if (
        ctnLeft > 0
      ) {

        alerts.push({

          bad: true,

          text:
            `${plan.outletName} • ${sku}: ${ctnLeft} CTN remaining.`
        });

      } else if (
        valueLeft > 0
      ) {

        alerts.push({

          bad: true,

          text:
            `${plan.outletName} • ${sku}: ${money(valueLeft)} value remaining.`
        });
      }
    });
  });


  productIncentives(
    staffId,
    month
  ).forEach(inc => {

    const sold =
      skuTotalAcrossRoute(
        staffId,
        inc.skuName,
        month
      ).cartons;

    const left =
      Math.max(
        0,
        number(
          inc.targetQty
        ) - sold
      );

    if (
      left > 0
    ) {

      alerts.push({

        bad: true,

        text:
          `আর মাত্র ${left} CTN ${inc.skuName} লাগবে — ${money(inc.reward)} incentive unlock হবে.`
      });

    } else {

      alerts.push({

        bad: false,

        text:
          `${inc.skuName}: ${money(inc.reward)} product incentive unlocked.`
      });
    }
  });


  st.tasks

    .filter(
      t =>
        t.staffId === staffId &&
        !t.done
    )

    .forEach(t => {

      alerts.push({

        bad: true,

        text:
          `Manager task: ${t.title}` +
          (
            t.due
              ? ' • Due ' + t.due
              : ''
          )
      });
    });


  return alerts.slice(
    0,
    12
  );
}

async function pushBrowserAlert() {

  if (
    !(
      'Notification'
      in window
    )
  ) {

    toast(
      'Browser notification is not supported on this device.'
    );

    return;
  }

  if (
    Notification.permission ===
    'default'
  ) {

    try {

      await Notification
        .requestPermission();

    } catch {}
  }

  if (
    Notification.permission !==
    'granted'
  ) {

    toast(
      'Notification permission is not enabled.'
    );

    return;
  }

  const a =
    smartAlerts(
      currentStaffId()
    )
      .find(
        x =>
          x.bad
      );

  new Notification(
    'Sales Performance Hub',
    {
      body:
        a
          ? a.text
          : 'No urgent sales alert right now.'
    }
  );
}


/* =========================================================
   AUTHENTICATION
========================================================= */

async function login(
  username,
  password
) {

  const rawUser =
    String(
      username || ''
    ).trim();

  const rawPass =
    String(
      password || ''
    )
      .trim()
      .toUpperCase();

  const managerLogin =
    rawUser
      .toLowerCase() ===
    'manager';

  const staffId =
    managerLogin
      ? 'M21954'
      : rawUser
          .toUpperCase();

  const u =
    userById(
      staffId
    );


  /*
    FINAL LOGIN:

    MANAGER
    Username: manager
    Password: M21954

    AYON SR
    Username: M21954
    Password: M21954

    EMON
    M22075 / M22075

    LIMON
    M22268 / M22268

    MUNNAF
    M22328 / M22328
  */

  if (
    !u ||
    rawPass !== staffId
  ) {

    toast(
      'Wrong Staff ID / Password'
    );

    return;
  }


  if (
    managerLogin &&
    !String(
      u.role
    ).includes(
      'MANAGER'
    )
  ) {

    toast(
      'Manager access not allowed'
    );

    return;
  }


  session = {

    ...u,

    password:
      staffId,

    mode:
      managerLogin
        ? 'manager'
        : 'sr'
  };


  managerView =
    'M21954';


  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );


  openApp();


  if (
    backendUrl()
  ) {

    await syncCloud(
      currentStaffId(),
      selectedMonth
    );

    render();
  }
}

function openApp() {

  $('#loginView')
    ?.classList
    .add('hidden');

  $('#appView')
    ?.classList
    .remove('hidden');

  refreshTopBar();

  render();
}

function refreshTopBar() {

  if (!session) return;

  const target =
    userById(
      currentStaffId()
    );


  if (
    $('#welcomeName')
  ) {

    $('#welcomeName')
      .textContent =
        session.mode ===
        'manager'

          ? 'Team Control Center'

          : session.name;
  }


  if (
    $('#roleLabel')
  ) {

    $('#roleLabel')
      .textContent =
        session.mode ===
        'manager'

          ? 'MANAGER ACCESS • M21954'

          : `SALES REPRESENTATIVE • ${session.id}`;
  }


  if (
    session.mode ===
      'manager' &&
    target &&
    $('#welcomeName')
  ) {

    $('#welcomeName')
      .textContent =
        `Manager • ${target.name}`;
  }
}

function logout() {

  sessionStorage
    .removeItem(
      SESSION_KEY
    );

  session = null;

  page =
    'dashboard';

  $('#appView')
    ?.classList
    .add('hidden');

  $('#loginView')
    ?.classList
    .remove('hidden');

  if (
    $('#loginPin')
  ) {

    $('#loginPin').value =
      '';
  }
}


/* =========================================================
   COMMON BAR
========================================================= */

function monthAndModeBar() {

  return `

    <div class="monthbar">

      <label
        style="
          margin:0;
          flex:1;
          min-width:150px
        "
      >

        View month

        <input
          id="monthPick"
          type="month"
          value="${selectedMonth}"
        >

      </label>


      ${
        session?.role
          ?.includes(
            'MANAGER'
          )

          ? `

            <div
              class="mode-toggle"
              style="
                flex:1;
                min-width:190px
              "
            >

              <button
                id="srMode"
                class="${
                  session.mode ===
                  'sr'
                    ? 'active'
                    : ''
                }"
              >
                My SR
              </button>

              <button
                id="mgrMode"
                class="${
                  session.mode ===
                  'manager'
                    ? 'active'
                    : ''
                }"
              >
                Manager
              </button>

            </div>

          `

          : ''
      }

    </div>


    ${
      session?.mode ===
      'manager'

        ? `

          <div
            class="card"
            style="margin-bottom:12px"
          >

            <label>

              Viewing Sales Representative

              <select
                id="managerPick"
              >

                ${
                  allSalesUsers()
                    .map(
                      u => `

                        <option
                          value="${u.id}"
                          ${
                            currentStaffId() ===
                            u.id
                              ? 'selected'
                              : ''
                          }
                        >

                          ${esc(u.name)}
                          •
                          ${u.id}

                        </option>

                      `
                    )
                    .join('')
                }

              </select>

            </label>

          </div>

        `

        : ''
    }
  `;
}

function bindCommon() {

  const monthPick =
    $('#monthPick');

  if (
    monthPick
  ) {

    monthPick.onchange =
      async e => {

        selectedMonth =
          e.target.value;

        if (
          backendUrl()
        ) {

          await syncCloud(
            currentStaffId(),
            selectedMonth
          );
        }

        render();
      };
  }


  const srMode =
    $('#srMode');

  if (
    srMode
  ) {

    srMode.onclick =
      () => {

        session.mode =
          'sr';

        managerView =
          session.id;

        refreshTopBar();

        page =
          'dashboard';

        render();
      };
  }


  const mgrMode =
    $('#mgrMode');

  if (
    mgrMode
  ) {

    mgrMode.onclick =
      () => {

        session.mode =
          'manager';

        managerView =
          'M21954';

        refreshTopBar();

        page =
          'team';

        render();
      };
  }


  const managerPick =
    $('#managerPick');

  if (
    managerPick
  ) {

    managerPick.onchange =
      async e => {

        managerView =
          e.target.value;

        refreshTopBar();

        if (
          backendUrl()
        ) {

          await syncCloud(
            currentStaffId(),
            selectedMonth
          );
        }

        render();
      };
  }


  $$('[data-go]')
    .forEach(
      btn => {

        btn.onclick =
          () => {

            page =
              btn.dataset.go;

            render();
          };
      }
    );
}

function render() {

  if (!session) return;


  $$('#bottomNav button[data-page]')
    .forEach(
      b => {

        const activePage =
          [
            'tasks',
            'zero',
            'sku',
            'team'
          ].includes(page)

            ? 'dashboard'

            : page;

        b.classList.toggle(
          'active',
          b.dataset.page ===
            activePage
        );
      }
    );


  const pages = {

    dashboard:
      renderDashboard,

    daily:
      renderDaily,

    planning:
      renderPlanning,

    income:
      renderIncome,

    summary:
      renderSummary,

    tasks:
      renderTasks,

    zero:
      renderZeroSales,

    sku:
      renderSkuPerformance,

    team:
      renderTeamControl
  };


  (
    pages[page] ||
    renderDashboard
  )();
}


/* =========================================================
   PAGE 1 — DASHBOARD
========================================================= */

function renderDashboard() {

  const id =
    currentStaffId();

  const u =
    userById(id);

  const p =
    performance(id);

  const pct =
    p.target
      ? Math.min(
          100,
          (
            p.achievement /
            p.target
          ) * 100
        )
      : 0;

  const alerts =
    smartAlerts(id);


  $('#mainContent').innerHTML = `

    ${monthAndModeBar()}


    <section class="hero">

      <p class="eyebrow">

        ${monthName(selectedMonth).toUpperCase()}

      </p>

      <h3>

        ${esc(u?.name || id)}
        Performance

      </h3>

      <p class="muted">

        ${money(p.achievement)}
        achieved from
        ${money(p.target)}
        target.

        ${
          p.shortfall > 0

            ? `${money(p.shortfall)} remaining.`

            : 'Target achieved.'
        }

      </p>

      <div class="progress-wrap">

        <div
          class="progress ${
            pct >= 100
              ? 'goodbar'
              : ''
          }"
          style="
            width:${pct}%
          "
        >
        </div>

      </div>


      <div
        class="row"
        style="margin-top:8px"
      >

        <small class="muted">

          ${money(p.achievement)}
          achieved

        </small>

        <strong>

          ${
            (
              p.target
                ? (
                    p.achievement /
                    p.target *
                    100
                  )
                : 0
            ).toFixed(1)
          }%

        </strong>

      </div>

    </section>


    <div class="grid kpi-grid">

      ${kpi(
        'MONTH TARGET',
        money(p.target),
        'Fixed route target'
      )}

      ${kpi(
        'MTD ACHIEVEMENT',
        money(p.achievement),
        'Daily updates combined',
        p.achievement >= p.target
          ? 'good'
          : ''
      )}

      ${kpi(
        'SHORTFALL',
        money(p.shortfall),
        'Remaining to target',
        p.shortfall > 0
          ? 'bad'
          : 'good'
      )}

      ${kpi(
        'REQUIRED / DAY',
        money(p.requiredPerDay),
        `${remainingDays(selectedMonth)} day(s) remaining`,
        p.shortfall > 0
          ? 'warn'
          : 'good'
      )}

      ${kpi(
        'DAILY TARGET',
        money(p.dailyTarget),
        'Average monthly target'
      )}

      ${kpi(
        'TODAY SALES',
        money(p.todaySales),
        'Today entered amount'
      )}

      ${kpi(
        'VS LAST MONTH',
        `${
          p.growth >= 0
            ? '+'
            : ''
        }${p.growth.toFixed(1)}%`,
        `Comparable: ${money(p.previous)}`,
        p.growth >= 0
          ? 'good'
          : 'bad'
      )}

      ${kpi(
        'ZERO SALES COVER',
        `${p.coverage.toFixed(0)}%`,
        `${p.covered.length}/${p.routeOutlets.length} outlets`,
        p.coverage >= 100
          ? 'good'
          : 'bad'
      )}

      ${kpi(
        'ACTIVE',
        money(p.active),
        'Latest entered value'
      )}

      ${kpi(
        'PREPARE FOR TRIP',
        money(p.prepareTrip),
        'Latest entered value'
      )}

      ${kpi(
        'ORDER AMOUNT',
        money(p.orderAmount),
        'Latest entered value'
      )}

      ${kpi(
        'PROJECTED INCOME',
        money(
          salary(id).total
        ),
        'Salary + current incentives'
      )}

    </div>


    <div class="section-title">

      <h3>
        Quick Actions
      </h3>

    </div>


    <div class="mini-grid">

      <button
        class="btn secondary"
        data-go="zero"
      >
        Zero Sales Outlets
      </button>

      <button
        class="btn secondary"
        data-go="sku"
      >
        SKU Performance
      </button>

      <button
        class="btn secondary"
        data-go="tasks"
      >
        My Tasks
      </button>

      ${
        session.mode ===
        'manager'

          ? `

            <button
              class="btn secondary"
              data-go="team"
            >
              Team Control
            </button>

          `

          : `

            <button
              class="btn secondary"
              data-go="planning"
            >
              Monthly Plan
            </button>

          `
      }

    </div>


    <div class="section-title">

      <h3>
        Smart Push
      </h3>

    </div>


    <div class="card">

      ${
        alerts.length

          ? alerts
              .map(
                a => `

                  <div
                    class="
                      alert-card
                      ${
                        a.bad
                          ? ''
                          : 'goodalert'
                      }
                    "
                  >
                    ${esc(a.text)}
                  </div>

                `
              )
              .join('')

          : `

            <div class="empty">
              No alert yet.
            </div>

          `
      }


      <button
        id="phoneNotifyBtn"
        class="btn secondary"
        style="margin-top:8px"
      >
        Enable / Test Phone Notification
      </button>

    </div>
  `;


  bindCommon();


  $('#phoneNotifyBtn')
    .onclick =
      pushBrowserAlert;
}

function kpi(
  label,
  value,
  sub,
  cls = ''
) {

  return `

    <div class="kpi">

      <div class="label">

        ${esc(label)}

      </div>

      <div
        class="value ${cls}"
      >

        ${esc(value)}

      </div>

      <div class="sub">

        ${esc(sub)}

      </div>

    </div>
  `;
}


/* =========================================================
   PAGE 2 — DAILY UPDATE
========================================================= */

function renderDaily() {

  if (
    session.mode ===
    'manager'
  ) {

    $('#mainContent')
      .innerHTML = `

        ${monthAndModeBar()}

        <div class="card">

          <p class="eyebrow">
            MANAGER MODE
          </p>

          <h2>
            Entry is locked
          </h2>

          <p class="muted">

            Switch to
            <b>My SR</b>
            to enter your own daily sales.

            Manager mode is for reviewing the team.

          </p>

        </div>
      `;

    bindCommon();

    return;
  }


  const id =
    currentStaffId();


  const recent =
    monthDaily(id)

      .slice()

      .sort(
        (a, b) =>
          b.date
            .localeCompare(
              a.date
            )
      )

      .slice(
        0,
        10
      );


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="card">

        <p class="eyebrow">
          DAY-BY-DAY ROUTE TRACKER
        </p>

        <h2>
          Daily Summary
        </h2>

        <p class="muted">

          Every new month starts from zero.

          Add only that month's real data.

        </p>


        <form
          id="dailyForm"
          class="stack"
        >

          <label>

            Date

            <input
              name="date"
              type="date"
              value="${todayISO()}"
              required
            >

          </label>


          <label>

            Today Sales (RM)

            <input
              name="todaySales"
              type="number"
              min="0"
              step="0.01"
              value="0"
              required
            >

          </label>


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

            Prepare for Trip (RM)

            <input
              name="prepareTrip"
              type="number"
              min="0"
              step="0.01"
              value="0"
            >

          </label>


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

            <textarea
              name="note"
              placeholder="Optional note"
            ></textarea>

          </label>


          <button
            class="btn primary"
          >

            Save Daily Summary

          </button>

        </form>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <p class="eyebrow">
          OUTLET SALES
        </p>

        <h2>
          Outlet Update
        </h2>


        <form
          id="outletSaleForm"
          class="stack"
        >

          <label>

            Date

            <input
              name="date"
              type="date"
              value="${todayISO()}"
              required
            >

          </label>


          <label>

            Outlet

            <select
              name="outlet"
              required
            >

              ${outletOptions(id)}

            </select>

          </label>


          <label>

            Outlet Sales Value (RM)

            <input
              name="sales"
              type="number"
              min="0"
              step="0.01"
              value="0"
              required
            >

          </label>


          <label>

            Note

            <textarea
              name="note"
              placeholder="Optional"
            ></textarea>

          </label>


          <button
            class="btn primary"
          >

            Save Outlet Sales

          </button>

        </form>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <p class="eyebrow">
          SKU SALES
        </p>

        <h2>
          Product / Carton Update
        </h2>


        <form
          id="skuSaleForm"
          class="stack"
        >

          <label>

            Date

            <input
              name="date"
              type="date"
              value="${todayISO()}"
              required
            >

          </label>


          <label>

            Outlet

            <select
              name="outlet"
              id="skuOutlet"
              required
            >

              ${outletOptions(id)}

            </select>

          </label>


          <label>

            Search SKU

            <input
              id="skuSearch"
              placeholder="Type mango, noodles, biscuit..."
            >

          </label>


          <div
            id="skuResults"
            class="search-results"
          >
          </div>


          <label>

            Selected SKU

            <input
              name="skuName"
              id="skuChosen"
              readonly
              required
              placeholder="Select from search result"
            >

          </label>


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
              name="salesValue"
              type="number"
              min="0"
              step="0.01"
              value="0"
            >

          </label>


          <button
            class="btn primary"
          >

            Save SKU Sales

          </button>

        </form>

      </div>


      <div class="section-title">

        <h3>
          Recent Daily Records
        </h3>

      </div>


      <div class="list">

        ${
          recent.length

            ? recent
                .map(
                  x => `

                    <div class="list-item">

                      <div class="row">

                        <div>

                          <h4>
                            ${esc(x.date)}
                          </h4>

                          <p>

                            Today
                            ${money(x.todaySales)}

                            •

                            Last Month
                            ${money(x.lastMonthSameDay)}

                          </p>

                        </div>

                        <span class="pill orange">

                          ${money(x.orderAmount)}

                        </span>

                      </div>

                    </div>

                  `
                )
                .join('')

            : `

              <div class="empty">
                No daily entry for this month yet.
              </div>

            `
        }

      </div>
    `;


  bindCommon();


  $('#dailyForm')
    .onsubmit = e => {

      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const date =
        String(
          fd.get('date')
        );

      const month =
        date.slice(
          0,
          7
        );

      const st2 =
        getState();


      st2.daily =
        st2.daily.filter(
          x =>
            !(
              x.staffId === id &&
              x.date === date
            )
        );


      const record = {

        id:
          idGen(),

        staffId:
          id,

        month,

        date,

        todaySales:
          number(
            fd.get(
              'todaySales'
            )
          ),

        lastMonthSameDay:
          number(
            fd.get(
              'lastMonthSameDay'
            )
          ),

        active:
          number(
            fd.get(
              'active'
            )
          ),

        prepareTrip:
          number(
            fd.get(
              'prepareTrip'
            )
          ),

        orderAmount:
          number(
            fd.get(
              'orderAmount'
            )
          ),

        note:
          String(
            fd.get(
              'note'
            ) || ''
          )
      };


      st2.daily.push(
        record
      );

      setState(st2);


      safeCloudPost(
        'saveDaily',
        record
      );


      toast(
        'Daily summary saved'
      );


      selectedMonth =
        month;


      render();
    };


  $('#outletSaleForm')
    .onsubmit = e => {

      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const outletName =
        String(
          fd.get(
            'outlet'
          )
        );

      const o =
        outletsFor(id)
          .find(
            x =>
              x.name ===
              outletName
          ) || {};

      const date =
        String(
          fd.get(
            'date'
          )
        );


      const record = {

        id:
          idGen(),

        staffId:
          id,

        month:
          date.slice(
            0,
            7
          ),

        date,

        outletCode:
          o.code || '',

        outletName,

        sales:
          number(
            fd.get(
              'sales'
            )
          ),

        note:
          String(
            fd.get(
              'note'
            ) || ''
          )
      };


      const st2 =
        getState();

      st2.outletSales
        .push(
          record
        );

      setState(st2);


      safeCloudPost(
        'saveOutlet',
        record
      );


      toast(
        'Outlet sales saved'
      );


      selectedMonth =
        record.month;


      render();
    };


  const skuOutlet =
    $('#skuOutlet');

  const skuSearch =
    $('#skuSearch');

  const skuResults =
    $('#skuResults');

  const skuChosen =
    $('#skuChosen');


  function paintSkuSearch() {

    const outletName =
      skuOutlet.value;

    const q =
      skuSearch.value
        .trim()
        .toLowerCase();


    if (
      !outletName ||
      !q
    ) {

      skuResults
        .innerHTML = '';

      return;
    }


    const list =
      productsForOutlet(
        id,
        outletName
      )
        .filter(
          x =>
            x
              .toLowerCase()
              .includes(q)
        )
        .slice(
          0,
          35
        );


    skuResults
      .innerHTML =
        list.length

          ? list
              .map(
                x => `

                  <div
                    class="search-result"
                    data-sku="${esc(x)}"
                  >

                    ${esc(x)}

                  </div>

                `
              )
              .join('')

          : `

            <div class="search-result">
              No product found
            </div>

          `;
  }


  skuSearch.oninput =
    paintSkuSearch;


  skuOutlet.onchange =
    () => {

      skuSearch.value =
        '';

      skuChosen.value =
        '';

      skuResults
        .innerHTML = '';
    };


  skuResults.onclick =
    e => {

      const el =
        e.target
          .closest(
            '[data-sku]'
          );

      if (!el) return;


      skuChosen.value =
        el.dataset.sku;

      skuSearch.value =
        el.dataset.sku;

      skuResults
        .innerHTML = '';
    };


  $('#skuSaleForm')
    .onsubmit = e => {

      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const outletName =
        String(
          fd.get(
            'outlet'
          )
        );

      const o =
        outletsFor(id)
          .find(
            x =>
              x.name ===
              outletName
          ) || {};

      const date =
        String(
          fd.get(
            'date'
          )
        );

      const skuName =
        String(
          fd.get(
            'skuName'
          ) || ''
        ).trim();


      if (!skuName) {

        toast(
          'Select a SKU first'
        );

        return;
      }


      const record = {

        id:
          idGen(),

        staffId:
          id,

        month:
          date.slice(
            0,
            7
          ),

        date,

        outletCode:
          o.code || '',

        outletName,

        skuName,

        cartons:
          number(
            fd.get(
              'cartons'
            )
          ),

        salesValue:
          number(
            fd.get(
              'salesValue'
            )
          )
      };


      const st2 =
        getState();

      st2.skuSales
        .push(
          record
        );

      setState(st2);


      safeCloudPost(
        'saveSku',
        record
      );


      toast(
        'SKU sales saved'
      );


      selectedMonth =
        record.month;


      render();
    };
}


/* =========================================================
   PAGE 3 — MONTHLY / OUTLET / SKU PLAN
========================================================= */

function renderPlanning() {

  if (
    session.mode ===
    'manager'
  ) {

    $('#mainContent')
      .innerHTML = `

        ${monthAndModeBar()}

        <div class="card">

          <p class="eyebrow">
            MANAGER REVIEW
          </p>

          <h2>

            ${esc(
              userById(
                currentStaffId()
              )?.name || ''
            )}

            Planning

          </h2>

          ${planningPerformanceHtml(
            currentStaffId()
          )}

        </div>
      `;


    bindCommon();

    return;
  }


  const id =
    currentStaffId();


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="card">

        <p class="eyebrow">
          FIXED MONTHLY TARGET
        </p>

        <h2>

          ${money(
            fixedRouteTarget(id)
          )}

        </h2>

        <p class="muted">

          This route target is fixed for

          ${esc(
            userById(id)?.name ||
            id
          )}.

          Monthly transactional data starts from zero.

        </p>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <p class="eyebrow">
          ADD ROUTE OUTLET
        </p>

        <h3>
          Only use this if your outlet is missing
        </h3>


        <form
          id="addOutletForm"
          class="stack"
        >

          <label>

            Outlet Code

            <input
              name="code"
              placeholder="Optional code"
            >

          </label>


          <label>

            Outlet Name

            <input
              name="name"
              required
              placeholder="Outlet name"
            >

          </label>


          <label>

            Chain / Category

            <select
              name="category"
            >

              ${
                [
                  'KK Supermart',
                  'NSK Grocer',
                  'Giant Hypermarket',
                  'The Store',
                  'TF Value Mart',
                  'Aneka',
                  'Jaya Grocer',
                  'Econsave',
                  'MR DIY',
                  'Other'
                ]
                  .map(
                    x =>
                      `<option>${x}</option>`
                  )
                  .join('')
              }

            </select>

          </label>


          <label>

            Total Listed SKU

            <input
              name="totalSku"
              type="number"
              min="0"
              step="1"
              value="0"
            >

          </label>


          <button
            class="btn secondary"
          >
            Add Outlet
          </button>

        </form>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <p class="eyebrow">
          OUTLET + SKU TARGET
        </p>

        <h2>
          Monthly Planning
        </h2>


        <form
          id="planForm"
          class="stack"
        >

          <label>

            Outlet

            <select
              name="outlet"
              id="planOutlet"
              required
            >

              ${outletOptions(id)}

            </select>

          </label>


          <label>

            Outlet Sales Target (RM)

            <input
              name="outletTarget"
              type="number"
              min="0"
              step="0.01"
              required
              value="0"
            >

          </label>


          <label>

            How many SKUs will you target?

            <input
              name="targetSkuCount"
              id="targetSkuCount"
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
              placeholder="Search product name"
            >

          </label>


          <div
            id="planSkuResults"
            class="search-results"
          >
          </div>


          <div
            id="chosenSkus"
            class="chipbox"
          >
          </div>


          <div
            id="skuTargetInputs"
            class="list"
          >
          </div>


          <button
            class="btn primary"
          >
            Save Outlet & SKU Plan
          </button>

        </form>

      </div>


      <div class="section-title">

        <h3>
          Plan vs Achievement
        </h3>

      </div>


      ${planningPerformanceHtml(id)}
    `;


  bindCommon();


  planSelectedSkus =
    [];


  $('#addOutletForm')
    .onsubmit = e => {

      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const ok =
        addCustomOutlet(

          id,

          fd.get('code'),

          fd.get('name'),

          fd.get('category'),

          fd.get('totalSku')
        );


      toast(
        ok
          ? 'Outlet added to route'
          : 'Outlet already exists'
      );


      render();
    };


  const outletEl =
    $('#planOutlet');

  const q =
    $('#planSkuSearch');

  const results =
    $('#planSkuResults');

  const chips =
    $('#chosenSkus');

  const targetInputs =
    $('#skuTargetInputs');


  function paintSelected() {

    const oldTargets = {};

    planSelectedSkus
      .forEach(
        sku => {

          const c =
            document.querySelector(
              `[data-cartons-for="${cssEscape(sku)}"]`
            );

          const v =
            document.querySelector(
              `[data-value-for="${cssEscape(sku)}"]`
            );

          oldTargets[sku] = {

            cartons:
              number(
                c?.value
              ),

            value:
              number(
                v?.value
              )
          };
        }
      );


    chips.innerHTML =
      planSelectedSkus

        .map(
          sku => `

            <span class="chip">

              ${esc(sku)}

              <button
                type="button"
                data-remove-sku="${esc(sku)}"
              >
                ×
              </button>

            </span>

          `
        )

        .join('');


    targetInputs.innerHTML =
      planSelectedSkus

        .map(
          (sku, i) => `

            <div class="list-item">

              <h4>

                ${i + 1}.
                ${esc(sku)}

              </h4>


              <div
                class="form-grid"
                style="margin-top:10px"
              >

                <label>

                  Target Cartons

                  <input
                    data-cartons-for="${esc(sku)}"
                    type="number"
                    min="0"
                    step="1"
                    value="${oldTargets[sku]?.cartons || 0}"
                  >

                </label>


                <label>

                  Target Sales Value (RM)

                  <input
                    data-value-for="${esc(sku)}"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${oldTargets[sku]?.value || 0}"
                  >

                </label>

              </div>

            </div>

          `
        )

        .join('');
  }


  function paintSearch() {

    const outletName =
      outletEl.value;

    const search =
      q.value
        .trim()
        .toLowerCase();


    if (
      !outletName ||
      !search
    ) {

      results.innerHTML =
        '';

      return;
    }


    const list =
      productsForOutlet(
        id,
        outletName
      )

        .filter(
          x =>
            x
              .toLowerCase()
              .includes(search) &&
            !planSelectedSkus
              .includes(x)
        )

        .slice(
          0,
          40
        );


    results.innerHTML =
      list
        .map(
          x => `

            <div
              class="search-result"
              data-plan-sku="${esc(x)}"
            >

              ${esc(x)}

            </div>

          `
        )
        .join('') ||

      `

        <div class="search-result">
          No product found
        </div>

      `;
  }


  q.oninput =
    paintSearch;


  outletEl.onchange =
    () => {

      q.value =
        '';

      results.innerHTML =
        '';

      planSelectedSkus =
        [];

      paintSelected();
    };


  results.onclick =
    e => {

      const el =
        e.target
          .closest(
            '[data-plan-sku]'
          );

      if (!el) return;


      const max =
        number(
          $('#targetSkuCount')
            .value
        );


      if (
        max > 0 &&
        planSelectedSkus.length >=
          max
      ) {

        toast(
          `You selected the maximum ${max} SKU(s)`
        );

        return;
      }


      planSelectedSkus
        .push(
          el.dataset.planSku
        );


      q.value =
        '';

      results.innerHTML =
        '';


      paintSelected();
    };


  chips.onclick =
    e => {

      const b =
        e.target
          .closest(
            '[data-remove-sku]'
          );

      if (!b) return;


      planSelectedSkus =
        planSelectedSkus
          .filter(
            x =>
              x !==
              b.dataset.removeSku
          );


      paintSelected();
    };


  $('#planForm')
    .onsubmit = e => {

      e.preventDefault();


      const fd =
        new FormData(
          e.target
        );


      const outletName =
        String(
          fd.get(
            'outlet'
          )
        );


      const o =
        outletsFor(id)
          .find(
            x =>
              x.name ===
              outletName
          ) || {};


      const count =
        number(
          fd.get(
            'targetSkuCount'
          )
        );


      if (
        count > 0 &&
        planSelectedSkus.length !==
          count
      ) {

        toast(
          `Please select exactly ${count} targeted SKU(s)`
        );

        return;
      }


      const skuTargets = {};


      planSelectedSkus
        .forEach(
          sku => {

            skuTargets[sku] = {

              cartons:
                number(
                  document
                    .querySelector(
                      `[data-cartons-for="${cssEscape(sku)}"]`
                    )
                    ?.value
                ),

              value:
                number(
                  document
                    .querySelector(
                      `[data-value-for="${cssEscape(sku)}"]`
                    )
                    ?.value
                )
            };
          }
        );


      const plan = {

        id:
          idGen(),

        staffId:
          id,

        month:
          selectedMonth,

        outletCode:
          o.code || '',

        outletName,

        outletTarget:
          number(
            fd.get(
              'outletTarget'
            )
          ),

        targetSkuCount:
          count ||
          planSelectedSkus.length,

        targetSkus:
          [
            ...planSelectedSkus
          ],

        skuTargets
      };


      const st2 =
        getState();


      st2.plans =
        st2.plans.filter(
          x =>
            !(
              x.staffId === id &&
              x.month === selectedMonth &&
              x.outletName === outletName
            )
        );


      st2.plans.push(
        plan
      );


      setState(st2);


      const cloudSkuPayload =
        plan.targetSkus
          .map(
            name => ({

              name,

              cartons:
                number(
                  plan
                    .skuTargets[
                      name
                    ]
                    ?.cartons
                ),

              value:
                number(
                  plan
                    .skuTargets[
                      name
                    ]
                    ?.value
                )
            })
          );


      safeCloudPost(
        'savePlan',
        {

          month:
            selectedMonth,

          routeTarget:
            fixedRouteTarget(id),

          outletCode:
            plan.outletCode,

          outletName:
            plan.outletName,

          outletTarget:
            plan.outletTarget,

          targetedSkuCount:
            plan.targetSkuCount,

          targetSkus:
            cloudSkuPayload,

          skuSalesPlan:
            cloudSkuPayload
              .reduce(
                (s, x) =>
                  s +
                  number(
                    x.value
                  ),
                0
              )
        }
      );


      toast(
        'Outlet + SKU plan saved'
      );


      render();
    };
}

function cssEscape(v) {

  if (
    window.CSS &&
    CSS.escape
  ) {

    return CSS.escape(v);
  }

  return String(v)
    .replace(
      /["\\]/g,
      '\\$&'
    );
}

function planningPerformanceHtml(
  staffId
) {

  const plans =
    monthPlans(
      staffId
    );


  if (
    !plans.length
  ) {

    return `

      <div class="card">

        <div class="empty">

          No outlet plan saved for this month.

        </div>

      </div>

    `;
  }


  return `

    <div class="list">

      ${
        plans
          .map(
            plan => {

              const actual =
                outletAchievement(
                  staffId,
                  plan.outletName
                );

              const short =
                Math.max(
                  0,
                  number(
                    plan.outletTarget
                  ) -
                  actual
                );

              const pct =
                number(
                  plan.outletTarget
                )

                  ? Math.min(
                      100,
                      actual /
                      number(
                        plan.outletTarget
                      ) *
                      100
                    )

                  : 0;


              const skuHtml =
                (
                  plan.targetSkus ||
                  []
                )

                  .map(
                    sku => {

                      const target =
                        plan
                          .skuTargets?.[
                            sku
                          ] || {

                          cartons: 0,

                          value: 0
                        };


                      const got =
                        skuAchievement(

                          staffId,

                          plan.outletName,

                          sku
                        );


                      const leftCtn =
                        Math.max(

                          0,

                          number(
                            target.cartons
                          ) -

                          got.cartons
                        );


                      const leftValue =
                        Math.max(

                          0,

                          number(
                            target.value
                          ) -

                          got.value
                        );


                      return `

                        <div
                          class="list-item"
                          style="margin-top:8px"
                        >

                          <h4>

                            ${esc(sku)}

                          </h4>

                          <p>

                            CTN
                            ${got.cartons}
                            /
                            ${number(target.cartons)}

                            •

                            Remaining

                            <span
                              class="${
                                leftCtn > 0
                                  ? 'bad'
                                  : 'good'
                              }"
                            >

                              ${leftCtn}

                            </span>

                            <br>

                            Value

                            ${money(got.value)}
                            /
                            ${money(target.value)}

                            •

                            Remaining

                            <span
                              class="${
                                leftValue > 0
                                  ? 'bad'
                                  : 'good'
                              }"
                            >

                              ${money(leftValue)}

                            </span>

                          </p>

                        </div>

                      `;
                    }
                  )

                  .join('');


              return `

                <div class="card">

                  <div class="row">

                    <div>

                      <h3
                        style="margin:0"
                      >

                        ${esc(plan.outletName)}

                      </h3>

                      <p
                        class="muted"
                        style="margin:4px 0 0"
                      >

                        ${
                          (
                            plan.targetSkus ||
                            []
                          ).length
                        }
                        targeted SKU(s)

                      </p>

                    </div>


                    <span
                      class="
                        pill
                        ${
                          short > 0
                            ? 'red'
                            : 'green'
                        }
                      "
                    >

                      ${
                        short > 0

                          ? money(short) +
                            ' short'

                          : 'Achieved'
                      }

                    </span>

                  </div>


                  <div
                    class="progress-wrap"
                    style="margin-top:12px"
                  >

                    <div
                      class="
                        progress
                        ${
                          pct >= 100
                            ? 'goodbar'
                            : ''
                        }
                      "
                      style="
                        width:${pct}%
                      "
                    >
                    </div>

                  </div>


                  <div
                    class="row"
                    style="margin-top:8px"
                  >

                    <small class="muted">

                      Target
                      ${money(plan.outletTarget)}

                    </small>

                    <small>

                      ${money(actual)}

                    </small>

                  </div>


                  ${skuHtml}

                </div>

              `;
            }
          )
          .join('')
      }

    </div>
  `;
}


/* =========================================================
   PAGE 4 — SALARY / INCENTIVE
========================================================= */

function renderIncome() {

  const id =
    currentStaffId();

  const s =
    salary(id);

  const plan =
    incomePlan(id);

  const productList =
    productIncentives(id);


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="card">

        <p class="eyebrow">
          PROJECTED CURRENT MONTH INCOME
        </p>

        <div class="salary-total">

          ${money(s.total)}

        </div>

        <p class="muted">

          ${
            s.expected > 0

              ? `Expected ${money(s.expected)} • ${
                  s.total >= s.expected
                    ? 'Goal achieved'
                    : money(
                        s.expected -
                        s.total
                      ) +
                      ' remaining'
                }`

              : 'Set your expected income below.'
          }

        </p>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        ${incomeRow(
          'Basic Salary',
          s.basic
        )}

        ${incomeRow(
          'Fuel / Oil',
          s.fuel
        )}

        ${incomeRow(
          'House Rent',
          s.rent
        )}

        ${incomeRow(
          'Food Allowance',
          s.food
        )}

        ${incomeRow(
          'Sales Commission',
          s.commission
        )}

        ${incomeRow(
          'Zero Sales Incentive',
          s.zeroSales
        )}

        ${incomeRow(
          'Product Incentive',
          s.product
        )}

        ${incomeRow(
          'Growth Incentive',
          s.growth
        )}

        ${incomeRow(
          'Manager Incentive',
          s.manager
        )}

        ${incomeRow(
          'Others Incentive',
          s.other
        )}


        <hr
          style="
            border:0;
            border-top:1px solid var(--line);
            margin:14px 0
          "
        >


        ${incomeRow(
          'TOTAL PROJECTED',
          s.total,
          true
        )}

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <p class="eyebrow">
          EXPECTED INCOME + ACTUAL EXTRA INCENTIVES
        </p>


        <form
          id="incomeForm"
          class="stack"
        >

          <label>

            Expected Total Income (RM)

            <input
              name="expected"
              type="number"
              min="0"
              step="0.01"
              value="${number(plan.expected)}"
            >

          </label>


          <label>

            Growth Incentive Actual (RM)

            <input
              name="growthActual"
              type="number"
              min="0"
              step="0.01"
              value="${number(plan.growthActual)}"
            >

          </label>


          <label>

            Manual Product Incentive (RM)

            <input
              name="productManual"
              type="number"
              min="0"
              step="0.01"
              value="${number(plan.productManual)}"
            >

          </label>


          <label>

            Manager Incentive Actual (RM)

            <input
              name="managerActual"
              type="number"
              min="0"
              step="0.01"
              value="${number(plan.managerActual)}"
            >

          </label>


          <label>

            Other Incentive Actual (RM)

            <input
              name="otherActual"
              type="number"
              min="0"
              step="0.01"
              value="${number(plan.otherActual)}"
            >

          </label>


          <button
            class="btn primary"
          >
            Save Income Details
          </button>

        </form>

      </div>


      ${
        session.mode ===
        'manager'

          ? `

            <div
              class="card"
              style="margin-top:12px"
            >

              <p class="eyebrow">
                MANAGER • PRODUCT INCENTIVE RULE
              </p>


              <form
                id="incentiveForm"
                class="stack"
              >

                <label>

                  Product SKU

                  <input
                    name="skuName"
                    list="allProductNames"
                    required
                    placeholder="Search product"
                  >

                </label>


                <datalist
                  id="allProductNames"
                >

                  ${
                    (
                      D.products ||
                      []
                    )
                      .map(
                        x => `

                          <option
                            value="${esc(x)}"
                          >
                          </option>

                        `
                      )
                      .join('')
                  }

                </datalist>


                <label>

                  Target Cartons

                  <input
                    name="targetQty"
                    type="number"
                    min="1"
                    step="1"
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
                    required
                  >

                </label>


                <button
                  class="btn primary"
                >
                  Create Product Incentive
                </button>

              </form>

            </div>

          `

          : ''
      }


      <div class="section-title">

        <h3>
          Product Incentive Progress
        </h3>

      </div>


      <div class="list">

        ${
          productList.length

            ? productList
                .map(
                  inc =>
                    incentiveProgressHtml(
                      id,
                      inc
                    )
                )
                .join('')

            : `

              <div class="card">

                <div class="empty">

                  No product incentive set for this month.

                </div>

              </div>

            `
        }

      </div>
    `;


  bindCommon();


  $('#incomeForm')
    .onsubmit = e => {

      e.preventDefault();

      const fd =
        new FormData(
          e.target
        );

      const st =
        getState();


      st.incomePlans =
        st.incomePlans.filter(
          x =>
            !(
              x.staffId === id &&
              x.month ===
                selectedMonth
            )
        );


      const rec = {

        staffId:
          id,

        month:
          selectedMonth,

        expected:
          number(
            fd.get(
              'expected'
            )
          ),

        growthActual:
          number(
            fd.get(
              'growthActual'
            )
          ),

        productManual:
          number(
            fd.get(
              'productManual'
            )
          ),

        managerActual:
          number(
            fd.get(
              'managerActual'
            )
          ),

        otherActual:
          number(
            fd.get(
              'otherActual'
            )
          )
      };


      st.incomePlans.push(
        rec
      );


      setState(st);


      safeCloudPost(
        'saveIncome',
        {

          month:
            selectedMonth,

          expected:
            rec.expected,

          growth:
            rec.growthActual,

          product:
            rec.productManual,

          manager:
            rec.managerActual,

          other:
            rec.otherActual
        }
      );


      toast(
        'Income details saved'
      );


      render();
    };


  const incentiveForm =
    $('#incentiveForm');


  if (
    incentiveForm
  ) {

    incentiveForm.onsubmit =
      e => {

        e.preventDefault();


        const fd =
          new FormData(
            e.target
          );


        const st =
          getState();


        st.incentives.push({

          id:
            idGen(),

          staffId:
            id,

          month:
            selectedMonth,

          type:
            'PRODUCT',

          skuName:
            String(
              fd.get(
                'skuName'
              )
            ),

          targetQty:
            number(
              fd.get(
                'targetQty'
              )
            ),

          reward:
            number(
              fd.get(
                'reward'
              )
            )
        });


        setState(st);


        toast(
          'Product incentive created'
        );


        render();
      };
  }
}

function incomeRow(
  label,
  value,
  strong = false
) {

  return `

    <div
      class="row"
      style="padding:8px 0"
    >

      <span class="muted">

        ${esc(label)}

      </span>

      <${strong
        ? 'strong'
        : 'span'}>

        ${money(value)}

      </${strong
        ? 'strong'
        : 'span'}>

    </div>
  `;
}

function incentiveProgressHtml(
  staffId,
  inc
) {

  const sold =
    skuTotalAcrossRoute(
      staffId,
      inc.skuName
    ).cartons;

  const target =
    number(
      inc.targetQty
    );

  const left =
    Math.max(
      0,
      target - sold
    );

  const pct =
    target > 0
      ? Math.min(
          100,
          sold /
          target *
          100
        )
      : 0;

  const unlocked =
    sold >= target;


  return `

    <div class="card">

      <div class="row">

        <div>

          <h3
            style="margin:0"
          >

            ${esc(inc.skuName)}

          </h3>

          <p
            class="muted"
            style="margin:4px 0 0"
          >

            Reward
            ${money(inc.reward)}

          </p>

        </div>


        <span
          class="
            pill
            ${
              unlocked
                ? 'green'
                : 'red'
            }
          "
        >

          ${
            unlocked
              ? 'UNLOCKED'
              : left +
                ' CTN LEFT'
          }

        </span>

      </div>


      <div
        class="progress-wrap"
        style="margin-top:12px"
      >

        <div
          class="
            progress
            ${
              unlocked
                ? 'goodbar'
                : ''
            }
          "
          style="
            width:${pct}%
          "
        >
        </div>

      </div>


      <div
        class="row"
        style="margin-top:8px"
      >

        <small class="muted">

          ${sold}/${target}
          CTN achieved

        </small>

        <strong
          class="${
            unlocked
              ? 'good'
              : 'bad'
          }"
        >

          ${pct.toFixed(0)}%

        </strong>

      </div>

    </div>
  `;
}


/* =========================================================
   PAGE 5 — SUMMARY
========================================================= */

function renderSummary() {

  const id =
    currentStaffId();

  const p =
    performance(id);

  const sal =
    salary(id);

  const daily =
    monthDaily(id)

      .slice()

      .sort(
        (a, b) =>
          a.date
            .localeCompare(
              b.date
            )
      );

  const plans =
    monthPlans(id);


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="hero">

        <p class="eyebrow">

          ${monthName(selectedMonth).toUpperCase()}
          SUMMARY

        </p>

        <h3>

          ${esc(
            userById(id)?.name ||
            id
          )}

        </h3>

        <p class="muted">

          Target
          ${money(p.target)}

          •

          Achievement
          ${money(p.achievement)}

          •

          Shortfall
          ${money(p.shortfall)}

        </p>

      </div>


      <div class="grid kpi-grid">

        ${kpi(
          'TARGET',
          money(p.target),
          'Fixed route target'
        )}

        ${kpi(
          'ACHIEVEMENT',
          money(p.achievement),
          'MTD sales',
          p.achievement >=
          p.target
            ? 'good'
            : ''
        )}

        ${kpi(
          'SHORTFALL',
          money(p.shortfall),
          'Remaining',
          p.shortfall > 0
            ? 'bad'
            : 'good'
        )}

        ${kpi(
          'PROJECTED INCOME',
          money(sal.total),
          'Salary + incentives'
        )}

      </div>


      <div
        class="card"
        style="
          margin-top:12px;
          overflow:auto
        "
      >

        <h3>
          Day-by-Day Tracker
        </h3>


        <table
          class="summary-table"
          style="min-width:760px"
        >

          <thead>

            <tr>

              <th>Date</th>

              <th>Sales</th>

              <th>Last Month</th>

              <th>Growth</th>

              <th>Active</th>

              <th>Prepare Trip</th>

              <th>Order</th>

            </tr>

          </thead>


          <tbody>

            ${
              daily.length

                ? daily
                    .map(
                      x => {

                        const g =
                          number(
                            x.lastMonthSameDay
                          ) > 0

                            ? (
                                (
                                  number(
                                    x.todaySales
                                  ) -
                                  number(
                                    x.lastMonthSameDay
                                  )
                                ) /
                                number(
                                  x.lastMonthSameDay
                                ) *
                                100
                              )

                            : 0;


                        return `

                          <tr>

                            <td>
                              ${esc(x.date)}
                            </td>

                            <td>
                              ${money(x.todaySales)}
                            </td>

                            <td>
                              ${money(x.lastMonthSameDay)}
                            </td>

                            <td
                              class="${
                                g >= 0
                                  ? 'good'
                                  : 'bad'
                              }"
                            >

                              ${
                                g >= 0
                                  ? '+'
                                  : ''
                              }

                              ${g.toFixed(1)}%

                            </td>

                            <td>
                              ${money(x.active)}
                            </td>

                            <td>
                              ${money(x.prepareTrip)}
                            </td>

                            <td>
                              ${money(x.orderAmount)}
                            </td>

                          </tr>

                        `;
                      }
                    )
                    .join('')

                : `

                  <tr>

                    <td colspan="7">
                      No daily data
                    </td>

                  </tr>

                `
            }

          </tbody>

        </table>

      </div>


      <div
        class="card"
        style="
          margin-top:12px;
          overflow:auto
        "
      >

        <h3>
          Outlet Target vs Actual
        </h3>


        <table
          class="summary-table"
          style="min-width:620px"
        >

          <thead>

            <tr>

              <th>Outlet</th>

              <th>Target</th>

              <th>Actual</th>

              <th>Shortfall</th>

              <th>Status</th>

            </tr>

          </thead>


          <tbody>

            ${
              plans.length

                ? plans
                    .map(
                      plan => {

                        const actual =
                          outletAchievement(
                            id,
                            plan.outletName
                          );

                        const short =
                          Math.max(
                            0,
                            number(
                              plan.outletTarget
                            ) -
                            actual
                          );


                        return `

                          <tr>

                            <td>
                              ${esc(plan.outletName)}
                            </td>

                            <td>
                              ${money(plan.outletTarget)}
                            </td>

                            <td>
                              ${money(actual)}
                            </td>

                            <td
                              class="${
                                short > 0
                                  ? 'bad'
                                  : 'good'
                              }"
                            >

                              ${money(short)}

                            </td>

                            <td>

                              ${
                                short > 0
                                  ? 'PUSH'
                                  : 'ACHIEVED'
                              }

                            </td>

                          </tr>

                        `;
                      }
                    )
                    .join('')

                : `

                  <tr>

                    <td colspan="5">
                      No outlet plan
                    </td>

                  </tr>

                `
            }

          </tbody>

        </table>

      </div>


      <div
        class="card"
        style="
          margin-top:12px;
          overflow:auto
        "
      >

        <h3>
          SKU Target vs Actual
        </h3>


        <table
          class="summary-table"
          style="min-width:920px"
        >

          <thead>

            <tr>

              <th>Outlet</th>

              <th>SKU</th>

              <th>Target CTN</th>

              <th>Actual CTN</th>

              <th>CTN Left</th>

              <th>Target RM</th>

              <th>Actual RM</th>

              <th>RM Left</th>

            </tr>

          </thead>


          <tbody>

            ${skuSummaryRows(id)}

          </tbody>

        </table>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <button
          id="xlsxBtn"
          class="btn primary"
        >

          Download Real Excel (.xlsx)

        </button>


        ${
          session.mode ===
          'manager'

            ? `

              <button
                id="cloudSetupBtn"
                class="btn secondary"
                style="margin-top:10px"
              >

                Cloud Setup / Sync

              </button>

            `

            : ''
        }

      </div>


      ${
        session.mode ===
        'manager'

          ? managerTaskForm(id)

          : ''
      }
    `;


  bindCommon();


  $('#xlsxBtn')
    .onclick =
      () =>
        exportXlsx(id);


  if (
    $('#cloudSetupBtn')
  ) {

    $('#cloudSetupBtn')
      .onclick =
        cloudSetup;
  }


  bindManagerTaskForm(id);
}

function skuSummaryRows(
  staffId
) {

  const rows = [];


  monthPlans(
    staffId
  ).forEach(
    plan => {

      (
        plan.targetSkus ||
        []
      ).forEach(
        sku => {

          const target =
            plan
              .skuTargets?.[
                sku
              ] || {

              cartons: 0,

              value: 0
            };


          const actual =
            skuAchievement(

              staffId,

              plan.outletName,

              sku
            );


          rows.push(`

            <tr>

              <td>

                ${esc(plan.outletName)}

              </td>

              <td>

                ${esc(sku)}

              </td>

              <td>

                ${number(target.cartons)}

              </td>

              <td>

                ${actual.cartons}

              </td>

              <td
                class="${
                  Math.max(
                    0,
                    number(
                      target.cartons
                    ) -
                    actual.cartons
                  ) > 0

                    ? 'bad'
                    : 'good'
                }"
              >

                ${
                  Math.max(
                    0,
                    number(
                      target.cartons
                    ) -
                    actual.cartons
                  )
                }

              </td>

              <td>

                ${money(target.value)}

              </td>

              <td>

                ${money(actual.value)}

              </td>

              <td
                class="${
                  Math.max(
                    0,
                    number(
                      target.value
                    ) -
                    actual.value
                  ) > 0

                    ? 'bad'
                    : 'good'
                }"
              >

                ${
                  money(
                    Math.max(
                      0,
                      number(
                        target.value
                      ) -
                      actual.value
                    )
                  )
                }

              </td>

            </tr>

          `);
        }
      );
    }
  );


  return rows.join('') ||

    `

      <tr>

        <td colspan="8">
          No SKU plan
        </td>

      </tr>

    `;
}


/* =========================================================
   REAL XLSX EXPORT
========================================================= */

async function loadXlsxLibrary() {

  if (
    window.XLSX
  ) {

    return true;
  }


  return new Promise(
    resolve => {

      const s =
        document
          .createElement(
            'script'
          );


      s.src =
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';


      s.onload =
        () =>
          resolve(true);


      s.onerror =
        () =>
          resolve(false);


      document.head
        .appendChild(s);
    }
  );
}

async function exportXlsx(
  staffId
) {

  toast(
    'Preparing Excel report...'
  );


  const ok =
    await loadXlsxLibrary();


  if (
    !ok ||
    !window.XLSX
  ) {

    toast(
      'Excel library could not load. Check internet and try again.'
    );

    return;
  }


  const p =
    performance(
      staffId
    );

  const sal =
    salary(
      staffId
    );

  const st =
    getState();


  const wb =
    XLSX.utils
      .book_new();


  const dailyRows =
    monthDaily(
      staffId
    )

      .slice()

      .sort(
        (a, b) =>
          a.date
            .localeCompare(
              b.date
            )
      )

      .map(
        x => ({

          Date:
            x.date,

          'Staff ID':
            staffId,

          Salesman:
            userById(
              staffId
            )?.name || '',

          'Today Sales':
            number(
              x.todaySales
            ),

          'Last Month Same Day':
            number(
              x.lastMonthSameDay
            ),

          Active:
            number(
              x.active
            ),

          'Prepare for Trip':
            number(
              x.prepareTrip
            ),

          'Order Amount':
            number(
              x.orderAmount
            ),

          Note:
            x.note || ''
        })
      );


  const outletRows =
    outletsFor(
      staffId
    )
      .map(
        o => {

          const plan =
            monthPlans(
              staffId
            )
              .find(
                x =>
                  x.outletName ===
                  o.name
              );

          const actual =
            outletAchievement(
              staffId,
              o.name
            );


          return {

            'Outlet Code':
              o.code || '',

            'Outlet Name':
              o.name,

            Category:
              o.category || '',

            'Total SKU':
              number(
                o.totalSku
              ),

            'Outlet Target':
              number(
                plan?.outletTarget
              ),

            'Actual Sales':
              actual,

            Shortfall:
              Math.max(
                0,
                number(
                  plan?.outletTarget
                ) -
                actual
              ),

            'Zero Sales':
              actual > 0
                ? 'NO'
                : 'YES'
          };
        }
      );


  const skuRows = [];


  monthPlans(
    staffId
  ).forEach(
    plan => {

      (
        plan.targetSkus ||
        []
      ).forEach(
        sku => {

          const target =
            plan
              .skuTargets?.[
                sku
              ] || {

              cartons: 0,

              value: 0
            };


          const actual =
            skuAchievement(

              staffId,

              plan.outletName,

              sku
            );


          skuRows.push({

            Outlet:
              plan.outletName,

            SKU:
              sku,

            'Target CTN':
              number(
                target.cartons
              ),

            'Actual CTN':
              actual.cartons,

            'Remaining CTN':
              Math.max(
                0,
                number(
                  target.cartons
                ) -
                actual.cartons
              ),

            'Target RM':
              number(
                target.value
              ),

            'Actual RM':
              actual.value,

            'Remaining RM':
              Math.max(
                0,
                number(
                  target.value
                ) -
                actual.value
              )
          });
        }
      );
    }
  );


  const incomeRows = [

    {
      Component:
        'Basic Salary',

      Amount:
        sal.basic
    },

    {
      Component:
        'Fuel / Oil',

      Amount:
        sal.fuel
    },

    {
      Component:
        'House Rent',

      Amount:
        sal.rent
    },

    {
      Component:
        'Food Allowance',

      Amount:
        sal.food
    },

    {
      Component:
        'Commission',

      Amount:
        sal.commission
    },

    {
      Component:
        'Zero Sales Incentive',

      Amount:
        sal.zeroSales
    },

    {
      Component:
        'Product Incentive',

      Amount:
        sal.product
    },

    {
      Component:
        'Growth Incentive',

      Amount:
        sal.growth
    },

    {
      Component:
        'Manager Incentive',

      Amount:
        sal.manager
    },

    {
      Component:
        'Others',

      Amount:
        sal.other
    },

    {
      Component:
        'TOTAL PROJECTED',

      Amount:
        sal.total
    }
  ];


  const summaryRows = [{

    Month:
      selectedMonth,

    'Staff ID':
      staffId,

    Salesman:
      userById(
        staffId
      )?.name || '',

    'Route Target':
      p.target,

    Achievement:
      p.achievement,

    Shortfall:
      p.shortfall,

    'Required Per Day':
      p.requiredPerDay,

    Growth:
      p.growth,

    'Total Route Outlets':
      p.routeOutlets.length,

    'Covered Outlets':
      p.covered.length,

    'Zero Sales Outlets':
      p.zeroSales.length,

    'Projected Income':
      sal.total
  }];


  const taskRows =
    st.tasks

      .filter(
        t =>
          t.staffId ===
          staffId
      )

      .map(
        t => ({

          Title:
            t.title,

          Instruction:
            t.note,

          'Due Date':
            t.due,

          Status:
            t.done
              ? 'DONE'
              : 'PENDING'
        })
      );


  addSheet(
    wb,
    'Summary',
    summaryRows
  );

  addSheet(
    wb,
    'Daily Tracker',
    dailyRows
  );

  addSheet(
    wb,
    'Outlet Performance',
    outletRows
  );

  addSheet(
    wb,
    'SKU Performance',
    skuRows
  );

  addSheet(
    wb,
    'Salary Incentive',
    incomeRows
  );

  addSheet(
    wb,
    'Tasks',
    taskRows
  );


  XLSX.writeFile(
    wb,
    `${staffId}_${selectedMonth}_Sales_Performance.xlsx`
  );


  toast(
    'Excel downloaded'
  );
}

function addSheet(
  wb,
  name,
  rows
) {

  const safeRows =
    rows.length

      ? rows

      : [
          {
            Info:
              'No data'
          }
        ];


  const ws =
    XLSX.utils
      .json_to_sheet(
        safeRows
      );


  XLSX.utils
    .book_append_sheet(

      wb,

      ws,

      name.slice(
        0,
        31
      )
    );
}


/* =========================================================
   PAGE 6 — TASKS
========================================================= */

function renderTasks() {

  const id =
    currentStaffId();


  const tasks =
    getState()
      .tasks

      .filter(
        t =>
          t.staffId ===
          id
      )

      .slice()

      .sort(
        (a, b) =>
          String(
            b.createdAt
          )
            .localeCompare(
              String(
                a.createdAt
              )
            )
      );


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="card">

        <p class="eyebrow">
          SPECIAL ASSIGNMENTS
        </p>

        <h2>

          ${
            session.mode ===
            'manager'

              ? 'Selected SR Tasks'

              : 'My Tasks'
          }

        </h2>

      </div>


      <div
        class="list"
        style="margin-top:12px"
      >

        ${
          tasks.length

            ? tasks
                .map(
                  t => `

                    <div class="list-item">

                      <div class="row">

                        <div>

                          <h4>

                            ${esc(t.title)}

                          </h4>

                          <p>

                            ${esc(
                              t.note ||
                              'No instruction'
                            )}

                            ${
                              t.due

                                ? '<br>Due: ' +
                                  esc(t.due)

                                : ''
                            }

                          </p>

                        </div>


                        <span
                          class="
                            pill
                            ${
                              t.done
                                ? 'green'
                                : 'red'
                            }
                          "
                        >

                          ${
                            t.done
                              ? 'DONE'
                              : 'PENDING'
                          }

                        </span>

                      </div>


                      ${
                        session.mode !==
                          'manager' &&
                        !t.done

                          ? `

                            <button
                              class="btn secondary"
                              data-complete-task="${esc(t.id)}"
                              style="margin-top:10px"
                            >

                              Mark Complete

                            </button>

                          `

                          : ''
                      }

                    </div>

                  `
                )
                .join('')

            : `

              <div class="card">

                <div class="empty">
                  No task assigned.
                </div>

              </div>

            `
        }

      </div>


      ${
        session.mode ===
        'manager'

          ? managerTaskForm(id)

          : ''
      }
    `;


  bindCommon();


  bindManagerTaskForm(
    id
  );


  $$('[data-complete-task]')
    .forEach(
      b => {

        b.onclick =
          () => {

            const st =
              getState();


            const task =
              st.tasks
                .find(
                  t =>
                    t.id ===
                    b.dataset
                      .completeTask
                );


            if (
              task
            ) {

              task.done =
                true;
            }


            setState(st);


            toast(
              'Task completed'
            );


            render();
          };
      }
    );
}

function managerTaskForm(
  staffId
) {

  if (
    session.mode !==
    'manager'
  ) {

    return '';
  }


  return `

    <div
      class="card"
      style="margin-top:12px"
    >

      <p class="eyebrow">
        MANAGER SPECIAL TASK
      </p>

      <h3>

        Assign to

        ${esc(
          userById(
            staffId
          )?.name ||
          staffId
        )}

      </h3>


      <form
        id="managerTaskForm"
        class="stack"
      >

        <label>

          Task Title

          <input
            name="title"
            required
          >

        </label>


        <label>

          Instruction

          <textarea
            name="note"
            required
          ></textarea>

        </label>


        <label>

          Due Date

          <input
            name="due"
            type="date"
          >

        </label>


        <button
          class="btn primary"
        >

          Send Task

        </button>

      </form>

    </div>
  `;
}

function bindManagerTaskForm(
  staffId
) {

  const form =
    $('#managerTaskForm');


  if (!form) return;


  form.onsubmit =
    e => {

      e.preventDefault();


      const fd =
        new FormData(
          e.target
        );


      const st =
        getState();


      const record = {

        id:
          idGen(),

        staffId,

        title:
          String(
            fd.get(
              'title'
            )
          ),

        note:
          String(
            fd.get(
              'note'
            )
          ),

        due:
          String(
            fd.get(
              'due'
            ) || ''
          ),

        done:
          false,

        createdAt:
          new Date()
            .toISOString()
      };


      st.tasks.push(
        record
      );


      setState(st);


      safeCloudPost(
        'saveTask',
        {

          staffId,

          title:
            record.title,

          instruction:
            record.note,

          due:
            record.due
        }
      );


      toast(
        'Task assigned'
      );


      render();
    };
}


/* =========================================================
   PAGE 7 — ZERO SALES
========================================================= */

function renderZeroSales() {

  const id =
    currentStaffId();

  const p =
    performance(id);


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="hero">

        <p class="eyebrow">
          ZERO SALES COVERAGE
        </p>

        <h3>

          ${p.coverage.toFixed(0)}%
          Covered

        </h3>

        <p class="muted">

          ${p.covered.length}
          covered

          •

          ${p.zeroSales.length}
          zero sales

          •

          ${p.routeOutlets.length}
          total route outlets

        </p>


        <div class="progress-wrap">

          <div
            class="
              progress
              ${
                p.coverage >= 100
                  ? 'goodbar'
                  : ''
              }
            "
            style="
              width:${p.coverage}%
            "
          >
          </div>

        </div>

      </div>


      <div class="section-title">

        <h3>
          Zero Sales Outlets
        </h3>

      </div>


      <div class="list">

        ${
          p.zeroSales.length

            ? p.zeroSales
                .map(
                  o => `

                    <div class="list-item">

                      <div class="row">

                        <div>

                          <h4>
                            ${esc(o.name)}
                          </h4>

                          <p>

                            ${esc(
                              o.category ||
                              'Other'
                            )}

                            •

                            ${esc(
                              o.code ||
                              'No code'
                            )}

                          </p>

                        </div>


                        <span class="pill red">

                          ZERO

                        </span>

                      </div>

                    </div>

                  `
                )
                .join('')

            : `

              <div class="card">

                <div class="empty">

                  ${
                    p.routeOutlets.length

                      ? 'Excellent — all outlets have sales.'

                      : 'Outlet master is not loaded yet.'
                  }

                </div>

              </div>

            `
        }

      </div>


      <div class="section-title">

        <h3>
          Covered Outlets
        </h3>

      </div>


      <div class="list">

        ${
          p.covered
            .map(
              o => `

                <div class="list-item">

                  <div class="row">

                    <div>

                      <h4>
                        ${esc(o.name)}
                      </h4>

                      <p>

                        ${money(
                          outletAchievement(
                            id,
                            o.name
                          )
                        )}

                      </p>

                    </div>


                    <span class="pill green">

                      COVERED

                    </span>

                  </div>

                </div>

              `
            )
            .join('') ||

          `

            <div class="empty">
              No covered outlet yet.
            </div>

          `
        }

      </div>
    `;


  bindCommon();
}


/* =========================================================
   PAGE 8 — SKU PERFORMANCE
========================================================= */

function renderSkuPerformance() {

  const id =
    currentStaffId();

  const plans =
    monthPlans(id);


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="card">

        <p class="eyebrow">
          SKU-WISE TARGET
        </p>

        <h2>
          Product Performance
        </h2>

        <p class="muted">

          Target cartons and sales value update automatically from daily SKU entries.

        </p>

      </div>


      <div
        class="list"
        style="margin-top:12px"
      >

        ${
          plans.length

            ? plans
                .map(
                  plan => `

                    <div class="card">

                      <h3>

                        ${esc(plan.outletName)}

                      </h3>


                      ${
                        (
                          plan.targetSkus ||
                          []
                        ).length

                          ? (
                              plan.targetSkus ||
                              []
                            )
                              .map(
                                sku => {

                                  const target =
                                    plan
                                      .skuTargets?.[
                                        sku
                                      ] || {

                                      cartons: 0,

                                      value: 0
                                    };


                                  const actual =
                                    skuAchievement(

                                      id,

                                      plan.outletName,

                                      sku
                                    );


                                  const targetC =
                                    number(
                                      target.cartons
                                    );


                                  const pct =
                                    targetC > 0

                                      ? Math.min(
                                          100,
                                          actual.cartons /
                                          targetC *
                                          100
                                        )

                                      : 0;


                                  const left =
                                    Math.max(
                                      0,
                                      targetC -
                                      actual.cartons
                                    );


                                  return `

                                    <div
                                      class="list-item"
                                      style="margin-top:9px"
                                    >

                                      <div class="row">

                                        <div>

                                          <h4>

                                            ${esc(sku)}

                                          </h4>

                                          <p>

                                            ${actual.cartons}/${targetC}
                                            CTN

                                            •

                                            ${money(actual.value)}
                                            /
                                            ${money(target.value)}

                                          </p>

                                        </div>


                                        <span
                                          class="
                                            pill
                                            ${
                                              left > 0
                                                ? 'red'
                                                : 'green'
                                            }
                                          "
                                        >

                                          ${
                                            left > 0
                                              ? left +
                                                ' LEFT'
                                              : 'DONE'
                                          }

                                        </span>

                                      </div>


                                      <div
                                        class="progress-wrap"
                                        style="margin-top:9px"
                                      >

                                        <div
                                          class="
                                            progress
                                            ${
                                              pct >= 100
                                                ? 'goodbar'
                                                : ''
                                            }
                                          "
                                          style="
                                            width:${pct}%
                                          "
                                        >
                                        </div>

                                      </div>

                                    </div>

                                  `;
                                }
                              )
                              .join('')

                          : `

                            <p class="muted">
                              No targeted SKU selected.
                            </p>

                          `
                      }

                    </div>

                  `
                )
                .join('')

            : `

              <div class="card">

                <div class="empty">

                  No SKU plan for this month.

                </div>

              </div>

            `
        }

      </div>
    `;


  bindCommon();
}


/* =========================================================
   PAGE 9 — MANAGER TEAM CONTROL
========================================================= */

function renderTeamControl() {

  if (
    session.mode !==
    'manager'
  ) {

    page =
      'dashboard';

    render();

    return;
  }


  $('#mainContent')
    .innerHTML = `

      ${monthAndModeBar()}


      <div class="card manager-banner">

        <p class="eyebrow">
          MANAGER ACCESS
        </p>

        <h2>
          Team Control Center
        </h2>

        <p class="muted">

          Review all four routes.

          Select any SR to open detailed performance.

        </p>

      </div>


      <div class="section-title">

        <h3>
          Team Performance
        </h3>

      </div>


      <div class="list">

        ${
          allSalesUsers()

            .map(
              u => {

                const p =
                  performance(
                    u.id
                  );


                const pct =
                  p.target

                    ? p.achievement /
                      p.target *
                      100

                    : 0;


                return `

                  <div class="card">

                    <div class="row">

                      <div>

                        <h3
                          style="margin:0"
                        >

                          ${esc(u.name)}

                        </h3>

                        <p
                          class="muted"
                          style="margin:4px 0 0"
                        >

                          ${u.id}

                          •

                          Target
                          ${money(p.target)}

                        </p>

                      </div>


                      <span
                        class="
                          pill
                          ${
                            pct >= 100

                              ? 'green'

                              : pct >= 80

                                ? 'orange'

                                : 'red'
                          }
                        "
                      >

                        ${pct.toFixed(0)}%

                      </span>

                    </div>


                    <div
                      class="progress-wrap"
                      style="margin-top:12px"
                    >

                      <div
                        class="
                          progress
                          ${
                            pct >= 100
                              ? 'goodbar'
                              : ''
                          }
                        "
                        style="
                          width:${
                            Math.min(
                              100,
                              pct
                            )
                          }%
                        "
                      >
                      </div>

                    </div>


                    <div
                      class="mini-grid"
                      style="margin-top:10px"
                    >

                      <div class="metric-box">

                        <small>
                          Achievement
                        </small>

                        <br>

                        <b>
                          ${money(p.achievement)}
                        </b>

                      </div>


                      <div class="metric-box">

                        <small>
                          Shortfall
                        </small>

                        <br>

                        <b
                          class="${
                            p.shortfall > 0
                              ? 'bad'
                              : 'good'
                          }"
                        >

                          ${money(p.shortfall)}

                        </b>

                      </div>


                      <div class="metric-box">

                        <small>
                          Required / Day
                        </small>

                        <br>

                        <b>

                          ${money(p.requiredPerDay)}

                        </b>

                      </div>


                      <div class="metric-box">

                        <small>
                          Coverage
                        </small>

                        <br>

                        <b>

                          ${p.coverage.toFixed(0)}%

                        </b>

                      </div>

                    </div>


                    <button
                      class="btn secondary"
                      data-select-team="${u.id}"
                      style="margin-top:12px"
                    >

                      Open
                      ${esc(
                        u.name
                          .split(' ')[0]
                      )}
                      Detail

                    </button>

                  </div>

                `;
              }
            )

            .join('')
        }

      </div>
    `;


  bindCommon();


  $$('[data-select-team]')
    .forEach(
      btn => {

        btn.onclick =
          async () => {

            managerView =
              btn.dataset
                .selectTeam;


            refreshTopBar();


            if (
              backendUrl()
            ) {

              await syncCloud(
                managerView,
                selectedMonth
              );
            }


            page =
              'dashboard';


            render();
          };
      }
    );
}


/* =========================================================
   CLOUD SETUP
========================================================= */

async function cloudSetup() {

  const current =
    backendUrl();


  const url =
    prompt(

      'Paste the deployed Google Apps Script Web App URL ending with /exec.\n\nLeave blank to keep local mode.',

      current
    );


  if (
    url === null
  ) {

    return;
  }


  localStorage.setItem(

    BACKEND_URL_KEY,

    url.trim()
  );


  if (
    !url.trim()
  ) {

    toast(
      'Local mode kept'
    );

    return;
  }


  toast(
    'Cloud URL saved. Syncing...'
  );


  const ok =
    await syncCloud(

      currentStaffId(),

      selectedMonth
    );


  toast(

    ok

      ? 'Cloud sync connected'

      : 'Cloud connection failed'
  );


  render();
}


/* =========================================================
   STARTUP
========================================================= */

$('#loginForm')
  .onsubmit =
    e => {

      e.preventDefault();

      login(
        $('#loginUser').value,
        $('#loginPin').value
      );
    };


$('#logoutBtn')
  .onclick =
    logout;


$('#notifBtn')
  .onclick =
    () => {

      page =
        'dashboard';

      render();

      pushBrowserAlert();
    };


$('#bottomNav')
  .onclick =
    e => {

      const btn =
        e.target
          .closest(
            'button[data-page]'
          );

      if (!btn) return;

      page =
        btn.dataset.page;

      render();
    };


/*
  IMPORTANT:
  This FINAL build uses a NEW storage key.

  Therefore old Sayem / demo sales /
  RM9000 / RM1870 data are NOT loaded.
*/

const savedSession =
  sessionStorage.getItem(
    SESSION_KEY
  );


if (
  savedSession
) {

  try {

    session =
      JSON.parse(
        savedSession
      );


    if (
      session &&
      userById(
        session.id
      )
    ) {

      if (
        session.mode ===
        'manager'
      ) {

        managerView =
          'M21954';
      }


      openApp();

    } else {

      sessionStorage
        .removeItem(
          SESSION_KEY
        );

      session =
        null;
    }

  } catch {

    sessionStorage
      .removeItem(
        SESSION_KEY
      );
  }
}


/*
  Force service worker to check latest files.
*/

if (
  'serviceWorker'
  in navigator
) {

  navigator
    .serviceWorker
    .register(
      './sw.js',
      {
        updateViaCache:
          'none'
      }
    )

    .then(
      reg =>
        reg.update()
    )

    .catch(
      () => {}
    );
}
