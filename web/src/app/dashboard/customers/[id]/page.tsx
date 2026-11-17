import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { CustomerForm } from "@/components/CustomerForm";
import { SubTable } from "@/components/SubTable";
import { updateCustomer, deleteCustomer } from "@/app/actions/reseller";
import { formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/utils";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireReseller();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [c] = await db.select().from(schema.customers).where(and(eq(schema.customers.id, id), eq(schema.customers.resellerId, u.id)));
  if (!c) notFound();
  const s = schema.subscriptions;
  const [subs, payments] = await Promise.all([
    db.select({ s, customerName: schema.customers.name, customerWhatsapp: schema.customers.whatsapp, panelName: schema.panels.name }).from(s)
      .innerJoin(schema.customers, eq(s.customerId, schema.customers.id)).innerJoin(schema.panels, eq(s.panelId, schema.panels.id))
      .where(eq(s.customerId, c.id)).orderBy(desc(s.createdAt)),
    db.select({ p: schema.customerPayments }).from(schema.customerPayments).innerJoin(s, eq(schema.customerPayments.subscriptionId, s.id))
      .where(eq(s.customerId, c.id)).orderBy(desc(schema.customerPayments.paidAt)),
  ]);
  return (
    <>
      <PageTitle title={c.name} sub={`Customer since ${formatDate(c.createdAt)}`} actions={<Link href={`/dashboard/subscriptions/new?customer=${c.id}`} className="btn-primary">+ Subscription</Link>} />
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section><h2 className="mb-3 font-display text-lg font-bold uppercase">Subscriptions</h2><SubTable rows={subs} /></section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold uppercase">Payment history</h2>
            <div className="glass overflow-x-auto"><table className="table-x"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead><tbody>
              {payments.map(({ p }) => <tr key={p.id}><td>{formatDate(p.paidAt)}</td><td className="font-semibold">{formatMoney(p.amountMinor, p.currency)}</td><td>{p.method ?? "—"}</td><td className="text-silver-400">{p.note ?? ""}</td></tr>)}
              {!payments.length && <tr><td colSpan={4} className="py-6 text-center text-silver-400">No payments recorded.</td></tr>}
            </tbody></table></div>
          </section>
        </div>
        <aside className="space-y-6">
          <div className="glass p-6"><h2 className="mb-4 font-display text-lg font-bold uppercase">Details</h2><CustomerForm action={updateCustomer} customer={c} /></div>
          <form action={deleteCustomer} className="glass p-6">
            <input type="hidden" name="id" value={c.id} />
            <p className="text-sm text-silver-400">Delete this customer and their history. Only possible without active or pending subscriptions.</p>
            <button className="btn-danger btn-sm mt-3">Delete customer</button>
          </form>
        </aside>
      </div>
    </>
  );
}
