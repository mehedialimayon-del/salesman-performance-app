const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const pause=()=>new Promise(r=>setTimeout(r,15));
(async()=>{
 const d=new JSDOM('<main></main>',{runScripts:'outside-only',url:'https://fieldforce.test/staff'}),w=d.window,q=s=>w.document.querySelector(s),calls=[];
 let me={id:'M21954'},scope={zone:'ALL',staff:'ALL'},next;
 const head={staff_id:'PERVES_HIRA',full_name:'PERVES HIRA',role:'MANAGER',designation:'HEAD_OF_SALES',zone_id:'HEAD_OFFICE',can_manage:true,can_sell:false,active:true,has_login:false};
 const state={profiles:[{staff_id:'M21954',full_name:'Ayon',can_manage:true,active:true,zone_id:'PRIMARY'},head],zones:[{id:'PRIMARY',name:'KL',active:true},{id:'HEAD_OFFICE',name:'Head Office',active:true},{id:'INACTIVE',name:'Inactive',active:false}],grants:[],zone_access:[{staff_id:'PERVES_HIRA',zone_id:'PRIMARY'}],requests:[]};
 w.alert=s=>{throw Error(s)};
 const ctx={user:()=>me,q,qa:s=>[...w.document.querySelectorAll(s)],esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),shell:s=>q('main').innerHTML=s,back:s=>'<h1>'+s+'</h1>',bindBack(){},setPage(){},ffhLoadCloud:async()=>{},scope:()=>({...scope}),setScope:(zone,staff)=>scope={zone,staff},go:p=>next=p,FFH_SUPABASE:{rpc:async(n,b)=>{calls.push(b);return {data:b.action==='state'?state:b.action==='head_office_activity'?[{id:1,actor:'M21954',actor_name:'Ayon',actor_zone:'PRIMARY',operation:'UPDATE',table_name:'ffh_sales',occurred_at:'2026-11-01T09:00:00Z'}]:{saved:true}}},functions:{invoke:async(n,{body})=>{calls.push({body});return{data:{staff_id:body.staff_id}}}}}};
 w.eval(fs.readFileSync('staff-directory.js','utf8'));w.eval(fs.readFileSync('accounts.js','utf8'));await w.FFH_CREATE_ACCOUNTS(ctx)();
 assert.equal(q('#ffHeadOfficeAccess'),null);q('.ffEditAccount[data-id=PERVES_HIRA]').click();let f=q('#ffAccountForm');assert.ok(f);assert.equal(f.elements.staff_id.value,'PERVES_HIRA');assert.equal(f.elements.ai_access,undefined);assert.equal(f.elements.administrator,undefined);assert.equal(f.elements.password.required,false);
 f.elements.password.value=f.elements.confirm_password.value='head-office-unit-password';q('[data-module=sales] [data-verb=edit]').checked=true;
 await f.onsubmit({preventDefault(){},submitter:f.querySelector('button.primary')});const access=calls.find(c=>c.action==='save_access').payload;assert.equal(access.grants.find(g=>g.module==='kb').can_edit,false);assert.equal(access.administrator,false);assert.equal(access.grants.find(g=>g.module==='sales').can_edit,true);assert.deepEqual([...access.zones],['PRIMARY']);
 me={id:'WAHID_ADMIN'};state.administrator=true;await w.FFH_CREATE_ACCOUNTS(ctx)();assert.equal(q('.ffEditAccount[data-id=PERVES_HIRA]'),null);assert.equal(q('#ffHeadOfficeAccess'),null);assert.equal(q('.ffZoneToggle'),null);
 d.window.close();console.log('PASS Perves account permissions, pending login form, independent sales grant, AI_BASE disabled, admin protection; standalone Head Office shortcut removed');
})().catch(e=>{console.error(e);process.exit(1)});
