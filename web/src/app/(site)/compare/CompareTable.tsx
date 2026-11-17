"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type CompareRow = {
  slug: string; name: string; isSample: boolean; panelType: string;
  live: number | null; movies: number | null; series: number | null;
  quality: string[]; devices: string[]; creditSystem: string; price: number;
  trial: boolean; trialHours: number | null; plans: number[];
};
type SortKey = "name" | "live" | "movies" | "series" | "price";

const fmt = (n: number | null) => (n === null ? <span className="text-silver-600">Unverified</span> : n.toLocaleString("en-US"));

export function CompareTable({ rows, currency }: { rows: CompareRow[]; currency: string }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [device, setDevice] = useState("");
  const [plan, setPlan] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [trialOnly, setTrialOnly] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "price", dir: 1 });

  const types = useMemo(() => [...new Set(rows.map((r) => r.panelType))].sort(), [rows]);
  const devices = useMemo(() => [...new Set(rows.flatMap((r) => r.devices))].sort(), [rows]);
  const plans = useMemo(() => [...new Set(rows.flatMap((r) => r.plans))].sort((a, b) => a - b), [rows]);
  const money = (m: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(m / 100);

  const filtered = useMemo(() => {
    const max = maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null;
    return rows
      .filter((r) => !q || `${r.name} ${r.panelType} ${r.devices.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
      .filter((r) => !type || r.panelType === type)
      .filter((r) => !device || r.devices.includes(device))
      .filter((r) => !plan || r.plans.includes(Number(plan)))
      .filter((r) => max === null || r.price <= max)
      .filter((r) => !trialOnly || r.trial)
      .sort((a, b) => {
        const av = a[sort.k], bv = b[sort.k];
        if (av === null) return 1; if (bv === null) return -1;
        return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir;
      });
  }, [rows, q, type, device, plan, maxPrice, trialOnly, sort]);

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="inline-flex items-center gap-1 uppercase hover:text-white" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {children}<span className="text-crimson">{sort.k === k ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  return (
    <div>
      <div className="glass mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input lg:col-span-2" placeholder="Search panels, devices…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search panels" />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Panel type"><option value="">All types</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="input" value={device} onChange={(e) => setDevice(e.target.value)} aria-label="Device"><option value="">Any device</option>{devices.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan length"><option value="">Any plan</option>{plans.map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}</select>
        <input className="input" type="number" min="0" step="0.01" placeholder={`Max price (${currency})`} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label="Maximum price per credit" />
        <label className="flex items-center gap-2 text-sm text-silver-400 lg:col-span-6"><input type="checkbox" checked={trialOnly} onChange={(e) => setTrialOnly(e.target.checked)} className="accent-crimson" /> Trial available only</label>
      </div>
      <p className="mb-3 text-sm text-silver-400" aria-live="polite">{filtered.length} of {rows.length} panels</p>
      <div className="glass overflow-x-auto">
        <table className="table-x min-w-[1100px]">
          <thead><tr>
            <Th k="name">Panel</Th><Th k="live">Live</Th><Th k="movies">Movies/VOD</Th><Th k="series">Series</Th>
            <th>Quality</th><th>Devices</th><th>Credit system</th><Th k="price">Price/credit</Th><th>Trial</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.slug}>
                <td className="font-semibold"><Link href={`/panels/${r.slug}`} className="hover:text-crimson-300">{r.name}</Link><div className="text-xs font-normal text-silver-600">{r.panelType}{r.isSample && " · sample data"}</div></td>
                <td>{fmt(r.live)}</td><td>{fmt(r.movies)}</td><td>{fmt(r.series)}</td>
                <td>{r.quality.join(", ") || "—"}</td>
                <td className="max-w-[220px] text-xs text-silver-400">{r.devices.join(", ")}</td>
                <td className="text-xs text-silver-400">{r.creditSystem}</td>
                <td className="font-display font-bold text-crimson-300">{money(r.price)}</td>
                <td>{r.trial ? <span className="text-emerald-300">Yes{r.trialHours ? ` · ${r.trialHours}h` : ""}</span> : <span className="text-silver-600">No</span>}</td>
                <td><div className="flex gap-2"><Link href={`/panels/${r.slug}`} className="btn-ghost btn-sm">Details</Link><Link href={`/contact?panel=${r.slug}&kind=SALES`} className="btn-primary btn-sm">Sales</Link></div></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={10} className="py-10 text-center text-silver-400">No panels match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
