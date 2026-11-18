package io.zerophoenix.agentbot;

import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Motor nativo de rotación resiliente multi-proveedor con Disyuntor (Circuit Breaker),
 * enfriamiento por HTTP 429 (Retry-After + Backoff Exponencial con Jitter) y alivio Zero-Key.
 * Ninguna llave privada viene quemada en el código fuente público.
 */
public final class ProviderRotator {

    public static final class ProviderSpec {
        public final String id;
        public final String name;
        public final String kind; // "openai", "gemini", "trialectica"
        public final String url;
        public final String model;
        public final String apiKey;
        public final int tier;
        public final int connectTimeoutMs;
        public final int readTimeoutMs;

        public ProviderSpec(String id, String name, String kind, String url, String model,
                            String apiKey, int tier, int connectTimeoutMs, int readTimeoutMs) {
            this.id = id;
            this.name = name;
            this.kind = kind;
            this.url = url;
            this.model = model;
            this.apiKey = apiKey == null ? "" : apiKey;
            this.tier = tier;
            this.connectTimeoutMs = connectTimeoutMs;
            this.readTimeoutMs = readTimeoutMs;
        }
    }

    public static final class ProviderHealth {
        public String status = "READY";
        public long cooldownUntilMs = 0L;
        public int consecutiveFailures = 0;
        public int ewmaLatencyMs = 650;
        public int calls = 0;
        public int successes = 0;
        public int rateLimits = 0;
        public int outages = 0;
        public String lastError = "";
    }

    private static final class SimFault {
        int httpCode;
        int remaining;
        SimFault(int httpCode, int remaining) {
            this.httpCode = httpCode;
            this.remaining = remaining;
        }
    }

    private static final class CallFailure extends Exception {
        final int httpCode;
        final int retryAfterSec;
        CallFailure(String msg, int httpCode, int retryAfterSec) {
            super(msg);
            this.httpCode = httpCode;
            this.retryAfterSec = retryAfterSec;
        }
    }

    private final SharedPreferences prefs;
    private final Map<String, ProviderHealth> healthMap = new HashMap<>();
    private final Map<String, SimFault> simFaults = new HashMap<>();
    private final Random rng = new Random();

    private int rrCursor = 0;
    private int totalRequests = 0;
    private int totalSuccess = 0;
    private int totalFailovers = 0;
    private int rateLimitsSurvived = 0;
    private int outagesSurvived = 0;
    private String lastProviderId = "";
    private JSONObject lastRunReport = new JSONObject();

    public ProviderRotator(SharedPreferences prefs) {
        this.prefs = prefs;
    }

