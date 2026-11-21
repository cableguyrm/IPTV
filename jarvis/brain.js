// On-device language model. Two engines:
//  - GPU: WebLLM + WebGPU (fastest)
//  - CPU: llama.cpp in WebAssembly (cpu.js) — works when the GPU driver is unstable
// Weights are downloaded once, then cached on the phone for offline use.

export const MODELS = [
  { base: "Qwen2.5-0.5B-Instruct", label: "Qwen 2.5 0.5B — fastest, ~0.4 GB (low-end phones)" },
  { base: "Llama-3.2-1B-Instruct", label: "Llama 3.2 1B — balanced, ~0.7 GB (recommended)" },
  { base: "Qwen3-0.6B", label: "Qwen 3 0.6B — small & smart, ~0.5 GB" },
  { base: "Qwen2.5-1.5B-Instruct", label: "Qwen 2.5 1.5B — smarter, ~1.0 GB" },
  { base: "Qwen3-1.7B", label: "Qwen 3 1.7B — smarter, ~1.1 GB" },
  { base: "gemma-2-2b-it", label: "Gemma 2 2B — strong writer, ~1.4 GB (high-end phones)" },
  { base: "Llama-3.2-3B-Instruct", label: "Llama 3.2 3B — capable, ~1.8 GB (flagship phones)" },
  { base: "Qwen3-4B", label: "Qwen 3 4B — very smart, ~2.3 GB (flagship phones, 12 GB+ RAM)" },
  { base: "Llama-3.1-8B-Instruct", label: "Llama 3.1 8B — experimental, ~4.6 GB (16 GB+ RAM)" },
];
export const DEFAULT_MODEL = "Llama-3.2-1B-Instruct";

let webllm = null;
let engine = null;
let loadedId = null;
let f16 = null;
let worker = null;
import * as cpu from "./cpu.js";
let mode = "gpu"; // "gpu" | "cpu"
export const setMode = (m) => { mode = m === "cpu" ? "cpu" : "gpu"; };
export const getMode = () => mode;
export const cpuThreads = cpu.threads;

const lib = async () => (webllm ??= await import("./vendor/web-llm.js"));

export async function gpuInfo() {
  if (!("gpu" in navigator)) return { ok: false, reason: "This browser has no WebGPU. Use an up-to-date Chrome (Android 12+) or Safari 26+ (iOS)." };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { ok: false, reason: "WebGPU is present but no compatible GPU adapter was found on this phone." };
    f16 = adapter.features.has("shader-f16");
    const vendor = (adapter.info?.vendor || "").toLowerCase();
    return { ok: true, f16, vendor };
  } catch (e) {
    return { ok: false, reason: `WebGPU error: ${e.message}` };
  }
}

// forceF32: avoid 16-bit GPU shaders (buggy on some mobile drivers, e.g. Adreno).
let forceF32 = false;
export const setForceF32 = (v) => { forceF32 = !!v; };
export const usingF16 = () => !forceF32 && f16 !== false;
export const modelId = (base) => `${base}-${usingF16() ? "q4f16_1" : "q4f32_1"}-MLC`;
const g_isLoaded = () => !!engine;

async function g_isCached(base) {
  try { return await (await lib()).hasModelInCache(modelId(base)); } catch { return false; }
}

async function g_deleteModel(base) {
  const id = modelId(base);
  if (loadedId === id) await g_unload();
  await (await lib()).deleteModelAllInfoInCache(id);
}

async function g_unload() {
  try { await engine?.unload(); } catch { /* ignore */ }
  try { worker?.terminate(); } catch { /* ignore */ }
  worker = null;
  engine = null;
  loadedId = null;
}

// Only one load at a time: a second call waits for the first instead of
// putting a second copy of the model in GPU memory.
let loading = null;
function g_load(base, onProgress) {
  const id = modelId(base);
  if (engine && loadedId === id) return Promise.resolve();
  if (loading) return loading.id === id ? loading.p : loading.p.catch(() => {}).then(() => g_load(base, onProgress));
  const p = doLoad(base, onProgress).finally(() => { loading = null; });
  loading = { id, p };
  return p;
}
export const isLoading = () => !!loading;

