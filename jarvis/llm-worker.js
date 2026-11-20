// Runs the language model off the main thread so the UI stays smooth.

// Forward GPU errors (e.g. "Device lost") to the page so it can recover and explain.
const diag = new BroadcastChannel("jarvis-gpu");
const post = (level, text, lost = false) => {
  try { diag.postMessage({ level, text: String(text).slice(0, 500), lost }); } catch { /* ignore */ }
};

function describe(a) {
  if (!a || typeof a !== "object") return String(a);
  if ("reason" in a && "message" in a) return `reason=${a.reason} message=${a.message}`; // GPUDeviceLostInfo
  if (a.error?.message) return a.error.message; // GPUUncapturedErrorEvent
  return a.message || JSON.stringify(a);
}
for (const level of ["error", "warn"]) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    orig(...args);
    const text = args.map(describe).join(" ");
    post(level, text, /device (was )?lost/i.test(text));
  };
}

// Capture the real reason when the GPU device is lost.
if (self.GPUAdapter) {
  const orig = GPUAdapter.prototype.requestDevice;
  GPUAdapter.prototype.requestDevice = async function (...args) {
    const device = await orig.apply(this, args);
    device.lost.then((info) => post("error", `GPU device lost: reason=${info.reason} message=${info.message || "(none)"}`, info.reason !== "destroyed"));
    device.addEventListener("uncapturederror", (e) => post("error", `GPU error: ${e.error?.message || e}`));
    return device;
  };
}

// Load WebLLM after the patch above; queue messages that arrive meanwhile.
const queue = [];
self.onmessage = (msg) => queue.push(msg);
const { WebWorkerMLCEngineHandler } = await import("./vendor/web-llm.js");
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
queue.splice(0).forEach((m) => handler.onmessage(m));
