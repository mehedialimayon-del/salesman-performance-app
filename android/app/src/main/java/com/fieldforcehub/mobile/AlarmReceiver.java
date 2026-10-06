package com.fieldforcehub.mobile;
import android.content.*;import org.json.*;
public class AlarmReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context c,Intent i){if("ffh.stopAlarm".equals(i.getAction())){c.stopService(new Intent(c,AlarmRingService.class));return;}if(!"ffh.ring".equals(i.getAction())){AlarmStore.restore(c);return;}String id=i.getStringExtra("id");String raw=c.getSharedPreferences(AlarmStore.PREF,0).getString(id,null);if(raw==null)return;try{JSONObject p=new JSONObject(raw);if(!p.optBoolean("enabled",true))return;if(p.optBoolean("remote")&&!c.getSharedPreferences("ffh_alarm_options",0).getBoolean("remote",false))return;c.startForegroundService(new Intent(c,AlarmRingService.class).putExtra("title",p.optString("title","FieldForce alarm")));if(p.optBoolean("daily"))AlarmStore.schedule(c,p);else AlarmStore.remove(c,id);}catch(Exception ignored){} }
}
