const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const dom=new JSDOM('',{url:'https://mehedialimayon-del.github.io/salesman-performance-app/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.navigator,'userAgent',{value:'FFHNative/1 FFHSession/1'});w.Response=Response;let normal=0,requests=[],status=200;
 w.fetch=async()=>{normal++;return new Response('{}');};w.localStorage.setItem('sb-svpgjrxeqnluipsgjywk-auth-token',JSON.stringify({access_token:'saved-access'}));
 w.FFHBridge={postMessage:raw=>{const request=JSON.parse(raw),payload=JSON.parse(request.payload);requests.push({action:request.action,payload});setTimeout(()=>w.ffhNativeReply(payload.request_id,{status,body:JSON.stringify(status===200?{access_token:'rotated',refresh_token:'latest',user:{id:'auth'}}:{code:'refresh_token_not_found'})}),0);}};
 w.eval(fs.readFileSync('native-session.js','utf8'));
 await w.FFH_AUTH_FETCH('https://svpgjrxeqnluipsgjywk.supabase.co/rest/v1/ffh_profiles');assert.equal(normal,1);
 let response=await w.FFH_AUTH_FETCH('https://svpgjrxeqnluipsgjywk.supabase.co/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:'older'})});assert.equal(response.status,200);assert.equal((await response.json()).refresh_token,'latest');assert.equal(requests[0].action,'refreshAuth');assert.equal(requests[0].payload.access_token,'saved-access');assert.equal(requests[0].payload.refresh_token,'older');assert.equal(Object.keys(w.ffhNativeRequests).length,0);
 status=400;response=await w.FFH_AUTH_FETCH('https://svpgjrxeqnluipsgjywk.supabase.co/auth/v1/token?grant_type=refresh_token',{body:'{"refresh_token":"revoked"}'});assert.equal(response.status,400);assert.equal((await response.json()).code,'refresh_token_not_found');
 w.FFHBridge.postMessage=()=>{throw Error('offline')};await assert.rejects(w.FFH_AUTH_FETCH('https://svpgjrxeqnluipsgjywk.supabase.co/auth/v1/token?grant_type=refresh_token',{body:'{"refresh_token":"saved"}'}),/unavailable/);assert.equal(Object.keys(w.ffhNativeRequests).length,0);
 dom.window.close();console.log('PASS Android refresh broker routing, saved-token selection, SDK-compatible success/revocation, transient bridge failure and cleanup');
})().catch(e=>{console.error(e);process.exit(1)});
