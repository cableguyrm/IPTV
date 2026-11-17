import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller, isStaff } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge, Notice } from "@/components/ui";
import { formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { cancelOrder } from "@/app/actions/reseller";
import { BankRefForm, PrintButton } from "./Forms";

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const u = await requireReseller();
  const [{ id }, { checkout }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [o] = await db.select().from(schema.orders).where(isStaff(u) ? eq(schema.orders.id, id) : and(eq(schema.orders.id, id), eq(schema.orders.userId, u.id)));
  if (!o) notFound();
  const [buyer] = await db.select().from(schema.users).where(eq(schema.users.id, o.userId));
  const s = await getSettings();
  const paid = o.status === "PAID";
  return (
    <>
      <PageTitle title={`Order #${o.number}`} sub={o.description} actions={paid ? <PrintButton /> : undefined} />
      {checkout === "success" && !paid && <div className="mb-6"><Notice tone="info">Thanks! We&apos;re waiting for the payment provider to confirm your payment. This page will show <strong>PAID</strong> once confirmed — refresh in a moment.</Notice></div>}
      {checkout === "cancelled" && <div className="mb-6"><Notice tone="warn">Payment was cancelled. No charge was made.</Notice></div>}
      <div className="grid gap-8 xl:grid-cols-3">
        <article className="glass p-8 print:border-0 print:bg-white print:text-black xl:col-span-2" aria-label={paid ? "Invoice" : "Order"}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="font-display text-xl font-black">{s.site.brandName}</p><p className="text-xs text-silver-400">{s.contact.address}<br />{s.contact.email}</p></div>
            <div className="text-right"><p className="font-display text-lg font-bold uppercase">{paid ? "Invoice / Receipt" : "Order"}</p><p className="font-mono text-sm">INV-{String(o.number).padStart(6, "0")}</p><div className="mt-2"><StatusBadge status={o.status} /></div></div>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 text-sm">
            <div><p className="label">Billed to</p><p>{buyer.businessName ?? buyer.name}</p><p className="text-silver-400">{buyer.email}</p></div>
            <div className="sm:text-right"><p className="label">Dates</p><p>Ordered: {formatDate(o.createdAt, true)}</p>{o.paidAt && <p>Paid: {formatDate(o.paidAt, true)}</p>}</div>
          </div>
          <table className="table-x mt-8"><thead><tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr></thead>
            <tbody><tr><td>{o.description}</td><td className="text-right">{o.credits} credits</td><td className="text-right">{formatMoney(o.amountMinor, o.currency)}</td></tr></tbody>
            <tfoot><tr><td colSpan={2} className="px-4 py-3 text-right font-semibold">Total ({o.currency})</td><td className="px-4 py-3 text-right font-display text-xl font-black">{formatMoney(o.amountMinor, o.currency)}</td></tr></tfoot>
          </table>
          <p className="mt-6 text-xs text-silver-600">Payment method: {o.method === "CARD" ? "Card (hosted checkout)" : "Bank transfer"}{o.providerPaymentId ? ` · Ref ${o.providerPaymentId}` : ""}{o.bankReference ? ` · Bank ref ${o.bankReference}` : ""}</p>
        </article>
        <aside className="space-y-6 print:hidden">
          {o.method === "BANK_TRANSFER" && (o.status === "PENDING_PAYMENT" || o.status === "AWAITING_VERIFICATION") && (
            <div className="glass space-y-3 p-6 text-sm">
              <h2 className="font-display text-lg font-bold uppercase">Bank transfer details</h2>
              <dl className="space-y-1.5">
                {[["Bank", s.payments.bankName], ["Account name", s.payments.accountName], ["Account no.", s.payments.accountNumber], ["IBAN", s.payments.iban], ["SWIFT", s.payments.swift], ["Amount", formatMoney(o.amountMinor, o.currency)], ["Reference", `ORDER-${o.number}`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-silver-400">{k}</dt><dd className="text-right font-mono">{v}</dd></div>
                ))}
              </dl>
              <p className="text-xs text-silver-400">{s.payments.localWalletInstructions}</p>
              <p className="text-xs text-silver-400">{s.payments.instructions}</p>
              <BankRefForm orderId={o.id} existing={o.bankReference} />
            </div>
          )}
          {o.status === "PENDING_PAYMENT" && (
            <form action={cancelOrder} className="glass p-6"><input type="hidden" name="id" value={o.id} /><button className="btn-danger btn-sm">Cancel order</button></form>
          )}
        </aside>
      </div>
    </>
  );
}
