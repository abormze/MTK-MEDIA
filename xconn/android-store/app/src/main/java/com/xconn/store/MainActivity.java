package com.xconn.store;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final String APPS = "https://abormze.github.io/MTK-MEDIA/xconn/store/apps.json";
    private static final String SELF = "https://abormze.github.io/MTK-MEDIA/xconn/store/version.json";
    static final String ACTION = "com.xconn.store.INSTALL_STATUS";
    private final Handler ui = new Handler(Looper.getMainLooper());

    static final class App {
        String name, pkg, info, color, apk, vName, notes;
        long remote, local = -1;
        TextView status;
        Button btn;
    }

    private final List<App> apps = new ArrayList<>();
    private final ArrayDeque<App> queue = new ArrayDeque<>();
    private App current;
    private LinearLayout list;
    private TextView head;
    private Button all;

    private static String get(String u) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(u + (u.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis()).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(15000);
        c.setUseCaches(false);
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        try (InputStream in = c.getInputStream()) {
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) bo.write(b, 0, n);
        }
        return new String(bo.toByteArray(), StandardCharsets.UTF_8);
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private GradientDrawable bg(int color, int radius, int stroke) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radius));
        if (stroke != 0) g.setStroke(dp(3), stroke);
        return g;
    }

    private Button button(String t, int color) {
        Button b = new Button(this);
        b.setText(t);
        b.setAllCaps(false);
        b.setTextColor(Color.WHITE);
        b.setTextSize(16);
        b.setPadding(dp(18), dp(8), dp(18), dp(8));
        b.setBackground(bg(color, 10, 0));
        b.setFocusable(true);
        b.setOnFocusChangeListener((v, f) -> v.setBackground(bg(color, 10, f ? Color.WHITE : 0)));
        return b;
    }

    @Override
    protected void onCreate(Bundle s) {
        super.onCreate(s);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setBackgroundColor(Color.parseColor("#0B0F17"));
        root.setPadding(dp(24), dp(20), dp(24), dp(20));
        TextView title = new TextView(this);
        title.setText("XCONN STORE");
        title.setTextColor(Color.WHITE);
        title.setTextSize(30);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title);
        head = new TextView(this);
        head.setText("عم جيب التطبيقات...");
        head.setTextColor(Color.parseColor("#9CA3AF"));
        head.setTextSize(15);
        head.setPadding(0, dp(4), 0, dp(12));
        root.addView(head);
        all = button("ثبّت / حدّث الكل", Color.parseColor("#2563EB"));
        all.setTextSize(18);
        all.setOnClickListener(v -> installAll());
        root.addView(all, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        ScrollView sv = new ScrollView(this);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(0, dp(12), 0, 0);
        sv.addView(list);
        root.addView(sv, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        all.requestFocus();
        load();
        handle(getIntent());
    }

    private void load() {
        new Thread(() -> {
            try {
                JSONArray a = new JSONArray(get(APPS));
                List<App> l = new ArrayList<>();
                for (int i = 0; i < a.length(); i++) {
                    JSONObject o = a.optJSONObject(i);
                    if (o == null || o.optBoolean("hidden", false) || !o.has("pkg") || !o.has("version")) continue;
                    App x = new App();
                    x.name = o.optString("name", o.getString("pkg"));
                    x.pkg = o.getString("pkg");
                    x.info = o.optString("info", "");
                    x.color = o.optString("color", "#2563EB");
                    try {
                        JSONObject v = new JSONObject(get(o.getString("version")));
                        x.remote = v.getLong("versionCode");
                        x.apk = v.getString("url");
                        x.vName = v.optString("versionName", "");
                        x.notes = v.optString("notes", "");
                    } catch (Exception e) { x.remote = -1; }
                    l.add(x);
                }
                ui.post(() -> { apps.clear(); apps.addAll(l); render(); });
                selfUpdate();
            } catch (Exception e) {
                ui.post(() -> head.setText("ما قدرت جيب القائمة. تأكد من الإنترنت وافتح التطبيق كمان مرة."));
            }
        }).start();
    }

    private void selfUpdate() {
        try {
            JSONObject v = new JSONObject(get(SELF));
            long local = getPackageManager().getPackageInfo(getPackageName(), 0).getLongVersionCode();
            if (v.getLong("versionCode") <= local) return;
            App me = new App();
            me.name = "XCONN STORE";
            me.pkg = getPackageName();
            me.apk = v.getString("url");
            ui.post(() -> new AlertDialog.Builder(this).setTitle("تحديث XCONN STORE " + v.optString("versionName", ""))
                    .setPositiveButton("تحديث", (d, w) -> { queue.clear(); queue.add(me); next(); })
                    .setNegativeButton("لاحقاً", null).show());
        } catch (Exception ignored) {
        }
    }

    private long installed(String pkg) {
        try {
            PackageInfo p = getPackageManager().getPackageInfo(pkg, 0);
            return p.getLongVersionCode();
        } catch (Exception e) { return -1; }
    }

    private void render() {
        list.removeAllViews();
        int need = 0;
        for (App x : apps) {
            x.local = installed(x.pkg);
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dp(16), dp(12), dp(16), dp(12));
            row.setBackground(bg(Color.parseColor("#161C28"), 14, 0));
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rp.bottomMargin = dp(10);
            TextView dot = new TextView(this);
            int c0;
            try { c0 = Color.parseColor(x.color); } catch (Exception e) { c0 = Color.parseColor("#2563EB"); }
            dot.setBackground(bg(c0, 8, 0));
            String ab = x.name.replaceFirst("(?i)^XCONN\\s*", "");
            dot.setText(ab.isEmpty() ? "M" : ab.substring(0, 1).toUpperCase());
            dot.setTextColor(Color.WHITE);
            dot.setTextSize(20);
            dot.setTypeface(null, android.graphics.Typeface.BOLD);
            dot.setGravity(Gravity.CENTER);
            row.addView(dot, new LinearLayout.LayoutParams(dp(42), dp(42)));
            LinearLayout txt = new LinearLayout(this);
            txt.setOrientation(LinearLayout.VERTICAL);
            txt.setPadding(dp(14), 0, dp(14), 0);
            TextView n = new TextView(this);
            n.setText(x.name);
            n.setTextColor(Color.WHITE);
            n.setTextSize(19);
            n.setTypeface(null, android.graphics.Typeface.BOLD);
            txt.addView(n);
            x.status = new TextView(this);
            x.status.setTextColor(Color.parseColor("#9CA3AF"));
            x.status.setTextSize(14);
            txt.addView(x.status);
            row.addView(txt, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            String label;
            int col;
            if (x.remote < 0) { label = "غير متوفر"; col = Color.parseColor("#374151"); }
            else if (x.local < 0) { label = "تثبيت"; col = Color.parseColor("#2563EB"); need++; }
            else if (x.remote > x.local) { label = "تحديث"; col = Color.parseColor("#16A34A"); need++; }
            else { label = "فتح"; col = Color.parseColor("#374151"); }
            x.status.setText(x.info + "  •  " + (x.local < 0 ? "مش مثبّت" : x.remote > x.local ? "في تحديث " + x.vName : "مثبّت ومحدّث"));
            x.btn = button(label, col);
            x.btn.setOnClickListener(v -> {
                if (x.remote < 0) return;
                if (x.local >= 0 && x.remote <= x.local) {
                    Intent i = getPackageManager().getLeanbackLaunchIntentForPackage(x.pkg);
                    if (i == null) i = getPackageManager().getLaunchIntentForPackage(x.pkg);
                    if (i != null) startActivity(i);
                } else { queue.clear(); queue.add(x); next(); }
            });
            row.addView(x.btn);
            list.addView(row, rp);
        }
        head.setText(need == 0 ? "كل التطبيقات مثبّتة ومحدّثة." : need + " تطبيق بدهم تثبيت أو تحديث. أندرويد رح يطلب منك تكبس «تثبيت» لكل واحد.");
        all.setEnabled(need > 0);
        all.setAlpha(need > 0 ? 1f : .5f);
    }

    private void installAll() {
        queue.clear();
        for (App x : apps) if (x.remote >= 0 && (x.local < 0 || x.remote > x.local)) queue.add(x);
        next();
    }

    private boolean canInstall() {
        if (getPackageManager().canRequestPackageInstalls()) return true;
        new AlertDialog.Builder(this).setTitle("اسمح بالتثبيت")
                .setMessage("لازم تسمح لـ XCONN STORE يثبّت تطبيقات. فعّلها وارجع اكبس «ثبّت الكل» كمان مرة.")
                .setPositiveButton("فتح الإعدادات", (d, w) -> {
                    try { startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()))); }
                    catch (Exception e) { startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS)); }
                })
                .setNegativeButton("إلغاء", null).show();
        return false;
    }

    private void next() {
        current = queue.poll();
        if (current == null) { render(); return; }
        if (!canInstall()) { queue.clear(); current = null; return; }
        final App x = current;
        head.setText("عم نزّل " + x.name + "... " + (queue.isEmpty() ? "" : "(بعدو " + queue.size() + ")"));
        if (x.status != null) x.status.setText("0%");
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(x.apk + "?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                long total = c.getContentLengthLong();
                PackageInstaller pi = getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams sp = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                sp.setAppPackageName(x.pkg);
                if (Build.VERSION.SDK_INT >= 31) sp.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                if (total > 0) sp.setSize(total);
                int id = pi.createSession(sp);
                try (PackageInstaller.Session s = pi.openSession(id)) {
                    try (InputStream in = c.getInputStream(); OutputStream out = s.openWrite("app.apk", 0, total)) {
                        byte[] b = new byte[65536];
                        long done = 0;
                        int n, last = -1;
                        while ((n = in.read(b)) > 0) {
                            out.write(b, 0, n);
                            done += n;
                            int pc = total > 0 ? (int) (done * 100 / total) : -1;
                            if (pc != last) {
                                last = pc;
                                final int v = pc;
                                ui.post(() -> { if (x.status != null) x.status.setText(v >= 0 ? "عم ينزل " + v + "%" : "عم ينزل..."); });
                            }
                        }
                        s.fsync(out);
                    }
                    Intent i = new Intent(this, MainActivity.class).setAction(ACTION).putExtra("pkg", x.pkg);
                    PendingIntent pe = PendingIntent.getActivity(this, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                    s.commit(pe.getIntentSender());
                }
                ui.post(() -> { if (x.status != null) x.status.setText("عم يثبّت..."); });
            } catch (Exception e) {
                ui.post(() -> { if (x.status != null) x.status.setText("فشل التنزيل"); next(); });
            }
        }).start();
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        handle(i);
    }

    private void handle(Intent i) {
        if (i == null || !ACTION.equals(i.getAction())) return;
        int st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = i.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(confirm); } catch (Exception e) { next(); }
            }
            return;
        }
        if (current != null && current.status != null)
            current.status.setText(st == PackageInstaller.STATUS_SUCCESS ? "انثبّت ✓" : "ما انثبّت");
        ui.postDelayed(this::next, 600);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (current == null && !apps.isEmpty()) render();
    }
}
