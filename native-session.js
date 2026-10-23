/* Android foreground and background work share one serialized token refresher. */
(()=>{
 if(!/FFHSession\/1/.test(navigator.userAgent)||!window.FFHBridge)return;
 window.ffhNativeRequests=window.ffhNativeRequests||{};
 window.ffhNativeReply=(id,result)=>{const pending=window.ffhNativeRequests[id];if(pending){delete window.ffhNativeRequests[id];result.error?pending.reject(new Error(result.error)):pending.resolve(result);}};
 const fetch=window.fetch.bind(window);
 window.FFH_AUTH_FETCH=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  if(url.origin!=='https://svpgjrxeqnluipsgjywk.supabase.co'||url.pathname!=='/auth/v1/token'||url.searchParams.get('grant_type')!=='refresh_token')return fetch(input,init);
  const payload=JSON.parse(init.body||await input.clone().text());
  try{payload.access_token=JSON.parse(localStorage.getItem('sb-svpgjrxeqnluipsgjywk-auth-token')||'null')?.access_token||'';}catch(_){payload.access_token='';}
  const result=await new Promise((resolve,reject)=>{
   const id=crypto.randomUUID(),timeout=setTimeout(()=>{delete window.ffhNativeRequests[id];reject(new TypeError('Session reconnect timed out'));},45000);
   window.ffhNativeRequests[id]={resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(new TypeError(error.message));}};
   try{FFHBridge.postMessage(JSON.stringify({action:'refreshAuth',payload:JSON.stringify({...payload,request_id:id})}));}catch(e){clearTimeout(timeout);delete window.ffhNativeRequests[id];reject(new TypeError('Session reconnect unavailable'));}
  });
  return new Response(result.body,{status:result.status,headers:{'Content-Type':'application/json'}});
 };
})();
