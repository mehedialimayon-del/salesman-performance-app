'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>',{
 url:'https://example.test',runScripts:'outside-only'});
const w=dom.window,doc=w.document;
w.eval(fs.readFileSync('account-outlet-access.js','utf8'));
const api=w.FFH_ACCOUNT_OUTLETS;assert.ok(api);
const rows=[['Outlet Code','Outlet Name','Category','Total SKU'],['00125','Supermarket One','NSK',5],['002','Supermarket Two','Giant',0]];
const result=api.parseMatrix(rows);
assert.equal(result.rows.length,2);
assert.equal(result.rows[0].outlet_code,'00125');
assert.equal(result.rows[0].total_sku,5);
assert.equal(api.parseMatrix([...rows,rows[1]]).errors.length,1,'duplicate outlet code blocked');
assert.throws(()=>api.parseMatrix([['Name'],['Bad']]),/Outlet Code/);
const staff={staff_id:'M22328',full_name:'Md Munnaf Ali'};
doc.querySelector('#root').innerHTML='<form id="ffAccountForm">'+api.markup(staff)+'</form>';
assert.equal(doc.querySelector('#ffEditOutletAccessPanel').hidden,true,'panel collapsed by default');
let calls=[],saved=false;
w.confirm=()=>true;
w.XLSX={
 read:()=>({SheetNames:['Outlets'],Sheets:{Outlets:{}}}),
 utils:{sheet_to_json:()=>rows}
};
const initial={active_total:2,inactive_total:1,can_sell:true,
 outlets:[
  {code:'00125',name:'Supermarket One',category:'NSK',total_sku:5,active:true},
  {code:'002',name:'Supermarket Two',category:'Giant',total_sku:0,active:true},
  {code:'003',name:'Old Inactive Outlet',category:'Other',total_sku:0,active:false}
 ]};
const client={rpc:async(name,params)=>{
 assert.equal(name,'ffh_owner_outlet_access');
 assert.equal(params.target_staff,'M22328');
 calls.push(params);
 if(params.action==='list')return{data:initial,error:null};
 if(params.action==='import'){saved=true;assert.equal(params.payload.rows.length,2);
  return{data:{...initial,imported:2,active_total:4},error:null};}
 return{data:null,error:{message:'Invalid'}};
}};
api.wire({form:doc.querySelector('#ffAccountForm'),staff,client,onRefresh:()=>{}});
(async()=>{
 doc.querySelector('#ffEditOutletAccessOpen').click();
 await new Promise(r=>setTimeout(r,10));
 assert.equal(doc.querySelector('#ffEditOutletAccessPanel').hidden,false);
 assert.match(doc.querySelector('#ffOutletAccessRows').textContent,/TOTAL OUTLETS: 2/);
 assert.equal(doc.querySelectorAll('.ffOutletListRow').length,3);
 assert.match(doc.querySelector('.ffOutletListRow').textContent,/1\.Supermarket One/);
 const input=doc.querySelector('#ffOutletExcelFile'),file=new w.File(['fake'],'outlets.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 file.arrayBuffer=async()=>new ArrayBuffer(4);
 Object.defineProperty(input,'files',{value:[file],configurable:true});
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
 await new Promise(r=>setTimeout(r,10));
 assert.equal(doc.querySelector('#ffOutletUploadSave').disabled,false);
 assert.match(doc.querySelector('#ffOutletExcelPreview').textContent,/PREVIEW: 2 outlet/);
 doc.querySelector('#ffOutletUploadSave').click();
 await new Promise(r=>setTimeout(r,10));
 assert.equal(saved,true);
 assert.match(doc.querySelector('#ffOutletAccessStatus').textContent,/Saved 2 outlets/);
 console.log('PASS Outlet Access: owner form, existing serial list, counts, Excel parsing, no data erasure, guarded import');
})().catch(e=>{console.error(e);process.exit(1)});
