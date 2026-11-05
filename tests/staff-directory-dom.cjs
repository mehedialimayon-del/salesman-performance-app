'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');

const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:'https://example.test/',runScripts:'outside-only'});
const {window:w}=dom,document=w.document;
w.alert=(...a)=>{throw Error('Unexpected alert: '+a.join(' '));};
w.confirm=()=>false;
w.eval(fs.readFileSync('staff-directory.js','utf8'));
w.eval(fs.readFileSync('accounts.js','utf8'));

const people=[
 {staff_id:'M22328',company_staff_id:'M22328',full_name:'Md Munnaf Ali',zone_id:'PRIMARY',designation:'SR',can_manage:false,can_sell:true,active:true,manager_id:'M21954',team_name:'Ayon'},
 {staff_id:'M22075',company_staff_id:'M22075',full_name:'MOHAMMAD BODRUDDAZA EMON',zone_id:'CHERAS',designation:'MANAGER',can_manage:true,can_sell:false,active:true,manager_id:'PERVES_HIRA'},
 {staff_id:'M22320',company_staff_id:'M22320',full_name:'Cheras SR',zone_id:'CHERAS',designation:'SR',can_manage:false,can_sell:true,active:true,manager_id:'M22075'},
 {staff_id:'M21954',company_staff_id:'M21954',full_name:'MEHEDI ALIM AYON',zone_id:'PRIMARY',designation:'MANAGER',can_manage:true,can_sell:false,active:true,manager_id:'PERVES_HIRA'},
 {staff_id:'WAHID_ADMIN',company_staff_id:'WAHID_ADMIN',full_name:'WAHIDUR RAHMAN',zone_id:'PRIMARY',designation:'SALES_ADMIN',can_manage:true,can_sell:false,active:true},
 {staff_id:'PERVES_HIRA',company_staff_id:'PERVES_HIRA',full_name:'PERVES HIRA',zone_id:'HEAD_OFFICE',designation:'HEAD_OF_SALES',can_manage:true,can_sell:false,active:true}
];
const zones=[{id:'PRIMARY',name:'KL'},{id:'CHERAS',name:'Cheras'},{id:'HEAD_OFFICE',name:'Head Office'}];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const groups=w.FFH_STAFF_DIRECTORY.buildGroups([...people],zones,true);
assert.equal(groups[0].label,'HEAD OFFICE');
assert.equal(groups[0].members.map(p=>p.staff_id).join(','),'M21954,PERVES_HIRA,WAHID_ADMIN');
assert.equal(groups[1].label,'KL ZONE');
assert.equal(groups[1].members.some(p=>p.staff_id==='M21954'),false,'owner appears only once');
assert.equal(groups[2].label,'CHERAS TEAM');
assert.equal(groups.length,3,'separate Head Office leadership box');
assert.equal(groups.find(x=>x.id==='CHERAS').members[0].staff_id,'M22075');
const source=w.FFH_STAFF_DIRECTORY.render({profiles:people,zones,owner:true,admin:true,viewerId:'M21954',escape:esc});
assert.match(source,/KL ZONE/);
assert.match(source,/CHERAS TEAM/);
assert.match(source,/ffOwnerOwnPassword/);
assert.equal((source.match(/ffDeleteStaff/g)||[]).length,people.length-1);

