import { store } from "./store.js";
import { handleLocal } from "./skills.js";
import * as brain from "./brain.js";
import * as voice from "./voice.js";

const $ = (id) => document.getElementById(id);
const els = {
  log: $("log"), input: $("input"), composer: $("composer"), mic: $("mic-btn"),
  reactor: $("reactor"), stateLabel: $("state-label"), pill: $("status-pill"),
  loadBar: $("load-bar"), loadFill: $("load-fill"), loadText: $("load-text"),
  settings: $("settings"), settingsBtn: $("settings-btn"), installBtn: $("install-btn"),
  modelSelect: $("model-select"), loadModelBtn: $("load-model-btn"), deleteModelBtn: $("delete-model-btn"),
  autoload: $("autoload"), gpuNote: $("gpu-note"), storageNote: $("storage-note"),
  voiceSelect: $("voice-select"), rate: $("rate"), pitch: $("pitch"),
  speakReplies: $("speak-replies"), wakeWord: $("wake-word"), testVoice: $("test-voice"),
  userName: $("user-name"), userTitle: $("user-title"), clearChat: $("clear-chat"), clearAll: $("clear-all"),
};

// ---------------- State ----------------
const DEFAULTS = {
  model: brain.DEFAULT_MODEL, autoload: true, voiceURI: "", rate: 1, pitch: 0.9,
  speakReplies: true, wakeWord: false, userName: "", userTitle: "sir",
};
const settings = { ...DEFAULTS, ...store.get("settings", {}) };
const saveSettings = () => store.set("settings", settings);
let history = store.get("history", []); // [{role, content}]
let gpu = { ok: false };
let busy = false;
let listening = false;

const title = () => settings.userTitle?.trim() || settings.userName || "sir";

// ---------------- UI helpers ----------------
const STATE_TEXT = {
  idle: "Tap the core to speak",
  listening: "Listening…",
  thinking: "Processing…",
  speaking: "Speaking — tap to interrupt",
  loading: "Bringing the AI brain online…",
};
function setState(s, label) {
  els.reactor.dataset.state = s;
  els.stateLabel.textContent = label ?? STATE_TEXT[s] ?? "";
}
function refreshIdle() {
  if (busy || listening) return;
  if (els.reactor.dataset.state === "loading") return;
  setState(speakingNow ? "speaking" : "idle", settings.wakeWord && !speakingNow ? "Say “Jarvis…” or tap the core" : undefined);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function render(text) {
  let h = escapeHtml(text);
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, code) => `<pre><code>${code}</code></pre>`);
  h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return h;
}

function addMsg(role, text = "", { link } = {}) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  if (role === "bot") div.innerHTML = `<span class="tag">Jarvis</span><span class="body"></span>`;
  else div.innerHTML = `<span class="body"></span>`;
  const body = div.querySelector(".body");
  body.innerHTML = render(text);
  if (link) {
    const a = document.createElement("a");
    a.href = link.href; a.target = "_blank"; a.rel = "noopener"; a.textContent = `\n${link.text}`;
    body.appendChild(a);
  }
  els.log.appendChild(div);
  els.log.scrollTop = els.log.scrollHeight;
  document.body.classList.add("chatting");
  return { div, set: (t) => { body.innerHTML = render(t); els.log.scrollTop = els.log.scrollHeight; } };
}

function setPill() {
  if (brain.isLoaded()) {
    const m = brain.MODELS.find((x) => brain.loadedModel()?.startsWith(x.base));
    els.pill.textContent = `AI online · ${m ? m.base.replace(/-Instruct|-it/, "") : "local"}`;
    els.pill.className = "pill ok";
  } else if (!gpu.ok) {
    els.pill.textContent = "Offline core · no GPU";
    els.pill.className = "pill warn";
  } else {
    els.pill.textContent = "Offline core";
    els.pill.className = "pill";
  }
}

function notify(text) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.ready
        .then((reg) => reg.showNotification("Jarvis", { body: text, icon: "icons/icon-192.png", vibrate: [300, 100, 300] }))
        .catch(() => new Notification("Jarvis", { body: text }));
    }
  } catch { /* ignore */ }
  addMsg("bot", text);
}
function askNotify() {
  try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch { /* ignore */ }
}

// ---------------- Speech output ----------------
let speakingNow = false;
voice.onSpeakingChange((on) => { speakingNow = on; refreshIdle(); });
voice.setVoiceOptions({ voiceURI: settings.voiceURI, rate: settings.rate, pitch: settings.pitch });
const say = (t) => { if (settings.speakReplies) voice.speak(t); };

