'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body><main id="app"><form id="taskForm"><label>Assign To<select name="to"><option value="M21954">Manager</option></select></label><button type="submit">ASSIGN TASK</button></form></main></body></html>',
 {url:'https://fieldforce.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,q=s=>w.document.querySelector(s);
 const people=[
  {staff_id:'M21954',name:'MEHEDI ALIM AYON',login_id:'M21954',zone_id:'PRIMARY',designation:'MANAGER',can_manage:true,same_zone:true,is_upward:true},
  {staff_id:'PERVES_HIRA',name:'PERVES HIRA',login_id:'M10009',zone_id:'HEAD_OFFICE',designation:'HEAD_OF_SALES',can_manage:true,same_zone:false,is_upward:true},
  {staff_id:'WAHID_ADMIN',name:'WAHIDUR RAHMAN',login_id:'WAHID_ADMIN',zone_id:'PRIMARY',designation:'SALES_ADMIN',can_manage:true,same_zone:true,is_upward:true},
  {staff_id:'M22075',name:'EMON',login_id:'M22075',zone_id:'CHERAS',designation:'MANAGER',can_manage:true,same_zone:false,is_upward:false},
  {staff_id:'MG_PENANG',name:'MAMUN',login_id:'MG_PENANG',zone_id:'PENANG',designation:'MANAGER',can_manage:true,same_zone:false,is_upward:false},
  {staff_id:'M22328',name:'MUNNAF',login_id:'M22328',zone_id:'PRIMARY',designation:'SR',can_manage:false,same_zone:true,is_upward:false},
  {staff_id:'M21770',name:'SAYEM',login_id:'M21770',zone_id:'CHERAS',designation:'SR',can_manage:false,same_zone:false,is_upward:false}
 ];
 let called=0;w.FFH_SUPABASE={rpc:async name=>{assert.equal(name,'ffh_task_recipients');called++;return{data:people,error:null}}};
 w.FFH_STYLE_SELECT=()=>{};
 w.eval(fs.readFileSync('task-assignee-access.js','utf8'));
 await wait(70);
 const select=q('select[name=to]');
 assert.ok(called>=1,'task audience is read from signed-in RPC');
 assert.equal(select.disabled,false);
 assert.equal(select.options.length,people.length+1,'every active company role is in picker');
 for(const p of people)assert.ok([...select.options].some(o=>o.value===p.staff_id),p.staff_id);
 assert.ok([...select.options].find(o=>o.value==='M22075').textContent.includes('MANAGER'));
 assert.ok([...select.options].find(o=>o.value==='PERVES_HIRA').textContent.includes('HEAD OF SALES'));
 const scope=q('select[aria-label="Filter task recipient zone"]');
 assert.equal(scope.value,'all');
 select.value='M22075';
 assert.equal(new w.FormData(q('#taskForm')).get('to'),'M22075','SR can assign manager across zones');
 scope.value='zone';scope.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.ok(![...select.options].some(o=>o.value==='M22075'),'optional own zone filter hides other zone manager');
 scope.value='all';scope.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.ok([...select.options].some(o=>o.value==='M22075'),'All staff restores all managers');
 assert.match(q('.ffTaskRecipientScope small').textContent,/never grant dashboard/i);
 dom.window.close();
 console.log('PASS: all active staff assign tasks to managers, leadership and SR across zones without exposing dashboards');
})().catch(e=>{console.error(e);process.exitCode=1;});
