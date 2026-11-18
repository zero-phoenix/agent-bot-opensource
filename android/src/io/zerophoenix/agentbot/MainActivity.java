package io.zerophoenix.agentbot;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * agent Bot OpenSource — Cliente Nativo Android con Rotación Resiliente Multi-Proveedor,
 * Disyuntor ante Caídas (5xx/Timeouts) y Enfriamiento ante Rate-Limit (HTTP 429).
 */
public class MainActivity extends Activity {

    static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/index.html";
    static final String PREFS_NAME = "agentbot_secure_prefs";

    private WebView webView;
    private SharedPreferences prefs;
    private ProviderRotator rotator;
    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private volatile boolean pageLoaded = false;
    private volatile String pendingAutoTestPrompt = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (android.os.Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        rotator = new ProviderRotator(prefs);
        applyIntentConfig(getIntent());

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF090D16);
        root.setFitsSystemWindows(true);
        setContentView(root);

        webView = createConfiguredWebView();
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
        webView.loadUrl(START_URL);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        applyIntentConfig(intent);
        if (pageLoaded && webView != null) {
            webView.post(() -> webView.evaluateJavascript(
                    "window.__refreshFromNative && window.__refreshFromNative();", null));
            triggerPendingAutoTestIfAny();
        }
    }

    private void applyIntentConfig(Intent intent) {
        if (intent == null) return;
        SharedPreferences.Editor ed = prefs.edit();
        boolean changed = false;
        String[] keys = new String[]{
                "bridge_url_1", "bridge_url_2", "bridge_token", "magi_url",
                "gemini_key", "groq_key", "openrouter_key",
                "custom_openai_url", "custom_openai_model", "custom_openai_key"
        };
        for (String k : keys) {
            if (intent.hasExtra(k)) {
                String v = intent.getStringExtra(k);
                ed.putString(k, v == null ? "" : v.trim());
                changed = true;
            }
        }
        if (changed) {
            ed.apply();
            rotator.resetBreakers();
        }
        if ("1".equals(intent.getStringExtra("auto_selftest"))) {
            String p = intent.getStringExtra("prompt");
            pendingAutoTestPrompt = (p != null && !p.trim().isEmpty())
                    ? p.trim()
                    : "Confirma en una frase breve que agent Bot Android opera con rotación resiliente anti-429 en Redmi.";
        }
    }

    private void triggerPendingAutoTestIfAny() {
        final String prompt = pendingAutoTestPrompt;
        if (prompt == null) return;
        pendingAutoTestPrompt = null;

        pool.execute(() -> {
            try {
                // Inyectar fallo 503 en proveedor #1 y Rate-Limit 429 en proveedor #2 para probar failover real!
                rotator.resetBreakers();
                rotator.injectChaosOnFirstTwo();

                JSONArray msgs = new JSONArray()
                        .put(new JSONObject().put("role", "system")
                                .put("content", "Responde en español claro y conciso (máximo 2 oraciones)."))
                        .put(new JSONObject().put("role", "user").put("content", prompt));

                JSONObject res = rotator.chat(msgs, "auto");
                JSONObject snap = rotator.snapshotJson();

                JSONObject fullReport = new JSONObject();
                fullReport.put("timestampMs", System.currentTimeMillis());
                fullReport.put("chaosFailoverResult", res);
                fullReport.put("rotatorSnapshot", snap);

                File dir = getExternalFilesDir(null);
                if (dir != null) {
                    if (!dir.exists()) dir.mkdirs();
                    File outFile = new File(dir, "selftest_report.json");
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        fos.write(fullReport.toString(2).getBytes(StandardCharsets.UTF_8));
                    }
                }

                final String jsPrompt = JSONObject.quote(prompt);
                final String jsRes = JSONObject.quote(res.toString());
                runOnUiThread(() -> {
                    if (webView != null) {
                        webView.evaluateJavascript(
                                "window.__renderAutoChaosProof && window.__renderAutoChaosProof("
                                        + jsPrompt + "," + jsRes + ");",
                                null
                        );
                    }
                });
            } catch (Exception ignored) {}
        });
    }

    private WebView createConfiguredWebView() {
        WebView wv = new WebView(this);
        wv.setBackgroundColor(0xFF090D16);
        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);

        wv.addJavascriptInterface(new NativeBridge(), "AgentBotNative");
        wv.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                String assetName = path.startsWith("/") ? path.substring(1) : path;
                try {
                    InputStream in = getAssets().open(assetName);
                    String mime = assetName.endsWith(".html") ? "text/html"
                            : assetName.endsWith(".js") ? "application/javascript"
                            : assetName.endsWith(".css") ? "text/css"
                            : assetName.endsWith(".png") ? "image/png" : "application/octet-stream";
                    return new WebResourceResponse(mime, "UTF-8", in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null,
                            new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                triggerPendingAutoTestIfAny();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                recreate();
                return true;
            }
        });
        return wv;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        pool.shutdownNow();
    }

    final class NativeBridge {

        @JavascriptInterface
        public String getProvidersSnapshot() {
            return rotator.snapshotJson().toString();
        }

        @JavascriptInterface
        public String getConfigMasked() {
            try {
                JSONObject o = new JSONObject();
                o.put("bridge_url_1", prefs.getString("bridge_url_1", ""));
                o.put("bridge_url_2", prefs.getString("bridge_url_2", ""));
                o.put("magi_url", prefs.getString("magi_url", ""));
                o.put("has_bridge_token", !prefs.getString("bridge_token", "").isEmpty());
                o.put("has_gemini_key", !prefs.getString("gemini_key", "").isEmpty());
                o.put("has_groq_key", !prefs.getString("groq_key", "").isEmpty());
                o.put("has_openrouter_key", !prefs.getString("openrouter_key", "").isEmpty());
                o.put("custom_openai_url", prefs.getString("custom_openai_url", ""));
                o.put("custom_openai_model", prefs.getString("custom_openai_model", "gpt-4o-mini"));
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public String saveConfig(String jsonStr) {
            try {
                JSONObject in = new JSONObject(jsonStr);
                SharedPreferences.Editor ed = prefs.edit();
                String[] textKeys = new String[]{
                        "bridge_url_1", "bridge_url_2", "magi_url",
                        "custom_openai_url", "custom_openai_model"
                };
                for (String k : textKeys) {
                    if (in.has(k)) ed.putString(k, in.optString(k, "").trim());
                }
                String[] secretKeys = new String[]{
                        "bridge_token", "gemini_key", "groq_key", "openrouter_key", "custom_openai_key"
                };
                for (String sk : secretKeys) {
                    String val = in.optString(sk, "").trim();
                    if (!val.isEmpty()) {
                        ed.putString(sk, val);
                    }
                }
                ed.apply();
                rotator.resetBreakers();
                return "{\"ok\":true}";
            } catch (Exception e) {
                return "{\"ok\":false}";
            }
        }

        @JavascriptInterface
        public String resetBreakers() {
            rotator.resetBreakers();
            return rotator.snapshotJson().toString();
        }

        @JavascriptInterface
        public void sendChat(final int reqId, final String payloadJson, final boolean injectChaos) {
            pool.execute(() -> {
                JSONObject res;
                try {
                    JSONObject req = new JSONObject(payloadJson);
                    JSONArray messages = req.optJSONArray("messages");
                    if (messages == null) messages = new JSONArray();
                    String mode = req.optString("mode", "auto");
                    if (injectChaos) {
                        rotator.injectChaosOnFirstTwo();
                    }
                    res = rotator.chat(messages, mode);
                } catch (Exception e) {
                    res = new JSONObject();
                    try {
                        res.put("ok", false);
                        res.put("error", e.getMessage());
                    } catch (Exception ignored) {}
                }
                final String quoted = JSONObject.quote(res.toString());
                runOnUiThread(() -> {
                    if (webView != null) {
                        webView.evaluateJavascript(
                                "window.__onAgentBotReply && window.__onAgentBotReply(" + reqId + "," + quoted + ");",
                                null
                        );
                    }
                });
            });
        }
    }
}
