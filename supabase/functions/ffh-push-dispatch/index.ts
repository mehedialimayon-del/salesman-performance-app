import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
  if(req.method!=='POST') return json({error:'POST required'},405);

  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const one=Deno.env.get('ONESIGNAL_REST_API_KEY');
  const app='b867a503-3728-411a-977d-cad4bd9b2440';
  if(!url||!key||!one){
    if(url&&key){
      const sb=createClient(url,key,{auth:{persistSession:false}});
      await sb.from('ffh_notification_heartbeat').upsert({id:1,last_run_at:new Date().toISOString(),last_error:'Missing ONESIGNAL_REST_API_KEY'});
    }
    return json({error:'Missing server configuration',missing:[!url?'SUPABASE_URL':null,!key?'SUPABASE_SERVICE_ROLE_KEY':null,!one?'ONESIGNAL_REST_API_KEY':null].filter(Boolean)},503);
  }

  const sb=createClient(url,key,{auth:{persistSession:false}});
  // Remove attendance photos after 30 days through the Storage API.
  const {data:expiredPhotos}=await sb.from('ffh_attendance').select('id,photo_path').lt('check_in',new Date(Date.now()-30*86400000).toISOString()).not('photo_path','is',null).limit(10);
  for(const photo of expiredPhotos||[]){const {error}=await sb.storage.from('ffh-attendance').remove([photo.photo_path]);if(!error)await sb.from('ffh_attendance').update({photo_path:null}).eq('id',photo.id);}
  const notificationKey=async (jobId:string,staffId:string)=>{ const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(jobId+'|'+staffId))); bytes[6]=(bytes[6]&15)|80; bytes[8]=(bytes[8]&63)|128; const hex=Array.from(bytes.slice(0,16),b=>b.toString(16).padStart(2,'0')).join(''); return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join('-'); };
  const targetPage=(type:string)=>(({task:'tasks',tasks:'tasks',zero:'zero',cpo:'cpo',promotion:'cpo',sales:'sales',route:'route',message:'communication',tracking:'tracking',meeting:'meetings',notice:'notices',claim:'claims',ai_question:'aiQuestions',ai_answer:'aiQuestions',alarm_setup:'alarms'} as Record<string,string>)[type]||'notifications');
  const now=new Date().toISOString();
  await sb.from('ffh_notification_heartbeat').upsert({id:1,last_run_at:now,last_error:null});
  const {data:due,error}=await sb.from('ffh_notification_jobs').select('*').eq('status','scheduled').lte('scheduled_at',now).order('scheduled_at').limit(40);
  if(error) return json({error:error.message},500);

  let accepted=0,failed=0;
  for(const job of due||[]){
    const {data:claim}=await sb.from('ffh_notification_jobs').update({status:'dispatching'}).eq('id',job.id).eq('status','scheduled').select('id');
    if(!claim?.length) continue;
    try{
      let peopleQuery=sb.from('ffh_profiles').select('staff_id').eq('active',true);
      if(job.recipient==='ALL') peopleQuery=peopleQuery.eq('can_sell',true);
      const {data:people,error:pe}=await peopleQuery;
      if(pe) throw pe;
      const ids=(people||[]).map(p=>String(p.staff_id)).filter(id=>job.recipient==='ALL'||id.toUpperCase()===String(job.recipient).toUpperCase());
      if(!ids.length) throw Error('No matching active staff');

      let failures=0;
      for(const staff of ids){
        const {error:ie}=await sb.from('ffh_notification_inbox').upsert({job_id:job.id,staff_id:staff,title:job.title,body:job.body,type:job.type,target_page:targetPage(job.type)},{onConflict:'job_id,staff_id',ignoreDuplicates:true});
        if(ie){failures++;continue}
        const {data:old}=await sb.from('ffh_notification_delivery').select('status').eq('job_id',job.id).eq('staff_id',staff).maybeSingle();
        if(old?.status==='push_accepted') continue;
        await sb.from('ffh_notification_delivery').upsert({job_id:job.id,staff_id:staff,status:'sending',attempted_at:new Date().toISOString()});

        try{
          const page=targetPage(job.type);
          let alarmData=null;if(job.type==='alarm_setup'){const {data:a}=await sb.from('ffh_alarm_schedules').select('*').eq('id',job.provider_response?.ffh_alarm?.id).eq('staff_id',staff).eq('created_by',job.created_by).maybeSingle();if(!a)throw Error('Invalid alarm assignment');alarmData={id:a.id,staff_id:a.staff_id,title:a.title,daily:a.daily,enabled:a.enabled,time:(a.time_of_day||'').slice(0,5),at:a.alarm_at?Date.parse(a.alarm_at):0};}
          const response=await fetch('https://api.onesignal.com/notifications',{
            method:'POST',
            headers:{'Content-Type':'application/json',Authorization:'Key '+one},
            body:JSON.stringify({
              app_id:app,
              include_aliases:{external_id:[staff]},
              target_channel:'push',
              headings:{en:job.title},
              contents:{en:job.body},
              data:{ffh_page:page,ffh_job_id:job.id,...(alarmData?{ffh_alarm:alarmData}:{})},
              priority:10,
              ttl:job.type==='alarm_setup'?86400:259200,
              web_url:'https://mehedialimayon-del.github.io/salesman-performance-app/?ffh_page='+encodeURIComponent(page),
              existing_android_channel_id:'ffh_messages_v2',
              android_sound:'ffh_brand',
              small_icon:'ic_stat_ffh',
              android_accent_color:'FFFF9F43',
              chrome_web_icon:'https://mehedialimayon-del.github.io/salesman-performance-app/an-logo.png',
              idempotency_key:await notificationKey(String(job.id),staff)
            })
          });
          const result=await response.json().catch(()=>({}));
          if(!response.ok||!result.id) throw Error('OneSignal '+response.status+': '+JSON.stringify(result).slice(0,250));
          await sb.from('ffh_notification_delivery').update({status:'push_accepted',provider_id:result.id,last_error:null}).eq('job_id',job.id).eq('staff_id',staff);
          accepted++;
        }catch(e){
          failures++;
          await sb.from('ffh_notification_delivery').update({status:'failed',last_error:String(e)}).eq('job_id',job.id).eq('staff_id',staff);
        }
      }
      await sb.from('ffh_notification_jobs').update({status:failures?'failed':'push_accepted',last_error:failures?failures+' recipients failed':null,provider_response:{...job.provider_response,accepted:ids.length-failures,failed:failures}}).eq('id',job.id);
      failed+=failures;
    }catch(e){
      failed++;
      await sb.from('ffh_notification_jobs').update({status:'failed',last_error:String(e)}).eq('id',job.id);
    }
  }
  // Check provider delivery separately from API acceptance.
  const {data:recent}=await sb.from('ffh_notification_jobs').select('id,provider_response').eq('status','push_accepted').gte('created_at',new Date(Date.now()-48*3600000).toISOString()).order('created_at',{ascending:false}).limit(10);
  for(const job of recent||[]){
    const {data:deliveries}=await sb.from('ffh_notification_delivery').select('provider_id').eq('job_id',job.id).eq('status','push_accepted');
    const checks=[];
    for(const delivery of deliveries||[]){
      if(!delivery.provider_id)continue;
      try{
        const response=await fetch('https://api.onesignal.com/notifications/'+encodeURIComponent(delivery.provider_id)+'?app_id='+app,{headers:{Authorization:'Key '+one}});
        if(response.ok){const result=await response.json();checks.push({id:delivery.provider_id,successful:result.successful,failed:result.failed,remaining:result.remaining,errored:result.errored,received:result.received,completed_at:result.completed_at});}
      }catch(_){}
    }
    if(checks.length)await sb.from('ffh_notification_jobs').update({provider_response:{...job.provider_response,delivery_checks:checks,checked_at:new Date().toISOString()}}).eq('id',job.id);
  }
  await sb.from('ffh_notification_heartbeat').update({last_success_at:new Date().toISOString(),last_error:failed?failed+' delivery failures':null}).eq('id',1);
  return json({processed:due?.length||0,push_accepted:accepted,failed});
});
