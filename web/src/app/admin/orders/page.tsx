import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/currency";
import { formatDate, cn } from "@/lib/utils";
import { VerifyOrderForm, RefundForm } from "../Forms";

const STATUSES = ["ALL", "AWAITING_VERIFICATION", "PENDING_PAYMENT", "PAID", "FAILED", "CANCELLED", "REFUNDED"] as const;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status) ?? "ALL";
  const rows = await db.select({ o: schema.orders, name: schema.users.name, email: schema.users.email }).from(schema.orders)
    .innerJoin(schema.users, eq(schema.orders.userId, schema.users.id))
    .where(and(status === "ALL" ? undefined : eq(schema.orders.status, status))).orderBy(desc(schema.orders.createdAt)).limit(500);
  return (
    <>
      <PageTitle title="Payments & invoices" sub="Card orders are confirmed automatically by the payment provider webhook. Bank transfers require manual verification." />
      <div className="mb-4 flex flex-wrap gap-2">{STATUSES.map((s) => <Link key={s} href={`?status=${s}`} className={cn("rounded-full border px-3 py-1.5 text-xs", s === status ? "border-crimson bg-crimson/20" : "border-white/10 text-silver-400")}>{s.replace(/_/g, " ")}</Link>)}</div>
      <div className="glass overflow-x-auto"><table className="table-x min-w-[1000px]">
        <thead><tr><th>Order</th><th>Reseller</th><th>Item</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map(({ o, name, email }) => (
          <tr key={o.id}>
            <td><Link href={`/dashboard/orders/${o.id}`} className="link font-mono">#{o.number}</Link><div className="text-xs text-silver-600">{formatDate(o.createdAt, true)}</div></td>
            <td><div>{name}</div><div className="text-xs text-silver-600">{email}</div></td>
            <td>{o.description}</td><td className="font-semibold">{formatMoney(o.amountMinor, o.currency)}</td>
            <td className="text-xs">{o.method === "CARD" ? "Card" : "Bank"}</td>
            <td className="max-w-[180px] text-xs text-silver-400">{o.bankReference ?? o.providerPaymentId ?? "—"}{o.proofNote && <div className="text-silver-600">{o.proofNote}</div>}</td>
            <td><StatusBadge status={o.status} /></td>
            <td>{o.method === "BANK_TRANSFER" && (o.status === "AWAITING_VERIFICATION" || o.status === "PENDING_PAYMENT") ? <VerifyOrderForm id={o.id} /> : o.status === "PAID" ? <RefundForm id={o.id} /> : null}</td>
          </tr>
        ))}{!rows.length && <tr><td colSpan={8} className="py-8 text-center text-silver-400">No orders.</td></tr>}</tbody>
      </table></div>
    </>
  );
}
