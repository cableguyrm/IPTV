import { requireReseller } from "@/lib/auth";
import { monthlyReport, resellerStats } from "@/lib/reseller-queries";
import { PageTitle } from "@/components/AppShell";
import { StatCard } from "@/components/ui";
import { BarChart } from "@/components/BarChart";
import { formatMoney } from "@/lib/currency";

export default async function Reports() {
  const u = await requireReseller();
  const [r, stats] = await Promise.all([monthlyReport(u.id), resellerStats(u.id)]);
  const currencies = [...new Set(r.revenue.map((x) => x.currency))];
  const totals = currencies.map((c) => ({ c, total: r.revenue.filter((x) => x.currency === c).reduce((a, x) => a + Number(x.total), 0) }));
  return (
    <>
      <PageTitle title="Sales reports" sub="Last 12 months. Revenue is based on customer payments you record." actions={<a href="/api/export/subscriptions?filter=all" className="btn-ghost">Export subscriptions CSV</a>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active subscriptions" value={stats.active} />
        <StatCard label="Customers" value={stats.customers} />
        {totals.map((t) => <StatCard key={t.c} label={`Revenue (${t.c})`} value={formatMoney(t.total, t.c)} />)}
        {!totals.length && <StatCard label="Revenue" value="—" hint="Record customer payments to see revenue" />}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Credits used per month</h2><BarChart label="Credits used" data={r.credits.map((x) => ({ k: x.month, v: Number(x.spent) }))} /></div>
        <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Activations per month</h2><BarChart label="Activations" data={r.activations.map((x) => ({ k: x.month, v: Number(x.n) }))} /></div>
        {currencies.map((c) => (
          <div key={c} className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Revenue per month ({c})</h2><BarChart label={`Revenue ${c}`} format={(n) => formatMoney(n, c)} data={r.revenue.filter((x) => x.currency === c).map((x) => ({ k: x.month, v: Number(x.total) }))} /></div>
        ))}
        <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">By panel</h2>
          <table className="table-x"><thead><tr><th>Panel</th><th>Subscriptions</th><th>Credits</th></tr></thead><tbody>
            {r.byPanel.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.n}</td><td>{p.credits}</td></tr>)}
            {!r.byPanel.length && <tr><td colSpan={3} className="py-6 text-center text-silver-400">No data yet.</td></tr>}
          </tbody></table>
        </div>
      </div>
    </>
  );
}
