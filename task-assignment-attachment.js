/* Task assignment attachment: uploads to existing ffh-public bucket before native task save. */
(()=>{'use strict';
const accepted='image/*,.pdf,.doc,.docx,.xlsx,.xls';
const enhanced=new WeakSet(), bypass=new WeakSet();
function enhance(form){
 if(enhanced.has(form))return;
 enhanced.add(form);
 const section=document.createElement('section');
 section.className='ffTaskAssignAttachment';
 section.innerHTML='<label>Assignment attachment (optional)<input type="file" name="ffAssignmentFile" accept="'+accepted+'"></label><small>Upload a reference photo or document for the assigned SR. Maximum 6 MB. This is separate from the SR completion proof.</small><p role="status" aria-live="polite"></p>';
 const proof=form.elements.proofMode?.closest('label');
 (proof||form.querySelector('button[type="submit"]'))?.insertAdjacentElement('beforebegin',section);
}
function scan(){document.querySelectorAll('form#taskForm, .ffTaskModalBody form').forEach(form=>{
 if(form.elements.title&&form.elements.to&&form.elements.proofMode)enhance(form);
});}
const observer=new MutationObserver(scan);
function start(){observer.observe(document.body,{childList:true,subtree:true});scan();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
document.addEventListener('submit',async e=>{
 const form=e.target;
 if(!form.matches('form#taskForm, .ffTaskModalBody form')||!form.elements.proofMode||!form.elements.title)return;
 if(bypass.has(form)){bypass.delete(form);return;}
 const file=form.querySelector('input[name="ffAssignmentFile"]')?.files?.[0];
 if(!file)return;
 e.preventDefault();e.stopImmediatePropagation();
 const status=form.querySelector('.ffTaskAssignAttachment [role="status"]');
 const submit=form.querySelector('button[type="submit"],button:not([type])');
 if(file.size>6000000){status.textContent='File too large. Maximum 6 MB.';return;}
 const allowed=/^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.|application\/msword|application\/vnd\.ms-excel)/i;
 if(!allowed.test(file.type)){status.textContent='Unsupported file type.';return;}
 if(submit)submit.disabled=true;
 status.textContent='Uploading assignment attachment…';
 try{
  if(typeof window.ffhUploadPublicFile!=='function')throw Error('Upload service is not available.');
  const url=await window.ffhUploadPublicFile(file,'task-assignments');
  let hidden=form.querySelector('input[name="assignmentAttachmentUrl"]');
  if(!hidden){hidden=document.createElement('input');hidden.type='hidden';hidden.name='assignmentAttachmentUrl';form.append(hidden);}
  hidden.value=url;
  status.textContent='Attachment uploaded. Saving task…';
  bypass.add(form);
  form.requestSubmit();
 }catch(error){status.textContent='Upload failed: '+(error.message||error)+'. Task was not submitted.';}
 finally{if(submit?.isConnected)submit.disabled=false;}
},true);
})();