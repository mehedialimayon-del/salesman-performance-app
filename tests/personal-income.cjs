const assert=require('node:assert/strict'),P=require('../personal-income'),R=require('../reports-core'),E=require('../earnings-core');
const people=[{id:'M',name:'Manager',can_manage:true,can_sell:false,zone:'Z'},...['A','B','C'].map(id=>({id,name:id,can_sell:true,zone:'Z'})),{id:'X',name:'Foreign',can_sell:true,zone:'X'}];
const db={sales:['A','B','C'].map((sr,i)=>({id:sr,sr,date:'2026-10-02',status:'Delivered',deliveredAmount:40000,qty:10})),incomeMonthlySetup:{'2026-10':{M:{basic:3000,fuel:200},A:{basic:2350},B:{basic:2350},C:{basic:2350}}},managerMonthlyRules:{'2026-10':{M:{salesCommissionRate:.25,growthCommissionRate:70}}},adjustments:[{sr:'A',month:'2026-10',kind:'Incentive',amount:9999},{sr:'M',month:'2026-10',kind:'Penalty',amount:20}],incentives:[]};
db.sales.push({id:'foreign',sr:'X',date:'2026-10-02',status:'Delivered',deliveredAmount:999999},{id:'pending',sr:'A',date:'2026-10-02',status:'Pending',orderAmount:999999});
const c={db,people,allowedIds:['A','B','C','X'],viewerId:'M',currentMonth:'2026-10',today:'2026-10-20',baselines:['A','B','C'].map(staff_id=>({staff_id,month:'2026-09',total_sales:100000/3,daily_sales:{}})),target:()=>50000,outlets:()=>[],rules:{},earnings:E};
let r=P.build(c,'M','2026-10');assert.equal(r.d,120000);assert.equal(r.previous,100000);assert.equal(r.salesCommission,300);assert.equal(r.growthCommission,14000);assert.equal(r.total,17480);assert.equal(r.ownCommission,0);assert.equal(r.basic,3000);
const model=R.build(c,{from:'2026-10-01',to:'2026-10-20',sr:'A',chain:'MISSING',outlet:'',product:'',manager:'',zone:''});
assert.deepEqual(model.incomeIds,['M']);const rows=model.rows('Income Breakdown');assert.equal(rows.length,2);assert.equal(rows[1][2],3000);assert.equal(rows[1][10],17480,'sales filters do not replace manager pay with SR payroll');
const sr=R.build(c,{from:'2026-10-01',to:'2026-10-20',incomeStaff:'A'}).rows('Income Breakdown');assert.equal(sr.length,2);assert.equal(sr[1][2],2350);assert.equal(sr[1][6],200);assert.equal(sr[1][11],'SR');
const noHistory=P.build({...c,baselines:[]},'M','2026-10');assert.equal(noHistory.growthCommission,null);assert.equal(noHistory.growthPending,true);assert.equal(noHistory.total,3480,'no invented growth payout without history');
db.sales[0].deliveredAmount=10000;db.sales[1].deliveredAmount=10000;db.sales[2].deliveredAmount=10000;r=P.build(c,'M','2026-10');assert.equal(r.growthCommission,0);assert.equal(r.salesCommission,75);
db.managerMonthlyRules['2026-10'].M.salesCommissionRate=0;db.managerMonthlyRules['2026-10'].M.growthCommissionRate=0;r=P.build(c,'M','2026-10');assert.equal(r.salesCommission,0);assert.equal(r.growthCommission,0);
const old=P.build(c,'M','2026-09');assert.equal(old.basic,0,'October salary is not reused in September');assert.equal(old.setupMissing,true);
console.log('PASS manager personal salary, exact .25% sales + 70% positive sales growth, scoped team, SR individual pay, reports, missing history, zero rates and month isolation');
db.managerMonthlyRules['2026-10'].M.basicInclusive=true;
db.managerMonthlyRules['2026-10'].M.foodLow=100;
db.managerMonthlyRules['2026-10'].M.fixed=150;
const combined=P.build(c,'M','2026-10');
assert.equal(combined.fuel+combined.house+combined.food+combined.fixed,0,'combined Basic does not double-count allowances');
assert.equal(combined.total,combined.basic+combined.comm+combined.pos+combined.bonus-combined.pen);
console.log('PASS combined Basic and net income without duplicate food, fuel, rent or fixed amounts');

const scopedPeople=[
 {id:'M21954',name:'Owner',role:'MANAGER',zone:'PRIMARY'},
 {id:'A',role:'SR',zone:'PRIMARY',manager_id:'M21954'},
 {id:'B',role:'SR',zone:'PRIMARY',manager_id:'OTHER'},
 {id:'C',role:'SR',zone:'OTHER',manager_id:'OTHER'},
 {id:'D',role:'SR',zone:'PRIMARY',manager_id:'M21954',active:false}
];
const scopeInput={people:scopedPeople,viewerId:'M21954',db:{sales:scopedPeople.map((p,i)=>({sr:p.id,date:'2026-11-14',status:'Delivered',deliveredAmount:(i+1)*100}))},target:()=>50000};
const salesScopes=P.performanceScopes(scopeInput,'M21954','2026-11','2026-11-15');
assert.deepEqual(salesScopes.map(({id,ids,d,t})=>({id,ids,d,t})),[
 {id:'own',ids:['M21954'],d:100,t:50000},
 {id:'assigned',ids:['A'],d:200,t:50000},
 {id:'company',ids:['A','B','C'],d:900,t:150000}
]);
assert.deepEqual(P.performanceScopes({...scopeInput,viewerId:'A'},'A','2026-11','2026-11-15').map(x=>x.id),['own']);
assert.deepEqual(P.performanceScopes({...scopeInput,viewerId:'A'},'B','2026-11','2026-11-15'),[]);
console.log('PASS personal, assigned-SR and company targets use distinct scopes; no cross-SR income access');

// Commission boundaries: 80% is the first 1% tier; over-target sales earn 2% only on excess.
assert.equal(E.commission(79999,100000),400);
assert.equal(E.commission(80000,100000),800);
assert.equal(E.commission(100000,100000),1000);
assert.equal(E.commission(120000,100000),1400);
// Manager with own route: own route earns SR commission; manager base excludes own route.
const hybridPeople=[{id:'H',name:'Hybrid',role:'MANAGER+SR',zone:'Z',can_manage:true,can_sell:true},{id:'S',name:'Staff',role:'SR',zone:'Z',can_sell:true}];
const hybridDb={sales:[{id:'h-sale',sr:'H',date:'2026-10-02',status:'Delivered',deliveredAmount:100000},{id:'s-sale',sr:'S',date:'2026-10-02',status:'Delivered',deliveredAmount:200000}],incomeMonthlySetup:{'2026-10':{H:{basic:0}}},managerMonthlyRules:{'2026-10':{H:{salesCommissionRate:.25,growthCommissionRate:0}}},adjustments:[],incentives:[]};
const hybrid=P.build({db:hybridDb,people:hybridPeople,viewerId:'H',allowedIds:['H','S'],currentMonth:'2026-10',today:'2026-10-20',baselines:[],target:()=>100000,outlets:()=>[],rules:{},earnings:E},'H','2026-10');
assert.equal(hybrid.ownCommission,1000);
assert.equal(hybrid.salesCommission,500);
assert.equal(hybrid.comm,1500);
console.log('PASS 80% SR boundary, over-target tier, and manager+SR own-route exclusion');
