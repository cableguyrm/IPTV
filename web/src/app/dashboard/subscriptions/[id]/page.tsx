import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge, Notice } from "@/components/ui";
import { formatDate, daysUntil, subDisplayStatus } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { cancelPendingSubscription } from "@/app/actions/reseller";
import { SubNotesForm, PaymentForm } from "./Forms";

export default async function SubDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const u = await requireReseller();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db.select({ s: schema.subscriptions, c: schema.customers, p: schema.panels }).from(schema.subscriptions)
    .innerJoin(schema.customers, eq(schema.subscriptions.customerId, schema.customers.id))
    .innerJoin(schema.panels, eq(schema.subscriptions.panelId, schema.panels.id))
    .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.resellerId, u.id)));
  if (!row) notFound();
  const { s, c, p } = row;
  const [payments, reminders] = await Promise.all([
    db.select().from(schema.customerPayments).where(eq(schema.customerPayments.subscriptionId, s.id)).orderBy(desc(schema.customerPayments.paidAt)),
    db.select().from(schema.reminderLogs).where(eq(schema.reminderLogs.subscriptionId, s.id)).orderBy(desc(schema.reminderLogs.createdAt)).limit(10),
  ]);
  const d = daysUntil(s.expiresAt);
  return (
    <>
      <PageTitle title={`${c.name} · ${s.planName}`} sub={p.name}
        actions={<>{(s.status === "ACTIVE" || s.status === "EXPIRED") && <Link href={`/dashboard/subscriptions/new?renew=${s.id}`} className="btn-primary">Renew</Link>}<Link href={`/dashboard/customers/${c.id}`} className="btn-ghost">Customer</Link></>} />
      {created && s.status === "PENDING" && <div className="mb-6"><Notice tone="ok">Request submitted. It&apos;s now awaiting administrator confirmation — credits will be deducted only when approved.</Notice></div>}
      {created && s.status === "ACTIVE" && <div className="mb-6"><Notice tone="ok">Subscription activated and {s.creditCost} credits deducted.</Notice></div>}
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="glass grid gap-4 p-6 sm:grid-cols-3">
            {[
              ["Status", <StatusBadge key="s" status={subDisplayStatus(s)} />],
              ["Activation mode", s.provisioning === "API" ? "Provider API" : "Manual (admin)"],
              ["Credit cost", `${s.creditCost} credits`],
              ["Activated", formatDate(s.activatedAt)],
              ["Expires", <>{formatDate(s.expiresAt)}{d !== null && s.status === "ACTIVE" && <span className="ml-2 text-xs text-silver-400">({d}d)</span>}</>],
              ["Device", s.deviceType ?? "—"],
              ["Duration", `${s.durationMonths} month(s)`],
              ["Requested", formatDate(s.createdAt, true)],
              ["Provider ref", s.providerRef ?? "—"],
            ].map(([k, v]) => <div key={String(k)}><p className="text-xs uppercase tracking-wider text-silver-600">{k}</p><div className="mt-1 font-semibold">{v}</div></div>)}
          </div>
          {s.adminNotes && <Notice tone="info"><strong>Admin note:</strong> {s.adminNotes}</Notice>}
          <section>
            <h2 className="mb-3 font-display text-lg font-bold uppercase">Customer payments</h2>
            <div className="glass overflow-x-auto"><table className="table-x"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead><tbody>
              {payments.map((pm) => <tr key={pm.id}><td>{formatDate(pm.paidAt)}</td><td className="font-semibold">{formatMoney(pm.amountMinor, pm.currency)}</td><td>{pm.method ?? "—"}</td><td className="text-silver-400">{pm.note}</td></tr>)}
              {!payments.length && <tr><td colSpan={4} className="py-6 text-center text-silver-400">No payments recorded.</td></tr>}
            </tbody></table></div>
            <div className="glass mt-4 p-5"><h3 className="mb-3 text-sm font-semibold">Record a payment from this customer</h3><PaymentForm subscriptionId={s.id} /></div>
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold uppercase">Reminder log</h2>
            <div className="glass divide-y divide-white/5 text-sm">
              {reminders.map((r) => <div key={r.id} className="flex justify-between p-3"><span>{r.channel} · {r.status}{r.detail ? ` — ${r.detail}` : ""}</span><span className="text-silver-600">{formatDate(r.createdAt, true)}</span></div>)}
              {!reminders.length && <p className="p-4 text-silver-400">No reminders sent yet.</p>}
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <div className="glass p-6"><h2 className="mb-4 font-display text-lg font-bold uppercase">Notes & reminders</h2><SubNotesForm sub={{ id: s.id, resellerNotes: s.resellerNotes, deviceType: s.deviceType, autoRemind: s.autoRemind }} /></div>
          {s.status === "PENDING" && (
            <form action={cancelPendingSubscription} className="glass p-6">
              <input type="hidden" name="id" value={s.id} />
              <p className="text-sm text-silver-400">Cancel this pending request. No credits have been deducted.</p>
              <button className="btn-danger btn-sm mt-3">Cancel request</button>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
