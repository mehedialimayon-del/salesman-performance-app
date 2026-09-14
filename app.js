const D = window.APP_DATA || {
  users: [],
  salaryRules: {},
  categoryProducts: {},
  products: [],
  outlets: {}
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const STORE = 'sph.v5.state';
const SESSION = 'sph.v5.session';
const BACKEND = 'sph.backendUrl';
const TZ = 'Asia/Kuala_Lumpur';

let session = null;
let page = 'dashboard';
let managerView = 'M21954';

let selectedMonth = localDate().slice(0, 7);
let selectedDay = localDate();

let summaryMode = 'month';
let selectedSkus = [];

let proposalFormsCache = [];
let lastCloudSyncAt = '';

let liveSyncTimer = null;

let oneSignalSdk = null;

let pushConfig = {
  ready: false,
  configured: false,
  appId: '',
  appUrl: ''
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function n(v) {
  return Number.isFinite(Number(v))
    ? Number(v)
    : 0;
}


function money(v) {
  return 'RM ' +
    n(v).toLocaleString(
      'en-MY',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
}


function esc(v = '') {
  return String(v).replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}


function idGen() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : 'id-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2);
}


function localDate() {

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).format(
    new Date()
  );
}


function dateLabel(d) {

  const [y, m, day] =
    String(d)
      .split('-')
      .map(Number);

  return new Date(
    y,
    m - 1,
    day
  ).toLocaleDateString(
    'en-MY',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  );
}


function monthName(m) {

  const [y, mo] =
    m.split('-')
      .map(Number);

  return new Date(
    y,
    mo - 1,
    1
  ).toLocaleDateString(
    'en-MY',
    {
      month: 'long',
      year: 'numeric'
    }
  );
}


function toast(msg) {

  const t = $('#toast');

  if (!t) return;

  t.textContent = msg;

  t.classList.add(
    'show'
  );

  clearTimeout(
    window.__toast
  );

  window.__toast =
    setTimeout(
      () =>
        t.classList.remove(
          'show'
        ),
      2300
    );
}


/* =========================================================
   LOCAL STATE
========================================================= */

function emptyState() {

  return {
    daily: [],
    outletSales: [],
    skuSales: [],
    plans: [],
    incentives: [],
    tasks: [],
    incomePlans: [],
    customOutlets: {}
  };
}


function state() {

  try {

    return Object.assign(
      emptyState(),
      JSON.parse(
        localStorage.getItem(
          STORE
        ) || '{}'
      )
    );

  } catch {

    return emptyState();
  }
}


function save(s) {

  localStorage.setItem(
    STORE,
    JSON.stringify(s)
  );
}


/* =========================================================
   USERS
========================================================= */

function user(id) {

  return (
    D.users ||
    []
  ).find(
    x =>
      String(
        x.id
      ).toUpperCase() ===
      String(
        id || ''
      ).toUpperCase()
  );
}


function salesUsers() {

  return (
    D.users ||
    []
  ).filter(
    x =>
      x.role === 'SR' ||
      String(
        x.role || ''
      ).includes(
        'MANAGER'
      )
  );
}


function uid() {

  return session?.mode ===
    'manager'
      ? managerView
      : session?.id;
}


function routeTarget(id) {

  return Math.max(
    n(
      D.salaryRules
        ?.minMonthlyTarget ||
        50000
    ),
    n(
      user(id)
        ?.target
    )
  );
}


function daysInMonth(m) {

  const [y, mo] =
    m.split('-')
      .map(Number);

  return new Date(
    y,
    mo,
    0
  ).getDate();
}


function daysRemain(m) {

  const now =
    new Date();

  const [y, mo] =
    m.split('-')
      .map(Number);

  const end =
    new Date(
      y,
      mo,
      0
    );

  if (
    now.getFullYear() !== y ||
    now.getMonth() + 1 !== mo
  ) {

    return now > end
      ? 0
      : daysInMonth(m);
  }

  return Math.max(
    1,
    end.getDate() -
      now.getDate() +
      1
  );
}


function parseJSON(
  v,
  f = []
) {

  try {

    return typeof v ===
      'string'
        ? JSON.parse(v)
        : (v || f);

  } catch {

    return f;
  }
}


/* =========================================================
   BACKEND
========================================================= */

function backendUrl() {

  const bundled =
    String(
      window.APP_CONFIG
        ?.BACKEND_URL ||
      ''
    ).trim();

  const local =
    String(
      localStorage.getItem(
        BACKEND
      ) || ''
    ).trim();

  return bundled || local;
}


async function apiGet(
  action,
  targetId = uid(),
  month = selectedMonth
) {

  const base =
    backendUrl();

  if (
    !base ||
    !session
  ) {
    return null;
  }

  const q =
    new URLSearchParams({
      action,
      staffId:
        session.id,
      password:
        session.password,
      viewStaffId:
        targetId,
      month
    });

  const r =
    await fetch(
      base +
        '?' +
        q.toString(),
      {
        cache:
          'no-store'
      }
    );

  return r.json();
}


async function apiPost(
  action,
  payload
) {

  const base =
    backendUrl();

  if (
    !base ||
    !session
  ) {
    return null;
  }

  const r =
    await fetch(
      base,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body:
          JSON.stringify({
            action,
            staffId:
              session.id,
            password:
              session.password,
            payload
          }),

        keepalive:
          true,

        cache:
          'no-store'
      }
    );

  return r.json();
}


async function pushCloud(
  action,
  payload
) {

  if (!backendUrl()) {

    toast(
      'Saved on phone • cloud URL missing'
    );

    return {
      ok: false
    };
  }

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

    return r;

  } catch (e) {

    console.warn(e);

    toast(
      'Saved on phone • cloud sync failed'
    );

    return {
      ok: false,
      error:
        String(e)
    };
  }
}


/* =========================================================
   CLOUD READ
========================================================= */

async function syncCloud(
  targetId = uid(),
  month = selectedMonth
) {

  if (
    !backendUrl() ||
    !session
  ) {
    return false;
  }

  try {

    const r =
      await apiGet(
        'bootstrap',
        targetId,
        month
      );

    if (!r?.ok) {

      throw new Error(
        r?.error ||
        'Cloud read failed'
      );
    }

    const d =
      r.data || {};

    const s =
      state();


    if (
      Array.isArray(
        d.outlets
      ) &&
      d.outlets.length
    ) {

      s.customOutlets[
        targetId
      ] =
        d.outlets
          .map(
            x => ({
              code:
                String(
                  x[
                    'Outlet Code'
                  ] || ''
                ),

              name:
                String(
                  x[
                    'Outlet Name'
                  ] || ''
                ),

              category:
                String(
                  x.Category ||
                  'Other'
                ),

              totalSku:
                n(
                  x[
                    'Total SKU'
                  ]
                )
            })
          )
          .filter(
            x =>
              x.name
          );
    }


    s.daily =
      s.daily
        .filter(
          x =>
            !(
              x.staffId ===
                targetId &&
              x.month ===
                month
            )
        )
        .concat(
          (
            d.daily ||
            []
          ).map(
            x => ({
              id:
                idGen(),

              staffId:
                targetId,

              month:
                String(
                  x.Month ||
                  month
                ),

              date:
                String(
                  x.Date ||
                  ''
                ).slice(
                  0,
                  10
                ),

              todaySales:
                n(
                  x[
                    'Today Sales'
                  ]
                ),

              lastMonthSameDay:
                n(
                  x[
                    'Last Month Same Day'
                  ]
                ),

              active:
                n(
                  x.Active
                ),

              prepareTrip:
                n(
                  x[
                    'Prepare for Trip'
                  ]
                ),

              orderAmount:
                n(
                  x[
                    'Order Amount'
                  ]
                ),

              note:
                String(
                  x.Note ||
                  ''
                )
            })
          )
        );


    s.outletSales =
      s.outletSales
        .filter(
          x =>
            !(
              x.staffId ===
                targetId &&
              x.month ===
                month
            )
        )
        .concat(
          (
            d.outletSales ||
            []
          ).map(
            x => ({
              id:
                idGen(),

              staffId:
                targetId,

              month:
                String(
                  x.Month ||
                  month
                ),

              date:
                String(
                  x.Date ||
                  ''
                ).slice(
                  0,
                  10
                ),

              outletCode:
                String(
                  x[
                    'Outlet Code'
                  ] || ''
                ),

              outletName:
                String(
                  x[
                    'Outlet Name'
                  ] || ''
                ),

              sales:
                n(
                  x[
                    'Sales Value'
                  ]
                ),

              note:
                String(
                  x.Note ||
                  ''
                )
            })
          )
        );


    s.skuSales =
      s.skuSales
        .filter(
          x =>
            !(
              x.staffId ===
                targetId &&
              x.month ===
                month
            )
        )
        .concat(
          (
            d.skuSales ||
            []
          ).map(
            x => ({
              id:
                idGen(),

              staffId:
                targetId,

              month:
                String(
                  x.Month ||
                  month
                ),

              date:
                String(
                  x.Date ||
                  ''
                ).slice(
                  0,
                  10
                ),

              outletCode:
                String(
                  x[
                    'Outlet Code'
                  ] || ''
                ),

              outletName:
                String(
                  x[
                    'Outlet Name'
                  ] || ''
                ),

              skuName:
                String(
                  x[
                    'SKU Name'
                  ] || ''
                ),

              cartons:
                n(
                  x.Cartons
                ),

              salesValue:
                n(
                  x[
                    'Sales Value'
                  ]
                )
            })
          )
        );


    s.plans =
      s.plans
        .filter(
          x =>
            !(
              x.staffId ===
                targetId &&
              x.month ===
                month
            )
        )
        .concat(
          (
            d.plans ||
            []
          ).map(
            x => {

              const raw =
                parseJSON(
                  x[
                    'Targeted SKU List'
                  ],
                  []
                );

              const targetSkus =
                [];

              const skuTargets =
                {};


              (
                Array.isArray(
                  raw
                )
                  ? raw
                  : []
              ).forEach(
                it => {

                  if (
                    typeof it ===
                    'string'
                  ) {

                    targetSkus
                      .push(it);

                    skuTargets[
                      it
                    ] = {
                      cartons:
                        0,

                      value:
                        0
                    };

                  } else if (
                    it?.name
                  ) {

                    targetSkus
                      .push(
                        it.name
                      );

                    skuTargets[
                      it.name
                    ] = {
                      cartons:
                        n(
                          it.cartons
                        ),

                      value:
                        n(
                          it.value
                        )
                    };
                  }
                }
              );


              return {
                id:
                  idGen(),

                staffId:
                  targetId,

                month:
                  String(
                    x.Month ||
                    month
                  ),

                outletCode:
                  String(
                    x[
                      'Outlet Code'
                    ] || ''
                  ),

                outletName:
                  String(
                    x[
                      'Outlet Name'
                    ] || ''
                  ),

                outletTarget:
                  n(
                    x[
                      'Outlet Target'
                    ]
                  ),

                targetSkuCount:
                  n(
                    x[
                      'Targeted SKU Count'
                    ]
                  ) ||
                  targetSkus.length,

                targetSkus,

                skuTargets
              };
            }
          )
        );


    s.tasks =
      s.tasks
        .filter(
          x =>
            x.staffId !==
              targetId
        )
        .concat(
          (
            d.tasks ||
            []
          ).map(
            x => ({
              id:
                String(
                  x[
                    'Task ID'
                  ] ||
                  idGen()
                ),

              staffId:
                targetId,

              title:
                String(
                  x.Title ||
                  ''
                ),

              note:
                String(
                  x.Instruction ||
                  ''
                ),

              due:
                String(
                  x[
                    'Due Date'
                  ] || ''
                ).slice(
                  0,
                  10
                ),

              done:
                String(
                  x.Status ||
                  ''
                ).toUpperCase() ===
                'DONE',

              createdAt:
                String(
                  x[
                    'Created At'
                  ] || ''
                )
            })
          )
        );


    s.incentives =
      s.incentives
        .filter(
          x =>
            !(
              x.staffId ===
                targetId &&
              x.month ===
                month
            )
        )
        .concat(
          (
            d.incentives ||
            []
          ).map(
            x => ({
              id:
                idGen(),

              staffId:
                targetId,

              month:
                String(
                  x.Month ||
                  month
                ),

              type:
                String(
                  x[
                    'Incentive Type'
                  ] ||
                  'PRODUCT'
                ).toUpperCase(),

              skuName:
                String(
                  x[
                    'SKU Name'
                  ] || ''
                ),

              targetQty:
                n(
                  x[
                    'Target Qty'
                  ]
                ),

              reward:
                n(
                  x[
                    'Reward RM'
                  ]
                ),

              manualTarget:
                n(
                  x[
                    'Manual Target RM'
                  ]
                ),

              actual:
                n(
                  x[
                    'Actual RM'
                  ]
                ),

              status:
                String(
                  x.Status ||
                  'ACTIVE'
                )
            })
          )
        );


    if (
      Array.isArray(
        d.income
      ) &&
      d.income.length
    ) {

      const x =
        d.income[
          d.income.length - 1
        ];

      s.incomePlans =
        s.incomePlans
          .filter(
            y =>
              !(
                y.staffId ===
                  targetId &&
                y.month ===
                  month
              )
          );

      s.incomePlans
        .push({
          staffId:
            targetId,

          month,

          expected:
            n(
              x[
                'Expected Total Income'
              ]
            ),

          growthActual:
            n(
              x[
                'Growth Incentive Target'
              ]
            ),

          productManual:
            n(
              x[
                'Product Incentive Target'
              ]
            ),

          managerActual:
            n(
              x[
                'Manager Incentive Target'
              ]
            ),

          otherActual:
            n(
              x[
                'Other Incentive Target'
              ]
            )
        });
    }


    save(s);


    lastCloudSyncAt =
      new Date()
        .toLocaleTimeString(
          'en-MY',
          {
            hour:
              '2-digit',

            minute:
              '2-digit'
          }
        );


    return true;

  } catch (e) {

    console.warn(e);

    toast(
      'Cloud sync unavailable'
    );

    return false;
  }
}


