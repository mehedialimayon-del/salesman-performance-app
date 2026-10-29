const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://fieldforce.test',runScripts:'outside-only'});
 const w=dom.window;w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;
 w.eval(fs.readFileSync('vendor/pdf-lib.min.js','utf8'));
 const lib=w.PDFLib;
 const orig=await lib.PDFDocument.create(),pg=orig.addPage([595.28,841.89]);
 pg.drawText('Company Claim Form', {x:45,y:780,size:13});
 const claimPdf=new Uint8Array(await orig.save());
 const invoice=await lib.PDFDocument.create();invoice.addPage().drawText('Fuel receipt');const pdfReceipt=new Uint8Array(await invoice.save());
 const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8//8/AwMDEwMDAwMDAwAkBgMB/DXemwAAAABJRU5ErkJggg==','base64'));
 const text=(str,x,y)=>({str,width:str.length*5,transform:[1,0,0,1,x,y]});
 w.pdfjsLib={getDocument(){return{promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[text('FUEL EXPENSES',50,640),text('BUYER ENTERTAINMENT',50,600),text('GRAND TOTAL',50,200),text('AMOUNT',450,695),text('DATE',50,745)]})}),destroy:async()=>{}})}}};
 w.fetch=async url=>{
  const data=url.includes('company-form')?claimPdf:url.includes('receipt.png')?png:pdfReceipt;
  return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
 };
 w.eval(fs.readFileSync('claim-monthly.js','utf8'));
 const rows=[
 {id:'fuel',expense_date:'2026-10-10',category:'Fuel Expenses',amount:125,reason:'Airport route',receipt_path:'fuel.png'},
 {id:'buyer',expense_date:'2026-10-15',category:'Buyer Entertainment',amount:150,reason:'Buyer lunch',receipt_path:'buyer.pdf'},
 {id:'training',expense_date:'2026-10-17',category:'Training',amount:225,reason:'Course',receipt_path:null}
 ];
 let output,filename;
 const result=await w.FFH_EXPORT_MONTHLY_CLAIM({month:'2026-10',receipts:rows,templateUrl:'https://qa.test/company-form.pdf',
  staff:'QA SR',claims:[],signed:async path=>path==='fuel.png'?'https://qa.test/receipt.png':'https://qa.test/receipt.pdf',
  download:async(blob,name)=>{filename=name;const reader=new w.FileReader();output=await new Promise((resolve,reject)=>{reader.onload=()=>new Uint8Array(reader.result);reader.onerror=reject;reader.readAsArrayBuffer(blob)})}
 });
 assert.equal(result.grandTotal,500);
 assert.equal(result.approved,false);
 assert.equal(result.count,3);
 assert.equal(result.mapping.originalFirstPage,true);
 assert.ok(output?.byteLength>2000,'real PDF bytes');
 assert.equal(new TextDecoder().decode(output.slice(0,5)),'%PDF-');
 const generated=await lib.PDFDocument.load(output);
 assert.equal(generated.getPageCount(),4,'original claim + photo + original PDF receipt + unattached receipt warning');
 assert.match(filename,/DRAFT/);
 assert.equal(dom.window.document.body.children.length,0,'no temporary DOM leak');
 dom.window.close();
 console.log('PASS company template first, RM500 category totals, PDF/image receipt annex and no unapproved signature');
})().catch(e=>{console.error(e);process.exit(1)});
