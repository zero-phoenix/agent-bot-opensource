"use strict";

/**
 * tabris-core-bootstrap.cjs — Enlace nativo entre agent-bot-opensource y el Núcleo del Sistema:
 *   1. Tabris Cloud Core (OpenClaw Direct): https://tabris-99d32b.openclaw.direct
 *   2. Puente Local Multi-Agente $0.00:      http://127.0.0.1:8085
 *   3. Bastón Táctil + Meta-Harness + Lyapunov: http://127.0.0.1:8898
 */

const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const electron = require("electron");

let desktopRotator = null;
try {
  const { ResilientProviderRotator } = require(path.join(__dirname, "..", "..", "src", "provider-rotator", "rotator.cjs"));
  desktopRotator = new ResilientProviderRotator();
} catch (_e) {
  desktopRotator = null;
}

if (electron.ipcMain && desktopRotator) {
  electron.ipcMain.handle("agentbot:rotator-chat", async (_ev, messages, opts) => {
    return await desktopRotator.chatCompletion(messages, opts || {});
  });
  electron.ipcMain.handle("agentbot:rotator-status", async () => {
    return desktopRotator.snapshot();
  });
}

// Resolver ruta real desempaquetada (app.asar.unpacked) para binarios nativos .node y .exe
const unpackedDeps = path.join(__dirname, "..", "deps").replace("app.asar", "app.asar.unpacked");
if (fs.existsSync(unpackedDeps)) {
  process.env.NODE_PATH = unpackedDeps + (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : "");
  Module._initPaths();
}
const unpackedSigner = path.join(__dirname, "..", "native", "sand-webauthn-signer.exe").replace("app.asar", "app.asar.unpacked");
if (!process.env.SAND_WEBAUTHN_SIGNER_PATH && fs.existsSync(unpackedSigner)) {
  process.env.SAND_WEBAUTHN_SIGNER_PATH = unpackedSigner;
}

// Conectar por defecto al Núcleo del Sistema (sin muros propietarios externos y a costo $0.00)
const DEFAULT_ENV = {
  TABRIS_CLOUD_CORE_URL: "https://tabris-99d32b.openclaw.direct",
  SAND_BACKEND_URL: "http://127.0.0.1:8085",
  CURSOR_API_BASE_URL: "http://127.0.0.1:8085",
  CURSOR_ORIGIN_BACKEND_URL: "http://127.0.0.1:8085",
  SAND_CURSOR_WEBSITE_URL: "http://127.0.0.1:8898",
  CURSOR_WEBSITE_URL: "http://127.0.0.1:8898",
  SAND_DEV_CAPABILITY: "1",
  SAND_DEV_LOGIN: "Ultra",
  SAND_DEV_LOGIN_EMAIL: "tabris@openclaw.local",
  OPENAI_BASE_URL: "http://127.0.0.1:8085/v1",
  OPENAI_API_KEY: "dsh-free-local",
};

for (const [k, v] of Object.entries(DEFAULT_ENV)) {
  if (!process.env[k]) {
    process.env[k] = v;
  }
}

// Modo de autoverificación empírica sin ventana visible (--tabris-selftest [outPath])
const argv = process.argv || [];
const selftestIdx = argv.indexOf("--tabris-selftest");
if (selftestIdx >= 0) {
  const outFile = argv[selftestIdx + 1] || path.join(process.cwd(), "selftest-result.json");
  electron.app.whenReady().then(async () => {
    const report = {
      ok: false,
      appName: electron.app.getName(),
      appVersion: electron.app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      isPackaged: electron.app.isPackaged,
      nativeModules: {},
      openMock: false,
      coreEndpoints: {},
    };
    try {
      const reqLocal = Module.createRequire(__filename);
      const proclist = reqLocal("cursor-proclist");
      const procs = await proclist.cursor_proclist_scan_async([process.pid]);
      report.nativeModules["cursor-proclist"] = { ok: Array.isArray(procs) && procs.length > 0, sampleCount: procs.length };

      for (const modName of [
        "@anysphere/jpeg-napi",
        "sand-window-capture",
        "sand-notification-settings",
        "sand-devicecheck",
        "sand-address-lookup",
        "sand-card-text-recognition",
        "tree-sitter",
      ]) {
        try {
          const loaded = reqLocal(modName);
          report.nativeModules[modName] = { ok: !!loaded, keys: Object.keys(loaded).slice(0, 6) };
        } catch (err) {
          report.nativeModules[modName] = { ok: false, error: String(err && err.message ? err.message : err) };
        }
      }

      try {
        const mockMod = reqLocal("@anysphere/agent-core");
        report.openMock = !!(mockMod && mockMod.TABRIS_CORE_CONFIG && mockMod.TABRIS_CORE_CONFIG.costLockUsd === 0);
      } catch (_e) {
        report.openMock = false;
      }

      for (const [epName, url] of [
        ["bridge_8085_dev_session", "http://127.0.0.1:8085/auth/cursor_dev_session_token?plan=ultra&email=tabris@openclaw.local"],
        ["malla_lyapunov_8898", "http://127.0.0.1:8898/ritsuko/malla-control"],
        ["tabris_openclaw_cloud", "https://tabris-99d32b.openclaw.direct/health"],
      ]) {
        try {
          const res = await fetch(url, { headers: { "User-Agent": "Tabris-AgentBot-OpenSource/1.2" } });
          const body = await res.json();
          report.coreEndpoints[epName] = { status: res.status, ok: res.ok, sample: body.ok ?? body.status ?? !!body.accessToken };
        } catch (err) {
          report.coreEndpoints[epName] = { status: 0, ok: false, error: String(err && err.message ? err.message : err) };
        }
      }

      const allNativeOk = Object.values(report.nativeModules).every((x) => x && x.ok);
      const allCoreOk = Object.values(report.coreEndpoints).every((x) => x && x.ok);
      report.ok = allNativeOk && allCoreOk;
    } catch (fatal) {
      report.fatalError = String(fatal && fatal.stack ? fatal.stack : fatal);
    }

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
    electron.app.exit(report.ok ? 0 : 2);
  });
  module.exports = { selftestActive: true };
  return;
}

