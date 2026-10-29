/* Monthly expense statement: preserves uploaded company PDF as first page and appends receipts. */
(function(root){'use strict';
const MONEY=n=>Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const tidy=s=>String(s??'').replace(/\s+/g,' ').trim();
const categories=['Fuel Expenses','Buyer Entertainment','Team Building','Training','Others'];
function groupRows(rows){
 const map=new Map();
 for(const r of rows||[]){
  const cat=tidy(r.category)||'Others';
  if(!map.has(cat))map.set(cat,{category:cat,totalCents:0,items:[],reasons:[]});
  const row=map.get(cat),amount=Math.round((+r.amount||0)*100);
  if(!(amount>0))continue;
  row.totalCents+=amount;row.items.push(r);
  if(r.reason&&!row.reasons.includes(tidy(r.reason)))row.reasons.push(tidy(r.reason));
 }
 const groups=[...map.values()].filter(x=>x.items.length).map(x=>({...x,total:x.totalCents/100}));
 const grandCents=groups.reduce((s,g)=>s+g.totalCents,0);
 return {groups,grandTotal:grandCents/100,totalCents:grandCents,count:groups.reduce((s,g)=>s+g.items.length,0)};
}
function monthBounds(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid claim month');
 const [year,m]=month.split('-').map(Number);
 const last=new Date(Date.UTC(year,m,0)).getUTCDate();
 return {from:month+'-01',to:month+'-'+String(last).padStart(2,'0')};
}
function approvedForAll(rows,claims,month){
 const ids=new Set((rows||[]).map(r=>String(r.id)));
 if(!ids.size)return null;
 return (claims||[]).find(c=>{
  if(c.kind!=='Expense Claim'||c.claim_month!==month||c.status!=='Approved'||!c.signature_png)return false;
  const selected=(c.lines||[]).filter(l=>!l.excluded).map(l=>String(l.receipt_id||''));
  return selected.length===ids.size&&selected.every(id=>ids.has(id));
 })||null;
}
let dependencies=null;
async function pdfLibrary(){
 if(root.PDFLib)return root.PDFLib;
 if(!dependencies)dependencies=new Promise((ok,no)=>{
  const script=document.createElement('script');script.src='vendor/pdf-lib.min.js';script.onload=()=>root.PDFLib?ok(root.PDFLib):no(Error('PDF engine did not initialize'));script.onerror=()=>no(Error('PDF engine unavailable'));document.head.append(script);
 }).catch(e=>{dependencies=null;throw e});
 return dependencies;
}
function rgb(hex){const value=hex.replace('#','');return root.PDFLib.rgb(parseInt(value.slice(0,2),16)/255,parseInt(value.slice(2,4),16)/255,parseInt(value.slice(4,6),16)/255)}
async function bytes(source){const r=await fetch(source,{cache:'no-store'});if(!r.ok)throw Error('Claim template or receipt unavailable (HTTP '+r.status+')');return new Uint8Array(await r.arrayBuffer())}
async function imageFromBytes(doc,raw,path){
 if(/\.jpe?g(?:\?|$)/i.test(path))return doc.embedJpg(raw);
 if(/\.png(?:\?|$)/i.test(path))return doc.embedPng(raw);
 // WebP: re-encode through browser Canvas to preserve phone compatibility.
 const blob=new Blob([raw]),url=URL.createObjectURL(blob);
 try{
  const img=new Image();img.src=url;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  canvas.getContext('2d').drawImage(img,0,0);const b64=canvas.toDataURL('image/png').split(',')[1];
  return doc.embedPng(Uint8Array.from(atob(b64),x=>x.charCodeAt(0)));
 }finally{URL.revokeObjectURL(url)}
}
function summarizeReason(reasons,max=75){
 const all=[...new Set((reasons||[]).map(tidy).filter(Boolean))].join('; ');
 return all.length>max?all.slice(0,max-1)+'…':all;
}
async function drawWords(doc,page,words,{x,y,maxWidth=300,size=9,bold=false,color='#172029',align='left'}){
 const str=String(words??'');
 const safe=/^[\x00-\x7f]*$/.test(str);
 const font=await doc.embedFont(bold?root.PDFLib.StandardFonts.HelveticaBold:root.PDFLib.StandardFonts.Helvetica);
 if(safe){
  let value=str;while(value.length>2&&font.widthOfTextAtSize(value,size)>maxWidth)value=value.slice(0,-2);
  if(value!==str)value=value.trimEnd()+'…';
  const w=font.widthOfTextAtSize(value,size);
  page.drawText(value,{x:align==='right'?x-w:x,y,size,font,color:rgb(color)});
  return;
 }
 // Draw Unicode reasons/category names using phone's own font fallback rather than Helvetica.
 const ratio=3,canvas=document.createElement('canvas');
 canvas.width=Math.max(20,Math.ceil(maxWidth*ratio));canvas.height=Math.ceil((size+7)*ratio);
 const context=canvas.getContext('2d');context.fillStyle=color;context.textBaseline='middle';
 context.font=(bold?'700 ':'')+Math.ceil(size*ratio)+'px Arial, Noto Sans Bengali, sans-serif';
 let value=str;
 while(value.length>2&&context.measureText(value).width>canvas.width-6)value=value.slice(0,-1);
 if(value!==str)value+='…';
 context.fillText(value,0,canvas.height/2);
 const png=await doc.embedPng(canvas.toDataURL('image/png'));
 page.drawImage(png,{x:align==='right'?x-maxWidth:x,y:y-3,width:maxWidth,height:size+7});
 canvas.width=canvas.height=0;
}
async function textLayout(templateBytes){
 try{
  if(!root.pdfjsLib){
   await new Promise((ok,no)=>{
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=ok;s.onerror=no;document.head.append(s);
   });
  }
  const task=root.pdfjsLib.getDocument({data:new Uint8Array(templateBytes),disableFontFace:true,useSystemFonts:true});
  const doc=await task.promise,first=await doc.getPage(1),content=await first.getTextContent(),rows=[];
  for(const item of content.items){
   const t=tidy(item.str);if(!t)continue;
   const x=Number(item.transform?.[4]||0),y=Number(item.transform?.[5]||0);
   let row=rows.find(z=>Math.abs(z.y-y)<4);
   if(!row){row={y,items:[]};rows.push(row)}
   row.items.push({text:t,x,y,width:Number(item.width||0)});
  }
  const ordered=rows.map(r=>({y:r.y,items:r.items.sort((a,b)=>a.x-b.x),text:r.items.map(x=>x.text).join(' ')})).sort((a,b)=>b.y-a.y);
  await doc.destroy();return ordered;
 }catch(e){console.warn('Claim layout text detection failed:',e);return []}
}
function findAnchor(rows,matcher){
 return rows.find(r=>matcher.test(r.text.toUpperCase()));
}
async function overlayOnCompanyForm(doc,raw,{month,summary,staff,claim}){
 const page=doc.getPages()[0];if(!page)throw Error('Company claim PDF has no pages');
 const width=page.getWidth(),height=page.getHeight(),bounds=monthBounds(month);
 const rows=await textLayout(raw);
 const amountHeader=findAnchor(rows,/AMOUNT|RM|CLAIMED/);
 const amountX=amountHeader?.items.find(x=>/AMOUNT|TOTAL/i.test(x.text))?.x;
 const valueX=Math.max(width*.71,Math.min(width-24,(amountX||width-125)+70));
 const header=findAnchor(rows,/DATE|PERIOD|MONTH/);
 const totalRow=[...rows].reverse().find(r=>/TOTAL|GRAND TOTAL/i.test(r.text));
 const anchors=[
  ['Fuel Expenses',/FUEL|PETROL|DIESEL|TRAVEL EXPENSE/],
  ['Buyer Entertainment',/BUYER|ENTERTAINMENT/],
  ['Team Building',/TEAM BUILD|TEAM MEAL/],
  ['Training',/TRAINING|COURSE/],
  ['Others',/OTHERS?|MISCELLANEOUS/]
 ];
 const claimed=new Set();
 const boxTop=totalRow?.y ? Math.min(height*.65,totalRow.y+185):height*.49;
 const formRows=[];
 let nextY=boxTop;
 for(const group of summary.groups){
  const match=anchors.find(([cat])=>cat===group.category);
  const anchored=match?findAnchor(rows,match[1]):null;
  let y=anchored?.y||nextY;
  if(!anchored){nextY-=24}
  claimed.add(group.category);
  formRows.push({group,y,labelX:anchored?.items[0]?.x||width*.16,anchored:!!anchored});
 }
 // Only add a compact fallback if native category labels aren't present. The original
 // company PDF remains the first page, not a recreated approximation.
 const nativeMatches=formRows.filter(r=>r.anchored).length;
 if(nativeMatches<Math.min(2,formRows.length)){
  const h=Math.max(72,Math.min(200,24+formRows.length*23));
  const y=Math.max(105,Math.min(height*.62,boxTop));
  page.drawRectangle({x:width*.10,y:y-h+20,width:width*.80,height:h,color:root.PDFLib.rgb(1,1,1),opacity:.92,borderColor:rgb('#bbbbbb'),borderWidth:.5});
  await drawWords(doc,page,'EXPENSE CATEGORY',{x:width*.13,y:y-8,size:10,bold:true});
  await drawWords(doc,page,'RM',{x:width*.85,y:y-8,size:10,bold:true,align:'right'});
  for(let i=0;i<formRows.length;i++)formRows[i].y=y-29-i*23,formRows[i].labelX=width*.13,formRows[i].anchored=false;
 }
 for(const {group,y,labelX,anchored} of formRows){
  if(!anchored)await drawWords(doc,page,group.category,{x:labelX,y,size:9,bold:true,maxWidth:155});
  const reason=summarizeReason(group.reasons,65);
  const rX=anchored?Math.min(labelX+130,width*.52):width*.42;
  if(reason)await drawWords(doc,page,'('+reason+')',{x:rX,y:y+1,size:6,maxWidth:Math.max(42,valueX-rX-85),color:'#525252'});
  await drawWords(doc,page,MONEY(group.total),{x:Math.min(width-25,valueX+42),y,size:9,bold:true,maxWidth:92,align:'right'});
 }
 const totalY=totalRow?.y||Math.max(62,height*.17);
 if(!totalRow)await drawWords(doc,page,'GRAND TOTAL (RM)',{x:width*.56,y:totalY,size:10,bold:true,maxWidth:145});
 await drawWords(doc,page,MONEY(summary.grandTotal),{x:Math.min(width-25,valueX+42),y:totalY,size:11,bold:true,maxWidth:100,align:'right',color:'#111111'});
 // A small period and staff identifier, placed on the form as digital form fields.
 const infoY=(header?.y||height-75)-17;
 await drawWords(doc,page,'Month: '+bounds.from+' to '+bounds.to,{x:width*.16,y:infoY,size:8,maxWidth:260});
 if(staff)await drawWords(doc,page,'Prepared by: '+staff,{x:width*.16,y:Math.max(30,infoY-15),size:8,maxWidth:300});
 // Approval requires a single official approved claim containing exactly these receipts.
 if(claim?.status==='Approved'&&claim.signature_png?.startsWith('data:image/png;base64,')){
  const signature=await doc.embedPng(claim.signature_png);
  const checked=findAnchor(rows,/CHECKED BY|APPROVED BY|AUTHORIS|SIGNATURE/);
  const sigW=118,sigH=39,x=checked?Math.min(checked.items[0].x,width-sigW-25):width-sigW-40;
  const y=checked?checked.y+12:32;
  page.drawImage(signature,{x,y,width:sigW,height:sigH});
  await drawWords(doc,page,'APPROVED',{x,y:y+sigH+4,size:7,bold:true,color:'#167347'});
 }else{
  await drawWords(doc,page,'DRAFT - NOT APPROVED',{x:width-175,y:height-32,size:9,bold:true,color:'#b12424'});
 }
 return {templateTextRows:rows.length,nativeCategoryLabels:nativeMatches,originalFirstPage:true};
}
async function appendReceipt(doc,receipt,signed){
 const A4=[595.28,841.89],page=doc.addPage(A4);
 const w=page.getWidth(),h=page.getHeight();
 page.drawRectangle({x:0,y:h-90,width:w,height:90,color:rgb('#ffffff')});
 page.drawRectangle({x:0,y:h-7,width:w,height:7,color:rgb('#f47711')});
 await drawWords(doc,page,'RECEIPT / SUPPORTING DOCUMENT',{x:30,y:h-37,bold:true,size:15,maxWidth:400});
 await drawWords(doc,page,'Date: '+tidy(receipt.expense_date)+'     RM '+MONEY(receipt.amount),{x:30,y:h-57,size:10,maxWidth:460});
 await drawWords(doc,page,'Category: '+tidy(receipt.category||'Others')+'    Reason: '+tidy(receipt.reason),{x:30,y:h-75,size:9,maxWidth:w-60});
 if(!receipt.receipt_path){
  await drawWords(doc,page,'NO RECEIPT ATTACHED',{x:30,y:h-150,size:16,bold:true,color:'#ab201e'});
  return 1;
 }
 const url=await signed(receipt.receipt_path);
 if(!url)throw Error('Receipt file URL unavailable for '+receipt.expense_date);
 const raw=await bytes(url),path=String(receipt.receipt_path).toLowerCase();
 if(/\.pdf$/.test(path)){
  // Embed all pages without sacrificing the date/reason header.
  const pages=await doc.embedPdf(raw);
  if(!pages.length)throw Error('Empty PDF receipt');
  for(let i=0;i<pages.length;i++){
   const embedded=pages[i],target=i===0?page:doc.addPage(A4);
   if(i>0){await drawWords(doc,target,'Receipt continued · '+receipt.expense_date,{x:30,y:h-36,size:10})}
   const areaW=w-52,areaH=h-(i===0?138:83);
   const scale=Math.min(areaW/embedded.width,areaH/embedded.height,1.5);
   const drawW=embedded.width*scale,drawH=embedded.height*scale;
   target.drawPage(embedded,{x:(w-drawW)/2,y:26,width:drawW,height:drawH});
  }
  return pages.length;
 }
 const image=await imageFromBytes(doc,raw,path);
 const areaW=w-52,areaH=h-145,scale=Math.min(areaW/image.width,areaH/image.height);
 page.drawImage(image,{x:(w-image.width*scale)/2,y:28,width:image.width*scale,height:image.height*scale});
 return 1;
}
root.FFH_CLAIM_MONTHLY={categories,groupRows,monthBounds,approvedForAll};
root.FFH_EXPORT_MONTHLY_CLAIM=async function({month,receipts,templateUrl,staff='',claims=[],signed,download,onProgress}){
 const list=(receipts||[]).filter(r=>String(r.expense_date||'').startsWith(month)).sort((a,b)=>a.expense_date.localeCompare(b.expense_date));
 if(!list.length)throw Error('No receipts saved for this month');
 if(!templateUrl)throw Error('Upload the company Claim Form PDF first');
 const summary=groupRows(list);if(!summary.count)throw Error('No valid claim amounts to export');
 const lib=await pdfLibrary(),original=await bytes(templateUrl);
 if(new TextDecoder().decode(original.slice(0,5))!=='%PDF-')throw Error('Company claim template is not a PDF');
 const doc=await lib.PDFDocument.load(original),approved=approvedForAll(list,claims,month);
 onProgress?.('Filling the original company Claim Form…');
 const mapping=await overlayOnCompanyForm(doc,original,{month,summary,staff,claim:approved});
 for(let i=0;i<list.length;i++){
  onProgress?.('Attaching receipt '+(i+1)+' of '+list.length+'…');
  await appendReceipt(doc,list[i],signed);
 }
 const output=await doc.save();
 onProgress?.('Saving combined claim PDF…');
 await download(new Blob([output],{type:'application/pdf'}),'Claim_Bill_'+month+'_'+(approved?'APPROVED':'DRAFT')+'.pdf');
 return {grandTotal:summary.grandTotal,count:list.length,categoryCount:summary.groups.length,approved:!!approved,mapping,pages:doc.getPageCount()};
};
})(window);