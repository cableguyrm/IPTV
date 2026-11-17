import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Reseller Guide", description: "Step-by-step guide: register, choose a panel, use credits, activate subscriptions, track renewals, configure apps and get support." };

const STEPS = [
  { t: "Register as a reseller", img: "/guide/register.png", body: ["Open Become a Reseller and fill in your name, business, WhatsApp and market (UAE, Philippines or international).", "Your account starts as Pending. You can sign in and explore the dashboard immediately, but purchasing and activations unlock after an administrator approves your application.", "You'll see your status on the dashboard overview."], cta: ["/register", "Register now"] },
  { t: "Choose an IPTV panel", img: "/guide/compare.png", body: ["Use Panel Comparison to search and sort panels by price, devices, panel type and plan lengths.", "Only verified content counts are shown — others are marked “Unverified”.", "Request a trial on panels that offer one before committing."], cta: ["/compare", "Compare panels"] },
  { t: "Understand the credit system", img: "/guide/credits.png", body: ["Credits are prepaid wholesale units. Each panel defines its credit cost (e.g. 1 credit = 1 month).", "Buy a package on the Pricing page in AED, PHP or USD. Card payments are credited once our payment provider confirms; bank transfers once our team verifies them.", "Every credit addition or deduction appears in your credit ledger."], cta: ["/pricing", "See packages"] },
  { t: "Activate a subscription", img: "/guide/new-subscription.png", body: ["Go to Dashboard › Subscriptions › New, choose or create the customer, then pick panel, plan and device.", "If the panel has an integrated provider API, activation is instant and credits are deducted immediately.", "Otherwise the request is queued as Pending for administrator confirmation — credits are deducted only when it's approved."], cta: ["/dashboard/subscriptions/new", "New subscription"] },
  { t: "Track customers and renewals", img: "/guide/subscriptions.png", body: ["Filter subscriptions by Active, Expiring (≤7 days), Expired and Pending.", "Record customer payments, add notes and renew in one click.", "Enable email or WhatsApp reminders per customer and export everything to CSV."], cta: ["/dashboard/subscriptions", "Open tracker"] },
  { t: "Configure streaming apps", img: "/guide/tools.png", body: ["Use the M3U / Xtream parser in IPTV Tools to split a line into server, username and password — it runs entirely in the browser.", "Enter those details in a compatible player on the customer's device. See the device compatibility guide for setup methods.", "Never share credentials publicly or in support tickets."], cta: ["/tools", "Open tools"] },
  { t: "Request technical support", img: "/guide/support.png", body: ["Open a ticket in the Support Center, pick the category and attach screenshots.", "Track the status (Open, In progress, Awaiting customer, Resolved) and reply in the thread.", "For urgent matters, use WhatsApp or Telegram from the Contact page."], cta: ["/support/new", "Open a ticket"] },
];

const FAQ = [
  ["How long does approval take?", "Most applications are reviewed within 24 hours."],
  ["Can I cancel a pending activation?", "Yes — cancel it from the subscription page before an admin approves it. No credits are deducted."],
  ["What happens when a subscription expires?", "It moves to Expired automatically. Renew it from the subscription page; a renewal starts from the later of today or the current expiry date."],
  ["Can I manage customers in multiple currencies?", "Yes. Record each customer payment in AED, PHP or USD; reports group revenue by currency."],
];

export default function GuidePage() {
  return (
    <>
      <PageHero eyebrow="Learn" title="Reseller Guide" sub="Everything you need to run your reseller business on BTN TV STREAMZ, step by step." />
      <section className="container-x py-14">
        <ol className="space-y-10">
          {STEPS.map((s, i) => (
            <li key={s.t} className="glass grid items-center gap-8 overflow-hidden p-6 lg:grid-cols-2 lg:p-8">
              <div className={i % 2 ? "lg:order-2" : ""}>
                <p className="font-display text-5xl font-black text-crimson/70">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase">{s.t}</h2>
                <ul className="mt-4 space-y-2 text-silver-400">{s.body.map((b) => <li key={b} className="flex gap-2"><span className="mt-1 text-crimson">◆</span><span>{b}</span></li>)}</ul>
                <Link href={s.cta[0]} className="btn-primary mt-6">{s.cta[1]}</Link>
              </div>
              <figure className="overflow-hidden rounded-xl border border-white/10 shadow-glow">
                <Image src={s.img} alt={`Screenshot: ${s.t}`} width={1280} height={800} className="h-auto w-full" />
              </figure>
            </li>
          ))}
        </ol>
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="h-display mb-6 text-center text-2xl">Guide FAQ</h2>
          <div className="space-y-3">{FAQ.map(([q, a]) => (
            <details key={q} className="glass p-5"><summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">{q}<span className="chev text-xl text-crimson transition">+</span></summary><p className="mt-3 text-sm text-silver-400">{a}</p></details>
          ))}</div>
        </div>
      </section>
    </>
  );
}
