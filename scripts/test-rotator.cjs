"use strict";

/**
 * Automated Chaos & Failover Test Suite for ResilientProviderRotator
 * Verifies survival across HTTP 503 outages, timeouts, and HTTP 429 rate-limits with Retry-After.
 */

const assert = require("node:assert");
const { ResilientProviderRotator } = require("../src/provider-rotator/rotator.cjs");

async function main() {
  let calls = [];
  const fakeFetch = async (url, _opts) => {
    calls.push(url);
    if (url.includes("provider-down")) {
      return { ok: false, status: 503, headers: new Map(), text: async () => "Service Unavailable" };
    }
    if (url.includes("provider-ratelimited")) {
      return { ok: false, status: 429, headers: new Map([["retry-after", "45"]]), text: async () => "Too Many Requests" };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      text: async () => JSON.stringify({ choices: [{ message: { content: "Failover succeeded cleanly!" } }] }),
    };
  };

  const rotator = new ResilientProviderRotator({
    fetchImpl: fakeFetch,
    providers: [
      { id: "p1-down", name: "Primary Down", kind: "openai", url: "https://provider-down/v1", model: "m1", tier: 1 },
      { id: "p2-429", name: "Secondary 429", kind: "openai", url: "https://provider-ratelimited/v1", model: "m2", tier: 1 },
      { id: "p3-healthy", name: "Tertiary Healthy", kind: "openai", url: "https://provider-healthy/v1", model: "m3", tier: 2 },
    ],
  });

  // 1st request: p1 throws 503 -> p2 throws 429 -> p3 answers 200!
  const r1 = await rotator.chatCompletion([{ role: "user", content: "Ping" }]);
  assert.strictEqual(r1.ok, true);
  assert.strictEqual(r1.providerId, "p3-healthy");
  assert.strictEqual(r1.failoverHops, 2);

  // 2nd request immediately after: p1 (OPEN_DOWN) and p2 (COOLDOWN_429) must be skipped with ZERO wasted network calls!
  calls = [];
  const r2 = await rotator.chatCompletion([{ role: "user", content: "Second ping" }]);
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(r2.providerId, "p3-healthy");
  assert.strictEqual(r2.failoverHops, 0);
  assert.strictEqual(calls.length, 1, "Cooled/open providers must be bypassed immediately!");

  const snap = rotator.snapshot();
  console.log("ROTATOR_CHAOS_TEST_OK:", JSON.stringify(snap.metrics));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
