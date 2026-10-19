/* Shared completion receipt for every Excel/PDF export. Native writes alone can confirm a save. */
(function(root){'use strict';
const original=root.ffhSafeDownload;if(typeof original!=='function')return;
const parts=d=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));
const stamp=d=>{const p=parts(d);return `${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}${p.second}-MYT`;};
function receipt(result,time){
 document.querySelector('#ffDownloadReceipt')?.remove();const box=document.createElement('aside');box.id='ffDownloadReceipt';box.setAttribute('role','status');box.setAttribute('aria-live','polite');
 const title=document.createElement('strong');title.textContent=result.saved?'✓ File saved · ফাইল সংরক্ষিত':'↓ Download sent to browser';box.append(title);
 const name=document.createElement('p');name.textContent=result.filename;box.append(name);
 const info=document.createElement('p');info.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'medium'}).format(time)+' MYT · '+(result.saved?(result.location||'Downloads / FieldForce Hub'):'Check your browser Downloads; save completion is not confirmed here.');box.append(info);
 if(result.saved&&root.FieldForceNative?.openDownload){const open=document.createElement('button');open.className='primary';open.textContent='OPEN FILE · ফাইল খুলুন';open.onclick=async()=>{try{await root.FieldForceNative.openDownload(JSON.stringify({filename:result.filename}));}catch(e){info.textContent=e.message||String(e);}};box.append(open);}
 const close=document.createElement('button');close.className='secondary';close.textContent='CLOSE';close.onclick=()=>box.remove();box.append(close);document.body.append(box);
}
root.ffhSafeDownload=async function(blob,filename){
 document.querySelector('#ffDownloadReceipt')?.remove();const started=new Date(),dot=filename.lastIndexOf('.'),suffix='-'+stamp(started);filename=dot>0?filename.slice(0,dot)+suffix+filename.slice(dot):filename+suffix;
 const result=await original(blob,filename);if(!result?.saved&&!result?.started)throw Error('Download was not confirmed. Retry.');const time=new Date();receipt(result,time);return {...result,savedAt:time.toISOString(),timeZone:'Asia/Kuala_Lumpur'};
};
})(window);
