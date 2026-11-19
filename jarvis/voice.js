// Speech in and out. Text-to-speech uses the phone's built-in voices (offline).
// Speech recognition uses the browser's engine; on recent Chrome it runs
// on-device when the language pack is installed.

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = "speechSynthesis" in window;

// ---------------- Text to speech ----------------
let voices = [];
let opts = { voiceURI: "", rate: 1, pitch: 0.9, lang: "en-GB" };
let speakingCount = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(speakingCount > 0));
export const onSpeakingChange = (fn) => listeners.add(fn);

function loadVoices() {
  voices = canSpeak ? speechSynthesis.getVoices() : [];
  return voices;
}
if (canSpeak) {
  loadVoices();
  speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

export function getVoices() {
  return loadVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith("en") || v.default)
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

// Prefer a calm British male voice, locally installed.
function scoreVoice(v) {
  let s = 0;
  if (/en[-_]GB/i.test(v.lang)) s += 4;
  if (/daniel|george|arthur|oliver|ryan|male|uk english male|brian/i.test(v.name)) s += 3;
  if (v.localService) s += 2;
  if (/en[-_](US|AU|IE)/i.test(v.lang)) s += 1;
  return s;
}

export function setVoiceOptions(o) { opts = { ...opts, ...o }; }

function currentVoice() {
  const list = getVoices();
  return list.find((v) => v.voiceURI === opts.voiceURI) || list[0] || null;
}

export function speak(text) {
  if (!canSpeak || !text?.trim()) return Promise.resolve();
  const clean = text
    .replace(/```[\s\S]*?```/g, " (code shown on screen) ")
    .replace(/[*_#`>|]/g, "")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/J\.A\.R\.V\.I\.S\./g, "Jarvis")
    .replace(/•/g, "");
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(clean);
    const v = currentVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = opts.lang;
    u.rate = opts.rate;
    u.pitch = opts.pitch;
    speakingCount++; emit();
    const done = () => { speakingCount = Math.max(0, speakingCount - 1); emit(); resolve(); };
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  speakingCount = 0; emit();
}

// Speaks streamed text sentence by sentence as it arrives.
export class SentenceSpeaker {
  constructor(enabled) { this.enabled = enabled; this.spoken = 0; }
  push(fullText) {
    if (!this.enabled) return;
    const pending = fullText.slice(this.spoken);
    const m = pending.match(/^[\s\S]*?[.!?;:\n](?=\s|$)/);
    if (m && m[0].trim().length > 1) {
      this.spoken += m[0].length;
      speak(m[0]);
      this.push(fullText);
    }
  }
  flush(fullText) {
    if (!this.enabled) return;
    const rest = fullText.slice(this.spoken);
    this.spoken = fullText.length;
    if (rest.trim()) speak(rest);
  }
}

// ---------------- Speech to text ----------------
let localMode = null; // true: on-device, false: browser default

async function prepareLocal(lang) {
  if (localMode !== null || !SR?.available) return;
  try {
    const status = await SR.available({ langs: [lang], processLocally: true });
    if (status === "available") localMode = true;
    else if (status === "downloadable" || status === "downloading") {
      localMode = false;
      SR.install?.({ langs: [lang], processLocally: true }).then((ok) => { if (ok) localMode = true; }).catch(() => {});
    } else localMode = false;
  } catch { localMode = false; }
}

// One recognition session. Resolves with the final transcript ("" if none).
export function listenOnce({ lang = navigator.language || "en-US", onInterim } = {}) {
  return new Promise(async (resolve, reject) => {
    if (!SR) return reject(new Error("Speech recognition isn't supported in this browser."));
    await prepareLocal(lang);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    if (localMode && "processLocally" in rec) rec.processLocally = true;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      onInterim?.(finalText + interim);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (localMode && (e.error === "language-not-supported" || e.error === "service-not-allowed")) localMode = false;
      reject(new Error(e.error));
    };
    rec.onend = () => resolve(finalText.trim());
    current = rec;
    try { rec.start(); } catch (e) { reject(e); }
  });
}

let current = null;
export function stopListening() { try { current?.stop(); } catch { /* ignore */ } }
export function abortListening() { try { current?.abort(); } catch { /* ignore */ } }
