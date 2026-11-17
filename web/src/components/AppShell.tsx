import Link from "next/link";
import { Logo } from "./Logo";
import { SideNav } from "./SideNav";
import { logoutAction } from "@/app/actions/auth";

export type NavItem = { href: string; label: string; badge?: number };

export function AppShell({ brand, logoUrl, nav, user, area, children, topRight }: {
  brand: string; logoUrl?: string; nav: NavItem[]; area: "Reseller" | "Admin";
  user: { name: string; email: string; role: string }; children: React.ReactNode; topRight?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/10 bg-charcoal/60 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" aria-label="Home"><Logo brand={brand} logoUrl={logoUrl} /></Link>
        </div>
        <div className="px-5 pb-2"><span className={`badge ${area === "Admin" ? "border-crimson/50 bg-crimson/15 text-crimson-300" : "border-white/15 bg-white/5 text-silver-200"}`}>{area} area</span></div>
        <SideNav items={nav} />
        <div className="hidden border-t border-white/10 p-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-silver-600">{user.email}</p>
          <form action={logoutAction} className="mt-3"><button className="btn-ghost btn-sm w-full">Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-jet/80 px-4 backdrop-blur-xl sm:px-8">
          <div className="text-sm text-silver-400">Signed in as <span className="text-white">{user.name}</span></div>
          <div className="flex items-center gap-2">{topRight}<form action={logoutAction} className="lg:hidden"><button className="btn-ghost btn-sm">Sign out</button></form></div>
        </header>
        <main id="main" className="px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="h-display text-2xl sm:text-3xl"><span className="metal">{title}</span></h1>{sub && <p className="mt-1 text-sm text-silver-400">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
