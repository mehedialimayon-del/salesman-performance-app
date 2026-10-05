/* Shared, testable GPS stop detection. A stop is an estimate, never proof of conduct. */
(function(root){
'use strict';
function distance(a,b){const r=Math.PI/180,x=(b.latitude-a.latitude)*r,y=(b.longitude-a.longitude)*r;const z=Math.sin(x/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(y/2)**2;return 6371000*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));}
function stops(points){const out=[];let run=null,last=null;const finish=()=>{if(run&&run.end-run.start>=60000)out.push({...run,minutes:Math.floor((run.end-run.start)/60000)});run=null;};
 for(const p of points){const time=Date.parse(p.captured_at);if(!Number.isFinite(time)||!Number.isFinite(Number(p.latitude))||!Number.isFinite(Number(p.longitude))||p.accuracy_m>50){finish();last=null;continue;}
 if(last&&time-Date.parse(last.captured_at)>180000){finish();last=null;}
 if(p.speed_mps!=null&&p.speed_mps>.8){finish();last=p;continue;}
 if(!run)run={latitude:Number(p.latitude),longitude:Number(p.longitude),start:time,end:time,accuracy_m:Number(p.accuracy_m)};
 else if(distance(run,p)<=Math.max(30,Math.min(50,Number(p.accuracy_m))))run.end=time;
 else{finish();run={latitude:Number(p.latitude),longitude:Number(p.longitude),start:time,end:time,accuracy_m:Number(p.accuracy_m)};}
 last=p;
 }finish();return out;
}
function segments(points){const lines=[];let line=[],last=null;for(const p of points){if(p.accuracy_m>100)continue;if(last&&Date.parse(p.captured_at)-Date.parse(last.captured_at)>180000){if(line.length>1)lines.push(line);line=[];}line.push([p.latitude,p.longitude]);last=p;}if(line.length>1)lines.push(line);return lines;}
const api={distance,stops,segments};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FFH_DUTY_CORE=api;
})(typeof window!=='undefined'?window:globalThis);
