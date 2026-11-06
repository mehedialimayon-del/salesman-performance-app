'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><head></head><body><div id="app"><main class="wrap" id="screen"></main></div></body></html>',{url:'https://fieldforce.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
const logic=fs.readFileSync('ffh-direct-filters.js','utf8');
w.eval(
 "let ffhSelectedZone='ALL',view='ALL';"+
 "const user={id:'M21954'},db={companyRoster:{configured:true,teams:[{zone_id:'PRIMARY',active:true},{zone_id:'CHERAS',active:true}],member_ids:['S1','S2','S3','M22075']}};"+
 "const U=["+
 "{id:'M21954',name:'KL Manager',zone:'PRIMARY',can_manage:true,active:true,companyStaffId:'M21954'},"+
 "{id:'S1',name:'Alpha KL',zone:'PRIMARY',can_sell:true,active:true,companyStaffId:'M111'},"+
 "{id:'S2',name:'Beta KL',zone:'PRIMARY',can_sell:true,active:true,companyStaffId:'M222'},"+
 "{id:'M22075',name:'Cheras Manager SR',zone:'CHERAS',can_manage:true,can_sell:true,active:true},"+
 "{id:'S3',name:'Gamma Cheras',zone:'CHERAS',can_sell:true,active:true},"+
 "{id:'S4',name:'Inactive',zone:'PRIMARY',can_sell:true,active:false}];"+
 "const isMgr=()=>true,sr=id=>U.find(x=>x.id===id),srIds=()=>U.filter(p=>p.active!==false&&p.can_sell&&db.companyRoster.member_ids.includes(p.id)&&(ffhSelectedZone==='ALL'||p.zone===ffhSelectedZone)).map(p=>p.id);"+
 logic+
 "window.__state=()=>({zone:ffhSelectedZone,view,manager:window.FFH_SELECTED_TEAM_MANAGER||''});"
);
const main=w.document.querySelector('main');
const render=()=>{main.innerHTML=w.scopeBar();w.bindScope(render)};
render();
let zone=()=>main.querySelector('#ffDashboardZone'),sr=()=>main.querySelector('#ffScopeStaff');
let choice=()=>[...sr().options].map(o=>o.value);
assert.equal(main.querySelectorAll('details,summary').length,0,'no extra Filter disclosure');
assert.deepEqual(choice(),['ALL','TEAM:M22075','TEAM:M21954','S3','S1','S2'],'managers first, SRs sorted by zone then name');
assert.equal(zone().value,'ALL');
assert.equal(sr().value,'ALL');
zone().value='PRIMARY';zone().dispatchEvent(new w.Event('change'));
assert.equal(w.__state().zone,'PRIMARY');assert.equal(sr().value,'ALL');
assert.deepEqual(choice(),['ALL','TEAM:M21954','S1','S2'],'zone only shows its staff + manager');
zone().value='ALL';zone().dispatchEvent(new w.Event('change'));
sr().value='TEAM:M22075';sr().dispatchEvent(new w.Event('change'));
assert.equal(w.__state().zone,'CHERAS','manager picks their zone');
assert.equal(w.__state().view,'ALL','manager team uses combined metrics rather than manager own SR');
assert.equal(w.__state().manager,'M22075');
assert.equal(sr().value,'TEAM:M22075','manager remains selected after dashboard rerender');
sr().value='ALL';sr().dispatchEvent(new w.Event('change'));
assert.equal(w.__state().manager,'','Combined clears selected manager');
assert.deepEqual(choice(),['ALL','TEAM:M22075','S3'],'Combined keeps manager first then zone SR');
sr().value='S3';sr().dispatchEvent(new w.Event('change'));
assert.equal(w.__state().view,'S3','individual SR directly selected without second tap');
assert.equal(w.document.querySelectorAll('.globalSearchOverlay').length,0,'no offscreen overlay is created');
main.innerHTML='<details class="ffTaskScope"><summary>Old filter</summary><section class="ffDirectScope"></section></details>';
Promise.resolve().then(()=>{assert.equal(main.querySelector('.ffTaskScope').open,true,'task page nested filter opens automatically');dom.window.close();console.log('PASS one-tap direct zone + combined/SR/manager selection; correct zone scope, no duplicate filter/overlay');}).catch(e=>{console.error(e);process.exit(1)});
