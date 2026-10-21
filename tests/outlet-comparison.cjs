const assert=require('node:assert/strict'),C=require('../outlet-comparison.js');
const outlets=[{sr:'S1',code:'01',name:'Same code A'},{sr:'S2',code:'01',name:'Same code B'},{sr:'S1',code:'02',name:'Zero both'}];
const sale=(sr,date,value,code='01',status='Delivered')=>({sr,date,deliveredAmount:value,outletCode:code,status});
const data=C.build({outlets,asOf:'2026-10-21',sales:[sale('S1','2026-10-01',100),sale('S1','2026-09-01',200),sale('S1','2026-09-30',50),sale('S1','2026-10-02',999,'01','Pending Delivery'),sale('S2','2026-10-01',500),sale('S1','2026-10-31',900)]});
assert.equal(data[0].current,100);assert.equal(data[0].previous,200);assert.equal(data[0].previousFull,250);assert.equal(data[0].delta,-100);assert.equal(data[0].percent,-50);assert.equal(data[0].remaining,150);assert.equal(data[0].tone,'red');assert.equal(data[1].current,500);assert.equal(data[1].tone,'green');assert.equal(data[2].delta,0);assert.equal(data[2].tone,'green');assert.equal(data[2].zero,true);
console.log('PASS outlet-scoped current/previous cutoff, full-month recovery, code collisions across SRs, pending/future exclusion and green zero equality');
