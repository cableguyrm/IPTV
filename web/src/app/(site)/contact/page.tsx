import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { getSettings, waLink } from "@/lib/settings";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact Us", description: "Contact BTN TV STREAMZ sales and support by WhatsApp, Telegram, email or the contact form." };

export default async function Contact({ searchParams }: { searchParams: Promise<{ panel?: string; kind?: string; subject?: string }> }) {
  const [sp, s] = await Promise.all([searchParams, getSettings()]);
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's talk business" sub="Sales questions, wholesale quotes or partnership enquiries — we usually reply within a few hours." />
      <section className="container-x grid gap-8 py-14 lg:grid-cols-3">
        <div className="lg:col-span-2"><ContactForm panel={sp.panel} kind={sp.kind} subject={sp.subject} /></div>
        <aside className="space-y-4">
          {[["WhatsApp", s.contact.whatsapp, waLink(s.contact.whatsapp)], ["Telegram", `@${s.contact.telegram}`, `https://t.me/${s.contact.telegram}`], ["Sales email", s.contact.salesEmail, `mailto:${s.contact.salesEmail}`], ["Support email", s.contact.email, `mailto:${s.contact.email}`]].map(([l, v, h]) => (
            <a key={l} href={h} target="_blank" rel="noopener noreferrer" className="glass glass-hover block p-5"><p className="text-xs uppercase tracking-wider text-silver-600">{l}</p><p className="mt-1 font-semibold">{v}</p></a>
          ))}
          <div className="glass p-5 text-sm text-silver-400"><p>{s.contact.address}</p><p className="mt-1">{s.contact.hours}</p><p className="mt-1">{s.contact.phone}</p></div>
        </aside>
      </section>
    </>
  );
}
