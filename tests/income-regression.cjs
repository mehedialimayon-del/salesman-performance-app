const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf('function ffhProductIncome(');
const end = source.indexOf('function income(){', start);
assert.ok(start >= 0 && end > start);
const db = {
 incentives: [{sr:'ALL',name:'100 carton reward',groups:[{skus:['SKU1'],target:100,reward:50}]}],
 sales:[
 {sr:'M21954',status:'Delivered',date:'2026-10-05',sku:'SKU1',qty:100},
 {sr:'M21954',status:'Delivered',date:'2026-09-05',sku:'SKU1',qty:200},
 {sr:'M22075',status:'Delivered',date:'2026-10-05',sku:'SKU1',qty:200},
 {sr:'M21954',status:'Pending',date:'2026-10-05',sku:'SKU1',qty:500}
 ],
 managerIncome:{basic:2100,fixed:0,targetQty:300,reward:50,teamCommissionRate:0},
 adjustments:[]
};
const C=require('../earnings-core.js');const productIncome = new Function('db','FFH_EARNINGS_CORE',source.slice(start,end)+'return ffhProductIncome;')(db,C);
assert.equal(productIncome('M21954','2026-10')[0].amount,50);
const P=require('../personal-income');
const context={viewerId:'M21954',currentMonth:'2026-10',today:'2026-10-05',db,people:[{id:'M21954',can_sell:true,can_manage:true,zone:'Z'},{id:'M22075',can_sell:true,zone:'Z'}],rules:{},target:()=>100000};
const result=P.build(context,'M21954','2026-10','2026-10-01','2026-10-05');
assert.equal(result.basic,2100);assert.equal(result.bonus,100);assert.equal(result.total,2200);
db.incentives[0].active=false;
assert.equal(productIncome('M21954','2026-10').length,0);
console.log('PASS: basic once; own 50 + team 50; prior month/other SR/pending/inactive excluded');
