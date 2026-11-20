// Runs the language model off the main thread so the UI stays smooth.
import { WebWorkerMLCEngineHandler } from "./vendor/web-llm.js";

// Forward GPU errors (e.g. "Device lost") to the page so it can recover and explain.
const diag = new BroadcastChannel("jarvis-gpu");
for (const level of ["error", "warn"]) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    orig(...args);
    try {
      const text = args.map(describe).join(" ");
      diag.postMessage({ level, text: text.slice(0, 500), lost: /device lost/i.test(text) });
    } catch { /* ignore */ }
  };
}

function describe(a) {
  if (!a || typeof a !== "object") return String(a);
  if ("reason" in a && "message" in a) return `reason=${a.reason} message=${a.message}`; // GPUDeviceLostInfo
  if (a.error?.message) return a.error.message; // GPUUncapturedErrorEvent
  return a.message || JSON.stringify(a);
}

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
