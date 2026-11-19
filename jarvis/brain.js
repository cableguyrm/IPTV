// On-device language model, powered by WebLLM + WebGPU.
// Weights are downloaded once, then cached on the phone for offline use.

export const MODELS = [
  { base: "Qwen2.5-0.5B-Instruct", label: "Qwen 2.5 0.5B — fastest, ~0.4 GB (low-end phones)" },
  { base: "Llama-3.2-1B-Instruct", label: "Llama 3.2 1B — balanced, ~0.7 GB (recommended)" },
  { base: "Qwen3-0.6B", label: "Qwen 3 0.6B — small & smart, ~0.5 GB" },
  { base: "Qwen2.5-1.5B-Instruct", label: "Qwen 2.5 1.5B — smarter, ~1.0 GB" },
  { base: "Qwen3-1.7B", label: "Qwen 3 1.7B — smarter, ~1.1 GB" },
  { base: "gemma-2-2b-it", label: "Gemma 2 2B — strong writer, ~1.4 GB (6 GB+ RAM)" },
  { base: "Llama-3.2-3B-Instruct", label: "Llama 3.2 3B — most capable, ~1.8 GB (8 GB+ RAM)" },
];
export const DEFAULT_MODEL = "Llama-3.2-1B-Instruct";

let webllm = null;
let engine = null;
let loadedId = null;
let f16 = null;

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
  engine = null;
  loadedId = null;
}

export async function load(base, onProgress) {
  const id = modelId(base);
  if (engine && loadedId === id) return;
  await unload();
  const { CreateWebWorkerMLCEngine } = await lib();
  const worker = new Worker(new URL("./llm-worker.js", import.meta.url), { type: "module" });
  engine = await CreateWebWorkerMLCEngine(worker, id, {
    initProgressCallback: (r) => onProgress?.(r.progress ?? 0, r.text ?? ""),
  });
  loadedId = id;
}

export function interrupt() { try { engine?.interruptGenerate(); } catch { /* ignore */ } }

// Streams a reply. onToken receives the visible text so far.
export async function chat(messages, onToken) {
  if (!engine) throw new Error("Model not loaded");
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
