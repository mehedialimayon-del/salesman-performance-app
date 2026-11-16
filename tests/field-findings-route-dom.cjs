'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');

async function main() {
  const {window} = new JSDOM('<main></main>', {runScripts:'outside-only',url:'https://test.fieldforce.app/'});
  const {document} = window;
  window.eval(fs.readFileSync('field-findings.js','utf8'));
  const main = document.querySelector('main');
  const people = [
    {id:'MANAGER',name:'Manager',zone:'PRIMARY',can_manage:true},
    {id:'SR1',name:'Representative',zone:'PRIMARY',manager_id:'MANAGER'},
    {id:'SR2',name:'Other zone',zone:'SECOND'}
  ];
  const database = [
    {id:'first',title:'First follow-up',kind:'route',category:'Route assignment',owner_staff_id:'MANAGER',
      recipients:['SR1'],created_at:'2026-11-16',payload:{outlet_name:'First outlet'},states:{}},
    {id:'second',title:'Second follow-up',kind:'route',category:'New outlet',owner_staff_id:'SR2',
      recipients:['SR2'],created_at:'2026-11-17',payload:{outlet_name:'Second outlet'},states:{}}
  ];
  const outlets = people.slice(1).map(person=>({sr:person.id,name:person.name}));
  const exports = [];
  const ctx = {
    esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
    user:()=>people[0],people:()=>people,scopePeople:()=>people,outlets:()=>outlets,
    sb:{from:()=>({select:()=>({order:()=>({range:async()=>({data:database,error:null})})})})},
    shell:markup=>{main.innerHTML=markup;},back:title=>'<h1>'+title+'</h1>',setPage(){},bindBack(){},
    exportFile:(button,title,rows)=>exports.push([button.dataset.routeExport,rows])
  };
  const route = window.FFH_CREATE_FINDINGS(ctx);
  await route.open();
  const find = selector=>main.querySelector(selector);
  const change = (selector,value)=>{
    const field = find(selector);
    field.value = value;
    field.dispatchEvent(new window.Event('change',{bubbles:true}));
  };
  assert.equal(main.querySelectorAll('[data-route-view]').length,4);
  assert.equal(main.querySelectorAll('.ffRefRouteActions button').length,4);
  assert.match(find('#ffRouteZone').textContent,/My zone · KL Zone/);
  assert.match(find('#ffRouteStaff').textContent,/Representative/);
  change('#ffRouteStaff','MANAGER');
  assert.match(find('#ffRouteAssigned').textContent,/Representative/);
  assert.doesNotMatch(find('#ffRouteAssigned').textContent,/Other zone/);
  find('#ffRouteExcel').click();
  assert.equal(exports[0][0],'xlsx');
  assert.equal(exports[0][1].length,2);
  assert.equal(exports[0][1][1][0],'First follow-up');
  change('#ffRouteZone','SECOND');
  assert.doesNotMatch(find('#ffRouteStaff').textContent,/Representative/);
  assert.match(find('#ffRouteAssigned').textContent,/Second outlet/);
  await route.open();
  assert.equal(find('#ffRouteZone').value,'SECOND');
  await route.detail('gone');
  assert.match(find('#ffRouteStatus').textContent,/unavailable/);
  window.close();
  console.log('PASS Route Plan layout, manager team scope, zone persistence, scoped Excel and inline errors');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
