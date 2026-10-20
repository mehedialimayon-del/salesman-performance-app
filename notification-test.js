(function(root){'use strict';
root.FFH_TEST_NOTIFICATION=async()=>{
 const native=root.FieldForceNative;
 if(native){
  if(typeof native.testNotification!=='function')throw Error('Update FieldForce to version 1.17 or later, reopen the app, then test again.');
  const result=await native.testNotification();
  if(!result?.posted)throw Error('Android did not confirm the test notification. Please retry.');
  return result;
 }
 if(root.navigator.userAgent.includes('FFHNative/')||root.FFHBridge)throw Error('The Android notification service is starting. Reopen FieldForce and retry.');
 if(typeof root.Notification==='undefined')throw Error('Use the FieldForce Android app to test phone notifications, or open the web app in a browser that supports notifications.');
 let permission=root.Notification.permission;
 if(permission==='default')permission=await root.Notification.requestPermission();
 if(permission!=='granted')throw Error('Allow notifications in your browser settings, then retry.');
 const options={body:'Your FieldForce test notification is ready.',icon:'an-logo.png',tag:'ffh-manual-test',data:{url:new URL('?ffh_page=notifications',root.location.href).href}};
 const registration=await root.navigator.serviceWorker?.getRegistration?.();
 if(registration)await registration.showNotification('FieldForce test notification',options);
 else new root.Notification('FieldForce test notification',options);
 return {posted:true};
};
})(window);
