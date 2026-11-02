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
 async function save(file,notice,saveButton){
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
   setStatus(notice,'Preparing the complete photo…');const blob=await resize(file);
   const suffix=typeof crypto.randomUUID==='function'?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
   const path='profiles/'+profile.staff_id.toLowerCase()+'/photo-'+Date.now()+'-'+suffix+'.jpg';
   const bucket=client.storage.from('ffh-public');
   setStatus(notice,'Uploading image…');
   const {error:uploadError}=await bucket.upload(path,blob,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});
   if(uploadError)throw Error('Photo upload failed: '+uploadError.message);
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
   +'<div class="ffProfilePhotoPreview"><img id="ffProfilePhotoPreview" class="zoomable" alt="Full size photo preview" hidden><span id="ffProfilePhotoPlaceholder">Choose a photo to preview the full image.</span></div>'
   +'<input type="file" accept=".jpg,.jpeg,.png,.webp" id="ffProfilePhotoFile" style="display:none">'
   +'<button type="button" id="ffProfilePhotoChoose" class="secondary">CHOOSE / REPLACE PHOTO</button>'
   +'<button type="button" id="ffProfilePhotoSave" class="primary" disabled>SAVE PROFILE PICTURE</button>'
   +'<p role="status" aria-live="polite" id="ffProfilePhotoStatus">JPG, PNG or WebP. Full photo is kept; only the small round avatar is cropped.</p>'
   +'</section>';document.body.append(overlay);
  let file=null,previewUrl='';
  const close=window.FFH_OVERLAY?window.FFH_OVERLAY(overlay,()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);overlay.remove();}):()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);overlay.remove();};
  const pick=overlay.querySelector('#ffProfilePhotoFile'),preview=overlay.querySelector('#ffProfilePhotoPreview');
  const message=overlay.querySelector('#ffProfilePhotoStatus'),saveButton=overlay.querySelector('#ffProfilePhotoSave');
  overlay.querySelector('#ffProfilePhotoClose').onclick=()=>{if(!busy)close();};
  overlay.querySelector('#ffProfilePhotoChoose').onclick=()=>{if(!busy)pick.click();};
  pick.onchange=()=>{
   const selected=pick.files?.[0];if(!selected)return;
   if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>20*1024*1024){
    setStatus(message,'Please choose a JPG, PNG or WebP photo under 20 MB.',true);return;
   }
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   file=selected;previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.hidden=false;
   overlay.querySelector('#ffProfilePhotoPlaceholder').hidden=true;saveButton.disabled=false;
   setStatus(message,'Photo ready. Tap SAVE PROFILE PICTURE.');
  };
  saveButton.onclick=async()=>{
   if(!file)return;
   try{
    if(await save(file,message,saveButton)){
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
 '.ffProfilePhotoPreview{display:flex;align-items:center;justify-content:center;height:min(40dvh,270px);background:#080706;border:1px solid #654023;border-radius:12px;overflow:hidden}',
 '.ffProfilePhotoPreview img{width:100%;height:100%;object-fit:contain;cursor:zoom-in}',
 '.ffProfilePhotoPreview span{padding:16px;text-align:center;color:#dbba9d}',
 '#ffProfilePhotoChoose,#ffProfilePhotoSave{display:block;width:100%;margin-top:12px;min-height:46px;color:#fff}',
 '#ffProfilePhotoStatus.ffPhotoError{color:#ff9c8b;font-weight:700}'
 ].join('');
 document.head.append(style);
 new MutationObserver(schedule).observe(app,{subtree:true,childList:true});
 window.FFH_PROFILE_PICTURE_SETTINGS={open};
 schedule();
})();