async function doLoad(base, onProgress) {
  const id = modelId(base);
  await g_unload();
  const { CreateWebWorkerMLCEngine } = await lib();
  worker = new Worker(new URL("./llm-worker.js", import.meta.url), { type: "module" });
  engine = await CreateWebWorkerMLCEngine(worker, id, {
    initProgressCallback: (r) => onProgress?.(r.progress ?? 0, r.text ?? ""),
  }, {
    // Smaller GPU jobs: mobile drivers reset the GPU if one job runs too long.
    prefill_chunk_size: 128,
  });
  loadedId = id;
}

// GPU diagnostics from the worker (see llm-worker.js).
let lastGpuError = "";
const lostListeners = new Set();
export const onLost = (fn) => lostListeners.add(fn);
export const lastError = () => lastGpuError;
try {
  new BroadcastChannel("jarvis-gpu").onmessage = ({ data }) => {
    if (data.level === "error") lastGpuError = data.text;
    if (data.lost && engine) { forget(); lostListeners.forEach((fn) => fn(data.text)); }
  };
} catch { /* BroadcastChannel unsupported */ }

// True when the GPU context died (out of memory, app backgrounded, driver reset).
export function isLostError(e) {
  return /disposed|device (was |is )?lost|devicelost|instance reference no longer exists|GPUDevice|out of memory|OOM|context lost|Aborted\(/i.test(String(e?.message || e));
}

// Forget a dead engine without touching it (calling into it would throw again).
export function forget() {
  if (pendingReject) { const err = new Error("GPU device was lost"); err.lost = true; pendingReject(err); pendingReject = null; }
  const w = engine;
  engine = null;
  loadedId = null;
  try { w?.unload?.().catch?.(() => {}); } catch { /* ignore */ }
  try { worker?.terminate(); } catch { /* ignore */ }
  worker = null;
}

function g_interrupt() { try { engine?.interruptGenerate(); } catch { /* ignore */ } }

// Streams a reply. onToken receives the visible text so far.
let pendingReject = null;
async function g_chat(messages, onToken) {
  if (!engine) throw new Error("Model not loaded");
  try {
    // If the GPU is lost mid-reply the worker is terminated; this makes the
    // waiting request fail fast instead of hanging forever.
    const lost = new Promise((_, rej) => { pendingReject = rej; });
    return await Promise.race([chatInner(messages, onToken), lost]);
  } catch (e) {
    if (isLostError(e)) { forget(); e.lost = true; }
    throw e;
  } finally {
    pendingReject = null;
  }
}

async function chatInner(messages, onToken) {
  const isQwen3 = loadedId.startsWith("Qwen3");
  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.6,
    top_p: 0.9,
    max_tokens: 512,
    ...(isQwen3 ? { extra_body: { enable_thinking: false } } : {}),
  });
  let raw = "";
  for await (const chunk of stream) {
    raw += chunk.choices?.[0]?.delta?.content ?? "";
    onToken(clean(raw));
  }
  return clean(raw);
}

const clean = (s) => s.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").replace(/^\s+/, "");

// ---------------- Engine-agnostic API ----------------
export const isLoaded = () => (mode === "cpu" ? cpu.isLoaded() : g_isLoaded());
export const loadedModel = () => (mode === "cpu" ? (cpu.loadedModel() ? `${cpu.loadedModel()} (CPU)` : null) : loadedId);
export const isCached = (base) => (mode === "cpu" ? cpu.isCached(base) : g_isCached(base));
export const deleteModel = (base) => (mode === "cpu" ? cpu.deleteModel(base) : g_deleteModel(base));
export const interrupt = () => (mode === "cpu" ? cpu.interrupt() : g_interrupt());
export const chat = (messages, onToken) => (mode === "cpu" ? cpu.chat(messages, onToken) : g_chat(messages, onToken));
export async function unload() { await g_unload(); await cpu.unload(); }
export async function load(base, onProgress) {
  if (mode === "cpu") { await g_unload(); return cpu.load(base, onProgress); }
  await cpu.unload();
  return g_load(base, onProgress);
}
