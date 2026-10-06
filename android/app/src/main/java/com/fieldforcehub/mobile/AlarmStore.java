package com.fieldforcehub.mobile;
import android.app.*;import android.content.*;import android.os.Build;import org.json.*;import java.time.*;
public final class AlarmStore {
 static final String PREF="ffh_alarms_v1";
 static boolean exact(Context c){return Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();}
 static long next(String time){LocalTime t=LocalTime.parse(time);ZoneId zone=ZoneId.of("Asia/Kuala_Lumpur");ZonedDateTime now=ZonedDateTime.now(zone),at=now.toLocalDate().atTime(t).atZone(zone);if(!at.isAfter(now))at=at.plusDays(1);return at.toInstant().toEpochMilli();}
 static PendingIntent pending(Context c,String id){return PendingIntent.getBroadcast(c,0,new Intent(c,AlarmReceiver.class).setAction("ffh.ring").setData(android.net.Uri.parse("ffh-alarm:"+id)).putExtra("id",id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static void save(Context c,JSONObject p)throws Exception{String id=p.getString("id");if(!id.matches("[a-zA-Z0-9_-]{1,80}"))throw new Exception("Invalid alarm ID");boolean enabled=p.optBoolean("enabled",true);if(enabled&&!exact(c))throw new Exception("Enable Alarms & reminders first");c.getSharedPreferences(PREF,0).edit().putString(id,p.toString()).commit();c.getSystemService(AlarmManager.class).cancel(pending(c,id));if(enabled)schedule(c,p);}
 static void schedule(Context c,JSONObject p)throws Exception{if(!exact(c)||!p.optBoolean("enabled",true))return;long at=p.optBoolean("daily")?next(p.getString("time")):p.getLong("at");if(at<=System.currentTimeMillis())return;PendingIntent show=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class).putExtra("ffh_page","alarms"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);c.getSystemService(AlarmManager.class).setAlarmClock(new AlarmManager.AlarmClockInfo(at,show),pending(c,p.getString("id")));}
 static void remove(Context c,String id){c.getSystemService(AlarmManager.class).cancel(pending(c,id));c.getSharedPreferences(PREF,0).edit().remove(id).commit();}
 static void restore(Context c){for(Object value:c.getSharedPreferences(PREF,0).getAll().values())try{schedule(c,new JSONObject(String.valueOf(value)));}catch(Exception ignored){}}
 static void clear(Context c){for(String id:c.getSharedPreferences(PREF,0).getAll().keySet())remove(c,id);c.stopService(new Intent(c,AlarmRingService.class));}
 static JSONArray list(Context c){JSONArray a=new JSONArray();for(Object value:c.getSharedPreferences(PREF,0).getAll().values())try{a.put(new JSONObject(String.valueOf(value)));}catch(Exception ignored){}return a;}
}
