/* Private browser-side A&N photo compositor. Cropping only; source photos are not uploaded until Publish. */
(function(){
'use strict';
const ratios={
 team:{w:4,h:5,label:'Profile portrait · 4:5'},
 success:{w:16,h:9,label:'Success card · 16:9'},
 country:{w:4,h:3,label:'Destination card · 4:3'},
 university:{w:16,h:9,label:'University cover · 16:9'},
 logo:{w:1,h:1,label:'University logo · 1:1'},
 gallery:{w:16,h:9,label:'Campus gallery · 16:9'}
};
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=false;
async function editFile(file,kind='success'){
 if(!(file instanceof Blob)||!file.size||!String(file.type).startsWith('image/'))throw Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>8388608)throw Error('Photo must be under 8 MB.');
 return editBlob(file,kind);
}
async function editUrl(url,kind='success'){
 const u=new URL(url);
 if(u.protocol!=='https:')throw Error('Only secure image addresses can be edited.');
 const res=await fetch(u.href,{mode:'cors',credentials:'omit'});
 if(!res.ok)throw Error('Could not load the existing image. Choose a new photo from Gallery instead.');
 const blob=await res.blob();
 if(!blob.type.startsWith('image/'))throw Error('The selected item is not an image.');
 return editBlob(blob,kind);
}
async function editBlob(blob,kind){
 if(active)throw Error('Finish the current photo edit first.');
 active=true;
 const ratio=ratios[kind]||ratios.success;
 const localUrl=URL.createObjectURL(blob);
 let dialog=null,done=null;
 try{
  const photo=new Image();photo.decoding='async';
  photo.src=localUrl;
  if(photo.decode)await photo.decode();else await new Promise((resolve,reject)=>{photo.onload=resolve;photo.onerror=reject;});
  const iw=photo.naturalWidth,ih=photo.naturalHeight;
  if(!iw||!ih)throw Error('Cannot read image dimensions.');
  dialog=document.createElement('dialog');
  dialog.className='an-crop-dialog';
  dialog.setAttribute('aria-label','Adjust photo before publishing');
  dialog.innerHTML=
    '<div class="an-crop-panel"><div class="an-crop-head"><div><small>PHOTO ADJUSTMENT</small><h2>Zoom <em>& Position</em></h2><p>'+esc(ratio.label)+'</p></div>'
   +'<button type="button" class="an-crop-close" data-crop="cancel" aria-label="Cancel photo editing">×</button></div>'
   +'<div class="an-crop-canvas-box"><canvas class="an-crop-canvas" width="'+(ratio.w===4&&ratio.h===5?'640':'960')+'" height="'+(ratio.w===4&&ratio.h===5?'800':Math.round(960*ratio.h/ratio.w))+'"></canvas>'
   +'<div class="an-crop-guides" aria-hidden="true"><span></span></div></div>'
   +'<p class="an-crop-instruction">Move the photo with your finger or mouse. Pinch or slide to zoom until it fits the frame.</p>'
   +'<div class="an-crop-slider"><button type="button" data-crop="minus" aria-label="Zoom out">−</button><input type="range" min="100" max="500" step="1" value="100" aria-label="Zoom" data-crop-zoom><button type="button" data-crop="plus" aria-label="Zoom in">+</button><output data-zoom-value>100%</output></div>'
   +'<div class="an-crop-actions"><button type="button" class="an-crop-secondary" data-crop="reset">Reset</button>'
   +'<button type="button" class="an-crop-secondary" data-crop="cancel">Cancel</button><button type="button" class="an-crop-primary" data-crop="save">✓ Use This Photo</button></div>'
   +'<p class="an-crop-status" role="status"></p></div>';
  document.body.appendChild(dialog);
  const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d',{alpha:false});
  const w=canvas.width,h=canvas.height,base=Math.max(w/iw,h/ih);
  const slider=dialog.querySelector('[data-crop-zoom]'),label=dialog.querySelector('[data-zoom-value]');
  let zoom=1,offsetX=0,offsetY=0,frame=null,finished=false;
  const pointers=new Map();
  let drag=null,pinch=null;
  const clamp=()=>{
   const scaledW=iw*base*zoom,scaledH=ih*base*zoom;
   const bx=Math.max(0,(scaledW-w)/2),by=Math.max(0,(scaledH-h)/2);
   offsetX=Math.max(-bx,Math.min(bx,offsetX));
   offsetY=Math.max(-by,Math.min(by,offsetY));
  };
  const render=()=>{
   frame=null;clamp();
   ctx.fillStyle='#090a0e';ctx.fillRect(0,0,w,h);
   const sw=iw*base*zoom,sh=ih*base*zoom;
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(photo,(w-sw)/2+offsetX,(h-sh)/2+offsetY,sw,sh);
  };
  const paint=()=>{if(frame===null)frame=requestAnimationFrame(render);};
  const setZoom=(v,anchorX=w/2,anchorY=h/2)=>{
   const previous=zoom;zoom=Math.max(1,Math.min(5,v));
   offsetX=(offsetX+w/2-anchorX)*(zoom/previous)+anchorX-w/2;
   offsetY=(offsetY+h/2-anchorY)*(zoom/previous)+anchorY-h/2;
   slider.value=String(Math.round(zoom*100));label.textContent=Math.round(zoom*100)+'%';paint();
  };
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height};};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const center=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const close=result=>{
   if(finished)return;finished=true;
   if(frame!==null)cancelAnimationFrame(frame);
   pointers.clear();active=false;
   try{dialog.close?.();}catch(_){}
   dialog.remove();
   URL.revokeObjectURL(localUrl);
   done?.(result);
  };
  canvas.addEventListener('pointerdown',e=>{
   e.preventDefault();canvas.setPointerCapture(e.pointerId);
   pointers.set(e.pointerId,point(e));
   if(pointers.size===1){drag={x:point(e).x,y:point(e).y,ox:offsetX,oy:offsetY};pinch=null;}
   if(pointers.size===2){const p=[...pointers.values()];pinch={dist:distance(p[0],p[1]),zoom,center:center(p[0],p[1]),ox:offsetX,oy:offsetY};drag=null;}
  });
  canvas.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId))return;
   e.preventDefault();pointers.set(e.pointerId,point(e));
   if(pointers.size===1&&drag){const p=[...pointers.values()][0];offsetX=drag.ox+p.x-drag.x;offsetY=drag.oy+p.y-drag.y;paint();}
   else if(pointers.size===2&&pinch){
    const p=[...pointers.values()],mid=center(p[0],p[1]);
    const v=Math.max(1,Math.min(5,pinch.zoom*distance(p[0],p[1])/Math.max(1,pinch.dist)));
    zoom=pinch.zoom;offsetX=pinch.ox;offsetY=pinch.oy;
    setZoom(v,pinch.center.x,pinch.center.y);
    offsetX+=mid.x-pinch.center.x;offsetY+=mid.y-pinch.center.y;paint();
   }
  });
  const pointerEnd=e=>{
   pointers.delete(e.pointerId);
   if(pointers.size===1){const p=[...pointers.values()][0];drag={x:p.x,y:p.y,ox:offsetX,oy:offsetY};pinch=null;}
   else{drag=null;pinch=null;}
  };
  canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=point(e);setZoom(zoom*(e.deltaY<0?1.08:1/1.08),p.x,p.y);},{passive:false});
  slider.addEventListener('input',()=>setZoom(Number(slider.value)/100));
  dialog.addEventListener('click',async e=>{
   const name=e.target.closest('[data-crop]')?.dataset.crop;
   if(!name)return;
   if(name==='cancel'){close(null);return;}
   if(name==='plus'){setZoom(zoom+.15);return;}
   if(name==='minus'){setZoom(zoom-.15);return;}
   if(name==='reset'){zoom=1;offsetX=0;offsetY=0;setZoom(1);return;}
   if(name==='save'){
    const button=e.target.closest('button');button.disabled=true;
    const status=dialog.querySelector('.an-crop-status');
    try{
     render();
     const result=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Cannot export adjusted photo.')),'image/jpeg',.91));
     const name='an-photo-'+Date.now()+'.jpg';
     close(new File([result],name,{type:'image/jpeg',lastModified:Date.now()}));
    }catch(err){status.textContent=err.message||String(err);button.disabled=false;}
   }
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();close(null)});
  const result=new Promise(resolve=>done=resolve);
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
  render();
  return await result;
 }catch(err){
  active=false;
  dialog?.remove();URL.revokeObjectURL(localUrl);
  throw err;
 }
}
window.ANPhotoEditor={editFile,editUrl};
})();
