/* Keep assignment attachments and completion proofs in separate task fields in the UI. */
(() => {
  'use strict';
  const allowed = /\.(jpe?g|png|webp|gif|heic|heif|avif|pdf|docx?|xlsx?)$/i;
  const forms = new WeakSet(), uploading = new WeakSet(), uploads = new WeakMap(), resume = new WeakSet();
  const attachmentLine = /(?:^|\r?\n)Assignment attachment:[ \t]*https:\/\/[^\s]+[ \t]*$/;

  function scan() {
    for (const form of document.querySelectorAll('form#taskForm, .ffTaskModalBody form')) {
      if (forms.has(form) || !form.elements.title || !form.elements.to || !form.elements.proofMode || !isMgr()) continue;
      const section = document.createElement('section');
      section.className = 'ffTaskAssignAttachment';
      section.innerHTML = '<label>Assignment attachment (optional)<input type="file" name="ffAssignmentFile" accept="image/*,.pdf,.doc,.docx,.xlsx,.xls"></label>'
        + '<small>Attach an instruction photo or document for the assignee. Maximum 6 MB.</small><p role="status"></p>';
      form.elements.proofMode.closest('label')?.before(section);
      forms.add(form);
    }
  }
  const observer = new MutationObserver(scan);
  const start = () => {observer.observe(document.body,{childList:true,subtree:true});scan();};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!forms.has(form) || resume.delete(form)) return;
    const input = form.elements.ffAssignmentFile;
    const file = input?.files?.[0], description = form.elements.description;
    if (!file) {
      if (uploads.has(form)) description.value = description.value.replace(attachmentLine,'').trimEnd();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (uploading.has(form)) return;
    const status = form.querySelector('.ffTaskAssignAttachment [role="status"]');
    if (!file.size || file.size > 6000000 || !allowed.test(file.name)) {
      status.textContent = 'Choose a supported image or document up to 6 MB.';
      return;
    }
    const submit = event.submitter || form.querySelector('button.primary');
    uploading.add(form);
    if (submit) submit.disabled = true;
    status.textContent = 'Uploading assignment attachment…';
    try {
      const previous = uploads.get(form);
      const url = previous?.file === file ? previous.url
        : await ffhUploadPublicFile(file,'task-assignments/'+ffhSafeName(user.id));
      uploads.set(form,{file,url});
      if (!form.isConnected || input.files?.[0] !== file) {
        status.textContent = 'Choose the attachment to submit.';
        return;
      }
      description.value = (description.value.replace(attachmentLine,'').trimEnd()+'\n\nAssignment attachment: '+url).trim();
      status.textContent = 'Attachment ready.';
      if (!form.reportValidity()) {
        status.textContent = 'Attachment ready. Complete the required fields.';
        return;
      }
      if (submit) submit.disabled = false;
      resume.add(form);
      form.requestSubmit(submit || undefined);
    } catch (error) {
      status.textContent = 'Attachment upload failed: '+error.message;
    } finally {
      uploading.delete(form);
      if (submit?.isConnected && resume.delete(form)) submit.disabled = false;
      if (submit?.isConnected && status.textContent !== 'Attachment ready.') submit.disabled = false;
    }
  },true);
})();
