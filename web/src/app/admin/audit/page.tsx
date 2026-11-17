import { desc, eq, ilike } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { formatDate } from "@/lib/utils";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = await db.select({ a: schema.auditLogs, actor: schema.users.name }).from(schema.auditLogs).leftJoin(schema.users, eq(schema.auditLogs.actorId, schema.users.id))
    .where(q ? ilike(schema.auditLogs.action, `%${q}%`) : undefined).orderBy(desc(schema.auditLogs.createdAt)).limit(500);
  return (
    <>
      <PageTitle title="Audit log" sub="Every sensitive action, newest first (last 500)." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} className="input max-w-sm" placeholder="Filter by action, e.g. credits" aria-label="Filter" /><button className="btn-ghost">Filter</button></form>
      <div className="glass overflow-x-auto"><table className="table-x min-w-[900px]">
        <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
        <tbody>{rows.map(({ a, actor }) => (
          <tr key={a.id}><td className="whitespace-nowrap text-silver-400">{formatDate(a.createdAt, true)}</td><td>{actor ?? "system"}</td><td className="font-mono text-xs">{a.action}</td><td className="text-xs text-silver-400">{a.entity}{a.entityId ? ` ${a.entityId.slice(0, 8)}` : ""}</td><td className="max-w-md truncate font-mono text-[11px] text-silver-400">{a.meta ? JSON.stringify(a.meta) : ""}</td><td className="text-xs text-silver-600">{a.ip}</td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
