import Link from "next/link";
import { requireReseller } from "@/lib/auth";
import { listSubscriptions, resellerStats, type SubFilter } from "@/lib/reseller-queries";
import { PageTitle } from "@/components/AppShell";
import { SubTable } from "@/components/SubTable";
import { cn } from "@/lib/utils";

const FILTERS: [SubFilter, string][] = [["all", "All"], ["active", "Active"], ["expiring", "Expiring ≤7d"], ["renewals", "Renewals ≤30d"], ["expired", "Expired"], ["pending", "Pending"]];

export default async function Subscriptions({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const u = await requireReseller();
  const sp = await searchParams;
  const filter = (FILTERS.find(([f]) => f === sp.filter)?.[0] ?? "all") as SubFilter;
  const [rows, stats] = await Promise.all([listSubscriptions({ resellerId: u.id, filter, q: sp.q }), resellerStats(u.id)]);
  const counts: Partial<Record<SubFilter, number>> = { active: stats.active, expiring: stats.expiring, expired: stats.expired, pending: stats.pending };
  return (
    <>
      <PageTitle title="Subscriptions" sub="Track active, expiring, expired and pending subscriptions."
        actions={<><a href={`/api/export/subscriptions?filter=${filter}`} className="btn-ghost">Export CSV</a><Link href="/dashboard/subscriptions/new" className="btn-primary">+ New subscription</Link></>} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {FILTERS.map(([f, l]) => (
          <Link key={f} role="tab" aria-selected={f === filter} href={`?filter=${f}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
            className={cn("rounded-full border px-4 py-1.5 text-sm transition", f === filter ? "border-crimson bg-crimson/20 text-white shadow-glow" : "border-white/10 text-silver-400 hover:text-white")}>
            {l}{counts[f] !== undefined && <span className="ml-1.5 text-xs opacity-70">{counts[f]}</span>}
          </Link>
        ))}
      </div>
      <form className="mb-4 flex gap-2"><input type="hidden" name="filter" value={filter} /><input name="q" defaultValue={sp.q} placeholder="Search customer, contact or panel…" className="input max-w-sm" aria-label="Search subscriptions" /><button className="btn-ghost">Search</button></form>
      <SubTable rows={rows} />
    </>
  );
}
