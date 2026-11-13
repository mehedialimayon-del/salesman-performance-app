const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ctx={};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../soa-core.js'),'utf8'),ctx);const core=ctx.FFH_SOA_CORE;
const rows=[{date:'2026-01-01',description:'Invoice',debit:'1657.12',credit:0},{date:'2026-01-03',description:'Payment',credit:'1657.12'},{date:'2026-01-02',description:'Invoice',debit:'1171.00'}];
const result=core.statement(rows,{from:'2026-01-02',to:'2026-01-03'});
assert.equal(result.openingBalance,'1657.12');assert.equal(result.closingBalance,'1171.00');assert.equal(result.rows.length,2);assert.equal(result.rows[0].balance,'2828.12');assert.equal(result.rows[1].balance,'1171.00');
assert.equal(core.statement([]).closingBalance,'0.00');
assert.throws(()=>core.statement([{date:'2026-01-01',debit:1,credit:2}]),/both Debit and Credit/);
assert.throws(()=>core.statement([], {from:'2026-02-01',to:'2026-01-01'}),/From Date/);
assert.match(core.csv(result.rows),/Date.*Description.*Reference/);
console.log('SOA core tests passed');
assert.equal(core.dateKey('29/02/2024'),'2024-02-29');
assert.throws(()=>core.dateKey('2025-02-29'),/Invalid calendar date/);
assert.throws(()=>core.dateKey('2026-13-01'),/Invalid calendar date/);
assert.equal(core.statement([{date:'2026-01-01',debit:'0.10'},{date:'2026-01-02',credit:'0.03'}],{opening:'0.02'}).closingBalance,'0.09');

// Regression: date boundaries, zero amounts, running balances, CSV escaping.
assert.equal(core.statement([{date:'2026-01-01',debit:'10.00'},{date:'2026-01-31',credit:'2.50'},{date:'2026-02-01',debit:'99.00'}],{from:'2026-01-01',to:'2026-01-31',opening:'5.00'}).closingBalance,'12.50');
assert.equal(core.statement([{date:'2026-01-01',debit:'1.00'},{date:'2026-01-02',credit:'0.50'}],{from:'2026-01-02',to:'2026-01-02',opening:'2.00'}).openingBalance,'3.00');
assert.equal(core.statement([{date:'2026-01-01',debit:'10.00',credit:'0.00'}]).rows[0].balance,'10.00');
assert.throws(()=>core.cents('1.234'),/Invalid RM amount/);
assert.throws(()=>core.cents('Infinity'),/Invalid RM amount/);
assert.throws(()=>core.dateKey('31/04/2026'),/Invalid calendar date/);
assert.ok(core.csv([{date:'2026-01-01',description:'PO "A", New',reference:'X',debit:'1.00',credit:'0.00',balance:'1.00'}]).includes('"PO ""A"", New"'));
