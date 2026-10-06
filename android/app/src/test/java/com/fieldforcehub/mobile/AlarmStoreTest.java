package com.fieldforcehub.mobile;
import android.app.*;import android.content.*;import org.json.*;import org.junit.*;import org.junit.runner.RunWith;import org.robolectric.*;import org.robolectric.annotation.Config;import org.robolectric.shadows.ShadowAlarmManager;import java.time.*;
import static org.junit.Assert.*;import static org.robolectric.Shadows.shadowOf;
@RunWith(RobolectricTestRunner.class) @Config(sdk=28,application=Application.class)
public class AlarmStoreTest {
 private Context c;
 @Before public void setup(){c=RuntimeEnvironment.getApplication();AlarmStore.clear(c);}
 @After public void cleanup(){AlarmStore.clear(c);}
 @Test public void dailySaveCancelAndBootRestore()throws Exception{JSONObject alarm=new JSONObject().put("id","daily-test").put("title","Meeting").put("daily",true).put("time","20:25");AlarmStore.save(c,alarm);ShadowAlarmManager manager=shadowOf(c.getSystemService(AlarmManager.class));assertEquals(1,manager.getScheduledAlarms().size());long first=manager.getScheduledAlarms().get(0).triggerAtTime;ZonedDateTime when=Instant.ofEpochMilli(first).atZone(ZoneId.of("Asia/Kuala_Lumpur"));assertEquals(20,when.getHour());assertEquals(25,when.getMinute());assertTrue(first>System.currentTimeMillis());assertEquals(1,AlarmStore.list(c).length());AlarmStore.restore(c);assertEquals(1,manager.getScheduledAlarms().size());AlarmStore.remove(c,"daily-test");assertEquals(0,AlarmStore.list(c).length());assertEquals(0,manager.getScheduledAlarms().size());}
 @Test public void disabledAndPastAlarmsNeverScheduled()throws Exception{AlarmStore.save(c,new JSONObject().put("id","disabled").put("title","Off").put("daily",false).put("at",System.currentTimeMillis()+60000).put("enabled",false));AlarmStore.save(c,new JSONObject().put("id","past").put("title","Old").put("daily",false).put("at",System.currentTimeMillis()-10000));assertEquals(0,shadowOf(c.getSystemService(AlarmManager.class)).getScheduledAlarms().size());}
 @Test public void logoutClearsAllScheduledAlarms()throws Exception{AlarmStore.save(c,new JSONObject().put("id","once").put("title","Visit").put("daily",false).put("at",System.currentTimeMillis()+60000));AlarmStore.clear(c);assertEquals(0,AlarmStore.list(c).length());assertEquals(0,shadowOf(c.getSystemService(AlarmManager.class)).getScheduledAlarms().size());}
}
