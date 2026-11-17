import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SampleBadge, EmptyState } from "@/components/ui";
import { getCreditPackages } from "@/lib/queries";
import { getDisplayCurrency, packagePrice, formatMoney, CURRENCIES } from "@/lib/currency";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Wholesale Credit Pricing", description: "Wholesale reseller credit packages in AED, PHP and USD." };
export const dynamic = "force-dynamic";

export default async function Pricing() {
  const [packages, currency, s] = await Promise.all([getCreditPackages(), getDisplayCurrency(), getSettings()]);
  const rates = s.currency.rates;
  return (
    <>
      <PageHero eyebrow="Wholesale" title="Reseller Credit Packages" sub={`Showing prices in ${currency}. Use the currency selector in the menu to switch between AED, PHP and USD.`} />
      <section className="container-x py-14">
        {!packages.length && <EmptyState title="No packages configured" />}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => {
            const pr = p.isCustom ? null : packagePrice(p, currency, rates);
            return (
              <article key={p.id} className={`glass glass-hover relative flex flex-col p-7 ${p.highlight ? "border-crimson/60 shadow-glow" : ""}`}>
                {p.highlight && <span className="badge absolute -top-3 left-6 border-crimson bg-crimson text-white">Most popular</span>}
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-xl font-bold uppercase">{p.name}</h2>
                  {p.isSample && <SampleBadge />}
                </div>
                <p className="mt-4 font-display text-5xl font-black">{p.isCustom ? `${p.credits}+` : p.credits}<span className="ml-2 text-base font-normal text-silver-400">credits</span></p>
                {pr ? (
                  <>
                    <p className="mt-4 font-display text-3xl font-bold red-text">{formatMoney(pr.minor, currency)}</p>
                    <p className="text-xs text-silver-600">{formatMoney(Math.round(pr.minor / p.credits), currency)} per credit{pr.converted ? ` · converted from USD at ${rates[currency]}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-silver-600">
                      {CURRENCIES.filter((c) => c !== currency).map((c) => <span key={c}>{formatMoney(packagePrice(p, c, rates).minor, c)}</span>)}
                    </div>
                  </>
                ) : <p className="mt-4 font-display text-2xl font-bold red-text">Custom quote</p>}
                {p.terms && <p className="mt-5 flex-1 text-sm text-silver-400">{p.terms}</p>}
                <div className="mt-6 grid gap-2">
                  {p.isCustom ? (
                    <Link href="/contact?kind=WHOLESALE" className="btn-primary">Request a quote</Link>
                  ) : (
                    <>
                      <Link href={`/dashboard/credits/checkout/${p.id}`} className="btn-primary">Purchase</Link>
                      <Link href={`/contact?kind=SALES&subject=${encodeURIComponent(`${p.name} — ${p.credits} credits`)}`} className="btn-ghost">Ask a question</Link>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-10 text-center text-xs text-silver-600">Exchange rates last updated {s.currency.ratesUpdatedAt}. Converted prices are rounded to the nearest minor unit; the amount shown at checkout is the amount charged.</p>
      </section>
    </>
  );
}
