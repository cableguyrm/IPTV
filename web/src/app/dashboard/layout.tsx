import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireReseller, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { syncExpiredSubscriptions } from "@/lib/queries";

export const metadata: Metadata = { title: "Reseller Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [u, s] = await Promise.all([requireReseller(), getSettings()]);
  await syncExpiredSubscriptions();
  const nav = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/subscriptions", label: "Subscriptions" },
    { href: "/dashboard/credits", label: "Credits" },
    { href: "/dashboard/orders", label: "Purchase history" },
    { href: "/dashboard/reports", label: "Sales reports" },
    { href: "/dashboard/tickets", label: "Support tickets" },
    { href: "/dashboard/settings", label: "Account settings" },
  ];
  return (
    <AppShell brand={s.site.brandName} logoUrl={s.site.logoUrl} nav={nav} area="Reseller" user={u}
      topRight={<>
        <span className="rounded-lg border border-crimson/40 bg-crimson/10 px-3 py-1.5 text-xs font-bold text-crimson-200">{u.creditBalance} credits</span>
        {isStaff(u) && <Link href="/admin" className="btn-ghost btn-sm">Admin</Link>}
      </>}>
      {children}
    </AppShell>
  );
}
