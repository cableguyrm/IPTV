// Tiny persistent key/value store (on-device only).
const NS = "jarvis:";
const mem = new Map();

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(NS + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return mem.has(key) ? mem.get(key) : fallback;
    }
  },
  set(key, value) {
    mem.set(key, value);
    try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  clearAll() {
    mem.clear();
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
  },
};
