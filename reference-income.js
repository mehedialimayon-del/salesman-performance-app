/* Presentation for the Personal Income view. All amounts come from the existing income model. */
window.FFH_REFERENCE_INCOME = (() => {
  const headings = ['#', 'Particulars', 'Basis', 'Amount (RM)'];

  function breakdown(model) {
    const allowances = [
      ['▤', 'Fuel allowance', 'Approved monthly allowance', model.fuel],
      ['▤', 'Housing allowance', 'Approved monthly allowance', model.house],
      ['▤', 'Food allowance', 'Applicable food allowance', model.food],
      ['▤', 'Other fixed allowance', 'Monthly setup', model.fixed]
    ];
    return [
      ['▣', 'Basic Salary', 'Fixed (monthly)', model.basic],
      ...allowances.filter(row => Number(row[3])),
      ['%', 'Sales Commission', 'Delivered sales', model.comm],
      ['◆', 'Incentive (Campaign)', 'Earned rewards', model.bonus],
      ['◆', 'Incentive (Adjustment)', 'Approved adjustments', model.pos],
      ['⊖', 'Deduction / Penalty', 'Approved deductions', model.pen ? -model.pen : 0]
    ];
  }

  function commissionDetails(model, monthLabel, rule, esc, money) {
    const rate = model.t > 0 ? Math.round(100 * model.d / model.t) : null;
    const entries = model.manager
      ? [...(model.seller ? [['Own route commission', model.ownCommission]] : []),
        ['Team sales commission', model.salesCommission], ['Positive growth commission', model.growthCommission]]
      : [['Own route commission', model.ownCommission], ...(model.srGrowth ? [['Growth bonus · RM 100 per full RM 5,000', model.growthCommission]] : [])];
    return `<template id="ffIncomeCommissionReport">
      <p class="ffCommissionTotal"><strong>${esc(money(model.comm))}</strong> · ${esc(monthLabel)}</p>
      <section class="ffRefPanel ffCommissionSection">
        <h3>Sales vs Target</h3>
        ${rate !== null ? `<progress aria-label="Sales target achieved" max="100" value="${Math.min(100, Math.max(0, rate))}"></progress>` : ''}
        <dl><div><dt>Delivered sales</dt><dd>${esc(money(model.d))}</dd></div><div><dt>Target</dt><dd>${model.t > 0 ? esc(money(model.t) + ' · ' + rate + '% reached') : 'Not set'}</dd></div>
        ${model.previous != null ? `<div><dt>${model.average ? 'Saved zone average' : 'Previous month'}</dt><dd>${esc(money(model.previous))}</dd></div><div><dt>Positive growth</dt><dd>${esc(money(model.growth))}</dd></div>` : ''}</dl>
      </section>
      <section class="ffRefPanel ffCommissionSection"><h3>Calculation</h3>
        <dl>${entries.map(([label, amount]) => `<div><dt>${label}</dt><dd>${amount == null ? 'Awaiting sales history' : esc(money(amount))}</dd></div>`).join('')}</dl>
      </section>
      <section class="ffRefPanel ffCommissionSection"><h3>Commission Rates</h3>
        <dl>${(model.average ? [['Team sales', '0.25%'], ['Above saved average', '0.75% on excess']] : rule).map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
      </section>
    </template>`;
  }

  function render({model, performance = model, salesScopes = [], month, monthLabel, people, rule, earned, pending, campaignImages, canEdit, request, esc, money}) {
    const rows = breakdown(model);
    const percent = performance.t > 0 ? Math.round(100 * performance.d / performance.t) : null;
    const metric = (icon, label, value, color) => `<div class="ffRefMetric" data-color="${color}"><i aria-hidden="true">${icon}</i><span>${label}</span><strong>${money(value)}</strong></div>`;
    const button = (id, icon, label, color = 'gold') => `<button type="button" id="${id}" class="ffRefButton" data-color="${color}"><i aria-hidden="true">${icon}</i><span>${label}</span></button>`;
    const stat = (key, value) => `<div><dt>${key}</dt><dd>${value}</dd></div>`;
    const campaign = item => `<article class="ffRefPanel ffRefReward">${campaignImages.has(item.offerId) ? `<img src="${esc(campaignImages.get(item.offerId))}" alt="">` : ''}<div><b>${esc(item.title)}</b><dl>${stat('Target', esc(item.target + ' ' + item.unit))}${stat('Achievement', esc(item.qty + ' ' + item.unit))}${stat('Earned', esc(item.earnedDate || monthLabel))}${stat('Incentive', money(item.amount))}</dl></div></article>`;
    return `<section class="ffRefIncome" aria-label="Personal Income">
      ${commissionDetails(model, monthLabel, rule, esc, money)}
      <div class="ffRefPanel ffRefFields">
        <label><i aria-hidden="true">▦</i><span>Month &amp; Year<input id="ffIncomeMonth" type="month" required value="${esc(month)}"></span></label>
        <label><i aria-hidden="true">▱</i><span>SR / Staff<select id="ffReferenceIncomeStaff" data-ff-picker="native" data-ff-staff-label="compact">${people.map(p => `<option value="${esc(p.id)}" ${p.id === model.id ? 'selected' : ''}>${esc(p.name)} (${esc(p.id)})</option>`).join('')}</select></span></label>
      </div>
      <div class="ffRefFive">
        ${metric('▣', 'Total Income', model.total, 'green')}
        ${metric('▤', 'Salary & Allowances', model.basic + model.fuel + model.house + model.food + model.fixed, 'blue')}
        ${metric('%', 'Commission', model.comm, 'gold')}
        ${metric('◆', 'Incentive', model.pos + model.bonus, 'purple')}
        ${metric('⊖', 'Deduction', model.pen, 'red')}
      </div>
      <div class="ffRefFive ffRefActions">
        ${button('ffIncomeSummary', '▥', 'Income Summary')}
        ${button('ffIncomeCommission', '%', 'Commission Details')}
        ${button('ffIncomeIncentives', '◆', 'Incentive Details')}
        ${button('ffClaimsIncome', '▤', 'Claim / Bill Reimbursement')}
        ${button('ffIncomeHistory', '⟲', 'Payroll History')}
      </div>
      <section class="ffRefPanel" id="ffIncomeBreakdown">
        <h2><i aria-hidden="true">▥</i> <em>Income</em> Breakdown – ${esc(monthLabel)}</h2>
        <table>
          <thead><tr>${headings.map(x => `<th scope="col">${x}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(([icon, name, basis, amount], i) => `<tr><td>${i + 1}</td><th scope="row"><i aria-hidden="true">${icon}</i> ${name}</th><td>${basis}</td><td>${esc(money(amount).replace(/^RM\s*/, ''))}</td></tr>`).join('')}</tbody>
          <tfoot><tr><th scope="row" colspan="3">Total Income (This Month)</th><td>${money(model.total)}</td></tr></tfoot>
        </table>
        ${model.setupMissing || model.growthPending ? `<p class="ffRefHint">${model.setupMissing ? 'Monthly income setup is pending. ' : ''}${model.growthPending ? 'Growth commission awaits previous-month sales history.' : ''}</p>` : ''}
      </section>
      <div class="ffRefIncomeSplit">
        <section class="ffRefPanel">
          <h2><i aria-hidden="true">◎</i> <em>Sales</em> vs Target</h2>
          ${salesScopes.length>1?`<label class="ffRefIncomeScope"><span>Sales scope</span><select id="ffIncomeSalesScope" data-ff-picker="native">${salesScopes.map(scope=>`<option value="${esc(scope.id)}" ${scope.id===performance.id?'selected':''}>${esc(scope.label)}</option>`).join('')}</select></label>`:''}
          <div class="ffRefProgress">
            <div class="ffRefRing" style="--ffh-progress:${Math.min(100, Math.max(0, percent ?? 0))}%"><b>${percent === null ? '—' : percent + '%'}</b></div>
            <dl>${stat('Target', performance.t>0?money(performance.t):'Not set')}${stat('Achievement', money(performance.d))}${stat('Balance', performance.t>0?money(Math.max(0, performance.t - performance.d)):'—')}</dl>
          </div>
        </section>
        <section class="ffRefPanel" id="ffIncomeRate">
          <h2><i aria-hidden="true">%</i> <em>Commission</em> Rate</h2>
          <dl class="ffRefTiers" id="ffIncomeRates">${(model.average ? [['Team sales','0.25%'],['Above saved average','0.75%']] : rule).map(([key, value]) => stat(esc(key), esc(value))).join('')}</dl>
        </section>
      </div>
      <section class="ffRefPanel" id="ffIncomeRewardSummary">
        <h2><i aria-hidden="true">◆</i> <em>Incentive</em> Summary (${esc(monthLabel)})</h2>
        <div class="ffRefRewards">${earned.map(campaign).join('') || '<p class="ffRefHint">No earned campaign incentives for this month.</p>'}</div>
      </section>
      <div class="ffRefExports">
        ${button('ffIncomePdf', '▤', 'Download Payslip (PDF)', 'green')}
        ${button('ffIncomeXlsx', '▦', 'Export Details (Excel)', 'blue')}
        ${button('ffIncomeLedgerAction', '⟲', 'Income History')}
      </div>
      <details class="ffRefPanel ffRefManage">
        <summary>Income settings &amp; requests</summary>
        <div id="ffIncomeExtras">
          ${canEdit ? '<button type="button" id="ffIncomeSetup" class="secondary">Income settings</button>' : ''}
          <button type="button" id="ffClaimsTemplateIncome" class="secondary">Claim Bill PDF</button>
          <button type="button" data-income-expand="Penalty" class="secondary">Deduction history</button>
          ${pending.length ? '<h3>Incentives in progress</h3><ul>' + pending.map(x => `<li>${esc(x.title)} · ${esc(x.left.toFixed(2) + ' ' + x.unit)} remaining · +${money(x.reward)}${x.deadline ? ' · by ' + esc(x.deadline) : ''}</li>`).join('') + '</ul>' : ''}
          ${request}
        </div>
      </details>
      <p id="ffReferenceIncomeStatus" class="ffRefHint" role="status"></p>
    </section>`;
  }

  return {
    render,
    exportRows(model) {
      return [headings, ...breakdown(model).map(([, label, basis, amount], i) => [i + 1, label, basis, amount]), ['', 'Total Income', '', model.total]];
    }
  };
})();
