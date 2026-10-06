package com.fieldforcehub.mobile;
import android.app.*;import android.content.*;import android.os.*;import android.widget.*;
public class AlarmActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true);}else getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED|android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);LinearLayout l=new LinearLayout(this);l.setOrientation(1);l.setPadding(40,100,40,40);l.setBackgroundColor(0xff071015);TextView t=new TextView(this);t.setText(getIntent().getStringExtra("title"));t.setTextSize(28);t.setTextColor(0xffffffff);l.addView(t);Button stop=new Button(this);stop.setText("STOP ALARM");stop.setOnClickListener(v->{stopService(new Intent(this,AlarmRingService.class));finish();});l.addView(stop);setContentView(l);}
}
