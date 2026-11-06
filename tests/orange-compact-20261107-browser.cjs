'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const binary=process.env.FFH_CHROMIUM&&fs.existsSync(process.env.FFH_CHROMIUM)?process.env.FFH_CHROMIUM:undefined;
 const browser=await chromium.launch({headless:true,...(binary?{executablePath:binary}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="ffGlowOn"><div id="app"><div class="app ffBlackGlow"><main class="wrap ffDashboardFrame">
   <div class="head"><h1>Dashboard</h1></div>
   <div class="ffDashboardTabs"><button class="on">Actual Target</button><button>Planning Target</button><button>Last Month Comparison</button></div>
   <section class="ffScopeFilter ffDirectScope"><div class="ffScopeFilterBody ffDirectScopeFields"><label>SELECT ZONE<button class="ffSelectTrigger">SUNGai_BULOH</button></label><label>SELECT STAFF / SR<button class="ffSelectTrigger">COMBINED TOTAL</button></label></div></section>
   <div class="dashHero"><div><b>Performance Command Center</b></div><div class="dashAch">0%</div></div>
   <div class="dashRange"><label>From<input value="01/11/2026"></label><label>To<input value="07/11/2026"></label></div>
   <div class="refKpis">${Array.from({length:18},(_,i)=>'<article class="refKpi" style="min-height:95px"><b>Sales '+i+'</b><p>RM 455,000</p></article>').join('')}</div>
  </main><main class="wrap ffTaskPage"><div class="head"><h1>Tasks, Notes & Reminders</h1></div>
   <details open class="ffTaskScope"><summary>Old filter</summary><section class="ffScopeFilter ffDirectScope"><div class="ffScopeFilterBody ffDirectScopeFields"><label>SELECT ZONE<button class="ffSelectTrigger">KL ZONE</button></label><label>SELECT STAFF / SR<button class="ffSelectTrigger">ALL SR</button></label></div></section></details>
   <div class="ffTaskList"><b>Tasks & History</b><div class="ffHistoryScroll">${Array.from({length:20},(_,i)=>'<div style="padding:18px;border-bottom:1px solid orange">Task '+i+'</div>').join('')}</div></div>
   <details class="ffTaskComposer"><summary><span>Assign task</span><small>Give work and deadline</small></summary></details>
   <details class="ffPrivateNoteDrawer"><summary><span>My private notepad</span><small>Private notes</small></summary></details>
  </main></div></div></body></html>`);
  for(const file of ['styles.css','page-frame.css','ffh-direct-filters.css','ffh-visual-followup.css','ffh-orange-compact-20261107.css'])await page.addStyleTag({path:file});
  for(const width of [320,360,390,412]){
   await page.setViewportSize({width,height:844});
   const m=await page.evaluate(()=>{
    const d=document.querySelector('.ffDashboardFrame'),t=document.querySelector('.ffTaskPage');
    const pair=d.querySelectorAll('.ffSelectTrigger'),dt=d.querySelectorAll('.ffDashboardTabs button');
    const rr=d.querySelector('.dashRange'),dh=d.querySelector('.dashHero');
    const history=t.querySelector('.ffHistoryScroll');
    return {viewport:innerWidth,doc:document.documentElement.scrollWidth,pairWidths:[...pair].map(x=>Math.round(x.getBoundingClientRect().width)),tabs:[...dt].map(x=>getComputedStyle(x).backgroundImage),orderDates:getComputedStyle(rr).order,orderHero:getComputedStyle(dh).order,taskH:Math.round(t.getBoundingClientRect().height),historyScroll:history.scrollHeight>history.clientHeight,assignH:Math.round(t.querySelector('.ffTaskComposer summary').getBoundingClientRect().height)};
   });
   assert.ok(m.doc<=width+3,'horizontal overflow '+JSON.stringify(m));
   assert.ok(Math.abs(m.pairWidths[0]-m.pairWidths[1])<=3,'selector widths must match '+JSON.stringify(m));
   assert.equal(new Set(m.tabs).size,3,'three dashboard tabs need distinct colors');
   assert.ok(Number(m.orderDates)<Number(m.orderHero),'From/To selectors stay above command center');
   assert.ok(m.historyScroll,'task history is independently scrollable');
   assert.ok(m.assignH<=50,'Assign Task must be thin, not oversized');
  }
  await page.evaluate(()=>{
   const d=document.querySelector('.ffDashboardFrame');d.scrollTop=260;
  });
  const sticky=await page.evaluate(()=>{
   const d=document.querySelector('.ffDashboardFrame'),tabs=d.querySelector('.ffDashboardTabs'),range=d.querySelector('.dashRange');
   return {scroll:d.scrollTop,top:d.getBoundingClientRect().top,tabs:tabs.getBoundingClientRect().top,range:range.getBoundingClientRect().top};
  });
  assert.ok(sticky.scroll>0,'dashboard metrics should scroll');
  assert.ok(sticky.tabs>=sticky.top-2,'target tabs remain pinned inside dashboard scroll area');
  await page.screenshot({path:'/tmp/ffh-orange-compact-dashboard.png'});
  console.log('PASS 320–412px premium colors, equal Zone/Staff selectors, date toolbar order, scroll and compact Task history/actions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});