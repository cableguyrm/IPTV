// CPU engine: llama.cpp compiled to WebAssembly (wllama). No GPU involved, so
// it works on phones whose browser GPU driver is unstable. Uses all CPU cores
// when the page is cross-origin isolated (serve.py sends the needed headers).

const HF = "https://huggingface.co";
export const GGUF = {
  "Qwen2.5-0.5B-Instruct": "Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
  "Llama-3.2-1B-Instruct": "bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
  "Qwen3-0.6B": "unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf",
  "Qwen2.5-1.5B-Instruct": "Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
  "Qwen3-1.7B": "unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf",
  "gemma-2-2b-it": "bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf",
  "Llama-3.2-3B-Instruct": "bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
  "Qwen3-4B": "unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf",
  "Llama-3.1-8B-Instruct": "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
};
const urlFor = (base) => `${HF}/${GGUF[base]}`;
const CONFIG = { default: new URL("./vendor/wllama.wasm", import.meta.url).href };

let mod = null;
let wllama = null;      // instance with a model loaded
let loadedBase = null;
let probe = null;       // instance used only for cache queries
let abort = null;

const lib = async () => (mod ??= await import("./vendor/wllama.js"));
async function cacheInstance() {
  if (wllama) return wllama;
  const { Wllama } = await lib();
  return (probe ??= new Wllama(CONFIG, { suppressNativeLog: true, allowOffline: true }));
}

export const threads = () => (self.crossOriginIsolated ? Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1)) : 1);
export const isLoaded = () => !!wllama?.isModelLoaded?.();
export const loadedModel = () => loadedBase;

export async function isCached(base) {
  try {
    const cm = (await cacheInstance()).cacheManager;
    const name = await cm.getNameFromURL(urlFor(base));
    return (await cm.list()).some((e) => e.name === name);
  } catch { return false; }
}

export async function deleteModel(base) {
  if (loadedBase === base) await unload();
  try { await (await cacheInstance()).cacheManager.delete(urlFor(base)); } catch { /* ignore */ }
}

export async function unload() {
  try { abort?.abort(); } catch { /* ignore */ }
  try { await wllama?.exit(); } catch { /* ignore */ }
  wllama = null;
  loadedBase = null;
}

export async function load(base, onProgress) {
  if (!GGUF[base]) throw new Error("This model isn't available in CPU mode.");
  if (wllama && loadedBase === base) return;
  await unload();
  const { Wllama } = await lib();
  const w = new Wllama(CONFIG, { suppressNativeLog: true, allowOffline: true });
  onProgress?.(0, "Preparing CPU engine…");
  await w.loadModelFromUrl(urlFor(base), {
    n_ctx: 4096,
    n_batch: 512,
    n_gpu_layers: 0,
    n_threads: threads(),
    useCache: true,
    progressCallback: ({ loaded, total }) => {
      const p = total ? loaded / total : 0;
      onProgress?.(p, `Downloading ${Math.round(p * 100)}% (${(loaded / 1e6).toFixed(0)} / ${(total / 1e6).toFixed(0)} MB)`);
    },
  });
  wllama = w;
  loadedBase = base;
}

export function interrupt() { try { abort?.abort(); } catch { /* ignore */ } }

export async function chat(messages, onToken) {
  if (!isLoaded()) throw new Error("Model not loaded");
  if (loadedBase.startsWith("Qwen3")) {
    messages = messages.map((m, i) => (i === 0 && m.role === "system" ? { ...m, content: m.content + "\n/no_think" } : m));
  }
  abort = new AbortController();
  let raw = "";
  try {
    await wllama.createChatCompletion({
      messages,
      stream: true,
      max_tokens: 512,
      temperature: 0.6,
      top_p: 0.9,
      abortSignal: abort.signal,
      onData: (chunk) => {
        raw += chunk.choices?.[0]?.delta?.content ?? "";
        onToken(clean(raw));
      },
    });
  } catch (e) {
    if (e?.name !== "AbortError" && !/abort/i.test(String(e?.message))) throw e;
  } finally {
    abort = null;
  }
  return clean(raw);
}

const clean = (s) => s.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").replace(/^\s+/, "");
