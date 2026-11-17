import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SampleBadge, EmptyState } from "@/components/ui";
import { PanelLogo } from "@/components/PanelLogo";
import { getPanelsWithPlans } from "@/lib/queries";
import { getDisplayCurrency, getRates, priceIn, formatMoney } from "@/lib/currency";

export const metadata: Metadata = { title: "Reseller Plans", description: "Subscription plans available per panel, their credit cost and suggested retail prices." };
export const dynamic = "force-dynamic";

export default async function ResellerPlans() {
  const [panels, currency, rates] = await Promise.all([getPanelsWithPlans(), getDisplayCurrency(), getRates()]);
  return (
    <>
      <PageHero eyebrow="Plans" title="Reseller Plans" sub="The subscription plans you can activate for customers on each panel, with the credits each plan consumes." />
      <section className="container-x space-y-8 py-14">
        {panels.length === 0 && <EmptyState title="No plans yet" />}
        {panels.map((p) => (
          <div key={p.id} className="glass p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><PanelLogo panel={p} size={40} /><h2 className="font-display text-xl font-bold">{p.name}</h2>{p.isSample && <SampleBadge />}</div>
              <Link href={`/panels/${p.slug}`} className="btn-ghost btn-sm">Panel details</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {p.plans.map((pl) => {
                const cost = pl.creditCost * p.startingPriceCents;
                return (
                  <div key={pl.id} className="rounded-xl border border-white/10 bg-black/30 p-5 transition hover:border-crimson/50 hover:shadow-glow">
                    <p className="font-display text-lg font-bold uppercase">{pl.name}</p>
                    <p className="mt-1 text-sm text-silver-400">{pl.maxConnections} connection{pl.maxConnections > 1 ? "s" : ""}</p>
                    <p className="mt-4 font-display text-3xl font-black">{pl.creditCost}<span className="ml-1 text-sm font-normal text-silver-400">credits</span></p>
                    <p className="mt-1 text-xs text-silver-600">≈ {formatMoney(priceIn(cost, currency, rates), currency)} wholesale at starting rate</p>
                    {pl.suggestedRetailCents && <p className="mt-1 text-xs text-silver-400">Suggested retail: {formatMoney(priceIn(pl.suggestedRetailCents, currency, rates), currency)}</p>}
                  </div>
                );
              })}
              {!p.plans.length && <p className="text-sm text-silver-400">No plans configured.</p>}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
