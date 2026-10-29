const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={};
vm.runInNewContext(fs.readFileSync('claim-monthly.js','utf8'),{window,console,setTimeout,clearTimeout},{filename:'claim-monthly.js'});
const c=window.FFH_CLAIM_MONTHLY;
const rows=[
{id:'a',category:'Fuel Expenses',expense_date:'2026-10-01',amount:120,reason:'Station A'},
{id:'b',category:'Fuel Expenses',expense_date:'2026-10-11',amount:80,reason:'Station B'},
{id:'c',category:'Team Building',expense_date:'2026-10-12',amount:150,reason:'Team meal'},
{id:'d',category:'Training',expense_date:'2026-10-18',amount:150,reason:'New AC Training'}
];
const g=c.groupRows(rows);
assert.equal(g.count,4);
assert.equal(g.grandTotal,500);
assert.equal(g.groups.find(x=>x.category==='Fuel Expenses').total,200);
assert.equal(g.groups.find(x=>x.category==='Team Building').total,150);
assert.deepEqual(JSON.parse(JSON.stringify(c.monthBounds('2026-10'))),{from:'2026-10-01',to:'2026-10-31'});
assert.deepEqual(JSON.parse(JSON.stringify(c.monthBounds('2026-02'))),{from:'2026-02-01',to:'2026-02-28'});
assert.deepEqual(JSON.parse(JSON.stringify(c.monthBounds('2028-02'))),{from:'2028-02-01',to:'2028-02-29'});
const claim={kind:'Expense Claim',claim_month:'2026-10',status:'Approved',signature_png:'data:image/png;base64,abc',
lines:rows.map(x=>({receipt_id:x.id,excluded:false}))};
assert.equal(c.approvedForAll(rows,[claim],'2026-10'),claim);
assert.equal(c.approvedForAll([...rows,{id:'e',category:'Fuel Expenses',amount:5}], [claim],'2026-10'),null,'no partial signoff');
assert.equal(c.approvedForAll(rows,[{...claim,status:'Submitted'}],'2026-10'),null,'no forged approval');
assert.equal(c.approvedForAll(rows,[{...claim,signature_png:''}],'2026-10'),null,'missing signature');
const buyer=[{id:'buyer:one',category:'Buyer Entertainment',amount:30}];
assert.equal(c.approvedForAll(buyer,[{kind:'Buyer Entertainment Bill',claim_month:'2026-10',status:'Approved',signature_png:'data:image/png;base64,abc',lines:[{id:'one',receipt_id:null}]}],'2026-10')?.status,'Approved');
console.log('PASS monthly category math, leap years, complete-only manager signature, buyer claim grouping');
