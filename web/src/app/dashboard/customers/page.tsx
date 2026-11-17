import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { CustomerForm } from "@/components/CustomerForm";
import { createCustomer } from "@/app/actions/reseller";
import { formatDate } from "@/lib/utils";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await requireReseller();
  const { q } = await searchParams;
  const c = schema.customers;
  const rows = await db.select({
    c, subs: sql<number>`(SELECT count(*)::int FROM subscriptions s WHERE s.customer_id = ${c.id})`,
    active: sql<number>`(SELECT count(*)::int FROM subscriptions s WHERE s.customer_id = ${c.id} AND s.status = 'ACTIVE')`,
    nextExpiry: sql<Date | null>`(SELECT min(expires_at) FROM subscriptions s WHERE s.customer_id = ${c.id} AND s.status = 'ACTIVE')`,
  }).from(c).where(and(eq(c.resellerId, u.id), q ? or(ilike(c.name, `%${q}%`), ilike(c.email, `%${q}%`), ilike(c.whatsapp, `%${q}%`), ilike(c.phone, `%${q}%`)) : undefined))
    .orderBy(desc(c.createdAt)).limit(500);
  return (
    <>
      <PageTitle title="Customers" sub={`${rows.length} customer${rows.length === 1 ? "" : "s"}`} actions={<a href="/api/export/customers" className="btn-ghost">Export CSV</a>} />
      <details className="glass mb-6 p-5">
        <summary className="cursor-pointer font-semibold">+ Add customer</summary>
        <div className="mt-5"><CustomerForm action={createCustomer} submitLabel="Add customer" /></div>
      </details>
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Search name, email, phone…" className="input max-w-sm" aria-label="Search customers" /><button className="btn-ghost">Search</button></form>
      <div className="glass overflow-x-auto">
        <table className="table-x min-w-[760px]">
          <thead><tr><th>Name</th><th>Contact</th><th>Country</th><th>Subscriptions</th><th>Next expiry</th><th>Added</th><th /></tr></thead>
          <tbody>
            {rows.map(({ c, subs, active, nextExpiry }) => (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}{c.isSample && <span className="ml-2 text-[10px] text-amber-300">SAMPLE</span>}</td>
                <td className="text-xs text-silver-400">{c.email ?? ""}<br />{c.whatsapp ?? c.phone ?? ""}</td>
                <td>{c.country ?? "—"}</td>
                <td>{active} active / {subs}</td>
                <td>{formatDate(nextExpiry)}</td>
                <td className="text-silver-400">{formatDate(c.createdAt)}</td>
                <td><Link href={`/dashboard/customers/${c.id}`} className="btn-ghost btn-sm">Open</Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="py-10 text-center text-silver-400">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
