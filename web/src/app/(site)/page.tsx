import Link from "next/link";
import { HeroBackground } from "@/components/HeroBackground";
import { HeroVisual } from "@/components/HeroVisual";
import { PanelCard } from "@/components/PanelCard";
import { SectionHeading, EmptyState } from "@/components/ui";
import { getActivePanels, getCreditPackages, getFaqs } from "@/lib/queries";
import { getSettings, waLink } from "@/lib/settings";
import { getDisplayCurrency, packagePrice, priceIn, formatMoney } from "@/lib/currency";

export const dynamic = "force-dynamic";

const FEATURES = [
  ["Customer CRM", "Store every customer, device and contact detail in one searchable database with CSV export."],
  ["Renewal radar", "See active, expiring, expired and pending subscriptions at a glance — with email and WhatsApp reminders."],
  ["Credit ledger", "Every credit added or deducted is recorded with who, when and why. Full audit trail."],
  ["Multi-currency", "Display and pay in AED, PHP or USD with admin-configured prices and transparent conversion."],
  ["Support desk", "Ticketing with screenshots, status tracking and staff replies — for resellers and their customers."],
  ["Sales reports", "Track credit spend, customer revenue and growth month by month."],
];

const STEPS = [
  ["01", "Register", "Create your reseller account. Our team reviews and approves applications."],
  ["02", "Choose a panel", "Compare panels by devices, quality, credit cost and trial availability."],
  ["03", "Buy credits", "Pick a wholesale credit package and pay by card or bank transfer."],
  ["04", "Activate & grow", "Activate customer subscriptions, track renewals and scale your business."],
];

export default async function Home() {
  const [s, panels, packages, faqs, currency] = await Promise.all([getSettings(), getActivePanels(), getCreditPackages(), getFaqs(), getDisplayCurrency()]);
  const rates = s.currency.rates;
  const featured = (panels.filter((p) => p.isFeatured).length ? panels.filter((p) => p.isFeatured) : panels).slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="noise relative overflow-hidden">
        <HeroBackground />
        <div className="container-x relative grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fadeUp">
            <p className="eyebrow">{s.site.brandName} · UAE · Philippines · Worldwide</p>
            <h1 className="h-display mt-5 text-5xl leading-[0.95] sm:text-6xl xl:text-7xl">
              <span className="metal">{s.site.brandName.split(" ").slice(0, 2).join(" ")}</span>{" "}
              <span className="red-text [text-shadow:0_0_40px_rgba(220,20,60,.35)]">{s.site.brandName.split(" ").slice(2).join(" ")}</span>
            </h1>
            <p className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">{s.site.heroHeadline}</p>
            <p className="mt-4 max-w-xl text-lg text-silver-400">{s.site.heroSub}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/panels" className="btn-primary px-6 py-3 text-base">Explore Panels →</Link>
              <Link href="/register" className="btn-silver px-6 py-3 text-base">Become a Reseller</Link>
              <a href={waLink(s.contact.whatsapp, "Hi! I'd like to know more about reseller panels.")} target="_blank" rel="noopener noreferrer" className="btn-ghost px-6 py-3 text-base">Contact on WhatsApp</a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-silver-400">
              {["Admin-verified listings", "Card & bank transfer", "AED · PHP · USD"].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-crimson shadow-glow" />{t}</li>
              ))}
            </ul>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* FEATURED PANELS */}
      <section className="container-x py-20" id="panels">
        <SectionHeading eyebrow="Featured reseller panels" title={<>Pick the panel that <span className="red-text">fits your market</span></>}
          sub="Every listing is managed by our team. Content counts are only shown once verified with the provider." />
        {featured.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <PanelCard key={p.id} panel={p} currency={currency} price={priceIn(p.startingPriceCents, currency, rates)} />)}
          </div>
        ) : <EmptyState title="No panels listed yet">Administrators can add panels from the admin dashboard.</EmptyState>}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/panels" className="btn-ghost">All panels</Link>
          <Link href="/compare" className="btn-primary">Compare side by side</Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative border-y border-white/5 bg-charcoal/40 py-20">
        <div className="container-x">
          <SectionHeading eyebrow="How it works" title="From sign-up to first sale in four steps" />
          <ol className="grid gap-6 md:grid-cols-4">
            {STEPS.map(([n, t, d]) => (
              <li key={n} className="glass glass-hover relative p-6">
                <span className="font-display text-4xl font-black text-crimson/80">{n}</span>
                <h3 className="mt-3 font-display text-lg font-bold uppercase">{t}</h3>
                <p className="mt-2 text-sm text-silver-400">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* MANAGEMENT */}
      <section className="container-x py-20">
        <SectionHeading eyebrow="Business tools" title={<>More than a marketplace — a <span className="red-text">command center</span></>}
          sub="Manage customers, subscriptions, credits and support from one premium dashboard." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="glass glass-hover p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-crimson/40 bg-crimson/10 text-crimson-300 shadow-glow">◆</div>
              <h3 className="font-display font-bold uppercase">{t}</h3>
              <p className="mt-2 text-sm text-silver-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="border-y border-white/5 bg-charcoal/40 py-20">
        <div className="container-x">
          <SectionHeading eyebrow="Wholesale credits" title="Transparent credit pricing" sub={`Prices shown in ${currency}. Switch currency from the top bar.`} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packages.filter((p) => !p.isCustom).slice(0, 4).map((p) => {
              const pr = packagePrice(p, currency, rates);
              return (
                <div key={p.id} className={`glass glass-hover p-6 text-center ${p.highlight ? "border-crimson/50 shadow-glow" : ""}`}>
                  <p className="font-display text-4xl font-black">{p.credits}</p>
                  <p className="text-xs uppercase tracking-widest text-silver-400">credits</p>
                  <p className="mt-4 font-display text-2xl font-bold red-text">{formatMoney(pr.minor, currency)}</p>
                  <p className="mt-1 text-xs text-silver-600">{formatMoney(Math.round(pr.minor / p.credits), currency)} / credit{pr.converted ? " · converted" : ""}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center"><Link href="/pricing" className="btn-primary">See all packages</Link></div>
        </div>
      </section>

      {/* FAQ TEASER */}
      {faqs.length > 0 && (
        <section className="container-x py-20">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <div className="mx-auto max-w-3xl space-y-3">
            {faqs.slice(0, 5).map((f) => (
              <details key={f.id} className="glass group p-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">{f.question}<span className="chev text-xl text-crimson transition">+</span></summary>
                <p className="mt-3 whitespace-pre-line text-sm text-silver-400">{f.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 text-center"><Link href="/faq" className="btn-ghost">All FAQs</Link></div>
        </section>
      )}

      {/* CTA */}
      <section className="container-x">
        <div className="glass relative overflow-hidden p-10 text-center sm:p-16">
          <div className="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-crimson/30 blur-[100px]" aria-hidden="true" />
          <div className="relative">
            <h2 className="h-display text-3xl sm:text-5xl"><span className="metal">Ready to launch your</span> <span className="red-text">reseller business?</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-silver-400">Register in minutes. Our team reviews every application to keep the marketplace trustworthy.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary px-6 py-3">Become a Reseller</Link>
              <Link href="/trial" className="btn-ghost px-6 py-3">Request a Trial</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
