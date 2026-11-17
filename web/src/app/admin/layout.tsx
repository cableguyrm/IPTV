import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { syncExpiredSubscriptions } from "@/lib/queries";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [u, s] = await Promise.all([requireStaff(), getSettings()]);
  await syncExpiredSubscriptions();
  const { rows: [c] } = await db.execute<{ resellers: number; subs: number; orders: number; tickets: number; trials: number; inquiries: number }>(sql`SELECT
    (SELECT count(*)::int FROM users WHERE status = 'PENDING') AS resellers,
    (SELECT count(*)::int FROM subscriptions WHERE status = 'PENDING') AS subs,
    (SELECT count(*)::int FROM orders WHERE status = 'AWAITING_VERIFICATION') AS orders,
    (SELECT count(*)::int FROM tickets WHERE status IN ('OPEN','IN_PROGRESS')) AS tickets,
    (SELECT count(*)::int FROM trial_requests WHERE status = 'NEW') AS trials,
    (SELECT count(*)::int FROM inquiries WHERE status = 'NEW') AS inquiries`);
  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/subscriptions", label: "Subscriptions", badge: c.subs },
    { href: "/admin/resellers", label: "Resellers", badge: c.resellers },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/orders", label: "Payments & invoices", badge: c.orders },
    { href: "/admin/tickets", label: "Support tickets", badge: c.tickets },
    { href: "/admin/trials", label: "Trial requests", badge: c.trials },
    { href: "/admin/inquiries", label: "Inquiries", badge: c.inquiries },
    { href: "/admin/panels", label: "Panels & plans" },
    { href: "/admin/packages", label: "Credit packages" },
    { href: "/admin/reports", label: "Revenue reports" },
    { href: "/admin/faq", label: "FAQ" },
    { href: "/admin/settings", label: "Site settings" },
    { href: "/admin/audit", label: "Audit log" },
  ];
  return (
    <AppShell brand={s.site.brandName} logoUrl={s.site.logoUrl} nav={nav} area="Admin" user={u}
      topRight={<><span className="badge border-white/15 text-silver-200">{u.role}</span><Link href="/dashboard" className="btn-ghost btn-sm">Reseller view</Link></>}>
      {children}
    </AppShell>
  );
}
