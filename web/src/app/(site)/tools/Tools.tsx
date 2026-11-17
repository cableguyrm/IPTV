"use client";
import { useMemo, useRef, useState } from "react";

function Card({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="glass scroll-mt-24 p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
      {sub && <p className="mt-1 text-sm text-silver-400">{sub}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
const Out = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-[10px] uppercase tracking-wider text-silver-600">{label}</p><p className="mt-1 break-all font-display text-lg font-bold">{value}</p></div>
);

/* ---------------- M3U / Xtream ---------------- */
type Xtream = { server: string; username: string; password: string; type?: string; output?: string };
function parseXtream(input: string): Xtream | null {
  try {
    const u = new URL(input.trim());
    const username = u.searchParams.get("username"); const password = u.searchParams.get("password");
    if (username && password) return { server: `${u.protocol}//${u.host}`, username, password, type: u.searchParams.get("type") ?? undefined, output: u.searchParams.get("output") ?? undefined };
    const m = u.pathname.match(/^\/(?:live|movie|series)?\/?([^/]+)\/([^/]+)\/\d+/);
    if (m) return { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(m[1]), password: decodeURIComponent(m[2]) };
  } catch { /* not a URL */ }
  return null;
}
function parseM3u(text: string) {
  const lines = text.split(/\r?\n/);
  if (!lines[0]?.trim().startsWith("#EXTM3U")) return null;
  const groups = new Map<string, number>(); let entries = 0; let withLogo = 0; let withEpg = 0;
  const epgUrl = lines[0].match(/(?:x-tvg-url|url-tvg)="([^"]+)"/)?.[1];
  for (const l of lines) {
    if (!l.startsWith("#EXTINF")) continue;
    entries++;
    const g = l.match(/group-title="([^"]*)"/)?.[1] || "Ungrouped";
    groups.set(g, (groups.get(g) ?? 0) + 1);
    if (/tvg-logo="[^"]+"/.test(l)) withLogo++;
    if (/tvg-id="[^"]+"/.test(l)) withEpg++;
  }
  return { entries, groups: [...groups.entries()].sort((a, b) => b[1] - a[1]), withLogo, withEpg, epgUrl };
}

