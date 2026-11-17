import Link from "next/link";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { formatDate } from "@/lib/utils";

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const c = schema.customers;
  const rows = await db.select({ c, reseller: schema.users.name, resellerId: schema.users.id, active: sql<number>`(SELECT count(*)::int FROM subscriptions s WHERE s.customer_id = ${c.id} AND s.status = 'ACTIVE')`, nextExpiry: sql<Date | null>`(SELECT min(expires_at) FROM subscriptions s WHERE s.customer_id = ${c.id} AND s.status = 'ACTIVE')` })
    .from(c).innerJoin(schema.users, eq(c.resellerId, schema.users.id))
    .where(q ? or(ilike(c.name, `%${q}%`), ilike(c.email, `%${q}%`), ilike(c.whatsapp, `%${q}%`), ilike(schema.users.name, `%${q}%`)) : undefined)
    .orderBy(desc(c.createdAt)).limit(500);
  return (
    <>
      <PageTitle title="All customers" sub="Customers across every reseller." actions={<a className="btn-ghost" href="/api/export/customers?scope=all">Export CSV</a>} />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} className="input max-w-sm" placeholder="Search customer or reseller…" aria-label="Search" /><button className="btn-ghost">Search</button></form>
      <div className="glass overflow-x-auto"><table className="table-x min-w-[760px]">
        <thead><tr><th>Customer</th><th>Contact</th><th>Reseller</th><th>Active subs</th><th>Next expiry</th><th>Added</th></tr></thead>
        <tbody>{rows.map(({ c, reseller, resellerId, active, nextExpiry }) => (
          <tr key={c.id}><td className="font-semibold">{c.name}</td><td className="text-xs text-silver-400">{c.email}<br />{c.whatsapp}</td><td><Link href={`/admin/resellers/${resellerId}`} className="link">{reseller}</Link></td><td>{active}</td><td>{formatDate(nextExpiry)}</td><td className="text-silver-400">{formatDate(c.createdAt)}</td></tr>
        ))}{!rows.length && <tr><td colSpan={6} className="py-8 text-center text-silver-400">No customers.</td></tr>}</tbody>
      </table></div>
    </>
  );
}
