# J.A.R.V.I.S. — a private AI assistant that runs on your phone

Jarvis is an installable web app (PWA). After the first setup, **everything runs on the phone**: the AI model, chat history, notes and settings. Nothing is sent to a server.

## What it can do

**Works straight away, offline, with no download:**
- Voice: tap the glowing core and talk. It answers out loud with the phone's built-in voices.
- Optional wake word: say “Jarvis, …” while the app is open.
- Time, date, battery, network status, location
- Timers and reminders, with vibration and a notification
- Notes (“take a note…”, “read my notes”) and memory (“call me Tony”, “remember that…”)
- Maths (“what is 15% of 240”, “sqrt 144 times 3”)
- Flashlight on/off
- Calls, texts, email, maps directions, web/YouTube search, opening apps and sites
- Jokes, coin flips, dice

**With the AI brain loaded (one-time download, then offline):**
- General chat, explanations, writing, brainstorming and advice, using a small local language model (Llama 3.2, Qwen, Gemma).
- Two engines (⚙ Settings → AI engine):
  - **Phone GPU:** WebLLM/WebGPU. The fastest, but some phones' browser GPU drivers reset under load.
  - **Phone CPU:** llama.cpp in WebAssembly, using all cores. The most reliable, and needs no GPU.
- If the GPU resets, Jarvis falls back automatically: 16-bit GPU → 32-bit GPU → CPU.
- Replies stream in and are spoken sentence by sentence.

## Requirements

- **Android:** Chrome 121 or newer on Android 12+, with a recent GPU (most phones from 2021 on). Use 4 GB+ RAM for the 0.5–1B models, 6–8 GB+ for the 2–3B models.
- **iPhone:** Safari 26+ (iOS 26) for WebGPU. Without WebGPU, all offline skills still work but the AI brain doesn't.
- Storage: about 0.4–1.8 GB for the model you pick.

## Install on your phone

You need to open the app once over HTTPS (or `localhost`). Pick one option.

### Option A: GitHub Pages (easiest)
1. Merge this branch into `master`.
2. On GitHub, open the repo, go to **Settings → Pages**, and set **Source** to **GitHub Actions**.
3. The `Deploy Jarvis to GitHub Pages` workflow publishes the app to `https://<your-username>.github.io/<repo>/`.
4. Open that link in Chrome on your phone, then tap **⋮ → Install app** (or the ⬇ button in Jarvis). On iPhone, use **Share → Add to Home Screen**.

### Option B: 100% on the phone with Termux (Android)
1. Install **Termux** from F-Droid (the Play Store version is outdated).
2. Open Termux and paste:
   ```sh
   curl -fsSL https://raw.githubusercontent.com/cableguyrm/IPTV/ccr-e7fc0a39-01yh0k/jarvis/install-termux.sh | bash
   ```
3. Chrome opens `http://localhost:8080`. Tap **⋮ → Install app** (or **Add to Home screen**).
4. Next time, open Termux, type `jarvis`, then tap the Jarvis icon on your home screen. Run the installer again to update.

## First run
1. Open Jarvis, tap **⚙ → Download & load**. *Llama 3.2 1B* is the recommended model. Use Wi-Fi: this is a one-time download.
2. When you see “AI brain online”, you're set. It reloads from the phone's storage every time after that, even in airplane mode.
3. Allow microphone access when asked. Allow notifications so timers can alert you.

## Privacy notes
- The model, chat history, notes and memories stay in the browser's storage on this phone. **⚙ → Erase all memory** wipes them.
- **Speech recognition:** on recent Chrome, Jarvis asks for on-device recognition and installs the language pack if it can. Where that isn't available, Chrome's built-in recogniser may send audio to Google. Typing is always fully local.
- Opening sites, searching the web and directions use the internet, because they hand off to other apps.

## Limitations
- The wake word only works while Jarvis is open on screen. Browsers don't allow background listening. On Android, each listening cycle may play a short system beep.
- Small on-device models are capable but not as knowledgeable as large cloud models. They have no live internet data (news, weather).
- Timers only fire while the app is open or in recent apps.

## Files
| File | Purpose |
|---|---|
| `index.html`, `style.css` | UI (arc reactor, chat, settings) |
| `app.js` | Main controller: conversation, voice loop, settings |
| `skills.js` | Offline rule-based abilities |
| `brain.js`, `llm-worker.js` | On-device LLM: GPU engine (WebLLM in a Web Worker) and engine switching |
| `cpu.js` | CPU engine (wllama / llama.cpp WebAssembly) |
| `serve.py` | Local server with the headers that enable multi-core CPU inference |
| `voice.js` | Speech recognition and text-to-speech |
| `sw.js`, `manifest.webmanifest` | Offline caching and install |
| `vendor/web-llm.js` | WebLLM 0.2.86 (Apache-2.0), bundled so the app works offline |
| `vendor/wllama.js`, `vendor/wllama.wasm` | wllama 3.8.1 (MIT), bundled |
