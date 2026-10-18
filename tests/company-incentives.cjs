const assert=require('node:assert/strict'),C=require('../earnings-core.js');
const offer={sr:'S1',name:'Daily target',startDate:'2026-10-01',endDate:'2026-10-07',groups:[{name:'5k',mode:'sales',basis:'order',period:'daily',target:5000,reward:50}]};
const sales=[{id:'1',sr:'S1',date:'2026-10-01',createdAt:'2026-10-01T02:00:00Z',status:'Pending',orderAmount:5000},{id:'2',sr:'S1',date:'2026-10-02',createdAt:'2026-10-02T02:00:00Z',status:'Pending',orderAmount:5000},{id:'3',sr:'S1',date:'2026-10-03',createdAt:'2026-10-08T02:00:00Z',status:'Pending',orderAmount:99999}];
assert.equal(C.rewards(sales,[offer],'S1','2026-10').reduce((s,x)=>s+x.amount,0),100);
assert.equal(C.progress(sales,offer,offer.groups[0],'S1'),5000);
const delivered={...offer,groups:[{...offer.groups[0],basis:'delivered'}]};assert.equal(C.rewards(sales,[delivered],'S1','2026-10').length,0);
const across={...offer,endDate:'2026-11-03',groups:[{name:'10k',mode:'sales',basis:'order',target:10000,reward:100}]};assert.equal(C.rewards(sales.slice(0,2),[across],'S1','2026-10')[0].amount,100);assert.equal(C.rewards(sales.slice(0,2),[across],'S1','2026-11').length,0);
const out={...offer,groups:[{name:'coverage',mode:'outlets',basis:'order',target:2,reward:20}]};const os=sales.slice(0,2).map((x,i)=>({...x,outletCode:'O'+i}));assert.equal(C.rewards(os,[out],'S1','2026-10')[0].amount,20);os[1].outletCode='O0';assert.equal(C.rewards(os,[out],'S1','2026-10').length,0);
console.log('PASS order/delivery basis, each-day reward, late key-in exclusion, cross-month earning date, unique outlet coverage');
