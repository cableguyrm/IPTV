import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/utils";

export default async function Orders() {
  const u = await requireReseller();
  const rows = await db.select().from(schema.orders).where(eq(schema.orders.userId, u.id)).orderBy(desc(schema.orders.createdAt));
  return (
    <>
      <PageTitle title="Purchase history" sub="Credit orders, payment status and invoices." actions={<Link href="/pricing" className="btn-primary">Buy credits</Link>} />
      <div className="glass overflow-x-auto"><table className="table-x min-w-[700px]">
        <thead><tr><th>Order</th><th>Date</th><th>Description</th><th>Method</th><th>Amount</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td className="font-mono">#{o.number}</td><td className="text-silver-400">{formatDate(o.createdAt)}</td><td>{o.description}</td>
              <td>{o.method === "CARD" ? "Card" : "Bank transfer"}</td><td className="font-semibold">{formatMoney(o.amountMinor, o.currency)}</td>
              <td><StatusBadge status={o.status} /></td><td><Link href={`/dashboard/orders/${o.id}`} className="btn-ghost btn-sm">{o.status === "PAID" ? "Invoice" : "View"}</Link></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="py-10 text-center text-silver-400">No orders yet.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
