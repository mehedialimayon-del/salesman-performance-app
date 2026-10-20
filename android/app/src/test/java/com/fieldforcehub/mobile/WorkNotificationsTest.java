package com.fieldforcehub.mobile;
import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;
import android.app.*;
import android.content.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=28,application=Application.class)
public class WorkNotificationsTest {
 @Test public void testPostsToTheSignatureChannelAndOpensInbox(){
  Context c=RuntimeEnvironment.getApplication();WorkNotifications.test(c);
  Notification n=shadowOf(c.getSystemService(NotificationManager.class)).getNotification(WorkNotifications.TEST_ID);
  assertNotNull(n);assertEquals(NotificationChannels.MESSAGES,n.getChannelId());
  assertEquals("FieldForce test notification",n.extras.getString(Notification.EXTRA_TITLE));
  Intent tap=shadowOf(n.contentIntent).getSavedIntent();
  assertEquals(MainActivity.class.getName(),tap.getComponent().getClassName());assertEquals("notifications",tap.getStringExtra("ffh_page"));
  assertTrue(c.getSystemService(NotificationManager.class).getNotificationChannel(n.getChannelId()).getSound().toString().endsWith("/raw/ffh_notification"));
 }
 @Test public void globallyDisabledNotificationsProduceAnActionableError(){
  Context c=RuntimeEnvironment.getApplication();shadowOf(c.getSystemService(NotificationManager.class)).setNotificationsEnabled(false);
  try{WorkNotifications.test(c);fail("disabled notifications accepted");}catch(IllegalStateException e){assertTrue(e.getMessage().contains("phone settings"));}
  assertNull(shadowOf(c.getSystemService(NotificationManager.class)).getNotification(WorkNotifications.TEST_ID));
 }
 @Test public void disabledSignatureChannelDoesNotClaimSuccess(){
  Context c=RuntimeEnvironment.getApplication();NotificationManager m=c.getSystemService(NotificationManager.class);
  m.createNotificationChannel(new NotificationChannel(NotificationChannels.MESSAGES,"Disabled",NotificationManager.IMPORTANCE_NONE));
  try{WorkNotifications.test(c);fail("disabled channel accepted");}catch(IllegalStateException e){assertTrue(e.getMessage().contains("messages & tasks"));}
  assertNull(shadowOf(m).getNotification(WorkNotifications.TEST_ID));
 }
}
