import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { PanelLogo } from "@/components/PanelLogo";
import { SampleBadge } from "@/components/ui";
import { formatMoney } from "@/lib/currency";

export default async function AdminPanels() {
  const rows = await db.select({ p: schema.panels, plans: sql<number>`(SELECT count(*)::int FROM plans WHERE panel_id = ${schema.panels.id})`, subs: sql<number>`(SELECT count(*)::int FROM subscriptions WHERE panel_id = ${schema.panels.id} AND status = 'ACTIVE')` })
    .from(schema.panels).orderBy(asc(schema.panels.sortOrder), asc(schema.panels.name));
  return (
    <>
      <PageTitle title="Panels & plans" sub="Everything shown on the public panel pages and comparison table." actions={<Link href="/admin/panels/new" className="btn-primary">+ New panel</Link>} />
      <div className="glass overflow-x-auto"><table className="table-x min-w-[760px]">
        <thead><tr><th>Panel</th><th>Type</th><th>Price/credit</th><th>Plans</th><th>Active subs</th><th>Integration</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map(({ p, plans, subs }) => (
          <tr key={p.id}>
            <td><div className="flex items-center gap-3"><PanelLogo panel={p} size={32} /><span className="font-semibold">{p.name}</span>{p.isSample && <SampleBadge />}</div></td>
            <td>{p.panelType}</td><td>{formatMoney(p.startingPriceCents, "USD")}</td><td>{plans}</td><td>{subs}</td><td className="text-xs">{p.providerAdapter}</td>
            <td>{p.isActive ? <span className="text-emerald-300">Visible</span> : <span className="text-silver-600">Hidden</span>}{p.isFeatured && <span className="ml-2 text-xs text-crimson-300">Featured</span>}</td>
            <td><Link href={`/admin/panels/${p.id}`} className="btn-ghost btn-sm">Edit</Link></td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
