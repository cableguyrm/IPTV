import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge, StatCard } from "@/components/ui";
import { SubTable } from "@/components/SubTable";
import { listSubscriptions, resellerStats } from "@/lib/reseller-queries";
import { formatDate } from "@/lib/utils";
import { StatusForm, CreditAdjustForm, UserAdminForm } from "../../Forms";
import { getCurrentUser } from "@/lib/auth";

export default async function ResellerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) notFound();
  const me = await getCurrentUser();
  const isAdmin = me?.role === "ADMIN";
  const [stats, subs, ledger] = await Promise.all([
    resellerStats(u.id), listSubscriptions({ resellerId: u.id, filter: "all", limit: 50 }),
    db.select({ l: schema.creditLedger, actor: schema.users.name }).from(schema.creditLedger).leftJoin(schema.users, eq(schema.creditLedger.actorId, schema.users.id)).where(eq(schema.creditLedger.userId, u.id)).orderBy(desc(schema.creditLedger.createdAt)).limit(100),
  ]);
  return (
    <>
      <PageTitle title={u.name} sub={<>{u.email} · {u.businessName ?? "no business name"} · <StatusBadge status={u.status} /></>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Credit balance" value={u.creditBalance} /><StatCard label="Customers" value={stats.customers} /><StatCard label="Active" value={stats.active} /><StatCard label="Pending" value={stats.pending} /><StatCard label="Expired" value={stats.expired} />
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className="glass grid gap-4 p-6 text-sm sm:grid-cols-2">
            {[["WhatsApp", u.whatsapp], ["Phone", u.phone], ["Country", u.country], ["Expected volume", u.expectedVolume], ["Joined", formatDate(u.createdAt, true)], ["Last login", formatDate(u.lastLoginAt, true)]].map(([k, v]) => <div key={k}><p className="text-xs uppercase text-silver-600">{k}</p><p>{v ?? "—"}</p></div>)}
            {u.applicationNote && <div className="sm:col-span-2"><p className="text-xs uppercase text-silver-600">Application note</p><p className="whitespace-pre-wrap">{u.applicationNote}</p></div>}
          </div>
          <section><h2 className="mb-3 font-display text-lg font-bold uppercase">Subscriptions</h2><SubTable rows={subs} base="/admin/subscriptions" /></section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold uppercase">Credit ledger (audit trail)</h2>
            <div className="glass overflow-x-auto"><table className="table-x min-w-[640px]"><thead><tr><th>Date</th><th>Reason</th><th>By</th><th className="text-right">Change</th><th className="text-right">Balance</th></tr></thead><tbody>
              {ledger.map(({ l, actor }) => <tr key={l.id}><td className="whitespace-nowrap text-silver-400">{formatDate(l.createdAt, true)}</td><td>{l.reason}</td><td className="text-xs text-silver-400">{actor ?? "system"}</td><td className={`text-right font-bold ${l.delta > 0 ? "text-emerald-300" : "text-crimson-300"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</td><td className="text-right">{l.balanceAfter}</td></tr>)}
              {!ledger.length && <tr><td colSpan={5} className="py-6 text-center text-silver-400">No entries.</td></tr>}
            </tbody></table></div>
          </section>
        </div>
        <aside className="space-y-6">
          {isAdmin ? (<>
            <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Account status</h2><StatusForm id={u.id} current={u.status} /></div>
            <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Adjust credits</h2><CreditAdjustForm userId={u.id} /></div>
            <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Role & notes</h2><UserAdminForm id={u.id} adminNotes={u.adminNotes} role={u.role} /></div>
          </>) : <p className="glass p-6 text-sm text-silver-400">Staff accounts have read-only access to resellers. Ask an administrator to change status or credits.</p>}
        </aside>
      </div>
    </>
  );
}