// ---------------- Conversation ----------------
function systemPrompt() {
  const now = new Date();
  const memories = store.get("memories", []);
  const notes = store.get("notes", []).slice(-10);
  return [
    "You are J.A.R.V.I.S., a witty, loyal and highly capable personal AI assistant in the style of a refined British butler.",
    `Address the user as "${title()}"${settings.userName ? ` (their name is ${settings.userName})` : ""}.`,
    "You run fully offline on the user's phone. You cannot browse the internet or see real-time data; say so briefly if asked for live info (news, weather, prices) and suggest saying “search for …”.",
    "Keep answers short and conversational (1–4 sentences) unless the user asks for detail, a list, code or a longer text. Your replies are often read aloud, so avoid tables and heavy markdown.",
    `Current local date and time: ${now.toLocaleString([], { dateStyle: "full", timeStyle: "short" })}.`,
    memories.length ? `Things the user asked you to remember:\n- ${memories.join("\n- ")}` : "",
    notes.length ? `User's notes:\n- ${notes.map((n) => n.text).join("\n- ")}` : "",
  ].filter(Boolean).join("\n");
}

function remember(role, content) {
  history.push({ role, content });
  history = history.slice(-40);
  store.set("history", history);
}

function doOpen(url) {
  if (/^(tel|sms|mailto):/.test(url)) { location.href = url; return; }
  const w = window.open(url, "_blank", "noopener");
  if (!w) addMsg("sys", "Tap the link above to open it.");
}

async function handle(text, fromVoice = false) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  voice.stopSpeaking();
  addMsg("user", text);
  setState("thinking");
  try {
    const local = await handleLocal(text, {
      settings, saveSettings, title, say, notify, askNotify,
      stopSpeaking: voice.stopSpeaking,
    });
    if (local) {
      if (!local.silent) {
        const link = local.open && !/^(tel|sms|mailto):/.test(local.open) ? { href: local.open, text: "Open link" } : local.link;
        addMsg("bot", local.reply, { link });
        say(local.reply);
        remember("user", text);
        remember("assistant", local.reply);
      }
      if (local.open) doOpen(local.open);
      return;
    }

    if (!brain.isLoaded() && gpu.ok && settings.autoload && (await brain.isCached(settings.model))) {
      await loadBrain();
    }
    if (!brain.isLoaded()) {
      const reply = gpu.ok
        ? `My offline skills don't cover that, ${title()}. Open Settings and load the AI brain (a one-time download) and I can answer anything, fully on this phone. Say “help” to see what I can do right now.`
        : `My offline skills don't cover that, ${title()}, and this browser can't run the AI brain (it needs WebGPU — try the latest Chrome). Say “help” to see what I can do.`;
      addMsg("bot", reply);
      say(reply);
      return;
    }

    const msgs = [
      { role: "system", content: systemPrompt() },
      ...history.slice(-12),
      { role: "user", content: text },
    ];
    const bubble = addMsg("bot", "");
    bubble.div.classList.add("typing");
    const speaker = new voice.SentenceSpeaker(settings.speakReplies);
    let out = "";
    try {
      out = await brain.chat(msgs, (t) => { out = t; bubble.set(t); speaker.push(t); });
    } finally {
      bubble.div.classList.remove("typing");
    }
    speaker.flush(out);
    if (!out.trim()) bubble.set("…");
    remember("user", text);
    remember("assistant", out);
  } catch (e) {
    console.error(e);
    addMsg("bot", `I ran into a problem: ${e.message || e}`);
  } finally {
    busy = false;
    refreshIdle();
  }
}

// ---------------- Model loading ----------------
async function loadBrain() {
  if (!gpu.ok) { addMsg("sys", gpu.reason); return; }
  const cached = await brain.isCached(settings.model);
  els.loadBar.hidden = false;
  els.loadModelBtn.disabled = true;
  setState("loading", cached ? "Bringing the AI brain online…" : "Downloading the AI brain (one time only)…");
  try {
    try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
    await brain.load(settings.model, (p, txt) => {
      els.loadFill.style.width = `${Math.round(p * 100)}%`;
      els.loadText.textContent = txt.length > 60 ? `${Math.round(p * 100)}%` : txt || `${Math.round(p * 100)}%`;
    });
    addMsg("sys", "AI brain online. Everything runs on this phone.");
    setPill();
  } catch (e) {
    console.error(e);
    addMsg("sys", `Couldn't load the AI brain: ${e.message || e}. Try a smaller model in Settings.`);
  } finally {
    els.loadBar.hidden = true;
    els.loadModelBtn.disabled = false;
    setState("idle");
    refreshIdle();
    updateStorageNote();
  }
}

