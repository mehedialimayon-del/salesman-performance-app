package com.ayon.homeforce;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.*;
public class MainActivity extends Activity {
 private static final String APP_URL="https://ayon-home-hub.blackvenus1.chatgpt.site";
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(18,35,59));
  getWindow().setNavigationBarColor(Color.rgb(18,35,59));
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
  root.setGravity(Gravity.CENTER);root.setPadding(36,36,36,36);root.setBackgroundColor(Color.rgb(246,247,250));
  TextView brand=new TextView(this);brand.setText("HomeForce");brand.setTextSize(34);brand.setTextColor(Color.rgb(18,35,59));brand.setGravity(Gravity.CENTER);root.addView(brand);
  TextView subtitle=new TextView(this);subtitle.setText("আমাদের বাসা। আমাদের দায়িত্ব।\n৬ জন সদস্য · ৩টি টিম\n\nরান্না • পরিষ্কার • বাজার • হিসাব");
  subtitle.setTextSize(17);subtitle.setTextColor(Color.rgb(100,119,144));subtitle.setGravity(Gravity.CENTER);subtitle.setPadding(0,28,0,34);root.addView(subtitle);
  Button open=new Button(this);open.setText("অ্যাপ খুলুন");open.setTextColor(Color.WHITE);open.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(237,130,68)));open.setOnClickListener(v->openHome());root.addView(open,new LinearLayout.LayoutParams(-1,60));
  TextView note=new TextView(this);note.setText("\nইন্টারনেট ও নিজের ChatGPT সাইনইন লাগবে।\nHomeForce নিরাপদ ব্রাউজারে খুলবে।");note.setTextSize(12);note.setGravity(Gravity.CENTER);note.setTextColor(Color.rgb(128,144,164));root.addView(note);
  setContentView(root);if(state==null)openHome();
 }
 private void openHome() {
  try {
   Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(APP_URL));
   Bundle extras=new Bundle();extras.putBinder("android.support.customtabs.extra.SESSION",null);
   extras.putInt("android.support.customtabs.extra.TOOLBAR_COLOR",Color.rgb(18,35,59));
   extras.putBoolean("android.support.customtabs.extra.TITLE_VISIBILITY",true);
   intent.putExtras(extras);startActivity(intent);
  } catch (android.content.ActivityNotFoundException e) { Toast.makeText(this,"আগে Chrome বা একটি ব্রাউজার ইনস্টল করুন",Toast.LENGTH_LONG).show(); }
 }
}