// En modo interactivo: habilitar CSP hacia el Núcleo Local (:8085/:8898) y OpenClaw Direct, e inyectar barra MAGI (Ctrl+Alt+T)
const HUD_INJECT_JS = `
(() => {
  if (window.__tabrisCoreHudInstalled) return;
  window.__tabrisCoreHudInstalled = true;
  const bar = document.createElement("div");
  bar.id = "tabris-magi-core-bar";
  bar.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:2147483647;background:rgba(12,16,24,0.94);color:#e2e8f0;border:1px solid #38bdf8;border-radius:10px;padding:10px 12px;font:12px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.45);max-width:380px;";
  bar.innerHTML = \`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
      <strong style="color:#38bdf8;">⚡ Núcleo MAGI · Tabris + Ritsuko + Naoko ($0)</strong>
      <button id="tmc-min" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:12px;" title="Ctrl+Alt+T">_</button>
    </div>
    <div id="tmc-body">
      <div id="tmc-status" style="font-size:11px;color:#94a3b8;margin-bottom:6px;">Conectando a :8085 · :8898 · openclaw.direct...</div>
      <div id="tmc-out" style="max-height:140px;overflow:auto;font-size:11px;background:#090d16;padding:6px;border-radius:6px;margin-bottom:6px;display:none;white-space:pre-wrap;"></div>
      <div style="display:flex;gap:4px;">
        <input id="tmc-in" placeholder="Pregunta a Tabris / Trialéctica ($0)..." style="flex:1;background:#111827;color:#f8fafc;border:1px solid #334155;border-radius:6px;padding:5px 7px;font-size:11px;" />
        <button id="tmc-send" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:5px 9px;cursor:pointer;font-size:11px;">Enviar</button>
      </div>
    </div>
  \`;
  document.body.appendChild(bar);
  const bodyEl = bar.querySelector("#tmc-body");
  const stEl = bar.querySelector("#tmc-status");
  const outEl = bar.querySelector("#tmc-out");
  const inEl = bar.querySelector("#tmc-in");
  const toggle = () => { bodyEl.style.display = bodyEl.style.display === "none" ? "block" : "none"; };
  bar.querySelector("#tmc-min").onclick = toggle;
  window.addEventListener("keydown", (e) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "t") toggle(); });

  fetch("http://127.0.0.1:8898/ritsuko/malla-control")
    .then(r => r.json())
    .then(d => {
      const ram = d.lyapunov ? d.lyapunov.ram_libre_gb : "?";
      const v = d.lyapunov ? d.lyapunov.V_energia : 0;
      stEl.textContent = "🟢 Puente :8085 OK · Malla :8898 V=" + v + " (RAM libre " + ram + " GB) · Costo $0.00";
    })
    .catch(() => { stEl.textContent = "🟡 Modo local autónomo (:8085)"; });

  const enviar = async () => {
    const q = (inEl.value || "").trim();
    if (!q) return;
    inEl.value = "";
    outEl.style.display = "block";
    outEl.textContent = "⏳ Consultando tríada MAGI...";
    try {
      const r = await fetch("http://127.0.0.1:8898/ritsuko/trialectica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodo_id: "agent_bot_opensource", nombre: "agent Bot OpenSource", estado: "funciona", mensaje: q })
      });
      const j = await r.json();
      if (j.mensajes && j.mensajes.length) {
        outEl.textContent = j.mensajes.map(m => "[" + m.autor + "] " + m.texto).join("\\n\\n");
        return;
      }
    } catch (_e) {}
    try {
      const r2 = await fetch("http://127.0.0.1:8085/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-free", max_tokens: 500, messages: [{ role: "user", content: q }] })
      });
      const j2 = await r2.json();
      outEl.textContent = (j2.choices && j2.choices[0] && j2.choices[0].message.content) || "Sin respuesta";
    } catch (err) {
      outEl.textContent = "Error puente: " + err.message;
    }
  };
  bar.querySelector("#tmc-send").onclick = enviar;
  inEl.addEventListener("keydown", (e) => { if (e.key === "Enter") enviar(); });
})();
`;

electron.app.whenReady().then(() => {
  try {
    electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === "content-security-policy") {
          headers[k] = headers[k].map((v) =>
            v.replace(
              "connect-src ",
              "connect-src http://127.0.0.1:8085 http://127.0.0.1:8898 https://tabris-99d32b.openclaw.direct "
            )
          );
        }
      }
      callback({ responseHeaders: headers });
    });
  } catch (_e) {}
});

electron.app.on("browser-window-created", (_ev, win) => {
  win.webContents.on("did-finish-load", () => {
    const url = win.webContents.getURL() || "";
    if (url.includes("renderer/index.html") || url.startsWith("file://")) {
      // Allow connect-src in meta CSP dynamically before mounting HUD
      win.webContents
        .executeJavaScript(
          `(() => { const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]'); if (m && !m.content.includes("127.0.0.1:8085")) { m.content = m.content.replace("connect-src ", "connect-src http://127.0.0.1:8085 http://127.0.0.1:8898 https://tabris-99d32b.openclaw.direct "); } })();`
        )
        .then(() => win.webContents.executeJavaScript(HUD_INJECT_JS))
        .catch(() => {});
    }
  });
});

module.exports = { selftestActive: false };
