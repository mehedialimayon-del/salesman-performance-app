(function(root){'use strict';
root.FFH_BIND_AI_MIC=function({button,input,submit,note,stopSpeech,language}){
 let busy=false,recognizer,disposed=false;
 const reset=()=>{busy=false;button.textContent='🎙';button.classList.remove('listening');};
 const display=text=>{const target=input();if(!target||!button.isConnected)return false;target.value=text;target.dispatchEvent(new Event('input',{bubbles:true}));return true;};
 button.onclick=async()=>{if(busy){if(root.FieldForceNative?.stopVoice)await root.FieldForceNative.stopVoice();else recognizer?.stop();return;}
 stopSpeech?.();busy=true;button.textContent='■';button.classList.add('listening');
 try{if(root.FieldForceNative?.voice){const result=await root.FieldForceNative.voice({language:language(),continuous:false});if(disposed)return;if(result.text&&display(result.text))await submit();else note('কথা শনাক্ত হয়নি। আবার mic চাপুন।');reset();return;}
 const SR=root.SpeechRecognition||root.webkitSpeechRecognition;if(!SR)throw Error('Microphone speech service unavailable');
 recognizer=new SR();recognizer.lang=language();recognizer.continuous=false;recognizer.interimResults=true;
 recognizer.onresult=e=>{let final='',partial='';for(let i=0;i<e.results.length;i++){const text=e.results[i][0].transcript;if(e.results[i].isFinal)final+=text+' ';else partial+=text+' ';}if(!disposed)display((final+partial).trim());if(final.trim()&&!disposed){recognizer.onresult=null;submit();}};
 recognizer.onerror=e=>{if(!disposed)note('Voice input: '+e.error);reset();};recognizer.onend=reset;recognizer.start();
 }catch(e){if(!disposed)note(e.message);reset();}
 };
 const observer=new MutationObserver(()=>{if(button.isConnected)return;disposed=true;if(busy){root.FieldForceNative?.stopVoice?.().catch(()=>{});recognizer?.abort();}observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});
};
})(window);
