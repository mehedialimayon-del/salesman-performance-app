'use strict';

/* =========================================================
   AYON AI — FINAL HUMAN SALES COACH
   Sales Performance Hub
   Creator & Developer: Mehedi Alim Ayon
   Head of Sales: Md Parvez Hira

   FINAL PRINCIPLES
   ---------------------------------------------------------
   1. Default language: Bengali
   2. Address every user as "স্যার"
   3. Never address anyone as "ভাই"
   4. Manager Knowledge has first priority
   5. Live database is used only for live-data questions
   6. General questions use Human Sales Coach
   7. Manager can access authorized team data
   8. SR can access only authorized self data
   9. Funny/emotional tone is allowed for coaching
   10. Never invent sales figures
   11. No paid/external AI API required
========================================================= */

(() => {

  const BUILD = 'AYON-AI-FINAL-2026.09.18-V8';
  const AVATAR_SRC = 'icons/ayon-avatar.jpg';
  const CHAT_KEY = 'ayon.ai.final.chat.v8';
  const KB_CACHE_KEY = 'ayon.ai.kb.cache.v8';

  const MAX_HISTORY = 50;
  const KB_CACHE_MINUTES = 10;
  const LIVE_CACHE_MINUTES = 3;

  const CREATOR_NAME = 'Mehedi Alim Ayon';
  const HEAD_OF_SALES = 'Md Parvez Hira';

  let opened = false;
  let listening = false;
  let recognition = null;
  let autoVoice = true;
  let chatHistory = [];
  let knowledgeCache = [];
  let knowledgeLoadedAt = 0;
  let liveLoadedAt = 0;
  let sending = false;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const num = v =>
    Number.isFinite(Number(v))
      ? Number(v)
      : 0;

  const rm = v =>
    `RM ${num(v).toLocaleString(
      'en-MY',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`;

  const pct = v =>
    `${num(v).toFixed(1)}%`;

  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );

  /* =========================================================
     APP BRIDGE
  ========================================================= */

  function sph() {
    return window.SPH || {};
  }

  function getSession() {
    try {
      if (typeof sph().getSession === 'function') {
        return sph().getSession() || {};
      }

      if (
        typeof session !== 'undefined' &&
        session
      ) {
        return session;
      }

    } catch {}

    return {};
  }

  function getCurrent() {
    try {
      if (typeof sph().getCurrent === 'function') {
        return sph().getCurrent() || {};
      }

      if (
        typeof current !== 'undefined' &&
        current
      ) {
        return current;
      }

    } catch {}

    return {};
  }

  function getTeam() {
    try {
      if (
        typeof sph().getTeamSnapshot ===
        'function'
      ) {
        const x =
          sph().getTeamSnapshot();

        return Array.isArray(x)
          ? x
          : [];
      }

      if (
        typeof teamSnapshot !== 'undefined' &&
        Array.isArray(teamSnapshot)
      ) {
        return teamSnapshot;
      }

    } catch {}

    return [];
  }

  function getMonth() {
    try {
      if (
        typeof sph().getSelectedMonth ===
        'function'
      ) {
        return (
          sph().getSelectedMonth() ||
          ''
        );
      }

      if (
        typeof selectedMonth !== 'undefined'
      ) {
        return selectedMonth || '';
      }

    } catch {}

    return '';
  }

  function getDate() {
    try {
      if (
        typeof sph().getSelectedDate ===
        'function'
      ) {
        return (
          sph().getSelectedDate() ||
          ''
        );
      }

      if (
        typeof selectedDate !== 'undefined'
      ) {
        return selectedDate || '';
      }

    } catch {}

    return '';
  }

  function getManagerView() {
    try {
      if (
        typeof sph().getManagerView ===
        'function'
      ) {
        return (
          sph().getManagerView() ||
          ''
        );
      }

      if (
        typeof managerView !== 'undefined'
      ) {
        return managerView || '';
      }

    } catch {}

    return '';
  }

  function isManagerContext() {
    try {
      if (
        typeof sph().isManager ===
        'function'
      ) {
        return !!sph().isManager();
      }
    } catch {}

    const s = getSession();

    const role =
      String(
        s?.role || ''
      ).toUpperCase();

    return (
      String(
        s?.mode || ''
      ).toLowerCase() === 'manager' ||
      role.includes('MANAGER') ||
      role.includes('HR')
    );
  }

  async function appApi(
    action,
    payload = {}
  ) {

    if (
      typeof sph().apiPost ===
      'function'
    ) {
      return sph().apiPost(
        action,
        payload
      );
    }

    throw new Error(
      'Sales Performance Hub API is not ready.'
    );
  }

  /* =========================================================
     BASIC DATA
  ========================================================= */

  function performance() {
    return (
      getCurrent()?.performance ||
      {}
    );
  }

  function incentives() {
    const x =
      getCurrent()?.incentives;

    return Array.isArray(x)
      ? x
      : [];
  }

  function tasks() {
    const x =
      getCurrent()?.tasks;

    return Array.isArray(x)
      ? x
      : [];
  }

  function cpoRows() {
    const c =
      getCurrent();

    const x =
      c?.cpo ||
      c?.cpoProofs ||
      [];

    return Array.isArray(x)
      ? x
      : [];
  }

  function executionOrders() {
    const x =
      getCurrent()?.executionOrders;

    return Array.isArray(x)
      ? x
      : [];
  }

  function outletSales() {
    const x =
      getCurrent()?.outletSales;

    return Array.isArray(x)
      ? x
      : [];
  }

  function skuSales() {
    const x =
      getCurrent()?.skuSales;

    return Array.isArray(x)
      ? x
      : [];
  }

  function routeOutletsSafe() {
    const x =
      getCurrent()?.outlets;

    return Array.isArray(x)
      ? x
      : [];
  }

  function zeroOutletsSafe() {
    const x =
      getCurrent()?.zeroOutlets;

    return Array.isArray(x)
      ? x
      : [];
  }

  function todayKey() {
    try {
      const d =
        getDate();

      if (d) return d;

      if (
        typeof localDate ===
        'function'
      ) {
        return localDate();
      }
    } catch {}

    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  function getViewedName() {
    const c =
      getCurrent();

    return (
      c?.user?.['Full Name'] ||
      c?.user?.name ||
      getSession()?.name ||
      getSession()?.id ||
      'Sales User'
    );
  }

  function appReady() {
    const c =
      getCurrent();

    return !!(
      c &&
      Object.keys(c).length
    );
  }

  /* =========================================================
     TEXT UNDERSTANDING
  ========================================================= */

  function normalizeText(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(
        /[!?.,;:()[\]{}"'`~।]/g,
        ' '
      )
      .replace(/\s+/g, ' ');
  }

  function has(q, words) {
    return words.some(
      word => q.includes(word)
    );
  }

  function hasAny(text, words) {
    const q =
      normalizeText(text);

    return has(q, words);
  }

  function isGreeting(q) {
    const t =
      normalizeText(q);

    const words = [
      'hello',
      'hi',
      'hey',
      'হ্যালো',
      'হাই',
      'সালাম',
      'assalam',
      'assalamu alaikum',
      'আসসালামু আলাইকুম'
    ];

    return words.includes(t);
  }

  function isCreatorQuestion(q) {
    return hasAny(
      q,
      [
        'creator',
        'created',
        'developer',
        'developed',
        'কে বানাইছে',
        'কে বানিয়েছে',
        'কে বানিয়েছে',
        'কে তৈরি করেছে',
        'কে তৈরি করছে',
        'কার বানানো',
        'তোমাকে কে বানিয়েছে',
        'তোমাকে কে বানিয়েছে',
        'এই অ্যাপ কে বানিয়েছে',
        'এই অ্যাপ কে বানিয়েছে',
        'ayon ai কে বানিয়েছে',
        'ayon ai কে বানিয়েছে'
      ]
    );
  }

  function isHeadOfSalesQuestion(q) {
    const x =
      normalizeText(q);

    return (
      has(
        x,
        [
          'head of sales',
          'sales head',
          'হেড অফ সেলস',
          'হেড অব সেলস',
          'হেড অফ সেল',
          'sales boss'
        ]
      )
    );
  }

  /* =========================================================
     LIVE-DATA QUESTION DETECTION
  ========================================================= */

  function isLiveDataQuestion(text) {
    const q =
      normalizeText(text);

    const liveWords = [
      'আজকের সেলস',
      'আজ sales',
      'today sales',
      'today sale',
      'delivered sales',
      'delivery',
      'pending delivery',
      'achievement',
      'অ্যাচিভমেন্ট',
      'target কত',
      'টার্গেট কত',
      'shortfall',
      'শর্টফল',
      'zero sales',
      'জিরো সেলস',
      'zero outlet',
      'coverage',
      'কভারেজ',
      'pending task',
      'পেন্ডিং টাস্ক',
      'important work',
      'incentive কত',
      'ইনসেনটিভ কত',
      'cpo',
      'actual sales',
      'sales কত',
      'সেলস কত',
      'team sales',
      'টিম সেলস',
      'team target',
      'টিম টার্গেট',
      'sr data',
      'এসআর ডাটা',
      'performance কত',
      'পারফরম্যান্স কত',
      'অবস্থা কী',
      'অবস্থা কি',
      'অবস্থা কেমন'
    ];

    return has(
      q,
      liveWords
    );
  }

  /*
     IMPORTANT:
     "outlet" word alone does NOT trigger live database.

     Example:
     "Outlet-এ order কীভাবে নেব?"
     = Human Sales Coach

     "আমার zero-sales outlet কয়টা?"
     = Live Database
  */

  function liveCacheFresh() {
    return (
      appReady() &&
      Date.now() - liveLoadedAt <
      LIVE_CACHE_MINUTES *
      60 *
      1000
    );
  }

  async function refreshLiveIfNeeded() {
    if (liveCacheFresh()) {
      return true;
    }

    try {
      if (
        typeof sph().refresh ===
        'function'
      ) {
        await sph().refresh();
        liveLoadedAt =
          Date.now();

        return true;
      }
    } catch (e) {
      console.warn(
        'AYON live refresh',
        e
      );
    }

    return appReady();
  }

  /* =========================================================
     MANAGER KNOWLEDGE
  ========================================================= */

  function normalizeKnowledgeRow(x) {
    return {
      id:
        String(
          x?.ID ||
          x?.id ||
          ''
        ),

      question:
        String(
          x?.['Question / Keywords'] ||
          x?.question ||
          ''
        ).trim(),

      answer:
        String(
          x?.Answer ||
          x?.answer ||
          ''
        ).trim(),

      tone:
        String(
          x?.Tone ||
          x?.tone ||
          'NORMAL'
        ).toUpperCase(),

      active:
        String(
          x?.Active ??
          x?.active ??
          'TRUE'
        ).toUpperCase() !==
        'FALSE'
    };
  }

  function readKbCache() {
    try {
      const raw =
        JSON.parse(
          localStorage.getItem(
            KB_CACHE_KEY
          ) || 'null'
        );

      if (
        !raw ||
        !Array.isArray(raw.rows)
      ) {
        return false;
      }

      knowledgeCache =
        raw.rows.map(
          normalizeKnowledgeRow
        );

      knowledgeLoadedAt =
        num(raw.time);

      return true;

    } catch {
      return false;
    }
  }

  function saveKbCache() {
    try {
      localStorage.setItem(
        KB_CACHE_KEY,
        JSON.stringify({
          time:
            knowledgeLoadedAt,
          rows:
            knowledgeCache
        })
      );
    } catch {}
  }

  function kbFresh() {
    return (
      knowledgeCache.length &&
      Date.now() -
      knowledgeLoadedAt <
      KB_CACHE_MINUTES *
      60 *
      1000
    );
  }

  async function loadManagerKnowledge(
    force = false
  ) {

    if (
      !knowledgeCache.length
    ) {
      readKbCache();
    }

    if (
      !force &&
      kbFresh()
    ) {
      return knowledgeCache;
    }

    try {
      const r =
        await appApi(
          'aiKnowledgeList',
          {}
        );

      if (r?.ok) {
        knowledgeCache =
          (
            Array.isArray(r.data)
              ? r.data
              : []
          )
            .map(
              normalizeKnowledgeRow
            )
            .filter(
              x =>
                x.active &&
                x.question &&
                x.answer
            );

        knowledgeLoadedAt =
          Date.now();

        saveKbCache();
      }

    } catch (e) {
      console.warn(
        'AYON KB load',
        e
      );
    }

    return knowledgeCache;
  }

  function tokenize(text) {
    return normalizeText(text)
      .split(' ')
      .map(x => x.trim())
      .filter(x => x.length > 1);
  }

  function knowledgeScore(
    question,
    row
  ) {
    const q =
      normalizeText(question);

    const key =
      normalizeText(
        row.question
      );

    if (!q || !key) {
      return 0;
    }

    if (q === key) {
      return 100;
    }

    if (
      q.includes(key) ||
      key.includes(q)
    ) {
      return 90;
    }

    const qTokens =
      tokenize(q);

    const keys =
      row.question
        .split(/[,/|;\n]+/)
        .map(normalizeText)
        .filter(Boolean);

    let best = 0;

    for (const k of keys) {
      if (
        q.includes(k)
      ) {
        best =
          Math.max(
            best,
            85
          );

        continue;
      }

      const kTokens =
        tokenize(k);

      if (!kTokens.length) {
        continue;
      }

      const hit =
        kTokens.filter(
          token =>
            qTokens.includes(token) ||
            q.includes(token)
        ).length;

      const score =
        hit /
        kTokens.length *
        75;

      best =
        Math.max(
          best,
          score
        );
    }

    return best;
  }

  function matchManagerKnowledge(
    question
  ) {
    let winner = null;
    let best = 0;

    for (
      const row of
      knowledgeCache
    ) {
      if (!row.active) continue;

      const score =
        knowledgeScore(
          question,
          row
        );

      if (score > best) {
        best = score;
        winner = row;
      }
    }

    return (
      best >= 52
        ? winner
        : null
    );
  }

  /* =========================================================
     HUMAN / EMOTIONAL SALES COACH STYLE
  ========================================================= */

  function sir(text) {
    let x =
      String(text || '').trim();

    /*
       AYON AI itself will never address
       the user as "ভাই".
    */

    x = x.replace(
      /(^|\s)ভাই([,।!?\s]|$)/g,
      '$1স্যার$2'
    );

    if (
      !x.startsWith('স্যার')
    ) {
      x =
        'স্যার, ' + x;
    }

    return x;
  }

  function funnyLine(type = 'GENERAL') {

    const bank = {

      SALES_LOW: [
        'সেলস করার দিন কি শেষ হয়ে গেল নাকি? 😄 এখনই হতাশ হওয়ার কোনো কারণ নেই—একটা ভালো order-ই দিনের mood ঘুরিয়ে দিতে পারে।',

        'আজ market একটু ভাব নিচ্ছে মনে হচ্ছে 😄 সমস্যা নেই স্যার—buyer-এর “না” শুনে route শেষ হয় না, follow-up থেকেই অনেক সময় PO বের হয়।',

        'Sales meter একটু ঘুমাচ্ছে স্যার 😄 এখন তাকে জাগানোর সময়—zero outlet আর pending buyer দিয়ে শুরু করুন।',

        'আজ sales যদি লুকোচুরি খেলে, আমরাও ছাড়ছি না স্যার 😄 আগে দুইটা high-potential outlet ধরুন।'
      ],

      ZERO: [
        'Zero outlet-গুলোকে বেশি আরাম দিলে ওরা কিন্তু মাসের শেষ পর্যন্ত zero হয়েই বসে থাকবে 😄 আজ দু-একটাকে order করিয়ে ঘুম ভাঙান।',

        'Zero-sales outlet মানে দরজা বন্ধ না স্যার—দরজায় আরেকবার knock করার invitation 😄',

        'ওই zero-গুলো dashboard-এ বেশি সুন্দর লাগছে না স্যার 😄 দুই-একটা green করে আসা যাক।'
      ],

      TARGET: [
        'Target একটু দূরে আছে, কিন্তু পালিয়ে যায়নি স্যার 😄 shortfall-টাকে daily ভাগ করলেই যুদ্ধটা অনেক ছোট হয়ে যায়।',

        'Target আমাদের দিকে তাকিয়ে আছে স্যার 😄 এখন calculator না, execution দিয়ে উত্তর দেওয়ার সময়।',

        'মাস এখনো শেষ হয়নি স্যার—target-এরও পালানোর রাস্তা নেই 😄'
      ],

      TASK: [
        'Pending task বেশি জমতে দিলে ওগুলো রাতে মাথার মধ্যে meeting ডাকবে স্যার 😄 আগে urgent দুইটা শেষ করি।',

        'Task list-কে museum বানানো যাবে না স্যার 😄 একটা একটা করে DONE করতে হবে।'
      ],

      MOTIVATION: [
        'একটা খারাপ সকাল পুরো দিনের result না স্যার। Sales-এ comeback অনেক সময় শেষ দুইটা outlet থেকেই আসে।',

        'Buyer “না” বলেছে মানে final result “না” না স্যার। Timing, stock, display আর follow-up বদলালে answer-ও বদলায়।',

        'Pressure থাকবে স্যার—কিন্তু pressure-কে plan-এ convert করতে পারলেই field সহজ হয়।'
      ],

      GENERAL: [
        'Sales field স্যার—এখানে calculator-এর সাথে একটু psychology-ও চালাতে হয় 😄',

        'Buyer order না দিলে মন খারাপ না স্যার—প্রথমে কারণটা বের করি, তারপর সেই কারণটাই handle করি।',

        'একটা outlet না দিলে আরেকটা আছে স্যার 😄 কিন্তু follow-up ছাড়া কাউকেই সহজে ছাড়ব না।'
      ]
    };

    const arr =
      bank[type] ||
      bank.GENERAL;

    /*
       Deterministic rotation.
       No random dependency needed.
    */

    const index =
      Math.abs(
        todayKey()
          .split('')
          .reduce(
            (a,c) =>
              a +
              c.charCodeAt(0),
            0
          )
      ) %
      arr.length;

    return arr[index];
  }

  function emotionalClose(
    type = 'MOTIVATION'
  ) {
    const c =
      context();

    if (
      c.percent >= 100
    ) {
      return 'Target complete—এখন quality sales, repeat order আর next-month base শক্ত করার সময় স্যার।';
    }

    if (
      c.percent >= 80
    ) {
      return 'আপনি target-এর কাছাকাছি আছেন স্যার। এখন consistency নষ্ট না করে high-potential outlet-এ চাপ রাখুন।';
    }

    if (
      c.percent >= 50
    ) {
      return 'Game এখনো পুরোপুরি open স্যার। Daily requirement ধরে disciplined execution করলে gap কমানো সম্ভব।';
    }

    return funnyLine(
      type
    );
  }

  /* =========================================================
     PERFORMANCE CONTEXT
  ========================================================= */

  function remainingDaysInMonth() {
    const m =
      getMonth() ||
      todayKey().slice(0,7);

    const [y, mo] =
      m.split('-').map(Number);

    if (!y || !mo) {
      return 1;
    }

    const last =
      new Date(
        y,
        mo,
        0
      ).getDate();

    const today =
      todayKey();

    const day =
      today.startsWith(m)
        ? Number(
            today.slice(8,10)
          )
        : 1;

    return Math.max(
      1,
      last - day + 1
    );
  }

  function context() {
    const p =
      performance();

    const pending =
      tasks().filter(
        x =>
          String(
            x.Status || ''
          ).toUpperCase() !==
          'DONE'
      );

    const orders =
      executionOrders();

    const pendingOrders =
      orders.filter(
        x =>
          ['PENDING','PARTIAL']
            .includes(
              String(
                x.status ||
                x.Status ||
                ''
              ).toUpperCase()
            )
      );

    const zeroRows =
      zeroOutletsSafe();

    const target =
      num(
        p.target
      );

    const achievement =
      num(
        p.achievement ||
        p.sales
      );

    const percent =
      num(
        p.percent ||
        p.achievementPercent ||
        (
          target
            ? achievement /
              target *
              100
            : 0
        )
      );

    const shortfall =
      num(
        p.shortfall ||
        Math.max(
          0,
          target -
          achievement
        )
      );

    const days =
      remainingDaysInMonth();

    return {
      name:
        getViewedName(),

      staffId:
        getManagerView() ||
        getSession()?.id ||
        '',

      target,

      achievement,

      percent,

      shortfall,

      todaySales:
        num(
          p.todaySales
        ),

      coverage:
        num(
          p.coverage
        ),

      covered:
        num(
          p.coveredOutlets
        ),

      route:
        num(
          p.routeOutlets ||
          routeOutletsSafe().length
        ),

      zero:
        zeroRows.length ||
        num(
          p.zeroOutlets
        ),

      pendingTasks:
        pending.length,

      pendingDelivery:
        num(
          p.pendingDelivery
        ) ||
        pendingOrders.reduce(
          (a,x) =>
            a +
            num(
              x.pendingAmount
            ),
          0
        ),

      pendingOrders:
        pendingOrders.length,

      cpo:
        cpoRows().length,

      incentiveCount:
        incentives().length,

      days,

      dailyNeed:
        shortfall /
        days
    };
  }

  /* =========================================================
     OUTLET / SKU ANALYSIS
  ========================================================= */

  function outletOpportunityRows() {
    const totals =
      new Map();

    for (
      const s of
      outletSales()
    ) {
      const name =
        String(
          s?.['Outlet Name'] ||
          s?.outletName ||
          ''
        ).trim();

      if (!name) continue;

      totals.set(
        name,
        (
          totals.get(name) ||
          0
        ) +
        num(
          s?.['Sales Value'] ||
          s?.salesValue
        )
      );
    }

    return routeOutletsSafe()
      .map(o => {
        const name =
          String(
            o?.['Outlet Name'] ||
            o?.outletName ||
            ''
          ).trim();

        return {
          name,

          code:
            String(
              o?.['Outlet Code'] ||
              o?.outletCode ||
              ''
            ),

          category:
            String(
              o?.Category ||
              o?.category ||
              ''
            ),

          route:
            String(
              o?.Route ||
              o?.route ||
              ''
            ),

          sales:
            totals.get(name) ||
            0
        };
      })
      .sort(
        (a,b) =>
          a.sales -
          b.sales
      );
  }

  function skuRanking() {
    const map =
      new Map();

    for (
      const s of
      skuSales()
    ) {
      const sku =
        String(
          s?.['SKU Name'] ||
          s?.skuName ||
          ''
        ).trim();

      if (!sku) continue;

      const row =
        map.get(sku) ||
        {
          sku,
          cartons: 0,
          value: 0
        };

      row.cartons +=
        num(
          s?.Cartons ||
          s?.cartons
        );

      row.value +=
        num(
          s?.['Sales Value'] ||
          s?.salesValue
        );

      map.set(
        sku,
        row
      );
    }

    return [
      ...map.values()
    ].sort(
      (a,b) =>
        b.value -
        a.value ||
        b.cartons -
        a.cartons
    );
  }

  /* =========================================================
     HUMAN SALES COACH — CORE RESPONSES
  ========================================================= */

  function targetPlan() {
    const c =
      context();

    const weeks =
      Math.max(
        1,
        Math.ceil(
          c.days / 7
        )
      );

    let text =
      `বর্তমান achievement ${rm(c.achievement)} (${pct(c.percent)})। ` +
      `Target ${rm(c.target)}, তাই shortfall ${rm(c.shortfall)}।\n\n`;

    text +=
      `Remaining ${c.days} দিন ধরে average প্রায় ${rm(c.dailyNeed)} per day দরকার। ` +
      `Weekly recovery requirement প্রায় ${rm(c.shortfall / weeks)}।\n\n`;

    text +=
      'Execution plan:\n' +
      '• সকাল: zero-sales ও weak outlet\n' +
      '• দুপুর: high-potential / regular buyer\n' +
      '• বিকেল: pending buyer + delivery follow-up\n' +
      '• দিন শেষে: actual delivered sales বনাম daily requirement check\n\n';

    text +=
      emotionalClose(
        'TARGET'
      );

    return sir(text);
  }

  function zeroSalesAdvice() {
    const rows =
      outletOpportunityRows();

    const zeros =
      rows.filter(
        x => x.sales <= 0
      );

    if (!rows.length) {
      return sir(
        'Outlet data এখনো load হয়নি। Dashboard refresh করে আবার জিজ্ঞেস করুন।'
      );
    }

    if (!zeros.length) {
      return sir(
        'Loaded month data অনুযায়ী zero-sales outlet পাওয়া যাচ্ছে না। এখন low-sales outlet আর repeat order-এর দিকে focus করা ভালো। ' +
        funnyLine('GENERAL')
      );
    }

    let text =
      `Zero-sales outlet ${zeros.length}টি। আগে এই outlet-গুলো ধরুন:\n`;

    text +=
      zeros
        .slice(0,8)
        .map(
          (x,i) =>
            `${i + 1}) ${x.name}` +
            (
              x.route
                ? ` — ${x.route}`
                : ''
            )
        )
        .join('\n');

    text +=
      '\n\nপ্রতি visit-এর objective: stock check → missing SKU → display/price tag → minimum order → next follow-up date।\n\n';

    text +=
      funnyLine('ZERO');

    return sir(text);
  }

  function buyerHandlingAdvice() {
    return sir(
      'Buyer order না দিলে প্রথম কাজ হচ্ছে “কেন দিচ্ছে না” সেটা বের করা। সরাসরি আবার order চাইলে একই “না” আসতে পারে।\n\n' +

      'এই sequence ব্যবহার করুন:\n' +
      '1) Stock আছে কি না দেখুন।\n' +
      '2) কোন SKU slow সেটা জিজ্ঞেস করুন।\n' +
      '3) Fast-moving SKU দিয়ে ছোট order propose করুন।\n' +
      '4) Display/price tag সমস্যা থাকলে আগে সেটা ঠিক করুন।\n' +
      '5) Buyer আজ না দিলে exact follow-up day নিন।\n' +
      '6) আগের successful SKU/PO মনে করিয়ে repeat order তুলুন।\n\n' +

      'Buyer-কে চাপ দেওয়ার চেয়ে তার risk ছোট করে order নেওয়া বেশি effective। ' +
      funnyLine('GENERAL')
    );
  }

  function motivationAdvice() {
    const c =
      context();

    let text = '';

    if (
      c.todaySales <= 0
    ) {
      text +=
        funnyLine(
          'SALES_LOW'
        );

      text +=
        '\n\nএখন ৩টা কাজ করুন: একটা strong buyer follow-up, একটা zero outlet visit, আর একটা pending order close করার চেষ্টা।';
    }

    else if (
      c.percent < 70
    ) {
      text +=
        funnyLine(
          'TARGET'
        );

      text +=
        `\n\nবর্তমান achievement ${pct(c.percent)}। পুরো মাস নিয়ে ভয় না পেয়ে আজকের requirement ${rm(c.dailyNeed)}-এর দিকে focus করুন।`;
    }

    else {
      text +=
        'Momentum আছে স্যার। এখন goal হচ্ছে সেটা ধরে রাখা—strong outlet-এ repeat order, weak outlet-এ recovery, আর pending delivery close করা। 😄';
    }

    return sir(text);
  }

  function generalSalesCoach(
    question
  ) {
    const q =
      normalizeText(question);

    if (
      has(
        q,
        [
          'motivate',
          'motivation',
          'হতাশ',
          'মন খারাপ',
          'সেলস হচ্ছে না',
          'sales হচ্ছে না',
          'sales নাই',
          'সেলস নাই',
          'order পাচ্ছি না',
          'অর্ডার পাচ্ছি না'
        ]
      )
    ) {
      return motivationAdvice();
    }

    if (
      has(
        q,
        [
          'buyer',
          'বায়ার',
          'বায়ার',
          'order দিবে না',
          'অর্ডার দিবে না',
          'order দিচ্ছে না',
          'অর্ডার দিচ্ছে না',
          'convince',
          'কনভিন্স'
        ]
      )
    ) {
      return buyerHandlingAdvice();
    }

    if (
      has(
        q,
        [
          'zero sales',
          'জিরো সেলস',
          'zero outlet',
          'জিরো আউটলেট'
        ]
      )
    ) {
      return zeroSalesAdvice();
    }

    if (
      has(
        q,
        [
          'target achieve',
          'target recovery',
          'টার্গেট কিভাবে',
          'টার্গেট কীভাবে',
          'shortfall cover',
          'শর্টফল কিভাবে',
          'শর্টফল কীভাবে'
        ]
      )
    ) {
      return targetPlan();
    }

    return sir(
      'Sales-এর situationটা আগে তিন ভাগে দেখুন—buyer issue, outlet issue, নাকি product/SKU issue। তারপর একসাথে সবকিছু না ধরে সবচেয়ে বড় বাধাটা আগে solve করুন। ' +
      funnyLine('GENERAL')
    );
  }

  /* =========================================================
     END PART 1/3
  ========================================================= */
   /* =========================================================
     LIVE DATABASE — TEAM MEMBER MATCHING
  ========================================================= */

  function normalizeIdValue(v) {
    return String(v || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  function teamMemberIdentity(row) {
    return {
      id:
        String(
          row?.staffId ||
          row?.id ||
          row?.['Staff ID'] ||
          row?.user?.['Staff ID'] ||
          ''
        ).trim(),

      name:
        String(
          row?.name ||
          row?.fullName ||
          row?.['Full Name'] ||
          row?.user?.['Full Name'] ||
          ''
        ).trim()
    };
  }

  function findTeamMember(question) {
    if (!isManagerContext()) {
      return null;
    }

    const q =
      normalizeText(question);

    const team =
      getTeam();

    let best = null;
    let bestScore = 0;

    for (const row of team) {
      const u =
        teamMemberIdentity(row);

      if (!u.id && !u.name) {
        continue;
      }

      let score = 0;

      if (
        u.id &&
        normalizeText(q).includes(
          normalizeText(u.id)
        )
      ) {
        score += 100;
      }

      if (
        u.name &&
        q.includes(
          normalizeText(u.name)
        )
      ) {
        score += 100;
      }

      const firstName =
        normalizeText(u.name)
          .split(' ')
          .filter(Boolean)[0];

      if (
        firstName &&
        firstName.length >= 3 &&
        q.includes(firstName)
      ) {
        score += 60;
      }

      const parts =
        normalizeText(u.name)
          .split(' ')
          .filter(
            x => x.length >= 3
          );

      const hits =
        parts.filter(
          p => q.includes(p)
        ).length;

      score +=
        hits * 20;

      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }

    return bestScore >= 40
      ? best
      : null;
  }

  function memberPerformance(row) {
    return (
      row?.performance ||
      row ||
      {}
    );
  }

  function memberSummary(row) {
    const id =
      teamMemberIdentity(row);

    const p =
      memberPerformance(row);

    const target =
      num(
        p.target ||
        p.Target
      );

    const sales =
      num(
        p.achievement ||
        p.sales ||
        p.deliveredSales ||
        p['Delivered Sales']
      );

    const percent =
      num(
        p.percent ||
        p.achievementPercent ||
        (
          target
            ? sales / target * 100
            : 0
        )
      );

    const shortfall =
      num(
        p.shortfall ||
        Math.max(
          0,
          target - sales
        )
      );

    return {
      id:
        id.id,

      name:
        id.name ||
        id.id,

      target,

      sales,

      percent,

      shortfall,

      todaySales:
        num(
          p.todaySales ||
          p['Today Sales']
        ),

      zero:
        num(
          p.zeroOutlets ||
          p.zeroOutletCount ||
          p['Zero Outlet']
        ),

      pendingTasks:
        num(
          p.pendingTasks ||
          p.taskPending ||
          p['Pending Tasks']
        ),

      pendingDelivery:
        num(
          p.pendingDelivery ||
          p['Pending Delivery']
        ),

      cpo:
        num(
          p.cpo ||
          p.cpoCount ||
          p['CPO']
        ),

      incentive:
        num(
          p.incentive ||
          p.incentiveRM ||
          p['Incentive']
        ),

      coverage:
        num(
          p.coverage ||
          p.coveragePercent
        )
    };
  }

  function teamAggregate() {
    const team =
      getTeam();

    const rows =
      team.map(
        memberSummary
      );

    const target =
      rows.reduce(
        (a,x) =>
          a + x.target,
        0
      );

    const sales =
      rows.reduce(
        (a,x) =>
          a + x.sales,
        0
      );

    const todaySales =
      rows.reduce(
        (a,x) =>
          a + x.todaySales,
        0
      );

    const pendingDelivery =
      rows.reduce(
        (a,x) =>
          a + x.pendingDelivery,
        0
      );

    const zero =
      rows.reduce(
        (a,x) =>
          a + x.zero,
        0
      );

    const pendingTasks =
      rows.reduce(
        (a,x) =>
          a + x.pendingTasks,
        0
      );

    const cpo =
      rows.reduce(
        (a,x) =>
          a + x.cpo,
        0
      );

    const incentive =
      rows.reduce(
        (a,x) =>
          a + x.incentive,
        0
      );

    return {
      count:
        rows.length,

      target,

      sales,

      todaySales,

      percent:
        target
          ? sales / target * 100
          : 0,

      shortfall:
        Math.max(
          0,
          target - sales
        ),

      pendingDelivery,

      zero,

      pendingTasks,

      cpo,

      incentive,

      rows
    };
  }

  /* =========================================================
     LIVE DATABASE — QUESTION TYPES
  ========================================================= */

  function asksTodaySales(q) {
    return hasAny(
      q,
      [
        'today sales',
        'today sale',
        'আজকের সেলস',
        'আজ সেলস',
        'আজ sales',
        'today delivered'
      ]
    );
  }

  function asksSales(q) {
    return hasAny(
      q,
      [
        'sales কত',
        'সেলস কত',
        'sale কত',
        'delivered sales',
        'actual sales',
        'achievement কত',
        'অ্যাচিভমেন্ট কত',
        'কত সেলস',
        'কত sales'
      ]
    );
  }

  function asksTarget(q) {
    return hasAny(
      q,
      [
        'target কত',
        'টার্গেট কত',
        'target',
        'টার্গেট'
      ]
    );
  }

  function asksShortfall(q) {
    return hasAny(
      q,
      [
        'shortfall',
        'শর্টফল',
        'বাকি কত',
        'remaining কত',
        'target বাকি'
      ]
    );
  }

  function asksZero(q) {
    return hasAny(
      q,
      [
        'zero sales',
        'zero outlet',
        'জিরো সেলস',
        'জিরো আউটলেট',
        'zero কত',
        'জিরো কত'
      ]
    );
  }

  function asksTask(q) {
    return hasAny(
      q,
      [
        'pending task',
        'task pending',
        'পেন্ডিং টাস্ক',
        'important work',
        'ইম্পর্টেন্ট ওয়ার্ক',
        'ইম্পর্টেন্ট ওয়ার্ক',
        'কাজ বাকি'
      ]
    );
  }

  function asksDelivery(q) {
    return hasAny(
      q,
      [
        'pending delivery',
        'delivery pending',
        'পেন্ডিং ডেলিভারি',
        'ডেলিভারি বাকি',
        'delivery কত'
      ]
    );
  }

  function asksCpo(q) {
    return hasAny(
      q,
      [
        'cpo',
        'সি পি ও',
        'সিপিও'
      ]
    );
  }

  function asksIncentive(q) {
    return hasAny(
      q,
      [
        'incentive',
        'ইনসেনটিভ'
      ]
    );
  }

  function asksCoverage(q) {
    return hasAny(
      q,
      [
        'coverage',
        'কভারেজ',
        'covered outlet'
      ]
    );
  }

  function asksOverallStatus(q) {
    return hasAny(
      q,
      [
        'অবস্থা কী',
        'অবস্থা কি',
        'অবস্থা কেমন',
        'overall status',
        'performance কেমন',
        'performance কী',
        'পারফরম্যান্স কেমন',
        'পারফরম্যান্স কী',
        'summary',
        'সামারি'
      ]
    );
  }

  function asksTeam(q) {
    return hasAny(
      q,
      [
        'team',
        'টিম',
        'all sr',
        'সব sr',
        'সব এসআর',
        'আমার টিম',
        'my team'
      ]
    );
  }

  /* =========================================================
     SELF LIVE ANSWERS
  ========================================================= */

  function selfLiveSummary() {
    const c =
      context();

    let text =
      `${c.name}-এর বর্তমান performance:\n\n`;

    text +=
      `• Target: ${rm(c.target)}\n`;

    text +=
      `• Delivered Sales: ${rm(c.achievement)}\n`;

    text +=
      `• Achievement: ${pct(c.percent)}\n`;

    text +=
      `• Shortfall: ${rm(c.shortfall)}\n`;

    text +=
      `• Today Sales: ${rm(c.todaySales)}\n`;

    text +=
      `• Zero Outlet: ${c.zero}\n`;

    text +=
      `• Pending Delivery: ${rm(c.pendingDelivery)}\n`;

    text +=
      `• Pending Important Work: ${c.pendingTasks}\n`;

    text +=
      `• CPO Record: ${c.cpo}\n`;

    text +=
      `• Active Incentive: ${c.incentiveCount}\n`;

    if (c.shortfall > 0) {
      text +=
        `\nRemaining ${c.days} দিনে average প্রায় ${rm(c.dailyNeed)} per day দরকার।`;
    }

    text +=
      '\n\n' +
      (
        c.percent >= 100
          ? 'Target complete স্যার—এখন repeat order আর quality sales ধরে রাখুন। 😄'
          : c.todaySales <= 0
            ? funnyLine('SALES_LOW')
            : c.percent < 70
              ? funnyLine('TARGET')
              : 'Progress ভালো direction-এ আছে স্যার। এখন consistency-টাই আসল।'
      );

    return sir(text);
  }

  function selfSpecificLiveAnswer(
    question
  ) {
    const c =
      context();

    if (asksTodaySales(question)) {
      return sir(
        `আজকের loaded sales ${rm(c.todaySales)}। ` +
        (
          c.todaySales > 0
            ? 'Sales meter চালু আছে স্যার 😄 এখন next order দিয়ে momentum বাড়ান।'
            : funnyLine('SALES_LOW')
        )
      );
    }

    if (
      asksSales(question) &&
      !asksOverallStatus(question)
    ) {
      return sir(
        `বর্তমান delivered sales ${rm(c.achievement)}। ` +
        `Target ${rm(c.target)}, achievement ${pct(c.percent)}, shortfall ${rm(c.shortfall)}।`
      );
    }

    if (
      asksTarget(question) &&
      !asksOverallStatus(question)
    ) {
      return sir(
        `Monthly target ${rm(c.target)}। এখন পর্যন্ত delivered ${rm(c.achievement)} (${pct(c.percent)})। ` +
        (
          c.shortfall > 0
            ? `আর ${rm(c.shortfall)} দরকার। Remaining ${c.days} দিনে average ${rm(c.dailyNeed)} per day। ${funnyLine('TARGET')}`
            : 'Target already achieved স্যার। এখন over-achievement-এর পালা। 😄'
        )
      );
    }

    if (asksShortfall(question)) {
      return sir(
        c.shortfall > 0
          ? `বর্তমান shortfall ${rm(c.shortfall)}। Remaining ${c.days} দিনে average প্রায় ${rm(c.dailyNeed)} per day দরকার। ${funnyLine('TARGET')}`
          : 'বর্তমানে shortfall নেই—target complete। এখন extra sales মানেই over-achievement স্যার। 😄'
      );
    }

    if (asksZero(question)) {
      return zeroSalesAdvice();
    }

    if (asksTask(question)) {
      const pending =
        tasks().filter(
          x =>
            String(
              x.Status || ''
            ).toUpperCase() !==
            'DONE'
        );

      if (!pending.length) {
        return sir(
          'বর্তমানে কোনো pending Important Work নেই। Task list আজ শান্তিতে আছে স্যার 😄'
        );
      }

      let text =
        `Pending Important Work ${pending.length}টি:\n`;

      text +=
        pending
          .slice(0,8)
          .map(
            (x,i) =>
              `${i + 1}) ${x.Title || 'Important Work'}` +
              (
                x['Due Date']
                  ? ` — ${x['Due Date']}`
                  : ''
              ) +
              (
                x['Due Time']
                  ? ` ${x['Due Time']}`
                  : ''
              )
          )
          .join('\n');

      text +=
        '\n\n' +
        funnyLine('TASK');

      return sir(text);
    }

    if (asksDelivery(question)) {
      return sir(
        `বর্তমান pending delivery ${rm(c.pendingDelivery)} এবং pending/partial order ${c.pendingOrders}টি। ` +
        (
          c.pendingOrders
            ? 'আজ buyer/warehouse follow-up list-এ এগুলো উপরে রাখুন। Delivery না হলে sales dashboard-এ বসে বসে দুঃখ করবে স্যার 😄'
            : 'এই মুহূর্তে pending/partial order পাওয়া যাচ্ছে না।'
        )
      );
    }

    if (asksCpo(question)) {
      const rows =
        cpoRows();

      const missing =
        rows.filter(
          x => {
            const status =
              String(
                x.Status ||
                x.status ||
                ''
              ).toUpperCase();

            const proof =
              x['Photo File ID'] ||
              x.photoFileId ||
              x.proofFileId;

            return (
              status.includes('PENDING') ||
              status.includes('MISSING') ||
              !proof
            );
          }
        );

      return sir(
        `Loaded CPO record ${rows.length}টি। Proof missing/pending ${missing.length}টি। ` +
        (
          missing.length
            ? 'Proof ছাড়া CPO-কে complete ভাবলে CPO কিন্তু রাজি হবে না স্যার 😄 আগে missing proof upload করুন।'
            : 'বর্তমান loaded record-এ missing proof পাওয়া যাচ্ছে না।'
        )
      );
    }

    if (asksIncentive(question)) {
      const list =
        incentives();

      if (!list.length) {
        return sir(
          'এই মুহূর্তে loaded data-তে active incentive পাওয়া যাচ্ছে না।'
        );
      }

      let text =
        `Active incentive ${list.length}টি:\n`;

      text +=
        list
          .slice(0,8)
          .map(
            (x,i) =>
              `${i + 1}) ${x.name || x.Name || 'Incentive'} — ` +
              `${num(x.actual)} / ${num(x.target)}` +
              (
                num(x.rewardRM)
                  ? ` • Reward ${rm(x.rewardRM)}`
                  : ''
              )
          )
          .join('\n');

      text +=
        '\n\nIncentive সামনে থাকলে calculator-ও একটু বেশি হাসে স্যার 😄 এখন remaining quantity-তে focus করুন।';

      return sir(text);
    }

    if (asksCoverage(question)) {
      return sir(
        `বর্তমান coverage ${pct(c.coverage)}। Route outlet ${c.route}, zero-sales outlet ${c.zero}। ` +
        (
          c.zero
            ? 'Coverage বাড়াতে zero outlet থেকে আজকের priority list বানান।'
            : 'Zero-sales outlet নেই—এখন SKU depth বাড়ানো যায়।'
        )
      );
    }

    return selfLiveSummary();
  }

  /* =========================================================
     MANAGER TEAM LIVE ANSWERS
  ========================================================= */

  function managerTeamSummary() {
    const t =
      teamAggregate();

    if (!t.count) {
      return sir(
        'Team snapshot এখনো load হয়নি। Manager dashboard refresh করে আবার জিজ্ঞেস করুন।'
      );
    }

    let text =
      `ALL SR — MY TEAM live summary:\n\n`;

    text +=
      `• Active SR: ${t.count}\n`;

    text +=
      `• Team Target: ${rm(t.target)}\n`;

    text +=
      `• Delivered Sales: ${rm(t.sales)}\n`;

    text +=
      `• Achievement: ${pct(t.percent)}\n`;

    text +=
      `• Shortfall: ${rm(t.shortfall)}\n`;

    text +=
      `• Today Sales: ${rm(t.todaySales)}\n`;

    text +=
      `• Pending Delivery: ${rm(t.pendingDelivery)}\n`;

    text +=
      `• Zero Outlet: ${t.zero}\n`;

    text +=
      `• Pending Tasks: ${t.pendingTasks}\n`;

    text +=
      `• CPO: ${t.cpo}\n`;

    if (t.shortfall > 0) {
      text +=
        '\nTeam focus: shortfall-টা SR-wise ভাগ করে low-achievement + zero-sales route আগে ধরুন। ';
    }

    if (t.percent < 70) {
      text +=
        'Team একটু আরামে আছে মনে হচ্ছে স্যার 😄 dashboard-কে সবুজ করার জন্য আজ execution pressure দরকার।';
    }

    else if (t.percent < 100) {
      text +=
        'Team target-এর পথে আছে স্যার। এখন weak SR recovery আর strong SR momentum—দুটো একসাথে চালান।';
    }

    else {
      text +=
        'Team target complete স্যার। এখন over-achievement, repeat order আর next-month pipeline শক্ত করুন। 😄';
    }

    return sir(text);
  }

  function managerMemberAnswer(
    question,
    row
  ) {
    const x =
      memberSummary(row);

    if (!x.id && !x.name) {
      return sir(
        'এই SR-এর live data team snapshot-এ পাওয়া যাচ্ছে না।'
      );
    }

    if (asksTodaySales(question)) {
      return sir(
        `${x.name} (${x.id})-এর আজকের loaded sales ${rm(x.todaySales)}। ` +
        (
          x.todaySales > 0
            ? 'আজকের meter চলছে—আরেকটু push দিলে দিনটা আরও ভালো হতে পারে। 😄'
            : 'আজ sales এখনো zero দেখা যাচ্ছে। সেলস করার দিন কি গেল নাকি? 😄 না স্যার—zero outlet, pending buyer আর repeat order দিয়ে এখনই follow-up দরকার।'
        )
      );
    }

    if (
      asksSales(question) &&
      !asksOverallStatus(question)
    ) {
      return sir(
        `${x.name} (${x.id})-এর delivered sales ${rm(x.sales)}। Target ${rm(x.target)}, achievement ${pct(x.percent)}, shortfall ${rm(x.shortfall)}।`
      );
    }

    if (
      asksTarget(question) &&
      !asksOverallStatus(question)
    ) {
      return sir(
        `${x.name} (${x.id})-এর target ${rm(x.target)}। Delivered ${rm(x.sales)}, achievement ${pct(x.percent)}, remaining ${rm(x.shortfall)}।`
      );
    }

    if (asksShortfall(question)) {
      return sir(
        `${x.name} (${x.id})-এর current shortfall ${rm(x.shortfall)}। ` +
        (
          x.shortfall > 0
            ? 'Shortfall-টা daily execution-এ ভাঙলে pressure manageable হবে।'
            : 'Target complete—এখন over-achievement-এর সুযোগ।'
        )
      );
    }

    if (asksZero(question)) {
      return sir(
        `${x.name} (${x.id})-এর zero-sales outlet ${x.zero}টি। ` +
        (
          x.zero > 0
            ? 'Zero-গুলোকে dashboard-এ permanent tenant বানানো যাবে না স্যার 😄 priority follow-up দরকার।'
            : 'Zero-sales outlet নেই—ভালো। এখন SKU depth আর repeat order-এ focus করা যায়।'
        )
      );
    }

    if (asksTask(question)) {
      return sir(
        `${x.name} (${x.id})-এর pending Important Work ${x.pendingTasks}টি। ` +
        (
          x.pendingTasks
            ? funnyLine('TASK')
            : 'Pending task নেই।'
        )
      );
    }

    if (asksDelivery(question)) {
      return sir(
        `${x.name} (${x.id})-এর pending delivery ${rm(x.pendingDelivery)}।`
      );
    }

    if (asksCpo(question)) {
      return sir(
        `${x.name} (${x.id})-এর team snapshot অনুযায়ী CPO count ${x.cpo}।`
      );
    }

    if (asksIncentive(question)) {
      return sir(
        `${x.name} (${x.id})-এর snapshot incentive value ${rm(x.incentive)}।`
      );
    }

    if (asksCoverage(question)) {
      return sir(
        `${x.name} (${x.id})-এর coverage ${pct(x.coverage)} এবং zero-sales outlet ${x.zero}টি।`
      );
    }

    let text =
      `${x.name} (${x.id})-এর current status:\n\n`;

    text +=
      `• Target: ${rm(x.target)}\n`;

    text +=
      `• Delivered Sales: ${rm(x.sales)}\n`;

    text +=
      `• Achievement: ${pct(x.percent)}\n`;

    text +=
      `• Shortfall: ${rm(x.shortfall)}\n`;

    text +=
      `• Today Sales: ${rm(x.todaySales)}\n`;

    text +=
      `• Zero Outlet: ${x.zero}\n`;

    text +=
      `• Pending Delivery: ${rm(x.pendingDelivery)}\n`;

    text +=
      `• Pending Important Work: ${x.pendingTasks}\n`;

    text +=
      `• CPO: ${x.cpo}\n`;

    if (x.percent >= 100) {
      text +=
        '\nTarget complete। এখন momentum ধরে রাখতে repeat order ও quality execution-এ focus করা যায়। 😄';
    }

    else if (
      x.todaySales <= 0
    ) {
      text +=
        '\nআজকের sales এখনো zero। সেলস করার দিন কি গেল নাকি? 😄 এখনই না স্যার—আগে strong buyer, zero outlet আর pending order follow-up করান।';
    }

    else if (
      x.percent < 60
    ) {
      text +=
        '\nAchievement এখনো low side-এ। Panic না করে daily recovery target + zero outlet + pending buyer—এই তিনটা track করা দরকার।';
    }

    else {
      text +=
        '\nPerformance চলমান আছে। এখন shortfall কমানোর জন্য daily requirement ধরে execution maintain করা দরকার।';
    }

    return sir(text);
  }

  async function liveDatabaseAnswer(
    question
  ) {
    await refreshLiveIfNeeded();

    if (
      isManagerContext()
    ) {
      const member =
        findTeamMember(
          question
        );

      if (member) {
        return managerMemberAnswer(
          question,
          member
        );
      }

      if (
        asksTeam(question)
      ) {
        return managerTeamSummary();
      }
    }

    return selfSpecificLiveAnswer(
      question
    );
  }

  /* =========================================================
     MANAGER KNOWLEDGE RESPONSE STYLE
  ========================================================= */

  function applyKnowledgeTone(
    row
  ) {
    const answer =
      String(
        row?.answer || ''
      ).trim();

    if (!answer) {
      return '';
    }

    const tone =
      String(
        row?.tone ||
        'NORMAL'
      ).toUpperCase();

    if (tone === 'FUNNY') {
      return sir(
        answer +
        '\n\n' +
        funnyLine('GENERAL')
      );
    }

    if (
      tone === 'MOTIVATIONAL'
    ) {
      return sir(
        answer +
        '\n\n' +
        funnyLine('MOTIVATION')
      );
    }

    if (
      tone === 'STRICT-FUNNY'
    ) {
      return sir(
        answer +
        '\n\n' +
        'কাজটা pending রেখে dashboard-এর দিকে তাকিয়ে লাভ নেই স্যার 😄 action নিন, তারপর result দেখুন।'
      );
    }

    return sir(answer);
  }

  /* =========================================================
     SPECIAL FIXED ANSWERS
  ========================================================= */

  function fixedIdentityAnswer(
    question
  ) {
    if (
      isCreatorQuestion(
        question
      )
    ) {
      return sir(
        `Sales Performance Hub এবং AYON AI তৈরি ও ডেভেলপ করেছেন ${CREATOR_NAME}.`
      );
    }

    if (
      isHeadOfSalesQuestion(
        question
      )
    ) {
      return sir(
        `Head of Sales হলেন ${HEAD_OF_SALES}.`
      );
    }

    return '';
  }

  function greetingAnswer() {
    const s =
      getSession();

    const name =
      s?.name ||
      s?.fullName ||
      '';

    return sir(
      `${name ? escPlain(name) + ', ' : ''}আমি AYON AI। Sales, target, outlet, buyer follow-up, task, CPO, incentive বা live performance—যেটা দরকার বলেন। 😄`
    );
  }

  function escPlain(v) {
    return String(v || '')
      .replace(/[<>]/g, '');
  }

  /* =========================================================
     QUESTION ROUTER
     PRIORITY:
     1. FIXED IDENTITY
     2. MANAGER KNOWLEDGE
     3. LIVE DATABASE WHEN EXPLICITLY LIVE
     4. HUMAN SALES COACH
  ========================================================= */

  async function answerQuestion(
    question
  ) {
    const raw =
      String(question || '')
        .trim();

    if (!raw) {
      return sir(
        'প্রশ্নটা লিখুন স্যার।'
      );
    }

    const fixed =
      fixedIdentityAnswer(raw);

    if (fixed) {
      return fixed;
    }

    if (isGreeting(raw)) {
      return greetingAnswer();
    }

    /*
       Manager Knowledge is checked first.
       Cached knowledge makes normal responses fast.
    */

    await loadManagerKnowledge(
      false
    );

    const kb =
      matchManagerKnowledge(
        raw
      );

    if (kb) {
      return applyKnowledgeTone(
        kb
      );
    }

    /*
       Database is NOT called for normal sales advice.
       It is used only when the question clearly asks
       for current/live app data.
    */

    if (
      isLiveDataQuestion(raw)
    ) {
      try {
        return await liveDatabaseAnswer(
          raw
        );

      } catch (e) {
        console.warn(
          'AYON live answer',
          e
        );

        return sir(
          'Live database response এই মুহূর্তে পাওয়া যাচ্ছে না। App refresh করে আবার চেষ্টা করুন। আমি কোনো sales figure অনুমান করে বলছি না।'
        );
      }
    }

    return generalSalesCoach(
      raw
    );
  }

  /* =========================================================
     CHAT HISTORY
  ========================================================= */

  function loadHistory() {
    try {
      const x =
        JSON.parse(
          localStorage.getItem(
            CHAT_KEY
          ) || '[]'
        );

      chatHistory =
        Array.isArray(x)
          ? x.slice(
              -MAX_HISTORY
            )
          : [];

    } catch {
      chatHistory = [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(
        CHAT_KEY,
        JSON.stringify(
          chatHistory.slice(
            -MAX_HISTORY
          )
        )
      );
    } catch {}
  }

  function addHistory(
    role,
    text
  ) {
    chatHistory.push({
      role,
      text:
        String(text || ''),
      time:
        new Date()
          .toISOString()
    });

    chatHistory =
      chatHistory.slice(
        -MAX_HISTORY
      );

    saveHistory();
  }

  function clearHistory() {
    chatHistory = [];

    try {
      localStorage.removeItem(
        CHAT_KEY
      );
    } catch {}

    paintMessages();
  }

  /* =========================================================
     CHAT UI
  ========================================================= */

  function ensureStyles() {
    if (
      $('#ayonAiFinalStyle')
    ) return;

    const style =
      document.createElement(
        'style'
      );

    style.id =
      'ayonAiFinalStyle';

    style.textContent = `
      .ayon-ai-fab{
        position:fixed;
        right:18px;
        bottom:82px;
        width:58px;
        height:58px;
        border-radius:50%;
        border:0;
        padding:0;
        overflow:hidden;
        z-index:9995;
        box-shadow:0 12px 34px rgba(0,0,0,.30);
        cursor:pointer;
        background:#111;
      }

      .ayon-ai-fab img{
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }

      .ayon-ai-panel{
        position:fixed;
        right:14px;
        bottom:150px;
        width:min(390px,calc(100vw - 28px));
        height:min(610px,calc(100vh - 190px));
        background:var(--card,#151515);
        color:var(--text,#fff);
        border:1px solid var(--line,rgba(255,255,255,.12));
        border-radius:22px;
        z-index:9996;
        display:none;
        overflow:hidden;
        box-shadow:0 22px 70px rgba(0,0,0,.38);
      }

      .ayon-ai-panel.open{
        display:flex;
        flex-direction:column;
      }

      .ayon-ai-head{
        display:flex;
        align-items:center;
        gap:10px;
        padding:12px 13px;
        border-bottom:1px solid var(--line,rgba(255,255,255,.12));
        background:var(--card,#151515);
      }

      .ayon-ai-head img{
        width:42px;
        height:42px;
        border-radius:50%;
        object-fit:cover;
      }

      .ayon-ai-head-text{
        flex:1;
        min-width:0;
      }

      .ayon-ai-head h3{
        margin:0;
        font-size:15px;
      }

      .ayon-ai-head p{
        margin:3px 0 0;
        opacity:.65;
        font-size:11px;
      }

      .ayon-ai-icon-btn{
        width:34px;
        height:34px;
        border-radius:10px;
        border:1px solid var(--line,rgba(255,255,255,.12));
        background:transparent;
        color:inherit;
        cursor:pointer;
      }

      .ayon-ai-messages{
        flex:1;
        overflow:auto;
        padding:13px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .ayon-ai-msg{
        max-width:88%;
        padding:10px 12px;
        border-radius:16px;
        white-space:pre-wrap;
        word-break:break-word;
        line-height:1.48;
        font-size:13px;
      }

      .ayon-ai-msg.user{
        align-self:flex-end;
        background:var(--accent,#ff7a00);
        color:#fff;
        border-bottom-right-radius:5px;
      }

      .ayon-ai-msg.ai{
        align-self:flex-start;
        background:rgba(127,127,127,.13);
        border:1px solid var(--line,rgba(255,255,255,.10));
        border-bottom-left-radius:5px;
      }

      .ayon-ai-time{
        display:block;
        opacity:.48;
        font-size:9px;
        margin-top:5px;
      }

      .ayon-ai-thinking{
        padding:0 13px 8px;
        font-size:11px;
        opacity:.62;
        display:none;
      }

      .ayon-ai-thinking.show{
        display:block;
      }

      .ayon-ai-compose{
        display:flex;
        align-items:flex-end;
        gap:7px;
        padding:10px;
        border-top:1px solid var(--line,rgba(255,255,255,.12));
      }

      .ayon-ai-compose textarea{
        flex:1;
        min-height:42px;
        max-height:110px;
        resize:none;
        border-radius:14px;
        border:1px solid var(--line,rgba(255,255,255,.14));
        background:rgba(127,127,127,.08);
        color:inherit;
        padding:10px 11px;
        outline:none;
        font:inherit;
        font-size:13px;
      }

      .ayon-ai-send,
      .ayon-ai-mic{
        width:42px;
        height:42px;
        border-radius:13px;
        border:0;
        cursor:pointer;
        font-size:16px;
      }

      .ayon-ai-send{
        background:var(--accent,#ff7a00);
        color:#fff;
      }

      .ayon-ai-mic{
        background:rgba(127,127,127,.15);
        color:inherit;
      }

      .ayon-ai-mic.listening{
        animation:ayonPulse 1s infinite;
      }

      @keyframes ayonPulse{
        0%{transform:scale(1)}
        50%{transform:scale(1.08)}
        100%{transform:scale(1)}
      }

      @media(max-width:600px){
        .ayon-ai-panel{
          right:8px;
          bottom:145px;
          width:calc(100vw - 16px);
          height:min(620px,calc(100vh - 165px));
          border-radius:20px;
        }

        .ayon-ai-fab{
          right:14px;
          bottom:78px;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function ensureUi() {
    if (
      $('#ayonAiFinalPanel')
    ) return;

    ensureStyles();

    const fab =
      document.createElement(
        'button'
      );

    fab.id =
      'ayonAiFinalFab';

    fab.className =
      'ayon-ai-fab';

    fab.type =
      'button';

    fab.setAttribute(
      'aria-label',
      'Open AYON AI'
    );

    fab.innerHTML =
      `<img src="${AVATAR_SRC}" alt="AYON AI">`;

    const panel =
      document.createElement(
        'section'
      );

    panel.id =
      'ayonAiFinalPanel';

    panel.className =
      'ayon-ai-panel';

    panel.innerHTML = `
      <div class="ayon-ai-head">
        <img src="${AVATAR_SRC}" alt="AYON AI">

        <div class="ayon-ai-head-text">
          <h3>AYON AI</h3>
          <p>Human-style Sales Coach • Live Performance Assistant</p>
        </div>

        <button
          id="ayonVoiceToggle"
          class="ayon-ai-icon-btn"
          type="button"
          title="Voice">
          🔊
        </button>

        <button
          id="ayonClearChat"
          class="ayon-ai-icon-btn"
          type="button"
          title="Clear chat">
          ↺
        </button>

        <button
          id="ayonClose"
          class="ayon-ai-icon-btn"
          type="button"
          title="Close">
          ×
        </button>
      </div>

      <div
        id="ayonAiMessages"
        class="ayon-ai-messages">
      </div>

      <div
        id="ayonAiThinking"
        class="ayon-ai-thinking">
        AYON AI দেখছে স্যার…
      </div>

      <div class="ayon-ai-compose">
        <button
          id="ayonMic"
          class="ayon-ai-mic"
          type="button"
          title="Speak">
          🎙
        </button>

        <textarea
          id="ayonAiInput"
          rows="1"
          placeholder="AYON AI-কে জিজ্ঞেস করুন…"></textarea>

        <button
          id="ayonAiSend"
          class="ayon-ai-send"
          type="button">
          ➤
        </button>
      </div>
    `;

    document.body.appendChild(
      fab
    );

    document.body.appendChild(
      panel
    );

    fab.onclick =
      togglePanel;

    $('#ayonClose').onclick =
      closePanel;

    $('#ayonAiSend').onclick =
      sendFromInput;

    $('#ayonClearChat').onclick =
      () => {
        if (
          confirm(
            'Clear AYON AI chat history?'
          )
        ) {
          clearHistory();
        }
      };

    $('#ayonVoiceToggle').onclick =
      () => {
        autoVoice =
          !autoVoice;

        $('#ayonVoiceToggle').textContent =
          autoVoice
            ? '🔊'
            : '🔇';

        toastSafe(
          autoVoice
            ? 'AYON AI voice on'
            : 'AYON AI voice off'
        );
      };

    $('#ayonMic').onclick =
      toggleListening;

    $('#ayonAiInput').addEventListener(
      'keydown',
      e => {
        if (
          e.key === 'Enter' &&
          !e.shiftKey
        ) {
          e.preventDefault();
          sendFromInput();
        }
      }
    );

    $('#ayonAiInput').addEventListener(
      'input',
      e => {
        e.target.style.height =
          'auto';

        e.target.style.height =
          Math.min(
            110,
            e.target.scrollHeight
          ) + 'px';
      }
    );

    paintMessages();
  }

  function togglePanel() {
    opened =
      !opened;

    const panel =
      $('#ayonAiFinalPanel');

    if (!panel) return;

    panel.classList.toggle(
      'open',
      opened
    );

    if (opened) {
      paintMessages();

      setTimeout(
        () =>
          $('#ayonAiInput')
            ?.focus(),
        100
      );

      loadManagerKnowledge(
        false
      );
    }
  }

  function closePanel() {
    opened = false;

    $('#ayonAiFinalPanel')
      ?.classList.remove(
        'open'
      );

    stopListening();
  }

  function messageTime(iso) {
    try {
      return new Date(
        iso
      ).toLocaleTimeString(
        'en-MY',
        {
          hour:
            '2-digit',
          minute:
            '2-digit'
        }
      );
    } catch {
      return '';
    }
  }

  function paintMessages() {
    const box =
      $('#ayonAiMessages');

    if (!box) return;

    if (!chatHistory.length) {
      box.innerHTML = `
        <div class="ayon-ai-msg ai">
          স্যার, আমি AYON AI। Sales coaching, buyer handling, target, zero outlet, Important Work, CPO, incentive অথবা live performance—যেটা দরকার জিজ্ঞেস করুন। 😄
        </div>`;

      return;
    }

    box.innerHTML =
      chatHistory
        .map(
          x => `
            <div class="ayon-ai-msg ${x.role === 'user' ? 'user' : 'ai'}">
              ${esc(x.text)}
              <span class="ayon-ai-time">
                ${esc(messageTime(x.time))}
              </span>
            </div>
          `
        )
        .join('');

    box.scrollTop =
      box.scrollHeight;
  }

  function setThinking(on) {
    $('#ayonAiThinking')
      ?.classList.toggle(
        'show',
        !!on
      );
  }

  async function sendFromInput() {
    const input =
      $('#ayonAiInput');

    if (
      !input ||
      sending
    ) return;

    const question =
      String(
        input.value || ''
      ).trim();

    if (!question) return;

    input.value = '';
    input.style.height = 'auto';

    await askAyon(
      question
    );
  }

  async function askAyon(
    question
  ) {
    if (sending) return;

    sending = true;

    addHistory(
      'user',
      question
    );

    paintMessages();
    setThinking(true);

    try {
      const answer =
        await answerQuestion(
          question
        );

      addHistory(
        'ai',
        answer
      );

      paintMessages();

      if (autoVoice) {
        speak(
          answer
        );
      }

    } catch (e) {
      console.error(
        'AYON AI',
        e
      );

      const fallback =
        sir(
          'একটু connection সমস্যা হচ্ছে। আবার চেষ্টা করুন স্যার—আমি কোনো live sales figure অনুমান করে বলব না।'
        );

      addHistory(
        'ai',
        fallback
      );

      paintMessages();

    } finally {
      sending = false;
      setThinking(false);
    }
  }

  /* =========================================================
     END PART 2/3
  ========================================================= */
   /* =========================================================
     VOICE — BENGALI FIRST
  ========================================================= */

  function cleanSpeechText(text) {
    return String(text || '')
      .replace(/RM\s*/gi, 'রিঙ্গিত ')
      .replace(/%/g, ' শতাংশ ')
      .replace(/[•→✓]/g, ' ')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function chooseBanglaVoice() {
    if (
      !('speechSynthesis' in window)
    ) {
      return null;
    }

    const voices =
      speechSynthesis.getVoices() || [];

    if (!voices.length) {
      return null;
    }

    return (
      voices.find(
        v =>
          String(v.lang || '')
            .toLowerCase() === 'bn-bd'
      ) ||

      voices.find(
        v =>
          String(v.lang || '')
            .toLowerCase() === 'bn-in'
      ) ||

      voices.find(
        v =>
          String(v.lang || '')
            .toLowerCase()
            .startsWith('bn')
      ) ||

      null
    );
  }

  function speak(text) {
    if (
      !autoVoice ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    try {
      speechSynthesis.cancel();

      const utter =
        new SpeechSynthesisUtterance(
          cleanSpeechText(text)
        );

      const voice =
        chooseBanglaVoice();

      if (voice) {
        utter.voice = voice;
        utter.lang =
          voice.lang || 'bn-BD';
      } else {
        utter.lang = 'bn-BD';
      }

      utter.rate = 0.96;
      utter.pitch = 1;
      utter.volume = 1;

      speechSynthesis.speak(
        utter
      );

    } catch (e) {
      console.warn(
        'AYON voice',
        e
      );
    }
  }

  if (
    'speechSynthesis' in window
  ) {
    speechSynthesis.onvoiceschanged =
      () => {
        chooseBanglaVoice();
      };
  }

  /* =========================================================
     SPEECH RECOGNITION — BENGALI FIRST
  ========================================================= */

  function speechRecognitionClass() {
    return (
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      null
    );
  }

  function initRecognition() {
    const C =
      speechRecognitionClass();

    if (!C) {
      return null;
    }

    try {
      const r =
        new C();

      r.lang = 'bn-BD';
      r.continuous = false;
      r.interimResults = true;
      r.maxAlternatives = 1;

      r.onstart =
        () => {
          listening = true;

          $('#ayonMic')
            ?.classList.add(
              'listening'
            );

          if ($('#ayonMic')) {
            $('#ayonMic').textContent =
              '◉';
          }
        };

      r.onend =
        () => {
          listening = false;

          $('#ayonMic')
            ?.classList.remove(
              'listening'
            );

          if ($('#ayonMic')) {
            $('#ayonMic').textContent =
              '🎙';
          }
        };

      r.onerror =
        e => {
          listening = false;

          $('#ayonMic')
            ?.classList.remove(
              'listening'
            );

          if ($('#ayonMic')) {
            $('#ayonMic').textContent =
              '🎙';
          }

          if (
            e?.error !==
            'no-speech'
          ) {
            console.warn(
              'AYON recognition',
              e
            );
          }
        };

      r.onresult =
        event => {
          let finalText = '';
          let interimText = '';

          for (
            let i =
              event.resultIndex;
            i <
            event.results.length;
            i++
          ) {
            const transcript =
              event.results[i][0]
                ?.transcript ||
              '';

            if (
              event.results[i]
                .isFinal
            ) {
              finalText +=
                transcript;
            } else {
              interimText +=
                transcript;
            }
          }

          const input =
            $('#ayonAiInput');

          if (input) {
            input.value =
              finalText ||
              interimText;

            input.style.height =
              'auto';

            input.style.height =
              Math.min(
                110,
                input.scrollHeight
              ) + 'px';
          }

          if (
            finalText.trim()
          ) {
            setTimeout(
              () =>
                sendFromInput(),
              200
            );
          }
        };

      return r;

    } catch (e) {
      console.warn(
        'Speech recognition init',
        e
      );

      return null;
    }
  }

  function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }

    if (!recognition) {
      recognition =
        initRecognition();
    }

    if (!recognition) {
      toastSafe(
        'এই browser-এ voice input support পাওয়া যাচ্ছে না।'
      );

      return;
    }

    try {
      recognition.lang =
        'bn-BD';

      recognition.start();

    } catch (e) {
      try {
        recognition.stop();
      } catch {}

      listening = false;
    }
  }

  function stopListening() {
    if (!recognition) {
      listening = false;
      return;
    }

    try {
      recognition.stop();
    } catch {}

    listening = false;

    $('#ayonMic')
      ?.classList.remove(
        'listening'
      );

    if ($('#ayonMic')) {
      $('#ayonMic').textContent =
        '🎙';
    }
  }

  /* =========================================================
     TOAST BRIDGE
  ========================================================= */

  function toastSafe(
    message,
    ms = 2500
  ) {
    try {
      if (
        typeof window.toast ===
        'function'
      ) {
        window.toast(
          message,
          ms
        );

        return;
      }

      if (
        typeof toast ===
        'function'
      ) {
        toast(
          message,
          ms
        );

        return;
      }
    } catch {}

    console.log(
      'AYON AI:',
      message
    );
  }

  /* =========================================================
     HUMAN SALES COACH — EXTRA INTELLIGENCE
  ========================================================= */

  function outletVisitCoach() {
    return sir(
      'Outlet visit-এ এই ৫টা জিনিস চোখে দেখবেন:\n\n' +
      '1) Stock আছে কি না\n' +
      '2) কোন listed SKU missing\n' +
      '3) Display visibility কেমন\n' +
      '4) Price tag ঠিক আছে কি না\n' +
      '5) Buyer-এর next order opportunity কোথায়\n\n' +
      'শুধু “order দেন” বলে বের হয়ে গেলে outlet visit একটু attendance হয়ে যায় স্যার 😄 Visit-এর শেষে অন্তত একটা clear next action নিয়ে বের হবেন।'
    );
  }

  function repeatOrderCoach() {
    return sir(
      'Repeat order-এর easiest route হলো buyer-কে নতুন করে পুরো গল্প না শোনানো। আগে যেটা চলেছে সেটাই ধরুন:\n\n' +
      '• Previous fast-moving SKU দেখান\n' +
      '• Current stock check করুন\n' +
      '• কতদিনের stock আছে বুঝুন\n' +
      '• Small refill quantity propose করুন\n' +
      '• তারপর ১–২টা additional SKU add করার চেষ্টা করুন\n\n' +
      'আগের order-এর ভালো স্মৃতি থাকলে buyer-এর “না” বলার energy-ও একটু কম থাকে স্যার 😄'
    );
  }

  function pendingDeliveryCoach() {
    return sir(
      'Pending delivery follow-up-এ শুধু buyer-কে call করলেই হবে না স্যার। তিনটা point একসাথে check করুন:\n\n' +
      '1) PO/order confirmed কি না\n' +
      '2) Warehouse/stock availability\n' +
      '3) Delivery date ও receiving person\n\n' +
      'Order হয়েছে কিন্তু delivery হয়নি—এটা scoreboard-এ goal post-এর সামনে বল রেখে আসার মতো 😄 Delivered না হওয়া পর্যন্ত follow-up complete না।'
    );
  }

  function skuGrowthCoach() {
    return sir(
      'SKU-wise growth করতে outlet count × active SKU × average order value—এই তিনটা driver আলাদা করে ধরুন।\n\n' +
      'প্রথমে listed কিন্তু non-moving SKU বের করুন। তারপর সব SKU একসাথে push না করে ৫–১০টা priority SKU নিন। প্রতিটি outlet-এ missing SKU থেকে ১–২টা করে activate করলেও total sales base দ্রুত বাড়ে।\n\n' +
      'একদিনে ৭৬টা SKU নিয়ে যুদ্ধ করলে buyer-ও ভয় পাবে, salesman-ও ভয় পাবে স্যার 😄 ছোট batch-এ activation বেশি practical।'
    );
  }

  function priceTagCoach() {
    return sir(
      'Price tag না থাকলে product shelf-এ থেকেও customer-এর কাছে অর্ধেক invisible হয়ে যায়। আগে shelf price verify করুন, ভুল বা missing tag supervisor/buyer-কে দেখান, তারপর order/display discussion করুন।\n\n' +
      'Product আছে, customer আছে, price tag নাই—এই তিনজনের meetingটা ঠিক জমে না স্যার 😄'
    );
  }

  function buyerFollowUpCoach() {
    return sir(
      'Buyer follow-up-এর সময় “স্যার order দেন” দিয়ে শুরু না করে previous discussion reference করুন। যেমন: last visit-এ যে SKU/stock/price-tag issue ছিল সেটা আগে mention করুন। তারপর specific quantity বা specific SKU propose করুন।\n\n' +
      'Follow-up যত specific হবে, buyer-এর answer তত specific হবে। “দেখি পরে” শুনে ফিরে আসার chance কমবে স্যার 😄'
    );
  }

  function cpoCoach() {
    return sir(
      'CPO execution-এ assignment পেলেই কাজ শেষ না। Outlet execution + required proof/photo + submission status—তিনটাই complete হতে হবে। Proof missing থাকলে কাজ pending হিসেবেই ধরুন।\n\n' +
      'CPO করেছে কিন্তু proof নাই—এটা exam দিয়েছে কিন্তু answer sheet জমা দেয়নি টাইপের অবস্থা স্যার 😄'
    );
  }

  function taskCoach() {
    return sir(
      'Important Work-কে priority অনুযায়ী ভাগ করুন: URGENT → HIGH → NORMAL। Buyer meeting বা fixed-time কাজ আগে calendar/reminder-এ রাখুন। তারপর field task।\n\n' +
      'সব task মাথায় রাখার চেষ্টা করলে মাথাই একসময় resignation দিতে চাইবে স্যার 😄 App-এর reminder ব্যবহার করুন।'
    );
  }

  function salesReturnCoach() {
    return sir(
      'Sales return কমাতে PO নেওয়ার আগেই outlet location, receiving capability, stock movement এবং buyer confirmation verify করুন। সন্দেহ থাকলে DSC/DM বা responsible person-এর সাথে confirm করে PO নিন।\n\n' +
      'Order নেওয়া achievement, কিন্তু return হয়ে ফিরে এলে সেই order আবার পরিচিত অতিথি হয়ে যায় স্যার 😄 তাই PO-এর আগে verification জরুরি।'
    );
  }

  /* =========================================================
     ENHANCED GENERAL COACH ROUTER
  ========================================================= */

  const baseGeneralSalesCoach =
    generalSalesCoach;

  generalSalesCoach =
    function(question) {

      const q =
        normalizeText(
          question
        );

      if (
        has(
          q,
          [
            'outlet visit',
            'আউটলেট ভিজিট',
            'outlet এ কি করব',
            'outlet এ কী করব',
            'outlet-এ কি করব',
            'outlet-এ কী করব',
            'visit checklist',
            'ভিজিট চেকলিস্ট'
          ]
        )
      ) {
        return outletVisitCoach();
      }

      if (
        has(
          q,
          [
            'repeat order',
            'রিপিট অর্ডার',
            'আগের অর্ডার',
            'reorder',
            're-order'
          ]
        )
      ) {
        return repeatOrderCoach();
      }

      if (
        has(
          q,
          [
            'pending delivery',
            'পেন্ডিং ডেলিভারি',
            'delivery follow',
            'ডেলিভারি ফলো'
          ]
        )
      ) {
        return pendingDeliveryCoach();
      }

      if (
        has(
          q,
          [
            'sku wise',
            'sku-wise',
            'sku growth',
            'sku বাড়াব',
            'sku বাড়াব',
            'এসকেইউ',
            'sku activation'
          ]
        )
      ) {
        return skuGrowthCoach();
      }

      if (
        has(
          q,
          [
            'price tag',
            'প্রাইস ট্যাগ',
            'price label',
            'দাম লেখা'
          ]
        )
      ) {
        return priceTagCoach();
      }

      if (
        has(
          q,
          [
            'buyer follow',
            'বায়ার ফলো',
            'বায়ার ফলো',
            'follow up buyer',
            'follow-up buyer'
          ]
        )
      ) {
        return buyerFollowUpCoach();
      }

      if (
        has(
          q,
          [
            'cpo কিভাবে',
            'cpo কীভাবে',
            'cpo execution',
            'সিপিও কিভাবে',
            'সিপিও কীভাবে'
          ]
        )
      ) {
        return cpoCoach();
      }

      if (
        has(
          q,
          [
            'task manage',
            'task management',
            'কাজ ম্যানেজ',
            'important work manage',
            'reminder কিভাবে',
            'reminder কীভাবে'
          ]
        )
      ) {
        return taskCoach();
      }

      if (
        has(
          q,
          [
            'sales return',
            'সেলস রিটার্ন',
            'return কমাব',
            'রিটার্ন কমাব',
            'po cancel',
            'po cancellation'
          ]
        )
      ) {
        return salesReturnCoach();
      }

      return baseGeneralSalesCoach(
        question
      );
    };

  /* =========================================================
     TODAY MISSION
  ========================================================= */

  function todayMission() {
    const c =
      context();

    const mission = [];

    if (
      c.todaySales <= 0
    ) {
      mission.push(
        'একটা strong buyer থেকে first order close করুন'
      );
    }

    if (
      c.zero > 0
    ) {
      mission.push(
        'কমপক্ষে 2টি zero-sales outlet follow-up করুন'
      );
    }

    if (
      c.pendingOrders > 0 ||
      c.pendingDelivery > 0
    ) {
      mission.push(
        'Pending/partial delivery follow-up করুন'
      );
    }

    if (
      c.pendingTasks > 0
    ) {
      mission.push(
        'সবচেয়ে urgent Important Work complete করুন'
      );
    }

    const missingCpo =
      cpoRows().filter(
        x => {
          const status =
            String(
              x.Status ||
              x.status ||
              ''
            ).toUpperCase();

          const proof =
            x['Photo File ID'] ||
            x.photoFileId ||
            x.proofFileId;

          return (
            status.includes(
              'PENDING'
            ) ||
            status.includes(
              'MISSING'
            ) ||
            !proof
          );
        }
      ).length;

    if (
      missingCpo > 0
    ) {
      mission.push(
        `${missingCpo}টি CPO proof/status check করুন`
      );
    }

    if (
      c.shortfall > 0
    ) {
      mission.push(
        `আজ অন্তত ${rm(c.dailyNeed)} delivered sales-এর দিকে কাজ করুন`
      );
    }

    if (!mission.length) {
      mission.push(
        'Strong outlet-এ repeat order নিন'
      );

      mission.push(
        'Weak outlet-এ SKU activation করুন'
      );

      mission.push(
        'আগামীকালের buyer follow-up ready করুন'
      );
    }

    let text =
      'আজকের Mission:\n\n';

    text +=
      mission
        .slice(0,5)
        .map(
          (x,i) =>
            `${i + 1}) ${x}`
        )
        .join('\n');

    text +=
      '\n\nএকসাথে দশটা যুদ্ধ না স্যার 😄 আগে এই mission-গুলো শেষ করুন, তারপর next opportunity ধরুন।';

    return sir(text);
  }

  /* =========================================================
     EXTRA QUESTION DETECTION
  ========================================================= */

  function asksTodayMission(
    question
  ) {
    return hasAny(
      question,
      [
        'today mission',
        'আজকের মিশন',
        'আজ কি করব',
        'আজ কী করব',
        'আজকে কি করব',
        'আজকে কী করব',
        'আজকের কাজ',
        'what should i do today',
        'আজ priority',
        'আজ প্রায়োরিটি',
        'আজ প্রায়োরিটি'
      ]
    );
  }

  /* =========================================================
     FINAL QUESTION ROUTER OVERRIDE
  ========================================================= */

  const originalAnswerQuestion =
    answerQuestion;

  answerQuestion =
    async function(question) {

      const raw =
        String(
          question || ''
        ).trim();

      if (!raw) {
        return sir(
          'প্রশ্নটা লিখুন স্যার।'
        );
      }

      const fixed =
        fixedIdentityAnswer(
          raw
        );

      if (fixed) {
        return fixed;
      }

      if (
        isGreeting(raw)
      ) {
        return greetingAnswer();
      }

      /*
         Manager-created knowledge remains
         the first operational knowledge source.
      */

      await loadManagerKnowledge(
        false
      );

      const kb =
        matchManagerKnowledge(
          raw
        );

      if (kb) {
        return applyKnowledgeTone(
          kb
        );
      }

      /*
         Today Mission uses loaded operational
         context but does not invent any figures.
      */

      if (
        asksTodayMission(
          raw
        )
      ) {
        await refreshLiveIfNeeded();

        return todayMission();
      }

      /*
         Explicit live-data question.
      */

      if (
        isLiveDataQuestion(
          raw
        )
      ) {
        try {
          return await liveDatabaseAnswer(
            raw
          );

        } catch (e) {
          console.warn(
            'AYON live data',
            e
          );

          return sir(
            'Live database এখন response দিচ্ছে না। App refresh করে আবার চেষ্টা করুন। আমি কোনো sales number বানিয়ে বলব না।'
          );
        }
      }

      /*
         Everything else:
         human-style field sales coaching.
      */

      return generalSalesCoach(
        raw
      );
    };

  /* =========================================================
     SECURITY / ROLE GUARD
  ========================================================= */

  function safeTeamForUser() {
    if (
      isManagerContext()
    ) {
      return getTeam();
    }

    /*
       SR does not receive team-level AI context.
    */

    return [];
  }

  /* =========================================================
     PUBLIC AYON AI BRIDGE
  ========================================================= */

  window.AYON_AI = {
    build:
      BUILD,

    creator:
      CREATOR_NAME,

    headOfSales:
      HEAD_OF_SALES,

    ask:
      async question =>
        answerQuestion(
          question
        ),

    open:
      () => {
        ensureUi();

        if (!opened) {
          togglePanel();
        }
      },

    close:
      closePanel,

    speak:
      text =>
        speak(text),

    stopVoice:
      () => {
        try {
          speechSynthesis.cancel();
        } catch {}
      },

    reloadKnowledge:
      async () =>
        loadManagerKnowledge(
          true
        ),

    getKnowledge:
      () =>
        knowledgeCache.map(
          x => ({
            ...x
          })
        ),

    getContext:
      () =>
        context(),

    getTeam:
      () =>
        safeTeamForUser(),

    todayMission:
      () =>
        todayMission(),

    clearHistory:
      clearHistory
  };

  /* =========================================================
     SESSION CHANGE WATCH
  ========================================================= */

  let lastSessionId = '';

  function sessionIdNow() {
    const s =
      getSession();

    return normalizeIdValue(
      s?.id ||
      s?.staffId ||
      s?.['Staff ID'] ||
      ''
    );
  }

  function sessionWatcher() {
    const now =
      sessionIdNow();

    if (
      now &&
      now !==
      lastSessionId
    ) {
      lastSessionId = now;

      liveLoadedAt = 0;

      if (
        window.OneSignalDeferred &&
        window.OneSignal
      ) {
        /*
           Main app.js handles OneSignal login.
           AYON AI does not duplicate it.
        */
      }
    }

    if (
      !now &&
      lastSessionId
    ) {
      lastSessionId = '';
      closePanel();
    }
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  function initialize() {
    loadHistory();
    readKbCache();
    ensureUi();

    lastSessionId =
      sessionIdNow();

    /*
       Load manager knowledge quietly.
       Chat opens immediately; this must not block UI.
    */

    setTimeout(
      () => {
        loadManagerKnowledge(
          false
        );
      },
      400
    );

    setInterval(
      sessionWatcher,
      3000
    );

    /*
       Background KB refresh.
       Does not interrupt normal chat.
    */

    setInterval(
      () => {
        if (
          document.hidden
        ) return;

        loadManagerKnowledge(
          false
        );
      },
      5 * 60 * 1000
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initialize
    );
  } else {
    initialize();
  }

  /* =========================================================
     FINAL SAFETY
  ========================================================= */

  window.addEventListener(
    'beforeunload',
    () => {
      try {
        if (
          recognition &&
          listening
        ) {
          recognition.stop();
        }

        if (
          'speechSynthesis' in
          window
        ) {
          speechSynthesis.cancel();
        }

      } catch {}
    }
  );

  /* =========================================================
     END AYON AI FINAL
  ========================================================= */

})();