// ---------------- Voice input ----------------
async function listenAndHandle() {
  if (!voice.canListen) {
    addMsg("sys", "Voice input isn't supported in this browser — please type instead.");
    return;
  }
  if (listening) { voice.stopListening(); return; }
  voice.stopSpeaking();
  brain.interrupt();
  voice.abortListening();
  listening = true;
  manualListen = true;
  els.mic.classList.add("live");
  setState("listening");
  try {
    const text = await voice.listenOnce({ onInterim: (t) => setState("listening", t ? `“${t}”` : "Listening…") });
    listening = false;
    els.mic.classList.remove("live");
    if (text) await handle(text, true);
  } catch (e) {
    if (e.message === "not-allowed") addMsg("sys", "Microphone access was denied. Enable it in the browser's site settings.");
    else if (e.message === "network") addMsg("sys", "Voice recognition needs a connection on this phone. You can still type.");
    else addMsg("sys", `Voice error: ${e.message}`);
  } finally {
    listening = false;
    manualListen = false;
    els.mic.classList.remove("live");
    refreshIdle();
  }
}

// Wake word: keep listening while the app is open and visible.
let manualListen = false;
let wakeRunning = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wakeLoop() {
  if (wakeRunning || !voice.canListen) return;
  wakeRunning = true;
  let failures = 0;
  while (settings.wakeWord && !document.hidden) {
    if (busy || manualListen || speakingNow) { await sleep(400); continue; }
    let heard = "";
    try {
      heard = await voice.listenOnce();
      failures = 0;
    } catch (e) {
      if (e.message === "not-allowed") { settings.wakeWord = false; saveSettings(); els.wakeWord.checked = false; addMsg("sys", "Microphone access denied — wake word disabled."); break; }
      failures++;
      await sleep(Math.min(8000, 800 * failures));
      continue;
    }
    if (!settings.wakeWord || manualListen) continue;
    const m = heard.toLowerCase().match(/\b(jarvis|travis|jarvi)\b[,.!?\s]*(.*)$/);
    if (!m) continue;
    let cmd = m[2].trim();
    if (!cmd) {
      navigator.vibrate?.(40);
      await voice.speak(`Yes, ${title()}?`);
      setState("listening");
      try { cmd = await voice.listenOnce({ onInterim: (t) => setState("listening", `“${t}”`) }); } catch { cmd = ""; }
      refreshIdle();
    }
    if (cmd) await handle(cmd, true);
  }
  wakeRunning = false;
  refreshIdle();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && settings.wakeWord) wakeLoop(); });

// ---------------- Settings UI ----------------
async function populateModels() {
  els.modelSelect.innerHTML = "";
  for (const m of brain.MODELS) {
    const o = document.createElement("option");
    o.value = m.base;
    o.textContent = m.label + ((await brain.isCached(m.base)) ? "  ✓ downloaded" : "");
    els.modelSelect.appendChild(o);
  }
  els.modelSelect.value = settings.model;
}
function populateVoices() {
  const list = voice.getVoices();
  els.voiceSelect.innerHTML = "";
  if (!list.length) {
    els.voiceSelect.innerHTML = "<option>System default</option>";
    return;
  }
  for (const v of list) {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = `${v.name} (${v.lang})${v.localService ? "" : " · online"}`;
    els.voiceSelect.appendChild(o);
  }
  els.voiceSelect.value = settings.voiceURI || list[0].voiceURI;
}
async function updateStorageNote() {
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) els.storageNote.textContent = `Using ${(est.usage / 1e9).toFixed(2)} GB of ${(est.quota / 1e9).toFixed(1)} GB available to the app.`;
  } catch { /* ignore */ }
}