    public synchronized List<ProviderSpec> buildProviders() {
        List<ProviderSpec> list = new ArrayList<>();
        String bridge1 = prefs.getString("bridge_url_1", "").trim();
        String bridge2 = prefs.getString("bridge_url_2", "").trim();
        String bridgeTok = prefs.getString("bridge_token", "").trim();
        String magiUrl = prefs.getString("magi_url", "").trim();
        String geminiKey = prefs.getString("gemini_key", "").trim();
        String groqKey = prefs.getString("groq_key", "").trim();
        String openrouterKey = prefs.getString("openrouter_key", "").trim();
        String customUrl = prefs.getString("custom_openai_url", "").trim();
        String customModel = prefs.getString("custom_openai_model", "gpt-4o-mini").trim();
        String customKey = prefs.getString("custom_openai_key", "").trim();

        if (!bridge1.isEmpty()) {
            list.add(new ProviderSpec("mesh-bridge-1", "Puente Malla #1 (:8085)", "openai",
                    bridge1, "claude-free", bridgeTok, 1, 3000, 16000));
        }
        if (!bridge2.isEmpty()) {
            list.add(new ProviderSpec("mesh-bridge-2", "Puente Malla #2 (:8085)", "openai",
                    bridge2, "claude-free", bridgeTok, 1, 3000, 16000));
        }
        if (!magiUrl.isEmpty()) {
            list.add(new ProviderSpec("magi-trialectica", "Tríada MAGI (:8898)", "trialectica",
                    magiUrl, "trialectica", "", 1, 3000, 18000));
        }

        if (!geminiKey.isEmpty()) {
            String[] gModels = new String[]{
                    "gemini-3.1-flash-lite-preview",
                    "gemini-flash-lite-latest",
                    "gemini-2.5-flash-lite",
                    "gemini-2.5-flash"
            };
            for (String gm : gModels) {
                list.add(new ProviderSpec(
                        "gemini:" + gm,
                        "Gemini (" + gm + ")",
                        "openai",
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        gm,
                        geminiKey,
                        2,
                        5000,
                        20000
                ));
            }
        }

        if (!groqKey.isEmpty()) {
            String[] qModels = new String[]{"llama-3.3-70b-versatile", "llama-3.1-8b-instant"};
            for (String qm : qModels) {
                list.add(new ProviderSpec(
                        "groq:" + qm,
                        "Groq LPU (" + qm + ")",
                        "openai",
                        "https://api.groq.com/openai/v1/chat/completions",
                        qm,
                        groqKey,
                        2,
                        5000,
                        18000
                ));
            }
        }

        if (!openrouterKey.isEmpty()) {
            list.add(new ProviderSpec(
                    "openrouter:llama-3.3-70b",
                    "OpenRouter (Llama 3.3 70B)",
                    "openai",
                    "https://openrouter.ai/api/v1/chat/completions",
                    "meta-llama/llama-3.3-70b-instruct:free",
                    openrouterKey,
                    2,
                    5000,
                    22000
            ));
        }

        if (!customUrl.isEmpty()) {
            list.add(new ProviderSpec(
                    "custom-openai",
                    "Custom OpenAI (" + customModel + ")",
                    "openai",
                    customUrl,
                    customModel,
                    customKey,
                    2,
                    5000,
                    20000
            ));
        }

        // Anillo autónomo Zero-Key ($0.00): siempre disponible aunque no haya llaves ni Tailscale
        list.add(new ProviderSpec(
                "pollinations:openai",
                "Cloud Relief OpenAI (Zero-Key)",
                "openai",
                "https://text.pollinations.ai/openai",
                "openai",
                "",
                3,
                6000,
                25000
        ));
        list.add(new ProviderSpec(
                "pollinations:mistral",
                "Cloud Relief Mistral (Zero-Key)",
                "openai",
                "https://text.pollinations.ai/openai",
                "mistral",
                "",
                3,
                6000,
                25000
        ));

        for (ProviderSpec p : list) {
            ensureHealth(p.id);
        }
        return list;
    }

    private ProviderHealth ensureHealth(String id) {
        ProviderHealth h = healthMap.get(id);
        if (h == null) {
            h = new ProviderHealth();
            healthMap.put(id, h);
        }
        return h;
    }

    public synchronized void injectFault(String providerId, int httpCode, int count) {
        simFaults.put(providerId, new SimFault(httpCode, Math.max(1, count)));
    }

    public synchronized void injectChaosOnFirstTwo() {
        List<ProviderSpec> ordered = selectOrderedCandidates();
        if (ordered.size() >= 1) {
            simFaults.put(ordered.get(0).id, new SimFault(503, 1));
        }
        if (ordered.size() >= 2) {
            simFaults.put(ordered.get(1).id, new SimFault(429, 1));
        }
        // Rewind cursor by 1 so the upcoming call hits the exact two faulted providers first
        if (!ordered.isEmpty()) {
            rrCursor = Math.max(0, rrCursor - 1);
        }
    }

    public synchronized void resetBreakers() {
        for (ProviderHealth h : healthMap.values()) {
            h.status = "READY";
            h.cooldownUntilMs = 0L;
            h.consecutiveFailures = 0;
            h.lastError = "";
        }
        simFaults.clear();
    }

