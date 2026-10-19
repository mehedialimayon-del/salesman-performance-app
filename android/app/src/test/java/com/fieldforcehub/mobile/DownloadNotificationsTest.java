package com.fieldforcehub.mobile;

import static org.junit.Assert.*;
import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.robolectric.Shadows.shadowOf;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=28)
public class DownloadNotificationsTest {
 @Test public void excelReceiptOpensExactSavedFileAndGrantsReadAccess()throws Exception{
  Context c=RuntimeEnvironment.getApplication();Uri uri=Uri.parse("content://downloads/42");String name="Delivered-Sales-SR-S1.xlsx";
  DownloadNotifications.completed(c,uri,name,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  Notification n=shadowOf(c.getSystemService(NotificationManager.class)).getNotification(name,0);
  assertNotNull(n);assertEquals(DownloadNotifications.CHANNEL,n.getChannelId());assertTrue(n.extras.getString(Notification.EXTRA_TITLE).contains("Download complete"));assertEquals(name,n.extras.getString(Notification.EXTRA_TEXT));assertNotNull(n.contentIntent);
  Intent tap=shadowOf(n.contentIntent).getSavedIntent();assertEquals(DownloadOpenActivity.class.getName(),tap.getComponent().getClassName());assertEquals(name,tap.getStringExtra("filename"));
  Intent view=DownloadNotifications.savedIntent(c,name);assertEquals(Intent.ACTION_VIEW,view.getAction());assertEquals(uri,view.getData());assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",view.getType());assertTrue((view.getFlags()&Intent.FLAG_GRANT_READ_URI_PERMISSION)!=0);assertEquals(uri,view.getClipData().getItemAt(0).getUri());
 }
 @Test public void pdfAndExcelKeepSeparateNotificationsAndReceipts()throws Exception{
  Context c=RuntimeEnvironment.getApplication();DownloadNotifications.completed(c,Uri.parse("content://downloads/1"),"one.pdf","application/pdf");DownloadNotifications.completed(c,Uri.parse("content://downloads/2"),"two.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  NotificationManager manager=c.getSystemService(NotificationManager.class);Notification pdf=shadowOf(manager).getNotification("one.pdf",0),excel=shadowOf(manager).getNotification("two.xlsx",0);assertNotNull(pdf);assertNotNull(excel);assertNotEquals(pdf.contentIntent,excel.contentIntent);assertEquals("application/pdf",DownloadNotifications.savedIntent(c,"one.pdf").getType());assertEquals(Uri.parse("content://downloads/2"),DownloadNotifications.savedIntent(c,"two.xlsx").getData());
 }
 @Test public void unrecordedAndExternalFileCannotBeOpened()throws Exception{
  Context c=RuntimeEnvironment.getApplication();try{DownloadNotifications.savedIntent(c,"not-saved.xlsx");fail("missing receipt accepted");}catch(java.io.IOException expected){}
  c.getSharedPreferences("ffh_download_receipts",0).edit().putString("bad","{\"uri\":\"https://example.test/file\",\"mime\":\"text/plain\"}").commit();try{DownloadNotifications.savedIntent(c,"bad");fail("external URI accepted");}catch(java.io.IOException expected){}
 }
}
