const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(require('node:path').join(__dirname,'../accounts.js'),'utf8');
async function setup(owner){
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only'}),w=dom.window,calls=[],alerts=[];
 const row={operation:'UPDATE',table_name:'ffh_sales',actor_name:'<script>bad</script>',actor:'S100',actor_zone:'KL',occurred_at:'2026-10-18',row_key:{id:'S1'},before_data:{qty:1},after_data:{qty:2}};
 let failRestore=false,confirm=true;
 w.alert=s=>alerts.push(s);w.confirm=()=>confirm;
 const q=s=>w.document.querySelector(s),state={profiles:[],zones:[],grants:[],zone_access:[],requests:[],outlets:[]};
 const ctx={user:()=>({id:owner?'M21954':'S100'}),FFH_SUPABASE:{rpc:async(n,b)=>{calls.push(b);if(b.action==='restore'&&failRestore)return {error:{message:'Restore conflict'}};return {data:b.action==='state'?state:b.action==='history'?(b.payload.offset===0?Array.from({length:1000},()=>row):[row]):b.action==='trash'?[{id:7,table_name:'ffh_sales',row_key:{id:'S1'},deleted_by:'S100',deleted_at:'2026-10-18'}]:{ok:true}};}},shell:s=>q('main').innerHTML=s,back:t=>'<h1>'+t+'</h1>',esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),bindBack(){},q,qa:s=>[...w.document.querySelectorAll(s)],setPage(){},ffhLoadCloud:async()=>calls.push({action:'refresh'})};
 w.eval(source);await w.FFH_CREATE_ACCOUNTS(ctx)();
 return {w,q,calls,alerts,close:()=>dom.window.close(),setFailure:v=>failRestore=v,setConfirm:v=>confirm=v};
}
const tick=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 const a=await setup(true);await a.q('#ffHistory').onclick();assert.equal(a.q('script'),null);assert.ok(a.q('summary').textContent.includes('<script>bad</script>'));
 assert.equal(a.calls.at(-1).payload.offset,0);await a.q('#ffHistoryMore').onclick();assert.equal(a.calls.at(-1).payload.offset,1000);assert.equal(a.w.document.querySelectorAll('details').length,1001);
 a.q('#ffHistoryMonth').value='2026-09';a.q('#ffHistoryMonth').dispatchEvent(new a.w.Event('change'));await tick();assert.equal(a.calls.at(-1).payload.month,'2026-09');assert.equal(a.calls.at(-1).payload.offset,0);
 await a.q('#ffHistoryBack').onclick();await a.q('#ffTrash').onclick();assert.ok(a.q('[data-action=restore]'));
 a.setFailure(true);await a.q('[data-action=restore]').onclick();assert.equal(a.alerts.at(-1),'Restore conflict');assert.equal(a.q('[data-action=restore]').disabled,false);assert.equal(a.calls.filter(x=>x.action==='refresh').length,0);
 a.setFailure(false);await a.q('[data-action=restore]').onclick();assert.equal(a.calls.filter(x=>x.action==='refresh').length,1);
 const before=a.calls.filter(x=>x.action==='purge').length;a.setConfirm(false);await a.q('[data-action=purge]').onclick();assert.equal(a.calls.filter(x=>x.action==='purge').length,before);a.close();
 const b=await setup(false);assert.equal(b.q('#ffCreateAccount'),null);assert.equal(b.q('#ffHistory'),null);assert.equal(b.q('#ffTrash'),null);b.close();
 console.log('PASS History month/reset/pagination/escaped actor; owner restore/error recovery; purge cancellation; SR restore/purge controls hidden. Mocked DOM only.');
})().catch(e=>{console.error(e);process.exit(1)});
