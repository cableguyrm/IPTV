import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPanelBySlug } from "@/lib/queries";
import { getDisplayCurrency, getRates, priceIn, formatMoney } from "@/lib/currency";
import { PanelLogo } from "@/components/PanelLogo";
import { SampleBadge } from "@/components/ui";
import { fmtNum } from "@/lib/utils";
import { getSettings, waLink } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPanelBySlug((await params).slug);
  return p ? { title: `${p.name} — Reseller Panel`, description: p.tagline ?? p.description ?? undefined } : { title: "Panel not found" };
}

export default async function PanelDetail({ params }: { params: Promise<{ slug: string }> }) {
  const panel = await getPanelBySlug((await params).slug);
  if (!panel) notFound();
  const [currency, rates, s] = await Promise.all([getDisplayCurrency(), getRates(), getSettings()]);
  const rows: [string, React.ReactNode][] = [
    ["Panel type", panel.panelType],
    ["Live channels", panel.statsVerified ? fmtNum(panel.liveChannels) : "Not verified"],
    ["Movies / VOD", panel.statsVerified ? fmtNum(panel.movies) : "Not verified"],
    ["TV series", panel.statsVerified ? fmtNum(panel.series) : "Not verified"],
    ["Streaming quality", panel.streamQuality.join(" · ") || "—"],
    ["Credit system", panel.creditSystem ?? `${panel.creditsPerMonth} credit(s) per month`],
    ["Minimum credit purchase", `${panel.minCreditPurchase} credits`],
    ["Trial", panel.trialAvailable ? `Available${panel.trialHours ? ` (${panel.trialHours} hours)` : ""}` : "Not available"],
  ];
  return (
    <section className="container-x py-14">
      <nav className="mb-6 text-sm text-silver-600" aria-label="Breadcrumb"><Link href="/panels" className="hover:text-white">Panels</Link> / <span className="text-silver-400">{panel.name}</span></nav>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-8">
            <div className="flex flex-wrap items-center gap-4">
              <PanelLogo panel={panel} size={72} />
              <div>
                <h1 className="h-display text-3xl"><span className="metal">{panel.name}</span></h1>
                <p className="text-silver-400">{panel.tagline}</p>
              </div>
              {panel.isSample && <SampleBadge />}
            </div>
            {panel.description && <p className="mt-6 whitespace-pre-line text-silver-200">{panel.description}</p>}
            {panel.features.length > 0 && (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {panel.features.map((f) => <li key={f} className="flex items-center gap-2 text-sm"><span className="text-crimson">◆</span>{f}</li>)}
              </ul>
            )}
          </div>
          <div className="glass overflow-hidden">
            <table className="table-x"><tbody>
              {rows.map(([k, v]) => <tr key={k}><th scope="row" className="w-1/3">{k}</th><td>{v}</td></tr>)}
              <tr><th scope="row">Supported devices</th><td><div className="flex flex-wrap gap-1.5">{panel.devices.map((d) => <span key={d} className="badge border-white/15 bg-white/5 normal-case tracking-normal text-silver-200">{d}</span>)}</div></td></tr>
            </tbody></table>
          </div>
          <div className="glass p-6">
            <h2 className="font-display text-lg font-bold uppercase">Subscription plans</h2>
            {panel.plans.length ? (
              <div className="mt-4 overflow-x-auto"><table className="table-x">
                <thead><tr><th>Plan</th><th>Duration</th><th>Credit cost</th><th>Connections</th><th>Suggested retail</th></tr></thead>
                <tbody>{panel.plans.map((pl) => (
                  <tr key={pl.id}><td className="font-semibold">{pl.name}</td><td>{pl.durationMonths} mo</td><td>{pl.creditCost}</td><td>{pl.maxConnections}</td>
                    <td>{pl.suggestedRetailCents ? formatMoney(priceIn(pl.suggestedRetailCents, currency, rates), currency) : "—"}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="mt-3 text-sm text-silver-400">No plans configured yet.</p>}
          </div>
          {panel.licenseNote && <p className="text-xs text-silver-600">Licensing: {panel.licenseNote}</p>}
        </div>
        <aside className="space-y-4">
          <div className="glass sticky top-24 p-6">
            <p className="text-xs uppercase tracking-wider text-silver-600">Reseller price from</p>
            <p className="font-display text-4xl font-black red-text">{formatMoney(priceIn(panel.startingPriceCents, currency, rates), currency)}</p>
            <p className="text-xs text-silver-600">per credit · {currency}</p>
            <div className="mt-6 grid gap-2">
              <Link href="/pricing" className="btn-primary">Buy credits</Link>
              <Link href={`/contact?panel=${panel.slug}&kind=SALES`} className="btn-ghost">Contact sales</Link>
              {panel.trialAvailable && <Link href={`/trial?panel=${panel.slug}`} className="btn-ghost">Request a trial</Link>}
              <a href={waLink(s.contact.whatsapp, `Hi, I'm interested in ${panel.name}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost">WhatsApp us</a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
