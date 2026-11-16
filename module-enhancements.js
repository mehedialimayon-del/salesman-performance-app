(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const panels = [
    ['#ffIncomeBreakdown', 'Income breakdown'],
    ['#ffIncomeRewardSummary', 'Incentive summary'],
    ['#ffIncomeRate', 'Commission rates'],
    ['.ffRefAttendance', 'Attendance history'],
    ['#ffSyncQueue', 'Offline orders'],
    ['.ffRefTrackRoster', 'Team status']
  ];
  let queued = false;

  function expand(panel, label) {
    if (panel.querySelector(':scope > .ffPanelExpandBar')) return;
    const actions = document.createElement('div');
    actions.className = 'ffPanelExpandBar';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = '⛶';
    button.setAttribute('aria-label', 'Expand ' + label);
    button.setAttribute('aria-pressed', 'false');
    actions.append(button);
    panel.prepend(actions);
    const open = () => {
      panel.classList.add('ffPanelExpanded');
      button.setAttribute('aria-pressed', 'true');
      button.textContent = 'Close full screen';
      const reset = () => {
        panel.classList.remove('ffPanelExpanded');
        button.setAttribute('aria-pressed', 'false');
        button.textContent = '⛶';
        button.onclick = open;
      };
      button.onclick = window.FFH_OVERLAY?.(panel, reset) || reset;
    };
    button.onclick = open;
  }

  function inbox(panel) {
    if (panel.querySelector('.ffPriorityInboxFilters')) return;
    const heading = panel.firstElementChild;
    if (!heading) return;
    const tools = document.createElement('div');
    tools.className = 'ffPriorityInboxFilters';
    tools.innerHTML = '<div class="ffPriorityInboxTabs" aria-label="Notification status">' +
      '<button type="button" class="secondary" data-inbox-status="all">All</button>' +
      '<button type="button" class="secondary" data-inbox-status="unread">Unread</button>' +
      '<button type="button" class="secondary" data-inbox-status="read">Read</button>' +
      '</div><label class="ffRefSearch"><input type="search" aria-label="Search notifications" placeholder="Search alerts…"></label>' +
      '<p class="ffPriorityInboxEmpty" role="status" hidden>No notifications match.</p>';
    heading.after(tools);
    const tabs = [...tools.querySelectorAll('[data-inbox-status]')];
    const search = tools.querySelector('input');
    let chosen = 'all';
    function filter() {
      const rows = [...panel.querySelectorAll('.ffNoticeRow')];
      const unread = rows.filter(row => row.classList.contains('ffNoticeUnread')).length;
      const counts = [rows.length, unread, rows.length-unread];
      tabs.forEach((tab,i) => {
        tab.textContent = ['All','Unread','Read'][i] + ' ' + counts[i];
        tab.setAttribute('aria-pressed', String(tab.dataset.inboxStatus === chosen));
      });
      const term = search.value.trim().toLowerCase();
      let shown = 0;
      for (const row of rows) {
        const state = row.classList.contains('ffNoticeUnread') ? 'unread' : 'read';
        row.hidden = (chosen !== 'all' && chosen !== state) || !row.textContent.toLowerCase().includes(term);
        if (!row.hidden) shown++;
      }
      tools.querySelector('.ffPriorityInboxEmpty').hidden = !rows.length || !!shown;
    }
    tabs.forEach(tab => tab.onclick = () => {chosen = tab.dataset.inboxStatus;filter();});
    search.oninput = filter;
    filter();
    new MutationObserver(filter).observe(panel,{subtree:true,attributes:true,attributeFilter:['class']});
  }

  function arrangeProposals(page) {
    const table = page.querySelector('#ffProposalRows');
    if (!table) return;
    const records = new Map((page.ffProposalRecords || []).map(item => [String(item.id), item]));
    for (const button of table.querySelectorAll('[data-proposal-id]')) {
      if (button.classList.contains('ffProposalBanner')) continue;
      const record = records.get(button.dataset.proposalId);
      if (!record) continue;
      const label = button.textContent;
      button.classList.add('ffProposalBanner');
      button.setAttribute('aria-label', label + (record.file ? ' · PDF available' : ' · Awaiting PDF'));
      const cells = button.closest('tr').cells;
      cells[0].colSpan = 4;
      for (const cell of Array.from(cells).slice(1)) cell.hidden = true;
      if (record.image && /^(https:\/\/|proposal-assets\/)/i.test(record.image)) {
        const image = document.createElement('img');
        image.src = record.image;
        image.alt = label;
        image.loading = 'lazy';
        button.replaceChildren(image);
      }
      button.addEventListener('click', () => page.querySelector('#ffProposalDetail')?.scrollIntoView({block:'nearest',behavior:'smooth'}));
    }
    page.querySelector('table')?.classList.add('ffProposalBanners');
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      for (const [selector,label] of panels) {
        const panel = app.querySelector(selector);
        if (panel) expand(panel,label);
      }
      const notifications = app.querySelector('.ffNotificationPage .ffInboxScroller');
      if (notifications) inbox(notifications);
      const proposals = app.querySelector('.ffRefProposalPage');
      if (proposals) arrangeProposals(proposals);
    });
  }
  app.addEventListener('click', event => {
    if (!event.target.closest('#ffIncomeCommission')) return;
    const report = app.querySelector('#ffIncomeCommissionReport');
    if (!report || typeof window.ffhInsetPopup !== 'function') return;
    event.stopPropagation();
    const {el} = window.ffhInsetPopup('Commission Details', report.innerHTML);
    el.classList.add('ffCommissionReport');
  }, true);

  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
})();
