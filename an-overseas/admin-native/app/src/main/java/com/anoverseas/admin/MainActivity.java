package com.anoverseas.admin;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.webkit.WebView.WebViewTransport;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.os.Message;

public class MainActivity extends Activity {
    private static final String HOME = "https://mehedialimayon-del.github.io/salesman-performance-app/an-overseas/admin-app/";
    private static final String CHANNEL = "an_admin_foreground";
    private WebView web;
    private ValueCallback<Uri[]> pendingFilePicker;
    private static final int FILE_PICKER_REQUEST = 5101;
    private long lastBack = 0L;

    private boolean isAdminPage(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
            && "mehedialimayon-del.github.io".equalsIgnoreCase(uri.getHost())
            && uri.getPath() != null
            && uri.getPath().startsWith("/salesman-performance-app/an-overseas/admin-app/");
    }

    private void openOutside(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (Exception ex) {
            Toast.makeText(this, "No application can open this link.", Toast.LENGTH_LONG).show();
        }
    }

    private final class Notifications {
        @JavascriptInterface
        public void notifyNew(String title, String body) {
            runOnUiThread(() -> postAlert(title, body));
        }
    }

    private void postAlert(String title, String body) {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title == null ? "A&N Overseas" : title)
            .setContentText(body == null ? "New admin update." : body)
            .setContentIntent(pi).setAutoCancel(true);
        manager.notify((int) (System.currentTimeMillis() % 100000), b.build());
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(8,9,13));
        getWindow().setNavigationBarColor(Color.rgb(8,9,13));

        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Admin Inbox Alerts",
                NotificationManager.IMPORTANCE_HIGH));
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8,9,13));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(8,9,13));
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);

        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(
                    android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(android.view.WindowInsets.Type.ime());
                root.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return insets;
            });
            root.requestApplyInsets();
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportZoom(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.addJavascriptInterface(new Notifications(), "ANAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (isAdminPage(request.getUrl())) return false;
                openOutside(request.getUrl());
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                               WebChromeClient.FileChooserParams params) {
                if (view == null || view.getUrl() == null || !isAdminPage(Uri.parse(view.getUrl()))) {
                    callback.onReceiveValue(null);
                    return true;
                }
                if (pendingFilePicker != null) pendingFilePicker.onReceiveValue(null);
                pendingFilePicker = callback;
                try {
                    Intent chooser = params.createIntent();
                    chooser.addCategory(Intent.CATEGORY_OPENABLE);
                    chooser.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                        params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);
                    startActivityForResult(chooser, FILE_PICKER_REQUEST);
                    return true;
                } catch (Exception ex) {
                    pendingFilePicker.onReceiveValue(null);
                    pendingFilePicker = null;
                    Toast.makeText(MainActivity.this, "Cannot open the file picker.", Toast.LENGTH_LONG).show();
                    return true;
                }
            }
            @Override public boolean onCreateWindow(WebView view, boolean isDialog,
                           boolean isUserGesture, Message resultMsg) {
                if (!isUserGesture) return false;
                WebView pop = new WebView(MainActivity.this);
                pop.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView child, WebResourceRequest req) {
                        openOutside(req.getUrl());
                        child.destroy();
                        return true;
                    }
                    @Override public void onPageStarted(WebView child, String url, android.graphics.Bitmap favicon) {
                        if (url != null && !"about:blank".equals(url)) {
                            openOutside(Uri.parse(url));
                            child.stopLoading();
                            child.destroy();
                        }
                    }
                });
                WebViewTransport transport = (WebViewTransport) resultMsg.obj;
                transport.setWebView(pop);
                resultMsg.sendToTarget();
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, size) -> {
            if (url != null && url.startsWith("https://")) openOutside(Uri.parse(url));
        });
        if (state != null && web.restoreState(state) != null) return;
        web.loadUrl(HOME);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_PICKER_REQUEST) return;
        if (pendingFilePicker == null) return;
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        pendingFilePicker.onReceiveValue(result);
        pendingFilePicker = null;
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        web.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) { web.goBack(); return; }
        if (System.currentTimeMillis() - lastBack <= 2000) { super.onBackPressed(); return; }
        lastBack = System.currentTimeMillis();
        Toast.makeText(this, "Press Back again to exit A&N Admin.", Toast.LENGTH_SHORT).show();
    }

    @Override protected void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override protected void onDestroy() {
        if (pendingFilePicker != null) {
            pendingFilePicker.onReceiveValue(null);
            pendingFilePicker = null;
        }
        if (web != null) {
            web.removeJavascriptInterface("ANAndroid");
            web.destroy();
        }
        super.onDestroy();
    }
}
