/* One greeting per app entry, independent of internal page renders. */
window.FFH_CREATE_ENTRY_GREETING=function({user,page,show,dismiss}){
 let pending=true,identity=null,hiddenAt=null,timer=0;
 function schedule(){
  clearTimeout(timer);
  const id=user();if(!id)return;
  if(identity!==id){identity=id;pending=true;}
  if(!pending||document.hidden||page()!=='home')return;
  timer=setTimeout(()=>{if(pending&&user()===id&&!document.hidden&&page()==='home'){pending=false;show();}},120);
 }
 function visibility(hidden){
  if(hidden){if(hiddenAt===null)hiddenAt=Date.now();clearTimeout(timer);dismiss();return;}
  if(hiddenAt!==null){if(Date.now()-hiddenAt>=1000)pending=true;hiddenAt=null;}
  schedule();
 }
 document.addEventListener('visibilitychange',()=>visibility(document.hidden));
 window.FFH_APP_VISIBILITY=visibility;
 return{schedule};
};