/* =========================================================
   IMPORTANT FIX:
   MANAGER TEAM SYNC IS SEQUENTIAL
========================================================= */

async function syncAllTeam() {

  if (
    !backendUrl() ||
    session?.mode !==
      'manager'
  ) {
    return false;
  }


  for (
    const u
    of salesUsers()
  ) {

    await syncCloud(
      u.id,
      selectedMonth
    );
  }


  return true;
}


async function syncCurrent(
  show = false
) {

  const ok =
    session?.mode ===
      'manager'
      ? await syncAllTeam()
      : await syncCloud(
          uid(),
          selectedMonth
        );


  if (
    ok &&
    show
  ) {

    toast(
      'Live data synced'
    );
  }


  return ok;
}


/* =========================================================
   MASTER DATA
========================================================= */

function outletsFor(id) {

  const s =
    state();

  const all = [
    ...(
      D.outlets?.[
        id
      ] || []
    ),

    ...(
      s.customOutlets?.[
        id
      ] || []
    )
  ];


  const m =
    new Map();


  all.forEach(
    o => {

      const k =
        String(
          o.code ||
          o.name ||
          ''
        )
        .trim()
        .toUpperCase();


      if (k) {

        m.set(
          k,
          o
        );
      }
    }
  );


  return [
    ...m.values()
  ].sort(
    (
      a,
      b
    ) =>
      String(
        a.name
      ).localeCompare(
        String(
          b.name
        )
      )
  );
}


function productsForOutlet(
  id,
  outletName
) {

  const o =
    outletsFor(id)
      .find(
        x =>
          x.name ===
          outletName
      );


  const list =
    D.categoryProducts?.[
      o?.category
    ];


  return (
    Array.isArray(
      list
    ) &&
    list.length
  )
    ? list
    : (
        D.products ||
        []
      );
}


function outletOptions(
  id,
  selected = '',
  filter = ''
) {

  const q =
    filter
      .trim()
      .toLowerCase();


  return (
    '<option value="">Select outlet</option>' +

    outletsFor(id)
      .filter(
        o =>
          !q ||
          o.name
            .toLowerCase()
            .includes(q) ||
          String(
            o.code ||
            ''
          ).includes(q)
      )
      .map(
        o => `
          <option
            value="${esc(o.name)}"
            ${
              o.name ===
                selected
                ? 'selected'
                : ''
            }
          >
            ${esc(o.name)}
          </option>
        `
      )
      .join('')
  );
}


