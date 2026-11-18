"use strict";

/**
 * Materializes physical folders in vendor-native/ and node_modules/ for:
 *  - Prebuilt N-API Windows x64 modules from dist/deps/* (cursor-proclist, @anysphere/jpeg-napi, sand-*, tree-sitter*)
 *  - Open-source @anysphere/* and @sand/* mocks from mocks/anysphere-open
 * Guarantees zero missing-folder warnings in electron-builder and zero C++ node-gyp rebuild failures.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DEPS_SRC = path.join(ROOT, "dist", "deps");
const VENDOR_NATIVE = path.join(ROOT, "vendor-native");
const NODE_MODULES = path.join(ROOT, "node_modules");
const MOCK_SRC = path.join(ROOT, "mocks", "anysphere-open");

const NATIVE_MODULES = [
  { src: "cursor-proclist", pkgName: "cursor-proclist", vendorDir: "cursor-proclist" },
  { src: path.join("@anysphere", "jpeg-napi"), pkgName: "@anysphere/jpeg-napi", vendorDir: "jpeg-napi" },
  { src: "sand-address-lookup", pkgName: "sand-address-lookup", vendorDir: "sand-address-lookup" },
  { src: "sand-card-text-recognition", pkgName: "sand-card-text-recognition", vendorDir: "sand-card-text-recognition" },
  { src: "sand-devicecheck", pkgName: "sand-devicecheck", vendorDir: "sand-devicecheck" },
  { src: "sand-notification-settings", pkgName: "sand-notification-settings", vendorDir: "sand-notification-settings" },
  { src: "sand-window-capture", pkgName: "sand-window-capture", vendorDir: "sand-window-capture" },
  { src: "tree-sitter", pkgName: "tree-sitter", vendorDir: "tree-sitter" },
  { src: "tree-sitter-bash", pkgName: "tree-sitter-bash", vendorDir: "tree-sitter-bash" },
  { src: "web-tree-sitter", pkgName: "web-tree-sitter", vendorDir: "web-tree-sitter" },
  { src: "node-addon-api", pkgName: "node-addon-api", vendorDir: "node-addon-api" },
  { src: "node-gyp-build", pkgName: "node-gyp-build", vendorDir: "node-gyp-build" },
];

const MOCKED_PACKAGES = [
  "@anysphere/agent", "@anysphere/agent-client", "@anysphere/agent-core", "@anysphere/agent-exec",
  "@anysphere/agent-kv", "@anysphere/agent-store-ids", "@anysphere/agent-store-sync", "@anysphere/agent-summarization",
  "@anysphere/agent-transcript", "@anysphere/analytics-client", "@anysphere/analytics-types", "@anysphere/attention-count",
  "@anysphere/browser-smoke", "@anysphere/canvas-shared", "@anysphere/card-photo-text", "@anysphere/chat-inference",
  "@anysphere/chat-inference-proto", "@anysphere/codebase-telemetry", "@anysphere/constants", "@anysphere/context",
  "@anysphere/context-rpc", "@anysphere/cursor-config", "@anysphere/cursor-icons", "@anysphere/cursor-plugins",
  "@anysphere/device-local-tools", "@anysphere/draft-revision", "@anysphere/dune", "@anysphere/dune-reliability",
  "@anysphere/file-kind-icons", "@anysphere/agent-bot", "@anysphere/agent-bot-harness", "@anysphere/link-preview",
  "@anysphere/local-exec", "@anysphere/marketplace-category", "@anysphere/mcp-agent-exec", "@anysphere/mcp-core",
  "@anysphere/messages-mac", "@anysphere/metrics", "@anysphere/model-selection", "@anysphere/orbit-client",
  "@anysphere/otel-proto", "@anysphere/proto", "@anysphere/redacted-protos", "@anysphere/sand-playwright-runtime",
  "@anysphere/shell-exec", "@anysphere/slack-app-setup", "@anysphere/ui", "@anysphere/usage-banner",
  "@anysphere/utils", "@anysphere/virtual", "@anysphere/voice-call-harness", "@anysphere/xai-commerce-prepaid",
  "@sand/client", "@sand/host", "@sand/local-exec-daemon", "@sand/local-exec-protocol",
  "@sand/primitives", "@sand/sand-eval-runner", "@sand/shared", "@sand/shared-node",
];

function rmSafe(target) {
  try {
    const st = fs.lstatSync(target);
    if (st.isSymbolicLink() || st.isFile()) {
      fs.unlinkSync(target);
    } else {
      fs.rmSync(target, { recursive: true, force: true });
    }
  } catch (_e) {
    // ignore if absent
  }
}

function sanitizeNativePkgJson(pkgJsonPath, forcedName) {
  if (!fs.existsSync(pkgJsonPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  pkg.name = forcedName;
  pkg.private = false;
  delete pkg.files;
  delete pkg.gypfile;
  delete pkg.engines;
  delete pkg.devDependencies;
  delete pkg.peerDependencies;
  if (pkg.scripts) {
    delete pkg.scripts.install;
    delete pkg.scripts.rebuild;
    delete pkg.scripts.postinstall;
    delete pkg.scripts.preinstall;
  }
  // Keep runtime dependencies minimal so npm doesn't pull unnecessary gyp chains
  if (pkg.dependencies) {
    delete pkg.dependencies["node-addon-api"];
    delete pkg.dependencies["node-gyp-build"];
    delete pkg.dependencies["web-tree-sitter"];
  }
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

const CURSOR_PROCLIST_SAFE_WRAPPER = `"use strict";
const os = require("node:os");
let binding = null;
try {
  binding = require("./build/Release/cursor_proclist.node");
} catch (_err) {
  binding = null;
}

async function fallbackScanAsync(_roots) {
  return [[process.pid, process.ppid || 0, process.title || "electron", "", 0, Math.round(process.memoryUsage().rss / 1048576), process.argv.join(" "), "", ""]];
}

module.exports = {
  cursor_proclist_scan_async: binding && binding.cursor_proclist_scan_async ? binding.cursor_proclist_scan_async : fallbackScanAsync,
  cursor_proclist_system_memory: binding && binding.cursor_proclist_system_memory ? binding.cursor_proclist_system_memory : () => ({ totalBytes: os.totalmem(), availableBytes: os.freemem() }),
  cursor_proclist_pid_footprints: binding && binding.cursor_proclist_pid_footprints ? binding.cursor_proclist_pid_footprints : () => null,
  cursor_set_compact_window_toolbar: binding && binding.cursor_set_compact_window_toolbar ? binding.cursor_set_compact_window_toolbar : () => false,
};
`;

function copyPhysicalDir(srcDir, destDir) {
  rmSafe(destDir);
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true, dereference: true });
}

function main() {
  const mode = process.argv[2] || "all";
  fs.mkdirSync(VENDOR_NATIVE, { recursive: true });

  // 1. Stage sanitized vendor-native folders from dist/deps
  for (const mod of NATIVE_MODULES) {
    const srcPath = path.join(DEPS_SRC, mod.src);
    if (!fs.existsSync(srcPath)) continue;
    const vDest = path.join(VENDOR_NATIVE, mod.vendorDir);
    copyPhysicalDir(srcPath, vDest);
    sanitizeNativePkgJson(path.join(vDest, "package.json"), mod.pkgName);
    if (mod.pkgName === "cursor-proclist") {
      fs.writeFileSync(path.join(vDest, "index.js"), CURSOR_PROCLIST_SAFE_WRAPPER, "utf8");
    }
  }

  if (mode === "vendor-only") {
    console.log("[sync-native-deps] Staged vendor-native directories.");
    return;
  }

  // 2. Materialize physical directories inside node_modules/ (replacing any npm file: junctions/symlinks)
  fs.mkdirSync(NODE_MODULES, { recursive: true });
  for (const mod of NATIVE_MODULES) {
    const vSrc = path.join(VENDOR_NATIVE, mod.vendorDir);
    if (!fs.existsSync(vSrc)) continue;
    const nmDest = path.join(NODE_MODULES, ...mod.pkgName.split("/"));
    copyPhysicalDir(vSrc, nmDest);
  }

  // 3. Materialize physical open-source mock directories in node_modules/@anysphere/* and @sand/*
  for (const pkgName of MOCKED_PACKAGES) {
    const nmDest = path.join(NODE_MODULES, ...pkgName.split("/"));
    copyPhysicalDir(MOCK_SRC, nmDest);
    const pkgJson = path.join(nmDest, "package.json");
    const data = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
    data.name = pkgName;
    fs.writeFileSync(pkgJson, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  console.log(`[sync-native-deps] Materialized ${NATIVE_MODULES.length} native modules + ${MOCKED_PACKAGES.length} open mocks in node_modules.`);
}

main();