    private synchronized List<ProviderSpec> selectOrderedCandidates() {
        List<ProviderSpec> all = buildProviders();
        if (all.isEmpty()) return all;

        long now = System.currentTimeMillis();
        int offset = Math.abs(rrCursor % all.size());
        rrCursor = (rrCursor + 1) % all.size();

        List<ProviderSpec> rotated = new ArrayList<>(all.size());
        rotated.addAll(all.subList(offset, all.size()));
        rotated.addAll(all.subList(0, offset));

        List<ProviderSpec> ready = new ArrayList<>();
        List<ProviderSpec> cooling = new ArrayList<>();
        for (ProviderSpec p : rotated) {
            ProviderHealth h = ensureHealth(p.id);
            if (h.cooldownUntilMs <= now) {
                if (!"READY".equals(h.status)) {
                    h.status = "HALF_OPEN";
                }
                ready.add(p);
            } else {
                cooling.add(p);
            }
        }

        Collections.sort(ready, new Comparator<ProviderSpec>() {
            @Override
            public int compare(ProviderSpec a, ProviderSpec b) {
                return Integer.compare(a.tier, b.tier);
            }
        });
        Collections.sort(cooling, new Comparator<ProviderSpec>() {
            @Override
            public int compare(ProviderSpec a, ProviderSpec b) {
                return Long.compare(ensureHealth(a.id).cooldownUntilMs, ensureHealth(b.id).cooldownUntilMs);
            }
        });

        if (!ready.isEmpty()) {
            return ready;
        }
        return cooling.subList(0, Math.min(2, cooling.size()));
    }

    private synchronized SimFault consumeSimulatedFault(String id) {
        SimFault f = simFaults.get(id);
        if (f != null && f.remaining > 0) {
            f.remaining -= 1;
            int code = f.httpCode;
            if (f.remaining <= 0) {
                simFaults.remove(id);
            }
            return new SimFault(code, 0);
        }
        return null;
    }

    private synchronized void recordSuccess(String id, int latencyMs, int hops) {
        ProviderHealth h = ensureHealth(id);
        h.status = "READY";
        h.cooldownUntilMs = 0L;
        h.consecutiveFailures = 0;
        h.calls += 1;
        h.successes += 1;
        h.ewmaLatencyMs = (int) Math.round(0.7 * h.ewmaLatencyMs + 0.3 * latencyMs);
        h.lastError = "";

        totalSuccess += 1;
        if (hops > 0) totalFailovers += hops;
        lastProviderId = id;
    }

    private synchronized void recordFailure(String id, CallFailure fail) {
        ProviderHealth h = ensureHealth(id);
        h.calls += 1;
        h.consecutiveFailures += 1;
        int jitter = rng.nextInt(1500);

        if (fail.httpCode == 429) {
            h.rateLimits += 1;
            rateLimitsSurvived += 1;
            long baseMs = fail.retryAfterSec > 0
                    ? fail.retryAfterSec * 1000L
                    : (long) Math.min(300000.0, 35000.0 * Math.pow(1.8, h.consecutiveFailures - 1));
            h.status = "COOLDOWN_429";
            h.cooldownUntilMs = System.currentTimeMillis() + baseMs + jitter;
        } else if (fail.httpCode == 401 || fail.httpCode == 402 || fail.httpCode == 403) {
            h.outages += 1;
            outagesSurvived += 1;
            h.status = "AUTH_QUOTA_LOCK";
            h.cooldownUntilMs = System.currentTimeMillis() + 600000L;
        } else {
            h.outages += 1;
            outagesSurvived += 1;
            long baseMs = (long) Math.min(240000.0, 20000.0 * Math.pow(2.0, h.consecutiveFailures - 1));
            h.status = "OPEN_DOWN";
            h.cooldownUntilMs = System.currentTimeMillis() + baseMs + jitter;
        }
        String msg = fail.getMessage() == null ? ("HTTP " + fail.httpCode) : fail.getMessage();
        h.lastError = msg.length() > 140 ? msg.substring(0, 140) : msg;
    }

