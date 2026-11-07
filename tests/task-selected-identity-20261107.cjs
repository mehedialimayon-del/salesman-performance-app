'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const html='<!doctype html><html><head></head><body><div id="app"><main class="wrap ffTaskPage">'
  +'<details class="ffTaskScope ffTaskCompactV2" open><summary>Team Filter</summary><section class="ffDirectScope">'
  +'<div class="ffTaskCompactPair"><label>SELECT ZONE<select id="ffDashboardZone"><option value="ALL">ALL ZONES</option><option selected value="PRIMARY">KL ZONE</option></select></label>'
  +'<label>SELECT SR / FILTER<select id="ffScopeStaff"><option value="ALL">COMBINED</option><option value="M22328" selected>M22328 · Manna</option></select>'
  +'<button class="ffSelectTrigger"><span class="ffSelectStaffAvatar">M</span></button></label></div></section></details>'
  +'<div class="card ffTaskList"><div class="cardTitle"><span>Tasks & History</span><span class="ffPendingLabel">— Pending First</span></div></div>'
  +'</main></div></body></html>';
 const dom=new JSDOM(html,{url:'https://fieldforce.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,q=x=>w.document.querySelector(x);
 w.localStorage.setItem('ffh_session',JSON.stringify({id:'M21954'}));
 const people={
   M21954:{staff_id:'M21954',full_name:'MEHEDI ALIM AYON',company_staff_id:'M21954',photo_url:'https://photos.example/ayon.jpg'},
   M22328:{staff_id:'M22328',full_name:'Manna',company_staff_id:'M22328',photo_url:'https://photos.example/manna.jpg'}
 };
 w.FFH_STAFF_PROFILE=id=>people[id]||null;
 w.eval(fs.readFileSync('ffh-task-selected-view-20261107.js','utf8'));
 await sleep(90);
 assert.ok(!q('.ffPendingLabel'),'only the Pending First label is removed');
 assert.match(q('.ffTaskViewingIdentity').textContent,/Manna.*M22328/,'selected SR and staff ID appear beside Task History');
 assert.ok(q('.ffTaskViewingIdentity img'),'selected SR profile photo appears');
 assert.match(q('.ffTaskZoneManagerChip').textContent,/MEHEDI ALIM AYON.*M21954/,'KL Zone manager and Staff ID appear');
 assert.ok(q('.ffSelectTrigger .ffSelectStaffLabel'),'SR name reappears beside round avatar in filter');
 assert.match(q('.ffSelectTrigger .ffSelectStaffLabel').textContent,/Manna/);
 q('#ffScopeStaff').value='ALL';q('#ffScopeStaff').dispatchEvent(new w.Event('change',{bubbles:true}));
 await sleep(90);
 assert.match(q('.ffTaskViewingIdentity').textContent,/KL ZONE/,'combined scope is labelled by zone');
 assert.match(q('.ffTaskZoneManagerChip').textContent,/MEHEDI ALIM AYON/);
 dom.window.close();console.log('PASS: Tasks identity, staff name/photo/ID, zone manager and Pending First display only');
})().catch(e=>{console.error(e);process.exitCode=1;});
