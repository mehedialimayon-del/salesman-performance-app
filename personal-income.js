/* Personal pay is independent of the selected sales/report team. */
(function(root){'use strict';
const E=root.FFH_EARNINGS_CORE||(typeof require==='function'?require('./earnings-core'):null),D=root.FFH_DAILY_CORE||(typeof require==='function'?require('./daily-performance-core'):null),B=root.FFH_COMPARISON_CORE||(typeof require==='function'?require('./dashboard-comparison'):null);
const n=x=>Number(x)||0,money=E.money;
function build(c,id,m,from=m+'-01',to=m+'-31'){
 const people=c.people.map(p=>({...p,id:p.id||p.staff_id,zone:p.zone||p.zone_id})),p=people.find(p=>p.id===id);if(!p)throw Error('Income staff is outside your access.');
 const manager=p.can_manage===true||['MANAGER','MANAGER+SR'].includes(p.role),seller=p.can_sell===true||['SR','MANAGER+SR'].includes(p.role),db=c.db,monthly=db.incomeMonthlySetup?.[m]?.[id],setup=monthly||(m===c.currentMonth?db.incomeSetup?.[id]:null)||{},rule=db.managerMonthlyRules?.[m]?.[id]||(id===c.viewerId&&m===c.currentMonth?db.managerIncome:null)||{},access=(c.zoneAccess||[]).filter(x=>x.staff_id===id).map(x=>x.zone_id),zones=[p.zone,...(p.accessibleZones||[]),...access],allZones=id==='M21954'||p.ownerAccess||p.accessAll||zones.includes('*');
 const ids=manager?people.filter(x=>x.active!==false&&(x.can_sell===true||['SR','MANAGER+SR'].includes(x.role))&&(!c.allowedIds||c.allowedIds.includes(x.id))&&(allZones||zones.includes(x.zone))).map(x=>x.id):[id];
 const daily=c.daily&&D?{...c.daily,people,sales:db.sales||[]}:null,raw=daily?D.rows(daily,ids,{combine:manager}):(db.sales||[]).filter(x=>ids.includes(x.sr)),day=x=>D?D.deliveryDay(x):x.date,rows=raw.map(x=>({...x,date:day(x)})),period=rows.filter(x=>x.status==='Delivered'&&x.date>=from&&x.date<=to&&x.date.startsWith(m)),delivered=money(period.reduce((a,x)=>a+n(x.deliveredAmount),0)),qty=money(period.filter(x=>x.countsTotal!==false).reduce((a,x)=>a+n(x.qty),0));
 const basic=n(setup.basic??(manager?rule.basic:undefined)??(!manager?c.rules?.basic:0)),fuel=n(setup.fuel??(!manager?c.rules?.fuel:0)),house=n(setup.houseRent??(!manager?c.rules?.houseRent:0)),food=manager?0:delivered>=n(c.rules?.foodThreshold||50000)?n(c.rules?.foodHigh):n(c.rules?.foodLow),fixed=manager?n(rule.fixed):0,target=n(c.target?.(id,m));
 const ownRows=daily?D.rows(daily,[id],{combine:false}):(db.sales||[]).filter(x=>x.sr===id),ownDelivered=money(ownRows.filter(x=>x.status==='Delivered'&&day(x)>=from&&day(x)<=to&&day(x).startsWith(m)).reduce((a,x)=>a+n(x.deliveredAmount),0)),ownCommission=seller?E.commission(ownDelivered,target):0;
 let previous=null,growth=null,growthCommission=null,salesCommission=0;
 const salesRate=n(rule.salesCommissionRate??0.25),growthRate=n(rule.growthCommissionRate??70);
 if(manager){
  const calc=B.build({month:m,asOf:to,today:c.today||to,ids,people,sales:rows,baselines:c.baselineError?[]:c.baselines||[],target:()=>0,planning:()=>0});previous=c.baselineError?null:calc.previousTotal;
  salesCommission=money(delivered*salesRate/100);growth=previous===null?null:money(Math.max(0,delivered-previous));growthCommission=growth===null?null:money(growth*growthRate/100);
 }
 const adj=(db.adjustments||[]).filter(x=>x.sr===id&&x.month===m&&(!x.date||x.date>=from&&x.date<=to)),pos=money(adj.filter(x=>x.kind!=='Penalty').reduce((a,x)=>a+n(x.amount),0)),pen=money(adj.filter(x=>x.kind==='Penalty').reduce((a,x)=>a+n(x.amount),0));
 const teamOffers=manager?(rule.groups||[]).map((g,i)=>({id:'manager-group-'+i,sr:id,name:g.name,startDate:g.startDate,endDate:g.endDate,active:true,groups:[g],audience:{kind:'team',staff_ids:[id],zone_ids:'ALL'}})):[],offers=[...(db.incentives||[]),...teamOffers].map(x=>({...x,startDate:x.startDate||(x.month||m)+'-01',endDate:x.endDate||(x.month||m)+'-31'}));
 const rewards=daily?D.rewards(daily,offers,id,m,E):E.rewards(db.sales||[],offers.filter(x=>!x.audience||D.audience(x,id,people)),id,m),bonus=money(rewards.filter(x=>!x.earnedDate||x.earnedDate>=from&&x.earnedDate<=to).reduce((a,x)=>a+n(x.amount),0)+(manager&&n(rule.targetQty)>0&&qty>=n(rule.targetQty)?n(rule.reward):0)),comm=money(ownCommission+salesCommission+n(growthCommission)),total=money(basic+fuel+house+food+fixed+comm+pos+bonus-pen);
 return {id,manager,seller,ids,setupMissing:!monthly&&!Object.keys(setup).length,basic,fuel,house,food,fixed,comm,pos,pen,bonus,total,d:delivered,t:target,qty,ownCommission,salesCommission,growthCommission,previous,growth,salesRate,growthRate,growthPending:manager&&previous===null&&growthRate>0,rewards};
}
const api={build};if(typeof module==='object')module.exports=api;else root.FFH_PERSONAL_INCOME=api;
})(typeof window==='undefined'?globalThis:window);
