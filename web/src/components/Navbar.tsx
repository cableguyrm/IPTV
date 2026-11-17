"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/panels", label: "Panels" },
  { href: "/compare", label: "Compare" },
  { href: "/reseller-plans", label: "Reseller Plans" },
  { href: "/pricing", label: "Pricing" },
  { href: "/tools", label: "Tools" },
  { href: "/guide", label: "Guide" },
  { href: "/support", label: "Support" },
];
const MORE = [
  { href: "/about", label: "About Us" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
  { href: "/trial", label: "Request a Trial" },
];

export function Navbar({ brand, logoUrl, user, currency }: {
  brand: string; logoUrl?: string; currency: string;
  user: { name: string; role: string } | null;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const staff = user && (user.role === "ADMIN" || user.role === "STAFF");

  return (
    <header className={cn("sticky top-0 z-50 border-b transition-colors duration-300",
      scrolled ? "border-white/10 bg-jet/80 backdrop-blur-xl" : "border-transparent bg-jet/40 backdrop-blur-md")}>
      <nav className="container-x flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Link href="/" aria-label={`${brand} home`}><Logo brand={brand} logoUrl={logoUrl} /></Link>
        <ul className="hidden items-center gap-1 xl:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition hover:text-white hover:[text-shadow:0_0_12px_rgba(220,20,60,.9)]",
                path.startsWith(n.href) ? "text-white" : "text-silver-400")}>{n.label}</Link>
            </li>
          ))}
          <li className="group relative">
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-silver-400 hover:text-white" aria-haspopup="true">More ▾</button>
            <div className="invisible absolute right-0 top-full w-48 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="glass bg-charcoal/95 p-2">
                {MORE.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm text-silver-200 hover:bg-white/5 hover:text-white">{n.label}</Link>)}
              </div>
            </div>
          </li>
        </ul>
        <div className="hidden items-center gap-2 xl:flex">
          <CurrencySwitcher current={currency} />
          {user ? (
            <>
              {staff && <Link href="/admin" className="btn-ghost btn-sm">Admin</Link>}
              <Link href="/dashboard" className="btn-primary btn-sm">Dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm">Login</Link>
              <Link href="/register" className="btn-primary btn-sm">Become a Reseller</Link>
            </>
          )}
        </div>
        <button className="btn-ghost btn-sm xl:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav">
          <span className="sr-only">Toggle menu</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>
      {open && (
        <div id="mobile-nav" className="border-t border-white/10 bg-jet/95 backdrop-blur-xl xl:hidden">
          <div className="container-x grid gap-1 py-4">
            {[...NAV, ...MORE].map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 text-silver-200 hover:bg-white/5">{n.label}</Link>
            ))}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <CurrencySwitcher current={currency} />
              {user ? (
                <>
                  {staff && <Link href="/admin" className="btn-ghost btn-sm">Admin</Link>}
                  <Link href="/dashboard" className="btn-primary btn-sm">Dashboard</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost btn-sm">Login</Link>
                  <Link href="/register" className="btn-primary btn-sm">Become a Reseller</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
