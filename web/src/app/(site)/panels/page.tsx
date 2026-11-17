import type { Metadata } from "next";
import { PageHero, EmptyState } from "@/components/ui";
import { PanelCard } from "@/components/PanelCard";
import { getActivePanels } from "@/lib/queries";
import { getDisplayCurrency, getRates, priceIn } from "@/lib/currency";
import Link from "next/link";

export const metadata: Metadata = { title: "IPTV Reseller Panels", description: "Browse IPTV reseller panels: supported devices, credit requirements, starting reseller prices and trial availability." };
export const dynamic = "force-dynamic";

export default async function PanelsPage() {
  const [panels, currency, rates] = await Promise.all([getActivePanels(), getDisplayCurrency(), getRates()]);
  return (
    <>
      <PageHero eyebrow="Marketplace" title="IPTV Reseller Panels" sub="Every panel is listed and maintained by our administrators. Content counts appear only after verification.">
        <Link href="/compare" className="btn-primary">Open comparison table</Link>
      </PageHero>
      <section className="container-x py-14">
        {panels.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {panels.map((p) => <PanelCard key={p.id} panel={p} currency={currency} price={priceIn(p.startingPriceCents, currency, rates)} />)}
          </div>
        ) : <EmptyState title="No panels available yet" />}
      </section>
    </>
  );
}
