import Link from "next/link";
import { requireReseller } from "@/lib/auth";
import { resellerStats, listSubscriptions, recentLedger } from "@/lib/reseller-queries";
import { PageTitle } from "@/components/AppShell";
import { StatCard, Notice } from "@/components/ui";
import { SubTable } from "@/components/SubTable";
import { formatDate } from "@/lib/utils";

export default async function Overview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const u = await requireReseller();
  const [{ welcome }, stats, renewals, ledger] = await Promise.all([searchParams, resellerStats(u.id), listSubscriptions({ resellerId: u.id, filter: "renewals", limit: 8 }), recentLedger(u.id, 8)]);
  return (
    <>
      <PageTitle title={`Welcome, ${u.name.split(" ")[0]}`} sub={u.businessName ?? "Reseller dashboard"}
        actions={<><Link href="/dashboard/subscriptions/new" className="btn-primary">+ New subscription</Link><Link href="/pricing" className="btn-ghost">Buy credits</Link></>} />
      {u.status === "PENDING" && <div className="mb-6"><Notice tone="warn">{welcome ? "Thanks for registering! " : ""}Your reseller application is <strong>pending review</strong>. You can explore the dashboard and add customers; purchasing credits and activations unlock once an administrator approves your account.</Notice></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Credit balance" value={u.creditBalance} href="/dashboard/credits" />
        <StatCard label="Customers" value={stats.customers} href="/dashboard/customers" />
        <StatCard label="Active" value={stats.active} href="/dashboard/subscriptions?filter=active" />
        <StatCard label="Expiring ≤7d" value={stats.expiring} href="/dashboard/subscriptions?filter=expiring" />
        <StatCard label="Expired" value={stats.expired} href="/dashboard/subscriptions?filter=expired" />
        <StatCard label="Pending" value={stats.pending} href="/dashboard/subscriptions?filter=pending" />
      </div>
      <div className="mt-10 grid gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold uppercase">Upcoming renewals (30 days)</h2><Link href="/dashboard/subscriptions?filter=renewals" className="link text-sm">View all</Link></div>
          <SubTable rows={renewals} />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold uppercase">Credit activity</h2><Link href="/dashboard/credits" className="link text-sm">Ledger</Link></div>
          <div className="glass divide-y divide-white/5">
            {ledger.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0"><p className="truncate">{l.reason}</p><p className="text-xs text-silver-600">{formatDate(l.createdAt, true)}</p></div>
                <span className={`font-display font-bold ${l.delta > 0 ? "text-emerald-300" : "text-crimson-300"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</span>
              </div>
            ))}
            {!ledger.length && <p className="p-6 text-center text-sm text-silver-400">No credit activity yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
