import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { CATEGORY_LABELS } from "@/lib/tickets";
import { formatDate } from "@/lib/utils";

export default async function Tickets() {
  const u = await requireReseller();
  const rows = await db.select().from(schema.tickets).where(eq(schema.tickets.userId, u.id)).orderBy(desc(schema.tickets.updatedAt));
  return (
    <>
      <PageTitle title="Support tickets" actions={<Link href="/support/new" className="btn-primary">+ New ticket</Link>} />
      <div className="glass overflow-x-auto"><table className="table-x min-w-[640px]">
        <thead><tr><th>#</th><th>Subject</th><th>Category</th><th>Status</th><th>Updated</th><th /></tr></thead>
        <tbody>
          {rows.map((t) => <tr key={t.id}><td className="font-mono">#{t.number}</td><td className="font-semibold">{t.subject}</td><td className="text-silver-400">{CATEGORY_LABELS[t.category]}</td><td><StatusBadge status={t.status} /></td><td className="text-silver-400">{formatDate(t.updatedAt, true)}</td><td><Link href={`/dashboard/tickets/${t.id}`} className="btn-ghost btn-sm">Open</Link></td></tr>)}
          {!rows.length && <tr><td colSpan={6} className="py-10 text-center text-silver-400">No tickets yet.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
