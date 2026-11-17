import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";

const STATUSES = ["ALL", "PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const;

export default async function Resellers({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status) ?? "ALL";
  const u = schema.users;
  const rows = await db.select({ u, customers: sql<number>`(SELECT count(*)::int FROM customers WHERE reseller_id = ${u.id})`, active: sql<number>`(SELECT count(*)::int FROM subscriptions WHERE reseller_id = ${u.id} AND status = 'ACTIVE')` })
    .from(u).where(and(status === "ALL" ? undefined : eq(u.status, status), sp.q ? or(ilike(u.name, `%${sp.q}%`), ilike(u.email, `%${sp.q}%`), ilike(u.businessName, `%${sp.q}%`)) : undefined))
    .orderBy(sql`CASE WHEN ${u.status} = 'PENDING' THEN 0 ELSE 1 END`, desc(u.createdAt)).limit(500);
  return (
    <>
      <PageTitle title="Resellers & accounts" sub="Approve applications, manage credits and roles." />
      <div className="mb-4 flex flex-wrap gap-2">{STATUSES.map((s) => <Link key={s} href={`?status=${s}`} className={cn("rounded-full border px-4 py-1.5 text-sm", s === status ? "border-crimson bg-crimson/20" : "border-white/10 text-silver-400")}>{s}</Link>)}</div>
      <form className="mb-4 flex gap-2"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={sp.q} className="input max-w-sm" placeholder="Search name, email, business…" aria-label="Search" /><button className="btn-ghost">Search</button></form>
      <div className="glass overflow-x-auto"><table className="table-x min-w-[860px]">
        <thead><tr><th>Name</th><th>Business</th><th>Country</th><th>Role</th><th>Status</th><th>Credits</th><th>Customers</th><th>Active subs</th><th>Joined</th><th /></tr></thead>
        <tbody>{rows.map(({ u, customers, active }) => (
          <tr key={u.id}>
            <td><div className="font-semibold">{u.name}</div><div className="text-xs text-silver-600">{u.email}</div></td>
            <td>{u.businessName ?? "—"}</td><td>{u.country ?? "—"}</td><td className="text-xs">{u.role}</td><td><StatusBadge status={u.status} /></td>
            <td className="font-display font-bold">{u.creditBalance}</td><td>{customers}</td><td>{active}</td><td className="text-silver-400">{formatDate(u.createdAt)}</td>
            <td><Link href={`/admin/resellers/${u.id}`} className="btn-ghost btn-sm">Manage</Link></td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
