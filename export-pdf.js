/* Real PDF bytes shared by browser and Android exports. */
(function(root){'use strict';
let loading;
async function libraries(){if(root.jspdf&&root.html2canvas)return;if(!loading)loading=(async()=>{for(const [key,src]of [['jspdf','vendor/jspdf.umd.min.js'],['html2canvas','vendor/html2canvas.min.js']])if(!root[key])await new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('PDF library failed to load'));document.head.append(s);});})().catch(e=>{loading=null;throw e;});await loading;}
root.FFH_EXPORT_PDF=async function({title,articles,filename,download}){
 const overlay=document.createElement('div');overlay.className='globalSearchOverlay';overlay.style.zIndex='30000';
 overlay.innerHTML='<section class="globalSearchBox"><button type="button" class="secondary">← Back</button><h2></h2><p role="status">Preparing PDF…</p></section>';
 overlay.querySelector('h2').textContent=title;document.body.append(overlay);
 let cancelled=false;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:760px;z-index:-1';document.body.append(host);
 const dispose=()=>{overlay.remove();host.remove();document.body.style.overflow=oldOverflow;};
 const cancel=()=>{cancelled=true;dispose();};overlay.querySelector('button').onclick=cancel;
 const pop=()=>cancel();root.addEventListener('popstate',pop);
 const check=()=>{if(cancelled)throw Error('PDF export cancelled');};
 try{await libraries();check();const pdf=new root.jspdf.jsPDF({unit:'mm',format:'a4'});let pages=0;
 for(let i=0;i<articles.length;i++){check();overlay.querySelector('[role=status]').textContent='Preparing '+(i+1)+' of '+articles.length+'…';
 const section=document.createElement('section');section.style.cssText='box-sizing:border-box;width:760px;padding:38px;background:#fff;color:#14212b;font:16px Arial,sans-serif;overflow-wrap:anywhere';
 section.innerHTML=articles[i];for(const el of section.querySelectorAll('*'))el.style.color='#14212b';for(const img of section.querySelectorAll('img')){img.style.cssText='display:block;max-width:680px;max-height:700px;object-fit:contain;margin:14px auto';img.crossOrigin='anonymous';}
 if(section.querySelector('.ffCataloguePdf')){section.style.background='#050505';section.style.color='#ffffff';for(const el of section.querySelectorAll('*')){el.style.color=el.matches('h2,h3,.ffProductLabel')?'#ff7417':'#ffffff';if(el.matches('section')){el.style.border='1px solid #8f4c20';el.style.padding='16px';el.style.margin='14px 0';el.style.background='#090909';}if(el.matches('.ffProductPack'))el.style.color='#ffffff';}}host.replaceChildren(section);await document.fonts?.ready;
 await Promise.all([...section.querySelectorAll('img')].map(img=>new Promise((ok,no)=>{if(img.complete){img.naturalWidth?ok():no(Error('PDF image unavailable'));return;}const timer=setTimeout(()=>no(Error('PDF image timed out')),20000);img.onload=()=>{clearTimeout(timer);ok();};img.onerror=()=>{clearTimeout(timer);no(Error('PDF image unavailable'));};})));
 check();const canvas=await root.html2canvas(section,{scale:1.5,backgroundColor:'#ffffff',logging:false,useCORS:true});check();
 const pageHeight=Math.floor(canvas.width*297/210);for(let y=0;y<canvas.height;y+=pageHeight){const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.min(pageHeight,canvas.height-y);slice.getContext('2d').drawImage(canvas,0,y,canvas.width,slice.height,0,0,canvas.width,slice.height);if(pages++)pdf.addPage();pdf.addImage(slice.toDataURL('image/jpeg',.9),'JPEG',0,0,210,210*slice.height/slice.width);}
 canvas.width=canvas.height=0;
 }
 check();overlay.querySelector('[role=status]').textContent='Saving PDF…';await download(new Blob([pdf.output('arraybuffer')],{type:'application/pdf'}),filename);return {saved:true,pages};
 }catch(e){if(cancelled)return {cancelled:true};throw e;}finally{root.removeEventListener('popstate',pop);dispose();}
};
})(window);
