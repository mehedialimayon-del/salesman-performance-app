/* The task dashboard filters the existing task rows and opens their original assignment form. */
window.FFH_REFERENCE_TASKS = function(root, tasks, viewerId, today) {
  const list = root.querySelector('.ffTaskList');
  const panel = document.createElement('section');
  panel.className = 'ffRefTasks';
  const completed = x => x.status === 'Done';
  const overdue = x => !completed(x) && !['Cancelled','Rejected'].includes(x.status) && !!x.due && x.due < today;
  const progress = x => !completed(x) && !overdue(x) && !['Cancelled','Rejected'].includes(x.status);
  const metric = (icon,label,color,value) => `<div class="ffRefMetric" data-color="${color}"><i aria-hidden="true">${icon}</i><span>${label}</span><strong>${value}</strong></div>`;
  panel.innerHTML = `
    <div class="ffRefReportKpis">
      ${metric('▤','Total Tasks','blue',tasks.length)}
      ${metric('✓','Completed','green',tasks.filter(completed).length)}
      ${metric('⟳','In Progress','gold',tasks.filter(progress).length)}
      ${metric('!','Overdue','red',tasks.filter(overdue).length)}
    </div>
    <div class="ffRefExports">
      <button class="ffRefButton" type="button" data-task-assign>＋ Assign New Task</button>
      <button class="ffRefButton" type="button" data-task-scope="mine" aria-pressed="false">My Tasks</button>
      <button class="ffRefButton" type="button" data-task-scope="team" aria-pressed="true">Team Tasks</button>
    </div>
    <div class="ffRefPanel ffRefFields">
      <label><span>From<input id="ffRefTasksFrom" type="date"></span></label>
      <label><span>To<input id="ffRefTasksTo" type="date"></span></label>
      <label><span>Status<select id="ffRefTasksStatus"><option value="">All statuses</option><option value="done">Completed</option><option value="progress">In Progress</option><option value="overdue">Overdue</option></select></span></label>
      <label><span>Task list<input id="ffRefTasksSearch" type="search" placeholder="Search task, outlet or SR…"></span></label>
    </div>`;
  list.before(panel);
  const el = id => panel.querySelector('#ffRefTasks'+id);
  const entries = new Map(tasks.map(x => [String(x.id),x]));
  const rules = {done:completed,progress,overdue};
  let scope = 'team';
  function filter() {
    const from = el('From').value, to = el('To').value, status = rules[el('Status').value], query = el('Search').value.trim().toLowerCase();
    for (const row of list.querySelectorAll('.taskRow')) {
      const task = entries.get(row.querySelector('.taskDone')?.dataset.id);
      if (!task) continue;
      const date = task.due || task.created || '';
      const matches = (scope==='team' || [viewerId,'ALL'].includes(task.to)) &&
        (!from || date>=from) && (!to || date<=to) &&
        (!status || status(task)) && row.textContent.toLowerCase().includes(query);
      row.classList.toggle('ffRefTaskFiltered', !matches);
    }
  }
  panel.addEventListener('input',filter);
  panel.addEventListener('change',filter);
  panel.querySelectorAll('[data-task-scope]').forEach(button => button.onclick = () => {
    scope=button.dataset.taskScope;
    panel.querySelectorAll('[data-task-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    filter();
  });
  panel.querySelector('[data-task-assign]').onclick = () => {
    const composer = root.querySelector('.ffTaskComposer');
    if (!composer.open) composer.querySelector('summary').click();
    composer.scrollIntoView({block:'start',behavior:'smooth'});
    composer.querySelector('[name="title"]').focus({preventScroll:true});
  };
};
