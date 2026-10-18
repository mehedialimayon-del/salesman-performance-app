package com.fieldforcehub.mobile;
import static org.junit.Assert.*;
import android.content.Intent;
import android.net.Uri;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
@RunWith(RobolectricTestRunner.class)
public class ContactIntentTest {
 @Test public void emailUsesEmailComposer(){
  Uri uri=Uri.parse("mailto:accounts%40example.com");
  Intent intent=MainActivity.contactIntent(uri);
  assertEquals(Intent.ACTION_SENDTO,intent.getAction());assertEquals(uri,intent.getData());
 }
 @Test public void whatsappUsesExternalLink(){
  Uri uri=Uri.parse("https://wa.me/60123456789");
  Intent intent=MainActivity.contactIntent(uri);
  assertEquals(Intent.ACTION_VIEW,intent.getAction());assertEquals(uri,intent.getData());
 }
 @Test public void arbitrarySchemesAreBlocked(){
  assertNull(MainActivity.contactIntent(Uri.parse("javascript:alert(1)")));
  assertNull(MainActivity.contactIntent(Uri.parse("file:///etc/passwd")));
  assertNull(MainActivity.contactIntent(Uri.parse("intent://arbitrary")));
 }
}