    public JSONObject chat(JSONArray messages, String mode) {
        synchronized (this) {
            totalRequests += 1;
        }
        List<ProviderSpec> candidates = selectOrderedCandidates();
        if ("magi".equalsIgnoreCase(mode)) {
            List<ProviderSpec> magiFirst = new ArrayList<>();
            for (ProviderSpec p : candidates) {
                if ("trialectica".equals(p.kind)) magiFirst.add(0, p);
                else magiFirst.add(p);
            }
            candidates = magiFirst;
        }

        JSONArray trail = new JSONArray();
        for (int i = 0; i < candidates.size(); i++) {
            ProviderSpec p = candidates.get(i);
            long t0 = System.currentTimeMillis();
            try {
                String reply = executeCall(p, messages);
                int ms = (int) Math.max(1L, System.currentTimeMillis() - t0);
                recordSuccess(p.id, ms, i);

                JSONObject res = new JSONObject();
                res.put("ok", true);
                res.put("content", reply);
                res.put("providerId", p.id);
                res.put("providerName", p.name);
                res.put("model", p.model);
                res.put("latencyMs", ms);
                res.put("failoverHops", i);
                res.put("trail", trail);
                synchronized (this) {
                    lastRunReport = res;
                }
                return res;
            } catch (CallFailure cf) {
                recordFailure(p.id, cf);
                try {
                    JSONObject step = new JSONObject();
                    step.put("providerId", p.id);
                    step.put("providerName", p.name);
                    step.put("status", cf.httpCode);
                    step.put("error", cf.getMessage());
                    trail.put(step);
                } catch (Exception ignored) {}
            } catch (Exception ex) {
                CallFailure cf = new CallFailure(ex.getClass().getSimpleName() + ": " + ex.getMessage(), 0, 0);
                recordFailure(p.id, cf);
                try {
                    JSONObject step = new JSONObject();
                    step.put("providerId", p.id);
                    step.put("status", 0);
                    step.put("error", cf.getMessage());
                    trail.put(step);
                } catch (Exception ignored) {}
            }
        }

        JSONObject err = new JSONObject();
        try {
            err.put("ok", false);
            err.put("error", "Todos los proveedores están temporalmente en enfriamiento o sin red.");
            err.put("trail", trail);
            synchronized (this) {
                lastRunReport = err;
            }
        } catch (Exception ignored) {}
        return err;
    }

    private String executeCall(ProviderSpec p, JSONArray messages) throws Exception {
        SimFault sim = consumeSimulatedFault(p.id);
        if (sim != null) {
            throw new CallFailure("Simulación caos HTTP " + sim.httpCode + " en " + p.id,
                    sim.httpCode, sim.httpCode == 429 ? 30 : 0);
        }

        if ("gemini".equals(p.kind)) {
            return callGemini(p, messages);
        }
        if ("trialectica".equals(p.kind)) {
            return callTrialectica(p, messages);
        }
        return callOpenAiCompatible(p, messages);
    }

