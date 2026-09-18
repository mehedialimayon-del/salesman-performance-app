'use strict';

/* =========================================================
   AYON AI LITE — ZERO-COST SALES ASSISTANT
   Premium Floating Assistant + Voice
   Developed by KAM AYON
   Build: AYON-AI-LITE-2026.09.18-3

   IMPORTANT:
   - No paid AI/API required.
   - Reads already-loaded Sales Performance Hub data.
   - Uses browser speech recognition + speech synthesis when supported.
   - If voice is unavailable, text assistant still works.
========================================================= */

(() => {
  const BUILD = 'AYON-AI-LITE-2026.09.18-3';
  const AVATAR_SRC = 'icons/ayon-avatar.jpg';
  const CHAT_KEY = 'ayon.ai.chat.v2';
  const MAX_HISTORY = 40;

  let opened = false;
  let listening = false;
  let recognition = null;
  let autoVoice = true;
  let chatHistory = [];

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const rm = (v) => `RM ${num(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (v) => `${num(v).toFixed(1)}%`;

  function getCurrent() {
    try { return typeof current !== 'undefined' && current ? current : {}; }
    catch { return {}; }
  }

  function getSession() {
    try { return typeof session !== 'undefined' && session ? session : {}; }
    catch { return {}; }
  }

  function getTeam() {
    try { return typeof teamSnapshot !== 'undefined' && Array.isArray(teamSnapshot) ? teamSnapshot : []; }
    catch { return []; }
  }

  function getMonth() {
    try { return typeof selectedMonth !== 'undefined' && selectedMonth ? selectedMonth : ''; }
    catch { return ''; }
  }

  function getViewedName() {
    try {
      if (typeof viewedName === 'function') {
        const v = viewedName();
        if (v && String(v).trim()) return String(v).trim();
      }
      const c = getCurrent();
      return c?.user?.['Full Name'] || c?.user?.name || getSession()?.name || 'Sales User';
    } catch {
      return 'Sales User';
    }
  }

  function isManagerContext() {
    const s = getSession();
    const role = String(s?.role || '').toUpperCase();
    return String(s?.mode || '').toLowerCase() === 'manager' || role.includes('MANAGER') || role.includes('HR');
  }

  function routeOutletsSafe() {
    try {
      if (typeof routeOutlets === 'function') {
        const r = routeOutlets();
        return Array.isArray(r) ? r : [];
      }
    } catch {}
    return Array.isArray(getCurrent()?.outlets) ? getCurrent().outlets : [];
  }

  const performance = () => getCurrent()?.performance || {};
  const income = () => getCurrent()?.incomeSummary || {};
  const incentives = () => Array.isArray(getCurrent()?.incentives) ? getCurrent().incentives : [];
  const tasks = () => Array.isArray(getCurrent()?.tasks) ? getCurrent().tasks : [];
  const outletSales = () => Array.isArray(getCurrent()?.outletSales) ? getCurrent().outletSales : [];
  const skuSales = () => Array.isArray(getCurrent()?.skuSales) ? getCurrent().skuSales : [];

  function todayKey() {
    try {
      if (typeof localDate === 'function') return localDate();
    } catch {}
    return new Date().toISOString().slice(0, 10);
  }

  function appReady() {
    const c = getCurrent();
    return !!(c && Object.keys(c).length);
  }

  function normalizeText(t) {
    return String(t || '')
      .trim()
      .toLowerCase()
      .replace(/[!?.,;:()[\]{}"']/g, ' ')
      .replace(/\s+/g, ' ');
  }

  function has(q, words) {
    return words.some(w => q.includes(w));
  }

  function isGreeting(q) {
    const t = String(q || '').trim().toLowerCase();
    const exact = ['hello','hi','hey','হ্যালো','হাই','সালাম','assalam','assalamu alaikum','আসসালামু আলাইকুম'];
    if (exact.includes(t)) return true;
    return exact.some(g => t.startsWith(g + ' ') && t.length <= g.length + 20);
  }

  function remainingDaysInMonth() {
    const m = getMonth() || todayKey().slice(0, 7);
    const [y, mo] = m.split('-').map(Number);
    if (!y || !mo) return 1;
    const last = new Date(y, mo, 0).getDate();
    const today = todayKey();
    const day = today.startsWith(m) ? Number(today.slice(8, 10)) : 1;
    return Math.max(1, last - day + 1);
  }

  function context() {
    const p = performance();
    const pending = tasks().filter(x => String(x.Status || '').toUpperCase() !== 'DONE');
    return {
      name: getViewedName(),
      target: num(p.target),
      achievement: num(p.achievement),
      percent: num(p.percent),
      shortfall: num(p.shortfall),
      todaySales: num(p.todaySales),
      coverage: num(p.coverage),
      covered: num(p.coveredOutlets),
      route: num(p.routeOutlets),
      zero: num(p.zeroOutlets),
      pendingTasks: pending.length,
      incentiveCount: incentives().length,
      days: remainingDaysInMonth(),
      dailyNeed: num(p.shortfall) / remainingDaysInMonth()
    };
  }

  function outletOpportunityRows() {
    const totals = new Map();

    for (const s of outletSales()) {
      const name = String(s?.['Outlet Name'] || '').trim();
      if (!name) continue;
      totals.set(name, (totals.get(name) || 0) + num(s?.['Sales Value']));
    }

    return routeOutletsSafe().map(o => {
      const name = String(o?.['Outlet Name'] || '').trim();
      return {
        name,
        code: String(o?.['Outlet Code'] || ''),
        category: String(o?.Category || ''),
        sales: totals.get(name) || 0
      };
    }).sort((a, b) => a.sales - b.sales);
  }

  function skuRanking() {
    const map = new Map();

    for (const s of skuSales()) {
      const sku = String(s?.['SKU Name'] || '').trim();
      if (!sku) continue;
      const row = map.get(sku) || { sku, cartons: 0, value: 0 };
      row.cartons += num(s?.Cartons);
      row.value += num(s?.['Sales Value']);
      map.set(sku, row);
    }

    return [...map.values()].sort((a, b) => b.value - a.value || b.cartons - a.cartons);
  }

  function activeIncentiveText() {
    const list = incentives();

    if (!list.length) return 'এখন কোনো active incentive data পাওয়া যাচ্ছে না।';

    const active = list
      .filter(x => !x.fulfilled)
      .sort((a, b) => num(a.remaining) - num(b.remaining))
      .slice(0, 5);

    if (!active.length) return 'সব visible incentive fulfilled দেখাচ্ছে।';

    return active.map((x, i) =>
      `${i + 1}) ${x.name || 'Incentive'} — ${num(x.actual)} / ${num(x.target)}, বাকি ${num(x.remaining)}, reward ${rm(x.rewardRM)}`
    ).join('\n');
  }

  function todayFocus() {
    const c = context();
    const zeros = outletOpportunityRows().filter(x => x.sales <= 0).slice(0, 5);
    const inc = incentives().filter(x => !x.fulfilled && num(x.remaining) > 0).slice(0, 2);

    let text = `${c.name}-এর আজকের focus:\n`;
    text += `1) Achievement ${pct(c.percent)}; shortfall ${rm(c.shortfall)}। Remaining ${c.days} day ধরে প্রায় ${rm(c.dailyNeed)}/day দরকার।\n`;
    text += `2) Zero-sales outlet ${c.zero}; coverage ${pct(c.coverage)}।`;
    if (zeros.length) text += ` প্রথমে ${zeros.map(x => x.name).join(', ')} cover করুন।`;
    text += `\n3) Pending task ${c.pendingTasks}টি — route শুরু করার আগে due task check করুন।`;
    if (inc.length) text += `\n4) Incentive push: ${inc.map(x => `${x.name} (${num(x.remaining)} remaining)`).join('; ')}।`;
    text += '\n5) প্রতিটি outlet-এ availability → price tag → display → order → next follow-up date confirm করুন।';
    return text;
  }

  function targetPlan() {
    const c = context();
    const weeks = Math.max(1, Math.ceil(c.days / 7));
    return `${c.name}-এর target recovery plan:\n` +
      `• Target: ${rm(c.target)}\n` +
      `• Achievement: ${rm(c.achievement)} (${pct(c.percent)})\n` +
      `• Shortfall: ${rm(c.shortfall)}\n` +
      `• Remaining days: ${c.days}\n` +
      `• Minimum average needed: ${rm(c.dailyNeed)}/day\n` +
      `• Weekly recovery target: প্রায় ${rm(c.shortfall / weeks)}\n\n` +
      'Execution: সকাল = zero/low outlets, দুপুর = high-potential outlets, বিকেল = buyer follow-up, দিনের শেষে daily target review।';
  }

  function zeroSalesAdvice() {
    const rows = outletOpportunityRows();
    if (!rows.length) return 'Route outlet data এখনো load হয়নি। Dashboard/Outlet Report refresh করুন।';

    const zeros = rows.filter(x => x.sales <= 0);
    if (!zeros.length) return 'Loaded month data অনুযায়ী zero-sales outlet পাওয়া যায়নি। এখন low-sales outlet push করাই next step।';

    return `Zero-sales priority (${zeros.length} outlet):\n` +
      zeros.slice(0, 8).map((x, i) => `${i + 1}) ${x.name}${x.category ? ` — ${x.category}` : ''}`).join('\n') +
      '\n\nVisit objective: minimum 1 order + missing SKU check + display + buyer/supervisor next-order commitment।';
  }

  function skuAdvice() {
    const ranks = skuRanking();

    if (!ranks.length) {
      if (incentives().some(x => !x.fulfilled)) {
        return `SKU sales history এখন কম/খালি। Active incentive ধরে focus করুন:\n${activeIncentiveText()}`;
      }
      return 'SKU sales data যথেষ্ট নেই। SKU entry হলে আমি top/weak SKU analysis দিতে পারব।';
    }

    const top = ranks.slice(0, 5);
    const low = [...ranks].sort((a, b) => a.value - b.value).slice(0, 5);

    return 'SKU picture:\nTop value SKUs:\n' +
      top.map((x, i) => `${i + 1}) ${x.sku} — ${x.cartons} CTN, ${rm(x.value)}`).join('\n') +
      '\n\nLow/Opportunity SKUs:\n' +
      low.map((x, i) => `${i + 1}) ${x.sku} — ${x.cartons} CTN, ${rm(x.value)}`).join('\n') +
      '\n\nAction: strong SKU দিয়ে entry নিন, তারপর related SKU add-on order চান।';
  }

  function taskAdvice() {
    const pending = tasks().filter(x => String(x.Status || '').toUpperCase() !== 'DONE');
    if (!pending.length) return 'কোনো pending task দেখাচ্ছে না।';

    return `Pending task ${pending.length}টি:\n` +
      pending.slice(0, 8).map((x, i) =>
        `${i + 1}) ${x.Title || 'Task'}${x['Due Date'] ? ` — due ${String(x['Due Date']).slice(0, 10)}` : ''}${x.Instruction ? ` — ${x.Instruction}` : ''}`
      ).join('\n');
  }

  function incomeAdvice() {
    const x = income();
    return 'Current income picture:\n' +
      `• Basic: ${rm(x.baseSalary)}\n` +
      `• Sales commission: ${rm(x.salesCommission)}\n` +
      `• Product incentive: ${rm(x.productIncentive)}\n` +
      `• Other incentive: ${rm(x.otherIncentive)}\n` +
      `• Individual incentive: ${rm(x.individualIncentive)}\n` +
      `• Penalty: ${rm(x.penalty)}\n` +
      `• Final income: ${rm(x.finalIncome)}`;
  }

  function managerAdvice() {
    const team = getTeam();
    if (!team.length) return 'Team snapshot এখনো load হয়নি। Manager Team screen একবার refresh করুন।';

    const rows = team.map(x => ({
      name: x.name || x.staffId,
      id: x.staffId,
      percent: num(x?.performance?.percent),
      shortfall: num(x?.performance?.shortfall),
      zero: num(x?.performance?.zeroOutlets),
      pending: num(x?.pendingTasks)
    })).sort((a, b) =>
      (b.shortfall + b.zero * 100 + b.pending * 50) -
      (a.shortfall + a.zero * 100 + a.pending * 50)
    );

    return 'Manager attention priority:\n' +
      rows.slice(0, 4).map((x, i) =>
        `${i + 1}) ${x.name} — achievement ${pct(x.percent)}, shortfall ${rm(x.shortfall)}, zero outlet ${x.zero}, pending task ${x.pending}`
      ).join('\n') +
      '\n\nPriority shortfall + zero-sales + pending task ধরে সাজানো।';
  }


  function findTeamMemberFromQuestion(q) {
    if (!isManagerContext()) return null;
    const nq = normalizeText(q);
    const aliases = {
      'emon':['emon','ইমন','বদরুদ্দোজা','badruddoza','bodruddaza','m22075'],
      'limon':['limon','লিমন','majumder','মজুমদার','m22268'],
      'munnaf':['munnaf','মুন্নাফ','munnaf ali','মুন্নাফ আলী','m22328'],
      'ayon':['ayon','অয়ন','অয়ন','mehedi','মেহেদি','m21954']
    };
    const team = getTeam();
    for (const x of team) {
      const hay = normalizeText(`${x.name||''} ${x.staffId||''}`);
      if (hay && (nq.includes(hay) || hay.split(' ').some(w => w.length > 3 && nq.includes(w)))) return x;
    }
    for (const [key, arr] of Object.entries(aliases)) {
      if (arr.some(a => nq.includes(normalizeText(a)))) {
        const ids = {emon:'M22075',limon:'M22268',munnaf:'M22328',ayon:'M21954'};
        return team.find(x => String(x.staffId).toUpperCase() === ids[key]) || {staffId:ids[key],name:key.toUpperCase()};
      }
    }
    return null;
  }

  async function fetchManagerStaffData(member) {
    if (!member || !isManagerContext() || typeof apiPost !== 'function') return null;
    try {
      const r = await apiPost('bootstrap', {
        viewStaffId: member.staffId,
        month: (typeof selectedMonth !== 'undefined' ? selectedMonth : ''),
        date: (typeof selectedDate !== 'undefined' ? selectedDate : '')
      });
      return r?.ok ? (r.data || null) : null;
    } catch (_) { return null; }
  }

  function zeroRowsFromData(d) {
    const rows = Array.isArray(d?.outletSummary) ? d.outletSummary : [];
    return rows.filter(x => num(x.mtdSales ?? x.actualDelivered ?? x.deliveredValue ?? x.sales) <= 0);
  }

  function managerStaffAnswer(q, member, d) {
    const name = d?.user?.['Full Name'] || d?.user?.name || member?.name || member?.staffId || 'SR';
    const p = d?.performance || member?.performance || {};
    const inc = d?.incomeSummary || member?.incomeSummary || {};
    const ins = Array.isArray(d?.incentives) ? d.incentives : [];
    const zeros = zeroRowsFromData(d);

    if (has(q,['zero sale','zero-sales','zero outlet','জিরো','শূন্য সেল'])) {
      const count = zeros.length || num(p.zeroOutlets);
      if (!count) return `${name}-এর loaded data অনুযায়ী zero-sales outlet নেই।`;
      const list = zeros.slice(0,25).map((x,i)=>`${i+1}) ${x.outletName || x['Outlet Name'] || x.outletCode || 'Outlet'}`).join('\n');
      return `${name}-এর zero-sales outlet: ${count}টি।${list ? '\n\n'+list : ''}`;
    }
    if (has(q,['income','salary','commission','বেতন','ইনকাম','কমিশন'])) {
      return `${name}-এর income picture:\n• Achievement: ${rm(p.achievement)}\n• Commission: ${rm(inc.salesCommission)}\n• Product incentive: ${rm(inc.productIncentive)}\n• Other incentive: ${rm(inc.otherIncentive)}\n• Penalty: ${rm(inc.penalty)}\n• Final income: ${rm(inc.finalIncome)}`;
    }
    if (has(q,['incentive','ইনসেনটিভ','reward','আর কত','কত বাকি','remaining'])) {
      if (!ins.length) return `${name}-এর active incentive data পাওয়া যাচ্ছে না।`;
      return `${name}-এর incentive progress:\n` + ins.map((x,i)=>`${i+1}) ${x.name||'Incentive'} — ${num(x.actual)}/${num(x.target)}, বাকি ${num(x.remaining)}, reward ${rm(x.rewardRM)}, earned ${rm(x.earnedRM)}`).join('\n');
    }
    if (has(q,['pending delivery','pending','ডেলিভারি','delivery'])) {
      const ex = Array.isArray(d?.execution) ? d.execution : [];
      const pend = ex.filter(x => !['DELIVERED','CANCELLED'].includes(String(x.deliveryStatus||x.status||'').toUpperCase()));
      return `${name}-এর pending delivery ${pend.length}টি।` + (pend.length ? '\n' + pend.slice(0,20).map((x,i)=>`${i+1}) ${x.outletName||'Outlet'} — ${rm(x.orderValue||x.bookedValue)} booked, ${rm(x.deliveredValue)} delivered`).join('\n') : '');
    }
    if (has(q,['task','important work','কাজ','pending work'])) {
      const ts = Array.isArray(d?.tasks) ? d.tasks : [];
      const pend = ts.filter(x => !taskDone(x));
      return `${name}-এর pending Important Work ${pend.length}টি।` + (pend.length ? '\n' + pend.slice(0,15).map((x,i)=>`${i+1}) ${x.Title||'Important Work'} • ${x.Priority||'NORMAL'}`).join('\n') : '');
    }
    return `${name}: Achievement ${rm(p.achievement)} / Target ${rm(p.target)} (${pct(p.percent)}), Shortfall ${rm(p.shortfall)}, Zero outlet ${num(p.zeroOutlets)}, Final income ${rm(inc.finalIncome)}।`;
  }

  function strongSalesCoach() {
    return 'আরে ভাই 😄 আপনি sales করতে পারবেন না—এটা আমি মানি না। আপনি অবশ্যই পারবেন। Technique একটু change করি:\\n\\n1) Outlet-এ ঢুকেই order চাইবেন না—supervisor/buyer-এর সাথে relationship warm করুন।\\n2) আগে জিজ্ঞেস করুন: “Boss, কোন item slow, কোনটা stock-out?”\\n3) Zero/low SKU থেকে 2–3টা fast-moving item দিয়ে small order close করুন।\\n4) Price tag, display, stock availability নিজের চোখে check করুন।\\n5) Full range চাপাবেন না—easy yes দিয়ে শুরু করে SKU বাড়ান।\\n6) Objection থাকলে কারণটা লিখে রাখুন; next visit-এর clear follow-up নিন।\\n7) Outlet থেকে বের হওয়ার আগে আজকের order/delivery app-এ update করবেন 😄\\n\\nProblemটা আমাকে বলেন—buyer order দিচ্ছে না, stock নাই, price issue, listing issue নাকি display? আমি সেই অনুযায়ী next move বলব।';
  }

  function buyerAdvice(q) {
    if (has(q, ['order dibe na', 'order dibena', 'অর্ডার দিবে না', 'অর্ডার দিচ্ছে না', 'no order'])) {
      return 'Buyer/supervisor order দিচ্ছে না হলে:\n' +
        '1) আগে objection শুনুন — “কোন item slow যাচ্ছে?”\n' +
        '2) Full range না চেয়ে 2–3 fast SKU দিয়ে small order চান।\n' +
        '3) Shelf gap/stock-out দেখান।\n' +
        '4) Price tag ও display issue থাকলে fix করার commitment দিন।\n' +
        '5) বলুন: “আজ small quantity দিন, movement দেখে next visit-এ increase করব।”\n' +
        '6) Store performance, availability এবং easy replenishment-এ conversation রাখুন।';
    }

    if (has(q, ['price', 'দাম', 'expensive', 'mahal', 'মহল'])) {
      return 'Price objection:\n• শুধু unit price defend করবেন না—margin, movement, pack value দেখান।\n• 1–2 proven SKU দিয়ে low-risk trial নিন।\n• Shelf price tag ঠিক আছে কিনা check করুন।\n• Comparable pack-এর সাথে value comparison দিন।';
    }

    if (has(q, ['listing', 'লিস্টিং'])) {
      return 'New listing pitch:\n1) Category gap দেখান।\n2) 3–5 priority SKU short-list করুন।\n3) Expected rotation বলুন।\n4) Display/promo/stock follow-up support দিন।\n5) 14-day review date নিন।';
    }

    return 'Buyer handling formula: Listen → Diagnose → Small low-risk proposal → Proof → Clear next action.\n\nOpening: “Boss, আপনার store-এ কোন category/SKUটা slow বা stock issue দিচ্ছে? Full order চাই না—যেটা move করবে ওই 2–3 item দিয়ে শুরু করি।”';
  }

  function meetingAdvice() {
    const c = context();

    return 'আজকের sales meeting-এর 5 point:\n' +
      `1) Achievement ${pct(c.percent)}; shortfall ${rm(c.shortfall)}।\n` +
      `2) Daily recovery requirement প্রায় ${rm(c.dailyNeed)}।\n` +
      `3) Zero-sales outlet ${c.zero}; coverage ${pct(c.coverage)}।\n` +
      '4) Fast mover protect + weak SKU targeted outlet push।\n' +
      '5) Buyer follow-up, price tag, display, stock availability, task closure।\n\n' +
      'Closing: “Target শুধু total value দিয়ে না—outlet × SKU × follow-up discipline দিয়ে achieve করব।”';
  }

  function generalAdvice(q) {
    if (has(q, ['display', 'ডিসপ্লে', 'shelf'])) {
      return 'Display checklist:\n• Visible/eye-level placement\n• Price tag present & correct\n• Front-facing packs\n• Stock-out gap fill\n• Same brand block together\n• Promo message readable\n• Before/after photo proof';
    }

    if (has(q, ['return', 'রিটার্ন'])) {
      return 'Sales return কমাতে:\n1) Buyer confirmation ছাড়া over-order নয়।\n2) Outlet capacity অনুযায়ী quantity।\n3) Fast/slow SKU আলাদা করুন।\n4) Expiry/rotation follow-up।\n5) New outlet-এ small trial order।\n6) PO-এর আগে location ও receiving ability confirm।';
    }

    if (has(q, ['growth', 'গ্রোথ', 'sales barabo', 'increase sale', 'বাড়াব'])) {
      return 'Sales growth formula:\nActive Outlet × Active SKU × Average Order Value × Reorder Frequency.\n\nপ্রথম focus: existing outlet-এ 1–2 extra active SKU বাড়ানো।';
    }

    return 'আমি live sales data + sales playbook দিয়ে সাহায্য করতে পারি। জিজ্ঞেস করুন:\n• আজ কোথায় focus করব?\n• Target achieve করতে daily কত লাগবে?\n• Zero-sales outlet কোনগুলো?\n• কোন SKU push করব?\n• Buyer order দিচ্ছে না—কি বলব?\n• Meeting-এর 5টা point দাও।';
  }

  async function answerQuestion(text) {
    const q = normalizeText(text);

    if (!q) return 'বলুন, sales-related কী সহযোগিতা লাগবে?';

    // Fixed identity / company-safe knowledge. These answers work even before live app data loads.
    if (has(q, ['who created you', 'who made you', 'কে তৈরি করেছে', 'কে বানিয়েছে', 'কে বানিয়েছে', 'creator', 'developer'])) {
      return 'আমার নাম AYON — Key Account Manager Ayon-এর Sales Assistant। আমাকে তৈরি ও কনফিগার করেছেন PRAN Group Malaysia-এর Key Account Manager Mehedi Alim Ayon। Sales performance, outlet execution, SKU growth, incentive, CPO, target recovery এবং Modern Trade–সংক্রান্ত কাজে সহযোগিতা করাই আমার কাজ। Mehedi Alim Ayon-এর professional portfolio এই app-এ দেওয়া আছে।';
    }
    if (has(q, ['head of sales', 'hos কে', 'hos sir', 'হেড অব সেলস', 'পারভেজ হিরা', 'parves hira'])) {
      return 'Pinnacle Foods (M) Sdn Bhd-এর Modern Trade Head of Sales হলেন Parves Hira। Internal team context অনুযায়ী Modern Trade-এর SKU-wise, outlet-wise এবং sales planning/instruction-এ তাঁর গুরুত্বপূর্ণ ভূমিকা আছে; তাঁর planning ও direction অনুসরণ করে team execution পরিচালিত হয়।';
    }
    if (has(q, ['your name', 'তোমার নাম', 'আপনার নাম', 'who are you'])) {
      return 'আমি AYON — Key Account Manager Ayon-এর Sales Assistant। Sales-related কী সহযোগিতা লাগবে বলুন।';
    }
    if (has(q, ['তুমি ছেলে', 'তুমি মেয়ে', 'তুমি মেয়ে', 'are you male', 'are you female', 'boy or girl', 'তোমার বয়স', 'তোমার বয়স'])) {
      return 'দুঃখিত, এ ধরনের ব্যক্তিগত প্রশ্নের উত্তর দিই না। Sales-related কোনো প্রশ্ন থাকলে করুন।';
    }
    if (has(q, ['কেমন মানুষ', 'ব্যক্তিগত তথ্য', 'personal information', 'private information', 'পারভেজ স্যার কেমন', 'ayon কেমন', 'অয়ন কেমন', 'অয়ন কেমন'])) {
      return 'দুঃখিত, আমি কারও ব্যক্তিগত তথ্য বা ব্যক্তিগত মূল্যায়ন প্রদান করি না। Sales-related কোনো প্রশ্ন থাকলে করুন।';
    }

    if (!appReady()) {
      return 'App-এর live sales data এখনো load হয়নি। Dashboard → Refresh Live করুন। তারপর আমি target, outlet, SKU, incentive ও task ধরে suggestion দেব।';
    }

    if (isGreeting(q)) {
      return `হ্যালো ${getViewedName()}। আমি AYON AI — আপনার Sales Assistant। Target, outlet, SKU, incentive, buyer handling বা meeting নিয়ে জিজ্ঞেস করুন।`;
    }

    if (isManagerContext()) {
      const member = findTeamMemberFromQuestion(q);
      if (member) {
        const d = await fetchManagerStaffData(member);
        return managerStaffAnswer(q, member, d || member);
      }
      if (has(q, ['team', 'কে পিছিয়ে', 'manager attention', 'ম্যানেজার', 'compare sr', 'sr compare'])) {
        return managerAdvice();
      }
    }

    if (has(q, ['sale নাই','sale nai','sales নাই','sales nai','সেল নাই','সেল হচ্ছে না','সেল করতে পারছি না','sale korte parchi na','কোথা থেকে সেল করব','কিভাবে সেল করব','কীভাবে সেল করব'])) {
      return strongSalesCoach();
    }

    if (has(q, ['today focus', 'আজ কোথায়', 'আজ কি করব', 'আজ কী করব', 'আজকের focus', 'আজকে focus'])) {
      return todayFocus();
    }

    if (has(q, ['target', 'shortfall', 'কত sale', 'কত সেল', 'daily কত', 'টার্গেট', 'শর্টফল'])) {
      return targetPlan();
    }

    if (has(q, ['zero sale', 'zero-sales', 'zero outlet', 'জিরো', 'শূন্য সেল'])) {
      return zeroSalesAdvice();
    }

    if (has(q, ['incentive', 'ইনসেনটিভ', 'reward', 'combo'])) {
      return `Active incentive status:\n${activeIncentiveText()}\n\nTactic: remaining target-কে daily route target-এ ভাগ করুন এবং zero/low outlet-এ selected SKU push করুন।`;
    }

    if (has(q, ['sku', 'product', 'প্রোডাক্ট', 'item', 'আইটেম'])) {
      return skuAdvice();
    }

    if (has(q, ['task', 'টাস্ক', 'কাজ বাকি'])) {
      return taskAdvice();
    }

    if (has(q, ['income', 'salary', 'commission', 'বেতন', 'ইনকাম', 'কমিশন'])) {
      return incomeAdvice();
    }

    if (has(q, ['buyer', 'বায়ার', 'supervisor', 'সুপারভাইজার', 'listing', 'লিস্টিং', 'price', 'দাম', 'অর্ডার', 'order'])) {
      return buyerAdvice(q);
    }

    if (has(q, ['meeting', 'মিটিং', 'speech', 'পয়েন্ট', 'point'])) {
      return meetingAdvice();
    }

    const salesScope = ['sales','sale','সেল','target','টার্গেট','outlet','আউটলেট','sku','product','প্রোডাক্ট','buyer','বায়ার','order','অর্ডার','delivery','ডেলিভারি','growth','গ্রোথ','incentive','ইনসেনটিভ','commission','কমিশন','cpo','display','listing','লিস্টিং','modern trade','route','market','মার্কেট','po','proposal','task','কাজ'];
    if (!has(q, salesScope)) return 'দুঃখিত, আমি Sales Performance Hub-এর sales-related assistant। Sales, target, outlet, SKU, buyer, delivery, incentive, CPO বা Modern Trade–সংক্রান্ত প্রশ্ন করুন।';

    const ans = generalAdvice(q);
    if (!ans) return 'এই sales প্রশ্নে আমার available data থেকে নির্ভরযোগ্য guidance তৈরি করা যাচ্ছে না। আরও নির্ভুল guidance-এর জন্য Key Account Manager Mehedi Alim Ayon-এর সঙ্গে যোগাযোগ করুন।';
    return ans;
  }

  function injectStyle() {
    if ($('#ayonAiStyle')) return;

    const style = document.createElement('style');
    style.id = 'ayonAiStyle';

    style.textContent = `
      :root{
        --aa-orange:#ff7414;
        --aa-bg:#080b0f;
        --aa-card:#121820;
        --aa-line:rgba(255,255,255,.10);
        --aa-muted:#9ba7b5;
      }

      #ayonAiFab{
        position:fixed;
        right:16px;
        bottom:92px;
        z-index:9950;
        width:66px;
        height:66px;
        border-radius:50%;
        border:2px solid rgba(255,116,20,.9);
        background:#090c10;
        box-shadow:0 18px 45px rgba(0,0,0,.45),0 0 0 6px rgba(255,116,20,.10);
        padding:3px;
        display:grid;
        place-items:center;
        cursor:pointer;
      }

      #ayonAiFab img{
        width:100%;
        height:100%;
        object-fit:cover;
        border-radius:50%;
      }

      #ayonAiFab .fallback{
        display:none;
        width:100%;
        height:100%;
        border-radius:50%;
        place-items:center;
        background:linear-gradient(135deg,#ff7414,#ffa65f);
        color:#111;
        font-size:13px;
        font-weight:900;
      }

      #ayonAiFab:after{
        content:"AI";
        position:absolute;
        top:-4px;
        right:-5px;
        background:#ff7414;
        color:#080b0f;
        border:2px solid #080b0f;
        border-radius:999px;
        padding:5px 6px;
        font-size:10px;
        font-weight:1000;
      }

      #ayonAiPanel{
        position:fixed;
        right:14px;
        bottom:80px;
        width:min(410px,calc(100vw - 20px));
        height:min(690px,calc(100dvh - 105px));
        z-index:9949;
        display:flex;
        flex-direction:column;
        overflow:hidden;
        border-radius:28px;
        border:1px solid rgba(255,255,255,.11);
        background:linear-gradient(180deg,#0f141a,#07090c);
        color:#f8fafc;
        box-shadow:0 28px 80px rgba(0,0,0,.58);
        opacity:0;
        pointer-events:none;
        transform:translateY(18px) scale(.97);
        transition:.22s ease;
      }

      #ayonAiPanel.open{
        opacity:1;
        pointer-events:auto;
        transform:translateY(0) scale(1);
      }

      .aa-head{
        padding:15px;
        border-bottom:1px solid var(--aa-line);
        background:
          radial-gradient(circle at 20% 0%,rgba(255,116,20,.20),transparent 38%),
          linear-gradient(180deg,#171d24,#10151b);
      }

      .aa-headrow{display:flex;align-items:center;gap:12px}

      .aa-avatar-wrap{
        width:58px;height:58px;border-radius:50%;position:relative;flex:0 0 auto
      }

      .aa-avatar-wrap:before,.aa-avatar-wrap:after{
        content:"";position:absolute;inset:-5px;border:2px solid rgba(255,116,20,.45);border-radius:50%;opacity:.55
      }

      #ayonAiPanel.speaking .aa-avatar-wrap:before{animation:aaPulse 1s infinite}
      #ayonAiPanel.speaking .aa-avatar-wrap:after{animation:aaPulse 1s .35s infinite}

      @keyframes aaPulse{
        0%{transform:scale(.92);opacity:.85}
        100%{transform:scale(1.35);opacity:0}
      }

      .aa-avatar{
        width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid #ff7414;position:relative;z-index:2;background:#111
      }

      .aa-title{min-width:0;flex:1}
      .aa-title h3{margin:0;font-size:17px}
      .aa-title p{margin:5px 0 0;color:var(--aa-muted);font-size:11px}
      .aa-online{color:#8bd99d;font-weight:800}

      .aa-icon{
        width:34px;height:34px;border-radius:12px;border:1px solid var(--aa-line);background:rgba(255,255,255,.05);color:#fff;cursor:pointer
      }

      .aa-quick{
        display:flex;gap:7px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid var(--aa-line);scrollbar-width:none
      }
      .aa-quick::-webkit-scrollbar{display:none}

      .aa-chip{
        flex:0 0 auto;border:1px solid rgba(255,116,20,.35);background:rgba(255,116,20,.08);color:#ffd9be;
        border-radius:999px;padding:8px 10px;font-size:11px;font-weight:800;cursor:pointer
      }

      #ayonAiMessages{flex:1;overflow-y:auto;padding:14px 12px 18px;scroll-behavior:smooth}
      .aa-msg{display:flex;gap:8px;align-items:flex-end;margin:8px 0}
      .aa-msg.user{justify-content:flex-end}
      .aa-mini{width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,116,20,.55)}

      .aa-bubble{
        max-width:82%;padding:10px 12px;border-radius:18px;white-space:pre-wrap;line-height:1.46;font-size:13px;word-break:break-word
      }

      .aa-msg.user .aa-bubble{
        background:linear-gradient(135deg,#ff7414,#ff9140);color:#0a0b0d;border-bottom-right-radius:5px;font-weight:700
      }

      .aa-msg.ai .aa-bubble{
        background:#151b22;color:#f6f7f9;border:1px solid rgba(255,255,255,.08);border-bottom-left-radius:5px
      }

      .aa-compose{padding:10px;border-top:1px solid var(--aa-line);background:#0b0f14}
      .aa-transcript{font-size:10px;color:#ffb27c;min-height:14px;padding:0 2px 6px}
      .aa-inputrow{display:grid;grid-template-columns:44px 1fr 44px;gap:7px;align-items:end}

      #ayonAiMic,#ayonAiSend{
        width:44px;height:44px;border-radius:14px;border:1px solid var(--aa-line);cursor:pointer;font-size:18px
      }

      #ayonAiMic{background:#171d25;color:#fff}
      #ayonAiMic.listening{background:#b91c1c;box-shadow:0 0 0 7px rgba(185,28,28,.16)}
      #ayonAiSend{background:#ff7414;color:#090b0d;font-weight:900}

      #ayonAiInput{
        min-height:44px;max-height:100px;resize:none;border-radius:14px;border:1px solid var(--aa-line);
        background:#141a21;color:#fff;outline:none;padding:11px 12px;font:inherit;font-size:13px
      }

      #ayonAiInput:focus{border-color:rgba(255,116,20,.7);box-shadow:0 0 0 3px rgba(255,116,20,.10)}

      .aa-foot{
        display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 2px 0;color:#737f8d;font-size:9px
      }

      #ayonAiVoiceToggle{border:0;background:transparent;color:#aab5c1;font-size:10px;cursor:pointer;padding:3px}

      @media(max-width:640px){
        #ayonAiFab{right:14px;bottom:88px;width:62px;height:62px}
        #ayonAiPanel{
          left:0;right:0;bottom:0;width:100%;height:calc(100dvh - 12px);max-height:none;border-radius:26px 26px 0 0;
          transform:translateY(30px)
        }
        #ayonAiPanel.open{transform:translateY(0)}
      }
    `;

    document.head.appendChild(style);
  }

  function injectUI() {
    if ($('#ayonAiFab')) return;

    const panel = document.createElement('section');
    panel.id = 'ayonAiPanel';
    panel.innerHTML = `
      <div class="aa-head">
        <div class="aa-headrow">
          <div class="aa-avatar-wrap">
            <img class="aa-avatar" src="${AVATAR_SRC}" alt="AYON AI">
          </div>
          <div class="aa-title">
            <h3>AYON AI</h3>
            <p><span class="aa-online">● Ready</span> • Your Sales Assistant</p>
          </div>
          <button id="ayonAiClear" class="aa-icon" title="Clear">↺</button>
          <button id="ayonAiClose" class="aa-icon" title="Close">×</button>
        </div>
      </div>

      <div class="aa-quick">
        <button class="aa-chip" data-aiq="আজ কোথায় focus করব?">আজকের Focus</button>
        <button class="aa-chip" data-aiq="Target achieve করতে daily কত sales দরকার?">Target Plan</button>
        <button class="aa-chip" data-aiq="Zero-sales outlet কোনগুলো?">Zero Sales</button>
        <button class="aa-chip" data-aiq="কোন SKU push করব?">SKU Opportunity</button>
        <button class="aa-chip" data-aiq="Buyer order দিচ্ছে না, কী বলব?">Buyer Advice</button>
        <button class="aa-chip" data-aiq="Meeting-এর 5টা point দাও">Meeting Points</button>
      </div>

      <div id="ayonAiMessages"></div>

      <div class="aa-compose">
        <div id="ayonAiTranscript" class="aa-transcript"></div>
        <div class="aa-inputrow">
          <button id="ayonAiMic" type="button" title="Speak">🎙</button>
          <textarea id="ayonAiInput" rows="1" placeholder="Sales নিয়ে প্রশ্ন করুন…"></textarea>
          <button id="ayonAiSend" type="button" title="Send">➤</button>
        </div>
        <div class="aa-foot">
          <span>${BUILD} • No paid API</span>
          <button id="ayonAiVoiceToggle" type="button">🔊 Voice ON</button>
        </div>
      </div>
    `;

    const fab = document.createElement('button');
    fab.id = 'ayonAiFab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Open AYON AI');
    fab.innerHTML = `
      <img src="${AVATAR_SRC}" alt="AYON AI"
        onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
      <span class="fallback">AYON</span>
    `;

    document.body.appendChild(panel);
    document.body.appendChild(fab);

    fab.onclick = () => toggle(true);
    $('#ayonAiClose').onclick = () => toggle(false);
    $('#ayonAiClear').onclick = clearChat;
    $('#ayonAiSend').onclick = sendInput;
    $('#ayonAiMic').onclick = toggleListening;

    $('#ayonAiVoiceToggle').onclick = () => {
      autoVoice = !autoVoice;
      if (!autoVoice && 'speechSynthesis' in window) speechSynthesis.cancel();
      panel.classList.remove('speaking');
      $('#ayonAiVoiceToggle').textContent = autoVoice ? '🔊 Voice ON' : '🔇 Voice OFF';
    };

    $('#ayonAiInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendInput();
      }
    });

    $('#ayonAiInput').addEventListener('input', (e) => {
      e.target.style.height = '44px';
      e.target.style.height = Math.min(100, e.target.scrollHeight) + 'px';
    });

    $$('[data-aiq]').forEach(b => {
      b.onclick = () => ask(b.dataset.aiq, false);
    });

    restoreChat();

    if (!chatHistory.length) {
      addMessage('ai', `হ্যালো ${getViewedName()}। আমি AYON AI — আপনার Sales Assistant। Live target, outlet, SKU, incentive, task, buyer handling ও meeting নিয়ে প্রশ্ন করুন।`);
    }
  }

  function toggle(value) {
    opened = typeof value === 'boolean' ? value : !opened;
    $('#ayonAiPanel')?.classList.toggle('open', opened);

    if (opened) {
      setTimeout(() => $('#ayonAiInput')?.focus(), 180);
      scrollMessages();
    } else if (listening) {
      stopListening();
    }
  }

  function addMessage(role, text, save = true) {
    const box = $('#ayonAiMessages');
    if (!box) return;

    const row = document.createElement('div');
    row.className = `aa-msg ${role}`;

    if (role === 'ai') {
      const img = document.createElement('img');
      img.className = 'aa-mini';
      img.src = AVATAR_SRC;
      img.alt = 'AYON';
      img.onerror = () => img.style.display = 'none';
      row.appendChild(img);
    }

    const bubble = document.createElement('div');
    bubble.className = 'aa-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    box.appendChild(row);

    if (save) {
      chatHistory.push({ role, text, at: Date.now() });
      if (chatHistory.length > MAX_HISTORY) chatHistory = chatHistory.slice(-MAX_HISTORY);
      saveChat();
    }

    scrollMessages();
  }

  function scrollMessages() {
    const box = $('#ayonAiMessages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function saveChat() {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory)); }
    catch {}
  }

  function restoreChat() {
    try {
      const x = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
      if (!Array.isArray(x)) return;
      chatHistory = x.slice(-MAX_HISTORY);
      chatHistory.forEach(m => addMessage(m.role, m.text, false));
    } catch {}
  }

  function clearChat() {
    if ('speechSynthesis' in window) {
      try { speechSynthesis.cancel(); } catch {}
    }
    chatHistory = [];
    saveChat();
    const box = $('#ayonAiMessages');
    if (box) box.innerHTML = '';
    addMessage('ai', `নতুন chat শুরু হলো। ${getViewedName()}, sales নিয়ে বলুন—আমি ready।`);
  }

  function sendInput() {
    const input = $('#ayonAiInput');
    const text = String(input?.value || '').trim();
    if (!text) return;
    input.value = '';
    input.style.height = '44px';
    ask(text, false);
  }

  function showTyping() {
    const box = $('#ayonAiMessages');
    if (!box) return null;

    const row = document.createElement('div');
    row.className = 'aa-msg ai';
    row.innerHTML = `
      <img class="aa-mini" src="${AVATAR_SRC}" alt="AYON" onerror="this.style.display='none'">
      <div class="aa-bubble">Thinking…</div>
    `;
    box.appendChild(row);
    scrollMessages();
    return row;
  }

  function ask(text, fromVoice = false) {
    toggle(true);
    addMessage('user', text);
    const typing = showTyping();

    setTimeout(async () => {
      const reply = await answerQuestion(text);
      typing?.remove();
      addMessage('ai', reply);
      if (autoVoice && (fromVoice || opened)) speak(reply, text);
    }, 180);
  }

  function preferredVoice(lang) {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const wants = lang.startsWith('bn')
      ? ['bn-BD', 'bn-IN', 'bn']
      : ['en-MY', 'en-GB', 'en-US', 'en'];

    for (const key of wants) {
      const found = voices.find(v => String(v.lang || '').toLowerCase().startsWith(key.toLowerCase()));
      if (found) return found;
    }

    return voices[0] || null;
  }

  function speak(text, question = '') {
    if (!autoVoice || !('speechSynthesis' in window)) return;

    try {
      speechSynthesis.cancel();

      const clean = String(text)
        .replace(/[•→✓🔴🟠🟢🏆🎯✅🏪]/g, ' ')
        .replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!clean) return;

      const lang = /[\u0980-\u09FF]/.test(`${question} ${text}`) ? 'bn-BD' : 'en-MY';
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang;
      u.rate = lang.startsWith('bn') ? 0.95 : 1;
      u.pitch = 1;

      const voice = preferredVoice(lang);
      if (voice) u.voice = voice;

      u.onstart = () => $('#ayonAiPanel')?.classList.add('speaking');
      u.onend = () => $('#ayonAiPanel')?.classList.remove('speaking');
      u.onerror = () => $('#ayonAiPanel')?.classList.remove('speaking');

      speechSynthesis.speak(u);
    } catch {
      $('#ayonAiPanel')?.classList.remove('speaking');
    }
  }

  function recognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function buildRecognition() {
    if (!recognitionSupported()) return null;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();

    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = 'bn-BD';

    r.onstart = () => {
      listening = true;
      $('#ayonAiMic')?.classList.add('listening');
      if ($('#ayonAiTranscript')) $('#ayonAiTranscript').textContent = 'শুনছি…';
    };

    r.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }

      if ($('#ayonAiTranscript')) {
        $('#ayonAiTranscript').textContent = finalText || interim || 'শুনছি…';
      }

      if (finalText.trim()) {
        const text = finalText.trim();
        stopListening(false);
        if ($('#ayonAiTranscript')) $('#ayonAiTranscript').textContent = '';
        ask(text, true);
      }
    };

    r.onerror = (event) => {
      listening = false;
      $('#ayonAiMic')?.classList.remove('listening');

      const msg =
        event?.error === 'not-allowed'
          ? 'Microphone permission দিন।'
          : event?.error === 'no-speech'
            ? 'কথা শুনতে পাইনি—আবার mic চাপুন।'
            : 'Voice input unavailable. Text chat ব্যবহার করুন।';

      if ($('#ayonAiTranscript')) $('#ayonAiTranscript').textContent = msg;
    };

    r.onend = () => {
      listening = false;
      $('#ayonAiMic')?.classList.remove('listening');
    };

    return r;
  }

  function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }

    if (!recognitionSupported()) {
      if ($('#ayonAiTranscript')) {
        $('#ayonAiTranscript').textContent = 'Voice recognition-এর জন্য Android Chrome ব্যবহার করুন।';
      }
      return;
    }

    try {
      recognition = buildRecognition();
      recognition.start();
    } catch {
      if ($('#ayonAiTranscript')) {
        $('#ayonAiTranscript').textContent = 'Mic start হয়নি—আবার চেষ্টা করুন।';
      }
    }
  }

  function stopListening(clear = true) {
    listening = false;
    $('#ayonAiMic')?.classList.remove('listening');

    try { recognition?.stop(); } catch {}
    recognition = null;

    if (clear && $('#ayonAiTranscript')) $('#ayonAiTranscript').textContent = '';
  }

  function init() {
    injectStyle();
    injectUI();

    const avatar = new Image();
    avatar.src = AVATAR_SRC;

    if ('speechSynthesis' in window) {
      try { speechSynthesis.getVoices(); } catch {}
      speechSynthesis.onvoiceschanged = () => {
        try { speechSynthesis.getVoices(); } catch {}
      };
    }

    window.AYON_AI = {
      open: () => toggle(true),
      close: () => toggle(false),
      ask: (q) => ask(String(q || ''), false),
      version: BUILD
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
