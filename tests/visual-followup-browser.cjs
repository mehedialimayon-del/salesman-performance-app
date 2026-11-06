'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const chrome=process.env.FFH_CHROMIUM&&fs.existsSync(process.env.FFH_CHROMIUM)?process.env.FFH_CHROMIUM:undefined;
 const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}) ,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#080808;color:white}#app{width:100%}main{width:100%;box-sizing:border-box}</style></head><body><div id="app"><main class="wrap ffTaskPage"><h1>Tasks, Notes & Reminders</h1><details class="ffTaskScope"><summary>Old duplicate filter</summary><section class="ffScopeFilter ffDirectScope"><div class="ffScopeFilterBody ffDirectScopeFields"><label>SELECT ZONE<select id="ffDashboardZone"><option value="ALL">All zones</option><option value="PRIMARY" selected>PRIMARY</option></select></label><label>SELECT SR / COMBINED<select id="ffScopeStaff"><option value="ALL" data-manager-id="M" selected>Combined team</option><option value="TEAM:M">KL Manager</option><option value="S1">Munnaf Ali</option></select></label></div></section></details><section class="card ffTaskList"><h2>Tasks & History</h2><div class="ffHistoryScroll"><div class="taskRow"><b>Follow-up outlet</b><button class="taskDone">MARK DONE</button></div></div></section><details class="card ffTaskComposer"><summary><span>Assign task</span><small>Give work</small></summary></details><details class="card ffPrivateNoteDrawer"><summary><span>My private notepad</span><small>Private notes</small></summary></details></main></div></body></html>');
  for(const p of ['styles.css','compact-pages.css','ffh-direct-filters.css','ffh-visual-followup.css'])await page.addStyleTag({path:p});
  await page.evaluate(()=>{
   const people={
    M:{id:'M',name:'KL Manager',can_manage:true,zone:'PRIMARY',companyStaffId:'M21954'},
    S1:{id:'S1',name:'Munnaf Ali',manager_id:'M',route:'CHOW KIT',zone:'PRIMARY',companyStaffId:'M22328'}
   };
   window.FFH_STAFF_PROFILE=id=>people[id];
   window.FFH_STAFF_PHOTOS={find:id=>id==='M'?{staff_id:id,full_name:'KL Manager',photo_url:'https://example.test/manager.jpg'}:null};
  });
  await page.addScriptTag({path:'searchable-picker.js'});
  await page.addScriptTag({path:'ffh-visual-followup.js'});
  for(const width of [320,360,390,412]){
   await page.setViewportSize({width,height:844});
   await page.waitForSelector('#ffScopeStaff + .ffSelectTrigger');
   const metrics=await page.evaluate(()=>{
    const task=document.querySelector('main.ffTaskPage'),note=task.querySelector('.ffPrivateNoteDrawer');
    const r=task.getBoundingClientRect(),n=note.getBoundingClientRect();
    return {width:document.documentElement.scrollWidth,viewport:innerWidth,bottomGap:r.bottom-n.bottom,taskHeight:r.height,buttonCount:task.querySelectorAll('.ffScopeFilter .ffSelectTrigger').length,shownOldSummary:getComputedStyle(task.querySelector('.ffTaskScope>summary')).display,legacyVisible:getComputedStyle(task.querySelector('#ffScopeStaff')).display};
   });
   assert.ok(metrics.width<=width+2,'horizontal overflow '+JSON.stringify(metrics));
   assert.equal(metrics.buttonCount,2,'two visible scope triggers at '+width);
   assert.equal(metrics.shownOldSummary,'none','no extra filter disclosure');
   assert.equal(metrics.legacyVisible,'none','hidden native select not duplicated');
   assert.ok(metrics.bottomGap<=25,'drawer not near task panel bottom '+JSON.stringify(metrics));
   assert.ok(metrics.taskHeight>350,'task area fills available viewport');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#ffScopeStaff + .ffSelectTrigger').click();
  await page.locator('.ffScopeStaffPicker .ffPickerOption[data-staff-id="S1"]').waitFor();
  assert.equal(await page.locator('.ffScopeStaffPicker .ffPickerOption[data-staff-id="S1"] .ffScopeStaffName').innerText(),'M22328 · Munnaf Ali');
  assert.match(await page.locator('.ffScopeStaffPicker .ffPickerOption[data-staff-id="S1"] .ffScopeStaffFine').innerText(),/ROUTE.*CHOW KIT.*ZONE.*KL ZONE/);
  await page.locator('.ffScopeStaffPicker .ffPickerOption[data-staff-id="S1"]').click();
  assert.equal(await page.locator('#ffScopeStaff').inputValue(),'S1');
  await page.screenshot({path:'/tmp/ffh-followup-task-390.png'});
  await page.evaluate(()=>{
   const m=document.querySelector('main');
   m.className='wrap ffDashboardFrame';
   m.innerHTML='<section class="ffScopeFilter ffDirectScope"><div class="ffScopeFilterBody ffDirectScopeFields"><label>SELECT ZONE<select id="ffDashboardZone"><option value="PRIMARY" selected>PRIMARY</option></select></label><label>SELECT SR / COMBINED<select id="ffScopeStaff"><option value="ALL" data-manager-id="M" selected>Combined</option><option value="TEAM:M">Manager</option></select></label></div></section><div class="dashHero"><div><b>Performance Command Center</b><small>Combined delivered sales</small></div><div class="dashAch">0%</div></div>';
  });
  await page.locator('.ffDashManagerCompact').waitFor();
  assert.equal(await page.locator('.ffDashManagerName').innerText(),'KL Manager');
  assert.equal(await page.locator('.dashAch').innerText(),'0%');
  assert.equal(await page.locator('.ffDashManagerCompact').count(),1);
  await page.screenshot({path:'/tmp/ffh-followup-dashboard-390.png'});
  await page.evaluate(()=>{
   const m=document.querySelector('main');m.className='wrap ffNotificationPage';
   m.innerHTML='<div class="ffPriorityMetrics"><div class="alertBox"><span>SHORTFALL</span><b>RM 360,000</b></div><div class="alertBox yellow">ZERO SALES</div></div><div class="card ffPrioritySummary"><div class="row">Delivery</div><div class="row">Open tasks</div><div class="row"><b>Outlet Coverage Gap</b><span>145</span></div></div><div class="card ffPriorityTasks"><div class="row"><b>Important Tasks</b></div><div class="empty">No open tasks.</div></div><div class="card ffInboxScroller">Notification Inbox</div>';
  });
  const colors=await page.evaluate(()=>['.ffPriorityMetrics .alertBox:first-child','.ffPrioritySummary > .row:last-child','.ffPriorityTasks'].map(x=>getComputedStyle(document.querySelector(x)).backgroundImage));
  assert.ok(colors.every(x=>x.includes('gradient')),'three priority boxes use their own theme colors');
  assert.equal(new Set(colors).size,3,'three priority surfaces visually distinct');
  await page.screenshot({path:'/tmp/ffh-followup-notification-390.png'});
  console.log('PASS Chromium 320/360/390/412px task-height/buttons/no-double-filter, SR picker, dashboard manager portrait/percent, three distinct notification colors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});