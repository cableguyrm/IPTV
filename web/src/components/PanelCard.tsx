import Link from "next/link";
import type { Panel } from "@/db/schema";
import { fmtNum } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { SampleBadge } from "./ui";
import { PanelLogo } from "./PanelLogo";

export function PanelCard({ panel, price, currency }: { panel: Panel; price: number; currency: string }) {
  const stats = [
    ["Live", panel.liveChannels],
    ["Movies", panel.movies],
    ["Series", panel.series],
  ] as const;
  return (
    <article className="glass glass-hover group relative flex flex-col overflow-hidden p-6">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl transition group-hover:opacity-40" style={{ background: panel.accentColor ?? "#DC143C" }} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PanelLogo panel={panel} />
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">{panel.name}</h3>
            <p className="text-xs text-silver-400">{panel.tagline ?? panel.panelType}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {panel.isSample && <SampleBadge />}
          {panel.trialAvailable && <span className="badge border-emerald-400/30 bg-emerald-400/10 text-emerald-300">Trial{panel.trialHours ? ` ${panel.trialHours}h` : ""}</span>}
        </div>
      </div>

      <dl className="relative mt-5 grid grid-cols-3 gap-2 text-center">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/5 bg-black/30 px-2 py-2.5">
            <dt className="text-[10px] uppercase tracking-wider text-silver-600">{k}</dt>
            <dd className="mt-0.5 font-display text-sm font-bold">{panel.statsVerified ? fmtNum(v) : <span className="text-silver-600" title="Not yet verified">Unverified</span>}</dd>
          </div>
        ))}
      </dl>

      <div className="relative mt-4 space-y-2 text-sm">
        <p className="text-silver-400"><span className="text-silver-600">Devices: </span>{panel.devices.slice(0, 5).join(", ") || "—"}{panel.devices.length > 5 && ` +${panel.devices.length - 5}`}</p>
        <p className="text-silver-400"><span className="text-silver-600">Credits: </span>{panel.creditSystem ?? `${panel.creditsPerMonth} credit / month`} · min {panel.minCreditPurchase}</p>
      </div>

      <div className="relative mt-5 flex items-end justify-between border-t border-white/5 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-silver-600">Reseller from</p>
          <p className="font-display text-2xl font-black red-text">{formatMoney(price, currency)}</p>
        </div>
        <p className="text-right text-[11px] text-silver-600">per credit</p>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <Link href={`/panels/${panel.slug}`} className="btn-ghost btn-sm">View Details</Link>
        <Link href={`/contact?panel=${panel.slug}&kind=SALES`} className="btn-primary btn-sm">Contact Sales</Link>
      </div>
    </article>
  );
}
