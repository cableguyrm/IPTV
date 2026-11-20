// On-device language model, powered by WebLLM + WebGPU.
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

const lib = async () => (webllm ??= await import("./vendor/web-llm.js"));

export async function gpuInfo() {
  if (!("gpu" in navigator)) return { ok: false, reason: "This browser has no WebGPU. Use an up-to-date Chrome (Android 12+) or Safari 26+ (iOS)." };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { ok: false, reason: "WebGPU is present but no compatible GPU adapter was found on this phone." };
    f16 = adapter.features.has("shader-f16");
    return { ok: true, f16 };
  } catch (e) {
    return { ok: false, reason: `WebGPU error: ${e.message}` };
  }
}

export const modelId = (base) => `${base}-${f16 === false ? "q4f32_1" : "q4f16_1"}-MLC`;
export const isLoaded = () => !!engine;
export const loadedModel = () => loadedId;

export async function isCached(base) {
  try { return await (await lib()).hasModelInCache(modelId(base)); } catch { return false; }
}

export async function deleteModel(base) {
  const id = modelId(base);
  if (loadedId === id) await unload();
  await (await lib()).deleteModelAllInfoInCache(id);
}

export async function unload() {
  try { await engine?.unload(); } catch { /* ignore */ }
  try { worker?.terminate(); } catch { /* ignore */ }
  worker = null;
  engine = null;
  loadedId = null;
}

// Only one load at a time: a second call waits for the first instead of
// putting a second copy of the model in GPU memory.
let loading = null;
export function load(base, onProgress) {
  const id = modelId(base);
  if (engine && loadedId === id) return Promise.resolve();
  if (loading) return loading.id === id ? loading.p : loading.p.catch(() => {}).then(() => load(base, onProgress));
  const p = doLoad(base, onProgress).finally(() => { loading = null; });
  loading = { id, p };
  return p;
}
export const isLoading = () => !!loading;

async function doLoad(base, onProgress) {
  const id = modelId(base);
  await unload();
  const { CreateWebWorkerMLCEngine } = await lib();
  worker = new Worker(new URL("./llm-worker.js", import.meta.url), { type: "module" });
  engine = await CreateWebWorkerMLCEngine(worker, id, {
    initProgressCallback: (r) => onProgress?.(r.progress ?? 0, r.text ?? ""),
  });
  loadedId = id;
}

// True when the GPU context died (out of memory, app backgrounded, driver reset).
export function isLostError(e) {
  return /disposed|device (was |is )?lost|devicelost|instance reference no longer exists|GPUDevice|out of memory|OOM|context lost|Aborted\(/i.test(String(e?.message || e));
}

// Forget a dead engine without touching it (calling into it would throw again).
export function forget() {
  const w = engine;
  engine = null;
  loadedId = null;
  try { w?.unload?.().catch?.(() => {}); } catch { /* ignore */ }
  try { worker?.terminate(); } catch { /* ignore */ }
  worker = null;
}

export function interrupt() { try { engine?.interruptGenerate(); } catch { /* ignore */ } }

// Streams a reply. onToken receives the visible text so far.
export async function chat(messages, onToken) {
  if (!engine) throw new Error("Model not loaded");
  try {
    return await chatInner(messages, onToken);
  } catch (e) {
    if (isLostError(e)) { forget(); e.lost = true; }
    throw e;
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
