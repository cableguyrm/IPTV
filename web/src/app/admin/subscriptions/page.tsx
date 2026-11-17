import Link from "next/link";
import { listSubscriptions, type SubFilter } from "@/lib/reseller-queries";
import { PageTitle } from "@/components/AppShell";
import { SubTable } from "@/components/SubTable";
import { ReviewForm } from "../Forms";
import { cn, formatDate } from "@/lib/utils";

const FILTERS: [SubFilter, string][] = [["pending", "Pending approval"], ["all", "All"], ["active", "Active"], ["expiring", "Expiring ≤7d"], ["renewals", "Renewals ≤30d"], ["expired", "Expired"]];

export default async function AdminSubs({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const sp = await searchParams;
  const filter = (FILTERS.find(([f]) => f === sp.filter)?.[0] ?? "pending") as SubFilter;
  const rows = await listSubscriptions({ filter, q: sp.q });
  return (
    <>
      <PageTitle title="Subscriptions" sub="Approve manual activation requests and manage every subscription." actions={<a href={`/api/export/subscriptions?scope=all&filter=${filter}`} className="btn-ghost">Export CSV</a>} />
      <div className="mb-4 flex flex-wrap gap-2">{FILTERS.map(([f, l]) => <Link key={f} href={`?filter=${f}`} className={cn("rounded-full border px-4 py-1.5 text-sm", f === filter ? "border-crimson bg-crimson/20" : "border-white/10 text-silver-400")}>{l}</Link>)}</div>
      <form className="mb-4 flex gap-2"><input type="hidden" name="filter" value={filter} /><input name="q" defaultValue={sp.q} className="input max-w-sm" placeholder="Search…" aria-label="Search" /><button className="btn-ghost">Search</button></form>
      {filter === "pending" ? (
        <div className="space-y-3">
          {rows.map(({ s, customerName, panelName, resellerName }) => (
            <div key={s.id} className="glass flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">{customerName} <span className="text-silver-400">· {panelName} / {s.planName}</span></p>
                <p className="text-xs text-silver-400">Reseller: {resellerName} · {s.creditCost} credits · {s.deviceType ?? "device n/a"} · requested {formatDate(s.createdAt, true)}{s.renewalOfId ? " · renewal" : ""}</p>
                {s.resellerNotes && <p className="mt-1 text-xs text-silver-600">“{s.resellerNotes}”</p>}
              </div>
              <div className="flex items-center gap-3"><ReviewForm id={s.id} compact /><Link href={`/admin/subscriptions/${s.id}`} className="btn-ghost btn-sm">Details</Link></div>
            </div>
          ))}
          {!rows.length && <p className="glass p-10 text-center text-silver-400">No pending requests. 🎉</p>}
        </div>
      ) : <SubTable rows={rows} base="/admin/subscriptions" showReseller />}
    </>
  );
}
