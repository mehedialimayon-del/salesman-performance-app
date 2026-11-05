/* Shared picker: Zones are labelled with their real assigned Manager.
   Read-only identity metadata; no permission or sales data is granted. */
const FFH_ZONE_PICKER_CACHE={at:0,rows:[],inflight:null};
const ffhZonePhotoUrl=s=>{
 try{const u=new URL(String(s||''));return u.protocol==='https:'?u.href:'';}
 catch{return '';}
};
const ffhZoneManagers=async()=>{
 if(Date.now()-FFH_ZONE_PICKER_CACHE.at<8000&&FFH_ZONE_PICKER_CACHE.rows.length)return FFH_ZONE_PICKER_CACHE.rows;
 if(FFH_ZONE_PICKER_CACHE.inflight)return FFH_ZONE_PICKER_CACHE.inflight;
 FFH_ZONE_PICKER_CACHE.inflight=(async()=>{
  const sb=window.FFH_SUPABASE;
  if(!sb?.rpc)return [];
  const {data,error}=await sb.rpc('ffh_zone_manager_directory');
  if(error)throw error;
  const rows=Array.isArray(data)?data:[];
  FFH_ZONE_PICKER_CACHE.rows=rows;
  FFH_ZONE_PICKER_CACHE.at=Date.now();
  return rows;
 })().finally(()=>{FFH_ZONE_PICKER_CACHE.inflight=null;});
 return FFH_ZONE_PICKER_CACHE.inflight;
};
window.FFH_PICK_ITEM=function({title='Select',items=[],selected='',onSelect}){
 items=items.map(item=>window.FFH_STAFF_ITEM?.(item)||item);
 // A mixed "Choose person / zone" picker contains staff IDs, not just zones.
 // Never interpret a staff ID as a zone or display "MANAGER NOT ASSIGNED" for it.
 const isZonePicker=/\bzone\b/i.test(String(title)) && !/person|staff|representative|\bsr\b|assig(n|nee)/i.test(String(title));
 let managers=new Map();
 const ov=document.createElement('div');ov.className='globalSearchOverlay ffItemPicker'+(isZonePicker?' ffZoneManagerPicker':'');
 ov.innerHTML='<section class="globalSearchBox"><div class="row"><h2></h2><button type="button" class="secondary">CLOSE</button></div><input class="ffPickerSearch" placeholder="Search name, code or zone…"><div class="ffPickerRows"></div></section>';
 ov.querySelector('h2').textContent=title;
 document.body.append(ov);
 ov.style.setProperty('z-index',String(Math.max(26000,...[...document.querySelectorAll('.globalSearchOverlay,.ffTaskModalBackdrop,.ffPhotoViewer')].map(el=>parseInt(getComputedStyle(el).zIndex)||0))+1),'important');
 const close=window.FFH_OVERLAY?window.FFH_OVERLAY(ov,()=>ov.remove()):()=>ov.remove();
 ov.querySelector('.globalSearchBox > .row button').onclick=close;
 const list=ov.querySelector('.ffPickerRows');
 function draw(){
  if(!ov.isConnected)return;
  list.replaceChildren();
  const term=ov.querySelector('input').value.trim().toLowerCase();
  const rows=items.filter(x=>{
   const manager=managers.get(String(x.value).toUpperCase());
   return [x.label,x.detail,x.value,manager?.manager_name,manager?.login_id,manager?.designation].join(' ').toLowerCase().includes(term);
  });
  for(const item of rows){
   const manager=isZonePicker?managers.get(String(item.value).toUpperCase()):null;
   const button=document.createElement('button');
   button.type='button';
   button.className='ffPickerOption'+(isZonePicker?' ffZoneManagerRow':'')+(String(item.value)===String(selected)?' selected':'');
   button.dataset.staffId=String(item.value);
   const body=document.createElement('span');body.className='ffPickerText';
   const label=document.createElement('strong');label.textContent=item.label;body.append(label);
   if(isZonePicker&&String(item.value).toUpperCase()!=='ALL'){
    const identity=document.createElement('small');identity.className='ffZoneManagerIdentity';
    identity.textContent=manager?.staff_id?(manager.manager_name+' · '+(manager.login_id||manager.staff_id)+' · '+String(manager.designation||'MANAGER').replaceAll('_',' ')):'MANAGER NOT ASSIGNED';
    body.append(identity);
    const photo=document.createElement('span');
    photo.className='ffZoneManagerAvatar';
    photo.setAttribute('aria-label',manager?.manager_name?'Enlarge '+manager.manager_name+' photo':'Manager photo not available');
    const url=ffhZonePhotoUrl(manager?.photo_url);
    if(url){
      const img=document.createElement('img');img.src=url;img.alt=(manager.manager_name||'Manager')+' profile photo';
      img.loading='lazy';img.onerror=()=>{photo.textContent=(manager?.manager_name||'M').charAt(0).toUpperCase();img.remove();};
      photo.append(img);
      const zoom=e=>{
       e.preventDefault();e.stopPropagation();
       const full=url.includes('/photo-v2-')?url.replace('/photo-v2-','/full-v2-'):url;
       window.FFH_OPEN_IMAGE?.(full);
      };
      photo.setAttribute('role','button');photo.setAttribute('tabindex','0');
      photo.title='Tap to enlarge photo';
      photo.addEventListener('click',zoom);
      photo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){zoom(e);}});
    }else{
      photo.textContent=(manager?.manager_name||'M').charAt(0).toUpperCase();
      photo.title='No profile photo uploaded';
    }
    button.append(photo);
   } else if(item.detail){
     const detail=document.createElement('small');detail.textContent=item.detail;body.append(detail);
   }
   button.append(body);
   button.onclick=()=>{close();onSelect(item.value,item);};
   list.append(button);
  }
  if(!rows.length)list.textContent='No matching items.';
 }
 ov.querySelector('input').oninput=draw;draw();ov.querySelector('input').focus();
 if(isZonePicker){
  ffhZoneManagers().then(rows=>{
   if(!ov.isConnected)return;
   managers=new Map(rows.filter(r=>r?.zone_id).map(r=>[String(r.zone_id).toUpperCase(),r]));
   draw();
  }).catch(err=>{console.warn('Zone manager details unavailable:',err?.message||err);});
 }
 return close;
};
window.FFH_STYLE_SELECT=function(select,{title='Select',detail}={}){if(!select||select.dataset.ffPicker)return;select.dataset.ffPicker='1';const button=document.createElement('button');button.type='button';button.className='ffSelectTrigger';const sync=()=>{button.textContent=select.selectedOptions?.[0]?.textContent||title;button.disabled=select.disabled;};sync();select.hidden=true;select.after(button);select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','hidden','selected']});button.onclick=()=>window.FFH_PICK_ITEM({title,selected:select.value,items:[...select.options].filter(o=>!o.disabled&&!o.hidden).map(o=>({value:o.value,label:o.textContent,detail:detail?.(o)||''})),onSelect:value=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();}});};
/* Multi-select keeps the original form options and field name intact. */
window.FFH_STYLE_MULTI_SELECT=function(select,{title='Choose items'}={}){if(!select||select.dataset.ffPicker)return;select.dataset.ffPicker='1';const trigger=document.createElement('button');trigger.type='button';trigger.className='ffSelectTrigger';const sync=()=>{const n=select.selectedOptions.length;trigger.textContent=n?n+' selected · edit selection':'Choose SRs · search names';trigger.disabled=select.disabled;};sync();select.hidden=true;select.after(trigger);select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','hidden','selected']});trigger.onclick=()=>{const ov=document.createElement('div');ov.className='globalSearchOverlay ffItemPicker ffMultiPicker';ov.innerHTML='<section class="globalSearchBox"><div class="row"><h2></h2><button type="button" class="secondary" data-close>Done ✓</button></div><input class="ffPickerSearch" placeholder="Search name…"><div class="ffMultiTools"><span></span><button type="button" class="secondary" data-clear>Clear selection</button></div><div class="ffPickerRows"></div></section>';ov.querySelector('h2').textContent=title;document.body.append(ov);ov.style.setProperty('z-index',String(Math.max(26000,...[...document.querySelectorAll('.globalSearchOverlay,.ffTaskModalBackdrop,.ffPhotoViewer')].map(el=>parseInt(getComputedStyle(el).zIndex)||0))+1),'important');const close=window.FFH_OVERLAY?window.FFH_OVERLAY(ov,()=>ov.remove()):()=>ov.remove();ov.querySelector('[data-close]').onclick=close;const status=()=>ov.querySelector('.ffMultiTools span').textContent=select.selectedOptions.length+' selected',draw=()=>{const box=ov.querySelector('.ffPickerRows'),term=ov.querySelector('input').value.toLowerCase();box.replaceChildren();for(const option of select.options){if(option.disabled||option.hidden||!option.textContent.toLowerCase().includes(term))continue;const label=document.createElement('label');label.className='ffPickerOption ffMultiOption';label.dataset.staffId=String(option.value);const check=document.createElement('input');check.type='checkbox';check.checked=option.selected;const name=document.createElement('span');name.textContent=option.textContent;label.append(check,name);check.onchange=()=>{option.selected=check.checked;select.dispatchEvent(new Event('change',{bubbles:true}));status();};box.append(label);}status();};ov.querySelector('[data-clear]').onclick=()=>{for(const option of select.options)option.selected=false;select.dispatchEvent(new Event('change',{bubbles:true}));draw();};ov.querySelector('.ffPickerSearch').oninput=draw;draw();};};
