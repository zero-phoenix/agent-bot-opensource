"use strict";

/**
 * Open-Source Replacement Mock & Resilient Multi-Provider Connector for @anysphere/* and @sand/*
 * Uses ResilientProviderRotator to survive AI provider outages (5xx/timeouts) and HTTP 429 rate-limits.
 */

const path = require("node:path");
let rotatorModule = null;
try {
  rotatorModule = require(path.resolve(__dirname, "..", "..", "src", "provider-rotator", "rotator.cjs"));
} catch (_e) {
  rotatorModule = null;
}

const sharedRotator = rotatorModule ? new rotatorModule.ResilientProviderRotator() : null;

const TABRIS_CORE_CONFIG = Object.freeze({
  cloudCoreUrl: process.env.TABRIS_CLOUD_CORE_URL || "https://tabris-99d32b.openclaw.direct",
  localBridgeUrl: process.env.SAND_BACKEND_URL || "http://127.0.0.1:8085",
  localOpenAiUrl: "http://127.0.0.1:8085/v1/chat/completions",
  metaHarnessUrl: "http://127.0.0.1:8898/ritsuko/meta-harness",
  trialecticaUrl: "http://127.0.0.1:8898/ritsuko/trialectica",
  mapaVisorUrl: "http://127.0.0.1:8898",
  costLockUsd: 0.0,
});

async function askTabrisCore(prompt, options = {}) {
  const messages = Array.isArray(prompt) ? prompt : [{ role: "user", content: String(prompt || "") }];
  if (sharedRotator) {
    const out = await sharedRotator.chatCompletion(messages, options);
    return out.content;
  }
  const res = await fetch(TABRIS_CORE_CONFIG.localOpenAiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-free", max_tokens: 900, messages }),
  });
  if (!res.ok) throw new Error(`Bridge HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

function createOpenMock(label = "anysphere-open") {
  const fn = function (..._args) {
    return createOpenMock(label);
  };
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === "__esModule") return true;
      if (prop === "then") return undefined;
      if (prop === Symbol.toPrimitive) return () => label;
      if (prop === "toString" || prop === "valueOf") return () => label;
      if (prop === "TABRIS_CORE_CONFIG") return TABRIS_CORE_CONFIG;
      if (prop === "askTabrisCore") return askTabrisCore;
      if (prop === "rotator") return sharedRotator;
      if (prop === "default") return baseExports;
      return createOpenMock(`${label}.${String(prop)}`);
    },
    construct(_target, _args) {
      return createOpenMock(`${label}#instance`);
    },
  });
}

const baseExports = createOpenMock("anysphere-open");
module.exports = baseExports;