    private String callGemini(ProviderSpec p, JSONArray messages) throws Exception {
        String sep = p.url.contains("?") ? "&" : "?";
        URL url = new URL(p.url + sep + "key=" + URLEncoder.encode(p.apiKey, "UTF-8"));
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(p.connectTimeoutMs);
        conn.setReadTimeout(p.readTimeoutMs);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        conn.setRequestProperty("User-Agent", "AgentBot-Android/1.2.0");

        JSONArray contents = new JSONArray();
        StringBuilder sysText = new StringBuilder();
        for (int i = 0; i < messages.length(); i++) {
            JSONObject m = messages.optJSONObject(i);
            if (m == null) continue;
            String role = m.optString("role", "user");
            String text = m.optString("content", "");
            if ("system".equals(role)) {
                if (sysText.length() > 0) sysText.append("\n");
                sysText.append(text);
            } else {
                JSONObject part = new JSONObject().put("text", text);
                JSONArray parts = new JSONArray().put(part);
                JSONObject item = new JSONObject()
                        .put("role", "assistant".equals(role) ? "model" : "user")
                        .put("parts", parts);
                contents.put(item);
            }
        }
        if (contents.length() == 0) {
            contents.put(new JSONObject().put("role", "user")
                    .put("parts", new JSONArray().put(new JSONObject().put("text", "Hola"))));
        }

        JSONObject body = new JSONObject();
        body.put("contents", contents);
        body.put("generationConfig", new JSONObject().put("maxOutputTokens", 900).put("temperature", 0.4));
        if (sysText.length() > 0) {
            body.put("systemInstruction", new JSONObject().put("parts",
                    new JSONArray().put(new JSONObject().put("text", sysText.toString()))));
        }

        byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(payload);
        }

        int status = conn.getResponseCode();
        int retryAfter = parseRetryAfter(conn.getHeaderField("Retry-After"));
        String raw = readBody(conn, status >= 400);
        conn.disconnect();

        if (status < 200 || status >= 300) {
            throw new CallFailure("Gemini HTTP " + status, status, retryAfter);
        }

