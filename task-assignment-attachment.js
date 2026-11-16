/* Assignment files are independent of the proof an assignee submits. */
window.FFH_TASK_ASSIGNMENT_FILES = (() => {
  'use strict';
  const bucket = 'ffh-task-assignments';
  const allowed = /\.(jpe?g|png|webp|gif|heic|heif|avif|pdf|docx?|xlsx?)$/i;
  const privatePath = /^task-assignments\/[a-z0-9._-]+\/[a-z0-9-]+\.[a-z0-9]+$/;
  const attachmentLine = /(?:^|\r?\n)Assignment attachment:[ \t]*(https:\/\/[^\s]+|task-assignments\/[^\s]+)[ \t]*$/;
  const forms = new WeakSet();

  function bind(form, viewerId, cloud) {
    if (!form || !viewerId || !cloud || forms.has(form)) return;
    const proof = form.elements.proofMode?.closest('label');
    const description = form.elements.description;
    if (!proof || !description) return;
    forms.add(form);

    const section = document.createElement('section');
    section.className = 'ffTaskAssignAttachment';
    section.innerHTML = '<label>Assignment attachment (optional)<input type="file" name="ffAssignmentFile" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></label>'
      + '<small>Instruction photo or document for the assignee. Maximum 6 MB.</small><p role="status"></p>';
    proof.before(section);
    const input = section.querySelector('input');
    const feedback = section.querySelector('[role="status"]');

    let uploaded;
    let sending = false;
    let resuming = false;
    form.addEventListener('submit', async event => {
      if (resuming) return;
      const file = input.files?.[0];
      if (!file) {
        if (uploaded) description.value = description.value.replace(attachmentLine, '').trimEnd();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (sending) return;

      const extension = file.name.match(allowed)?.[0].slice(1).toLowerCase();
      if (!extension || !file.size || file.size > 6000000) {
        feedback.textContent = 'Choose a supported file up to 6 MB.';
        return;
      }

      const submit = event.submitter || form.querySelector('button[type="submit"], button.primary');
      const previousDisabled = submit?.disabled;
      let submitted = false;
      sending = true;
      if (submit) submit.disabled = true;
      feedback.textContent = 'Uploading assignment attachment…';
      try {
        if (uploaded?.file !== file) {
          const owner = String(viewerId).toLowerCase();
          const path = 'task-assignments/' + owner + '/' + crypto.randomUUID() + '.' + extension;
          const {error} = await cloud.storage.from(bucket).upload(path, file, {contentType:file.type || 'application/octet-stream',upsert:false});
          if (error) throw error;
          uploaded = {file,path};
        }
        if (!form.isConnected) return;
        if (input.files?.[0] !== file) {
          feedback.textContent = 'The file changed. Submit again to use the selected file.';
          return;
        }
        description.value = [description.value.replace(attachmentLine, '').trimEnd(), 'Assignment attachment: ' + uploaded.path].filter(Boolean).join('\n\n');
        feedback.textContent = 'Attachment uploaded.';
        if (!form.reportValidity()) return;
        if (submit) submit.disabled = previousDisabled;
        resuming = true;
        try {
          form.requestSubmit(submit || undefined);
          submitted = true;
        }
        finally { resuming = false; }
      } catch (error) {
        feedback.textContent = 'Attachment upload failed: ' + error.message;
      } finally {
        sending = false;
        if (submit?.isConnected && !submitted) submit.disabled = previousDisabled;
      }
    },true);
  }

  async function download(path, cloud) {
    if (!privatePath.test(path)) throw new Error('Invalid assignment file.');
    const {data,error} = await cloud.storage.from(bucket).download(path);
    if (error) throw error;
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assignment-attachment.' + path.split('.').at(-1);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  return {bind,download,attachmentLine,privatePath};
})();
