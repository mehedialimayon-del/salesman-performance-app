const assert=require('node:assert/strict');const {stops,segments}=require('../duty-core.js');const start=Date.parse('2026-10-05T23:00:00Z');const p=(sec,extra={})=>({latitude:3.139,longitude:101.687,accuracy_m:8,speed_mps:0,captured_at:new Date(start+sec*1000).toISOString(),...extra});
assert.equal(stops([p(0),p(30)]).length,0,'short pauses are not stops');
assert.equal(stops([p(0),p(60),p(120)])[0].minutes,2);
assert.equal(stops(Array.from({length:7},(_,i)=>p(i*60)))[0].minutes,6);
assert.equal(stops([p(0,{speed_mps:6}),p(120,{speed_mps:6})]).length,0,'moving traffic is not stationary');
assert.equal(stops([p(0),p(60,{accuracy_m:200}),p(120)]).length,0,'poor fixes must not fabricate stops');
assert.equal(stops([p(0),p(600)]).length,0,'tracking gap must not fabricate dwell time');
assert.equal(segments([p(0),p(60),p(600),p(660)]).length,2,'do not join routes across gaps');
assert.equal(stops([p(0),p(60),p(120,{latitude:3.15}),p(180,{latitude:3.15})]).length,2);
assert.deepEqual(stops([p(0),p(60),p(30),p(120)]).map(x=>x.minutes),[1,1],'out-of-order timestamps split dwell windows rather than joining them');
assert.equal(segments([p(0),p(60),p(30),p(120)]).length,2,'out-of-order timestamps split route lines');
for(const invalid of [{latitude:91},{longitude:181},{latitude:null},{accuracy_m:null},{accuracy_m:-1},{accuracy_m:'invalid'},{captured_at:'invalid'},{speed_mps:-2}]){
 assert.equal(stops([p(0),p(60,invalid),p(120)]).length,0,'invalid fix must interrupt stop');
 assert.equal(segments([p(0),p(60,invalid),p(120)]).length,0,'invalid fix must interrupt route');
}
console.log('Duty GPS stop/gap regression: PASS');