export function M3uTool() {
  const [url, setUrl] = useState(""); const [text, setText] = useState(""); const [reveal, setReveal] = useState(false);
  const x = useMemo(() => (url ? parseXtream(url) : null), [url]);
  const m = useMemo(() => (text ? parseM3u(text) : null), [text]);
  const mask = (s: string) => (reveal ? s : "•".repeat(Math.min(s.length, 10)));
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Card id="m3u" title="M3U URL & Xtream parser" sub="For accounts you are authorised to use. Parsing happens 100% in your browser — nothing is uploaded, stored or logged.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label className="label" htmlFor="m3u-url">M3U / Xtream URL</label>
          <input id="m3u-url" className="input font-mono" autoComplete="off" spellCheck={false} placeholder="http://host:port/get.php?username=…&password=…&type=m3u_plus" value={url} onChange={(e) => setUrl(e.target.value)} />
          {url && !x && <p className="mt-2 text-sm text-crimson-300">Couldn&apos;t find Xtream credentials in that URL.</p>}
          {x && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Out label="Server URL" value={x.server} />
              <Out label="Username" value={mask(x.username)} />
              <Out label="Password" value={mask(x.password)} />
              <Out label="Playlist type" value={x.type ?? "—"} />
              <div className="sm:col-span-2"><Out label="Player API endpoint" value={`${x.server}/player_api.php?username=${mask(x.username)}&password=${mask(x.password)}`} /></div>
              <div className="sm:col-span-2"><Out label="EPG (XMLTV)" value={`${x.server}/xmltv.php?username=${mask(x.username)}&password=${mask(x.password)}`} /></div>
              <label className="flex items-center gap-2 text-sm text-silver-400"><input type="checkbox" className="accent-crimson" checked={reveal} onChange={(e) => setReveal(e.target.checked)} /> Reveal credentials</label>
              <button className="btn-ghost btn-sm" onClick={() => { setUrl(""); setReveal(false); }}>Clear</button>
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="m3u-text">Or analyse playlist contents</label>
          <textarea id="m3u-text" className="input h-32 font-mono text-xs" spellCheck={false} placeholder="#EXTM3U …" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <input ref={fileRef} type="file" accept=".m3u,.m3u8,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f && f.size < 30_000_000) setText(await f.text()); }} />
            <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Load local .m3u file</button>
            {text && <button className="btn-ghost btn-sm" onClick={() => setText("")}>Clear</button>}
          </div>
          {text && !m && <p className="mt-2 text-sm text-crimson-300">Not a valid M3U (must start with #EXTM3U).</p>}
          {m && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3"><Out label="Entries" value={m.entries.toLocaleString()} /><Out label="With logo" value={m.withLogo.toLocaleString()} /><Out label="With EPG id" value={m.withEpg.toLocaleString()} /></div>
              {m.epgUrl && <p className="text-xs text-silver-400">EPG source declared in header.</p>}
              <div className="max-h-48 overflow-auto rounded-xl border border-white/10">
                <table className="table-x"><thead><tr><th>Group</th><th>Entries</th></tr></thead><tbody>{m.groups.slice(0, 100).map(([g, n]) => <tr key={g}><td>{g}</td><td>{n}</td></tr>)}</tbody></table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Expiration ---------------- */
export function ExpiryCalc() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today); const [months, setMonths] = useState(1); const [extraDays, setExtraDays] = useState(0);
  const end = useMemo(() => {
    const d = new Date(start + "T00:00:00Z"); if (isNaN(+d)) return null;
    const day = d.getUTCDate(); d.setUTCMonth(d.getUTCMonth() + months); if (d.getUTCDate() < day) d.setUTCDate(0);
    d.setUTCDate(d.getUTCDate() + extraDays); return d;
  }, [start, months, extraDays]);
  const left = end ? Math.ceil((+end - Date.now()) / 86_400_000) : null;
  return (
    <Card id="expiry" title="Subscription expiration calculator">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="ex-start">Activation date</label><input id="ex-start" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label" htmlFor="ex-m">Months</label><select id="ex-m" className="input" value={months} onChange={(e) => setMonths(+e.target.value)}>{[1, 2, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
        <div><label className="label" htmlFor="ex-d">Bonus days</label><input id="ex-d" type="number" min={0} max={365} className="input" value={extraDays} onChange={(e) => setExtraDays(Math.max(0, +e.target.value || 0))} /></div>
      </div>
      {end && <div className="mt-4 grid grid-cols-2 gap-3"><Out label="Expires on" value={end.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} /><Out label="Days remaining" value={left! < 0 ? `Expired ${-left!}d ago` : left} /></div>}
    </Card>
  );
}

/* ---------------- Credit usage ---------------- */
export function CreditCalc({ panels }: { panels: { name: string; creditsPerMonth: number; priceCents: number }[] }) {
  const [idx, setIdx] = useState(0); const [customers, setCustomers] = useState(20); const [months, setMonths] = useState(1); const [balance, setBalance] = useState(50);
  const p = panels[idx] ?? { name: "Custom", creditsPerMonth: 1, priceCents: 0 };
  const needed = customers * months * p.creditsPerMonth;
  return (
    <Card id="credits" title="Credit usage calculator" sub="Estimate credits needed (panels with discounted long plans may cost less).">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="cc-p">Panel</label><select id="cc-p" className="input" value={idx} onChange={(e) => setIdx(+e.target.value)}>{panels.map((pp, i) => <option key={pp.name} value={i}>{pp.name} ({pp.creditsPerMonth}/mo)</option>)}</select></div>
        <div><label className="label" htmlFor="cc-c">Customers</label><input id="cc-c" type="number" min={0} className="input" value={customers} onChange={(e) => setCustomers(Math.max(0, +e.target.value || 0))} /></div>
        <div><label className="label" htmlFor="cc-m">Months each</label><input id="cc-m" type="number" min={1} max={36} className="input" value={months} onChange={(e) => setMonths(Math.max(1, +e.target.value || 1))} /></div>
        <div><label className="label" htmlFor="cc-b">Current balance</label><input id="cc-b" type="number" min={0} className="input" value={balance} onChange={(e) => setBalance(Math.max(0, +e.target.value || 0))} /></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Out label="Credits needed" value={needed} />
        <Out label="Shortfall" value={Math.max(0, needed - balance)} />
        <Out label="Est. cost (USD)" value={`$${((needed * p.priceCents) / 100).toFixed(2)}`} />
      </div>
    </Card>
  );
}

/* ---------------- Profit ---------------- */
export function ProfitCalc() {
  const [cost, setCost] = useState(4.5); const [credits, setCredits] = useState(1); const [retail, setRetail] = useState(15); const [customers, setCustomers] = useState(30); const [fees, setFees] = useState(3);
  const unitCost = cost * credits; const net = retail * (1 - fees / 100) - unitCost;
  return (
    <Card id="profit" title="Reseller profit calculator">
      <div className="grid gap-3 sm:grid-cols-5">
        <div><label className="label" htmlFor="pc-c">Cost / credit</label><input id="pc-c" type="number" step="0.01" min={0} className="input" value={cost} onChange={(e) => setCost(+e.target.value || 0)} /></div>
        <div><label className="label" htmlFor="pc-k">Credits / sale</label><input id="pc-k" type="number" min={1} className="input" value={credits} onChange={(e) => setCredits(Math.max(1, +e.target.value || 1))} /></div>
        <div><label className="label" htmlFor="pc-r">Retail price</label><input id="pc-r" type="number" step="0.01" min={0} className="input" value={retail} onChange={(e) => setRetail(+e.target.value || 0)} /></div>
        <div><label className="label" htmlFor="pc-n">Sales / month</label><input id="pc-n" type="number" min={0} className="input" value={customers} onChange={(e) => setCustomers(Math.max(0, +e.target.value || 0))} /></div>
        <div><label className="label" htmlFor="pc-f">Payment fees %</label><input id="pc-f" type="number" step="0.1" min={0} max={50} className="input" value={fees} onChange={(e) => setFees(+e.target.value || 0)} /></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Out label="Profit / sale" value={net.toFixed(2)} />
        <Out label="Margin" value={retail ? `${((net / retail) * 100).toFixed(1)}%` : "—"} />
        <Out label="Monthly profit" value={(net * customers).toFixed(2)} />
        <Out label="Yearly profit" value={(net * customers * 12).toFixed(2)} />
      </div>
      <p className="mt-3 text-xs text-silver-600">Amounts are in whatever currency you enter. Estimates only.</p>
    </Card>
  );
}

/* ---------------- Speed test ---------------- */
export function SpeedTest() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [res, setRes] = useState<{ ping: number; down: number; up: number } | null>(null);
  async function run() {
    setState("running"); setRes(null);
    try {
      const pings: number[] = [];
      for (let i = 0; i < 5; i++) { const t = performance.now(); await fetch(`/api/speedtest?bytes=0&r=${Math.random()}`, { cache: "no-store" }); pings.push(performance.now() - t); }
      let bytes = 0; const t0 = performance.now();
      for (let i = 0; i < 4; i++) { const r = await fetch(`/api/speedtest?bytes=5000000&r=${Math.random()}`, { cache: "no-store" }); bytes += (await r.arrayBuffer()).byteLength; }
      const down = (bytes * 8) / ((performance.now() - t0) / 1000) / 1e6;
      const payload = new Uint8Array(2_000_000); const t1 = performance.now();
      for (let i = 0; i < 2; i++) await fetch("/api/speedtest", { method: "POST", body: payload, cache: "no-store" });
      const up = (payload.byteLength * 2 * 8) / ((performance.now() - t1) / 1000) / 1e6;
      setRes({ ping: Math.min(...pings), down, up }); setState("done");
    } catch { setState("error"); }
  }
  const rec = res ? (res.down >= 25 ? "Great for 4K streaming" : res.down >= 10 ? "Good for Full HD" : res.down >= 5 ? "OK for HD" : "May struggle — try SD or a wired connection") : null;
  return (
    <Card id="speed" title="Internet speed test" sub="Measures throughput between your device and our server. For an independent test you can also use fast.com or speedtest.net.">
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn-primary" onClick={run} disabled={state === "running"}>{state === "running" ? "Testing…" : "Start test"}</button>
        {state === "error" && <p className="text-sm text-crimson-300">Test failed. Check your connection and try again.</p>}
      </div>
      {res && (
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Out label="Ping" value={`${res.ping.toFixed(0)} ms`} /><Out label="Download" value={`${res.down.toFixed(1)} Mbps`} /><Out label="Upload" value={`${res.up.toFixed(1)} Mbps`} /><Out label="Verdict" value={rec} />
        </div>
      )}
      <p className="mt-4 text-xs text-silver-600">Guide: SD ≈ 3 Mbps · HD ≈ 5 Mbps · Full HD ≈ 10 Mbps · 4K ≈ 25 Mbps per stream.</p>
    </Card>
  );
}

/* ---------------- Device guide ---------------- */
const DEVICES: [string, string, string, string][] = [
  ["Android TV / Google TV", "Native app or any Xtream/M3U compatible player from Play Store", "Xtream API, M3U", "Excellent"],
  ["Amazon Fire TV / Stick", "Sideload via Downloader or install an approved player", "Xtream API, M3U", "Excellent"],
  ["Samsung Tizen / LG webOS", "Player apps from the TV app store", "M3U, Xtream (app dependent)", "Good"],
  ["Apple TV / iPhone / iPad", "Players from the App Store", "Xtream API, M3U", "Good"],
  ["Android phone / tablet", "Players from Play Store", "Xtream API, M3U", "Excellent"],
  ["MAG boxes", "Portal URL + MAC registration by the provider", "Stalker portal", "Good (panel dependent)"],
  ["Enigma2 receivers", "Plugin or bouquet import", "M3U / Enigma2 script", "Panel dependent"],
  ["Windows / macOS", "Desktop media players supporting M3U", "M3U, Xtream", "Good"],
  ["Web browser", "Provider web player if available", "HLS", "Panel dependent"],
];
export function DeviceGuide() {
  return (
    <Card id="devices" title="Device compatibility guide" sub="General guidance — always check the panel's supported device list before selling.">
      <div className="overflow-x-auto"><table className="table-x min-w-[700px]">
        <thead><tr><th>Device</th><th>Setup method</th><th>Formats</th><th>Compatibility</th></tr></thead>
        <tbody>{DEVICES.map(([d, s, f, c]) => <tr key={d}><td className="font-semibold">{d}</td><td className="text-silver-400">{s}</td><td>{f}</td><td>{c}</td></tr>)}</tbody>
      </table></div>
    </Card>
  );
}
