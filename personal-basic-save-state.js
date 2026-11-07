/* FieldForce Hub · Personal Basic Save presentation only.
   Retain the existing protected Supabase save RPC. After its confirmed success,
   hide Save until the Basic value or selected person/month changes. */
(()=>{'use strict';
  const root=document.getElementById('app');
  if(!root)return;
  const acknowledged=new WeakSet();
  let saved=null,queued=false;
  const userId=()=>{try{return String(JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||'');}catch{return '';}};
  function snapshot(){
    const field=root.querySelector('#ffPersonalBasic');
    const button=root.querySelector('#ffSavePersonalBasic');
    if(!field||!button)return null;
    return {
      field,button,value:Number(field.value),viewer:userId(),
      month:String(root.querySelector('#ffIncomeMonth')?.value||''),
      staff:String(root.querySelector('.ffIncomeHero h2 span')?.textContent||'').trim()
    };
  }
  function sync(){
    queued=false;
    const v=snapshot();
    if(!v)return;
    const status=root.querySelector('#ffBasicStatus');
    if(status&&!acknowledged.has(status)&&status.textContent.trim()==='Basic saved'){
      acknowledged.add(status);
      saved={value:v.value,viewer:v.viewer,month:v.month,staff:v.staff};
    }
    const done=!!saved&&Number.isFinite(v.value)&&saved.value===v.value&&
      saved.viewer===v.viewer&&saved.month===v.month&&saved.staff===v.staff;
    if(done){
      v.button.style.setProperty('display','none','important');
      v.button.setAttribute('aria-hidden','true');
      v.button.tabIndex=-1;
    }else{
      v.button.style.removeProperty('display');
      v.button.removeAttribute('aria-hidden');
      v.button.removeAttribute('tabindex');
    }
  }
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(sync);
  }
  root.addEventListener('input',e=>{if(e.target?.id==='ffPersonalBasic')sync();});
  root.addEventListener('change',e=>{if(e.target?.id==='ffPersonalBasic')sync();});
  new MutationObserver(queue).observe(root,{subtree:true,childList:true,characterData:true});
  queue();
})();
