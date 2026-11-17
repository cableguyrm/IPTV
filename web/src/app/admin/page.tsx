import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatCard } from "@/components/ui";
import { SubTable } from "@/components/SubTable";
import { listSubscriptions } from "@/lib/reseller-queries";
import { formatMoney } from "@/lib/currency";
import { cardPaymentsEnabled } from "@/lib/stripe";
import { emailConfigured, whatsappConfigured } from "@/lib/notify";

export default async function AdminHome() {
  const { rows: [k] } = await db.execute<Record<string, number>>(sql`SELECT
    (SELECT count(*)::int FROM users WHERE role = 'RESELLER' AND status = 'ACTIVE') AS resellers,
    (SELECT count(*)::int FROM users WHERE status = 'PENDING') AS pending_resellers,
    (SELECT count(*)::int FROM customers) AS customers,
    (SELECT count(*)::int FROM subscriptions WHERE status = 'ACTIVE') AS active,
    (SELECT count(*)::int FROM subscriptions WHERE status = 'ACTIVE' AND expires_at <= now() + interval '7 days') AS expiring,
    (SELECT count(*)::int FROM subscriptions WHERE status = 'PENDING') AS pending_subs,
    (SELECT count(*)::int FROM orders WHERE status = 'AWAITING_VERIFICATION') AS awaiting,
    (SELECT COALESCE(SUM(credit_balance),0)::int FROM users) AS outstanding_credits`);
  const { rows: revenue } = await db.execute<{ currency: string; total: number }>(sql`SELECT currency, SUM(amount_minor)::int AS total FROM orders WHERE status = 'PAID' AND paid_at >= date_trunc('month', now()) GROUP BY currency`);
  const pending = await listSubscriptions({ filter: "pending", limit: 10 });
  const integrations = [["Card payments (Stripe)", cardPaymentsEnabled()], ["Email (SMTP)", emailConfigured()], ["WhatsApp Cloud API", whatsappConfigured()]] as const;
  return (
    <>
      <PageTitle title="Admin overview" sub="Live figures from the database." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active resellers" value={k.resellers} href="/admin/resellers" />
        <StatCard label="Pending applications" value={k.pending_resellers} href="/admin/resellers?status=PENDING" />
        <StatCard label="Pending activations" value={k.pending_subs} href="/admin/subscriptions?filter=pending" />
        <StatCard label="Transfers to verify" value={k.awaiting} href="/admin/orders?status=AWAITING_VERIFICATION" />
        <StatCard label="Customers" value={k.customers} href="/admin/customers" />
        <StatCard label="Active subscriptions" value={k.active} href="/admin/subscriptions?filter=active" />
        <StatCard label="Expiring ≤7d" value={k.expiring} href="/admin/subscriptions?filter=expiring" />
        <StatCard label="Outstanding reseller credits" value={k.outstanding_credits} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {revenue.length ? revenue.map((r) => <StatCard key={r.currency} label={`Paid revenue this month (${r.currency})`} value={formatMoney(r.total, r.currency)} href="/admin/reports" />)
          : <StatCard label="Paid revenue this month" value="—" hint="No confirmed payments yet" href="/admin/reports" />}
      </div>
      <div className="mt-10 grid gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold uppercase">Activation queue</h2><Link href="/admin/subscriptions?filter=pending" className="link text-sm">All pending</Link></div>
          <SubTable rows={pending} base="/admin/subscriptions" showReseller />
        </div>
        <div className="glass h-fit p-6">
          <h2 className="font-display text-lg font-bold uppercase">Integrations</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {integrations.map(([l, ok]) => <li key={l} className="flex justify-between"><span className="text-silver-400">{l}</span><span className={ok ? "text-emerald-300" : "text-amber-300"}>{ok ? "Configured" : "Not configured"}</span></li>)}
          </ul>
          <p className="mt-4 text-xs text-silver-600">Configure via environment variables — see README › Integrations.</p>
        </div>
      </div>
    </>
  );
}
