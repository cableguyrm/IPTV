import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "About Us" };

export default async function About() {
  const s = await getSettings();
  const values = [["Authorised listings only", "We only list services the business is licensed or authorised to distribute."], ["Honest data", "Content counts are published only once verified. No invented statistics."], ["Real accounting", "Every credit movement is recorded in an auditable ledger."], ["Regional focus", "Built for the UAE and Philippine markets, with AED, PHP and USD pricing."]];
  return (
    <>
      <PageHero eyebrow="About" title={s.site.aboutTitle} />
      <section className="container-x grid gap-10 py-14 lg:grid-cols-2">
        <div className="prose-x">{s.site.aboutBody.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
          <div className="mt-6 flex gap-3"><Link href="/register" className="btn-primary">Become a reseller</Link><Link href="/contact" className="btn-ghost">Contact us</Link></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map(([t, d]) => <div key={t} className="glass glass-hover p-6"><h2 className="font-display font-bold uppercase">{t}</h2><p className="mt-2 text-sm text-silver-400">{d}</p></div>)}
        </div>
      </section>
    </>
  );
}
