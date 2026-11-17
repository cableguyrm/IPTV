import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { CATEGORY_LABELS } from "@/lib/tickets";
import { formatDate, cn } from "@/lib/utils";

const STATUSES = ["ACTIVE", "OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED", "ALL"] as const;

export default async function AdminTickets({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status) ?? "ACTIVE";
  const t = schema.tickets;
  const where = status === "ALL" ? undefined : status === "ACTIVE" ? sql`${t.status} IN ('OPEN','IN_PROGRESS','AWAITING_CUSTOMER')` : eq(t.status, status);
  const rows = await db.select({ t, user: schema.users.name }).from(t).leftJoin(schema.users, eq(t.userId, schema.users.id)).where(where).orderBy(desc(t.updatedAt)).limit(300);
  return (
    <>
      <PageTitle title="Support tickets" />
      <div className="mb-4 flex flex-wrap gap-2">{STATUSES.map((s) => <Link key={s} href={`?status=${s}`} className={cn("rounded-full border px-3 py-1.5 text-xs", s === status ? "border-crimson bg-crimson/20" : "border-white/10 text-silver-400")}>{s.replace(/_/g, " ")}</Link>)}</div>
      <div className="glass overflow-x-auto"><table className="table-x min-w-[760px]">
        <thead><tr><th>#</th><th>Subject</th><th>From</th><th>Category</th><th>Status</th><th>Updated</th><th /></tr></thead>
        <tbody>{rows.map(({ t, user }) => (
          <tr key={t.id}><td className="font-mono">#{t.number}</td><td className="font-semibold">{t.subject}</td><td className="text-sm">{user ?? `${t.guestName} (guest)`}<div className="text-xs text-silver-600">{t.guestEmail ?? ""}</div></td><td className="text-xs text-silver-400">{CATEGORY_LABELS[t.category]}</td><td><StatusBadge status={t.status} /></td><td className="text-silver-400">{formatDate(t.updatedAt, true)}</td><td><Link href={`/admin/tickets/${t.id}`} className="btn-ghost btn-sm">Open</Link></td></tr>
        ))}{!rows.length && <tr><td colSpan={7} className="py-8 text-center text-silver-400">No tickets.</td></tr>}</tbody>
      </table></div>
    </>
  );
}
