import { sql } from "drizzle-orm";
import { db } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatCard } from "@/components/ui";
import { BarChart } from "@/components/BarChart";
import { formatMoney } from "@/lib/currency";

export default async function AdminReports() {
  const since = sql`date_trunc('month', now()) - interval '11 months'`;
  const [rev, credits, top, totals] = await Promise.all([
    db.execute<{ month: string; currency: string; total: number }>(sql`SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month, currency, SUM(amount_minor)::int AS total FROM orders WHERE status = 'PAID' AND paid_at >= ${since} GROUP BY 1,2 ORDER BY 1`),
    db.execute<{ month: string; sold: number; used: number }>(sql`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COALESCE(SUM(delta) FILTER (WHERE ref_type='order' AND delta>0),0)::int AS sold, COALESCE(-SUM(delta) FILTER (WHERE ref_type='subscription' AND delta<0),0)::int AS used FROM credit_ledger WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`),
    db.execute<{ name: string; credits: number; orders: number }>(sql`SELECT u.name, SUM(o.credits)::int AS credits, count(*)::int AS orders FROM orders o JOIN users u ON u.id = o.user_id WHERE o.status='PAID' GROUP BY u.name ORDER BY credits DESC LIMIT 10`),
    db.execute<{ currency: string; total: number; n: number }>(sql`SELECT currency, SUM(amount_minor)::int AS total, count(*)::int AS n FROM orders WHERE status='PAID' GROUP BY currency`),
  ]);
  const currencies = [...new Set(rev.rows.map((r) => r.currency))];
  return (
    <>
      <PageTitle title="Revenue reports" sub="Based only on orders confirmed paid. Currencies are reported separately (no implicit conversion)." />
      <div className="grid gap-4 sm:grid-cols-3">
        {totals.rows.map((t) => <StatCard key={t.currency} label={`All-time revenue (${t.currency})`} value={formatMoney(t.total, t.currency)} hint={`${t.n} paid orders`} />)}
        {!totals.rows.length && <StatCard label="All-time revenue" value="—" hint="No paid orders yet" />}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {currencies.map((c) => <div key={c} className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Monthly revenue ({c})</h2><BarChart label={`Revenue ${c}`} format={(n) => formatMoney(n, c)} data={rev.rows.filter((r) => r.currency === c).map((r) => ({ k: r.month, v: Number(r.total) }))} /></div>)}
        <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Credits sold per month</h2><BarChart label="Credits sold" data={credits.rows.map((r) => ({ k: r.month, v: Number(r.sold) }))} /></div>
        <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Credits used per month</h2><BarChart label="Credits used" data={credits.rows.map((r) => ({ k: r.month, v: Number(r.used) }))} /></div>
        <div className="glass p-6"><h2 className="mb-4 font-display font-bold uppercase">Top resellers by credits purchased</h2>
          <table className="table-x"><thead><tr><th>Reseller</th><th>Orders</th><th>Credits</th></tr></thead><tbody>{top.rows.map((t) => <tr key={t.name}><td>{t.name}</td><td>{t.orders}</td><td>{t.credits}</td></tr>)}{!top.rows.length && <tr><td colSpan={3} className="py-6 text-center text-silver-400">No paid orders yet.</td></tr>}</tbody></table>
        </div>
      </div>
    </>
  );
}
