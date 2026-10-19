(function(root){'use strict';
const n=x=>Math.max(0,Number(x)||0),round=x=>Math.round(x*100)/100;
function active(x,day){return x.active!==false&&!!(x.startDate||x.start_date)&&!!(x.endDate||x.end_date)&&day>=(x.startDate||x.start_date)&&day<=(x.endDate||x.end_date);}
function pace(target,sales,day){const days=new Date(Date.UTC(+day.slice(0,4),+day.slice(5,7),0)).getUTCDate(),remainingDays=days-Number(day.slice(8))+1,shortfall=round(Math.max(0,n(target)-n(sales)));return {shortfall,remainingDays,daily:round(shortfall/remainingDays)};}
function visibleIncome(viewer,p){if(!viewer||!p)return false;return viewer.id==='M21954'||viewer.id===p.id||((viewer.can_manage||viewer.mode==='MANAGER')&&!p.can_manage&&!['MANAGER','MANAGER+SR'].includes(p.role));}
function tierCommission(sales,target,rule){sales=n(sales);target=n(target);if(!target||!rule)return 0;const low=n(rule.lowerLimit),high=n(rule.upperLimit);if(low>=high||high<=0)return 0;const ratio=sales/target*100;if(ratio<=low)return round(sales*n(rule.lowerRate)/100);if(ratio<=high)return round(sales*n(rule.middleRate)/100);const cap=target*high/100;return round(cap*n(rule.middleRate)/100+(sales-cap)*n(rule.upperRate)/100);}
const api={active,pace,visibleIncome,tierCommission};if(typeof module==='object')module.exports=api;else root.FFH_HOME_CORE=api;
})(typeof window==='undefined'?globalThis:window);
