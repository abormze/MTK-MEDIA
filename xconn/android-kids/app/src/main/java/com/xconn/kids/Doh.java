package com.xconn.kids;

import android.webkit.CookieManager;
import android.webkit.WebResourceResponse;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import okhttp3.Dns;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/** Encrypted DNS (DNS-over-HTTPS) so ISP DNS blocks don't stop the source site. */
final class Doh {
    private static final String[] RESOLVERS = {
            "https://1.1.1.1/dns-query?type=A&name=",
            "https://8.8.8.8/resolve?type=A&name=",
            "https://9.9.9.9:5053/dns-query?type=A&name="};
    private static final Map<String, List<InetAddress>> cache = new ConcurrentHashMap<>();
    private static final Set<String> blocked = ConcurrentHashMap.newKeySet();
    private static final Set<String> fine = ConcurrentHashMap.newKeySet();

    static final OkHttpClient client = new OkHttpClient.Builder()
            .dns(host -> {
                List<InetAddress> l = resolve(host);
                return l.isEmpty() ? Dns.SYSTEM.lookup(host) : l;
            })
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .build();

    private Doh() {}

    static boolean wanted(String host) {
        if (host == null || host.isEmpty()) return false;
        if (host.contains("cartoony") || host.contains("carateen") || host.contains("spacetoon")) return true;
        if (fine.contains(host)) return false;
        if (blocked.contains(host)) return true;
        try {
            InetAddress[] a = InetAddress.getAllByName(host);
            boolean bad = a.length == 0;
            for (InetAddress x : a) if (x.isAnyLocalAddress() || x.isLoopbackAddress() || x.isSiteLocalAddress()) bad = true;
            (bad ? blocked : fine).add(host);
            return bad;
        } catch (Exception e) {
            blocked.add(host);
            return true;
        }
    }

    static List<InetAddress> resolve(String host) {
        List<InetAddress> c = cache.get(host);
        if (c != null) return c;
        List<InetAddress> out = new ArrayList<>();
        for (String r : RESOLVERS) {
            try {
                HttpURLConnection h = (HttpURLConnection) new URL(r + host).openConnection();
                h.setConnectTimeout(6000);
                h.setReadTimeout(6000);
                h.setRequestProperty("Accept", "application/dns-json");
                InputStream in = h.getInputStream();
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
                in.close();
                JSONArray ans = new JSONObject(bo.toString("UTF-8")).optJSONArray("Answer");
                if (ans != null) for (int i = 0; i < ans.length(); i++) {
                    JSONObject o = ans.getJSONObject(i);
                    if (o.optInt("type") == 1) out.add(InetAddress.getByName(o.getString("data")));
                }
                if (!out.isEmpty()) break;
            } catch (Exception ignored) {}
        }
        if (!out.isEmpty()) cache.put(host, out);
        return out;
    }

    static WebResourceResponse fetch(String url, Map<String, String> req) {
        try {
            Request.Builder b = new Request.Builder().url(url);
            if (req != null) for (Map.Entry<String, String> e : req.entrySet()) {
                if (e.getKey() == null || e.getValue() == null || e.getKey().equalsIgnoreCase("Accept-Encoding")) continue;
                b.header(e.getKey(), e.getValue());
            }
            CookieManager cm = CookieManager.getInstance();
            String ck = cm.getCookie(url);
            if (ck != null && !ck.isEmpty()) b.header("Cookie", ck);
            Response res = client.newCall(b.build()).execute();
            String fin = res.request().url().toString();
            for (String sc : res.headers("Set-Cookie")) cm.setCookie(fin, sc);
            int code = res.code();
            if (code >= 300 && code < 400) { res.close(); return null; }
            String ct = res.header("Content-Type", "application/octet-stream");
            String mime = ct.split(";")[0].trim();
            String cs = null;
            int i = ct.toLowerCase().indexOf("charset=");
            if (i >= 0) cs = ct.substring(i + 8).replace("\"", "").split(";")[0].trim();
            Map<String, String> hs = new HashMap<>();
            for (String k : res.headers().names()) {
                String lk = k.toLowerCase();
                if (lk.equals("content-type") || lk.equals("content-length") || lk.equals("content-encoding") || lk.equals("set-cookie") || lk.equals("transfer-encoding")) continue;
                hs.put(k, res.header(k));
            }
            String msg = res.message();
            if (msg == null || msg.trim().isEmpty()) msg = code < 400 ? "OK" : "Error";
            return new WebResourceResponse(mime, cs, code, msg, hs, res.body().byteStream());
        } catch (Exception e) {
            return null;
        }
    }
}
