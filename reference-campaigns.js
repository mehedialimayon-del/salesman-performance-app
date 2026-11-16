/* Campaign activity list reuses the original campaign proof and approval cards. */
window.FFH_REFERENCE_CAMPAIGNS = function(root, campaigns, executions, ids, offerStatus, esc, go) {
  const header = root.querySelector('.ffCampaignControls');
  const body = root.querySelector('.ffCampaignBody');
  const campaignIds = new Set(campaigns.map(c=>String(c.id)));
  const records = executions.filter(x=>campaignIds.has(String(x.campaignId)) && ids.includes(x.sr));
  const metric = (icon,label,color,value) => `<div class="ffRefMetric" data-color="${color}"><i aria-hidden="true">${icon}</i><span>${label}</span><strong>${value}</strong></div>`;
  const toolbar = document.createElement('div');
  toolbar.className = 'ffRefCampaignTools';
  toolbar.innerHTML = `<div class="ffRefReportKpis">
    ${metric('⚑','Total Activities','green',campaigns.length)}
    ${metric('▣','Reported Outlets','blue',new Set(records.filter(r=>r.outletCode||r.outlet).map(r=>String(r.outletCode||r.outlet))).size)}
    ${metric('✓','Verified Proofs','gold',records.filter(r=>/^verified$/i.test(r.status)).length)}
    ${metric('◷','In Progress','red',campaigns.filter(c=>offerStatus(c)==='Active').length)}
  </div>
  <div class="ffRefRouteTabs">
    <button type="button" class="secondary" data-campaign-go="activities" aria-pressed="true">Activities</button>
    <button type="button" class="secondary" data-campaign-go="outletHistory">Outlets</button>
    <button type="button" class="secondary" data-campaign-go="catalogue">Products</button>
    <button type="button" class="secondary" data-campaign-go="approvals">Approval</button>
  </div>
  <div class="ffRefPanel ffRefFields">
   <label><span>Activity status<select id="ffRefCpoStatus"><option value="">All statuses</option><option value="Active">Running</option><option>Upcoming</option><option>Expired</option></select></span></label>
   <label><span>Activity<input id="ffRefCpoSearch" type="search" placeholder="Search activity or product…"></span></label><label><span>From<input type="date" id="ffRefCpoFrom"></span></label><label><span>To<input type="date" id="ffRefCpoTo"></span></label><p role="status" id="ffRefCpoFilterStatus"></p>
  </div>`;
  header.after(toolbar);
  const table = document.createElement('section');
  table.className = 'ffRefPanel ffRefOutlet';
  table.innerHTML = '<div class="ffRefZeroTitle"><h2>Promotion / CPO Activities</h2></div><div class="ffRefOutletViewport"><table><thead><tr><th>Activity Name</th><th>Period</th><th>Products</th><th>Status</th></tr></thead><tbody></tbody></table></div>';
  body.prepend(table);
  const status = toolbar.querySelector('#ffRefCpoStatus'), search = toolbar.querySelector('#ffRefCpoSearch');
  const cards = [...body.querySelectorAll('.ffReferenceCampaign')];
  const from=toolbar.querySelector('#ffRefCpoFrom'),to=toolbar.querySelector('#ffRefCpoTo'),feedback=toolbar.querySelector('#ffRefCpoFilterStatus');
  function filter() {
    if(from.value&&to.value&&from.value>to.value){feedback.textContent='Choose a valid date range.';return;}
    feedback.textContent='';
    const term = search.value.trim().toLowerCase();
    const visible = campaigns.map((c,i)=>({c,i})).filter(({c})=>(!status.value||offerStatus(c)===status.value) &&
      [c.title,c.product,c.category].join(' ').toLowerCase().includes(term) &&
      (!from.value||!(c.endDate||c.date)||String(c.endDate||c.date).slice(0,10)>=from.value) &&
      (!to.value||!(c.startDate||c.date)||String(c.startDate||c.date).slice(0,10)<=to.value));
    const indexes = new Set(visible.map(x=>x.i));
    cards.forEach((card,i)=>card.classList.toggle('ffRefCampaignFiltered',!indexes.has(i)));
    table.querySelector('tbody').innerHTML = visible.map(({c,i})=>`<tr><td><button type="button" class="secondary" data-ref-campaign="${i}">${esc(c.title)}</button></td><td>${esc(c.startDate||c.date||'')} – ${esc(c.endDate||'')}</td><td>${esc(c.product||'—')}</td><td>${esc(offerStatus(c)==='Active'?'Running':offerStatus(c))}</td></tr>`).join('') ||
      '<tr><td colspan="4">No activities match these filters.</td></tr>';
    table.querySelectorAll('[data-ref-campaign]').forEach(button=>button.onclick=()=>cards[Number(button.dataset.refCampaign)]?.scrollIntoView({block:'start',behavior:'smooth'}));
  }
  status.onchange=search.oninput=from.onchange=to.onchange=filter;
  toolbar.querySelectorAll('[data-campaign-go]').forEach(button=>button.onclick=()=>{
    const page=button.dataset.campaignGo;
    if(page==='activities')table.scrollIntoView({block:'nearest',behavior:'smooth'});
    else go(page);
  });
  filter();
};
