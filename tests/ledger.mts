import assert from 'node:assert/strict';
import {initialHome,splitCents,balances,settlements,roster,canSubmitTask} from '../lib/home.ts';
const h=initialHome('qa@homeforce.local');
assert.deepEqual(splitCents(100,['m1','m2','m3']).map(x=>x.cents),[34,33,33]);
assert.throws(()=>splitCents(50,[]));assert.throws(()=>splitCents(50,['m1','m1']));
h.entries.push({id:'1',kind:'expense',title:'market',date:'2026-10-23',amount:12000,paidBy:'m1',to:'',shares:splitCents(12000,h.members.map(m=>m.id)),category:'market',proof:'',by:'m1',createdAt:''});
assert.equal(balances(h).m1,10000);assert.equal(balances(h).m2,-2000);assert.equal(Object.values(balances(h)).reduce((a,b)=>a+b,0),0);
h.entries.push({id:'2',kind:'transfer',title:'repaid',date:'2026-10-23',amount:2000,paidBy:'m2',to:'m1',shares:[],category:'',proof:'',by:'m2',createdAt:''});assert.equal(balances(h).m2,0);assert.equal(balances(h).m1,8000);
h.entries.push({id:'3',kind:'loan',title:'loan',date:'2026-10-23',amount:5000,paidBy:'m3',to:'m4',shares:[],category:'',proof:'',by:'m3',createdAt:''});assert.equal(balances(h).m3,3000);assert.equal(balances(h).m4,-7000);
for(const s of settlements(h)){h.entries.push({id:crypto.randomUUID(),kind:'transfer',title:'settle',date:'2026-10-23',amount:s.cents,paidBy:s.from,to:s.to,shares:[],category:'',proof:'',by:s.from,createdAt:''});}assert.ok(Object.values(balances(h)).every(x=>x===0));
const tasks=roster('2026-10-19',28);assert.equal(tasks.filter(t=>t.title.includes('পরিষ্কার')).length,4);assert.ok(tasks.filter(t=>t.title.includes('পরিষ্কার')).every(t=>new Date(t.date).getUTCDay()===0));
assert.equal(tasks.find(t=>t.date==='2026-10-19'&&t.title==='সকালের ভাত')?.assignee,'m6');assert.equal(tasks.find(t=>t.date==='2026-10-20'&&t.title==='রাতের রান্না')?.team,1);assert.equal(tasks.find(t=>t.date==='2026-10-25'&&t.title.includes('পরিষ্কার'))?.team,1);assert.deepEqual(tasks.find(t=>t.date==='2026-11-15'&&t.title.includes('পরিষ্কার'))?.memberIds,['m1','m3']);assert.equal(roster('2026-10-19',28,tasks).length,0);
console.log('PASS: exact splits, balanced ledger, repayments, loans, settlement, weekly meal template, four-week Sunday rotation, duplicate roster prevention');

const assigned=tasks.find(t=>t.date==='2026-10-19'&&t.title==='সকালের ভাত')!;
assert.equal(canSubmitTask(h,'m6',assigned),true);assert.equal(canSubmitTask(h,'m1',assigned),false);assert.equal(canSubmitTask(h,'m1',assigned,true),true);
h.members.find(m=>m.id==='m6')!.canTask=false;assert.equal(canSubmitTask(h,'m6',assigned),false);
const combined=tasks.find(t=>t.date==='2026-11-15'&&t.title.includes('পরিষ্কার'))!;assert.equal(canSubmitTask(h,'m1',combined),true);assert.equal(canSubmitTask(h,'m3',combined),true);assert.equal(canSubmitTask(h,'m4',combined),false);
console.log('PASS: assigned-member permission, owner override, revoked task permission, combined cleaning responsibility');
