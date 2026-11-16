'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');

async function main() {
  const dom = new JSDOM(`<form><label>Proof<select name="proofMode"><option>Photo</option></select></label>
    <textarea name="description">Check shelving</textarea><button type="submit">Assign</button></form>`, {runScripts:'outside-only',url:'https://test.fieldforce.app'});
  const {window} = dom;
  window.eval(fs.readFileSync('task-assignment-attachment.js', 'utf8'));
  const feature = window.FFH_TASK_ASSIGNMENT_FILES;
  const form = window.document.querySelector('form');
  const submit = form.querySelector('button');
  const uploadCalls = [];
  const submittedDescriptions = [];
  let downloadPath;
  let downloadedFilename;
  window.URL.createObjectURL = () => 'blob:https://test.fieldforce.app/test';
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function() { downloadedFilename = this.download; };
  const cloud = {storage:{from(bucket) {
    assert.equal(bucket,'ffh-task-assignments');
    return {
      async upload(path,file,options) {
        uploadCalls.push({path,file,options});
        return {error:null};
      },
      async download(path) {
        downloadPath = path;
        return {data:new window.Blob(['example']),error:null};
      }
    };
  }}};

  feature.bind(form, 'MTEST', cloud);
  feature.bind(form, 'MTEST', cloud);
  assert.equal(form.querySelectorAll('[name=ffAssignmentFile]').length, 1);
  assert.equal(form.elements.proofMode.value, 'Photo');
  form.addEventListener('submit', event => {
    event.preventDefault();
    submittedDescriptions.push(form.elements.description.value);
  });

  form.requestSubmit(submit);
  assert.deepEqual(submittedDescriptions, ['Check shelving']);
  const files = form.elements.ffAssignmentFile;
  const setFile = file => Object.defineProperty(files,'files',{configurable:true,value:file?[file]:[]});
  setFile(new window.File(['wrong'], 'file.exe'));
  form.requestSubmit(submit);
  assert.match(form.querySelector('[role=status]').textContent,/supported file/);
  assert.equal(uploadCalls.length, 0);

  const file = new window.File(['test'], 'instructions.PDF', {type:'application/pdf'});
  setFile(file);
  form.requestSubmit(submit);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(uploadCalls.length, 1);
  assert.match(uploadCalls[0].path, /^task-assignments\/mtest\/[a-f0-9-]+\.pdf$/);
  assert.equal(submittedDescriptions.at(-1), 'Check shelving\n\nAssignment attachment: ' + uploadCalls[0].path);
  assert.equal(submit.disabled, false);

  form.requestSubmit(submit);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(uploadCalls.length, 1, 'the same file is reused when a task save is retried');
  await feature.download(uploadCalls[0].path,cloud);
  assert.equal(downloadPath,uploadCalls[0].path);
  assert.equal(downloadedFilename,'assignment-attachment.pdf');
  assert.match('Assignment attachment: https://example.com/legacy.pdf',feature.attachmentLine);
  await assert.rejects(feature.download('wrong/file.pdf',cloud),/Invalid assignment/);
  dom.window.close();
  console.log('PASS assignment attachments, file validation, private download and safe retry');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
