import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { getSettings, waLink } from "@/lib/settings";
import { CATEGORY_LABELS } from "@/lib/tickets";
import { TrackForm } from "./TrackForm";

export const metadata: Metadata = { title: "Support Center", description: "Open a support ticket, track its status or reach us on WhatsApp, Telegram and email." };

export default async function SupportPage() {
  const s = await getSettings();
  const channels = [
    ["WhatsApp", s.contact.whatsapp, waLink(s.contact.whatsapp, "Hi, I need support.")],
    ["Telegram", `@${s.contact.telegram}`, `https://t.me/${s.contact.telegram}`],
    ["Email", s.contact.email, `mailto:${s.contact.email}`],
  ];
  return (
    <>
      <PageHero eyebrow="Help" title="Support Center" sub={`Open a ticket with screenshots and track it to resolution. Support hours: ${s.contact.hours}.`}>
        <div className="flex flex-wrap justify-center gap-3"><Link href="/support/new" className="btn-primary">Open a ticket</Link><Link href="/dashboard/tickets" className="btn-ghost">My tickets (resellers)</Link></div>
      </PageHero>
      <section className="container-x grid gap-8 py-14 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl font-bold uppercase">What do you need help with?</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <Link key={k} href={`/support/new?category=${k}`} className="glass glass-hover flex items-center justify-between p-5">
                <span className="font-semibold">{v}</span><span className="text-crimson">→</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="font-display text-lg font-bold uppercase">Track a ticket</h2>
            <p className="mt-1 text-sm text-silver-400">Use the number and access code from your confirmation link.</p>
            <TrackForm />
          </div>
          <div className="glass p-6">
            <h2 className="font-display text-lg font-bold uppercase">Talk to us</h2>
            <ul className="mt-4 space-y-3">
              {channels.map(([l, v, href]) => (
                <li key={l}><a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 transition hover:border-crimson/60 hover:shadow-glow"><span className="text-sm text-silver-400">{l}</span><span className="text-sm font-semibold">{v}</span></a></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