function skuOptions(
  id,
  outletName,
  selected = '',
  filter = ''
) {

  const q =
    filter
      .trim()
      .toLowerCase();


  return (
    '<option value="">Select SKU</option>' +

    productsForOutlet(
      id,
      outletName
    )
    .filter(
      x =>
        !q ||
        x
          .toLowerCase()
          .includes(q)
    )
    .map(
      x => `
        <option
          value="${esc(x)}"
          ${
            x === selected
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


/* =========================================================
   PERFORMANCE DATA
========================================================= */

function monthDaily(
  id,
  m = selectedMonth
) {

  return state()
    .daily
    .filter(
      x =>
        x.staffId === id &&
        x.month === m
    );
}


function monthOutletSales(
  id,
  m = selectedMonth
) {

  return state()
    .outletSales
    .filter(
      x =>
        x.staffId === id &&
        x.month === m
    );
}


function monthSkuSales(
  id,
  m = selectedMonth
) {

  return state()
    .skuSales
    .filter(
      x =>
        x.staffId === id &&
        x.month === m
    );
}


function monthPlans(
  id,
  m = selectedMonth
) {

  return state()
    .plans
    .filter(
      x =>
        x.staffId === id &&
        x.month === m
    );
}


function outletAch(
  id,
  name,
  m = selectedMonth
) {

  return monthOutletSales(
    id,
    m
  )
  .filter(
    x =>
      x.outletName ===
      name
  )
  .reduce(
    (
      a,
      x
    ) =>
      a +
      n(
        x.sales
      ),
    0
  );
}


function outletDaySales(
  id,
  name,
  d = selectedDay,
  m = selectedMonth
) {

  return monthOutletSales(
    id,
    m
  )
  .filter(
    x =>
      x.outletName ===
        name &&
      x.date === d
  )
  .reduce(
    (
      a,
      x
    ) =>
      a +
      n(
        x.sales
      ),
    0
  );
}


function skuAch(
  id,
  outlet,
  sku,
  m = selectedMonth
) {

  const a =
    monthSkuSales(
      id,
      m
    )
    .filter(
      x =>
        x.outletName ===
          outlet &&
        x.skuName ===
          sku
    );


  return {
    cartons:
      a.reduce(
        (
          s,
          x
        ) =>
          s +
          n(
            x.cartons
          ),
        0
      ),

    value:
      a.reduce(
        (
          s,
          x
        ) =>
          s +
          n(
            x.salesValue
          ),
        0
      )
  };
}


function routeSkuAch(
  id,
  sku,
  m = selectedMonth
) {

  const a =
    monthSkuSales(
      id,
      m
    )
    .filter(
      x =>
        x.skuName ===
          sku
    );


  return {
    cartons:
      a.reduce(
        (
          s,
          x
        ) =>
          s +
          n(
            x.cartons
          ),
        0
      ),

    value:
      a.reduce(
        (
          s,
          x
        ) =>
          s +
          n(
            x.salesValue
          ),
        0
      )
  };
}


function outletMonthTarget(
  id,
  name,
  m = selectedMonth
) {

  return n(
    monthPlans(
      id,
      m
    )
    .find(
      x =>
        x.outletName ===
        name
    )
    ?.outletTarget
  );
}


function metric(
  id,
  m = selectedMonth
) {

  const daily =
    monthDaily(
      id,
      m
    )
    .slice()
    .sort(
      (
        a,
        b
      ) =>
        String(
          a.date
        ).localeCompare(
          String(
            b.date
          )
        )
    );


  const os =
    monthOutletSales(
      id,
      m
    );


  const target =
    routeTarget(id);


  const ach =
    daily.reduce(
      (
        a,
        x
      ) =>
        a +
        n(
          x.todaySales
        ),
      0
    );


  const short =
    Math.max(
      0,
      target - ach
    );


  const prev =
    daily.reduce(
      (
        a,
        x
      ) =>
        a +
        n(
          x.lastMonthSameDay
        ),
      0
    );


  const growth =
    prev
      ? (
          (
            ach -
            prev
          ) /
          prev *
          100
        )
      : 0;


  const routeOutlets =
    outletsFor(id);


  const coveredKeys =
    new Set(
      os
        .filter(
          x =>
            n(
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


  return {
    daily,
    target,
    ach,
    short,
    prev,
    growth,
    routeOutlets,
    covered,
    zeroSales,

    coverage:
      routeOutlets.length
        ? covered.length /
          routeOutlets.length *
          100
        : 0,

    required:
      daysRemain(m)
        ? short /
          daysRemain(m)
        : short,

    todaySales:
      daily
        .filter(
          x =>
            x.date ===
            localDate()
        )
        .reduce(
          (
            a,
            x
          ) =>
            a +
            n(
              x.todaySales
            ),
          0
        )
  };
}


/* =========================================================
   SALARY
========================================================= */

function commission(
  ach,
  target
) {

  const p =
    target
      ? ach /
        target
      : 0;


  if (p < .8) {

    return ach *
      .005;
  }


  if (p <= 1) {

    return ach *
      .01;
  }


  return (
    target *
      .01 +

    (
      ach -
      target
    ) *
      .02
  );
}


function incomePlan(
  id,
  m = selectedMonth
) {

  return state()
    .incomePlans
    .find(
      x =>
        x.staffId ===
          id &&
        x.month ===
          m
    ) || {
      staffId:
        id,

      month:
        m,

      expected:
        0,

      growthActual:
        0,

      productManual:
        0,

      managerActual:
        0,

      otherActual:
        0
    };
}


function productRules(
  id,
  m = selectedMonth
) {

  return state()
    .incentives
    .filter(
      x =>
        x.staffId ===
          id &&
        x.month ===
          m &&
        x.type ===
          'PRODUCT'
    );
}


function incomeCalc(
  id,
  m = selectedMonth
) {

  const mt =
    metric(
      id,
      m
    );


  const r =
    D.salaryRules ||
    {};


  const p =
    incomePlan(
      id,
      m
    );


  const basic =
    n(
      r.basic ||
      1700
    );


  const fuel =
    n(
      r.fuel ||
      300
    );


  const rent =
    n(
      r.houseRent ||
      250
    );


  const food =
    mt.ach >=
    n(
      r.foodThreshold ||
      50000
    )
      ? n(
          r.foodHigh ||
          250
        )
      : n(
          r.foodLow ||
          100
        );


  let zero =
    0;


  if (
    mt.routeOutlets.length &&
    mt.zeroSales.length ===
      0
  ) {

    zero =
      (
        mt.ach /
        mt.target
      ) >= .8
        ? n(
            r.zeroSalesHigh ||
            200
          )
        : n(
            r.zeroSalesLow ||
            100
          );
  }


  const comm =
    commission(
      mt.ach,
      mt.target
    );


  const product =
    productRules(
      id,
      m
    )
    .reduce(
      (
        a,
        i
      ) =>
        a +
        (
          routeSkuAch(
            id,
            i.skuName,
            m
          ).cartons >=
          n(
            i.targetQty
          )
            ? n(
                i.reward
              )
            : 0
        ),
      0
    ) +
    n(
      p.productManual
    );


  const growth =
    n(
      p.growthActual
    );


  const manager =
    n(
      p.managerActual
    );


  const other =
    n(
      p.otherActual
    );


  const total =
    basic +
    fuel +
    rent +
    food +
    zero +
    comm +
    product +
    growth +
    manager +
    other;


  return {
    basic,
    fuel,
    rent,
    food,
    zero,
    comm,
    product,
    growth,
    manager,
    other,
    total,
    expected:
      n(
        p.expected
      )
  };
}


/* =========================================================
   UI HELPERS
========================================================= */

function kpi(
  l,
  v,
  s,
  c = ''
) {

  return `
    <div class="kpi">

      <div class="label">
        ${esc(l)}
      </div>

      <div class="value ${c}">
        ${esc(v)}
      </div>

      <div class="sub">
        ${esc(s)}
      </div>

    </div>
  `;
}


function incomeRow(
  l,
  v,
  strong = false
) {

  return `
    <div
      class="row"
      style="padding:8px 0"
    >

      <span class="muted">
        ${esc(l)}
      </span>

      <${strong
        ? 'strong'
        : 'span'
      }>
        ${money(v)}
      </${strong
        ? 'strong'
        : 'span'
      }>

    </div>
  `;
}


function summaryTable(
  title,
  heads,
  rows
) {

  return `
    <div
      class="card"
      style="
        margin-top:12px;
        overflow:auto
      "
    >

      <h3>
        ${esc(title)}
      </h3>

      <table
        class="summary-table"
        style="
          min-width:${
            Math.max(
              620,
              heads.length *
              120
            )
          }px
        "
      >

        <thead>

          <tr>

            ${
              heads
                .map(
                  h => `
                    <th>
                      ${esc(h)}
                    </th>
                  `
                )
                .join('')
            }

          </tr>

        </thead>

        <tbody>

          ${
            rows.length

              ? rows
                  .map(
                    r => `
                      <tr>
                        ${
                          r.map(
                            c => `
                              <td>
                                ${esc(c)}
                              </td>
                            `
                          )
                          .join('')
                        }
                      </tr>
                    `
                  )
                  .join('')

              : `
                  <tr>
                    <td
                      colspan="${heads.length}"
                    >
                      No data
                    </td>
                  </tr>
                `
          }

        </tbody>

      </table>

    </div>
  `;
}


/* =========================================================
   MONTH / MANAGER BAR
========================================================= */

function monthBar() {

  return `
    <div class="monthbar">

      <label
        style="
          margin:0;
          flex:1;
          min-width:145px
        "
      >

        Month

        <input
          id="monthPick"
          type="month"
          value="${selectedMonth}"
        >

      </label>


      ${
        String(
          session?.role ||
          ''
        ).includes(
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
              style="
                margin-bottom:12px
              "
            >

              <label>

                View Sales Representative

                <select
                  id="managerPick"
                >

                  ${
                    salesUsers()
                      .map(
                        u => `
                          <option
                            value="${u.id}"
                            ${
                              uid() ===
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

  if (
    $('#monthPick')
  ) {

    $('#monthPick')
      .onchange =
        async e => {

          selectedMonth =
            e.target.value;

          if (
            selectedDay
              .slice(
                0,
                7
              ) !==
            selectedMonth
          ) {

            selectedDay =
              selectedMonth +
              '-01';
          }

          await syncCurrent(
            false
          );

          render();
        };
  }


  if (
    $('#srMode')
  ) {

    $('#srMode')
      .onclick =
        async () => {

          session.mode =
            'sr';

          managerView =
            session.id;

          localStorage
            .setItem(
              SESSION,
              JSON.stringify(
                session
              )
            );

          page =
            'dashboard';

          await syncCloud(
            uid(),
            selectedMonth
          );

          render();
        };
  }


  if (
    $('#mgrMode')
  ) {

    $('#mgrMode')
      .onclick =
        async () => {

          session.mode =
            'manager';

          managerView =
            'M21954';

          localStorage
            .setItem(
              SESSION,
              JSON.stringify(
                session
              )
            );

          page =
            'team';

          await syncAllTeam();

          render();
        };
  }


  if (
    $('#managerPick')
  ) {

    $('#managerPick')
      .onchange =
        async e => {

          managerView =
            e.target.value;

          await syncCloud(
            managerView,
            selectedMonth
          );

          render();
        };
  }


  $$('[data-go]')
    .forEach(
      b =>
        b.onclick =
          () => {

            page =
              b.dataset.go;

            render();
          }
    );
}


/* =========================================================
   APP SHELL
========================================================= */

function installShell() {

  const old =
    $('#logoutBtn');


  if (old) {

    old.textContent =
      '⚙';

    old.title =
      'Settings';

    old.onclick =
      () => {

        page =
          'settings';

        render();
      };
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
      document
        .createElement(
          'button'
        );

    b.dataset.page =
      'proposal';

    b.innerHTML =
      '<span class="nav-icon">▤</span><small>PO Form</small>';

    nav.appendChild(b);

    nav.style
      .gridTemplateColumns =
        'repeat(6,1fr)';
  }


  const app =
    $('#appView');


  if (
    app &&
    !$('#developerCredit')
  ) {

    const c =
      document
        .createElement(
          'div'
        );

    c.id =
      'developerCredit';

    c.style.cssText =
      'text-align:center;font-size:10px;color:#77818d;padding:6px 8px 84px';


    c.innerHTML = `
      Developed by
      <a
        href="https://mehedialimayon-del.github.io/MEHEDI-ALIM-AYON-PORTFOLIO/"
        target="_blank"
        rel="noopener"
        style="
          color:#ff9b51;
          text-decoration:none;
          font-weight:800
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


function refreshTop() {

  if (!session) return;


  const viewed =
    user(
      uid()
    );


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
    $('#welcomeName')
  ) {

    $('#welcomeName')
      .textContent =
        session.mode ===
          'manager'

          ? `Manager • ${viewed?.name || uid()}`

          : session.name;
  }
}


/* =========================================================
   LOGIN
========================================================= */

async function login(
  v,
  p
) {

  const raw =
    String(
      v ||
      ''
    ).trim();


  const sid =
    raw.toLowerCase() ===
      'manager'

      ? 'M21954'

      : raw.toUpperCase();


  const u =
    user(sid);


  if (
    !u ||
    String(
      p ||
      ''
    )
    .trim()
    .toUpperCase() !==
    sid
  ) {

    toast(
      'Wrong Staff ID / Password'
    );

    return;
  }


  session = {
    ...u,

    password:
      sid,

    mode:
      raw.toLowerCase() ===
        'manager'
        ? 'manager'
        : 'sr'
  };


  managerView =
    session.mode ===
      'manager'
      ? 'M21954'
      : sid;


  page =
    session.mode ===
      'manager'
      ? 'team'
      : 'dashboard';


  localStorage
    .setItem(
      SESSION,
      JSON.stringify(
        session
      )
    );


  openApp();


  await initPush();


  await syncCurrent(
    false
  );


  render();
}


function logout() {

  localStorage
    .removeItem(
      SESSION
    );


  session =
    null;


  page =
    'dashboard';


  if (
    liveSyncTimer
  ) {

    clearInterval(
      liveSyncTimer
    );
  }


  $('#appView')
    ?.classList
    .add(
      'hidden'
    );


  $('#loginView')
    ?.classList
    .remove(
      'hidden'
    );


  if (
    $('#loginPin')
  ) {

    $('#loginPin')
      .value =
        '';
  }


  if (
    oneSignalSdk
  ) {

    oneSignalSdk
      .logout()
      .catch(
        () => {}
      );
  }
}


function openApp() {

  $('#loginView')
    ?.classList
    .add(
      'hidden'
    );


  $('#appView')
    ?.classList
    .remove(
      'hidden'
    );


  installShell();

  refreshTop();

  render();

  startLiveSync();
}


/* =========================================================
   AUTOMATIC LIVE SYNC
========================================================= */

function startLiveSync() {

  if (
    liveSyncTimer
  ) {

    clearInterval(
      liveSyncTimer
    );
  }


  liveSyncTimer =
    setInterval(
      async () => {

        if (
          !session ||
          document.hidden ||
          !backendUrl()
        ) {
          return;
        }


        await syncCurrent(
          false
        );


        if (
          [
            'dashboard',
            'team',
            'summary',
            'zero',
            'tasks'
          ].includes(
            page
          )
        ) {

          render();
        }

      },
      30000
    );
}


/* =========================================================
   RENDER ROUTER
========================================================= */

function render() {

  if (!session) return;


  installShell();

  refreshTop();


  $$(
    '#bottomNav button[data-page]'
  ).forEach(
    b =>
      b.classList
        .toggle(
          'active',
          b.dataset.page ===
            page
        )
  );


  const map = {
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
      renderZero,

    sku:
      renderSku,

    team:
      renderTeam,

    proposal:
      renderProposal,

    notifications:
      renderNotifications,

    settings:
      renderSettings
  };


  (
    map[
      page
    ] ||
    renderDashboard
  )();
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const id =
    uid();


  const m =
    metric(id);


  const inc =
    incomeCalc(id);


  const pct =
    m.target
      ? m.ach /
        m.target *
        100
      : 0;


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}

      <section class="hero">

        <p class="eyebrow">
          ${monthName(selectedMonth).toUpperCase()}
        </p>

        <h3>
          ${esc(user(id)?.name || id)}
        </h3>

        <p class="muted">

          ${money(m.ach)}
          achieved from
          ${money(m.target)}
          target.

        </p>


        <div class="progress-wrap">

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
              width:${Math.min(100,pct)}%
            "
          >
          </div>

        </div>


        <button
          id="dashSync"
          class="btn secondary"
          style="margin-top:12px"
        >
          ↻ REFRESH LIVE DATA
        </button>

      </section>


      <div class="grid kpi-grid">

        ${kpi(
          'TARGET',
          money(m.target),
          'Monthly route target'
        )}

        ${kpi(
          'ACHIEVEMENT',
          money(m.ach),
          'Month-to-date',
          m.ach >= m.target
            ? 'good'
            : ''
        )}

        ${kpi(
          'SHORTFALL',
          money(m.short),
          'Remaining',
          m.short
            ? 'bad'
            : 'good'
        )}

        ${kpi(
          'NEED / DAY',
          money(m.required),
          `${daysRemain(selectedMonth)} day(s) left`,
          m.short
            ? 'warn'
            : 'good'
        )}

        ${kpi(
          'TODAY SALES',
          money(m.todaySales),
          dateLabel(localDate())
        )}

        ${kpi(
          'GROWTH',
          `${
            m.growth >= 0
              ? '+'
              : ''
          }${m.growth.toFixed(1)}%`,
          'Vs comparable month',
          m.growth >= 0
            ? 'good'
            : 'bad'
        )}

        ${kpi(
          'OUTLET COVERAGE',
          `${m.coverage.toFixed(0)}%`,
          `${m.covered.length}/${m.routeOutlets.length} outlets`,
          m.coverage >= 100
            ? 'good'
            : 'bad'
        )}

        ${kpi(
          'PROJECTED SALARY',
          money(inc.total),
          'Salary + incentives'
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
          data-go="daily"
        >
          ➕ Add Sales
        </button>

        <button
          class="btn secondary"
          data-go="planning"
        >
          🎯 Monthly Plan
        </button>

        <button
          class="btn secondary"
          data-go="zero"
        >
          🏪 Outlet Report
        </button>

        <button
          class="btn secondary"
          data-go="sku"
        >
          📦 SKU Performance
        </button>

        <button
          class="btn secondary"
          data-go="tasks"
        >
          ✅ Tasks
        </button>

        ${
          session.mode ===
            'manager'

            ? `
                <button
                  class="btn secondary"
                  data-go="team"
                >
                  👥 Team Control
                </button>
              `

            : ''
        }

      </div>
    `;


  bindCommon();


  $('#dashSync')
    .onclick =
      async () => {

        await syncCurrent(
          true
        );

        render();
      };
}


/* =========================================================
   DAILY SALES
========================================================= */

function renderDaily() {

  const id =
    uid();


  if (
    session.mode ===
      'manager'
  ) {

    $('#mainContent')
      .innerHTML = `

        ${monthBar()}

        <div class="card">

          <h2>
            Manager mode is view-only
          </h2>

          <p class="muted">

            Switch to My SR
            to enter your own sales.

          </p>

        </div>
      `;


    bindCommon();

    return;
  }


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div class="card">

        <p class="eyebrow">
          STEP 1
        </p>

        <h2>
          Daily Route Total
        </h2>


        <form
          id="dailyForm"
          class="stack"
        >

          <label>

            Date

            <input
              name="date"
              type="date"
              value="${localDate()}"
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

              Prepare for Trip (RM)

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

            <textarea
              name="note"
            ></textarea>

          </label>


          <button
            class="btn primary"
          >
            SAVE DAILY TOTAL
          </button>

        </form>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <p class="eyebrow">
          STEP 2
        </p>

        <h2>
          Outlet & SKU Sale
        </h2>


        <form
          id="saleForm"
          class="stack"
        >

          <label>

            Date

            <input
              name="date"
              type="date"
              value="${localDate()}"
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
              ${outletOptions(id)}
            </select>

          </label>


          <label>

            Outlet Sales (RM)

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
              name="skuName"
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

            <textarea
              name="note"
            ></textarea>

          </label>


          <button
            class="btn primary"
          >
            SAVE OUTLET / SKU SALE
          </button>

        </form>

      </div>
    `;


  bindCommon();


  const oSearch =
    $('#outletSearch');

  const oSel =
    $('#outletSel');

  const sSearch =
    $('#skuSearch');

  const sSel =
    $('#skuSel');


  function refreshOut() {

    const before =
      oSel.value;


    oSel.innerHTML =
      outletOptions(
        id,
        before,
        oSearch.value
      );


    if (
      [...oSel.options]
        .some(
          o =>
            o.value ===
            before
        )
    ) {

      oSel.value =
        before;
    }


    refreshSku();
  }


  function refreshSku() {

    if (
      !oSel.value
    ) {

      sSel.innerHTML =
        '<option value="">Select outlet first</option>';

      return;
    }


    const before =
      sSel.value;


    sSel.innerHTML =
      skuOptions(
        id,
        oSel.value,
        before,
        sSearch.value
      );


    if (
      [...sSel.options]
        .some(
          o =>
            o.value ===
            before
        )
    ) {

      sSel.value =
        before;
    }
  }


  oSearch.oninput =
    refreshOut;


  oSel.onchange =
    () => {

      sSearch.value =
        '';

      refreshSku();
    };


  sSearch.oninput =
    refreshSku;


  refreshSku();


  $('#dailyForm')
    .onsubmit =
      async e => {

        e.preventDefault();


        const fd =
          new FormData(
            e.target
          );


        const date =
          String(
            fd.get(
              'date'
            )
          );


        const month =
          date.slice(
            0,
            7
          );


        const s =
          state();


        s.daily =
          s.daily
            .filter(
              x =>
                !(
                  x.staffId ===
                    id &&
                  x.date ===
                    date
                )
            );


        const rec = {
          id:
            idGen(),

          staffId:
            id,

          month,

          date,

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
              fd.get(
                'note'
              ) || ''
            )
        };


        s.daily
          .push(rec);


        save(s);


        selectedMonth =
          month;

        selectedDay =
          date;


        const r =
          await pushCloud(
            'saveDaily',
            rec
          );


        toast(
          r?.ok
            ? 'Daily total saved to cloud'
            : 'Saved locally • cloud failed'
        );


        render();
      };


  $('#saleForm')
    .onsubmit =
      async e => {

        e.preventDefault();


        const fd =
          new FormData(
            e.target
          );


        const date =
          String(
            fd.get(
              'date'
            )
          );


        const month =
          date.slice(
            0,
            7
          );


        const outletName =
          String(
            fd.get(
              'outlet'
            ) || ''
          );


        const o =
          outletsFor(id)
            .find(
              x =>
                x.name ===
                outletName
            );


        if (!o) {

          toast(
            'Select an outlet'
          );

          return;
        }


        const s =
          state();


        const outRec = {
          id:
            idGen(),

          staffId:
            id,

          month,

          date,

          outletCode:
            o.code || '',

          outletName,

          sales:
            n(
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


        s.outletSales
          .push(
            outRec
          );


        const skuName =
          String(
            fd.get(
              'skuName'
            ) || ''
          ).trim();


        let skuRec =
          null;


        if (
          skuName
        ) {

          skuRec = {
            id:
              idGen(),

            staffId:
              id,

            month,

            date,

            outletCode:
              o.code || '',

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
          };


          s.skuSales
            .push(
              skuRec
            );
        }


        save(s);


        selectedMonth =
          month;

        selectedDay =
          date;


        const a =
          await pushCloud(
            'saveOutlet',
            outRec
          );


        let b = {
          ok: true
        };


        if (
          skuRec
        ) {

          b =
            await pushCloud(
              'saveSku',
              skuRec
            );
        }


        toast(
          a?.ok &&
          b?.ok

            ? 'Outlet/SKU sale saved to cloud'

            : 'Saved locally • cloud failed'
        );


        render();
      };
}


/* =========================================================
   PLANNING
========================================================= */

function planningHtml(id) {

  const plans =
    monthPlans(id);


  return plans.length

    ? `
        <div class="list">

          ${
            plans
              .map(
                p => {

                  const a =
                    outletAch(
                      id,
                      p.outletName
                    );


                  const sf =
                    Math.max(
                      0,
                      p.outletTarget -
                      a
                    );


                  return `
                    <div class="card">

                      <div class="row">

                        <div>

                          <h3>
                            ${esc(p.outletName)}
                          </h3>

                          <p class="muted">

                            Target
                            ${money(p.outletTarget)}
                            •

                            Actual
                            ${money(a)}

                          </p>

                        </div>


                        <span
                          class="
                            pill
                            ${
                              sf
                                ? 'red'
                                : 'green'
                            }
                          "
                        >
                          ${
                            sf
                              ? money(sf) +
                                ' short'
                              : 'Achieved'
                          }
                        </span>

                      </div>


                      ${
                        (
                          p.targetSkus ||
                          []
                        )
                        .map(
                          sku => {

                            const t =
                              p.skuTargets?.[
                                sku
                              ] || {};


                            const x =
                              skuAch(
                                id,
                                p.outletName,
                                sku
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

                                  ${x.cartons}
                                  /
                                  ${n(t.cartons)}
                                  CTN

                                  •

                                  ${money(x.value)}
                                  /
                                  ${money(t.value)}

                                </p>

                              </div>
                            `;
                          }
                        )
                        .join('')
                      }

                    </div>
                  `;
                }
              )
              .join('')
          }

        </div>
      `

    : `
        <div class="empty">
          No monthly plan yet.
        </div>
      `;
}


function renderPlanning() {

  const id =
    uid();


  if (
    session.mode ===
      'manager'
  ) {

    $('#mainContent')
      .innerHTML = `

        ${monthBar()}

        ${planningHtml(id)}
      `;


    bindCommon();

    return;
  }


  selectedSkus =
    [];


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


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
            >

          </label>


          <label>

            Select Outlet

            <select
              id="planOutlet"
              name="outlet"
              required
            >
              ${outletOptions(id)}
            </select>

          </label>


          <label>

            Outlet Monthly Target (RM)

            <input
              name="outletTarget"
              type="number"
              min="0"
              step="0.01"
              value="0"
              required
            >

          </label>


          <label>

            Target SKU Count

            <input
              id="targetSkuCount"
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
            >

          </label>


          <label>

            Select SKU

            <select
              id="planSkuSelect"
            >

              <option value="">
                Select outlet first
              </option>

            </select>

          </label>


          <button
            type="button"
            id="addSkuBtn"
            class="btn secondary"
          >
            + ADD SELECTED SKU
          </button>


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
            SAVE MONTHLY PLAN
          </button>

        </form>

      </div>


      <div class="section-title">

        <h3>
          Plan vs Achievement
        </h3>

      </div>


      ${planningHtml(id)}
    `;


  bindCommon();


  const oSearch =
    $('#planOutletSearch');

  const oSel =
    $('#planOutlet');

  const q =
    $('#planSkuSearch');

  const skuSel =
    $('#planSkuSelect');

  const chips =
    $('#chosenSkus');

  const inputs =
    $('#skuTargetInputs');


  function refreshOut() {

    const before =
      oSel.value;


    oSel.innerHTML =
      outletOptions(
        id,
        before,
        oSearch.value
      );


    if (
      [...oSel.options]
        .some(
          o =>
            o.value ===
            before
        )
    ) {

      oSel.value =
        before;
    }


    refreshSku();
  }


  function refreshSku() {

    if (
      !oSel.value
    ) {

      skuSel.innerHTML =
        '<option value="">Select outlet first</option>';

      return;
    }


    const list =
      productsForOutlet(
        id,
        oSel.value
      )
      .filter(
        x =>
          (
            !q.value ||
            x
              .toLowerCase()
              .includes(
                q.value
                  .toLowerCase()
              )
          ) &&
          !selectedSkus
            .includes(x)
      );


    skuSel.innerHTML =
      '<option value="">Select SKU</option>' +

      list
        .map(
          x => `
            <option value="${esc(x)}">
              ${esc(x)}
            </option>
          `
        )
        .join('');
  }


  function paint() {

    chips.innerHTML =
      selectedSkus
        .map(
          x => `
            <span class="chip">

              ${esc(x)}

              <button
                type="button"
                data-rm="${esc(x)}"
              >
                ×
              </button>

            </span>
          `
        )
        .join('');


    inputs.innerHTML =
      selectedSkus
        .map(
          (
            x,
            i
          ) => `
            <div class="list-item">

              <h4>
                ${i + 1}.
                ${esc(x)}
              </h4>


              <div class="form-grid">

                <label>

                  Target Cartons

                  <input
                    data-c="${esc(x)}"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                  >

                </label>


                <label>

                  Target Sales Value (RM)

                  <input
                    data-v="${esc(x)}"
                    type="number"
                    min="0"
                    step="0.01"
                    value="0"
                  >

                </label>

              </div>

            </div>
          `
        )
        .join('');


    $$('[data-rm]')
      .forEach(
        b =>
          b.onclick =
            () => {

              selectedSkus =
                selectedSkus
                  .filter(
                    x =>
                      x !==
                      b.dataset.rm
                  );

              paint();

              refreshSku();
            }
      );
  }


  oSearch.oninput =
    refreshOut;


  oSel.onchange =
    () => {

      selectedSkus =
        [];

      paint();

      refreshSku();
    };


  q.oninput =
    refreshSku;


  $('#addSkuBtn')
    .onclick =
      () => {

        if (
          !skuSel.value
        ) {

          toast(
            'Select a SKU'
          );

          return;
        }


        const max =
          n(
            $('#targetSkuCount')
              .value
          );


        if (
          max &&
          selectedSkus.length >=
            max
        ) {

          toast(
            `Maximum ${max} SKU(s)`
          );

          return;
        }


        selectedSkus
          .push(
            skuSel.value
          );


        paint();

        refreshSku();
      };


  refreshSku();


  $('#planForm')
    .onsubmit =
      async e => {

        e.preventDefault();


        const fd =
          new FormData(
            e.target
          );


        const name =
          String(
            fd.get(
              'outlet'
            ) || ''
          );


        const o =
          outletsFor(id)
            .find(
              x =>
                x.name ===
                name
            );


        if (!o) {

          toast(
            'Select outlet'
          );

          return;
        }


        const skuTargets =
          {};


        selectedSkus
          .forEach(
            x => {

              skuTargets[
                x
              ] = {

                cartons:
                  n(
                    document
                      .querySelector(
                        `[data-c="${CSS.escape(x)}"]`
                      )
                      ?.value
                  ),

                value:
                  n(
                    document
                      .querySelector(
                        `[data-v="${CSS.escape(x)}"]`
                      )
                      ?.value
                  )
              };
            }
          );


        const rec = {
          id:
            idGen(),

          staffId:
            id,

          month:
            selectedMonth,

          outletCode:
            o.code || '',

          outletName:
            name,

          outletTarget:
            n(
              fd.get(
                'outletTarget'
              )
            ),

          targetSkuCount:
            n(
              fd.get(
                'targetSkuCount'
              )
            ) ||
            selectedSkus.length,

          targetSkus:
            [
              ...selectedSkus
            ],

          skuTargets
        };


        const s =
          state();


        s.plans =
          s.plans
            .filter(
              x =>
                !(
                  x.staffId ===
                    id &&
                  x.month ===
                    selectedMonth &&
                  x.outletName ===
                    name
                )
            );


        s.plans
          .push(rec);


        save(s);


        const r =
          await pushCloud(
            'savePlan',
            {
              month:
                selectedMonth,

              routeTarget:
                routeTarget(id),

              outletCode:
                rec.outletCode,

              outletName:
                name,

              outletTarget:
                rec.outletTarget,

              targetedSkuCount:
                rec.targetSkuCount,

              targetSkus:
                rec.targetSkus
                  .map(
                    k => ({
                      name:
                        k,

                      ...rec.skuTargets[
                        k
                      ]
                    })
                  ),

              skuSalesPlan:
                rec.targetSkus
                  .reduce(
                    (
                      a,
                      k
                    ) =>
                      a +
                      n(
                        rec.skuTargets[
                          k
                        ]?.value
                      ),
                    0
                  )
            }
          );


        toast(
          r?.ok
            ? 'Monthly plan saved'
            : 'Saved locally • cloud failed'
        );


        render();
      };
}


/* =========================================================
   INCOME
========================================================= */

function renderIncome() {

  const id =
    uid();


  const inc =
    incomeCalc(id);


  const p =
    incomePlan(id);


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div class="hero">

        <p class="eyebrow">
          PROJECTED INCOME
        </p>

        <div class="salary-total">
          ${money(inc.total)}
        </div>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        ${incomeRow(
          'Basic Salary',
          inc.basic
        )}

        ${incomeRow(
          'Fuel / Oil',
          inc.fuel
        )}

        ${incomeRow(
          'House Rent',
          inc.rent
        )}

        ${incomeRow(
          'Food Allowance',
          inc.food
        )}

        ${incomeRow(
          'Sales Commission',
          inc.comm
        )}

        ${incomeRow(
          'Zero Sales Incentive',
          inc.zero
        )}

        ${incomeRow(
          'Product Incentive',
          inc.product
        )}

        ${incomeRow(
          'Growth Incentive',
          inc.growth
        )}

        ${incomeRow(
          'Manager Incentive',
          inc.manager
        )}

        ${incomeRow(
          'Other Incentive',
          inc.other
        )}


        <hr
          style="
            border:0;
            border-top:1px solid var(--line)
          "
        >


        ${incomeRow(
          'TOTAL PROJECTED',
          inc.total,
          true
        )}

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <form
          id="incomeForm"
          class="stack"
        >

          <label>

            Expected Total Income (RM)

            <input
              name="expected"
              type="number"
              value="${p.expected}"
            >

          </label>


          <label>

            Growth Incentive Actual (RM)

            <input
              name="growthActual"
              type="number"
              value="${p.growthActual}"
            >

          </label>


          <label>

            Manual Product Incentive (RM)

            <input
              name="productManual"
              type="number"
              value="${p.productManual}"
            >

          </label>


          <label>

            Manager Incentive Actual (RM)

            <input
              name="managerActual"
              type="number"
              value="${p.managerActual}"
            >

          </label>


          <label>

            Other Incentive Actual (RM)

            <input
              name="otherActual"
              type="number"
              value="${p.otherActual}"
            >

          </label>


          <button
            class="btn primary"
          >
            SAVE INCOME DETAILS
          </button>

        </form>

      </div>
    `;


  bindCommon();


  $('#incomeForm')
    .onsubmit =
      async e => {

        e.preventDefault();


        const fd =
          new FormData(
            e.target
          );


        const rec = {
          staffId:
            id,

          month:
            selectedMonth,

          expected:
            n(
              fd.get(
                'expected'
              )
            ),

          growthActual:
            n(
              fd.get(
                'growthActual'
              )
            ),

          productManual:
            n(
              fd.get(
                'productManual'
              )
            ),

          managerActual:
            n(
              fd.get(
                'managerActual'
              )
            ),

          otherActual:
            n(
              fd.get(
                'otherActual'
              )
            )
        };


        const s =
          state();


        s.incomePlans =
          s.incomePlans
            .filter(
              x =>
                !(
                  x.staffId ===
                    id &&
                  x.month ===
                    selectedMonth
                )
            );


        s.incomePlans
          .push(rec);


        save(s);


        await pushCloud(
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
}


/* =========================================================
   SUMMARY — MONTH / SPECIFIC DAY
========================================================= */

function renderSummary() {

  const id =
    uid();


  const m =
    metric(id);


  const inc =
    incomeCalc(id);


  const dayMode =
    summaryMode ===
      'day';


  const daily =
    dayMode

      ? monthDaily(id)
          .filter(
            x =>
              x.date ===
              selectedDay
          )

      : monthDaily(id);


  const os =
    dayMode

      ? monthOutletSales(id)
          .filter(
            x =>
              x.date ===
              selectedDay
          )

      : monthOutletSales(id);


  const ss =
    dayMode

      ? monthSkuSales(id)
          .filter(
            x =>
              x.date ===
              selectedDay
          )

      : monthSkuSales(id);


  const show =
    dayMode

      ? daily.reduce(
          (
            a,
            x
          ) =>
            a +
            n(
              x.todaySales
            ),
          0
        )

      : m.ach;


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div
        class="card"
        style="margin-bottom:12px"
      >

        <div class="form-grid">

          <label>

            View Mode

            <select
              id="summaryMode"
            >

              <option
                value="month"
                ${
                  summaryMode ===
                    'month'
                    ? 'selected'
                    : ''
                }
              >
                Whole Month
              </option>

              <option
                value="day"
                ${
                  summaryMode ===
                    'day'
                    ? 'selected'
                    : ''
                }
              >
                Specific Day
              </option>

            </select>

          </label>


          <label>

            Date

            <input
              id="summaryDay"
              type="date"
              value="${selectedDay}"
              ${
                summaryMode ===
                  'month'
                  ? 'disabled'
                  : ''
              }
            >

          </label>

        </div>

      </div>


      <div class="hero">

        <p class="eyebrow">
          ${
            dayMode
              ? 'DAILY DATABASE'
              : 'COMPLETE MONTHLY SUMMARY'
          }
        </p>

        <h3>
          ${esc(user(id)?.name || id)}
        </h3>

        <p class="muted">

          ${
            dayMode
              ? dateLabel(selectedDay)
              : monthName(selectedMonth)
          }

        </p>


        <button
          id="summarySync"
          class="btn secondary"
          style="margin-top:10px"
        >
          ↻ REFRESH LIVE DATA
        </button>

      </div>


      <div class="grid kpi-grid">

        ${kpi(
          dayMode
            ? 'DAY SALES'
            : 'TOTAL SALES',
          money(show),
          dayMode
            ? 'Selected date'
            : 'MTD'
        )}

        ${kpi(
          'MONTH TARGET',
          money(m.target),
          monthName(selectedMonth)
        )}

        ${kpi(
          'MONTH ACHIEVEMENT',
          money(m.ach),
          `${
            (
              m.target
                ? m.ach /
                  m.target *
                  100
                : 0
            ).toFixed(1)
          }%`
        )}

        ${kpi(
          'SHORTFALL',
          money(m.short),
          'Remaining',
          m.short
            ? 'bad'
            : 'good'
        )}

        ${kpi(
          'COVERAGE',
          `${m.coverage.toFixed(0)}%`,
          `${m.covered.length}/${m.routeOutlets.length}`
        )}

        ${kpi(
          'PROJECTED SALARY',
          money(inc.total),
          'Current'
        )}

      </div>


      ${summaryTable(
        'Daily Sales',
        [
          'Date',
          'Sales',
          'Last Month',
          'Active',
          'Prepare Trip',
          'Order'
        ],
        daily.map(
          x => [
            x.date,
            money(
              x.todaySales
            ),
            money(
              x.lastMonthSameDay
            ),
            money(
              x.active
            ),
            money(
              x.prepareTrip
            ),
            money(
              x.orderAmount
            )
          ]
        )
      )}


      ${summaryTable(
        'Outlet Sales',
        [
          'Date',
          'Outlet',
          'Sales',
          'Note'
        ],
        os.map(
          x => [
            x.date,
            x.outletName,
            money(
              x.sales
            ),
            x.note ||
            ''
          ]
        )
      )}


      ${summaryTable(
        'SKU Sales',
        [
          'Date',
          'Outlet',
          'SKU',
          'Cartons',
          'Value'
        ],
        ss.map(
          x => [
            x.date,
            x.outletName,
            x.skuName,
            String(
              x.cartons
            ),
            money(
              x.salesValue
            )
          ]
        )
      )}


      <div
        class="card"
        style="margin-top:12px"
      >

        <button
          id="xlsx"
          class="btn primary"
        >
          DOWNLOAD REAL EXCEL (.xlsx)
        </button>

      </div>
    `;


  bindCommon();


  $('#summaryMode')
    .onchange =
      e => {

        summaryMode =
          e.target.value;

        render();
      };


  $('#summaryDay')
    .onchange =
      e => {

        selectedDay =
          e.target.value ||
          localDate();

        selectedMonth =
          selectedDay.slice(
            0,
            7
          );

        render();
      };


  $('#summarySync')
    .onclick =
      async () => {

        await syncCurrent(
          true
        );

        render();
      };


  $('#xlsx')
    .onclick =
      () =>
        exportXlsx(id);
}


/* =========================================================
   OUTLET / ZERO SALES REPORT
========================================================= */

function renderZero() {

  const id =
    uid();


  const m =
    metric(id);


  const rows =
    m.routeOutlets
      .map(
        o => ({
          o,

          day:
            outletDaySales(
              id,
              o.name,
              selectedDay
            ),

          mtd:
            outletAch(
              id,
              o.name
            ),

          target:
            outletMonthTarget(
              id,
              o.name
            )
        })
      );


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div
        class="card"
        style="margin-bottom:12px"
      >

        <label>

          Report Date

          <input
            id="zeroDate"
            type="date"
            value="${selectedDay}"
          >

        </label>

      </div>


      <div class="hero">

        <p class="eyebrow">
          OUTLET SALES / ZERO SALES REPORT
        </p>

        <h3>
          ${dateLabel(selectedDay)}
        </h3>

        <p class="muted">

          Every route outlet stays visible
          with daily sale,
          MTD sale and monthly outlet target.

        </p>


        <button
          id="zeroSync"
          class="btn secondary"
          style="margin-top:10px"
        >
          ↻ REFRESH LIVE DATA
        </button>

      </div>


      <div
        class="list"
        style="margin-top:12px"
      >

        ${
          rows
            .map(
              x => `

                <div class="list-item">

                  <div class="row">

                    <div>

                      <h4>
                        ${esc(x.o.name)}
                      </h4>

                      <p>

                        ${esc(
                          x.o.category ||
                          'Other'
                        )}

                        •

                        ${esc(
                          x.o.code ||
                          'No code'
                        )}

                      </p>


                      <p
                        style="margin-top:6px"
                      >

                        <strong
                          style="color:#fff"
                        >
                          Today
                          ${money(x.day)}
                        </strong>

                        •

                        MTD
                        ${money(x.mtd)}

                        •

                        Target
                        ${
                          x.target
                            ? money(x.target)
                            : 'Not set'
                        }

                      </p>

                    </div>


                    <span
                      class="
                        pill
                        ${
                          x.day > 0
                            ? 'green'
                            : 'red'
                        }
                      "
                    >
                      ${
                        x.day > 0
                          ? 'SALE'
                          : 'ZERO'
                      }
                    </span>

                  </div>

                </div>
              `
            )
            .join('')
        }

      </div>
    `;


  bindCommon();


  $('#zeroDate')
    .onchange =
      e => {

        selectedDay =
          e.target.value ||
          localDate();

        selectedMonth =
          selectedDay.slice(
            0,
            7
          );

        render();
      };


  $('#zeroSync')
    .onclick =
      async () => {

        await syncCurrent(
          true
        );

        render();
      };
}


/* =========================================================
   SKU PERFORMANCE
========================================================= */

function renderSku() {

  const id =
    uid();


  const plans =
    monthPlans(id);


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div class="card">

        <h2>
          SKU Target vs Actual
        </h2>

      </div>


      <div
        class="list"
        style="margin-top:12px"
      >

        ${
          plans.length

            ? plans
                .map(
                  p => `

                    <div class="card">

                      <h3>
                        ${esc(p.outletName)}
                      </h3>


                      ${
                        (
                          p.targetSkus ||
                          []
                        )
                        .map(
                          sku => {

                            const t =
                              p.skuTargets?.[
                                sku
                              ] ||
                              {};


                            const a =
                              skuAch(
                                id,
                                p.outletName,
                                sku
                              );


                            const left =
                              Math.max(
                                0,
                                n(
                                  t.cartons
                                ) -
                                a.cartons
                              );


                            return `

                              <div class="list-item">

                                <div class="row">

                                  <div>

                                    <h4>
                                      ${esc(sku)}
                                    </h4>

                                    <p>

                                      ${a.cartons}
                                      /
                                      ${n(t.cartons)}
                                      CTN

                                      •

                                      ${money(a.value)}
                                      /
                                      ${money(t.value)}

                                    </p>

                                  </div>


                                  <span
                                    class="
                                      pill
                                      ${
                                        left
                                          ? 'red'
                                          : 'green'
                                      }
                                    "
                                  >
                                    ${
                                      left
                                        ? left +
                                          ' LEFT'
                                        : 'DONE'
                                    }
                                  </span>

                                </div>

                              </div>
                            `;
                          }
                        )
                        .join('')
                      }

                    </div>
                  `
                )
                .join('')

            : `
                <div class="empty">
                  No SKU plan this month.
                </div>
              `
        }

      </div>
    `;


  bindCommon();
}


/* =========================================================
   TASKS
========================================================= */

function managerTaskBox(id) {

  return `
    <div
      class="card"
      style="margin-top:12px"
    >

      <p class="eyebrow">
        MANAGER TASK
      </p>


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
          SEND TASK
        </button>

      </form>

    </div>
  `;
}


function renderTasks() {

  const id =
    uid();


  const tasks =
    state()
      .tasks
      .filter(
        t =>
          t.staffId ===
          id
      )
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          String(
            b.createdAt
          ).localeCompare(
            String(
              a.createdAt
            )
          )
      );


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div class="card">

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

                            ${esc(t.note || '')}

                            ${
                              t.due
                                ? '<br>Due ' +
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
                                data-done="${esc(t.id)}"
                                style="margin-top:8px"
                              >
                                MARK COMPLETE
                              </button>
                            `

                          : ''
                      }

                    </div>
                  `
                )
                .join('')

            : `
                <div class="empty">
                  No task assigned.
                </div>
              `
        }

      </div>


      ${
        session.mode ===
          'manager'

          ? managerTaskBox(id)

          : ''
      }
    `;


  bindCommon();


  if (
    $('#managerTaskForm')
  ) {

    $('#managerTaskForm')
      .onsubmit =
        async e => {

          e.preventDefault();


          const fd =
            new FormData(
              e.target
            );


          const rec = {
            id:
              idGen(),

            staffId:
              id,

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


          const s =
            state();


          s.tasks
            .push(rec);


          save(s);


          const r =
            await pushCloud(
              'saveTask',
              {
                taskId:
                  rec.id,

                staffId:
                  id,

                title:
                  rec.title,

                instruction:
                  rec.note,

                due:
                  rec.due
              }
            );


          toast(
            r?.ok
              ? 'Task sent'
              : 'Saved locally • cloud failed'
          );


          render();
        };
  }


  $$('[data-done]')
    .forEach(
      b =>
        b.onclick =
          async () => {

            const s =
              state();


            const t =
              s.tasks
                .find(
                  x =>
                    x.id ===
                    b.dataset.done
                );


            if (t) {

              t.done =
                true;
            }


            save(s);


            if (t) {

              await pushCloud(
                'completeTask',
                {
                  taskId:
                    t.id,

                  staffId:
                    id,

                  title:
                    t.title
                }
              );
            }


            toast(
              'Task completed'
            );


            render();
          }
    );
}


/* =========================================================
   MANAGER TEAM
========================================================= */

function renderTeam() {

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

      ${monthBar()}


      <div class="card manager-banner">

        <p class="eyebrow">
          MANAGER LIVE DATABASE
        </p>

        <h2>
          Team Control Center
        </h2>

        <p class="muted">

          Each SR has a separate database.

          Last sync:
          ${esc(lastCloudSyncAt || 'not yet')}

        </p>


        <button
          id="syncTeam"
          class="btn primary"
        >
          ↻ SYNC ALL TEAM NOW
        </button>

      </div>


      <div
        class="list"
        style="margin-top:12px"
      >

        ${
          salesUsers()
            .map(
              u => {

                const m =
                  metric(
                    u.id
                  );


                const pct =
                  m.target
                    ? m.ach /
                      m.target *
                      100
                    : 0;


                const today =
                  monthDaily(
                    u.id
                  )
                  .filter(
                    x =>
                      x.date ===
                      localDate()
                  )
                  .reduce(
                    (
                      a,
                      x
                    ) =>
                      a +
                      n(
                        x.todaySales
                      ),
                    0
                  );


                return `

                  <div class="card">

                    <div class="row">

                      <div>

                        <h3>
                          ${esc(u.name)}
                        </h3>

                        <p class="muted">

                          ${u.id}

                          •

                          ${money(m.ach)}
                          /
                          ${money(m.target)}

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


                    <div class="mini-grid">

                      <div class="metric-box">

                        <small>
                          Today
                        </small>

                        <br>

                        <b>
                          ${money(today)}
                        </b>

                      </div>


                      <div class="metric-box">

                        <small>
                          MTD
                        </small>

                        <br>

                        <b>
                          ${money(m.ach)}
                        </b>

                      </div>


                      <div class="metric-box">

                        <small>
                          Shortfall
                        </small>

                        <br>

                        <b>
                          ${money(m.short)}
                        </b>

                      </div>


                      <div class="metric-box">

                        <small>
                          Coverage
                        </small>

                        <br>

                        <b>
                          ${m.coverage.toFixed(0)}%
                        </b>

                      </div>

                    </div>


                    <button
                      class="btn secondary"
                      data-open="${u.id}"
                      style="margin-top:10px"
                    >
                      OPEN DATABASE
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


  $('#syncTeam')
    .onclick =
      async () => {

        toast(
          'Syncing all team data...'
        );


        await syncAllTeam();


        toast(
          'Team synced'
        );


        render();
      };


  $$('[data-open]')
    .forEach(
      b =>
        b.onclick =
          async () => {

            managerView =
              b.dataset.open;


            await syncCloud(
              managerView,
              selectedMonth
            );


            page =
              'summary';


            summaryMode =
              'month';


            render();
          }
    );
}


/* =========================================================
   PROPOSAL ORDER FORMS
========================================================= */

async function fetchProposalForms() {

  try {

    const r =
      await apiGet(
        'proposalForms',
        uid(),
        selectedMonth
      );


    proposalFormsCache =
      r?.ok
        ? (
            r.data ||
            []
          )
        : [];

  } catch {

    proposalFormsCache =
      [];
  }


  return proposalFormsCache;
}


function fileToBase64(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const r =
        new FileReader();


      r.onload =
        () =>
          resolve(
            String(
              r.result ||
              ''
            )
            .split(',')
            .pop() ||
            ''
          );


      r.onerror =
        reject;


      r.readAsDataURL(
        file
      );
    }
  );
}


function renderProposal() {

  const manager =
    session.mode ===
      'manager' ||
    String(
      session.role ||
      ''
    ).includes(
      'MANAGER'
    );


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div class="hero">

        <p class="eyebrow">
          PROPOSAL ORDER FORM
        </p>

        <h3>
          Shared PO Form Library
        </h3>

        <p class="muted">

          Manager uploads once.

          Authorized app users
          can download.

        </p>


        <button
          id="refreshForms"
          class="btn secondary"
          style="margin-top:10px"
        >
          ↻ REFRESH FORMS
        </button>

      </div>


      ${
        manager

          ? `
              <div
                class="card"
                style="margin-top:12px"
              >

                <form
                  id="uploadForm"
                  class="stack"
                >

                  <label>

                    Form Title

                    <input
                      name="title"
                      required
                    >

                  </label>


                  <label>

                    Select File

                    <input
                      name="file"
                      type="file"
                      required
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                    >

                  </label>


                  <label>

                    Note

                    <textarea
                      name="note"
                    ></textarea>

                  </label>


                  <button
                    class="btn primary"
                  >
                    UPLOAD PROPOSAL FORM
                  </button>


                  <p class="help-note">
                    Keep file under 8 MB.
                  </p>

                </form>

              </div>
            `

          : ''
      }


      <div class="section-title">

        <h3>
          Available Forms
        </h3>

      </div>


      <div class="list">

        ${
          proposalFormsCache.length

            ? proposalFormsCache
                .map(
                  f => `

                    <div class="list-item">

                      <div class="row">

                        <div>

                          <h4>
                            ${esc(
                              f.title ||
                              f.name ||
                              'Proposal Form'
                            )}
                          </h4>

                          <p>

                            ${esc(
                              f.note ||
                              ''
                            )}

                            ${
                              f.uploadedAt
                                ? '• ' +
                                  esc(
                                    f.uploadedAt
                                  )
                                : ''
                            }

                          </p>

                        </div>


                        <button
                          class="btn secondary"
                          data-url="${esc(f.url || '')}"
                        >
                          DOWNLOAD
                        </button>

                      </div>

                    </div>
                  `
                )
                .join('')

            : `
                <div class="empty">
                  No proposal form uploaded yet.
                </div>
              `
        }

      </div>
    `;


  bindCommon();


  $('#refreshForms')
    .onclick =
      async () => {

        await fetchProposalForms();

        render();
      };


  $$('[data-url]')
    .forEach(
      b =>
        b.onclick =
          () => {

            if (
              b.dataset.url
            ) {

              window.open(
                b.dataset.url,
                '_blank',
                'noopener'
              );
            }
          }
    );


  if (
    $('#uploadForm')
  ) {

    $('#uploadForm')
      .onsubmit =
        async e => {

          e.preventDefault();


          const fd =
            new FormData(
              e.target
            );


          const file =
            fd.get(
              'file'
            );


          if (
            !(
              file instanceof
              File
            ) ||
            !file.size
          ) {

            toast(
              'Choose a file'
            );

            return;
          }


          if (
            file.size >
            8 *
            1024 *
            1024
          ) {

            toast(
              'File too large'
            );

            return;
          }


          toast(
            'Uploading...'
          );


          const base64 =
            await fileToBase64(
              file
            );


          const r =
            await apiPost(
              'uploadProposal',
              {
                title:
                  String(
                    fd.get(
                      'title'
                    ) ||
                    file.name
                  ),

                note:
                  String(
                    fd.get(
                      'note'
                    ) ||
                    ''
                  ),

                fileName:
                  file.name,

                mimeType:
                  file.type ||
                  'application/octet-stream',

                base64
              }
            );


          if (
            r?.ok
          ) {

            toast(
              'Proposal form uploaded'
            );


            await fetchProposalForms();


            render();

          } else {

            toast(
              r?.error ||
              'Upload failed'
            );
          }
        };
  }


  if (
    !proposalFormsCache.length
  ) {

    fetchProposalForms()
      .then(
        () => {

          if (
            page ===
            'proposal'
          ) {

            render();
          }
        }
      );
  }
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function renderNotifications() {

  const id =
    uid();


  const m =
    metric(id);


  const pending =
    state()
      .tasks
      .filter(
        t =>
          t.staffId ===
            id &&
          !t.done
      );


  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div class="hero">

        <p class="eyebrow">
          NOTIFICATIONS
        </p>

        <h3>
          Alerts & Tasks
        </h3>

      </div>


      <div
        class="list"
        style="margin-top:12px"
      >

        ${
          pending
            .map(
              t => `
                <div class="list-item">

                  <h4>
                    ✅ Manager Task
                  </h4>

                  <p>
                    ${esc(t.title)}
                  </p>

                </div>
              `
            )
            .join('')
        }


        ${
          m.short > 0

            ? `
                <div class="list-item">

                  <h4>
                    🎯 Target Shortfall
                  </h4>

                  <p>
                    ${money(m.short)}
                    remaining
                  </p>

                </div>
              `

            : ''
        }


        ${
          m.zeroSales.length

            ? `
                <div class="list-item">

                  <h4>
                    🏪 Zero Sales
                  </h4>

                  <p>

                    ${m.zeroSales.length}
                    outlet(s)
                    still zero this month

                  </p>

                </div>
              `

            : ''
        }

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <button
          id="enableNotif"
          class="btn primary"
        >
          ENABLE PHONE NOTIFICATIONS
        </button>


        <button
          id="testNotif"
          class="btn secondary"
          style="margin-top:8px"
        >
          SEND TEST PUSH
        </button>

      </div>
    `;


  bindCommon();


  $('#enableNotif')
    .onclick =
      async () => {

        if (
          oneSignalSdk
        ) {

          try {

            await oneSignalSdk
              .Notifications
              .requestPermission();


            await oneSignalSdk
              .login(
                session.id
              );


            toast(
              'Notification permission updated'
            );

          } catch {

            toast(
              'Could not enable push'
            );
          }

        } else if (
          'Notification'
          in window
        ) {

          const p =
            await Notification
              .requestPermission();


          toast(
            'Permission: ' +
            p
          );

        } else {

          toast(
            'Notifications not supported'
          );
        }
      };


  $('#testNotif')
    .onclick =
      async () => {

        const r =
          await apiPost(
            'testPush',
            {}
          );


        toast(
          r?.ok
            ? 'Test push sent'
            : 'Push is not configured yet'
        );
      };
}


/* =========================================================
   SETTINGS / LOGOUT
========================================================= */

function renderSettings() {

  $('#mainContent')
    .innerHTML = `

      ${monthBar()}


      <div class="hero">

        <p class="eyebrow">
          SETTINGS
        </p>

        <h3>
          Account & App
        </h3>

        <p class="muted">

          This phone stays logged in
          until you press Logout.

        </p>

      </div>


      <div
        class="card"
        style="margin-top:12px"
      >

        <div class="list-item">

          <h4>
            Signed in
          </h4>

          <p>

            ${esc(session.name)}
            •

            ${esc(session.id)}
            •

            ${esc(
              session.mode
                .toUpperCase()
            )}

          </p>

        </div>


        <div
          class="list-item"
          style="margin-top:8px"
        >

          <h4>
            Cloud
          </h4>

          <p>

            ${
              backendUrl()
                ? 'Connected'
                : 'Not connected'
            }

            •

            Last sync
            ${esc(
              lastCloudSyncAt ||
              'not yet'
            )}

          </p>

        </div>


        <button
          id="syncNow"
          class="btn secondary"
          style="
            margin-top:12px;
            width:100%
          "
        >
          ↻ SYNC LIVE DATA NOW
        </button>


        <button
          id="realLogout"
          class="btn danger"
          style="
            margin-top:10px;
            width:100%
          "
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

          <a
            href="https://mehedialimayon-del.github.io/MEHEDI-ALIM-AYON-PORTFOLIO/"
            target="_blank"
            rel="noopener"
            style="
              color:#ff9b51;
              text-decoration:none;
              font-weight:800
            "
          >
            CAM Ayon
          </a>

        </p>

      </div>
    `;


  bindCommon();


  $('#syncNow')
    .onclick =
      async () => {

        await syncCurrent(
          true
        );

        render();
      };


  $('#realLogout')
    .onclick =
      () => {

        if (
          confirm(
            'Log out from Sales Performance Hub?'
          )
        ) {

          logout();
        }
      };
}


/* =========================================================
   XLSX
========================================================= */

async function loadXlsx() {

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
          resolve(
            true
          );


      s.onerror =
        () =>
          resolve(
            false
          );


      document.head
        .appendChild(s);
    }
  );
}


async function exportXlsx(id) {

  if (
    !await loadXlsx()
  ) {

    toast(
      'Excel library unavailable'
    );

    return;
  }


  const wb =
    XLSX.utils
      .book_new();


  const m =
    metric(id);


  const inc =
    incomeCalc(id);


  function add(
    name,
    rows
  ) {

    XLSX.utils
      .book_append_sheet(
        wb,

        XLSX.utils
          .json_to_sheet(
            rows.length
              ? rows
              : [
                  {
                    Info:
                      'No data'
                  }
                ]
          ),

        name.slice(
          0,
          31
        )
      );
  }


  add(
    'Summary',
    [
      {
        Month:
          selectedMonth,

        'Staff ID':
          id,

        Salesman:
          user(id)?.name ||
          '',

        Target:
          m.target,

        Achievement:
          m.ach,

        Shortfall:
          m.short,

        Coverage:
          m.coverage,

        'Projected Salary':
          inc.total
      }
    ]
  );


  add(
    'Daily',
    monthDaily(id)
      .map(
        x => ({
          Date:
            x.date,

          Sales:
            x.todaySales,

          'Last Month':
            x.lastMonthSameDay,

          Active:
            x.active,

          'Prepare Trip':
            x.prepareTrip,

          Order:
            x.orderAmount,

          Note:
            x.note ||
            ''
        })
      )
  );


  add(
    'Outlet Sales',
    monthOutletSales(id)
      .map(
        x => ({
          Date:
            x.date,

          'Outlet Code':
            x.outletCode,

          Outlet:
            x.outletName,

          Sales:
            x.sales,

          Note:
            x.note ||
            ''
        })
      )
  );


  add(
    'SKU Sales',
    monthSkuSales(id)
      .map(
        x => ({
          Date:
            x.date,

          Outlet:
            x.outletName,

          SKU:
            x.skuName,

          Cartons:
            x.cartons,

          'Sales Value':
            x.salesValue
        })
      )
  );


  add(
    'Income',
    [
      {
        Component:
          'TOTAL PROJECTED',

        Amount:
          inc.total
      }
    ]
  );


  XLSX.writeFile(
    wb,
    `${id}_${selectedMonth}_Sales_Performance.xlsx`
  );
}


/* =========================================================
   ONESIGNAL
========================================================= */

async function initPush() {

  if (
    !backendUrl() ||
    !window.OneSignalDeferred
  ) {
    return;
  }


  try {

    const r =
      await fetch(
        backendUrl() +
        '?action=publicConfig',
        {
          cache:
            'no-store'
        }
      )
      .then(
        x =>
          x.json()
      );


    const cfg =
      r?.data ||
      {};


    pushConfig = {
      ready:
        false,

      configured:
        !!cfg.pushConfigured,

      appId:
        String(
          cfg.oneSignalAppId ||
          ''
        ),

      appUrl:
        String(
          cfg.appUrl ||
          ''
        )
    };


    if (
      !pushConfig.appId
    ) {
      return;
    }


    const path =
      location.pathname
        .endsWith('/')

        ? location.pathname

        : location.pathname
            .replace(
              /[^/]+$/,
              ''
            );


    const workerPath =
      path
        .replace(
          /^\//,
          ''
        ) +
      'push/onesignal/OneSignalSDKWorker.js';


    window.OneSignalDeferred
      .push(
        async OneSignal => {

          try {

            await OneSignal.init({
              appId:
                pushConfig.appId,

              serviceWorkerPath:
                workerPath,

              serviceWorkerParam: {
                scope:
                  path +
                  'push/onesignal/'
              }
            });


            oneSignalSdk =
              OneSignal;


            pushConfig.ready =
              true;


            if (
              session
            ) {

              await OneSignal
                .login(
                  session.id
                );
            }

          } catch (e) {

            console.warn(e);
          }
        }
      );

  } catch (e) {

    console.warn(e);
  }
}


/* =========================================================
   EVENTS
========================================================= */

$('#loginForm')
  .onsubmit =
    e => {

      e.preventDefault();


      login(
        $('#loginUser')
          .value,

        $('#loginPin')
          .value
      );
    };


if (
  $('#logoutBtn')
) {

  $('#logoutBtn')
    .onclick =
      () => {

        page =
          'settings';

        render();
      };
}


if (
  $('#notifBtn')
) {

  $('#notifBtn')
    .onclick =
      () => {

        page =
          'notifications';

        render();
      };
}


if (
  $('#bottomNav')
) {

  $('#bottomNav')
    .onclick =
      e => {

        const b =
          e.target
            .closest(
              'button[data-page]'
            );


        if (!b) return;


        page =
          b.dataset.page;


        render();
      };
}


/* =========================================================
   BACK BUTTON
========================================================= */

window.addEventListener(
  'popstate',
  () => {

    if (!session) return;


    page =
      'dashboard';


    render();


    history.pushState(
      {
        sph:
          true
      },
      '',
      location.href
    );
  }
);


/* =========================================================
   RETURN TO APP = SYNC
========================================================= */

document.addEventListener(
  'visibilitychange',
  async () => {

    if (
      document.hidden ||
      !session ||
      !backendUrl()
    ) {
      return;
    }


    await syncCurrent(
      false
    );


    if (
      [
        'dashboard',
        'team',
        'summary',
        'zero',
        'tasks'
      ].includes(
        page
      )
    ) {

      render();
    }
  }
);


/* =========================================================
   START APP
========================================================= */

(async function start() {

  installShell();


  history.replaceState(
    {
      sph:
        true
    },
    '',
    location.href
  );


  history.pushState(
    {
      sph:
        true
    },
    '',
    location.href
  );


  const saved =
    localStorage.getItem(
      SESSION
    );


  if (saved) {

    try {

      const x =
        JSON.parse(
          saved
        );


      if (
        x &&
        user(
          x.id
        )
      ) {

        session =
          x;


        managerView =
          session.mode ===
            'manager'
            ? 'M21954'
            : session.id;


        page =
          session.mode ===
            'manager'
            ? 'team'
            : 'dashboard';


        openApp();


        await initPush();


        await syncCurrent(
          false
        );


        render();


        return;
      }

    } catch {

      localStorage
        .removeItem(
          SESSION
        );
    }
  }


  $('#loginView')
    ?.classList
    .remove(
      'hidden'
    );


  $('#appView')
    ?.classList
    .add(
      'hidden'
    );


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
        r =>
          r.update()
      )
      .catch(
        () => {}
      );
  }

})();
