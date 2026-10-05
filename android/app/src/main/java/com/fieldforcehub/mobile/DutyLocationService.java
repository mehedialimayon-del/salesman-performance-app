package com.fieldforcehub.mobile;
import android.app.Service;
import android.app.Notification;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.*;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.time.Instant;
public class DutyLocationService extends Service implements LocationListener {
 private LocationManager manager;private final ExecutorService io=Executors.newSingleThreadExecutor();private final Handler timer=new Handler(Looper.getMainLooper());private long shiftEnd,lastFix;private boolean closing=false;
 @Override public IBinder onBind(Intent i){return null;}
 @Override public int onStartCommand(Intent intent,int flags,int startId){if(intent!=null&&"STOP".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}try{JSONObject s=SecureStore.read(this);shiftEnd=Instant.parse(s.getString("shift_end")).toEpochMilli();if(shiftEnd<=System.currentTimeMillis()){stopSelf();return START_NOT_STICKY;}
 Intent open=new Intent(this,MainActivity.class).putExtra("ffh_page","attendance");PendingIntent pi=PendingIntent.getActivity(this,0,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);PendingIntent stop=PendingIntent.getService(this,1,new Intent(this,DutyLocationService.class).setAction("STOP"),PendingIntent.FLAG_IMMUTABLE);
 Notification n=new Notification.Builder(this,"ffh_duty").setSmallIcon(R.drawable.ic_stat_ffh).setContentTitle("FieldForce · Duty tracking active").setContentText("Your work-hours location is shared with authorized managers. Tap to check out.").setContentIntent(pi).setOngoing(true).addAction(new Notification.Action.Builder(null,"Stop tracking",stop).build()).build();if(Build.VERSION.SDK_INT>=29)startForeground(41,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);else startForeground(41,n);
 manager=(LocationManager)getSystemService(LOCATION_SERVICE);manager.removeUpdates(this);for(String provider:new String[]{LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER})if(manager.isProviderEnabled(provider))manager.requestLocationUpdates(provider,15000,0,this,Looper.getMainLooper());timer.removeCallbacksAndMessages(null);timer.postDelayed(this::checkShift,60000);return START_NOT_STICKY;
 }catch(Exception e){stopSelf();return START_NOT_STICKY;}}
 private void checkShift(){if(System.currentTimeMillis()>=shiftEnd){stopSelf();return;}io.execute(()->{try{JSONObject state=DutyApi.rpc(this,"state",new JSONObject());JSONObject a=state.optJSONObject("attendance");if(a==null||!a.isNull("check_out"))stopSelf();else flush();}catch(Exception ignored){}});timer.postDelayed(this::checkShift,60000);}
 @Override public void onLocationChanged(Location location){if(closing||System.currentTimeMillis()>=shiftEnd){stopSelf();return;}if((Build.VERSION.SDK_INT>=31?location.isMock():location.isFromMockProvider())||!location.hasAccuracy()||location.getAccuracy()>100||System.currentTimeMillis()-lastFix<15000)return;lastFix=System.currentTimeMillis();io.execute(()->{try{JSONObject s=SecureStore.read(this);JSONObject p=new JSONObject().put("attendance_id",s.getString("attendance_id")).put("latitude",location.getLatitude()).put("longitude",location.getLongitude()).put("accuracy_m",location.getAccuracy()).put("captured_at",Instant.ofEpochMilli(location.getTime()).toString()).put("source","android").put("mocked",false);if(location.hasSpeed())p.put("speed_mps",location.getSpeed());JSONArray q=s.optJSONArray("queue");if(q==null)q=new JSONArray();if(q.length()>=2048)q.remove(0);q.put(p);SecureStore.merge(this,new JSONObject().put("queue",q));flush();}catch(Exception ignored){}});}
 private void flush()throws Exception{JSONObject s=SecureStore.read(this);JSONArray q=s.optJSONArray("queue");if(q==null)return;int count=0;while(q.length()>0&&count++<20&&!closing){JSONObject p=q.getJSONObject(0);try{DutyApi.rpc(this,"point",p);q.remove(0);SecureStore.merge(this,new JSONObject().put("queue",q));}catch(DutyApi.ApiException e){if(e.code==403){SecureStore.merge(this,new JSONObject().put("queue",new JSONArray()));stopSelf();}return;}}}
 @Override public void onDestroy(){closing=true;timer.removeCallbacksAndMessages(null);if(manager!=null)manager.removeUpdates(this);io.shutdown();super.onDestroy();}
}
