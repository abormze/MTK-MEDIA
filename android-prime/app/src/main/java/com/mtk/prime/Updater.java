package com.mtk.prime;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class Updater {
    static final String ACTION = "com.mtk.prime.INSTALL_STATUS";
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private static boolean busy;

    static void check(Activity a, String jsonUrl) {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(jsonUrl + "?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setUseCaches(false);
                if (c.getResponseCode() != 200) return;
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                try (InputStream in = c.getInputStream()) {
                    byte[] b = new byte[8192];
                    int n;
                    while ((n = in.read(b)) > 0) bo.write(b, 0, n);
                }
                JSONObject j = new JSONObject(new String(bo.toByteArray(), StandardCharsets.UTF_8));
                long remote = j.getLong("versionCode");
                long local = a.getPackageManager().getPackageInfo(a.getPackageName(), 0).getLongVersionCode();
                if (remote <= local) return;
                String apk = j.getString("url");
                String name = j.optString("versionName", "");
                String notes = j.optString("notes", "");
                UI.post(() -> {
                    if (a.isFinishing() || busy) return;
                    new AlertDialog.Builder(a)
                            .setTitle("تحديث متوفر " + name)
                            .setMessage(notes.isEmpty() ? "في نسخة جديدة من التطبيق." : notes)
                            .setPositiveButton("تحديث", (d, w) -> download(a, apk))
                            .setNegativeButton("لاحقاً", null)
                            .show();
                });
            } catch (Exception ignored) {
            }
        }).start();
    }

    private static void download(Activity a, String apk) {
        busy = true;
        AlertDialog p = new AlertDialog.Builder(a).setTitle("جاري التحديث").setMessage("0%").setCancelable(false).show();
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(apk + "?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                long total = c.getContentLengthLong();
                PackageInstaller pi = a.getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams sp = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                sp.setAppPackageName(a.getPackageName());
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
                                UI.post(() -> p.setMessage(v >= 0 ? v + "%" : "..."));
                            }
                        }
                        s.fsync(out);
                    }
                    Intent i = new Intent(a, a.getClass()).setAction(ACTION);
                    PendingIntent pe = PendingIntent.getActivity(a, id, i,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                    s.commit(pe.getIntentSender());
                }
                UI.post(p::dismiss);
            } catch (Exception e) {
                UI.post(() -> {
                    p.dismiss();
                    new AlertDialog.Builder(a).setMessage("فشل التحديث، جرّب مرة تانية.").setPositiveButton("تمام", null).show();
                });
            } finally {
                busy = false;
            }
        }).start();
    }

    static boolean handle(Activity a, Intent i) {
        if (i == null || !ACTION.equals(i.getAction())) return false;
        int st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = i.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                a.startActivity(confirm);
            }
        } else if (st != PackageInstaller.STATUS_SUCCESS) {
            new AlertDialog.Builder(a).setMessage("ما انثبّت التحديث. اسمح للتطبيق بتثبيت التطبيقات وجرّب مرة تانية.").setPositiveButton("تمام", null).show();
        }
        return true;
    }
}
