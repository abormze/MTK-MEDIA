package com.mtk.prime;

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
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final String HOME = "https://www.vidsrcprime.site/";
    private static final String SCRIPT_URL = "https://abormze.github.io/MTK-MEDIA/mtk-prime.user.js";
    private static final Pattern AD_HOSTS = Pattern.compile(
            "(magsrv|bancadeltempoidea|adexchangerapid|usrpubtrk|ouijarapper|^a2?\\.cineflix\\.st$|ijarwjciakkmj|nxsha\\.app|cloudflareinsights|madurird|acscdn|aclib|cchud|d23uh58cc2jksn|adcash|doubleclick|googlesyndication|googleadservices|googletagservices|adservice|adnxs|popads|popcash|propellerads|"
            + "adsterra|exoclick|juicyads|hilltopads|onclicka|onclickads|monetag|a-ads|adcash|clickadu|trafficjunky|mgid|"
            + "taboola|outbrain|revcontent|admaven|ad-maven|richpush|pushhouse|realsrv|profitabledisplay|highperformanceformat|"
            + "effectivegatecpm|displayvertising|toprevenuegate|adskeeper|zeydoo|galaksion|popunder|pushame|onesignal|"
            + "histats|yandex\\.ru/ads|adform|criteo|pubmatic|rubiconproject|amazon-adsystem|smartadserver|inmobi)",
            Pattern.CASE_INSENSITIVE);

    private FrameLayout root;
    private WebView web;
    private View customView;
    private WebChromeClient.CustomViewCallback customCb;
    private boolean docStart;
    private String script;
    private static final String HOSTS_URL = "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts";
    private static final Pattern KEEP = Pattern.compile("(^|\\.)(vidsrcprime\\.site|cinesrc\\.st|bright67\\.online|themoviedb\\.org|tmdb\\.org|theintrodb\\.org|tailwindcss\\.com|unpkg\\.com|googleapis\\.com|gstatic\\.com|googleusercontent\\.com|github\\.io|githubusercontent\\.com)$");
    private volatile Set<String> adHosts = new HashSet<>();

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
        getWindow().setStatusBarColor(Color.parseColor("#0A0A10"));
        getWindow().setNavigationBarColor(Color.parseColor("#0A0A10"));
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0A0A10"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0A0A10"));
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

        web.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void full(boolean on) {
                runOnUiThread(() -> {
                    if (customView != null) return;
                    immersive(on);
                    if (!isTv()) setRequestedOrientation(on ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                });
            }
        }, "MTKApp");

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
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (!r.isForMainFrame()) return false;
                Uri u = r.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                String host = u.getHost() == null ? "" : u.getHost();
                if (!scheme.startsWith("http")) return true;
                return !(host.contains("vidsrcprime") || host.contains("abormze.github.io"));
            }

            @Override
            public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
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
                if (!isTv()) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
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
        else web.loadUrl(HOME);
        updateScript();
    }

    private boolean isTv() {
        return getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_LEANBACK);
    }

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

    private File cacheFile() { return new File(getFilesDir(), "mtk-prime.user.js"); }

    private String loadScript() {
        try {
            File f = cacheFile();
            InputStream in = f.exists() && f.length() > 1000 ? new java.io.FileInputStream(f) : getAssets().open("mtk-prime.user.js");
            return readAll(in);
        } catch (Exception e) {
            return "";
        }
    }

    private void updateScript() {
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
    protected void onPause() {
        super.onPause();
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
