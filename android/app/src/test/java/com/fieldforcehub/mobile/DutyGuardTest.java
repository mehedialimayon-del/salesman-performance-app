package com.fieldforcehub.mobile;
import android.app.Application;import android.content.Intent;import android.location.Location;import org.junit.*;import org.junit.runner.RunWith;import org.robolectric.*;import org.robolectric.annotation.Config;import static org.junit.Assert.*;import static org.robolectric.Shadows.shadowOf;
@RunWith(RobolectricTestRunner.class) @Config(sdk=28,application=Application.class)
public class DutyGuardTest {
 @Test public void explicitStopEndsService(){DutyLocationService s=Robolectric.buildService(DutyLocationService.class).create().get();s.onStartCommand(new Intent().setAction("STOP"),0,1);assertTrue(shadowOf(s).isStoppedBySelf());s.onDestroy();}
 @Test public void expiredShiftStopsInsteadOfSharing(){DutyLocationService s=Robolectric.buildService(DutyLocationService.class).create().get();s.onLocationChanged(new Location("gps"));assertTrue(shadowOf(s).isStoppedBySelf());s.onDestroy();}
 @Test public void inaccurateFixDoesNotAdvanceSampling()throws Exception{DutyLocationService s=Robolectric.buildService(DutyLocationService.class).create().get();java.lang.reflect.Field end=DutyLocationService.class.getDeclaredField("shiftEnd");end.setAccessible(true);end.setLong(s,System.currentTimeMillis()+60000);Location p=new Location("gps");p.setAccuracy(200);s.onLocationChanged(p);java.lang.reflect.Field fix=DutyLocationService.class.getDeclaredField("lastFix");fix.setAccessible(true);assertEquals(0,fix.getLong(s));s.onDestroy();}
}
