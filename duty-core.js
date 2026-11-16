/* Shared, testable GPS stop detection. A stop is an estimate, never proof of conduct. */
(function(root){
'use strict';
function distance(a,b){const r=Math.PI/180,x=(b.latitude-a.latitude)*r,y=(b.longitude-a.longitude)*r;const z=Math.sin(x/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(y/2)**2;return 6371000*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));}
function valid(p,maxAccuracy){if(!p)return false;const lat=Number(p.latitude),lon=Number(p.longitude),accuracy=Number(p.accuracy_m),time=Date.parse(p.captured_at);return p.latitude!=null&&p.longitude!=null&&p.accuracy_m!=null&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180&&Number.isFinite(accuracy)&&accuracy>=0&&accuracy<=maxAccuracy&&Number.isFinite(time)&&(!('speed_mps' in p)||p.speed_mps==null||(Number.isFinite(Number(p.speed_mps))&&Number(p.speed_mps)>=0));}
function stops(points){const out=[];let run=null,last=null;const finish=()=>{if(run&&run.end-run.start>=60000)out.push({...run,minutes:Math.floor((run.end-run.start)/60000)});run=null;};
 for(const p of points){const time=Date.parse(p.captured_at);if(!valid(p,50)){finish();last=null;continue;}
 if(last&&(time<=Date.parse(last.captured_at)||time-Date.parse(last.captured_at)>180000)){finish();last=null;}
 if(p.speed_mps!=null&&Number(p.speed_mps)>.8){finish();last=p;continue;}
 if(!run)run={latitude:Number(p.latitude),longitude:Number(p.longitude),start:time,end:time,accuracy_m:Number(p.accuracy_m)};
 else if(distance(run,p)<=Math.max(30,Math.min(50,Number(p.accuracy_m))))run.end=time;
 else{finish();run={latitude:Number(p.latitude),longitude:Number(p.longitude),start:time,end:time,accuracy_m:Number(p.accuracy_m)};}
 last=p;
 }finish();return out;
}
function segments(points){const lines=[];let line=[],last=null;const finish=()=>{if(line.length>1)lines.push(line);line=[];};for(const p of points){if(!valid(p,100)){finish();last=null;continue;}const time=Date.parse(p.captured_at);if(last&&(time<=Date.parse(last.captured_at)||time-Date.parse(last.captured_at)>180000))finish();line.push([Number(p.latitude),Number(p.longitude)]);last=p;}finish();return lines;}
const api={distance,stops,segments};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FFH_DUTY_CORE=api;
})(typeof window!=='undefined'?window:globalThis);
