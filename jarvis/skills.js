// Offline "skills": instant, rule-based abilities that work with no AI model
// and no internet. Anything not matched here is passed to the on-device LLM.

import { store } from "./store.js";

const JOKES = [
  "I would tell you a UDP joke, but you might not get it.",
  "There are 10 kinds of people: those who understand binary and those who don't.",
  "I asked my battery how it was feeling. It said it was fully charged with emotion.",
  "Why did the robot go on holiday? It needed to recharge its batteries.",
  "I'm reading a book on anti-gravity. It's impossible to put down.",
  "Debugging: being the detective in a crime movie where you are also the murderer.",
];

const SITES = {
  youtube: "https://www.youtube.com", google: "https://www.google.com",
  maps: "https://maps.google.com", "google maps": "https://maps.google.com",
  gmail: "https://mail.google.com", mail: "https://mail.google.com",
  wikipedia: "https://www.wikipedia.org", netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com", twitter: "https://x.com", x: "https://x.com",
  facebook: "https://www.facebook.com", instagram: "https://www.instagram.com",
  whatsapp: "https://web.whatsapp.com", github: "https://github.com",
  reddit: "https://www.reddit.com", weather: "https://www.google.com/search?q=weather",
  news: "https://news.google.com", calendar: "https://calendar.google.com",
};

const NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, fifty: 50, sixty: 60, ninety: 90 };
const toNum = (s) => (s in NUM_WORDS ? NUM_WORDS[s] : parseFloat(s));
const UNIT_MS = { s: 1e3, sec: 1e3, secs: 1e3, second: 1e3, seconds: 1e3, m: 6e4, min: 6e4, mins: 6e4, minute: 6e4, minutes: 6e4, h: 36e5, hr: 36e5, hrs: 36e5, hour: 36e5, hours: 36e5 };

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- Safe calculator (no eval) ----------
export function calculate(expr) {
  let s = expr.toLowerCase()
    .replace(/,/g, "")
    .replace(/\bsquared\b/g, "^2").replace(/\bcubed\b/g, "^3")
    .replace(/\bplus\b|\band\b/g, "+").replace(/\bminus\b|\bless\b/g, "-")
    .replace(/\btimes\b|\bmultiplied by\b|\bx\b|×/g, "*")
    .replace(/\bdivided by\b|\bover\b|÷/g, "/")
    .replace(/\bto the power of\b|\bpower\b/g, "^")
    .replace(/\bmod\b|\bmodulo\b/g, "%")
    .replace(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*of\s*/g, "$1/100*")
    .replace(/\bsquare root of\b|\bsqrt\b|√/g, "√");
  const tokens = s.match(/\d*\.?\d+|[-+*/^%()√]/g);
  if (!tokens || tokens.join("") !== s.replace(/\s+/g, "")) return null;
  let i = 0;
  const peek = () => tokens[i];
  const eat = () => tokens[i++];
  function primary() {
    const t = eat();
    if (t === "(") { const v = add(); if (eat() !== ")") throw 0; return v; }
    if (t === "-") return -unary();
    if (t === "+") return unary();
    if (t === "√") return Math.sqrt(unary());
    const n = parseFloat(t);
    if (Number.isNaN(n)) throw 0;
    return n;
  }
  function unary() { return primary(); }
  function power() { let b = unary(); if (peek() === "^") { eat(); return Math.pow(b, power()); } return b; }
  function mul() {
    let v = power();
    while (["*", "/", "%"].includes(peek())) {
      const op = eat(), r = power();
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  }
  function add() {
    let v = mul();
    while (["+", "-"].includes(peek())) { const op = eat(), r = mul(); v = op === "+" ? v + r : v - r; }
    return v;
  }
  try {
    const v = add();
    if (i !== tokens.length || !Number.isFinite(v)) return null;
    return Math.round(v * 1e10) / 1e10;
  } catch { return null; }
}

// ---------- Timers & reminders ----------
const active = new Map();
function schedule(ms, label, ctx, kind) {
  const id = Date.now() + Math.random();
  const due = Date.now() + ms;
  const t = setTimeout(() => fire(id, label, ctx, kind), ms);
  active.set(id, { t, label, due, kind });
  return due;
}
function fire(id, label, ctx, kind) {
  active.delete(id);
  const msg = kind === "timer" ? `Your ${label} timer is done, ${ctx.title()}.` : `Reminder, ${ctx.title()}: ${label}`;
  navigator.vibrate?.([300, 120, 300, 120, 600]);
  ctx.notify(msg);
  ctx.say(msg);
}
function humanMs(ms) {
  const parts = [];
  ms = Math.round(ms / 1e3) * 1e3;
  const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.round((ms % 6e4) / 1e3);
  if (h) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} minute${m > 1 ? "s" : ""}`);
  if (s && !h) parts.push(`${s} second${s > 1 ? "s" : ""}`);
  return parts.join(" ") || "0 seconds";
}
function parseDuration(text) {
  let total = 0;
  const re = /(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|forty-five|fifty|sixty|ninety)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g;
  let m;
  while ((m = re.exec(text))) total += toNum(m[1]) * UNIT_MS[m[2]];
  if (/half an hour/.test(text)) total += 18e5;
  return total;
}

// ---------- Flashlight ----------
let torchStream = null;
async function torch(on) {
  if (!on) {
    torchStream?.getTracks().forEach((t) => t.stop());
    torchStream = null;
    return true;
  }
  if (!navigator.mediaDevices?.getUserMedia) return false;
  torchStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  const track = torchStream.getVideoTracks()[0];
  const caps = track.getCapabilities?.() || {};
  if (!caps.torch) { torch(false); return false; }
  await track.applyConstraints({ advanced: [{ torch: true }] });
  return true;
}

// ---------- The skill table ----------
const SKILLS = [
  {
    re: /^(hi|hello|hey|yo|good (morning|afternoon|evening))\b[\s,!.]*(jarvis)?[\s!.]*$/,
    run: (m, ctx) => {
      const h = new Date().getHours();
      const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
      return `${part}, ${ctx.title()}. All systems are online. How may I help?`;
    },
  },
  {
    re: /^(who|what) are you|your name|introduce yourself/,
    run: (m, ctx) => `I am J.A.R.V.I.S., your personal assistant, ${ctx.title()}. I run entirely on this phone, so our conversations never leave the device.`,
  },
  { re: /^(thanks|thank you|cheers)\b/, run: (m, ctx) => pick([`Always a pleasure, ${ctx.title()}.`, `At your service, ${ctx.title()}.`, `You're welcome, ${ctx.title()}.`]) },
  { re: /how are you/, run: (m, ctx) => `All systems nominal, ${ctx.title()}. Thank you for asking.` },
  {
    re: /^(help|what can you do|commands|abilities)\b/,
    run: () => [
      "Here is what I can do, fully offline:",
      "• Time, date, battery, network, location",
      "• Timers: “set a timer for 5 minutes”",
      "• Reminders: “remind me in 20 minutes to call mum”",
      "• Notes: “take a note …”, “read my notes”, “clear my notes”",
      "• Maths: “what is 15% of 240”, “sqrt 144 times 3”",
      "• Flashlight: “flashlight on/off”",
      "• Open apps/sites: “open YouTube”, “search for …”, “navigate to …”",
      "• Calls & texts: “call 555 1234”, “text 555 1234”",
      "• Fun: jokes, flip a coin, roll a die",
      "• Memory: “call me Tony”, “remember that …”, “what do you remember”",
      "Load the AI brain in Settings and I can also chat, explain, write and brainstorm — still on-device.",
    ].join("\n"),
  },
  { re: /^(stop|quiet|shut up|be quiet|silence|cancel|enough)( talking| speaking| it| that)?$/, run: (m, ctx) => { ctx.stopSpeaking(); return { reply: "", silent: true }; } },

  // Time & date
  { re: /what('?s| is) the time|what time is it|^time$|current time/, run: (m, ctx) => `It's ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}, ${ctx.title()}.` },
  { re: /what('?s| is) (the |today'?s )?date|what day is (it|today)|today'?s date|^date$/, run: () => `Today is ${new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.` },

  // Device status
  {
    re: /battery|power level|charge level/,
    run: async (m, ctx) => {
      if (!navigator.getBattery) return "This browser doesn't let me read the battery, I'm afraid.";
      const b = await navigator.getBattery();
      const pct = Math.round(b.level * 100);
      return `Battery is at ${pct} percent${b.charging ? " and charging" : ""}, ${ctx.title()}.${pct < 20 && !b.charging ? " I'd recommend plugging in soon." : ""}`;
    },
  },
  {
    re: /(am i|are we) (online|connected)|internet (connection|status)|network status/,
    run: () => {
      const c = navigator.connection;
      if (!navigator.onLine) return "We are offline. Don't worry — I run locally, so I'm still fully operational.";
      return `We're online${c?.effectiveType ? ` on a ${c.effectiveType.toUpperCase()}-class connection` : ""}.`;
    },
  },
  {
    re: /where am i|my location|current location|coordinates/,
    run: () => new Promise((resolve) => {
      if (!navigator.geolocation) return resolve("Location isn't available on this device.");
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const { latitude: la, longitude: lo, accuracy } = p.coords;
          resolve({ reply: `You're at ${la.toFixed(5)}, ${lo.toFixed(5)} (±${Math.round(accuracy)} m).`, link: { href: `https://maps.google.com/?q=${la},${lo}`, text: "Open in Maps" } });
        },
        () => resolve("I couldn't get your location. Please allow location access."),
        { enableHighAccuracy: true, timeout: 12000 },
      );
    }),
  },

  // Flashlight
  {
    re: /(flash ?light|torch)\s*(on|off)?|turn (on|off) (the )?(flash ?light|torch)/,
    run: async (m, ctx) => {
      const on = !/off/.test(m[0]) && !(torchStream && !/on/.test(m[0]));
      try {
        const ok = await torch(on);
        if (!ok) return "This device or browser doesn't expose flashlight control, unfortunately.";
        return on ? `Flashlight on, ${ctx.title()}.` : "Flashlight off.";
      } catch { return "I need camera permission to control the flashlight."; }
    },
  },

  // Timers & reminders
  {
    re: /(set |start )?(a |an )?timer (for )?(.+)|(.+) timer$/,
    run: (m, ctx) => {
      const ms = parseDuration(m[0]);
      if (!ms) return null;
      schedule(ms, humanMs(ms), ctx, "timer");
      ctx.askNotify();
      return `Timer set for ${humanMs(ms)}. Keep me open and I'll let you know.`;
    },
  },
  {
    re: /remind me (in (.+?) )?to (.+?)(?: in (.+))?$/,
    run: (m, ctx) => {
      const ms = parseDuration(m[2] || m[4] || "");
      const what = m[3].replace(/\s+in\s+.+$/, "");
      if (!ms) return `When should I remind you? Try “remind me in 10 minutes to ${what}”.`;
      schedule(ms, what, ctx, "reminder");
      ctx.askNotify();
      return `I'll remind you to ${what} in ${humanMs(ms)}, ${ctx.title()}.`;
    },
  },
  {
    re: /(cancel|stop|clear) (all )?(the )?(timers?|reminders?)/,
    run: () => { const n = active.size; active.forEach((v) => clearTimeout(v.t)); active.clear(); return n ? `Cancelled ${n} timer${n > 1 ? "s" : ""}.` : "There are no active timers."; },
  },
  {
    re: /(list|what are|show|any) (my )?(active )?(timers|reminders)/,
    run: () => {
      if (!active.size) return "No active timers or reminders.";
      return [...active.values()].map((v) => `• ${v.kind === "timer" ? "Timer" : "Reminder"}: ${v.label} — ${humanMs(v.due - Date.now())} left`).join("\n");
    },
  },

  // Notes
  {
    re: /^(take a note|note|make a note|write down|add a note)[:,]?\s+(that\s+)?(.+)/,
    run: (m) => { const notes = store.get("notes", []); notes.push({ text: m[3], at: Date.now() }); store.set("notes", notes); return `Noted: “${m[3]}”. You have ${notes.length} note${notes.length > 1 ? "s" : ""}.`; },
  },
  {
    re: /(read|show|list|what are) (me )?(my )?notes/,
    run: () => {
      const notes = store.get("notes", []);
      if (!notes.length) return "You have no notes yet. Say “take a note” followed by anything.";
      return notes.map((n, i) => `${i + 1}. ${n.text}`).join("\n");
    },
  },
  { re: /(clear|delete|erase) (all )?(my )?notes/, run: () => { store.set("notes", []); return "All notes erased."; } },
  {
    re: /(delete|remove) note (number )?(\d+)/,
    run: (m) => { const notes = store.get("notes", []); const i = +m[3] - 1; if (!notes[i]) return "There's no note with that number."; const [n] = notes.splice(i, 1); store.set("notes", notes); return `Deleted note: “${n.text}”.`; },
  },

  // Memory about the user
  {
    re: /^(call me|my name is|i am called|i'm called)\s+(.+?)[.!]*$/,
    run: (m, ctx) => { const name = m[2].replace(/^\w/, (c) => c.toUpperCase()); ctx.settings.userName = name; ctx.saveSettings(); return `Very well. I'll remember you as ${name}.`; },
  },
  {
    re: /^remember( that)? (.+)/,
    run: (m) => { const mem = store.get("memories", []); mem.push(m[2]); store.set("memories", mem); return "I'll remember that."; },
  },
  {
    re: /what do you (remember|know about me)/,
    run: (m, ctx) => {
      const mem = store.get("memories", []);
      const name = ctx.settings.userName ? `Your name is ${ctx.settings.userName}.\n` : "";
      return mem.length || name ? name + mem.map((x) => `• ${x}`).join("\n") : "I don't have anything stored about you yet.";
    },
  },
  { re: /forget everything|clear (your )?memory/, run: () => { store.set("memories", []); return "Memory wiped."; } },

  // Phone actions
  {
    re: /^(call|dial|phone)\s+([+\d][\d\s\-()]{2,})$/,
    run: (m) => { const n = m[2].replace(/[^\d+]/g, ""); return { reply: `Calling ${n}.`, open: `tel:${n}` }; },
  },
  {
    re: /^(text|sms|message)\s+([+\d][\d\s\-()]{2,}?)(?:\s+(?:saying|that)\s+(.+))?$/,
    run: (m) => { const n = m[2].replace(/[^\d+]/g, ""); return { reply: `Opening a message to ${n}.`, open: `sms:${n}${m[3] ? `?body=${encodeURIComponent(m[3])}` : ""}` }; },
  },
  {
    re: /^(email|mail)\s+(\S+@\S+)(?:\s+(?:about|subject)\s+(.+))?$/,
    run: (m) => ({ reply: `Drafting an email to ${m[2]}.`, open: `mailto:${m[2]}${m[3] ? `?subject=${encodeURIComponent(m[3])}` : ""}` }),
  },
  {
    re: /^(navigate|directions|take me|drive) to (.+)/,
    run: (m) => ({ reply: `Plotting a course to ${m[2]}.`, open: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(m[2])}` }),
  },
  {
    re: /^(search( the web)?( for)?|google|look up)\s+(.+)/,
    run: (m) => ({ reply: `Searching for “${m[4]}”.`, open: `https://www.google.com/search?q=${encodeURIComponent(m[4])}` }),
  },
  {
    re: /^(play|youtube)\s+(.+?)( on youtube)?$/,
    run: (m) => ({ reply: `Finding “${m[2]}” on YouTube.`, open: `https://www.youtube.com/results?search_query=${encodeURIComponent(m[2])}` }),
  },
  {
    re: /^(open|launch|start|go to)\s+(.+)/,
    run: (m) => {
      const k = m[2].replace(/^the\s+/, "").replace(/\s+(app|website|site)$/, "").trim();
      if (SITES[k]) return { reply: `Opening ${k}.`, open: SITES[k] };
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(k)) return { reply: `Opening ${k}.`, open: `https://${k}` };
      return null;
    },
  },

  // Fun
  { re: /joke|make me laugh/, run: () => pick(JOKES) },
  { re: /flip a coin|coin (flip|toss)|heads or tails/, run: () => `It's ${Math.random() < 0.5 ? "heads" : "tails"}.` },
  { re: /roll (a |the )?(die|dice)/, run: () => `You rolled a ${1 + Math.floor(Math.random() * 6)}.` },
  {
    re: /(random number|pick a number)(?: between (\d+) and (\d+))?/,
    run: (m) => { const a = +(m[2] ?? 1), b = +(m[3] ?? 100); return `${Math.min(a, b) + Math.floor(Math.random() * (Math.abs(b - a) + 1))}.`; },
  },
];

const PREFIX = /^(hey |ok |okay )?jarvis[,!.\s]*/;

export async function handleLocal(raw, ctx) {
  const text = raw.toLowerCase().trim().replace(PREFIX, "").replace(/[?]+$/, "").replace(/\bplease\b/g, "").replace(/\s+/g, " ").trim();
  if (!text) return { reply: `Yes, ${ctx.title()}?` };

  // Maths: "what is 2+2", "calculate 5 times 7", or a bare expression
  const mathMatch = text.match(/^(what('?s| is)|calculate|compute|how much is|solve)\s+(.+)$/);
  const mathExpr = mathMatch ? mathMatch[3] : text;
  if (/\d/.test(mathExpr)) {
    const v = calculate(mathExpr);
    if (v !== null && /[-+*/^%√]|plus|minus|times|divided|over|power|squared|cubed|sqrt|root|percent|mod/.test(mathExpr)) {
      return { reply: `That's ${v.toLocaleString(undefined, { maximumFractionDigits: 10 })}.` };
    }
  }

  for (const skill of SKILLS) {
    const m = text.match(skill.re);
    if (!m) continue;
    const out = await skill.run(m, ctx);
    if (out == null) continue;
    return typeof out === "string" ? { reply: out } : out;
  }
  return null;
}
