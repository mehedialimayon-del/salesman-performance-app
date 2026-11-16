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
    const assignmentFiles = window.FFH_TASK_ASSIGNMENT_FILES;
    const attachmentLine = assignmentFiles?.attachmentLine || /(?:^|\r?\n)Assignment attachment:[ \t]*(https:\/\/[^\s]+)[ \t]*$/;
    if (context.managing) assignmentFiles?.bind(root.querySelector('#taskForm'), viewerId, window.FFH_SUPABASE);
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

    const heading = (title,x,y,w,h) => slot('b','class="ffTaskArtSlot ffTaskArtHeading"',title,x,y,w,h);
    const frame = (x,y,w,h) => slot('div','class="ffTaskArtSlot ffTaskArtFrame" aria-hidden="true"','',x,y,w,h);
    panel.innerHTML = [
      frame(14,83,906,186),
      frame(14,500,906,185),
      frame(14,694,906,383),
      frame(14,1082,906,520),
      heading('Tasks &amp; <span>Actions</span>',22,18,880,54),
      heading('Date Range',26,95,390,28),heading('Zone',504,95,390,28),
      heading('Assigned To',26,179,390,28),heading('Task Status',504,179,390,28),
      heading('Task <span>Categories</span>',25,513,500,44),
      heading('Task <span>List</span>',25,705,194,40),
      slot('div','class="ffTaskArtSlot ffTaskArtTableHead"', ['#','Task Title','Outlet / Location','Assigned To','Due Date','Status'].map(v=>'<span>'+v+'</span>').join(''),24,763,886,36),
      heading('Task <span>Details</span>',26,1094,520,42),
      value('ffTaskArtDate','Date Range',25,127,409,44),
      value('ffTaskArtZone','Zone',504,127,398,44),
      value('ffTaskArtAssignee','Assigned To',25,211,409,44),
      slot('select','id="ffRefTasksStatus" data-ff-picker="native" class="ffTaskArtSlot" aria-label="Task Status"',[
        '<option value="">All Status</option><option value="done">Completed</option>',
        '<option value="progress">In Progress</option><option value="overdue">Overdue</option>'
      ].join(''),504,211,398,44),
      ...[130,357,580,803].map((x,i)=>slot('strong',
        `class="ffTaskArtSlot ffTaskArtMetric" aria-label="${['Total Tasks','Completed','In Progress','Overdue'][i]}"`,'',x-101,296,202,110)),
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
            if (!form.querySelector('[data-ff-task-proof-shortcut]')) {
              const section = document.createElement('section');
              section.className = 'ffTaskProofShortcut';
              section.setAttribute('data-ff-task-proof-shortcut','');
              section.innerHTML = '<b>Required completion proof</b><p>Select what the SR must submit when completing this task.</p><div class="ffTaskProofOptions"></div><small>Photo proof is uploaded by the assigned SR after the task is created. This setting does not upload an assignment attachment.</small>';
              const options = section.querySelector('.ffTaskProofOptions');
              for (const [value,label] of [['none','None'],['photo','Photo'],['location','GPS'],['both','Photo + GPS']]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.proof = value;
                button.textContent = label;
                button.onclick = () => { proof.value = value; proof.dispatchEvent(new Event('change',{bubbles:true})); sync(); };
                options.append(button);
              }
              const sync = () => options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.proof === proof.value)));
              proof.addEventListener('change',sync);
              const title = form.querySelector('input[name="title"]')?.closest('label');
              (title || form.firstElementChild)?.insertAdjacentElement('afterend',section);
              sync();
            }
          }
          const reminder = form.elements.remindAt;
          if (reminder) reminder.title = 'Optional reminder for the assigned task';
        }
      }
    }
    drawer.querySelector('[data-private-task-notes]').onclick = () => openEditor('.ffPrivateNoteDrawer',form=>form.elements.text.focus());
    function openHistory() {
      const dialog = document.createElement('dialog');
      dialog.className = 'ffTaskArtDialog ffInsetDialog';
      dialog.setAttribute('aria-label','Task History');
      dialog.innerHTML = '<header><b>Task History</b><button type="button" aria-label="Close">×</button></header>'
        + '<div class="ffTaskTimeline"></div><button type="button" class="secondary" data-private-notes>My private notepad</button>';
      const list = dialog.querySelector('.ffTaskTimeline');
      list.innerHTML = shown.map(task=>'<button type="button" class="secondary" data-history-task="'+esc(task.id)+'">'
        +esc(task.title)+' · '+esc(status(task))+'</button>').join('') || '<p>No tasks match this selection.</p>';
      dialog.querySelector('header button').onclick = () => dialog.close();
      dialog.querySelector('[data-private-notes]').onclick = () => {
        dialog.close();
        drawer.querySelector('[data-private-task-notes]').click();
      };
      list.onclick = event => {
        const button = event.target.closest('[data-history-task]');
        const task = button && shown.find(item=>String(item.id)===button.dataset.historyTask);
        if (!task) return;
        dialog.close();
        openTaskConversation(task,false);
      };
      dialog.addEventListener('close',()=>dialog.remove(),{once:true});
      root.append(dialog);
      dialog.showModal();
    }
    function openTaskConversation(task, compose) {
      const dialog = document.createElement('dialog');
      dialog.className = 'ffTaskArtDialog ffInsetDialog';
      dialog.setAttribute('aria-label', compose ? 'Task Comments' : 'Task History');
      dialog.innerHTML = '<header><b></b><button type="button" aria-label="Close">×</button></header>'
        + '<div class="ffTaskTimeline" aria-live="polite"></div>'
        + (compose ? '<form><label>Comment<textarea name="comment" maxlength="2000" required></textarea></label><button type="submit">Save comment</button></form>' : '')
        + '<p role="status"></p>';
      dialog.querySelector('header b').textContent = task.title;
      dialog.querySelector('header button').onclick = () => dialog.close();
      dialog.addEventListener('close',()=>dialog.remove(),{once:true});
      root.append(dialog);
      dialog.showModal();
      const cloud = window.FFH_SUPABASE;
      const feedback = dialog.querySelector('[role="status"]');
      const list = dialog.querySelector('.ffTaskTimeline');
      const format = value => value ? new Date(value).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}) : '';
      const render = async () => {
        feedback.textContent = 'Loading…';
        try {
          const comments = cloud.from('ffh_task_comments').select('author_staff_id,body,created_at')
            .eq('task_id',task.id).order('created_at',{ascending:false}).limit(100);
          const [messages, history] = await Promise.all([comments, compose ? {data:[]} : cloud.rpc('ffh_task_status_history',{task:task.id})]);
          if (messages.error || history.error) throw messages.error || history.error;
          const entries = [
            ...(messages.data || []).map(comment=>({at:comment.created_at,by:compactName(comment.author_staff_id),text:comment.body})),
            ...(history.data || []).map(event=>({at:event.occurred_at,by:event.actor_name || 'FieldForce Hub',text:[event.action,event.status].filter(Boolean).join(' · ')}))
          ].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
          list.innerHTML = entries.map(entry=>'<article><b>'+esc(entry.by)+'</b><small>'+esc(format(entry.at))+'</small><p>'+esc(entry.text)+'</p></article>').join('')
            || '<p>'+(compose ? 'No comments yet.' : 'No recorded changes yet. Current status: '+esc(status(task)))+'</p>';
          feedback.textContent = '';
        } catch (error) { feedback.textContent = 'Could not load task history: '+error.message; }
      };
      const form = dialog.querySelector('form');
      if (form) form.onsubmit = async event => {
        event.preventDefault();
        const input = form.elements.comment, button = form.querySelector('button');
        const body = input.value.trim();
        if (!body || button.disabled) return;
        button.disabled = true;
        try {
          const {error} = await cloud.from('ffh_task_comments').insert({task_id:task.id,body});
          if (error) throw error;
          input.value = '';
          await render();
        } catch (error) { feedback.textContent = 'Could not save comment: '+error.message; }
        finally { button.disabled = false; }
      };
      render();
    }
    function taskPhoto(task) {
      try {
        const url = new URL(task?.proofPhotoUrl);
        return url.protocol === 'https:' ? url.href : '';
      } catch { return ''; }
    }
    function openTaskEdit(task) {
      const dialog = document.createElement('dialog');
      dialog.className = 'ffTaskArtDialog ffInsetDialog';
      dialog.setAttribute('aria-label','Edit or reassign task');
      const description = String(task.description || '');
      const attachment = description.match(attachmentLine)?.[0] || '';
      dialog.innerHTML = '<header><b>Edit or reassign task</b><button type="button" aria-label="Close">×</button></header>'
        + '<form><label>Task title<input name="title" required></label><label>Assigned to<select name="assignee" required></select></label>'
        + '<label>Outlet<input name="outlet"></label><label>Due date<input name="due" type="date"></label>'
        + '<label>Priority<select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label>'
        + '<label>Instructions<textarea name="description"></textarea></label>'
        + '<p>Reassigning opens the task for the new assignee to submit their own proof.</p>'
        + '<button type="submit">Save task</button><p role="status"></p></form>';
      const close = () => dialog.close();
      dialog.querySelector('header button').onclick = close;
      dialog.addEventListener('close',()=>dialog.remove(),{once:true});
      root.append(dialog);
      dialog.showModal();
      const cloud = window.FFH_SUPABASE;
      const form = dialog.querySelector('form'), fields = form.elements;
      const submit = form.querySelector('button[type="submit"]'), feedback = form.querySelector('[role="status"]');
      fields.title.value = task.title;
      fields.outlet.value = task.outletName || '';
      fields.due.value = task.due || '';
      fields.priority.value = task.priority || 'Normal';
      fields.description.value = description.replace(attachmentLine,'').trimEnd();
      fields.assignee.add(new Option(staffName(task.to),task.to,true,true));
      feedback.textContent = 'Loading assignable staff…';
      cloud.rpc('ffh_task_recipients').then(({data,error})=>{
        if(error){feedback.textContent = 'Staff list unavailable: '+error.message;return;}
        for(const person of data || []) {
          if(person.staff_id!==task.to) fields.assignee.add(new Option(person.name+' · '+person.staff_id+' · '+person.zone_id,person.staff_id));
        }
        feedback.textContent = '';
      }).catch(error=>{feedback.textContent = 'Staff list unavailable: '+error.message;});
      form.onsubmit = async event => {
        event.preventDefault();
        if (submit.disabled || !fields.title.value.trim()) return;
        submit.disabled = true;
        const assignee = fields.assignee.value;
        const patch = {
          title:fields.title.value.trim(),assigned_to:assignee,outlet_name:fields.outlet.value.trim() || null,
          due_date:fields.due.value || null,priority:fields.priority.value,description:[fields.description.value.trim(),attachment.trim()].filter(Boolean).join('\n'),
          updated_at:new Date().toISOString()
        };
        if (assignee!==task.to) Object.assign(patch,{status:'Open',done_at:null,proof_photo_url:null,proof_location:null,reviewed_by:null,reviewed_at:null});
        try {
          let request = cloud.from('ffh_tasks').update(patch).eq('id',task.id).eq('assigned_to',task.to).eq('status',task.status);
          if (task.updatedAt) request = request.eq('updated_at',task.updatedAt);
          const {data,error} = await request.select('id');
          if (error) throw error;
          if (!data?.length) throw new Error('Task changed or your account cannot edit it. Refresh and try again.');
          close();
          await context.refreshTasks();
        } catch (error) { feedback.textContent = 'Could not save task: '+error.message; }
        finally { submit.disabled = false; }
      };
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
      if (context.canEditTask && task.to!=='ALL') {
        const edit = document.createElement('button');
        edit.type = 'button';edit.className = 'secondary';edit.textContent = 'Edit / Reassign';
        edit.onclick = () => {dialog.close();openTaskEdit(task);};
        dialog.append(edit);
      }
      root.append(dialog);
      dialog.showModal();
    }

    function showDetails(task) {
      state.selected = task?.id ?? null;
      for (const row of rows.querySelectorAll('[data-task-id]')) row.setAttribute('aria-selected',String(row.dataset.taskId === String(state.selected)));
      const photo = taskPhoto(task);
      const description = String(task?.description || '');
      const assignmentUrl = description.match(attachmentLine)?.[1];
      const instructions = assignmentUrl ? description.replace(attachmentLine, '').trimEnd() : description;
      const privateAttachment = assignmentFiles?.privatePath.test(assignmentUrl || '');
      const attachmentMarkup = privateAttachment
        ? '<p><button type="button" class="secondary" data-assignment-download>Download assignment attachment</button><span role="status" data-assignment-feedback></span></p>'
        : (assignmentUrl?.startsWith('https://') ? '<p><a href="' + esc(assignmentUrl) + '" target="_blank" rel="noopener noreferrer">View assignment attachment ↗</a></p>' : '');
      const photoMarkup = photo ? `<img src="${esc(photo)}" alt="Saved proof for ${esc(task.title)}">` : '<span>No saved photo</span>';
      detail.innerHTML = [
        slot(photo?'button':'div',`class="ffTaskArtSlot ffTaskArtPhoto" ${photo?'type="button" data-proof-view aria-label="View saved proof"':''}`,photoMarkup,29,1158,286,186),
        slot('b','class="ffTaskArtSlot ffTaskArtValue ffTaskArtTitle"',esc(task?.title || 'No task selected'),334,1151,344,37),
        slot('dl','class="ffTaskArtSlot ffTaskArtDetails"',[
          ['Outlet',task?.outletName],['Assigned To',task ? compactName(task.to) : ''],
          ['Due Date',task?.due],['Priority',task ? task.priority || 'Normal' : '']
        ].map(([label,v])=>`<div><dt>${label}</dt><dd title="${esc(v || '')}">${esc(v || '—')}</dd></div>`).join(''),339,1189,326,143),
        slot('span',`class="ffTaskArtSlot ffTaskArtBadge" data-status="${esc(task ? completed(task) ? 'Done' : status(task) : '')}"`,esc(task ? status(task) : '—'),720,1098,185,36),
        slot('div','class="ffTaskArtSlot ffTaskArtDescription"',esc(instructions)+attachmentMarkup,29,1368,662,129),
        tap('data-task-status','Update Status',697,1156,212,46),
        tap('data-task-proof','Add Photo / Proof',697,1205,212,45),
        tap('data-task-comment','Add Comment',697,1255,212,43),
        tap('data-task-open','View History',697,1303,212,45),
        tap('data-task-proof','Add Photo / Proof',704,1362,204,141)
      ].join('');
      for (const button of detail.querySelectorAll('button')) button.disabled = !task;
      if (!task) return;
      const attachmentButton = find('[data-assignment-download]');
      if (attachmentButton) attachmentButton.onclick = async () => {
        attachmentButton.disabled = true;
        const feedback = find('[data-assignment-feedback]');
        feedback.textContent = '';
        try { await assignmentFiles.download(assignmentUrl, window.FFH_SUPABASE); }
        catch (error) { feedback.textContent = 'Download failed: ' + error.message; }
        finally { attachmentButton.disabled = false; }
      };
      find('[data-task-status]').onclick = () => openStatus(task);
      find('[data-task-open]').onclick = () => openTaskConversation(task,false);
      find('[data-proof-view]')?.addEventListener('click',()=>window.FFH_OPEN_IMAGE?.(photo));
      find('[data-task-comment]').onclick = () => openTaskConversation(task,true);
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
      const eligible = people.filter(person=>person.active !== false);
      const zoneName = zone => zone === 'PRIMARY' ? 'KL Zone' : zone;
      const zones = [...new Set(eligible.map(person=>person.zone).filter(Boolean))].sort();
      const selectedZones = state.zones ?? (context.zone === 'ALL' ? [] : [context.zone]);
      const selectedStaff = state.staff ?? (context.selected === 'ALL' ? [] : [context.selected]);
      const zonePeople = eligible.filter(person=>!selectedZones.length||selectedZones.includes(person.zone));
      const set = (selector,title,choices,selection,label,onSelect) => {
        const button = find(selector);
        button.textContent = button.title = label;
        button.disabled = !context.managing;
        button.onclick = () => {
          window.FFH_PICK_ITEM({title,selected:selection,items:choices,onSelect,taskArtwork:true,multiple:true});
        };
      };
      set('#ffTaskArtZone','Select Zone',zones.map(value=>({value,label:value===viewer.zone?'My zone · '+zoneName(value):zoneName(value)})),selectedZones,
        !context.managing ? zoneName(viewer.zone) : selectedZones.length===1 ? zoneName(selectedZones[0]) : selectedZones.length ? selectedZones.length+' zones' : 'All permitted zones',
        selection=>{state.zones=selection;state.staff=[];state.scope='team';draw();});
      set('#ffTaskArtAssignee','Select SR or Manager',zonePeople.map(person=>({value:person.id,label:person.name,detail:person.role||''})),selectedStaff,
        !context.managing ? compactName(viewerId) : selectedStaff.length===1 ? compactName(selectedStaff[0]) : selectedStaff.length ? selectedStaff.length+' staff' : 'All permitted staff',
        selection=>{state.staff=selection;state.scope='team';draw();});
      const id=selectedStaff.length===1?selectedStaff[0]:!context.managing?viewerId:'';
      const identity=window.FFH_STAFF_PHOTOS?.find(id)||window.FFH_STAFF_PROFILE?.(id);
      const photo=identity?.photo_url||identity?.photo;
      if(id&&typeof photo==='string'&&/^https:\/\//i.test(photo)){
        const image=new Image();
        image.src=photo;
        image.alt='';
        image.addEventListener('error',()=>image.remove(),{once:true});
        find('#ffTaskArtAssignee').prepend(image);
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
      highlight('[data-task-scope]',button=>button.dataset.taskScope===state.scope);
      const zoneByAssignee = new Map(context.people.map(person=>[person.id,person.zone]));
      const mineIds = new Set([String(viewerId), String(context.viewer?.id || ''), String(context.viewer?.staffId || '')].filter(Boolean));
      const scoped = tasks.filter(task=>{
        const day = task.due || String(task.created || '').slice(0,10);
        let inScope = (context.teamTask?.(task) ?? true);
        if (state.scope === 'mine') inScope = mineIds.has(String(task.to));
        else if (context.managing && (state.zones || state.staff)) {
          const zones = state.zones ?? (context.zone === 'ALL' ? [] : [context.zone]);
          inScope = (!zones.length || zones.includes(zoneByAssignee.get(task.to)) || task.to==='ALL')
            && (!state.staff?.length || state.staff.includes(task.to) || task.to==='ALL');
        }
        return inScope &&
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