let passwords=[];
const ctx={
 FFH_SUPABASE:{
  rpc: async(name)=>({data:name==='ffh_governance'?{
    owner:true,administrator:true,profiles:people,zones,grants:[{staff_id:'M22328',module:'sales',can_edit:true,can_upload:false,can_delete:true}],zone_access:[],requests:[],outlets:[]
  }:[],error:null}),
  functions:{
   invoke: async(name,{body})=>{if(body.action==='password')passwords.push(body);return{data:{password_changed:true},error:null};}
  }
 },
 shell:markup=>{document.querySelector('#app').innerHTML=markup;},
 back:title=>'<div class="head ffNoScreenBack"><h1>'+esc(title)+'</h1></div>',
 esc,bindBack:()=>{},q:s=>document.querySelector(s),qa:s=>Array.from(document.querySelectorAll(s)),
 user:()=>({id:'M21954',name:'MEHEDI ALIM AYON',can_manage:true}),
 setPage:()=>{},ffhLoadCloud:async()=>{}
};
(async()=>{
 await w.FFH_CREATE_ACCOUNTS(ctx)();
 const input=document.querySelector('#ffStaffSearch');
 assert.ok(input,'staff search should show');
 assert.equal(document.querySelectorAll('[data-ff-team]').length,3);
 const headOffice=document.querySelector('[data-zone-id="HEAD_OFFICE_LEADERSHIP"]');
 assert.deepEqual([...headOffice.querySelectorAll('[data-ff-staff-item] strong')].map(el=>el.textContent),['MEHEDI ALIM AYON','PERVES HIRA','WAHIDUR RAHMAN']);
 const kl=document.querySelector('[data-zone-id="PRIMARY"]');
 assert.equal(kl.querySelectorAll('[data-ff-staff-item] strong')[0].textContent,'Md Munnaf Ali');
 assert.equal(kl.querySelectorAll('.ffOwnerOwnPassword').length,0);
 assert.equal(headOffice.querySelectorAll('.ffOwnerOwnPassword').length,1);
 assert.equal(document.querySelector('[data-zone-id="HEAD_OFFICE"]'),null);
 assert.equal(headOffice.querySelectorAll('.ffDeleteStaff').length,2,'owner account is not deletable');
 assert.equal(document.querySelectorAll('.ffReplaceAccount').length,2);
 input.value='munnaf';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(document.querySelectorAll('[data-ff-staff-item]:not([hidden])').length,1);
 assert.equal(document.querySelectorAll('[data-ff-team]:not([hidden])').length,1);
 input.value='cheras';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(document.querySelectorAll('[data-ff-staff-item]:not([hidden])').length,2);
 input.value='M22075';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(document.querySelectorAll('[data-ff-staff-item]:not([hidden])').length,1);
 input.value='no-such-person';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(document.querySelectorAll('[data-ff-staff-item]:not([hidden])').length,0);
 assert.equal(document.querySelector('#ffStaffNoMatches').hidden,false);
 input.value='';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 document.querySelector('.ffEditAccount[data-id="M22328"]').click();
 assert.ok(document.querySelector('#ffAccountForm'),'edit opens the permission matrix');
 const salesPerm=document.querySelector('.ffPermissionRow[data-module="sales"]');
 assert.equal(salesPerm.querySelector('[data-verb="edit"]').checked,true,'saved Edit permission remains visibly checked');
 assert.equal(salesPerm.querySelector('[data-verb="delete"]').checked,true,'saved Delete permission remains visibly checked');
 assert.equal(salesPerm.querySelector('[data-verb="upload"]').checked,true,'built-in SR own-sales Upload shows its effective tick');
 assert.equal(salesPerm.querySelector('[data-verb="upload"]').disabled,true,'built-in role action is not a separately editable cross-staff grant');
 assert.equal(salesPerm.querySelector('[data-verb="upload"]').dataset.ffBuiltIn,'1','role-derived access is distinguished from delegated permissions');
 assert.ok(document.querySelector('#back'),'subpage provides visible Back button');
 w.dispatchEvent(new w.PopStateEvent('popstate',{state:{ffhPage:'control:users'}}));
 await new Promise(resolve=>setTimeout(resolve,25));
 assert.ok(document.querySelector('#ffStaffSearch'),'Android/browser Back returns to Staff List, not app Home');
 assert.ok(document.querySelector('[data-zone-id="PRIMARY"]'),'back restores the KL team');
 document.querySelector('.ffOwnerOwnPassword').click();
 const form=document.querySelector('#ffOwnerOwnPasswordForm');
 assert.ok(form,'owner can open password-change form');
 form.elements.password.value='ExampleSecure2026';
 form.elements.confirm_password.value='ExampleSecure2026';
 form.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:form.querySelector('[type="submit"]')}));
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(passwords.length,1,'password change should invoke backend once');
 assert.equal(passwords[0].action,'password');
 assert.equal(passwords[0].staff_id,'M21954');
 assert.equal(passwords[0].password,'ExampleSecure2026');
 assert.match(document.querySelector('#ffOwnerPasswordStatus').textContent,/successfully changed/i);
 console.log('PASS: grouped teams, owner first, manager-first SRs, live search, action controls, owner password');
})().catch(e=>{console.error(e);process.exitCode=1;});
