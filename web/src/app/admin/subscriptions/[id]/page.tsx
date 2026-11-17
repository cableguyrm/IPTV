import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge, Notice } from "@/components/ui";
import { formatDate, subDisplayStatus } from "@/lib/utils";
import { ReviewForm, SubAdminForm } from "../../Forms";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminSub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db.select({ s: schema.subscriptions, c: schema.customers, p: schema.panels, r: schema.users }).from(schema.subscriptions)
    .innerJoin(schema.customers, eq(schema.subscriptions.customerId, schema.customers.id))
    .innerJoin(schema.panels, eq(schema.subscriptions.panelId, schema.panels.id))
    .innerJoin(schema.users, eq(schema.subscriptions.resellerId, schema.users.id))
    .where(eq(schema.subscriptions.id, id));
  if (!row) notFound();
  const { s, c, p, r } = row;
  const me = await getCurrentUser();
  const audits = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entityId, s.id)).orderBy(desc(schema.auditLogs.createdAt)).limit(20);
  return (
    <>
      <PageTitle title={`${c.name} · ${s.planName}`} sub={<>{p.name} · reseller <Link className="link" href={`/admin/resellers/${r.id}`}>{r.name}</Link> (balance {r.creditBalance})</>} actions={<StatusBadge status={subDisplayStatus(s)} />} />
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="glass grid gap-4 p-6 text-sm sm:grid-cols-3">
            {[["Credit cost", s.creditCost], ["Duration", `${s.durationMonths} mo`], ["Device", s.deviceType ?? "—"], ["Mode", s.provisioning], ["Activated", formatDate(s.activatedAt, true)], ["Expires", formatDate(s.expiresAt, true)], ["Customer email", c.email ?? "—"], ["Customer WhatsApp", c.whatsapp ?? "—"], ["Renewal of", s.renewalOfId ? "previous subscription" : "—"]].map(([k, v]) => <div key={String(k)}><p className="text-xs uppercase text-silver-600">{k}</p><p className="font-semibold">{v}</p></div>)}
          </div>
          {s.resellerNotes && <Notice tone="info"><strong>Reseller note:</strong> {s.resellerNotes}</Notice>}
          <section><h2 className="mb-3 font-display text-lg font-bold uppercase">History</h2>
            <div className="glass divide-y divide-white/5 text-sm">{audits.map((a) => <div key={a.id} className="flex justify-between p-3"><span>{a.action}</span><span className="text-silver-600">{formatDate(a.createdAt, true)}</span></div>)}</div>
          </section>
        </div>
        <aside className="space-y-6">
          {s.status === "PENDING" ? (
            <div className="glass p-6"><h2 className="mb-2 font-display font-bold uppercase">Review request</h2>
              <p className="mb-4 text-xs text-silver-400">Approving deducts {s.creditCost} credits from the reseller and activates the subscription. Only approve after the line is created on the authorised provider panel.</p>
              <ReviewForm id={s.id} /></div>
          ) : me?.role === "ADMIN" && s.status !== "REJECTED" ? (
            <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Manual correction</h2><SubAdminForm s={{ id: s.id, adminNotes: s.adminNotes, providerRef: s.providerRef, status: s.status, expiresAt: s.expiresAt ? s.expiresAt.toISOString().slice(0, 10) : null }} /></div>
          ) : s.adminNotes ? <Notice tone="info">{s.adminNotes}</Notice> : null}
        </aside>
      </div>
    </>
  );
}
