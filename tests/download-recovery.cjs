const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('app.js','utf8'),a=source.indexOf('async function ffhSafeDownload('),b=source.indexOf('async function exportWorkbook',a);
const setup=()=>{const dom=new JSDOM('',{url:'https://app.test',runScripts:'outside-only'});dom.window.eval(source.slice(a,b));return dom;};
(async()=>{
 let dom=setup(),w=dom.window;w.FieldForceNative={saveFile:async()=>({saved:true,filename:'report.xlsx',uri:'content://downloads/1'})};
 let result=await w.ffhSafeDownload(new w.Blob(['xlsx']),'report.xlsx');assert.equal(result.saved,true);assert.equal(result.location,'Downloads / FieldForce Hub');
 w.FieldForceNative.saveFile=async()=>undefined;await assert.rejects(w.ffhSafeDownload(new w.Blob(['x']),'test.xlsx'),/did not confirm/);
 w.FieldForceNative.saveFile=async()=>{throw Error('File save cancelled')};await assert.rejects(w.ffhSafeDownload(new w.Blob(['x']),'test.xlsx'),/cancelled/);dom.window.close();
 dom=setup();w=dom.window;Object.defineProperty(w.navigator,'userAgent',{value:'Android FFHNative/1'});let clicks=0;w.HTMLAnchorElement.prototype.click=()=>clicks++;
 await assert.rejects(w.ffhSafeDownload(new w.Blob(['x']),'test.xlsx'),/not ready/);assert.equal(clicks,0);
 let forwarded=0;w.ffhNativeReply=()=>forwarded++;const original=w.ffhNativeReply;
 w.FFHBridge={postMessage:raw=>{const cmd=JSON.parse(raw),p=JSON.parse(cmd.payload);assert.equal(cmd.action,'saveFile');assert.equal(Buffer.from(p.base64,'base64').toString(),'report bytes');w.ffhNativeReply('other',{saved:true});w.ffhNativeReply(p.request_id,{saved:true,filename:p.filename,uri:'content://downloads/2'});}};
 result=await w.ffhSafeDownload(new w.Blob(['report bytes']),'report.xlsx');assert.equal(result.saved,true);assert.equal(forwarded,1);assert.equal(w.ffhNativeReply,original);
 delete w.FFHBridge;w.ffhNativeCall=async(action,p)=>{assert.equal(action,'saveFile');return {saved:true}};result=await w.ffhSafeDownload(new w.Blob(['x']),'test.xlsx');assert.equal(result.location,'Selected folder');dom.window.close();
 dom=setup();w=dom.window;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>clicks++;result=await w.ffhSafeDownload(new w.Blob(['x']),'browser.xlsx');assert.equal(result.started,true);assert.equal(result.saved,undefined);assert.equal(clicks,1);dom.window.close();
 console.log('PASS confirmed Android save, missing receipt, cancellation, APK blob rejection, bridge recovery/reply isolation, legacy call and browser handoff');
})().catch(e=>{console.error(e);process.exit(1)});