function bindSettings() {
  els.settingsBtn.onclick = async () => {
    els.autoload.checked = settings.autoload;
    els.rate.value = settings.rate;
    els.pitch.value = settings.pitch;
    els.speakReplies.checked = settings.speakReplies;
    els.wakeWord.checked = settings.wakeWord;
    els.userName.value = settings.userName;
    els.userTitle.value = settings.userTitle;
    els.gpuNote.textContent = gpu.ok
      ? `WebGPU ready${gpu.f16 ? " (fast 16-bit mode)" : ""}. Pick a model, then download it once — it's cached for offline use.`
      : gpu.reason;
    els.gpuNote.className = gpu.ok ? "note" : "note warn";
    els.loadModelBtn.disabled = !gpu.ok;
    populateVoices();
    updateStorageNote();
    els.settings.showModal();
    populateModels();
  };
  els.modelSelect.onchange = () => { settings.model = els.modelSelect.value; saveSettings(); };
  els.loadModelBtn.onclick = () => { els.settings.close(); loadBrain(); };
  els.deleteModelBtn.onclick = async () => {
    if (!confirm("Delete this model from the phone? You can download it again later.")) return;
    await brain.deleteModel(settings.model);
    setPill();
    populateModels();
    updateStorageNote();
  };
  els.autoload.onchange = () => { settings.autoload = els.autoload.checked; saveSettings(); };
  els.voiceSelect.onchange = () => { settings.voiceURI = els.voiceSelect.value; saveSettings(); voice.setVoiceOptions({ voiceURI: settings.voiceURI }); };
  els.rate.oninput = () => { settings.rate = +els.rate.value; saveSettings(); voice.setVoiceOptions({ rate: settings.rate }); };
  els.pitch.oninput = () => { settings.pitch = +els.pitch.value; saveSettings(); voice.setVoiceOptions({ pitch: settings.pitch }); };
  els.speakReplies.onchange = () => { settings.speakReplies = els.speakReplies.checked; saveSettings(); if (!settings.speakReplies) voice.stopSpeaking(); };
  els.wakeWord.onchange = () => {
    settings.wakeWord = els.wakeWord.checked; saveSettings();
    if (settings.wakeWord) wakeLoop(); else voice.abortListening();
    refreshIdle();
  };
  els.testVoice.onclick = () => voice.speak(`Good day, ${title()}. J.A.R.V.I.S. at your service.`);
  els.userName.onchange = () => { settings.userName = els.userName.value.trim(); saveSettings(); };
  els.userTitle.onchange = () => { settings.userTitle = els.userTitle.value.trim() || "sir"; saveSettings(); };
  els.clearChat.onclick = () => { history = []; store.set("history", []); els.log.innerHTML = ""; document.body.classList.remove("chatting"); welcome(); els.settings.close(); };
  els.clearAll.onclick = () => {
    if (!confirm("Erase all chat history, notes, memories and settings? (Downloaded models are kept.)")) return;
    store.clearAll();
    location.reload();
  };
  els.settings.addEventListener("click", (e) => { if (e.target === els.settings) els.settings.close(); });
}

// ---------------- Install (PWA) ----------------
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; els.installBtn.hidden = false; });
els.installBtn.onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null;
  els.installBtn.hidden = true;
};
window.addEventListener("appinstalled", () => addMsg("sys", "Jarvis is installed. Open it from your home screen any time."));

// ---------------- Boot ----------------
function welcome() {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  addMsg("bot", `${part}, ${title()}. J.A.R.V.I.S. online. How can I help?`);
  const chips = document.createElement("div");
  chips.className = "chips";
  for (const c of ["What can you do?", "What time is it?", "Battery status", "Set a timer for 5 minutes", "Tell me a joke"]) {
    const b = document.createElement("button");
    b.className = "chip"; b.type = "button"; b.textContent = c;
    b.onclick = () => handle(c);
    chips.appendChild(b);
  }
  els.log.appendChild(chips);
}

function restoreHistory() {
  for (const m of history.slice(-20)) addMsg(m.role === "user" ? "user" : "bot", m.content);
}

async function boot() {
  bindSettings();
  els.composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = els.input.value;
    els.input.value = "";
    els.input.blur();
    handle(t);
  });
  els.mic.onclick = listenAndHandle;
  els.reactor.onclick = () => {
    if (speakingNow) { voice.stopSpeaking(); brain.interrupt(); return; }
    if (busy) { brain.interrupt(); return; }
    listenAndHandle();
  };

  if (history.length) restoreHistory(); else welcome();

  gpu = await brain.gpuInfo();
  setPill();
  refreshIdle();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW", e));

  if (gpu.ok && settings.autoload && (await brain.isCached(settings.model))) loadBrain();
  else if (gpu.ok && !history.length) addMsg("sys", "Tip: open ⚙ Settings → “Download & load” to give me a full AI brain that runs offline.");

  if (settings.wakeWord) wakeLoop();
  else if (new URLSearchParams(location.search).has("listen")) listenAndHandle();
}

boot();