        JSONObject json = new JSONObject(raw);
        JSONArray cands = json.optJSONArray("candidates");
        if (cands == null || cands.length() == 0) {
            throw new CallFailure("Gemini sin candidates", 502, 0);
        }
        JSONObject content = cands.getJSONObject(0).optJSONObject("content");
        JSONArray parts = content != null ? content.optJSONArray("parts") : null;
        StringBuilder out = new StringBuilder();
        if (parts != null) {
            for (int i = 0; i < parts.length(); i++) {
                out.append(parts.getJSONObject(i).optString("text", ""));
            }
        }
        String res = out.toString().trim();
        if (res.isEmpty()) throw new CallFailure("Gemini respuesta vacía", 502, 0);
        return res;
    }

    private String callTrialectica(ProviderSpec p, JSONArray messages) throws Exception {
        String lastUser = "Diagnóstico rápido";
        for (int i = messages.length() - 1; i >= 0; i--) {
            JSONObject m = messages.optJSONObject(i);
            if (m != null && "user".equals(m.optString("role"))) {
                lastUser = m.optString("content", lastUser);
                break;
            }
        }
        HttpURLConnection conn = (HttpURLConnection) new URL(p.url).openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(p.connectTimeoutMs);
        conn.setReadTimeout(p.readTimeoutMs);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        conn.setRequestProperty("User-Agent", "AgentBot-Android/1.2.0");

        JSONObject body = new JSONObject()
                .put("nodo_id", "agent_bot_android_redmi")
                .put("nombre", "agent Bot Android (Redmi)")
                .put("estado", "funciona")
                .put("mensaje", lastUser);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }

        int status = conn.getResponseCode();
        String raw = readBody(conn, status >= 400);
        conn.disconnect();
        if (status < 200 || status >= 300) {
            throw new CallFailure("Trialéctica HTTP " + status, status, 0);
        }
        JSONObject json = new JSONObject(raw);
        JSONArray msgs = json.optJSONArray("mensajes");
        if (msgs == null || msgs.length() == 0) {
            throw new CallFailure("Trialéctica vacía", 502, 0);
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < msgs.length(); i++) {
            JSONObject item = msgs.getJSONObject(i);
            String autor = item.optString("autor", "Agente");
            if ("Tú".equals(autor)) continue;
            if (sb.length() > 0) sb.append("\n\n");
            sb.append("[").append(autor).append("] ").append(item.optString("texto", ""));
        }
        String res = sb.toString().trim();
        if (res.isEmpty()) throw new CallFailure("Trialéctica sin síntesis", 502, 0);
        return res;
    }

    private String callOpenAiCompatible(ProviderSpec p, JSONArray messages) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(p.url).openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(p.connectTimeoutMs);
        conn.setReadTimeout(p.readTimeoutMs);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        conn.setRequestProperty("User-Agent", "AgentBot-Android/1.2.0");
        if (!p.apiKey.isEmpty()) {
            conn.setRequestProperty("Authorization", "Bearer " + p.apiKey);
        }

        JSONObject body = new JSONObject()
                .put("model", p.model)
                .put("messages", messages)
                .put("max_tokens", 900)
                .put("temperature", 0.4)
                .put("stream", false);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        } catch (SocketTimeoutException ste) {
            throw new CallFailure("Timeout conexión (" + p.connectTimeoutMs + "ms)", 504, 0);
        }

        int status;
        try {
            status = conn.getResponseCode();
        } catch (SocketTimeoutException ste) {
            throw new CallFailure("Timeout lectura (" + p.readTimeoutMs + "ms)", 504, 0);
        }
        int retryAfter = parseRetryAfter(conn.getHeaderField("Retry-After"));
        String raw = readBody(conn, status >= 400);
        conn.disconnect();

        if (status < 200 || status >= 300) {
            throw new CallFailure(p.id + " HTTP " + status, status, retryAfter);
        }

        String text = "";
        try {
            JSONObject json = new JSONObject(raw);
            JSONArray choices = json.optJSONArray("choices");
            if (choices != null && choices.length() > 0) {
                JSONObject msg = choices.getJSONObject(0).optJSONObject("message");
                if (msg != null) text = msg.optString("content", "").trim();
            }
            if (text.isEmpty()) text = json.optString("respuesta", "").trim();
        } catch (Exception nonJson) {
            text = raw.trim();
        }
        if (text.isEmpty()) {
            throw new CallFailure(p.id + " devolvió texto vacío", 502, 0);
        }
        return text;
    }

    private static int parseRetryAfter(String hdr) {
        if (hdr == null || hdr.trim().isEmpty()) return 0;
        try {
            return Math.max(0, Integer.parseInt(hdr.trim()));
        } catch (Exception e) {
            return 0;
        }
    }

    private static String readBody(HttpURLConnection conn, boolean isError) {
        try (InputStream is = isError ? conn.getErrorStream() : conn.getInputStream()) {
            if (is == null) return "";
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) != -1) {
                bos.write(buf, 0, n);
            }
            return new String(bos.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    public synchronized JSONObject snapshotJson() {
        JSONObject root = new JSONObject();
        try {
            long now = System.currentTimeMillis();
            List<ProviderSpec> specs = buildProviders();
            JSONArray arr = new JSONArray();
            for (ProviderSpec p : specs) {
                ProviderHealth h = ensureHealth(p.id);
                long remSec = h.cooldownUntilMs > now ? ((h.cooldownUntilMs - now + 999L) / 1000L) : 0L;
                JSONObject item = new JSONObject();
                item.put("id", p.id);
                item.put("name", p.name);
                item.put("kind", p.kind);
                item.put("model", p.model);
                item.put("tier", p.tier);
                item.put("status", remSec > 0 ? h.status : "READY");
                item.put("cooldownSec", remSec);
                item.put("latencyMs", h.ewmaLatencyMs);
                item.put("calls", h.calls);
                item.put("successes", h.successes);
                item.put("rateLimits", h.rateLimits);
                item.put("outages", h.outages);
                item.put("lastError", h.lastError);
                arr.put(item);
            }
            JSONObject m = new JSONObject();
            m.put("totalRequests", totalRequests);
            m.put("totalSuccess", totalSuccess);
            m.put("totalFailovers", totalFailovers);
            m.put("rateLimitsSurvived", rateLimitsSurvived);
            m.put("outagesSurvived", outagesSurvived);
            m.put("lastProviderId", lastProviderId);
            root.put("metrics", m);
            root.put("providers", arr);
            root.put("lastRun", lastRunReport);
        } catch (Exception ignored) {}
        return root;
    }
}
