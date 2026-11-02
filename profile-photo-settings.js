/* FieldForce Hub – verified self-service profile pictures, inside the 3-dot menu. */
(()=>{'use strict';
 const app=document.getElementById('app');if(!app)return;
 const sb=()=>window.FFH_SUPABASE;
 let queued=false,busy=false;
 const id=()=>{try{return String(JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||'').trim().toUpperCase();}catch{return '';}};
 const safeUrl=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:'';}catch{return '';}};
 const setStatus=(el,message,isError=false)=>{el.textContent=message;el.classList.toggle('ffPhotoError',isError);el.setAttribute('role',isError?'alert':'status');};
 function menu(){
  const drop=app.querySelector('#drop'),logout=drop?.querySelector('#logout');
  if(!drop||!logout||!id()||drop.querySelector('#ffSetProfilePicture'))return;
  const button=document.createElement('button');button.type='button';button.id='ffSetProfilePicture';
  button.textContent='▣ Set Profile Picture';button.setAttribute('aria-label','Set Profile Picture');
  button.onclick=()=>{drop.classList.remove('show');open();};logout.before(button);
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;menu();});}
 async function resize(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)
   throw Error('Choose a JPG, PNG or WebP photo under 20 MB.');
  let bitmap=null,objectUrl='',image;
  try{
   if(typeof createImageBitmap==='function'){bitmap=await createImageBitmap(file);image=bitmap;}
   else{objectUrl=URL.createObjectURL(file);image=await new Promise((resolve,reject)=>{const element=new Image();element.onload=()=>resolve(element);element.onerror=()=>reject(Error('Cannot open this image.'));element.src=objectUrl;});}
   const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
   if(!width||!height)throw Error('This picture is empty or damaged.');
   const factor=Math.min(1,1600/Math.max(width,height)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(width*factor));canvas.height=Math.max(1,Math.round(height*factor));
   const context=canvas.getContext('2d');if(!context)throw Error('Your phone does not support photo conversion.');
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Could not prepare your photo.')),'image/jpeg',0.88));
   if(blob.size>5*1024*1024)throw Error('The resized picture is still too large.');
   return blob;
  }finally{bitmap?.close?.();if(objectUrl)URL.revokeObjectURL(objectUrl);}
 }

 async function cropImage(file,composition){
  if(!composition?.ready)throw Error('Choose a photo and position it in the round frame first.');
  let bitmap=null,objectUrl='',source;
  try{
   if(typeof createImageBitmap==='function'){bitmap=await createImageBitmap(file);source=bitmap;}
   else{objectUrl=URL.createObjectURL(file);source=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Could not open this photo.'));im.src=objectUrl;});}
   const w=source.width||source.naturalWidth,h=source.height||source.naturalHeight;
   const zoom=Math.max(1,Math.min(4,composition.zoom||1));
   const side=Math.min(w,h)/zoom,scale=(composition.side||240)/side;
   const sx=Math.max(0,Math.min(w-side,(w-side)/2-(composition.x||0)/scale));
   const sy=Math.max(0,Math.min(h-side,(h-side)/2-(composition.y||0)/scale));
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo crop is unsupported on this device.');
   ctx.drawImage(source,sx,sy,side,side,0,0,640,640);
   return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not crop your photo.')),'image/jpeg',0.90));
  }finally{bitmap?.close?.();if(objectUrl)URL.revokeObjectURL(objectUrl);}
 }
 async function save(file,notice,saveButton,composition){
  if(busy)return false;
  const client=sb(),staffId=id();if(!client?.auth||!client?.storage||!staffId)throw Error('Sign in to your account to set a photo.');
  busy=true;saveButton.disabled=true;
  try{
   setStatus(notice,'Verifying your account…');
   const {data:auth,error:authError}=await client.auth.getUser();
   if(authError||!auth?.user?.id)throw Error('Your login has expired. Sign in again.');
   const userId=auth.user.id;
   const {data:profile,error:profileError}=await client.from('ffh_profiles').select('staff_id,active,login_approved,photo_url')
    .eq('auth_user_id',userId).maybeSingle();
   if(profileError||!profile||String(profile.staff_id).toUpperCase()!==staffId||profile.active===false||profile.login_approved===false)
    throw Error('Your staff profile could not be verified. Please sign in again.');
   setStatus(notice,'Preparing your round profile crop and full photo…');
   const [original,crop]=await Promise.all([resize(file),cropImage(file,composition)]);
   const suffix=typeof crypto.randomUUID==='function'?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
   const root='profiles/'+profile.staff_id.toLowerCase()+'/';
   const stem='v2-'+Date.now()+'-'+suffix+'.jpg';
   const path=root+'photo-'+stem,fullPath=root+'full-'+stem;
   const bucket=client.storage.from('ffh-public');
   setStatus(notice,'Uploading image…');
   const {error:fullError}=await bucket.upload(fullPath,original,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});
   if(fullError)throw Error('Full photo upload failed: '+fullError.message);
   const {error:uploadError}=await bucket.upload(path,crop,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});
   if(uploadError)throw Error('Profile crop upload failed: '+uploadError.message);
   const url=safeUrl(bucket.getPublicUrl(path)?.data?.publicUrl);
   if(!url)throw Error('The uploaded photo URL is invalid.');
   setStatus(notice,'Saving profile…');
   const {data:saved,error:saveError}=await client.from('ffh_profiles').update({photo_url:url,updated_at:new Date().toISOString()})
    .eq('staff_id',profile.staff_id).eq('auth_user_id',userId).select('staff_id,photo_url').maybeSingle();
   if(saveError||!saved||saved.photo_url!==url)
    throw Error('Profile photo save was not confirmed: '+(saveError?.message||'Please try again.'));
   try{
    const session=JSON.parse(localStorage.getItem('ffh_session')||'null');
    if(session&&String(session.id).toUpperCase()===staffId){
     session.photo=url;localStorage.setItem('ffh_session',JSON.stringify(session));
    }
   }catch(error){console.warn('Profile photo local cache:',error);}
   window.FFH_STAFF_PHOTOS?.updateOwn?.(staffId,url);
   setStatus(notice,'Photo saved successfully. Your new photo is now visible.');
   await window.FFH_STAFF_PHOTOS?.refresh?.(true);
   return true;
  }finally{busy=false;saveButton.disabled=false;}
 }
 function open(){
  if(!id()||document.getElementById('ffProfilePhotoDialog'))return;
  const overlay=document.createElement('div');overlay.id='ffProfilePhotoDialog';overlay.className='ffProfilePhotoBackdrop';
  overlay.innerHTML='<section class="ffProfilePhotoPanel" role="dialog" aria-modal="true" aria-labelledby="ffProfilePhotoHeading">'
   +'<div class="ffProfilePhotoHead"><h2 id="ffProfilePhotoHeading">SET PROFILE PICTURE</h2><button type="button" id="ffProfilePhotoClose" aria-label="Close">×</button></div>'
   +'<p>This photo appears on your Home, Dashboards, staff cards and Live Chat.</p>'
   +'<div class="ffProfilePhotoPreview" id="ffProfileCropStage" aria-label="Drag and pinch to position your photo inside the round profile frame"><img id="ffProfilePhotoPreview" draggable="false" alt="Adjust your circular profile crop" hidden><span id="ffProfilePhotoPlaceholder">Choose a photo to preview it in a circle.</span></div>'
   +'<div id="ffPhotoCropControls" class="ffCropControls" hidden><button type="button" id="ffPhotoCropMinus" aria-label="Zoom out">−</button><input type="range" id="ffPhotoCropZoom" aria-label="Profile photo zoom" min="100" max="400" value="100" step="1"><button type="button" id="ffPhotoCropPlus" aria-label="Zoom in">+</button><button type="button" id="ffPhotoCropReset">RESET</button></div>'
   +'<p id="ffCropHint" hidden>Drag to move · Pinch or use + / − to zoom. What you see in the circle is what will be saved.</p>'
   +'<input type="file" accept=".jpg,.jpeg,.png,.webp" id="ffProfilePhotoFile" style="display:none">'
   +'<button type="button" id="ffProfilePhotoChoose" class="secondary">CHOOSE / REPLACE PHOTO</button>'
   +'<button type="button" id="ffProfilePhotoSave" class="primary" disabled>SAVE PROFILE PICTURE</button>'
   +'<p role="status" aria-live="polite" id="ffProfilePhotoStatus">Choose, drag and zoom to fit the round frame. Your original full photo is also kept.</p>'
   +'</section>';document.body.append(overlay);
  let file=null,previewUrl='';
  const crop={ready:false,zoom:1,x:0,y:0,side:240,naturalWidth:0,naturalHeight:0};
  const close=window.FFH_OVERLAY?window.FFH_OVERLAY(overlay,()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);overlay.remove();}):()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);overlay.remove();};
  const pick=overlay.querySelector('#ffProfilePhotoFile'),preview=overlay.querySelector('#ffProfilePhotoPreview');
  const message=overlay.querySelector('#ffProfilePhotoStatus'),saveButton=overlay.querySelector('#ffProfilePhotoSave');
  const cropStage=overlay.querySelector('#ffProfileCropStage');
  const cropSlider=overlay.querySelector('#ffPhotoCropZoom');
  const controls=overlay.querySelector('#ffPhotoCropControls');
  const pointers=new Map();let drag=null,pinch=null;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function drawCrop(){
   if(!crop.ready)return;
   crop.side=cropStage.clientWidth||240;
   const factor=crop.side/Math.min(crop.naturalWidth,crop.naturalHeight);
   const width=crop.naturalWidth*factor,height=crop.naturalHeight*factor;
   crop.x=clamp(crop.x,-(width*crop.zoom-crop.side)/2,(width*crop.zoom-crop.side)/2);
   crop.y=clamp(crop.y,-(height*crop.zoom-crop.side)/2,(height*crop.zoom-crop.side)/2);
   preview.style.width=width+'px';preview.style.height=height+'px';
   preview.style.transform='translate(-50%,-50%) translate('+crop.x+'px,'+crop.y+'px) scale('+crop.zoom+')';
   cropSlider.value=String(Math.round(crop.zoom*100));
  }
  const zoom=value=>{crop.zoom=clamp(value,1,4);drawCrop();};
  cropSlider.oninput=()=>zoom(Number(cropSlider.value)/100);
  overlay.querySelector('#ffPhotoCropMinus').onclick=()=>zoom(crop.zoom/1.25);
  overlay.querySelector('#ffPhotoCropPlus').onclick=()=>zoom(crop.zoom*1.25);
  overlay.querySelector('#ffPhotoCropReset').onclick=()=>{crop.x=0;crop.y=0;zoom(1);};
  const distance=()=>{const a=[...pointers.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);};
  cropStage.onpointerdown=e=>{
   if(!crop.ready)return;e.preventDefault();cropStage.setPointerCapture?.(e.pointerId);
   pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(pointers.size===2){pinch={distance:distance(),zoom:crop.zoom};drag=null;}
   else if(pointers.size===1){drag={clientX:e.clientX,clientY:e.clientY,x:crop.x,y:crop.y};pinch=null;}
  };
  cropStage.onpointermove=e=>{
   if(!pointers.has(e.pointerId)||!crop.ready)return;
   e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(pointers.size>=2&&pinch?.distance){zoom(pinch.zoom*distance()/pinch.distance);}
   else if(pointers.size===1&&drag){crop.x=drag.x+(e.clientX-drag.clientX);crop.y=drag.y+(e.clientY-drag.clientY);drawCrop();}
  };
  const release=e=>{
   pointers.delete(e.pointerId);
   pinch=null;
   const a=[...pointers.values()][0];
   drag=a?{clientX:a.x,clientY:a.y,x:crop.x,y:crop.y}:null;
  };
  cropStage.onpointerup=release;cropStage.onpointercancel=release;
  cropStage.onwheel=e=>{if(!crop.ready)return;e.preventDefault();zoom(crop.zoom*(e.deltaY<0?1.12:1/1.12));};
  const onKey=e=>{if(e.key==='Escape'&&!busy)close();};
  overlay.addEventListener('keydown',onKey);
  overlay.querySelector('#ffProfilePhotoClose').onclick=()=>{if(!busy)close();};
  overlay.querySelector('#ffProfilePhotoChoose').onclick=()=>{if(!busy)pick.click();};
  pick.onchange=()=>{
   const selected=pick.files?.[0];if(!selected)return;
   if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>20*1024*1024){
    setStatus(message,'Please choose a JPG, PNG or WebP photo under 20 MB.',true);return;
   }
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   file=selected;previewUrl=URL.createObjectURL(file);preview.src=previewUrl;
   crop.ready=false;crop.zoom=1;crop.x=0;crop.y=0;saveButton.disabled=true;
   preview.onload=()=>{
    crop.naturalWidth=preview.naturalWidth;crop.naturalHeight=preview.naturalHeight;
    crop.ready=!!(crop.naturalWidth&&crop.naturalHeight);if(!crop.ready)return;
    preview.hidden=false;
    overlay.querySelector('#ffProfilePhotoPlaceholder').hidden=true;
    controls.hidden=false;overlay.querySelector('#ffCropHint').hidden=false;
    drawCrop();saveButton.disabled=false;
    setStatus(message,'Adjust the round photo, then SAVE PROFILE PICTURE.');
   };
  };
  saveButton.onclick=async()=>{
   if(!file)return;
   try{
    if(await save(file,message,saveButton,crop)){
     close();window.FFH_STAFF_PHOTOS?.render?.();
    }
   }catch(err){setStatus(message,err?.message||'Could not save photo. Please retry.',true);}
  };
  return overlay;
 }
 const style=document.createElement('style');
 style.textContent=[
 '#ffSetProfilePicture{color:#fff!important;text-align:left!important;min-height:42px}',
 '.ffOwnPhotoEdit{display:none!important}',
 '.ffProfilePhotoBackdrop{position:fixed;inset:0;z-index:32000;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:14px}',
 '.ffProfilePhotoPanel{width:min(94vw,430px);max-height:90dvh;overflow-y:auto;background:#0f0d0b;color:#fff;padding:19px;border:1px solid #f07824;border-radius:18px;box-shadow:0 0 30px #000}',
 '.ffProfilePhotoHead{display:flex;justify-content:space-between;align-items:center;gap:8px}',
 '.ffProfilePhotoHead h2{font-size:19px!important;color:#ff7a18!important;margin:0}',
 '#ffProfilePhotoClose{width:38px!important;height:38px!important;min-height:38px!important;padding:0!important;border-radius:50%!important;color:#fff!important;background:#211a14!important}',
 '.ffProfilePhotoPanel p{font-size:12px;color:#e5ddd7;line-height:1.5;margin:9px 0}',
 '.ffProfilePhotoPreview{position:relative;width:min(62vw,250px);height:auto;aspect-ratio:1;margin:12px auto;background:#080706;border:3px solid #ff7a18;border-radius:50%;overflow:hidden;touch-action:none;user-select:none;box-shadow:0 0 0 4px #302115,0 0 23px #ff7a1830}',
 '.ffProfilePhotoPreview img{position:absolute;left:50%;top:50%;max-width:none!important;max-height:none!important;object-fit:contain;touch-action:none;user-select:none;pointer-events:none;transform-origin:center}',
 '.ffProfilePhotoPreview span{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:16px}',
 '.ffCropControls{display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0}',
 '.ffCropControls[hidden],#ffCropHint[hidden]{display:none!important}',
 '.ffCropControls button{width:36px;min-height:36px;background:#25190f;border:1px solid #ff7a18;color:#fff;border-radius:10px;font-size:17px}',
 '.ffCropControls #ffPhotoCropReset{width:64px;font-size:11px}',
 '.ffCropControls input{flex:1;min-width:0;accent-color:#ff7a18}',
 '.ffProfilePhotoPreview span{padding:16px;text-align:center;color:#dbba9d}',
 '#ffProfilePhotoChoose,#ffProfilePhotoSave{display:block;width:100%;margin-top:12px;min-height:46px;color:#fff}',
 '#ffProfilePhotoStatus.ffPhotoError{color:#ff9c8b;font-weight:700}'
 ].join('');
 document.head.append(style);
 new MutationObserver(schedule).observe(app,{subtree:true,childList:true});
 window.FFH_PROFILE_PICTURE_SETTINGS={open};
 schedule();
})();