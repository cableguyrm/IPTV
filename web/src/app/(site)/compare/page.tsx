import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { getPanelsWithPlans } from "@/lib/queries";
import { getDisplayCurrency, getRates, priceIn } from "@/lib/currency";
import { CompareTable, type CompareRow } from "./CompareTable";

export const metadata: Metadata = { title: "Panel Comparison", description: "Search, sort and filter IPTV reseller panels by price, device support, panel type and available plans." };
export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const [panels, currency, rates] = await Promise.all([getPanelsWithPlans(), getDisplayCurrency(), getRates()]);
  const rows: CompareRow[] = panels.map((p) => ({
    slug: p.slug, name: p.name, isSample: p.isSample, panelType: p.panelType,
    live: p.statsVerified ? p.liveChannels : null, movies: p.statsVerified ? p.movies : null, series: p.statsVerified ? p.series : null,
    quality: p.streamQuality, devices: p.devices, creditSystem: p.creditSystem ?? `${p.creditsPerMonth}/mo`,
    price: priceIn(p.startingPriceCents, currency, rates), trial: p.trialAvailable, trialHours: p.trialHours,
    plans: p.plans.map((pl) => pl.durationMonths),
  }));
  return (
    <>
      <PageHero eyebrow="Compare" title="Panel Comparison" sub="All data below comes straight from our database and is maintained by administrators. Unverified content counts are marked as such." />
      <section className="container-x py-12"><CompareTable rows={rows} currency={currency} /></section>
    </>
  );
}
