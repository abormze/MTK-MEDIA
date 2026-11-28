package com.xconn.wwe;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final String CAT = "/category/%D8%B9%D8%B1%D9%88%D8%B6-%D9%85%D8%B5%D8%A7%D8%B1%D8%B9%D8%A9";
    private static final Pattern SITE = Pattern.compile("(^|\\.)[a-z0-9-]*(shahed|shahid|shed|shahd)4u[a-z0-9-]*\\.[a-z]+$");
    private static boolean isSite(String h) { return h != null && SITE.matcher(h.toLowerCase()).find(); }
    private static final String SCRIPT_URL = "https://abormze.github.io/MTK-MEDIA/xconn/xconn-wwe.user.js";
    private static final Pattern AD_HOSTS = Pattern.compile(
            "(abscloud|araplhn|edwardspeedingchat|llvpn|sharethis|litix|yamli|recaptcha|rybbit|madurird|acscdn|aclib|cchud|d23uh58cc2jksn|adcash|doubleclick|googlesyndication|googleadservices|googletagservices|adservice|adnxs|popads|popcash|propellerads|"
            + "adsterra|exoclick|juicyads|hilltopads|onclicka|onclickads|monetag|a-ads|adcash|clickadu|trafficjunky|mgid|"
            + "taboola|outbrain|revcontent|admaven|ad-maven|richpush|pushhouse|realsrv|profitabledisplay|highperformanceformat|"
            + "effectivegatecpm|displayvertising|toprevenuegate|adskeeper|zeydoo|galaksion|popunder|pushame|onesignal|"
            + "histats|yandex\\.ru/ads|adform|criteo|pubmatic|rubiconproject|amazon-adsystem|smartadserver|inmobi)",
            Pattern.CASE_INSENSITIVE);

    private FrameLayout root;
    private WebView web;
    private View customView;
    private WebChromeClient.CustomViewCallback customCb;
    private boolean docStart, resumed;
    private long lastUpd;
    private String script;
    private static final String HOSTS_URL = "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts";
    private static final Pattern KEEP = Pattern.compile("(^|\\.)([a-z0-9-]*(shahed|shahid|shed|shahd)4u[a-z0-9-]*\\.[a-z]+|fastvid\\.cam|earnvids\\.[a-z]+|pixibay\\.cc|willowgrovelearning\\.store|vinovo\\.[a-z]+|uqload\\.[a-z]+|jsdelivr\\.net|cloudflare\\.com|github\\.io|githubusercontent\\.com)$");
    private volatile Set<String> adHosts = new HashSet<>();
    private boolean tv;
    private volatile String nativeUrl;
    private volatile long nativeAt, nativeOffUntil;

    private boolean native_(String url, java.util.Map<String, String> req) {
        long now = System.currentTimeMillis();
        if (now - nativeAt < 15000) return url.equals(nativeUrl) || nativeUrl != null;
        nativeUrl = url;
        nativeAt = now;
        HashMap<String, String> hdr = new HashMap<>();
        for (java.util.Map.Entry<String, String> e : req.entrySet()) {
            String k = e.getKey();
            if (k.equalsIgnoreCase("Referer") || k.equalsIgnoreCase("Origin")) hdr.put(k, e.getValue());
        }
        String ck = CookieManager.getInstance().getCookie(url);
        if (ck != null && !ck.isEmpty()) hdr.put("Cookie", ck);
        runOnUiThread(() -> web.evaluateJavascript("window.__mtkCur?__mtkCur():''", v -> {
            String key = "";
            long start = 0;
            String up = "";
            try {
                org.json.JSONObject o = new org.json.JSONObject(new org.json.JSONArray("[" + v + "]").getString(0));
                key = o.optString("k");
                start = o.optLong("p");
                up = o.optString("u");
            } catch (Exception ignored) {}
            android.util.Log.i("MTK", "native key=" + key + " start=" + start + " url=" + url + " hdr=" + hdr.keySet());
            startActivityForResult(new android.content.Intent(this, PlayerActivity.class)
                    .putExtra("url", url)
                    .putExtra("hdr", hdr)
                    .putExtra("key", key)
                    .putExtra("start", start)
                    .putExtra("next", up)
                    .putExtra("ua", web.getSettings().getUserAgentString()), 7);
            web.evaluateJavascript("window.__mtkBack&&window.__mtkBack()", null);
        }));
        return true;
    }

    @Override
    protected void onActivityResult(int req, int res, android.content.Intent data) {
        super.onActivityResult(req, res, data);
        nativeUrl = null;
        nativeAt = 0;
        if (req != 7 || data == null) return;
        if (data.getBooleanExtra("err", false)) {
            nativeOffUntil = System.currentTimeMillis() + 180000;
            web.evaluateJavascript("window.__mtkReplay&&__mtkReplay()", null);
        }
        String key = data.getStringExtra("key");
        if (key == null || key.isEmpty()) return;
        web.evaluateJavascript("window.__mtkSetPos&&__mtkSetPos(" + org.json.JSONObject.quote(key) + "," + data.getLongExtra("pos", 0) + "," + data.getLongExtra("dur", 0) + ")", null);
        if (data.getBooleanExtra("goNext", false)) web.evaluateJavascript("window.__mtkNext&&__mtkNext()", null);
    }

    private boolean isTv() {
        return getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_LEANBACK);
    }

    private boolean isAd(String host) {
        if (host == null || host.isEmpty()) return false;
        host = host.toLowerCase();
        if (AD_HOSTS.matcher(host).find()) return true;
        if (KEEP.matcher(host).find()) return false;
        Set<String> set = adHosts;
        String h = host;
        while (true) {
            if (set.contains(h)) return true;
            int i = h.indexOf('.');
            if (i < 0 || h.indexOf('.', i + 1) < 0) return false;
            h = h.substring(i + 1);
        }
    }

    private void loadAdHosts() {
        new Thread(() -> {
            try {
                File f = new File(getFilesDir(), "adhosts.txt");
                InputStream in = f.exists() && f.length() > 100000 ? new java.io.FileInputStream(f) : getAssets().open("adhosts.txt");
                Set<String> set = new HashSet<>(100000);
                try (java.io.BufferedReader r = new java.io.BufferedReader(new java.io.InputStreamReader(in, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = r.readLine()) != null) {
                        int c = line.indexOf('#');
                        if (c >= 0) line = line.substring(0, c);
                        line = line.trim();
                        if (line.isEmpty()) continue;
                        String[] p = line.split("\\s+");
                        String h = p.length > 1 ? p[1] : p[0];
                        if (h.indexOf('.') > 0 && !h.equals("0.0.0.0")) set.add(h.toLowerCase());
                    }
                }
                set.remove("localhost");
                adHosts = set;
                if (!f.exists() || System.currentTimeMillis() - f.lastModified() > 3L * 86400000L) {
                    HttpURLConnection c = (HttpURLConnection) new URL(HOSTS_URL).openConnection();
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(30000);
                    if (c.getResponseCode() == 200) {
                        String body = readAll(c.getInputStream());
                        if (body.length() > 100000) {
                            File tmp = new File(getFilesDir(), "adhosts.tmp");
                            try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(body.getBytes(StandardCharsets.UTF_8)); }
                            tmp.renameTo(f);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.parseColor("#0B1026"));
        getWindow().setNavigationBarColor(Color.parseColor("#0B1026"));
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0B1026"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0B1026"));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        tv = isTv();
        if (tv) setupCursor();
        loadAdHosts();
        script = loadScript();
        docStart = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
        if (docStart) WebViewCompat.addDocumentStartJavaScript(web, script, Collections.singleton("*"));

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (isAd(u.getHost())) {
                    return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                }
                String path = u.getPath();
                if (tv && System.currentTimeMillis() > nativeOffUntil && "GET".equals(r.getMethod()) && path != null && path.toLowerCase().endsWith(".m3u8")
                        && native_(u.toString(), r.getRequestHeaders())) {
                    return new WebResourceResponse("text/plain", "utf-8", 204, "No Content", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
                }
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (!r.isForMainFrame()) return false;
                Uri u = r.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                String host = u.getHost() == null ? "" : u.getHost();
                if (!scheme.startsWith("http")) return true;
                if (r.isRedirect() && isSite(Uri.parse(String.valueOf(v.getUrl())).getHost())) return false;
                return !(isSite(host) || host.contains("cloudflare") || host.contains("abormze.github.io"));
            }

            @Override
            public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                String h = Uri.parse(url).getHost();
                if (isSite(h) && !h.equals(site())) getSharedPreferences("mtk", MODE_PRIVATE).edit().putString("site", h).apply();
                if (!docStart) v.evaluateJavascript(script, null);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback cb) {
                if (customView != null) { cb.onCustomViewHidden(); return; }
                customView = view;
                customCb = cb;
                view.setBackgroundColor(Color.BLACK);
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                web.setVisibility(View.INVISIBLE);
                immersive(true);
                if (!tv) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                root.removeView(customView);
                customView = null;
                web.setVisibility(View.VISIBLE);
                immersive(false);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                if (customCb != null) { customCb.onCustomViewHidden(); customCb = null; }
            }

            @Override
            public boolean onCreateWindow(WebView v, boolean dialog, boolean user, android.os.Message msg) { return false; }

            @Override
            public boolean onJsAlert(WebView v, String url, String msg, JsResult r) { r.cancel(); return true; }

            @Override
            public boolean onJsConfirm(WebView v, String url, String msg, JsResult r) { r.cancel(); return true; }

            @Override
            public boolean onJsPrompt(WebView v, String url, String msg, String def, JsPromptResult r) { r.cancel(); return true; }

            @Override
            public boolean onJsBeforeUnload(WebView v, String url, String msg, JsResult r) { r.confirm(); return true; }

            @Override
            public void onPermissionRequest(PermissionRequest req) { req.deny(); }
        });

        if (state != null) web.restoreState(state);
        else web.loadUrl("https://" + site() + CAT);
        updateScript();
        Updater.check(this, "https://abormze.github.io/MTK-MEDIA/xconn/wwe/version.json");
    }

    @Override
    protected void onNewIntent(android.content.Intent i) {
        super.onNewIntent(i);
        Updater.handle(this, i);
    }

    private String site() { return getSharedPreferences("mtk", MODE_PRIVATE).getString("site", "shed4u.day"); }

    private void immersive(boolean on) {
        View d = getWindow().getDecorView();
        if (on) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        }
    }

    private File cacheFile() { return new File(getFilesDir(), "xconn-wwe.user.js"); }

    private String loadScript() {
        try {
            String asset = readAll(getAssets().open("xconn-wwe.user.js"));
            File f = cacheFile();
            if (f.exists() && f.length() > 1000) {
                String cached = readAll(new java.io.FileInputStream(f));
                if (cmpVer(ver(cached), ver(asset)) >= 0) return cached;
            }
            return asset;
        } catch (Exception e) {
            return "";
        }
    }

    private static String ver(String js) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("@version\\s+([\\d.]+)").matcher(js);
        return m.find() ? m.group(1) : "0";
    }

    private static int cmpVer(String a, String b) {
        String[] x = a.split("\\."), y = b.split("\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int p = i < x.length ? Integer.parseInt(x[i]) : 0, q = i < y.length ? Integer.parseInt(y[i]) : 0;
            if (p != q) return Integer.compare(p, q);
        }
        return 0;
    }

    private void updateScript() {
        lastUpd = System.currentTimeMillis();
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(SCRIPT_URL + "?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(15000);
                if (c.getResponseCode() != 200) return;
                String js = readAll(c.getInputStream());
                if (!js.contains("==UserScript==") || !js.contains("function MTK")) return;
                File tmp = new File(getFilesDir(), "mtk.tmp");
                try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(js.getBytes(StandardCharsets.UTF_8)); }
                tmp.renameTo(cacheFile());
                if (cmpVer(ver(js), ver(script)) > 0) runOnUiThread(() -> {
                    if (!resumed || isFinishing()) return;
                    web.evaluateJavascript("document.querySelector('#mtk-fs.open')?1:0", v -> { if ("0".equals(v) && resumed) recreate(); });
                });
            } catch (Exception ignored) {
            }
        }).start();
    }

    private static String readAll(InputStream in) throws java.io.IOException {
        try (InputStream i = in; ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] b = new byte[16384];
            int n;
            while ((n = i.read(b)) > 0) o.write(b, 0, n);
            return o.toString("UTF-8");
        }
    }

    private View cursor;
    private boolean curOn, curManual, curTip;
    private float cx, cy;
    private final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());
    private static final String CHL_JS = "!!(window._cf_chl_opt||document.querySelector('#challenge-form,#challenge-stage,.cf-turnstile,iframe[src*=\"challenges.cloudflare.com\"]'))";

    private final Runnable chk = new Runnable() {
        @Override
        public void run() {
            if (isFinishing()) return;
            web.evaluateJavascript(CHL_JS, v -> { if (!curManual) showCursor("true".equals(v)); });
            ui.postDelayed(this, 1500);
        }
    };

    private void setupCursor() {
        final float d = getResources().getDisplayMetrics().density;
        cursor = new View(this) {
            final android.graphics.Paint p = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
            final android.graphics.Path a = new android.graphics.Path();
            {
                a.moveTo(2 * d, 2 * d); a.lineTo(2 * d, 26 * d); a.lineTo(9 * d, 19 * d); a.lineTo(14 * d, 30 * d);
                a.lineTo(18 * d, 28 * d); a.lineTo(13 * d, 17 * d); a.lineTo(23 * d, 17 * d); a.close();
            }
            @Override
            protected void onDraw(android.graphics.Canvas c) {
                p.setStyle(android.graphics.Paint.Style.FILL); p.setColor(Color.WHITE); c.drawPath(a, p);
                p.setStyle(android.graphics.Paint.Style.STROKE); p.setStrokeWidth(2 * d); p.setColor(Color.BLACK); c.drawPath(a, p);
            }
        };
        cursor.setVisibility(View.GONE);
        root.addView(cursor, new FrameLayout.LayoutParams((int) (32 * d), (int) (34 * d)));
        ui.postDelayed(chk, 2000);
    }

    private void showCursor(boolean on) {
        if (on == curOn) return;
        curOn = on;
        if (on) {
            cx = root.getWidth() / 2f; cy = root.getHeight() / 2f;
            moveCursor(0, 0);
            cursor.setVisibility(View.VISIBLE);
            cursor.bringToFront();
            if (!curTip) {
                curTip = true;
                android.widget.Toast.makeText(this, "حرّك المؤشر بالأسهم واكبس OK على المربع", android.widget.Toast.LENGTH_LONG).show();
            }
        } else cursor.setVisibility(View.GONE);
    }

    private void moveCursor(float dx, float dy) {
        float w = root.getWidth() - 4, h = root.getHeight() - 4;
        cx += dx; cy += dy;
        if (cy < 0) { web.scrollBy(0, (int) cy); cy = 0; }
        if (cy > h) { web.scrollBy(0, (int) (cy - h)); cy = h; }
        cx = Math.max(0, Math.min(w, cx));
        cursor.setTranslationX(cx - 2 * getResources().getDisplayMetrics().density);
        cursor.setTranslationY(cy - 2 * getResources().getDisplayMetrics().density);
    }

    private void tapCursor() {
        final long t = android.os.SystemClock.uptimeMillis();
        final float x = cx, y = cy;
        android.view.MotionEvent dn = android.view.MotionEvent.obtain(t, t, android.view.MotionEvent.ACTION_DOWN, x, y, 0);
        dn.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);
        web.dispatchTouchEvent(dn);
        dn.recycle();
        ui.postDelayed(() -> {
            android.view.MotionEvent up = android.view.MotionEvent.obtain(t, android.os.SystemClock.uptimeMillis(), android.view.MotionEvent.ACTION_UP, x, y, 0);
            up.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);
            web.dispatchTouchEvent(up);
            up.recycle();
        }, 90);
    }

    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent e) {
        if (cursor != null) {
            int k = e.getKeyCode();
            boolean down = e.getAction() == android.view.KeyEvent.ACTION_DOWN;
            if (k == android.view.KeyEvent.KEYCODE_MENU) {
                if (!down) { curManual = !curOn; showCursor(!curOn); }
                return true;
            }
            if (curOn) {
                float dx = 0, dy = 0;
                switch (k) {
                    case android.view.KeyEvent.KEYCODE_DPAD_LEFT: dx = -1; break;
                    case android.view.KeyEvent.KEYCODE_DPAD_RIGHT: dx = 1; break;
                    case android.view.KeyEvent.KEYCODE_DPAD_UP: dy = -1; break;
                    case android.view.KeyEvent.KEYCODE_DPAD_DOWN: dy = 1; break;
                    case android.view.KeyEvent.KEYCODE_DPAD_CENTER:
                    case android.view.KeyEvent.KEYCODE_ENTER:
                    case android.view.KeyEvent.KEYCODE_NUMPAD_ENTER:
                        if (!down) tapCursor();
                        return true;
                }
                if (dx != 0 || dy != 0) {
                    if (down) {
                        float st = getResources().getDisplayMetrics().density * Math.min(48, 10 + e.getRepeatCount() * 5);
                        moveCursor(dx * st, dy * st);
                    }
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            web.getWebChromeClient().onHideCustomView();
        } else {
            web.evaluateJavascript("(window.__mtkBack&&window.__mtkBack())?1:0", v -> {
                if ("1".equals(v)) return;
                if (web.canGoBack()) web.goBack();
                else finish();
            });
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        if (lastUpd > 0 && System.currentTimeMillis() - lastUpd > 15 * 60000) {
            updateScript();
            Updater.check(this, "https://abormze.github.io/MTK-MEDIA/xconn/wwe/version.json");
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        resumed = false;
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            ((ViewGroup) web.getParent()).removeView(web);
            web.destroy();
        }
        super.onDestroy();
    }
}
