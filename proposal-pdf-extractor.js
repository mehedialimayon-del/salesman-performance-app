/* Read chain SKUs directly from uploaded PDF files; never guess product identities. */
(function(root){'use strict';
const PDF_JS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const OCR_JS='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let pdfLoading,ocrLoading;
function load(src,global){
 if(root[global])return Promise.resolve(root[global]);
 const key=global==='pdfjsLib'?'pdfLoading':'ocrLoading';
 const pending=key==='pdfLoading'?pdfLoading:ocrLoading;
 if(pending)return pending;
 const promise=new Promise((ok,no)=>{
  const s=document.createElement('script');s.src=src;s.crossOrigin='anonymous';s.async=true;
  const timer=setTimeout(()=>{s.remove();no(Error('PDF text reader timed out. Please check internet connection.'))},25000);
  s.onload=()=>{clearTimeout(timer);root[global]?ok(root[global]):no(Error('PDF text reader could not initialize.'))};
  s.onerror=()=>{clearTimeout(timer);no(Error('PDF text library is unavailable. Please check internet connection.'))};
  document.head.append(s);
 }).catch(e=>{if(key==='pdfLoading')pdfLoading=null;else ocrLoading=null;throw e});
 if(key==='pdfLoading')pdfLoading=promise;else ocrLoading=promise;
 return promise;
}
const norm=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function candidate(raw){
 const s=norm(raw);
 if(!s||/^(?:TOTAL|SUBTOTAL|REMARKS?|NOTES?|ITEM\s*CODE|DESCRIPTION|PRODUCT\s*NAME|BALANCE\s*STOCK|PROPOSED?\s*ORDER|SIGNATURE|DATE\s*:|SUPPLIER\s*:|OUTLET\s*:)/i.test(s))return null;
 const patterns=[
  /^(?:NO\.?\s*)?(\d{1,3})[\s.)\-]+([A-Z]?\d{4,14}[A-Z0-9-]*)\s+(.+)$/i,
  /^([A-Z]?\d{4,14}[A-Z0-9-]*)\s+(.+)$/i,
  /^(?:\d{1,3}\s+)([A-Z]{1,4}[-/]?\d{3,12})\s+(.+)$/i
 ];
 let m;for(let i=0;i<patterns.length;i++){m=s.match(patterns[i]);if(m)break}
 if(!m)return null;
 const code=(m.length===4?m[2]:m[1]).trim();
 let name=norm(m.length===4?m[3]:m[2]);
 // Ignore quantity/currency cells following the actual product description.
 name=name.replace(/\s+(?:RM\s*)?\d+(?:\.\d{1,3})?(?:\s+(?:RM\s*)?\d+(?:\.\d{1,3})?)*\s*$/i,'').trim();
 name=name.replace(/\s+(?:PCS|CTN|CARTON|UNIT|STOCK|PROPOSE|PROPOSED)\s*$/i,'').trim();
 if(!/[A-Z]{3,}/i.test(name)||name.length<4||name.length>220||/^(?:DATE|CONTACT|SUPPLIER|OUTLET|SIGNATURE|ITEM|PRODUCT|TOTAL|PRICE|BARCODE)\b/i.test(name))return null;
 if(/^(?:\d{6,8})$/.test(code)&&/^(?:19|20)\d{2}(?:0[1-9]|1[0-2])/.test(code))return null;
 return {code,name};
}
function itemRows(items){
 const sorted=(items||[]).filter(v=>norm(v.str)).map(v=>({t:norm(v.str),x:Number(v.transform?.[4]||0),y:Number(v.transform?.[5]||0),w:Number(v.width||0)})).sort((a,b)=>b.y-a.y||a.x-b.x);
 const rows=[];
 for(const it of sorted){
  let row=rows[rows.length-1];
  if(!row||Math.abs(row.y-it.y)>3.5){row={y:it.y,parts:[]};rows.push(row)}
  row.parts.push(it);
 }
 return rows.map(row=>{row.parts.sort((a,b)=>a.x-b.x);return row.parts.map(p=>p.t).join(' ')}).filter(Boolean);
}
function extractFromLines(lines){
 const clean=(lines||[]).map(norm).filter(Boolean);
 const found=[],seen=new Set();
 let sawHeader=false;
 for(let i=0;i<clean.length;i++){
  const line=clean[i];
  if(/(?:ITEM|PRODUCT|ARTICLE|SKU)\s*(?:CODE|NO|NUMBER|DESCRIPTION|NAME)|BAR\s*CODE|STOCK\s*BALANCE|PROPOS(?:E|ED)\s*ORDER/i.test(line)){sawHeader=true;continue}
  const hit=candidate(line);if(!hit)continue;
  if(seen.has(hit.code))continue;
  seen.add(hit.code);found.push(hit);
  if(found.length>=200)break;
 }
 // Headers and two separate SKU rows reduce false positives from contact/date metadata.
 const confidence=found.length>=2 ? (sawHeader?'high':'medium') : (found.length===1&&sawHeader?'medium':'low');
 return {lines:found,confidence,headerFound:sawHeader,total:found.length};
}
async function pdfBytes(source){
 if(source instanceof Blob){if(source.size>25*1024*1024)throw Error('PDF exceeds 25 MB');return new Uint8Array(await source.arrayBuffer())}
 const url=String(source||'');
 if(!/^https:\/\/svpgjrxeqnluipsgjywk\.supabase\.co\/storage\/v1\/object\/public\/ffh-public\/proposals\//i.test(url))throw Error('Only uploaded FieldForce proposal PDFs are supported.');
 const r=await fetch(url,{method:'GET',cache:'no-store',mode:'cors'});
 if(!r.ok)throw Error('Uploaded PDF could not be opened (HTTP '+r.status+').');
 const bytes=new Uint8Array(await r.arrayBuffer());
 if(bytes.byteLength>25*1024*1024)throw Error('PDF exceeds 25 MB');
 return bytes;
}
async function read(source,options={}){
 const lib=await load(PDF_JS,'pdfjsLib');lib.GlobalWorkerOptions.workerSrc=PDF_WORKER;
 const bytes=await pdfBytes(source);
 if(String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('The uploaded file is not a valid PDF.');
 const task=lib.getDocument({data:bytes,useSystemFonts:true,disableFontFace:true});
 let doc;try{doc=await task.promise;
  const all=[],max=Math.min(doc.numPages,Math.max(1,options.maxPages||35));
  for(let i=1;i<=max;i++){const page=await doc.getPage(i),content=await page.getTextContent();all.push(...itemRows(content.items))}
  let parsed=extractFromLines(all);
  if(parsed.total>=2||(parsed.total===1&&parsed.headerFound))return {...parsed,pageCount:doc.numPages,source:'pdf-text'};
  if(options.allowOCR!==false){
   const ocr=await load(OCR_JS,'Tesseract');
   let text=[];
   for(let i=1;i<=Math.min(doc.numPages,4);i++){
    const page=await doc.getPage(i),viewport=page.getViewport({scale:1.75}),canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('OCR canvas is not supported on this device.');
    await page.render({canvasContext:ctx,viewport}).promise;
    const out=await ocr.recognize(canvas,'eng');text.push(...String(out.data?.text||'').split(/\r?\n/));
    canvas.width=canvas.height=0;
   }
   const scan=extractFromLines(text);
   if(scan.total>parsed.total)parsed={...scan,source:'ocr'};
  }
  return {...parsed,pageCount:doc.numPages,source:parsed.source||'pdf-text'};
 }finally{try{await doc?.destroy()}catch(_){}}
}
root.FFH_PROPOSAL_PDF_PARSE={read,extractFromLines,itemRows,candidate};
})(window);