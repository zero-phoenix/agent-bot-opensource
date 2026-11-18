# agent Bot OpenSource (Desktop Windows + Native Android APK)

Open-source desktop & mobile agent alternative to Grok Bot / Sand, featuring:
1. **Open-Source `@anysphere/*` & `@sand/*` Replacement Mocks** (`mocks/anysphere-open`) + prebuilt Windows x64 N-API native modules (`cursor-proclist`, `@anysphere/jpeg-napi`, `sand-*`, `tree-sitter*`) materialized physically into `node_modules/` via `scripts/sync-native-deps.cjs`.
2. **Resilient Multi-Provider AI Rotation & Circuit-Breaker Engine** (`src/provider-rotator/rotator.cjs` on Desktop/Node & `ProviderRotator.java` on Android):
   - Survives provider outages (`HTTP 5xx`, DNS/TCP drops, strict connect/read timeouts) and `HTTP 429` rate-limits (`Retry-After` parsing + exponential backoff with jitter).
   - Rotates automatically across Local/Mesh `$0` Bridges (`:8085` / `:8898`), multi-bucket Google Gemini (`gemini-2.5-flash-lite`, `gemini-2.0-flash-lite`, `gemini-2.5-flash`, `gemini-flash-lite-latest`), Groq LPU, Cerebras, OpenRouter, and Zero-Key Cloud Relief (`pollinations:openai`, `pollinations:mistral`).
3. **Native Android APK (`android/`)**:
   - Lightweight zero-Gradle Android SDK build (`aapt2` + `javac` + `d8` + `zipalign` + `apksigner` v2/v3), `minSdk 24`, `targetSdk 35` (Android 15 ready).
   - Live Provider Health & Cooldown Matrix + built-in `503 + 429` Chaos Failover Verifier.
   - Prebuilt signed APK included at `release/agent-Bot-1.2.0-android.apk` (and on GitHub Releases).

## Quick Start — Windows Portable `.exe`

```bash
git clone https://github.com/zero-phoenix/agent-bot-opensource.git
cd agent-bot-opensource
npm install --legacy-peer-deps
npx electron-builder --win --config electron-builder.yml
```

## Quick Start — Native Android `.apk`

```powershell
# Install prebuilt signed APK via ADB:
adb install -r release/agent-Bot-1.2.0-android.apk

# Or rebuild from source:
powershell -ExecutionPolicy Bypass -File android/build-apk.ps1
```

## Run Chaos Rotation & Rate-Limit Test

```bash
node scripts/test-rotator.cjs
```
