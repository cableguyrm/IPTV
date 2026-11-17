import Link from "next/link";
import { Logo } from "./Logo";
import type { Settings } from "@/lib/settings";
import { waLink } from "@/lib/settings";

export function Footer({ s }: { s: Settings }) {
  const cols = [
    { title: "Marketplace", links: [["/panels", "IPTV Panels"], ["/compare", "Panel Comparison"], ["/reseller-plans", "Reseller Plans"], ["/pricing", "Wholesale Pricing"], ["/trial", "Request a Trial"]] },
    { title: "Resources", links: [["/tools", "IPTV Tools"], ["/guide", "Reseller Guide"], ["/faq", "FAQs"], ["/support", "Support Center"]] },
    { title: "Company", links: [["/about", "About Us"], ["/contact", "Contact Us"], ["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/refund", "Refund Policy"]] },
  ];
  return (
    <footer className="relative mt-24 border-t border-white/10 bg-gradient-to-b from-charcoal/40 to-jet">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-crimson to-transparent" />
      <div className="container-x grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo brand={s.site.brandName} logoUrl={s.site.logoUrl} />
          <p className="mt-4 max-w-sm text-sm text-silver-400">{s.site.tagline}. Serving the UAE, the Philippines and international resellers.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a className="btn-ghost btn-sm" href={waLink(s.contact.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a className="btn-ghost btn-sm" href={`https://t.me/${s.contact.telegram}`} target="_blank" rel="noopener noreferrer">Telegram</a>
            <a className="btn-ghost btn-sm" href={`mailto:${s.contact.email}`}>Email</a>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">{c.title}</h3>
            <ul className="mt-4 space-y-2">
              {c.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-sm text-silver-400 transition hover:text-crimson-300">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-silver-600 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {s.site.brandName}. All rights reserved.</p>
          <p className="max-w-2xl md:text-right">{s.site.complianceNote}</p>
        </div>
      </div>
    </footer>
  );
}
