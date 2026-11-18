"use strict";

/**
 * Agent Bot OpenSource — Resilient Multi-Provider AI Rotation & Circuit-Breaker Engine
 * Survives provider outages (TCP/DNS/5xx/timeouts) and HTTP 429 rate-limits via:
 *   1. Per-bucket Circuit Breaker (CLOSED -> COOLDOWN_429 / OPEN_DOWN -> HALF_OPEN)
 *   2. Retry-After header parsing + Exponential Backoff with Jitter (capped at 300s)
 *   3. Round-Robin + EWMA Latency Health Scoring across independent quota buckets
 *   4. Zero-Key Public Cloud Fallbacks so the agent stays alive even with zero API keys
 *   5. Strictly secret-free: keys load only from env vars or ~/.agentbot/providers.local.json
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function loadLocalSecrets() {
  const candidates = [
    process.env.AGENTBOT_PROVIDERS_FILE,
    path.join(os.homedir(), ".agentbot", "providers.local.json"),
  ].filter(Boolean);
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
    } catch (_e) {}
  }
  return {};
}

function buildDefaultProviders(customSecrets = {}) {
  const localCfg = { ...loadLocalSecrets(), ...customSecrets };
  const geminiKey = process.env.GEMINI_API_KEY || localCfg.GEMINI_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || localCfg.GROQ_API_KEY || "";
  const openrouterKey = process.env.OPENROUTER_API_KEY || localCfg.OPENROUTER_API_KEY || "";
  const cerebrasKey = process.env.CEREBRAS_API_KEY || localCfg.CEREBRAS_API_KEY || "";
  const customBridgeUrl = process.env.AGENTBOT_BRIDGE_URL || localCfg.AGENTBOT_BRIDGE_URL || "http://127.0.0.1:8085/v1/chat/completions";
  const bridgeToken = process.env.AGENTBOT_BRIDGE_TOKEN || localCfg.AGENTBOT_BRIDGE_TOKEN || "";

  const list = [
    {
      id: "local-bridge-8085",
      name: "Local Multi-Agent Bridge (:8085)",
      kind: "openai",
      url: customBridgeUrl,
      model: "claude-free",
      apiKey: bridgeToken,
      timeoutMs: 12000,
      enabled: true,
      tier: 1,
    },
  ];

  if (localCfg.SECONDARY_BRIDGE_URL || process.env.SECONDARY_BRIDGE_URL) {
    list.push({
      id: "mesh-secondary-bridge",
      name: "Tailscale Mesh Bridge #2",
      kind: "openai",
      url: localCfg.SECONDARY_BRIDGE_URL || process.env.SECONDARY_BRIDGE_URL,
      model: "claude-free",
      apiKey: bridgeToken,
      timeoutMs: 10000,
      enabled: true,
      tier: 1,
    });
  }

  if (geminiKey) {
    for (const gModel of [
      "gemini-3.1-flash-lite-preview",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
    ]) {
      list.push({
        id: `gemini:${gModel}`,
        name: `Google Gemini (${gModel})`,
        kind: "openai",
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        model: gModel,
        apiKey: geminiKey,
        timeoutMs: 18000,
        enabled: true,
        tier: 2,
      });
    }
  }

  if (groqKey) {
    for (const m of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
      list.push({
        id: `groq:${m}`,
        name: `Groq LPU (${m})`,
        kind: "openai",
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: m,
        apiKey: groqKey,
        timeoutMs: 15000,
        enabled: true,
        tier: 2,
      });
    }
  }

  if (cerebrasKey) {
    list.push({
      id: "cerebras:llama3.1-8b",
      name: "Cerebras Wafer-Scale (llama3.1-8b)",
      kind: "openai",
      url: "https://api.cerebras.ai/v1/chat/completions",
      model: "llama3.1-8b",
      apiKey: cerebrasKey,
      timeoutMs: 15000,
      enabled: true,
      tier: 2,
    });
  }

  if (openrouterKey) {
    for (const m of ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen-2.5-72b-instruct:free"]) {
      list.push({
        id: `openrouter:${m}`,
        name: `OpenRouter (${m})`,
        kind: "openai",
        url: "https://openrouter.ai/api/v1/chat/completions",
        model: m,
        apiKey: openrouterKey,
        timeoutMs: 20000,
        enabled: true,
        tier: 2,
      });
    }
  }

  // Always-available zero-key open fallbacks (independent models)
  list.push(
    {
      id: "pollinations:openai",
      name: "Pollinations Cloud OpenAI (Zero-Key)",
      kind: "openai",
      url: "https://text.pollinations.ai/openai",
      model: "openai",
      apiKey: "",
      timeoutMs: 22000,
      enabled: true,
      tier: 3,
    },
    {
      id: "pollinations:mistral",
      name: "Pollinations Cloud Mistral (Zero-Key)",
      kind: "openai",
      url: "https://text.pollinations.ai/openai",
      model: "mistral",
      apiKey: "",
      timeoutMs: 22000,
      enabled: true,
      tier: 3,
    }
  );

  if (Array.isArray(localCfg.customProviders)) {
    for (const cp of localCfg.customProviders) {
      if (cp && cp.id && cp.url) list.push({ tier: 2, timeoutMs: 18000, enabled: true, ...cp });
    }
  }

  return list;
}

class ResilientProviderRotator {
  constructor(options = {}) {
    this.providers = options.providers || buildDefaultProviders(options.secrets || {});
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.cursor = 0;
    this.state = new Map();
    this.simulatedFaults = new Map(); // id -> { status: 429|503, remaining: N }
    this.metrics = {
      totalRequests: 0,
      totalSuccess: 0,
      totalFailovers: 0,
      rateLimitsSurvived: 0,
      outagesSurvived: 0,
      lastProviderId: null,
    };

    for (const p of this.providers) {
      this._ensureState(p.id);
    }
  }

  _ensureState(id) {
    if (!this.state.has(id)) {
      this.state.set(id, {
        status: "READY",
        cooldownUntilMs: 0,
        consecutiveFailures: 0,
        ewmaLatencyMs: 650,
        calls: 0,
        successes: 0,
        rateLimits: 0,
        outages: 0,
        lastError: null,
      });
    }
    return this.state.get(id);
  }

  injectFault(providerId, httpStatus = 429, count = 1) {
    this.simulatedFaults.set(providerId, { status: httpStatus, remaining: Math.max(1, count) });
  }

  resetCooldowns() {
    for (const st of this.state.values()) {
      st.status = "READY";
      st.cooldownUntilMs = 0;
      st.consecutiveFailures = 0;
      st.lastError = null;
    }
    this.simulatedFaults.clear();
  }

  markSuccess(id, latencyMs) {
    const st = this._ensureState(id);
    st.status = "READY";
    st.cooldownUntilMs = 0;
    st.consecutiveFailures = 0;
    st.calls += 1;
    st.successes += 1;
    st.ewmaLatencyMs = Math.round(0.7 * st.ewmaLatencyMs + 0.3 * latencyMs);
    st.lastError = null;
  }

  markFailure(id, errInfo) {
    const st = this._ensureState(id);
    st.calls += 1;
    st.consecutiveFailures += 1;
    const code = Number(errInfo.status || 0);
    const jitterMs = Math.floor(Math.random() * 1500);

    if (code === 429) {
      st.rateLimits += 1;
      this.metrics.rateLimitsSurvived += 1;
      const retryAfterSec = Number(errInfo.retryAfterSec || 0);
      const baseMs = retryAfterSec > 0 ? retryAfterSec * 1000 : Math.min(300000, 30000 * Math.pow(1.8, st.consecutiveFailures - 1));
      st.status = "COOLDOWN_429";
      st.cooldownUntilMs = Date.now() + baseMs + jitterMs;
    } else if (code === 401 || code === 402 || code === 403) {
      st.outages += 1;
      this.metrics.outagesSurvived += 1;
      st.status = "AUTH_OR_QUOTA_LOCKED";
      st.cooldownUntilMs = Date.now() + 600000;
    } else {
      st.outages += 1;
      this.metrics.outagesSurvived += 1;
      const baseMs = Math.min(240000, 15000 * Math.pow(2, st.consecutiveFailures - 1));
      st.status = "OPEN_DOWN";
      st.cooldownUntilMs = Date.now() + baseMs + jitterMs;
    }
    st.lastError = String(errInfo.message || `HTTP ${code}`).slice(0, 180);
  }

  orderedCandidates() {
    const now = Date.now();
    const enabled = this.providers.filter((p) => p.enabled !== false);
    if (enabled.length === 0) return [];

    // Advance round-robin cursor across healthy Tier-equivalent providers
    const offset = this.cursor % enabled.length;
    this.cursor = (this.cursor + 1) % enabled.length;
    const rotated = enabled.slice(offset).concat(enabled.slice(0, offset));

    const ready = [];
    const cooling = [];
    for (const p of rotated) {
      const st = this._ensureState(p.id);
      if (st.cooldownUntilMs <= now) {
        if (st.status !== "READY") st.status = "HALF_OPEN";
        ready.push(p);
      } else {
        cooling.push(p);
      }
    }

    ready.sort((a, b) => (a.tier || 2) - (b.tier || 2));
    cooling.sort((a, b) => this._ensureState(a.id).cooldownUntilMs - this._ensureState(b.id).cooldownUntilMs);
    // If every single provider is in cooldown, probe the one closest to expiry as last-resort relief
    return ready.length > 0 ? ready : cooling.slice(0, 2);
  }

  async _callSingleProvider(provider, messages, options = {}) {
    const sim = this.simulatedFaults.get(provider.id);
    if (sim && sim.remaining > 0) {
      sim.remaining -= 1;
      if (sim.remaining <= 0) this.simulatedFaults.delete(provider.id);
      const err = new Error(`Simulated HTTP ${sim.status} on ${provider.id}`);
      err.status = sim.status;
      err.retryAfterSec = sim.status === 429 ? 30 : 0;
      throw err;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), provider.timeoutMs || 18000);
    const t0 = Date.now();

    try {
      if (provider.kind === "gemini") {
        const sysParts = [];
        const contents = [];
        for (const m of messages) {
          const text = String(m.content || "");
          if (m.role === "system") {
            sysParts.push({ text });
          } else {
            contents.push({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text }],
            });
          }
        }
        if (contents.length === 0) {
          contents.push({ role: "user", parts: [{ text: "Hola" }] });
        }
        const payload = {
          contents,
          generationConfig: { maxOutputTokens: options.maxTokens || 900, temperature: options.temperature ?? 0.4 },
        };
        if (sysParts.length > 0) {
          payload.systemInstruction = { parts: sysParts };
        }
        const sep = provider.url.includes("?") ? "&" : "?";
        const res = await this.fetchImpl(`${provider.url}${sep}key=${encodeURIComponent(provider.apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "AgentBot-OpenSource/1.2" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const err = new Error(`Gemini HTTP ${res.status}`);
          err.status = res.status;
          err.retryAfterSec = Number(res.headers.get("retry-after") || 0);
          throw err;
        }
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("")
            .trim() || "";
        if (!text) {
          const err = new Error("Gemini empty response");
          err.status = 502;
          throw err;
        }
        return { text, latencyMs: Date.now() - t0 };
      }

      // Standard OpenAI Chat Completions format
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "AgentBot-OpenSource/1.2",
      };
      if (provider.apiKey) {
        headers.Authorization = `Bearer ${provider.apiKey}`;
      }
      const res = await this.fetchImpl(provider.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: provider.model || "openai",
          messages,
          max_tokens: options.maxTokens || 900,
          temperature: options.temperature ?? 0.4,
          stream: false,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const err = new Error(`${provider.id} HTTP ${res.status}`);
        err.status = res.status;
        err.retryAfterSec = Number(res.headers.get("retry-after") || 0);
        throw err;
      }
      const rawText = await res.text();
      let text = "";
      try {
        const parsed = JSON.parse(rawText);
        text = (parsed?.choices?.[0]?.message?.content || parsed?.respuesta || "").trim();
      } catch (_jsonErr) {
        // Some zero-key endpoints return plain text directly if overloaded
        text = rawText.trim();
      }
      if (!text) {
        const err = new Error(`${provider.id} returned empty text`);
        err.status = 502;
        throw err;
      }
      return { text, latencyMs: Date.now() - t0 };
    } catch (err) {
      if (err && err.name === "AbortError") {
        const toutErr = new Error(`${provider.id} timeout (${provider.timeoutMs}ms)`);
        toutErr.status = 504;
        throw toutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async chatCompletion(messages, options = {}) {
    this.metrics.totalRequests += 1;
    const candidates = this.orderedCandidates();
    const trail = [];

    for (let i = 0; i < candidates.length; i++) {
      const p = candidates[i];
      try {
        const out = await this._callSingleProvider(p, messages, options);
        this.markSuccess(p.id, out.latencyMs);
        this.metrics.totalSuccess += 1;
        if (i > 0) this.metrics.totalFailovers += i;
        this.metrics.lastProviderId = p.id;
        return {
          ok: true,
          providerId: p.id,
          providerName: p.name,
          model: p.model,
          latencyMs: out.latencyMs,
          failoverHops: i,
          attemptsTrail: trail,
          content: out.text,
          openaiResponse: {
            id: `chatcmpl-rot-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: `${p.id}/${p.model}`,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: out.text },
                finish_reason: "stop",
              },
            ],
            x_rotator: {
              provider_id: p.id,
              provider_name: p.name,
              latency_ms: out.latencyMs,
              failover_hops: i,
              trail,
            },
          },
        };
      } catch (err) {
        this.markFailure(p.id, err);
        trail.push({
          providerId: p.id,
          status: err.status || 0,
          error: String(err.message || err),
        });
      }
    }

    throw new Error(`All AI providers exhausted (${trail.map((t) => `${t.providerId}:${t.status || "ERR"}`).join(" -> ")})`);
  }

  snapshot() {
    const now = Date.now();
    return {
      metrics: { ...this.metrics },
      providers: this.providers.map((p) => {
        const st = this._ensureState(p.id);
        const remSec = st.cooldownUntilMs > now ? Math.ceil((st.cooldownUntilMs - now) / 1000) : 0;
        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          model: p.model,
          tier: p.tier,
          enabled: p.enabled !== false,
          status: remSec > 0 ? st.status : "READY",
          cooldownRemainingSec: remSec,
          ewmaLatencyMs: st.ewmaLatencyMs,
          calls: st.calls,
          successes: st.successes,
          rateLimits: st.rateLimits,
          outages: st.outages,
          lastError: st.lastError,
        };
      }),
    };
  }
}

module.exports = {
  ResilientProviderRotator,
  buildDefaultProviders,
};
