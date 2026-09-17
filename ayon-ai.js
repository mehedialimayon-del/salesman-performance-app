'use strict';

/* =========================================================
   AYON AI LITE — ZERO-COST SALES ASSISTANT
   Premium Floating Assistant + Voice
   Developed by KAM AYON

   - No paid AI/API.
   - Reads current Sales Performance Hub data.
   - Local sales analysis + built-in sales coaching.
   - Voice input + voice answer.
========================================================= */

(() => {

  const BUILD = 'AYON-AI-LITE-2026.09.18-1';

  /*
    আপনার avatar image পরে GitHub-এ এই path-এ দেব:
    icons/ayon-avatar.jpg
  */
  const AVATAR_SRC = 'icons/ayon-avatar.jpg';

  const MAX_HISTORY = 40;

  let opened = false;
  let listening = false;
  let recognition = null;
  let autoVoice = true;
  let chatHistory = [];

  const $ai = s => document.querySelector(s);
  const $$ai = s => [...document.querySelectorAll(s)];

  const safeN = v =>
    Number.isFinite(Number(v))
      ? Number(v)
      : 0;

  const rm = v =>
    `RM ${safeN(v).toLocaleString(
      'en-MY',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`;

  const pctAI = v =>
    `${safeN(v).toFixed(1)}%`;


  /* =========================================================
     GET LIVE APP DATA SAFELY
  ========================================================= */

  function getCurrent() {

    try {

      return (
        typeof current !== 'undefined' &&
        current
      )
        ? current
        : {};

    } catch {

      return {};

    }

  }


  function getSession() {

    try {

      return (
        typeof session !== 'undefined' &&
        session
      )
        ? session
        : {};

    } catch {

      return {};

    }

  }


  function getTeam() {

    try {

      return (
        typeof teamSnapshot !== 'undefined' &&
        Array.isArray(teamSnapshot)
      )
        ? teamSnapshot
        : [];

    } catch {

      return [];

    }

  }


  function getMonth() {

    try {

      return (
        typeof selectedMonth !== 'undefined' &&
        selectedMonth
      )
        ? selectedMonth
        : '';

    } catch {

      return '';

    }

  }


  function getViewedName() {

    try {

      if (
        typeof viewedName === 'function'
      ) {

        return viewedName();

      }

      const c = getCurrent();

      return (
        c?.user?.['Full Name'] ||
        c?.user?.name ||
        getSession()?.name ||
        'Sales User'
      );

    } catch {

      return 'Sales User';

    }

  }


  function isManagerContext() {

    const s = getSession();

    return (
      String(
        s?.mode || ''
      ).toLowerCase() === 'manager' ||

      String(
        s?.role || ''
      )
        .toUpperCase()
        .includes('MANAGER') ||

      String(
        s?.role || ''
      )
        .toUpperCase()
        .includes('HR')
    );

  }


  function getRouteOutletsSafe() {

    try {

      if (
        typeof routeOutlets === 'function'
      ) {

        const r =
          routeOutlets();

        return Array.isArray(r)
          ? r
          : [];

      }

      return Array.isArray(
        getCurrent()?.outlets
      )
        ? getCurrent().outlets
        : [];

    } catch {

      return [];

    }

  }


  function getPerformance() {

    return (
      getCurrent()?.performance ||
      {}
    );

  }


  function getIncome() {

    return (
      getCurrent()?.incomeSummary ||
      {}
    );

  }


  function getIncentives() {

    return Array.isArray(
      getCurrent()?.incentives
    )
      ? getCurrent().incentives
      : [];

  }


  function getTasks() {

    return Array.isArray(
      getCurrent()?.tasks
    )
      ? getCurrent().tasks
      : [];

  }


  function getOutletSales() {

    return Array.isArray(
      getCurrent()?.outletSales
    )
      ? getCurrent().outletSales
      : [];

  }


  function getSkuSales() {

    return Array.isArray(
      getCurrent()?.skuSales
    )
      ? getCurrent().skuSales
      : [];

  }


  function appReady() {

    const c = getCurrent();

    return !!(
      c &&
      Object.keys(c).length
    );

  }


  function todayKey() {

    try {

      if (
        typeof localDate === 'function'
      ) {

        return localDate();

      }

    } catch {}

    return new Date()
      .toISOString()
      .slice(
        0,
        10
      );

  }



  /* =========================================================
     TEXT HELPERS
  ========================================================= */

  function normalizeText(t) {

    return String(
      t || ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /[!?.,;:()[\]{}"']/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      );

  }


  function containsAny(
    q,
    words
  ) {

    return words.some(
      w =>
        q.includes(w)
    );

  }


  function numberFromText(q) {

    const m =
      String(q)
        .match(
          /(\d+(?:\.\d+)?)/
        );

    return m
      ? Number(m[1])
      : 0;

  }



  /* =========================================================
     TARGET MATH
  ========================================================= */

  function remainingDaysInMonth() {

    const m =
      getMonth() ||
      todayKey()
        .slice(
          0,
          7
        );

    const [
      y,
      mo
    ] =
      m
        .split('-')
        .map(Number);

    if (
      !y ||
      !mo
    ) {

      return 1;

    }

    const last =
      new Date(
        y,
        mo,
        0
      )
        .getDate();

    const today =
      todayKey();

    const day =
      today.startsWith(m)
        ? Number(
            today.slice(
              8,
              10
            )
          )
        : 1;

    return Math.max(
      1,
      last - day + 1
    );

  }


  function dailyNeeded() {

    const p =
      getPerformance();

    return (
      safeN(
        p.shortfall
      ) /
      remainingDaysInMonth()
    );

  }



  /* =========================================================
     SALES CONTEXT
  ========================================================= */

  function salesContextSummary() {

    const p =
      getPerformance();

    const inc =
      getIncentives();

    const pending =
      getTasks()
        .filter(
          x =>
            String(
              x.Status || ''
            )
              .toUpperCase() !==
            'DONE'
        );

    return {

      name:
        getViewedName(),

      target:
        safeN(
          p.target
        ),

      achievement:
        safeN(
          p.achievement
        ),

      percent:
        safeN(
          p.percent
        ),

      shortfall:
        safeN(
          p.shortfall
        ),

      todaySales:
        safeN(
          p.todaySales
        ),

      coverage:
        safeN(
          p.coverage
        ),

      covered:
        safeN(
          p.coveredOutlets
        ),

      route:
        safeN(
          p.routeOutlets
        ),

      zero:
        safeN(
          p.zeroOutlets
        ),

      pendingTasks:
        pending.length,

      incentives:
        inc.length,

      dailyNeed:
        dailyNeeded()

    };

  }



  /* =========================================================
     OUTLET OPPORTUNITY
  ========================================================= */

  function outletOpportunityRows() {

    const outlets =
      getRouteOutletsSafe();

    const sales =
      getOutletSales();

    const byOutlet =
      new Map();


    for (
      const s of sales
    ) {

      const name =
        String(
          s?.['Outlet Name'] ||
          ''
        )
          .trim();

      if (!name) {

        continue;

      }

      byOutlet.set(
        name,
        (
          byOutlet.get(name) ||
          0
        ) +
        safeN(
          s?.['Sales Value']
        )
      );

    }


    return outlets
      .map(
        o => {

          const name =
            String(
              o?.['Outlet Name'] ||
              ''
            )
              .trim();

          return {

            name,

            code:
              String(
                o?.['Outlet Code'] ||
                ''
              ),

            category:
              String(
                o?.Category ||
                ''
              ),

            sales:
              byOutlet.get(name) ||
              0

          };

        }
      )
      .sort(
        (
          a,
          b
        ) =>
          a.sales -
          b.sales
      );

  }



  /* =========================================================
     SKU ANALYSIS
  ========================================================= */

  function skuRanking() {

    const rows =
      getSkuSales();

    const map =
      new Map();


    for (
      const s of rows
    ) {

      const sku =
        String(
          s?.['SKU Name'] ||
          ''
        )
          .trim();

      if (!sku) {

        continue;

      }


      const old =
        map.get(sku) ||
        {
          sku,
          cartons: 0,
          value: 0
        };


      old.cartons +=
        safeN(
          s?.Cartons
        );

      old.value +=
        safeN(
          s?.['Sales Value']
        );


      map.set(
        sku,
        old
      );

    }


    return [
      ...map.values()
    ]
      .sort(
        (
          a,
          b
        ) =>
          b.value -
          a.value ||
          b.cartons -
          a.cartons
      );

  }



  /* =========================================================
     INCENTIVE ANALYSIS
  ========================================================= */

  function activeIncentiveSummary() {

    const list =
      getIncentives();


    if (
      !list.length
    ) {

      return (
        'এখন কোনো active incentive data পাওয়া যাচ্ছে না।'
      );

    }


    const active =
      list
        .filter(
          x =>
            !x.fulfilled
        )
        .sort(
          (
            a,
            b
          ) =>
            safeN(
              a.remaining
            ) -
            safeN(
              b.remaining
            )
        )
        .slice(
          0,
          5
        );


    if (
      !active.length
    ) {

      return (
        'সব visible incentive fulfilled দেখাচ্ছে।'
      );

    }


    return active
      .map(
        (
          x,
          i
        ) =>
          `${i + 1}) ${x.name || 'Incentive'} — ${safeN(x.actual)} / ${safeN(x.target)}, বাকি ${safeN(x.remaining)}, reward ${rm(x.rewardRM)}`
      )
      .join('\n');

  }



  /* =========================================================
     MANAGER TEAM AI
  ========================================================= */

  function teamAttentionAnswer() {

    const team =
      getTeam();


    if (
      !team.length
    ) {

      return (
        'Team snapshot এখনো load হয়নি। Manager Team screen একবার refresh করলে আমি team comparison দিতে পারব।'
      );

    }


    const rows =
      team
        .map(
          x => ({

            name:
              x.name ||
              x.staffId,

            id:
              x.staffId,

            percent:
              safeN(
                x?.performance?.percent
              ),

            shortfall:
              safeN(
                x?.performance?.shortfall
              ),

            zero:
              safeN(
                x?.performance?.zeroOutlets
              ),

            pending:
              safeN(
                x?.pendingTasks
              ),

            achievement:
              safeN(
                x?.performance?.achievement
              )

          })
        )
        .sort(
          (
            a,
            b
          ) =>

            (
              b.shortfall +
              b.zero * 100 +
              b.pending * 50
            ) -

            (
              a.shortfall +
              a.zero * 100 +
              a.pending * 50
            )

        );


    const top =
      rows.slice(
        0,
        4
      );


    return (
      `Manager attention priority:\n` +

      top
        .map(
          (
            x,
            i
          ) =>

            `${i + 1}) ${x.name} — achievement ${pctAI(x.percent)}, shortfall ${rm(x.shortfall)}, zero outlet ${x.zero}, pending task ${x.pending}`

        )
        .join('\n') +

      `\n\nPriority order এখানে shortfall + zero-sales + pending task ধরে তৈরি করেছি।`
    );

  }



  /* =========================================================
     TODAY FOCUS
  ========================================================= */

  function todayFocusAnswer() {

    const c =
      salesContextSummary();


    const opp =
      outletOpportunityRows()
        .filter(
          x =>
            x.sales <= 0
        )
        .slice(
          0,
          5
        );


    const inc =
      getIncentives()
        .filter(
          x =>
            !x.fulfilled &&
            safeN(
              x.remaining
            ) > 0
        )
        .slice(
          0,
          2
        );


    let out =
      `${c.name}-এর আজকের focus:\n`;


    out +=
      `1) Monthly achievement ${pctAI(c.percent)}; shortfall ${rm(c.shortfall)}। Remaining days ধরে প্রায় ${rm(c.dailyNeed)} sales/day দরকার।\n`;


    out +=
      `2) Zero-sales outlet ${c.zero}; coverage ${pctAI(c.coverage)}।`;


    if (
      opp.length
    ) {

      out +=
        ` প্রথমে ${opp.map(x => x.name).join(', ')} cover করুন।`;

    }


    out +=
      `\n3) Pending task ${c.pendingTasks}টি — route শুরু করার আগে due task check করুন।`;


    if (
      inc.length
    ) {

      out +=
        `\n4) Incentive push: ${inc.map(x => `${x.name} (${safeN(x.remaining)} remaining)`).join('; ')}।`;

    }


    out +=
      `\n5) প্রতিটি outlet-এ শুধু order না—SKU availability, price tag, display visibility এবং next order date confirm করুন।`;


    return out;

  }



  /* =========================================================
     TARGET PLAN
  ========================================================= */

  function targetPlanAnswer() {

    const c =
      salesContextSummary();


    const days =
      remainingDaysInMonth();


    const weekly =
      c.shortfall /
      Math.max(
        1,
        Math.ceil(
          days / 7
        )
      );


    return (
      `${c.name}-এর target recovery plan:\n` +

      `• Target: ${rm(c.target)}\n` +

      `• Achievement: ${rm(c.achievement)} (${pctAI(c.percent)})\n` +

      `• Shortfall: ${rm(c.shortfall)}\n` +

      `• Remaining days: ${days}\n` +

      `• Minimum average needed: ${rm(c.dailyNeed)}/day\n` +

      `• Weekly recovery target: প্রায় ${rm(weekly)}\n\n` +

      `Execution: সকালেই top zero/low outlets → দুপুরে high-potential outlets → বিকেলে pending buyer follow-up → দিনের শেষে shortfall vs daily target review।`
    );

  }



  /* =========================================================
     ZERO SALES
  ========================================================= */

  function zeroSalesAnswer() {

    const rows =
      outletOpportunityRows();


    const zeros =
      rows.filter(
        x =>
          x.sales <= 0
      );


    if (
      !rows.length
    ) {

      return (
        'Route outlet data এখনো load হয়নি। Outlet Report screen refresh করলে আমি priority list দিতে পারব।'
      );

    }


    if (
      !zeros.length
    ) {

      return (
        'এই loaded month data অনুযায়ী zero-sales outlet পাওয়া যায়নি। এখন low-sales outlet push করাই best next step।'
      );

    }


    const first =
      zeros.slice(
        0,
        8
      );


    return (
      `Zero-sales priority (${zeros.length} outlet):\n` +

      first
        .map(
          (
            x,
            i
          ) =>
            `${i + 1}) ${x.name}${x.category ? ` — ${x.category}` : ''}`
        )
        .join('\n') +

      `\n\nVisit objective: minimum 1 order + missing SKU check + display + buyer/supervisor next-order commitment।`
    );

  }



  /* =========================================================
     SKU OPPORTUNITY
  ========================================================= */

  function skuOpportunityAnswer() {

    const ranks =
      skuRanking();


    if (
      !ranks.length
    ) {

      const inc =
        getIncentives()
          .filter(
            x =>
              !x.fulfilled
          );


      if (
        inc.length
      ) {

        return (
          `SKU sales history এখন কম/খালি। Active incentive ধরে focus করুন:\n${activeIncentiveSummary()}`
        );

      }


      return (
        'SKU sales data এখনো যথেষ্ট নেই। প্রথমে Daily → Outlet/SKU Sale থেকে SKU entry দিলে আমি top/weak SKU analysis করতে পারব।'
      );

    }


    const top =
      ranks.slice(
        0,
        5
      );


    const low =
      [
        ...ranks
      ]
        .sort(
          (
            a,
            b
          ) =>
            a.value -
            b.value
        )
        .slice(
          0,
          5
        );


    return (
      `SKU picture:\nTop value SKUs:\n` +

      top
        .map(
          (
            x,
            i
          ) =>
            `${i + 1}) ${x.sku} — ${x.cartons} CTN, ${rm(x.value)}`
        )
        .join('\n') +

      `\n\nLow/Opportunity SKUs:\n` +

      low
        .map(
          (
            x,
            i
          ) =>
            `${i + 1}) ${x.sku} — ${x.cartons} CTN, ${rm(x.value)}`
        )
        .join('\n') +

      `\n\nAction: strong SKU দিয়ে entry নিন, তারপর adjacent/related SKU add-on order চান।`
    );

  }



  /* =========================================================
     INCENTIVE
  ========================================================= */

  function incentiveAnswer() {

    return (
      `Active incentive status:\n${activeIncentiveSummary()}\n\n` +

      `Tactic: incentive-এর remaining target-কে daily route target-এ ভাগ করুন এবং zero/low outlet-এ selected SKU দিয়ে recovery করুন।`
    );

  }



  /* =========================================================
     TASKS
  ========================================================= */

  function taskAnswer() {

    const pending =
      getTasks()
        .filter(
          x =>
            String(
              x.Status || ''
            )
              .toUpperCase() !==
            'DONE'
        );


    if (
      !pending.length
    ) {

      return (
        'কোনো pending task দেখাচ্ছে না।'
      );

    }


    return (
      `Pending task ${pending.length}টি:\n` +

      pending
        .slice(
          0,
          8
        )
        .map(
          (
            x,
            i
          ) =>
            `${i + 1}) ${x.Title || 'Task'}${x['Due Date'] ? ` — due ${String(x['Due Date']).slice(0, 10)}` : ''}${x.Instruction ? ` — ${x.Instruction}` : ''}`
        )
        .join('\n')
    );

  }



  /* =========================================================
     INCOME
  ========================================================= */

  function incomeAnswer() {

    const x =
      getIncome();


    return (
      `Current income picture:\n` +

      `• Basic: ${rm(x.baseSalary)}\n` +

      `• Sales commission: ${rm(x.salesCommission)}\n` +

      `• Product incentive: ${rm(x.productIncentive)}\n` +

      `• Other incentive: ${rm(x.otherIncentive)}\n` +

      `• Individual incentive: ${rm(x.individualIncentive)}\n` +

      `• Penalty: ${rm(x.penalty)}\n` +

      `• Final income: ${rm(x.finalIncome)}`
    );

  }



  /* =========================================================
     BUYER HANDLING
  ========================================================= */

  function buyerAdviceAnswer(q) {

    if (
      containsAny(
        q,
        [
          'order dibena',
          'order dibe na',
          'অর্ডার দিবে না',
          'অর্ডার দিচ্ছে না',
          'no order'
        ]
      )
    ) {

      return (
        `Buyer/supervisor order দিচ্ছে না হলে এই sequence ব্যবহার করুন:\n` +

        `1) “কোন item slow যাচ্ছে?” — objection আগে শুনুন।\n` +

        `2) Full range না চেয়ে 2–3 fast-moving SKU দিয়ে small order চান।\n` +

        `3) Shelf gap/stock-out চোখে দেখান।\n` +

        `4) Price tag ও display issue থাকলে সাথে সাথে ঠিক করার commitment দিন।\n` +

        `5) “আজ small quantity দিন, movement দেখে next visit-এ increase করব” — risk কমান।\n` +

        `6) Personal benefit নয়; store performance, availability ও easy replenishment-এ conversation রাখুন।`
      );

    }


    if (
      containsAny(
        q,
        [
          'price',
          'দাম',
          'expensive',
          'mahal',
          'মহল'
        ]
      )
    ) {

      return (
        `Price objection handle:\n` +

        `• শুধু unit price defend করবেন না—margin, movement, pack value, consumer pull দেখান।\n` +

        `• Buyer-কে 1–2 proven SKU দিয়ে low-risk trial দিন।\n` +

        `• Shelf price tag ঠিক আছে কিনা check করুন; wrong/missing tag sales মারে।\n` +

        `• Comparable pack-এর সাথে value comparison দিন, competitor attack না করে।`
      );

    }


    if (
      containsAny(
        q,
        [
          'listing',
          'লিস্টিং'
        ]
      )
    ) {

      return (
        `New listing pitch:\n` +

        `1) Category gap দেখান।\n` +

        `2) 3–5 priority SKU short-list করুন।\n` +

        `3) Expected rotation/consumer use-case বলুন।\n` +

        `4) Launch support: display, sampling/promo, stock follow-up দিন।\n` +

        `5) Clear review date নিন—“14 days পরে movement review করি।”`
      );

    }


    return (
      `Buyer handling formula: Listen → Diagnose → Small low-risk proposal → Proof → Clear next action.\n\n` +

      `Opening line: “Boss, আপনার store-এ কোন category/SKUটা এখন slow বা stock issue দিচ্ছে? আমি আজ full order চাই না—যেটা move করবে ওই 2–3 item দিয়ে শুরু করি।”`
    );

  }



  /* =========================================================
     MEETING POINTS
  ========================================================= */

  function meetingPointsAnswer() {

    const c =
      salesContextSummary();


    return (
      `আজকের sales meeting-এর 5 point:\n` +

      `1) Achievement ${pctAI(c.percent)}; shortfall ${rm(c.shortfall)}।\n` +

      `2) Daily recovery requirement প্রায় ${rm(c.dailyNeed)}।\n` +

      `3) Zero-sales outlet ${c.zero}; coverage ${pctAI(c.coverage)}।\n` +

      `4) SKU-wise কাজ: fast mover protect + weak SKU targeted outlet push।\n` +

      `5) Execution discipline: buyer follow-up, price tag, display, stock availability, task closure।\n\n` +

      `Closing line: “Target শুধু total value দিয়ে না—outlet × SKU × follow-up discipline দিয়ে achieve করব।”`
    );

  }



  /* =========================================================
     ROUTE PLAN
  ========================================================= */

  function routePlanAnswer() {

    const zeros =
      outletOpportunityRows()
        .filter(
          x =>
            x.sales <= 0
        )
        .slice(
          0,
          6
        );


    const c =
      salesContextSummary();


    return (
      `Route plan:\n` +

      `• Start: ${
        zeros.length
          ? zeros
              .slice(
                0,
                2
              )
              .map(
                x =>
                  x.name
              )
              .join(' → ')
          : 'highest priority zero/low outlet'
      }\n` +

      `• Mid-route: highest potential hyper/supermarket outlets\n` +

      `• Afternoon: buyer/supervisor follow-up + pending order confirmation\n` +

      `• End: remaining ${rm(c.dailyNeed)} daily requirement check + missed outlets call/visit\n` +

      `• Every outlet: availability → price tag → display → order → next follow-up date`
    );

  }



  /* =========================================================
     MOTIVATION
  ========================================================= */

  function motivationAnswer() {

    const c =
      salesContextSummary();


    if (
      c.percent >= 100
    ) {

      return (
        'Target crossed — এখন focus হবে quality growth: repeat order, more active SKU, zero return, এবং next month pipeline।'
      );

    }


    if (
      c.percent >= 80
    ) {

      return (
        `আপনি target-এর কাছাকাছি। এখন random visit না—remaining ${rm(c.shortfall)}-কে daily ${rm(c.dailyNeed)} করে ভাঙুন। Top opportunity outlet + active incentive SKU-তে concentration দিন।`
      );

    }


    return (
      `Gap বড় হলেও plan পরিষ্কার করলে manageable। আজ শুধু 3টা outcome ধরুন: 1) zero outlet convert, 2) selected SKU order, 3) buyer next-action lock. Daily ${rm(c.dailyNeed)} recovery number সামনে রাখুন।`
    );

  }



  /* =========================================================
     GENERAL SALES COACH
  ========================================================= */

  function generalSalesCoach(q) {

    if (
      containsAny(
        q,
        [
          'display',
          'ডিসপ্লে',
          'shelf'
        ]
      )
    ) {

      return (
        `Display improvement checklist:\n` +

        `• Eye-level/visible placement\n` +

        `• Price tag present & correct\n` +

        `• Front-facing pack\n` +

        `• Out-of-stock gap fill\n` +

        `• Same brand block together\n` +

        `• Promo message readable\n` +

        `• Photo proof before/after\n\n` +

        `Display-এর পরে buyer-কে বলুন: “এই placement 7 days রাখি, তারপর movement review করি।”`
      );

    }


    if (
      containsAny(
        q,
        [
          'return',
          'রিটার্ন'
        ]
      )
    ) {

      return (
        `Sales return কমাতে:\n` +

        `1) Buyer confirmation ছাড়া over-order নয়।\n` +

        `2) Outlet capacity অনুযায়ী quantity।\n` +

        `3) Fast/slow SKU আলাদা করুন।\n` +

        `4) Expiry/rotation follow-up।\n` +

        `5) New outlet-এ small trial order।\n` +

        `6) PO-এর আগে location, receiving ability ও responsible person confirm।`
      );

    }


    if (
      containsAny(
        q,
        [
          'growth',
          'গ্রোথ',
          'বাড়াব',
          'increase sale',
          'sales barabo'
        ]
      )
    ) {

      return (
        `Sales growth-এর practical formula:\n` +

        `Active Outlet × Active SKU × Average Order Value × Reorder Frequency.\n\n` +

        `একসাথে চারটা না বাড়িয়ে প্রথমে Active SKU per outlet বাড়ান। Existing buyer থেকে 1–2 extra SKU order নেওয়া নতুন outlet খোঁজার চেয়ে অনেক সময় দ্রুত growth দেয়।`
      );

    }


    if (
      containsAny(
        q,
        [
          'sku target',
          'sku-wise',
          'sku wise',
          'এসকেইউ'
        ]
      )
    ) {

      return (
        `SKU-wise execution:\n` +

        `• Chain-wise listed SKU count জানুন\n` +

        `• প্রতি outletে currently active SKU count ধরুন\n` +

        `• Monthly incremental SKU target দিন\n` +

        `• Zero SKU → first order\n` +

        `• Low SKU → repeat order\n` +

        `• Fast SKU → quantity scale\n` +

        `• Weekly SKU gap review করুন`
      );

    }


    return (
      `আমি আপনার live sales data + sales playbook দিয়ে সাহায্য করতে পারি। প্রশ্ন করুন যেমন:\n` +

      `“আজ কোথায় focus করব?”\n` +

      `“Target achieve করতে daily কত লাগবে?”\n` +

      `“Zero-sales outlet কোনগুলো?”\n` +

      `“কোন SKU push করব?”\n` +

      `“Buyer order দিচ্ছে না—কি বলব?”\n` +

      `“Meeting-এর 5টা point দাও।”`
    );

  }



  /* =========================================================
     QUESTION ROUTER
  ========================================================= */

  function answerQuestion(text) {

    const q =
      normalizeText(text);


    if (!q) {

      return (
        'বলুন ভাই, sales নিয়ে কী জানতে চান?'
      );

    }


    if (
      !appReady()
    ) {

      return (
        'App-এর live sales data এখনো load হয়নি। Dashboard একবার Refresh Live করুন। তারপর আমি live target, outlet, SKU, incentive ও task ধরে suggestion দেব।'
      );

    }


    if (
      containsAny(
        q,
        [
          'hello',
          'hi',
          'hey',
          'হ্যালো',
          'হাই',
          'সালাম',
          'assalam'
        ]
      )
    ) {

      return (
        `হ্যালো ${getViewedName()}। আমি AYON AI — আপনার Sales Assistant। আজকের target, outlet, SKU, incentive, buyer handling বা meeting নিয়ে জিজ্ঞেস করুন।`
      );

    }


    if (
      containsAny(
        q,
        [
          'team',
          'কে পিছিয়ে',
          'কার performance',
          'manager attention',
          'ম্যানেজার',
          'sr compare',
          'compare sr'
        ]
      ) &&
      isManagerContext()
    ) {

      return (
        teamAttentionAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'today focus',
          'আজ কোথায়',
          'আজ কি করব',
          'আজ কী করব',
          'focus today',
          'আজকের focus',
          'আজকে focus'
        ]
      )
    ) {

      return (
        todayFocusAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'target',
          'shortfall',
          'কত sale',
          'কত সেল',
          'daily কত',
          'daily sale',
          'টার্গেট',
          'শর্টফল'
        ]
      )
    ) {

      return (
        targetPlanAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'zero sale',
          'zero-sales',
          'zero outlet',
          'জিরো',
          'শূন্য সেল'
        ]
      )
    ) {

      return (
        zeroSalesAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'incentive',
          'ইনসেনটিভ',
          'reward',
          'combo'
        ]
      )
    ) {

      return (
        incentiveAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'sku',
          'product',
          'প্রোডাক্ট',
          'item',
          'আইটেম'
        ]
      )
    ) {

      return (
        skuOpportunityAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'task',
          'টাস্ক',
          'কাজ বাকি'
        ]
      )
    ) {

      return (
        taskAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'income',
          'salary',
          'commission',
          'বেতন',
          'ইনকাম',
          'কমিশন'
        ]
      )
    ) {

      return (
        incomeAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'buyer',
          'বায়ার',
          'supervisor',
          'সুপারভাইজার',
          'listing',
          'লিস্টিং',
          'price',
          'দাম',
          'order dibe',
          'অর্ডার'
        ]
      )
    ) {

      return (
        buyerAdviceAnswer(q)
      );

    }


    if (
      containsAny(
        q,
        [
          'meeting',
          'মিটিং',
          'speech',
          'point',
          'পয়েন্ট'
        ]
      )
    ) {

      return (
        meetingPointsAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'route',
          'visit plan',
          'রুট',
          'কোথায় যাব'
        ]
      )
    ) {

      return (
        routePlanAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'motivate',
          'motivation',
          'মোটিভেশন',
          'মন খারাপ'
        ]
      )
    ) {

      return (
        motivationAnswer()
      );

    }


    if (
      containsAny(
        q,
        [
          'display',
          'ডিসপ্লে',
          'return',
          'রিটার্ন',
          'growth',
          'গ্রোথ',
          'sku-wise',
          'sku wise',
          'এসকেইউ'
        ]
      )
    ) {

      return (
        generalSalesCoach(q)
      );

    }


    const amount =
      numberFromText(q);


    if (
      amount &&
      containsAny(
        q,
        [
          'divide',
          'ভাগ',
          'days',
          'দিনে'
        ]
      )
    ) {

      return (
        `${rm(amount)}-কে ${remainingDaysInMonth()} remaining day-এ ভাগ করলে প্রায় ${rm(amount / remainingDaysInMonth())}/day দরকার।`
      );

    }


    return (
      generalSalesCoach(q)
    );

  }



  /* =========================================================
     PREMIUM UI STYLE
  ========================================================= */

  function injectStyle() {

    if (
      $ai(
        '#ayonAiStyle'
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        'style'
      );


    style.id =
      'ayonAiStyle';


    style.textContent = `

      :root {

        --ayon-ai-orange:
          #ff7414;

        --ayon-ai-bg:
          #080b0f;

        --ayon-ai-card:
          #11161d;

        --ayon-ai-line:
          rgba(
            255,
            255,
            255,
            .10
          );

        --ayon-ai-text:
          #f7f8fb;

        --ayon-ai-muted:
          #9ba7b5;

      }


      #ayonAiFab {

        position:
          fixed;

        right:
          18px;

        bottom:
          92px;

        z-index:
          9950;

        width:
          66px;

        height:
          66px;

        border-radius:
          50%;

        border:
          2px solid
          rgba(
            255,
            116,
            20,
            .85
          );

        background:
          linear-gradient(
            145deg,
            #151a21,
            #07090c
          );

        box-shadow:
          0 16px 40px
          rgba(
            0,
            0,
            0,
            .42
          ),
          0 0 0 6px
          rgba(
            255,
            116,
            20,
            .10
          );

        padding:
          3px;

        cursor:
          pointer;

        display:
          grid;

        place-items:
          center;

        transition:
          .2s ease;

      }


      #ayonAiFab:active {

        transform:
          scale(
            .95
          );

      }


      #ayonAiFab img {

        width:
          100%;

        height:
          100%;

        border-radius:
          50%;

        object-fit:
          cover;

        display:
          block;

      }


      #ayonAiFab .ayon-ai-fallback {

        width:
          100%;

        height:
          100%;

        border-radius:
          50%;

        display:
          none;

        place-items:
          center;

        font-weight:
          900;

        font-size:
          15px;

        background:
          linear-gradient(
            135deg,
            #ff7414,
            #ff9f45
          );

        color:
          #111;

      }


      #ayonAiFab::after {

        content:
          'AI';

        position:
          absolute;

        right:
          -4px;

        top:
          -3px;

        background:
          #ff7414;

        color:
          #090b0e;

        border:
          2px solid
          #090b0e;

        font-size:
          10px;

        font-weight:
          1000;

        line-height:
          1;

        padding:
          5px 6px;

        border-radius:
          999px;

      }


      #ayonAiPanel {

        position:
          fixed;

        right:
          14px;

        bottom:
          80px;

        z-index:
          9949;

        width:
          min(
            410px,
            calc(
              100vw -
              20px
            )
          );

        height:
          min(
            690px,
            calc(
              100dvh -
              110px
            )
          );

        border-radius:
          28px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .10
          );

        background:
          linear-gradient(
            180deg,
            rgba(
              13,
              17,
              23,
              .99
            ),
            rgba(
              5,
              7,
              10,
              .99
            )
          );

        box-shadow:
          0 28px 80px
          rgba(
            0,
            0,
            0,
            .58
          );

        overflow:
          hidden;

        display:
          flex;

        flex-direction:
          column;

        opacity:
          0;

        pointer-events:
          none;

        transform:
          translateY(
            18px
          )
          scale(
            .97
          );

        transition:
          .22s ease;

        color:
          var(
            --ayon-ai-text
          );

        backdrop-filter:
          blur(
            18px
          );

      }


      #ayonAiPanel.open {

        opacity:
          1;

        pointer-events:
          auto;

        transform:
          translateY(
            0
          )
          scale(
            1
          );

      }


      .ayon-ai-head {

        position:
          relative;

        padding:
          16px
          16px
          14px;

        border-bottom:
          1px solid
          var(
            --ayon-ai-line
          );

        background:

          radial-gradient(
            circle at
            22% 0%,
            rgba(
              255,
              116,
              20,
              .20
            ),
            transparent
            35%
          ),

          linear-gradient(
            180deg,
            #151a21,
            #10141a
          );

      }


      .ayon-ai-headrow {

        display:
          flex;

        align-items:
          center;

        gap:
          12px;

      }


      .ayon-ai-avatar-wrap {

        width:
          58px;

        height:
          58px;

        border-radius:
          50%;

        position:
          relative;

        flex:
          0 0 auto;

      }


      .ayon-ai-avatar-wrap::before,
      .ayon-ai-avatar-wrap::after {

        content:
          '';

        position:
          absolute;

        inset:
          -5px;

        border-radius:
          50%;

        border:
          2px solid
          rgba(
            255,
            116,
            20,
            .45
          );

        opacity:
          .55;

      }


      #ayonAiPanel.speaking
      .ayon-ai-avatar-wrap::before {

        animation:
          ayonPulse
          1s
          infinite;

      }


      #ayonAiPanel.speaking
      .ayon-ai-avatar-wrap::after {

        animation:
          ayonPulse
          1s
          .35s
          infinite;

      }


      @keyframes ayonPulse {

        0% {

          transform:
            scale(
              .92
            );

          opacity:
            .85;

        }

        100% {

          transform:
            scale(
              1.35
            );

          opacity:
            0;

        }

      }


      .ayon-ai-avatar {

        width:
          58px;

        height:
          58px;

        border-radius:
          50%;

        object-fit:
          cover;

        border:
          2px solid
          #ff7414;

        position:
          relative;

        z-index:
          2;

        background:
          #111;

      }


      .ayon-ai-title {

        min-width:
          0;

        flex:
          1;

      }


      .ayon-ai-title h3 {

        margin:
          0;

        font-size:
          17px;

        line-height:
          1.15;

      }


      .ayon-ai-title p {

        margin:
          5px 0 0;

        color:
          var(
            --ayon-ai-muted
          );

        font-size:
          11px;

      }


      .ayon-ai-online {

        display:
          inline-flex;

        align-items:
          center;

        gap:
          5px;

        color:
          #8bd99d;

        font-weight:
          700;

      }


      .ayon-ai-online::before {

        content:
          '';

        width:
          7px;

        height:
          7px;

        border-radius:
          50%;

        background:
          #35d46f;

        box-shadow:
          0 0 12px
          rgba(
            53,
            212,
            111,
            .7
          );

      }


      .ayon-ai-head-actions {

        display:
          flex;

        gap:
          6px;

      }


      .ayon-ai-icon-btn {

        width:
          34px;

        height:
          34px;

        border-radius:
          12px;

        border:
          1px solid
          var(
            --ayon-ai-line
          );

        background:
          rgba(
            255,
            255,
            255,
            .05
          );

        color:
          #fff;

        font-size:
          16px;

        cursor:
          pointer;

      }


      .ayon-ai-quick {

        display:
          flex;

        gap:
          7px;

        overflow-x:
          auto;

        padding:
          10px 12px;

        border-bottom:
          1px solid
          var(
            --ayon-ai-line
          );

        scrollbar-width:
          none;

      }


      .ayon-ai-quick::-webkit-scrollbar {

        display:
          none;

      }


      .ayon-ai-chip {

        flex:
          0 0 auto;

        border:
          1px solid
          rgba(
            255,
            116,
            20,
            .35
          );

        background:
          rgba(
            255,
            116,
            20,
            .08
          );

        color:
          #ffd9be;

        border-radius:
          999px;

        padding:
          8px 10px;

        font-size:
          11px;

        font-weight:
          800;

        cursor:
          pointer;

      }


      #ayonAiMessages {

        flex:
          1;

        overflow-y:
          auto;

        padding:
          14px 12px 18px;

        scroll-behavior:
          smooth;

      }


      .ayon-msg {

        display:
          flex;

        margin:
          8px 0;

        gap:
          8px;

        align-items:
          flex-end;

      }


      .ayon-msg.user {

        justify-content:
          flex-end;

      }


      .ayon-msg.ai {

        justify-content:
          flex-start;

      }


      .ayon-msg .mini-avatar {

        width:
          28px;

        height:
          28px;

        border-radius:
          50%;

        object-fit:
          cover;

        border:
          1px solid
          rgba(
            255,
            116,
            20,
            .55
          );

        flex:
          0 0 auto;

      }


      .ayon-bubble {

        max-width:
          82%;

        border-radius:
          18px;

        padding:
          10px 12px;

        white-space:
          pre-wrap;

        line-height:
          1.46;

        font-size:
          13px;

        word-break:
          break-word;

      }


      .ayon-msg.user
      .ayon-bubble {

        background:
          linear-gradient(
            135deg,
            #ff7414,
            #ff9140
          );

        color:
          #0a0b0d;

        border-bottom-right-radius:
          5px;

        font-weight:
          700;

      }


      .ayon-msg.ai
      .ayon-bubble {

        background:
          #151b22;

        color:
          #f6f7f9;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .08
          );

        border-bottom-left-radius:
          5px;

      }


      .ayon-ai-typing {

        display:
          inline-flex;

        gap:
          4px;

        align-items:
          center;

        min-width:
          46px;

      }


      .ayon-ai-typing i {

        width:
          6px;

        height:
          6px;

        background:
          #ff8c3d;

        border-radius:
          50%;

        display:
          block;

        animation:
          ayonDot
          1s
          infinite
          ease-in-out;

      }


      .ayon-ai-typing i:nth-child(2) {

        animation-delay:
          .15s;

      }


      .ayon-ai-typing i:nth-child(3) {

        animation-delay:
          .30s;

      }


      @keyframes ayonDot {

        0%,
        80%,
        100% {

          transform:
            translateY(
              0
            );

          opacity:
            .35;

        }

        40% {

          transform:
            translateY(
              -5px
            );

          opacity:
            1;

        }

      }


      .ayon-ai-compose {

        padding:
          10px;

        border-top:
          1px solid
          var(
            --ayon-ai-line
          );

        background:
          #0b0f14;

      }


      .ayon-ai-inputrow {

        display:
          grid;

        grid-template-columns:
          44px
          1fr
          44px;

        gap:
          7px;

        align-items:
          end;

      }


      #ayonAiMic,
      #ayonAiSend {

        width:
          44px;

        height:
          44px;

        border-radius:
          14px;

        border:
          1px solid
          var(
            --ayon-ai-line
          );

        cursor:
          pointer;

        font-size:
          18px;

      }


      #ayonAiMic {

        background:
          #171d25;

        color:
          #fff;

      }


      #ayonAiMic.listening {

        background:
          #b91c1c;

        box-shadow:
          0 0 0 7px
          rgba(
            185,
            28,
            28,
            .16
          );

        animation:
          ayonMic
          1s
          infinite;

      }


      @keyframes ayonMic {

        50% {

          transform:
            scale(
              .94
            );

        }

      }


      #ayonAiSend {

        background:
          #ff7414;

        color:
          #090b0d;

        font-weight:
          900;

      }


      #ayonAiInput {

        resize:
          none;

        min-height:
          44px;

        max-height:
          100px;

        border-radius:
          14px;

        border:
          1px solid
          var(
            --ayon-ai-line
          );

        background:
          #141a21;

        color:
          #fff;

        outline:
          none;

        padding:
          11px 12px;

        font:
          inherit;

        font-size:
          13px;

        line-height:
          1.35;

      }


      #ayonAiInput:focus {

        border-color:
          rgba(
            255,
            116,
            20,
            .7
          );

        box-shadow:
          0 0 0 3px
          rgba(
            255,
            116,
            20,
            .10
          );

      }


      .ayon-ai-foot {

        display:
          flex;

        align-items:
          center;

        justify-content:
          space-between;

        gap:
          8px;

        padding:
          7px 2px 0;

        color:
          #737f8d;

        font-size:
          9px;

      }


      .ayon-ai-voice-toggle {

        border:
          0;

        background:
          transparent;

        color:
          #aab5c1;

        font-size:
          10px;

        cursor:
          pointer;

        padding:
          3px;

      }


      .ayon-ai-transcript {

        font-size:
          10px;

        color:
          #ffb27c;

        min-height:
          15px;

        padding:
          0 2px 6px;

      }


      @media (
        max-width:
        640px
      ) {

        #ayonAiFab {

          right:
            14px;

          bottom:
            88px;

          width:
            62px;

          height:
            62px;

        }


        #ayonAiPanel {

          left:
            0;

          right:
            0;

          bottom:
            0;

          width:
            100%;

          height:
            calc(
              100dvh -
              12px
            );

          max-height:
            none;

          border-radius:
            26px 26px 0 0;

          transform:
            translateY(
              30px
            );

        }


        #ayonAiPanel.open {

          transform:
            translateY(
              0
            );

        }

      }

    `;


    document.head
      .appendChild(
        style
      );

  }



  /* =========================================================
     BUILD AI UI
  ========================================================= */

  function injectUI() {

    if (
      $ai(
        '#ayonAiFab'
      )
    ) {

      return;

    }


    const fab =
      document.createElement(
        'button'
      );


    fab.id =
      'ayonAiFab';


    fab.type =
      'button';


    fab.setAttribute(
      'aria-label',
      'Open AYON AI Sales Assistant'
    );


    fab.innerHTML = `

      <img
        src="${AVATAR_SRC}"
        alt="AYON AI Avatar"
        onerror="
          this.style.display='none';
          this.nextElementSibling.style.display='grid'
        "
      >

      <span class="ayon-ai-fallback">
        AYON
      </span>

    `;


    const panel =
      document.createElement(
        'section'
      );


    panel.id =
      'ayonAiPanel';


    panel.setAttribute(
      'aria-label',
      'AYON AI Sales Assistant'
    );


    panel.innerHTML = `

      <div class="ayon-ai-head">

        <div class="ayon-ai-headrow">

          <div class="ayon-ai-avatar-wrap">

            <img
              class="ayon-ai-avatar"
              src="${AVATAR_SRC}"
              alt="AYON AI Avatar"
            >

          </div>


          <div class="ayon-ai-title">

            <h3>
              AYON AI
            </h3>

            <p>

              <span class="ayon-ai-online">
                Ready
              </span>

              • Your Sales Assistant

            </p>

          </div>


          <div class="ayon-ai-head-actions">

            <button
              id="ayonAiClear"
              class="ayon-ai-icon-btn"
              title="Clear chat"
            >
              ↺
            </button>

            <button
              id="ayonAiClose"
              class="ayon-ai-icon-btn"
              title="Close"
            >
              ×
            </button>

          </div>

        </div>

      </div>


      <div class="ayon-ai-quick">

        <button
          class="ayon-ai-chip"
          data-aiq="আজ কোথায় focus করব?"
        >
          আজকের Focus
        </button>


        <button
          class="ayon-ai-chip"
          data-aiq="Target achieve করতে daily কত sales দরকার?"
        >
          Target Plan
        </button>


        <button
          class="ayon-ai-chip"
          data-aiq="Zero-sales outlet কোনগুলো?"
        >
          Zero Sales
        </button>


        <button
          class="ayon-ai-chip"
          data-aiq="কোন SKU push করব?"
        >
          SKU Opportunity
        </button>


        <button
          class="ayon-ai-chip"
          data-aiq="Buyer order দিচ্ছে না, কী বলব?"
        >
          Buyer Advice
        </button>


        <button
          class="ayon-ai-chip"
          data-aiq="Meeting-এর 5টা point দাও"
        >
          Meeting Points
        </button>

      </div>


      <div id="ayonAiMessages">
      </div>


      <div class="ayon-ai-compose">

        <div
          id="ayonAiTranscript"
          class="ayon-ai-transcript"
        >
        </div>


        <div class="ayon-ai-inputrow">

          <button
            id="ayonAiMic"
            type="button"
            title="Speak"
          >
            🎙
          </button>


          <textarea
            id="ayonAiInput"
            rows="1"
            placeholder="Sales নিয়ে প্রশ্ন করুন…"
          ></textarea>


          <button
            id="ayonAiSend"
            type="button"
            title="Send"
          >
            ➤
          </button>

        </div>


        <div class="ayon-ai-foot">

          <span>
            ${BUILD}
            • No paid API
          </span>


          <button
            id="ayonAiVoiceToggle"
            class="ayon-ai-voice-toggle"
            type="button"
          >
            🔊 Voice ON
          </button>

        </div>

      </div>

    `;


    document.body
      .appendChild(
        panel
      );


    document.body
      .appendChild(
        fab
      );


    fab.onclick =
      () =>
        togglePanel(
          true
        );


    $ai(
      '#ayonAiClose'
    ).onclick =
      () =>
        togglePanel(
          false
        );


    $ai(
      '#ayonAiClear'
    ).onclick =
      clearChat;


    $ai(
      '#ayonAiSend'
    ).onclick =
      sendCurrentInput;


    $ai(
      '#ayonAiMic'
    ).onclick =
      toggleListening;


    $ai(
      '#ayonAiVoiceToggle'
    ).onclick =
      () => {

        autoVoice =
          !autoVoice;


        if (
          !autoVoice
        ) {

          try {

            speechSynthesis
              .cancel();

          } catch {}


          panel
            .classList
            .remove(
              'speaking'
            );

        }


        $ai(
          '#ayonAiVoiceToggle'
        ).textContent =
          autoVoice
            ? '🔊 Voice ON'
            : '🔇 Voice OFF';

      };


    $ai(
      '#ayonAiInput'
    )
      .addEventListener(
        'keydown',
        e => {

          if (
            e.key ===
            'Enter' &&
            !e.shiftKey
          ) {

            e.preventDefault();

            sendCurrentInput();

          }

        }
      );


    $ai(
      '#ayonAiInput'
    )
      .addEventListener(
        'input',
        e => {

          e.target.style.height =
            '44px';

          e.target.style.height =
            Math.min(
              100,
              e.target.scrollHeight
            ) +
            'px';

        }
      );


    $$ai(
      '[data-aiq]'
    )
      .forEach(
        b => {

          b.onclick =
            () =>
              ask(
                b.dataset.aiq,
                false
              );

        }
      );


    restoreChat();


    if (
      !chatHistory.length
    ) {

      const c =
        salesContextSummary();


      addMessage(

        'ai',

        `হ্যালো ${c.name}। আমি AYON AI — আপনার Sales Assistant। Live target, outlet, SKU, incentive, task, buyer handling ও meeting নিয়ে প্রশ্ন করুন।`

      );

    }

  }



  /* =========================================================
     OPEN / CLOSE
  ========================================================= */

  function togglePanel(value) {

    opened =
      typeof value ===
      'boolean'
        ? value
        : !opened;


    $ai(
      '#ayonAiPanel'
    )
      ?.classList
      .toggle(
        'open',
        opened
      );


    if (
      opened
    ) {

      setTimeout(
        () =>
          $ai(
            '#ayonAiInput'
          )
            ?.focus(),
        180
      );


      scrollMessages();

    } else if (
      listening
    ) {

      stopListening();

    }

  }



  /* =========================================================
     CHAT MESSAGES
  ========================================================= */

  function addMessage(
    role,
    text,
    save = true
  ) {

    const box =
      $ai(
        '#ayonAiMessages'
      );


    if (!box) {

      return;

    }


    const row =
      document.createElement(
        'div'
      );


    row.className =
      `ayon-msg ${role}`;


    if (
      role ===
      'ai'
    ) {

      const img =
        document.createElement(
          'img'
        );


      img.className =
        'mini-avatar';


      img.src =
        AVATAR_SRC;


      img.alt =
        'AYON';


      img.onerror =
        () => {

          img.style.display =
            'none';

        };


      row.appendChild(
        img
      );

    }


    const bubble =
      document.createElement(
        'div'
      );


    bubble.className =
      'ayon-bubble';


    bubble.textContent =
      text;


    row.appendChild(
      bubble
    );


    box.appendChild(
      row
    );


    if (
      save
    ) {

      chatHistory.push({

        role,

        text,

        at:
          Date.now()

      });


      if (
        chatHistory.length >
        MAX_HISTORY
      ) {

        chatHistory =
          chatHistory.slice(
            -MAX_HISTORY
          );

      }


      saveChat();

    }


    scrollMessages();

  }



  function showTyping() {

    const box =
      $ai(
        '#ayonAiMessages'
      );


    if (!box) {

      return null;

    }


    const row =
      document.createElement(
        'div'
      );


    row.className =
      'ayon-msg ai';


    row.id =
      'ayonAiTypingRow';


    row.innerHTML = `

      <img
        class="mini-avatar"
        src="${AVATAR_SRC}"
        alt="AYON"
        onerror="
          this.style.display='none'
        "
      >

      <div class="ayon-bubble">

        <span class="ayon-ai-typing">

          <i></i>
          <i></i>
          <i></i>

        </span>

      </div>

    `;


    box.appendChild(
      row
    );


    scrollMessages();


    return row;

  }



  function scrollMessages() {

    const box =
      $ai(
        '#ayonAiMessages'
      );


    if (box) {

      box.scrollTop =
        box.scrollHeight;

    }

  }



  /* =========================================================
     CHAT HISTORY
  ========================================================= */

  function saveChat() {

    try {

      localStorage.setItem(

        'ayon.ai.chat.v1',

        JSON.stringify(
          chatHistory
        )

      );

    } catch {}

  }



  function restoreChat() {

    try {

      const x =
        JSON.parse(
          localStorage.getItem(
            'ayon.ai.chat.v1'
          ) ||
          '[]'
        );


      if (
        !Array.isArray(x)
      ) {

        return;

      }


      chatHistory =
        x.slice(
          -MAX_HISTORY
        );


      for (
        const m of chatHistory
      ) {

        addMessage(
          m.role,
          m.text,
          false
        );

      }

    } catch {}

  }



  function clearChat() {

    try {

      speechSynthesis
        .cancel();

    } catch {}


    chatHistory =
      [];


    saveChat();


    const box =
      $ai(
        '#ayonAiMessages'
      );


    if (box) {

      box.innerHTML =
        '';

    }


    addMessage(

      'ai',

      `নতুন chat শুরু হলো। ${getViewedName()}, sales নিয়ে বলুন—আমি ready।`

    );

  }



  /* =========================================================
     ASK / ANSWER
  ========================================================= */

  function sendCurrentInput() {

    const input =
      $ai(
        '#ayonAiInput'
      );


    const text =
      String(
        input?.value ||
        ''
      )
        .trim();


    if (!text) {

      return;

    }


    input.value =
      '';


    input.style.height =
      '44px';


    ask(
      text,
      false
    );

  }



  function ask(
    text,
    fromVoice = false
  ) {

    togglePanel(
      true
    );


    addMessage(
      'user',
      text
    );


    const typing =
      showTyping();


    /*
      Local processing.
      No API wait.
    */
    setTimeout(
      () => {

        typing
          ?.remove();


        const reply =
          answerQuestion(
            text
          );


        addMessage(
          'ai',
          reply
        );


        if (
          autoVoice &&
          (
            fromVoice ||
            opened
          )
        ) {

          speak(
            reply,
            text
          );

        }

      },
      220
    );

  }



  /* =========================================================
     VOICE OUTPUT
  ========================================================= */

  function preferredVoice(lang) {

    if (
      !(
        'speechSynthesis'
        in window
      )
    ) {

      return null;

    }


    const voices =
      speechSynthesis
        .getVoices() ||
      [];


    if (
      !voices.length
    ) {

      return null;

    }


    const wanted =
      lang.startsWith(
        'bn'
      )

        ? [
            'bn-BD',
            'bn-IN',
            'bn'
          ]

        : [
            'en-MY',
            'en-GB',
            'en-US',
            'en'
          ];


    for (
      const key of wanted
    ) {

      const v =
        voices.find(
          x =>
            String(
              x.lang ||
              ''
            )
              .toLowerCase()
              .startsWith(
                key.toLowerCase()
              )
        );


      if (v) {

        return v;

      }

    }


    return (
      voices[0] ||
      null
    );

  }



  function detectSpeechLang(
    question,
    answer
  ) {

    const text =
      `${question || ''} ${answer || ''}`;


    return (
      /[\u0980-\u09FF]/
        .test(text)
    )
      ? 'bn-BD'
      : 'en-MY';

  }



  function speak(
    text,
    question = ''
  ) {

    if (
      !autoVoice ||
      !(
        'speechSynthesis'
        in window
      )
    ) {

      return;

    }


    try {

      speechSynthesis
        .cancel();


      const clean =
        String(text)

          .replace(
            /[•→✓🔴🟠🟢🏆🎯✅🏪]/g,
            ' '
          )

          .replace(
            /\n+/g,
            '. '
          )

          .replace(
            /\s+/g,
            ' '
          )

          .trim();


      if (!clean) {

        return;

      }


      const u =
        new SpeechSynthesisUtterance(
          clean
        );


      const lang =
        detectSpeechLang(
          question,
          text
        );


      u.lang =
        lang;


      u.rate =
        lang.startsWith(
          'bn'
        )
          ? .95
          : 1;


      u.pitch =
        1;


      const v =
        preferredVoice(
          lang
        );


      if (v) {

        u.voice =
          v;

      }


      u.onstart =
        () => {

          $ai(
            '#ayonAiPanel'
          )
            ?.classList
            .add(
              'speaking'
            );

        };


      u.onend =
        () => {

          $ai(
            '#ayonAiPanel'
          )
            ?.classList
            .remove(
              'speaking'
            );

        };


      u.onerror =
        () => {

          $ai(
            '#ayonAiPanel'
          )
            ?.classList
            .remove(
              'speaking'
            );

        };


      speechSynthesis
        .speak(u);

    } catch {

      $ai(
        '#ayonAiPanel'
      )
        ?.classList
        .remove(
          'speaking'
        );

    }

  }



  /* =========================================================
     VOICE INPUT
  ========================================================= */

  function recognitionSupported() {

    return !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );

  }



  function buildRecognition() {

    if (
      !recognitionSupported()
    ) {

      return null;

    }


    const SR =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    const r =
      new SR();


    r.continuous =
      false;


    r.interimResults =
      true;


    r.maxAlternatives =
      1;


    r.lang =
      'bn-BD';



    r.onstart =
      () => {

        listening =
          true;


        $ai(
          '#ayonAiMic'
        )
          ?.classList
          .add(
            'listening'
          );


        if (
          $ai(
            '#ayonAiTranscript'
          )
        ) {

          $ai(
            '#ayonAiTranscript'
          ).textContent =
            'শুনছি…';

        }

      };



    r.onresult =
      event => {

        let interim =
          '';


        let finalText =
          '';


        for (
          let i =
            event.resultIndex;

          i <
          event.results.length;

          i++
        ) {

          const t =
            event.results[i][0]
              ?.transcript ||
            '';


          if (
            event.results[i]
              .isFinal
          ) {

            finalText +=
              t;

          } else {

            interim +=
              t;

          }

        }


        if (
          $ai(
            '#ayonAiTranscript'
          )
        ) {

          $ai(
            '#ayonAiTranscript'
          ).textContent =
            finalText ||
            interim ||
            'শুনছি…';

        }


        if (
          finalText.trim()
        ) {

          const text =
            finalText.trim();


          stopListening(
            false
          );


          if (
            $ai(
              '#ayonAiTranscript'
            )
          ) {

            $ai(
              '#ayonAiTranscript'
            ).textContent =
              '';

          }


          ask(
            text,
            true
          );

        }

      };



    r.onerror =
      event => {

        listening =
          false;


        $ai(
          '#ayonAiMic'
        )
          ?.classList
          .remove(
            'listening'
          );


        const msg =

          event?.error ===
          'not-allowed'

            ? 'Microphone permission দিন।'

            : event?.error ===
              'no-speech'

              ? 'কথা শুনতে পাইনি—আবার mic চাপুন।'

              : 'Voice input unavailable. Text chat ব্যবহার করুন।';


        if (
          $ai(
            '#ayonAiTranscript'
          )
        ) {

          $ai(
            '#ayonAiTranscript'
          ).textContent =
            msg;

        }

      };



    r.onend =
      () => {

        listening =
          false;


        $ai(
          '#ayonAiMic'
        )
          ?.classList
          .remove(
            'listening'
          );

      };


    return r;

  }



  function toggleListening() {

    if (
      listening
    ) {

      stopListening();

      return;

    }


    if (
      !recognitionSupported()
    ) {

      const msg =
        'Voice recognition-এর জন্য Android Chrome ব্যবহার করুন।';


      if (
        $ai(
          '#ayonAiTranscript'
        )
      ) {

        $ai(
          '#ayonAiTranscript'
        ).textContent =
          msg;

      }


      return;

    }


    try {

      recognition =
        buildRecognition();


      recognition
        .start();

    } catch {

      if (
        $ai(
          '#ayonAiTranscript'
        )
      ) {

        $ai(
          '#ayonAiTranscript'
        ).textContent =
          'Mic start হয়নি—আবার চেষ্টা করুন।';

      }

    }

  }



  function stopListening(
    clear = true
  ) {

    listening =
      false;


    $ai(
      '#ayonAiMic'
    )
      ?.classList
      .remove(
        'listening'
      );


    try {

      recognition
        ?.stop();

    } catch {}


    recognition =
      null;


    if (
      clear &&
      $ai(
        '#ayonAiTranscript'
      )
    ) {

      $ai(
        '#ayonAiTranscript'
      ).textContent =
        '';

    }

  }



  /* =========================================================
     START AYON AI
  ========================================================= */

  function init() {

    injectStyle();

    injectUI();


    /*
      Preload avatar.
      Does not block main app.
    */
    const img =
      new Image();


    img.src =
      AVATAR_SRC;



    /*
      Some Android browsers load voices later.
    */
    if (
      'speechSynthesis'
      in window
    ) {

      try {

        speechSynthesis
          .getVoices();

      } catch {}


      speechSynthesis
        .onvoiceschanged =
          () => {

            try {

              speechSynthesis
                .getVoices();

            } catch {}

          };

    }



    window.AYON_AI = {

      open:
        () =>
          togglePanel(
            true
          ),

      close:
        () =>
          togglePanel(
            false
          ),

      ask:
        q =>
          ask(
            String(
              q || ''
            ),
            false
          ),

      version:
        BUILD

    };

  }



  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(

      'DOMContentLoaded',

      init,

      {
        once:
          true
      }

    );

  } else {

    init();

  }

})();
