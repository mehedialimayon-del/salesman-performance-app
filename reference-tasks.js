/* Keep the original task controls bound to their existing cloud handlers. */
window.FFH_REFERENCE_TASKS = (() => {
const lastViews = new Map();
return function(root, tasks, viewerId, today, staffName, esc, exportFile) {
  const history = root.querySelector('.ffTaskList');
  const panel = document.createElement('section');
  panel.className = 'ffRefTasks';
  const completed = task => task.status === 'Done';
  const stopped = task => ['Cancelled', 'Rejected'].includes(task.status);
  const overdue = task => !completed(task) && !stopped(task) && !!task.due && task.due < today;
  const progress = task => !completed(task) && !stopped(task) && !overdue(task);
  const filters = {done: completed, progress, overdue};
  const status = task => overdue(task) ? 'Overdue' : task.status === 'Open' || !task.status ? 'In Progress' : task.status;
  const categories = [
    ['▣', 'Outlet Visit', /outlet visit|visit outlet|store visit|visit store/i],
    ['⚑', 'CPO / Promotion', /cpo|promot|display|posm/i],
    ['▥', 'Listing / SKU', /listing|\bsku\b|stock check|check listing/i],
    ['↗', 'Sales Recovery', /recover|zero.sale|reorder/i],
    ['⚠', 'Issue / Complaint', /issue|complaint|problem/i],
    ['⊕', 'New Outlet', /new outlet|new store/i]
  ];
  const category = task => {
    const index = categories.findIndex(([, , match]) => match.test(task.title + ' ' + (task.description || '')));
    return index === -1 ? categories.length : index;
  };
  const metric = (icon, label, color) => `<div class="ffRefMetric" data-color="${color}"><i aria-hidden="true">${icon}</i><span>${label}</span><strong>0</strong></div>`;
  panel.innerHTML = `
    <div class="ffRefPanel ffRefFields ffRefTaskDates">
      <label><span>From<input id="ffRefTasksFrom" type="date"></span></label>
      <label><span>To<input id="ffRefTasksTo" type="date"></span></label>
      <label><span>Task Status<select id="ffRefTasksStatus"><option value="">All statuses</option><option value="done">Completed</option><option value="progress">In Progress</option><option value="overdue">Overdue</option></select></span></label>
    </div>
    <div class="ffRefReportKpis">
      ${metric('▤', 'Total Tasks', 'blue')}${metric('✓', 'Completed', 'green')}
      ${metric('◷', 'In Progress', 'gold')}${metric('!', 'Overdue', 'red')}
    </div>
    <div class="ffRefExports">
      <button class="ffRefButton" type="button" data-task-assign>＋ Assign New Task</button>
      <button class="ffRefButton" type="button" data-task-scope="mine" aria-pressed="false">My Tasks</button>
      <button class="ffRefButton" type="button" data-task-scope="team" aria-pressed="true">Team Tasks</button>
    </div>
    <section class="ffRefPanel">
      <h2>▣ Task Categories</h2>
      <div class="ffRefTaskCategories">
        ${[...categories, ['⋯', 'Others']].map(([icon, name], i) => `<button class="ffRefButton" type="button" data-task-category="${i}" aria-pressed="false"><i aria-hidden="true">${icon}</i><span>${name}</span></button>`).join('')}
      </div>
    </section>
    <section class="ffRefPanel ffRefOutlet">
      <header class="ffRefListHead"><h2 id="ffRefTasksCount">Task List</h2>
        <label class="ffRefSearch"><i aria-hidden="true">⌕</i><input id="ffRefTasksSearch" type="search" aria-label="Search task, outlet or SR" placeholder="Search task, outlet or SR"></label>
      </header>
      <div class="ffRefOutletViewport" tabindex="0" aria-label="Task list">
        <table><thead><tr><th>#</th><th>Task Title</th><th>Outlet / Location</th><th>Assigned To</th><th>Due Date</th><th>Status</th></tr></thead><tbody></tbody></table>
      </div>
    </section>
    <section class="ffRefPanel ffRefTaskDetails"><h2>▣ Task Details</h2><div id="ffRefTaskDetailsBody"></div></section>
    <div class="ffRefExports">
      <button class="ffRefButton" type="button" data-color="green" data-task-export="pdf">⇩ Download (PDF)</button>
      <button class="ffRefButton" type="button" data-color="blue" data-task-export="xlsx">⇩ Export (Excel)</button>
      <button class="ffRefButton" type="button" data-task-history>◷ Task History</button>
    </div>
    <p class="ffRefHint" role="status"></p>`;

  const drawer = document.createElement('details');
  drawer.className = 'ffRefPanel ffRefManage ffRefTaskHistory';
  drawer.innerHTML = '<summary>Task history and review</summary>';
  history.before(panel, drawer);
  drawer.append(history);

  const find = name => panel.querySelector('#ffRefTasks' + name);
  const originalRows = new Map(Array.from(history.querySelectorAll('.taskRow'), row => [row.querySelector('.taskDone')?.dataset.id, row]));
  const table = panel.querySelector('tbody');
  const detail = panel.querySelector('#ffRefTaskDetailsBody');
  const state = lastViews.get(viewerId) || {scope:'team', kind:null, selected:null, from:'', to:'', status:'', query:''};
  lastViews.set(viewerId,state);
  let {scope,kind,selected} = state, shown = [];
  for (const [field,key] of [['From','from'],['To','to'],['Status','status'],['Search','query']]) find(field).value = state[key];
  panel.querySelectorAll('[data-task-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.taskScope===scope)));
  panel.querySelectorAll('[data-task-category]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.taskCategory)===kind)));

  function showDetails(task) {
    selected = task?.id ?? null;
    state.selected = selected;
    for (const button of table.querySelectorAll('[data-task-row]')) button.setAttribute('aria-pressed', String(button.dataset.taskRow === String(selected)));
    detail.innerHTML = task ? `<h3>${esc(task.title)}</h3><dl>
      <div><dt>Outlet</dt><dd>${esc(task.outletName || '—')}</dd></div>
      <div><dt>Assigned to</dt><dd>${esc(staffName(task.to))}</dd></div>
      <div><dt>Due date</dt><dd>${esc(task.due || '—')}</dd></div>
      <div><dt>Priority</dt><dd>${esc(task.priority || 'Normal')}</dd></div>
      <div><dt>Status</dt><dd>${esc(status(task))}</dd></div></dl>
      ${task.description ? `<p>${esc(task.description)}</p>` : ''}
      <button class="secondary ffRefButton" type="button" data-task-open>Open Task / Proof</button>`
      : '<p>No tasks match this selection.</p>';
    const open = detail.querySelector('[data-task-open]');
    if (open) open.onclick = () => {
      const row = originalRows.get(String(selected));
      if (!row) return;
      drawer.open = true;
      const clear = history.querySelector('[data-history-clear]');
      if (row.hidden) clear?.click();
      row.scrollIntoView({block: 'nearest'});
      row.querySelector('.taskDone')?.focus({preventScroll: true});
    };
  }
  function draw() {
    const from = find('From').value, to = find('To').value, matchState = filters[find('Status').value];
    const query = find('Search').value.trim().toLowerCase();
    Object.assign(state,{from,to,scope,kind,status:find('Status').value,query:find('Search').value});
    const scoped = tasks.filter(task => {
      const date = task.due || String(task.created || '').slice(0, 10);
      return (scope === 'team' || [viewerId, 'ALL'].includes(task.to)) &&
        (!from || date >= from) && (!to || date <= to);
    });
    const totals = [scoped.length, scoped.filter(completed).length, scoped.filter(progress).length, scoped.filter(overdue).length];
    panel.querySelectorAll('.ffRefMetric strong').forEach((el, i) => { el.textContent = totals[i]; });
    shown = scoped.filter(task => (kind === null || category(task) === kind) && (!matchState || matchState(task)) &&
      [task.title, task.outletName, staffName(task.to), task.description].join(' ').toLowerCase().includes(query));
    const visible = new Set(shown.map(task => String(task.id)));
    for (const [id, row] of originalRows) row.classList.toggle('ffRefTaskFiltered', !visible.has(id));
    find('Count').textContent = 'Task List (' + shown.length + ')';
    table.innerHTML = shown.map((task, i) => `<tr><td>${i + 1}</td><td><button type="button" data-task-row="${esc(task.id)}">${esc(task.title)}</button></td><td>${esc(task.outletName || '—')}</td><td>${esc(staffName(task.to))}</td><td>${esc(task.due || '—')}</td><td><span class="ffRefStatus" data-status="${esc(status(task))}">${esc(status(task))}</span></td></tr>`).join('') ||
      '<tr><td colspan="6">No tasks match this selection.</td></tr>';
    showDetails(shown.find(task => task.id === selected) || shown[0]);
  }
  panel.addEventListener('input', event => { if (event.target === find('Search')) draw(); });
  panel.addEventListener('change', draw);
  table.onclick = event => {
    const button = event.target.closest('[data-task-row]');
    if (button) showDetails(shown.find(task => String(task.id) === button.dataset.taskRow));
  };
  panel.querySelectorAll('[data-task-scope]').forEach(button => {
    button.onclick = () => {
      scope = button.dataset.taskScope;
      panel.querySelectorAll('[data-task-scope]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      draw();
    };
  });
  panel.querySelectorAll('[data-task-category]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.taskCategory);
      kind = kind === index ? null : index;
      panel.querySelectorAll('[data-task-category]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.taskCategory) === kind)));
      draw();
    };
  });
  panel.querySelector('[data-task-assign]').onclick = () => {
    const composer = root.querySelector('.ffTaskComposer');
    if (!composer.open) composer.querySelector('summary').click();
    (document.querySelector('.ffTaskModalBody #taskForm [name=title]') || composer.querySelector('[name=title]'))?.focus();
  };
  panel.querySelector('[data-task-history]').onclick = () => {
    drawer.open = !drawer.open;
    if (drawer.open) drawer.scrollIntoView({block: 'start'});
  };
  panel.querySelectorAll('[data-task-export]').forEach(button => {
    button.onclick = () => exportFile(button, 'Task List', [
      ['Task Title', 'Outlet / Location', 'Assigned To', 'Due Date', 'Priority', 'Status'],
      ...shown.map(task => [task.title, task.outletName || '', staffName(task.to), task.due || '', task.priority || 'Normal', status(task)])
    ], panel.querySelector('[role="status"]'));
  });
  draw();
};
})();
