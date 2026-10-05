(function(root){'use strict';
const money=n=>Math.round((+n||0)*100)/100;
function commission(delivered,actual){delivered=Math.max(0,+delivered||0);actual=+actual||0;if(actual<=0)return 0;const ratio=delivered/actual;return money(ratio<.8?delivered*.005:ratio<=1?delivered*.01:actual*.01+(delivered-actual)*.02);}
function offerStatus(x,day){if(x.active===false)return 'Inactive';if(day<x.startDate)return 'Upcoming';if(day>x.endDate)return 'Expired';return 'Active';}
function eligibleSale(s,x){if(s.status!=='Delivered'||s.date<x.startDate||s.date>x.endDate)return false;if(s.deliveredAt){const localDay=new Date(Date.parse(s.deliveredAt)+8*3600000).toISOString().slice(0,10);if(localDay<x.startDate||localDay>x.endDate)return false;}return true;}
function progress(sales,x,g,id){return sales.filter(s=>s.sr===id&&eligibleSale(s,x)&&(g.mode==='sales'||(g.skus||[]).includes(s.sku))).reduce((n,s)=>n+(g.mode==='sales'?(+s.deliveredAmount||0):(+s.qty||0)),0);}
function rewards(sales,offers,id,m){return offers.filter(x=>x.active!==false&&(x.sr===id||x.sr==='ALL')&&x.endDate.slice(0,7)===m).flatMap(x=>(x.groups||[]).map(g=>{const got=progress(sales,x,g,id);return{title:x.name+' · '+g.name,kind:g.mode==='sales'?'Sales Incentive':'Product Incentive',qty:got,target:+g.target,unit:g.mode==='sales'?'RM':'cartons',amount:got>=+g.target&&+g.target>0?money(g.reward):0};})).filter(x=>x.amount>0);}
function net(entries,id,m){return money(entries.filter(x=>(!id||x.staff_id===id)&&x.entry_date.slice(0,7)===m&&x.status==='Approved').reduce((n,x)=>n+(x.kind==='Penalty'?-1:1)*x.amount,0));}
const api={commission,offerStatus,eligibleSale,progress,rewards,net,money};if(typeof module==='object')module.exports=api;else root.FFH_EARNINGS_CORE=api;
})(typeof window==='undefined'?globalThis:window);
