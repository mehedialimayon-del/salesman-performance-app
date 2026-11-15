/* Bind the supplied Task artwork to the existing scoped task model and controls. */
window.FFH_REFERENCE_TASKS = (() => {
  const lastViews = new Map();
  const categoryPatterns = [
    /outlet visit|visit outlet|store visit|visit store/i,
    /cpo|promot|display|posm/i,
    /listing|\bsku\b|stock check|check listing/i,
    /recover|zero.sale|reorder/i,
    /issue|complaint|problem/i,
    /new outlet|new store/i
  ];
  const categories = ['Outlet Visit','CPO / Promotion','Listing / SKU','Sales Recovery','Issue / Problem','New Outlet','Others'];
  const completed = task => task.status === 'Done';
  const closed = task => ['Cancelled','Rejected'].includes(task.status);
  const category = task => {
    const index = categoryPatterns.findIndex(pattern => pattern.test(task.title + ' ' + (task.description || '')));
    return index === -1 ? categories.length - 1 : index;
  };

  return function(root, tasks, viewerId, today, staffName, esc, exportFile, context) {
    const history = root.querySelector('.ffTaskList');
    const drawer = document.createElement('details');
    drawer.className = 'ffRefPanel ffRefManage ffRefTaskHistory';
    drawer.innerHTML = '<summary>Task history and review</summary><button type="button" class="secondary" data-private-task-notes>My private notepad</button>';

    const panel = document.createElement('section');
    panel.className = 'ffTaskArtwork';
    panel.setAttribute('aria-label','Tasks & Actions');
    const overdue = task => !completed(task) && !closed(task) && !!task.due && task.due < today;
    const progress = task => !completed(task) && !closed(task) && !overdue(task);
    const rules = {done:completed, progress, overdue};
    const status = task => overdue(task) ? 'Overdue' : completed(task) ? 'Completed' :
      task.status === 'Open' || !task.status ? 'In Progress' : task.status;
    const state = lastViews.get(viewerId) || {scope:'team',kind:null,selected:null,from:'',to:'',status:'',query:''};
    if (state.scope !== 'mine' && state.scope !== 'team') state.scope = 'team';
    lastViews.set(viewerId,state);

    // Coordinates map directly to the supplied 934 × 1610 px Tasks body.
    const slot = (tag, attrs, body, x,y,w,h) =>
      `<${tag} ${attrs} style="left:${100*x/934}%;top:${100*y/1610}%;width:${100*w/934}%;height:${100*h/1610}%">${body}</${tag}>`;
    const search = (id, label, x,y,w) =>
      `<input id="${id}" class="ffTaskArtSlot" type="search" aria-label="${label}" placeholder="Search task, outlet or SR…" style="left:${100*x/934}%;top:${100*y/1610}%;width:${100*w/934}%;height:${100*34/1610}%">`;
    const tap = (attributes,label,x,y,w,h) =>
      slot('button',`type="button" class="ffTaskArtSlot ffTaskArtTap" aria-label="${esc(label)}" ${attributes}`,label,x,y,w,h);
    const value = (id,label,x,y,w,h) =>
      slot('button',`type="button" id="${id}" aria-label="${label}" class="ffTaskArtSlot ffTaskArtValue"`,'',x,y,w,h);

    panel.innerHTML = [
      value('ffTaskArtDate','Date Range',170,134,249,38),
      value('ffTaskArtZone','Zone',604,134,255,38),
      value('ffTaskArtAssignee','Assigned To',146,214,272,38),
      slot('select','id="ffRefTasksStatus" data-ff-picker="native" class="ffTaskArtSlot" aria-label="Task Status"',[
        '<option value="">All Status</option><option value="done">Completed</option>',
        '<option value="progress">In Progress</option><option value="overdue">Overdue</option>'
      ].join(''),605,214,261,40),
      ...[130,357,580,803].map((x,i)=>slot('strong',
        `class="ffTaskArtSlot ffTaskArtMetric" aria-label="${['Total Tasks','Completed','In Progress','Overdue'][i]}"`,'',x-55,360,110,47)),
      tap('data-task-assign','Assign New Task',16,425,374,64),
      tap('data-task-scope="mine"','My Tasks',403,426,244,59),
      tap('data-task-scope="team"','Team Tasks',661,426,257,59),
      search('ffTaskCategorySearch','Search task categories',578,514,250),
      tap('data-task-expand="categories"','Expand task categories and details',851,507,52,48),
      ...categories.map((name,i)=>tap(`data-task-category="${i}"`,name,[24,169,307,435,561,686,806][i],561,[137,129,120,118,119,113,104][i],112)),
      slot('span','id="ffRefTasksCount" class="ffTaskArtSlot ffTaskArtValue ffTaskArtCount" aria-live="polite"','',224,703,120,48),
      search('ffRefTasksSearch','Search task, outlet or SR',579,713,252),
      tap('data-task-expand="list"','Expand task list and details',851,706,52,48),
      slot('div','class="ffTaskArtSlot ffTaskArtRows" role="list" aria-label="Task List" tabindex="0"','',21,806,891,258),
      '<div id="ffRefTaskDetailsBody"></div>',
      tap('data-task-export="pdf"','Download (PDF)',25,1516,305,71),
      tap('data-task-export="xlsx"','Export (Excel)',342,1516,269,71),
      tap('data-task-history','Task History',623,1516,288,71),
      '<p class="ffTaskArtHint" role="status"></p>'
    ].join('');
    history.before(panel,drawer);
    drawer.append(history);
    const navigation = {bh:'Home',bs:'Sales',bo:'Dashboard',bt:'Tasks',bnotice:'Notice',bn:'Notification',br:'Live Chat'};
    for (const [id,label] of Object.entries(navigation)) root.parentElement.querySelector('#'+id)?.setAttribute('aria-label',label);
    root.parentElement.querySelector('#bt')?.setAttribute('aria-current','page');

    const find = selector => panel.querySelector(selector);
    const originals = new Map(Array.from(history.querySelectorAll('.taskRow'), row => [row.querySelector('.taskDone')?.dataset.id,row]));
    const rows = find('.ffTaskArtRows');
    const detail = find('#ffRefTaskDetailsBody');
    const query = find('#ffRefTasksSearch');
    const categoryQuery = find('#ffTaskCategorySearch');
    const taskStatus = find('#ffRefTasksStatus');
    const hint = find('[role="status"]');
    const compactName = id => window.FFH_STAFF_PROFILE?.(id)?.name || staffName(id).split(' (Manager:')[0];
    let shown = [];
    query.value = categoryQuery.value = state.query;
    taskStatus.value = state.status;

    function openEditor(selector, prepare) {
      const composer = root.querySelector(selector);
      if (!composer) { window.alert('This feature is not available for your current account.'); return; }
      if (!composer.open) composer.querySelector('summary').click();
      const form = document.querySelector('.ffTaskModalBody form') || composer.querySelector('form');
      if (form) {
        prepare(form);
        if (selector === '.ffTaskComposer') {
          const proof = form.elements.proofMode;
          if (proof) {
            proof.required = true;
            proof.closest('label')?.setAttribute('title','Choose whether the assigned SR must upload a photo, location, or both before completion.');
          }
          const reminder = form.elements.remindAt;
          if (reminder) reminder.title = 'Optional reminder for the assigned task';
        }
      }
    }
    drawer.querySelector('[data-private-task-notes]').onclick = () => openEditor('.ffPrivateNoteDrawer',form=>form.elements.text.focus());
    function openHistory(task) {
      drawer.open = true;
      const row = originals.get(String(task?.id));
      if (row?.hidden) history.querySelector('[data-history-clear]')?.click();
      (row || drawer).scrollIntoView({block:'nearest'});
    }
    function taskPhoto(task) {
      try {
        const url = new URL(task?.proofPhotoUrl);
        return url.protocol === 'https:' ? url.href : '';
      } catch { return ''; }
    }
    function openStatus(task) {
      const row = originals.get(String(task.id));
      if (!row) return;
      const dialog = document.createElement('dialog');
      dialog.className = 'ffInsetDialog ffTaskArtDialog';
      dialog.setAttribute('aria-label','Update Status');
      const previous = row.parentNode;
      const marker = document.createComment('task history row');
      previous.insertBefore(marker,row);
      dialog.innerHTML = '<header><b>Update Status</b><button type="button" aria-label="Close">×</button></header>';
      dialog.append(row);
      dialog.addEventListener('close',()=>{if(marker.isConnected)marker.replaceWith(row);dialog.remove();},{once:true});
      dialog.querySelector('button').onclick = () => dialog.close();
      root.append(dialog);
      dialog.showModal();
    }

    function showDetails(task) {
      state.selected = task?.id ?? null;
      for (const row of rows.querySelectorAll('[data-task-id]')) row.setAttribute('aria-selected',String(row.dataset.taskId === String(state.selected)));
      const photo = taskPhoto(task);
      const photoMarkup = photo ? `<img src="${esc(photo)}" alt="Saved proof for ${esc(task.title)}">` : '<span>No saved photo</span>';
      detail.innerHTML = [
        slot(photo?'button':'div',`class="ffTaskArtSlot ffTaskArtPhoto" ${photo?'type="button" data-proof-view aria-label="View saved proof"':''}`,photoMarkup,29,1158,286,186),
        slot('b','class="ffTaskArtSlot ffTaskArtValue ffTaskArtTitle"',esc(task?.title || 'No task selected'),334,1151,344,37),
        slot('dl','class="ffTaskArtSlot ffTaskArtDetails"',[
          ['Outlet',task?.outletName],['Assigned To',task ? compactName(task.to) : ''],
          ['Due Date',task?.due],['Priority',task ? task.priority || 'Normal' : '']
        ].map(([label,v])=>`<div><dt>${label}</dt><dd title="${esc(v || '')}">${esc(v || '—')}</dd></div>`).join(''),339,1189,326,143),
        slot('span','class="ffTaskArtSlot ffTaskArtBadge"',esc(task ? status(task) : '—'),720,1098,185,36),
        slot('div','class="ffTaskArtSlot ffTaskArtDescription"',esc(task?.description || ''),29,1368,662,129),
        tap('data-task-status','Update Status',697,1156,212,46),
        tap('data-task-proof','Add Photo / Proof',697,1205,212,45),
        tap('data-task-comment','Add Comment',697,1255,212,43),
        tap('data-task-open','View History',697,1303,212,45),
        tap('data-task-proof','Add Photo / Proof',704,1362,204,141)
      ].join('');
      for (const button of detail.querySelectorAll('button')) button.disabled = !task;
      if (!task) return;
      find('[data-task-status]').onclick = () => openStatus(task);
      find('[data-task-open]').onclick = () => openHistory(task);
      find('[data-proof-view]')?.addEventListener('click',()=>window.FFH_OPEN_IMAGE?.(photo));
      find('[data-task-comment]').onclick = () => openStatus(task);
      detail.querySelectorAll('[data-task-proof]').forEach(button=>{
        button.onclick = () => {
          if (originals.get(String(task.id))?.querySelector('.ffTaskPhoto')) {
            openStatus(task);
            root.querySelector('.ffTaskArtDialog .ffTaskPhoto')?.click();
          } else if (photo) window.FFH_OPEN_IMAGE?.(photo);
          else openStatus(task);
        };
      });
    }

    function showScope() {
      const {viewer, people} = context;
      const permitsAll = viewer.ownerAccess || viewer.accessAll || viewer.accessibleZones?.includes('*');
      const permitted = new Set([viewer.zone,...(viewer.accessibleZones || [])]);
      const eligible = people.filter(person => person.active !== false && (permitsAll || permitted.has(person.zone)));
      const zoneName = zone => zone === 'PRIMARY' ? 'KL Zone' : zone;
      const groups = [...new Set(eligible.map(person=>person.zone).filter(Boolean))].sort();
      const zone = context.managing ? context.zone : viewer.zone;
      const zoneButton = find('#ffTaskArtZone'), staffButton = find('#ffTaskArtAssignee');
      const zoneItems = [{value:'ALL',label:'All permitted zones'},...groups.map(value=>({value,label:zoneName(value)}))];
      const combined = zone === 'ALL' ? 'Combined · All Zones' : 'Combined · ' + zoneName(zone || viewer.zone || 'Zone');
      const zonePeople = eligible.filter(p=>zone==='ALL'||p.zone===zone).sort((a,b)=>a.name.localeCompare(b.name));
      const staffItems = [{value:'ALL',label:combined},...zonePeople.map(p=>({value:p.id,label:p.id===viewerId&&p.can_sell?p.name+' · My Route':p.name}))];
      const zoneLabel = zone === 'ALL' ? 'All permitted zones' : zoneName(zone || 'My zone');
      const staffLabel = context.managing ? staffItems.find(item=>item.value===context.selected)?.label || combined : compactName(viewerId);
      for (const [button,label,selected,items,title,onSelect] of [
        [zoneButton,zoneLabel,zone,zoneItems,'Select Zone',context.selectZone],
        [staffButton,staffLabel,context.selected,staffItems,'Select Staff / SR',context.selectPerson]
      ]) {
        button.textContent = label;
        button.title = label;
        button.disabled = !context.managing;
        button.onclick = () => {
          window.FFH_PICK_ITEM({title,selected,items,onSelect,taskArtwork:true});
        };
      }
    }
    const shortDate = value => value ? value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4) : '';
    function draw() {
      state.query = query.value;
      state.status = taskStatus.value;
      const term = state.query.trim().toLowerCase(), matchStatus = rules[state.status];
      const dateText = [shortDate(state.from),shortDate(state.to)].filter(Boolean).join(' – ');
      find('#ffTaskArtDate').textContent = dateText || 'All dates';
      showScope();
      const mineIds = new Set([String(viewerId), String(context.viewer?.id || ''), String(context.viewer?.staffId || '')].filter(Boolean));
      const scoped = tasks.filter(task=>{
        const day = task.due || String(task.created || '').slice(0,10);
        return (state.scope === 'team' || mineIds.has(String(task.to))) &&
          (!state.from || day >= state.from) && (!state.to || day <= state.to);
      });
      const counters = [scoped.length,scoped.filter(completed).length,scoped.filter(progress).length,scoped.filter(overdue).length];
      panel.querySelectorAll('.ffTaskArtMetric').forEach((el,i)=>{el.textContent=counters[i];});
      shown = scoped.filter(task=>(state.kind === null || category(task) === state.kind) && (!matchStatus || matchStatus(task)) &&
        [task.title,task.outletName,staffName(task.to),task.description].join(' ').toLowerCase().includes(term));
      const ids = new Set(shown.map(task=>String(task.id)));
      originals.forEach((row,id)=>row.classList.toggle('ffRefTaskFiltered',!ids.has(id)));
      find('#ffRefTasksCount').textContent = '('+shown.length+')';
      rows.innerHTML = shown.map((task,i)=>{
        const name = compactName(task.to);
        return `<div role="listitem" class="ffTaskArtRow" data-task-id="${esc(task.id)}">
          <span>${i+1}</span><button type="button" data-task-row="${esc(task.id)}" title="${esc(task.title)}">› ${esc(task.title)}</button>
          <span title="${esc(task.outletName || '')}">${esc(task.outletName || '—')}</span><span title="${esc(name)}">${esc(name)}</span>
          <span>${esc(task.due ? shortDate(task.due).slice(0,5) : '—')}</span>
          <span><span class="ffRefStatus" data-status="${esc(completed(task)?'Done':status(task))}">${esc(status(task))}</span></span>
        </div>`;
      }).join('') || '<p class="ffTaskArtEmpty">No tasks match this selection.</p>';
      showDetails(shown.find(task=>task.id===state.selected) || shown[0]);
    }

    find('#ffTaskArtDate').onclick = () => {
      const dialog = document.createElement('dialog');
      dialog.className = 'ffTaskArtDialog ffInsetDialog';
      dialog.setAttribute('aria-label','Date Range');
      dialog.innerHTML = `<form method="dialog"><header><b>Date Range</b><button type="submit" value="cancel" formnovalidate aria-label="Close">×</button></header>
        <label>From<input type="date" name="from" value="${esc(state.from)}"></label>
        <label>To<input type="date" name="to" value="${esc(state.to)}"></label>
        <button type="button" data-clear>Clear</button><button type="submit" value="apply">Apply</button></form>`;
      const form = dialog.querySelector('form');
      form.addEventListener('submit',event => {
        event.preventDefault();
        if (event.submitter?.value !== 'apply') {dialog.close();return;}
        const from = form.querySelector('[name=from]'),to = form.querySelector('[name=to]');
        if (from.value && to.value && from.value > to.value) {
          event.preventDefault();
          to.setCustomValidity('End date must be on or after the start date.');
          to.reportValidity();
          return;
        }
        state.from = from.value;state.to = to.value;dialog.close();draw();
      });
      form.oninput = () => form.elements.to.setCustomValidity('');
      form.querySelector('[data-clear]').onclick = () => {
        state.from = '';state.to = '';dialog.close();draw();
      };
      root.append(dialog);
      dialog.addEventListener('close',()=>dialog.remove(),{once:true});
      dialog.showModal();
    };
    for (const input of [query,categoryQuery]) input.addEventListener('input',() => {
      query.value = categoryQuery.value = input.value;
      draw();
    });
    panel.querySelectorAll('[data-task-expand]').forEach(trigger => {
      trigger.onclick = () => {
        const dialog = document.createElement('dialog');
        dialog.className = 'ffTaskArtDialog ffTaskArtFull ffInsetDialog';
        dialog.setAttribute('aria-label','Task List and Details');
        dialog.innerHTML = `<header><b>Task List and Details</b><button type="button" aria-label="Close">×</button></header>
          <label>Search task, outlet or SR<input type="search"></label><div class="ffTaskFullCategories"></div>
          <div class="ffTaskFullRows"></div><article></article>`;
        const input = dialog.querySelector('input'), list = dialog.querySelector('.ffTaskFullRows');
        const info = dialog.querySelector('article'), categoryBar = dialog.querySelector('.ffTaskFullCategories');
        const controls = [...panel.querySelectorAll('[data-task-category]')];
        input.value = query.value;
        function renderFull() {
          categoryBar.replaceChildren(...controls.map((control,i) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = categories[i];
            button.setAttribute('aria-pressed',String(i === state.kind));
            button.onclick = () => {control.click();renderFull();};
            return button;
          }));
          list.innerHTML = shown.map(task=>`<button type="button" data-full-task="${esc(task.id)}" aria-pressed="${task.id===state.selected}">
            <b>${esc(task.title)}</b><span>${esc([task.outletName,compactName(task.to),task.due,status(task)].filter(Boolean).join(' · '))}</span></button>`).join('') ||
            '<p>No tasks match this selection.</p>';
          for (const button of list.querySelectorAll('button')) button.onclick = () => {
            showDetails(shown.find(task=>String(task.id)===button.dataset.fullTask));
            renderFull();
          };
          const task = shown.find(task=>task.id===state.selected);
          info.innerHTML = task ? `<h2>${esc(task.title)}</h2><p>${esc(task.description || '')}</p>
            <dl><dt>Outlet</dt><dd>${esc(task.outletName || '—')}</dd><dt>Assignee</dt><dd>${esc(compactName(task.to))}</dd>
            <dt>Due</dt><dd>${esc(task.due || '—')}</dd><dt>Status</dt><dd>${esc(status(task))}</dd></dl>
            <div class="ffTaskFullActions"></div>` : '';
          const actions = info.querySelector('.ffTaskFullActions');
          if (actions) for (const action of ['status','proof','comment','open']) {
            const original = find('[data-task-'+action+']'), button = document.createElement('button');
            button.type = 'button';
            button.textContent = original.getAttribute('aria-label');
            button.onclick = () => {dialog.close();original.click();};
            actions.append(button);
          }
        }
        input.oninput = () => {query.value = categoryQuery.value = input.value;draw();renderFull();};
        dialog.querySelector('header button').onclick = () => dialog.close();
        dialog.addEventListener('close',()=>dialog.remove(),{once:true});
        root.append(dialog);
        renderFull();
        dialog.showModal();
        if (trigger.dataset.taskExpand === 'categories') categoryBar.querySelector('button')?.focus();
      };
    });
    taskStatus.addEventListener('change',draw);
    rows.onclick = event=>{
      const row = event.target.closest('[data-task-id]');
      if(row)showDetails(shown.find(task=>String(task.id)===row.dataset.taskId));
    };
    function highlight(selector,isCurrent) {
      panel.querySelectorAll(selector).forEach(button=>button.setAttribute('aria-pressed',String(isCurrent(button))));
    }
    highlight('[data-task-scope]',button=>button.dataset.taskScope===state.scope);
    highlight('[data-task-category]',button=>state.kind !== null && Number(button.dataset.taskCategory)===state.kind);
    panel.querySelectorAll('[data-task-scope]').forEach(button=>{
      button.onclick = () => {
        state.scope = button.dataset.taskScope;
        state.kind = null;
        highlight('[data-task-category]',()=>false);
        highlight('[data-task-scope]',b=>b===button);draw();
      };
    });
    panel.querySelectorAll('[data-task-category]').forEach(button=>{
      button.onclick = () => {
        const index = Number(button.dataset.taskCategory);
        state.kind = state.kind === index ? null : index;
        highlight('[data-task-category]',b=>state.kind !== null && Number(b.dataset.taskCategory)===state.kind);draw();
      };
    });
    find('[data-task-assign]').onclick = ()=>openEditor('.ffTaskComposer',form=>form.elements.title.focus());
    find('[data-task-history]').onclick = ()=>openHistory();
    panel.querySelectorAll('[data-task-export]').forEach(button=>{
      button.onclick = ()=>exportFile(button,'Task List',[
        ['Task Title','Outlet / Location','Assigned To','Due Date','Priority','Status'],
        ...shown.map(task=>[task.title,task.outletName || '',staffName(task.to),task.due || '',task.priority || 'Normal',status(task)])
      ],hint);
    });
    draw();
  };
})();
