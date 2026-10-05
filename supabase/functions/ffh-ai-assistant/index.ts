import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'https://mehedialimayon-del.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 if(req.method!=='POST')return json({error:'POST required'},405);
 try{
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false}});
  const {data:auth,error}=await sb.auth.getUser();if(error||!auth.user)return json({error:'Login required'},401);
  const {data:access,error:ae}=await sb.rpc('ffh_ai_work',{action:'access',payload:{}});if(ae||!(access?.owner||access?.actions?.length))return json({error:'AI Work access required'},403);
  const form=await req.formData();if(form.get('mode')==='status')return json({configured:false,free:true});
  return json({code:'FREE_MODE',error:'Free mode is enabled. Refresh the app and use command examples, direct work or approved Q&A. Paid audio/image/text generation is disabled.'},409);
 }catch(_){return json({error:'Unable to process request'},400);}
});
