/* Keep login tokens away from large catalogue-cache quota failures. */
(()=>{
 const pref='ffh_remember_login';
 const remembered=()=>localStorage.getItem(pref)!=='0';
 const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('ffh-auth-session',1);r.onupgradeneeded=()=>r.result.createObjectStore('tokens');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Session storage is busy'));});
 async function disk(mode,key,value){const db=await open();try{return await new Promise((resolve,reject)=>{const t=db.transaction('tokens',mode==='get'?'readonly':'readwrite'),s=t.objectStore('tokens');let result;const r=mode==='get'?s.get(key):mode==='put'?s.put(value,key):s.delete(key);r.onsuccess=()=>{result=r.result;};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}finally{db.close();}}
 window.FFH_AUTH_STORAGE={
  async getItem(key){if(!remembered())return sessionStorage.getItem(key);let value;try{value=localStorage.getItem(key);}catch(_){}if(value!=null)return value;try{return await disk('get',key)||null;}catch(_){return null;}},
  async setItem(key,value){if(!remembered()){sessionStorage.setItem(key,value);return;}let local=false;try{localStorage.setItem(key,value);local=true;}catch(_){}try{await disk('put',key,value);}catch(e){if(!local)throw e;}if(!local)try{localStorage.removeItem(key);}catch(_){}},
  async removeItem(key){sessionStorage.removeItem(key);localStorage.removeItem(key);await disk('delete',key).catch(()=>{});},
  remembered,
  async setRemember(value){const previous=remembered();if(previous===value)return;const key='sb-svpgjrxeqnluipsgjywk-auth-token',saved=await this.getItem(key);localStorage.setItem(pref,value?'1':'0');localStorage.removeItem(key);sessionStorage.removeItem(key);await disk('delete',key).catch(()=>{});if(saved!=null)await this.setItem(key,saved);}
 };
})();
