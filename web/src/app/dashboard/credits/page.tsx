import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { StatCard } from "@/components/ui";
import { getCreditPackages } from "@/lib/queries";
import { getDisplayCurrency, packagePrice, formatMoney } from "@/lib/currency";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export default async function Credits() {
  const u = await requireReseller();
  const [ledger, packages, currency, s] = await Promise.all([
    db.select().from(schema.creditLedger).where(eq(schema.creditLedger.userId, u.id)).orderBy(desc(schema.creditLedger.createdAt)).limit(200),
    getCreditPackages(), getDisplayCurrency(), getSettings(),
  ]);
  const spent = ledger.filter((l) => l.delta < 0).reduce((a, l) => a - l.delta, 0);
  const added = ledger.filter((l) => l.delta > 0).reduce((a, l) => a + l.delta, 0);
  return (
    <>
      <PageTitle title="Credits" sub="Your balance and complete credit ledger." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Available balance" value={u.creditBalance} />
        <StatCard label="Credits added (shown period)" value={added} />
        <StatCard label="Credits used (shown period)" value={spent} />
      </div>
      <h2 className="mb-3 mt-10 font-display text-lg font-bold uppercase">Buy credits</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {packages.filter((p) => !p.isCustom).map((p) => {
          const pr = packagePrice(p, currency, s.currency.rates);
          return (
            <Link key={p.id} href={`/dashboard/credits/checkout/${p.id}`} className={`glass glass-hover p-5 text-center ${p.highlight ? "border-crimson/50" : ""}`}>
              <p className="font-display text-3xl font-black">{p.credits}</p><p className="text-xs uppercase text-silver-400">credits · {p.name}</p>
              <p className="mt-3 font-display text-xl font-bold red-text">{formatMoney(pr.minor, currency)}</p>
            </Link>
          );
        })}
      </div>
      <h2 className="mb-3 mt-10 font-display text-lg font-bold uppercase">Ledger</h2>
      <div className="glass overflow-x-auto"><table className="table-x min-w-[640px]">
        <thead><tr><th>Date</th><th>Reason</th><th>Reference</th><th className="text-right">Change</th><th className="text-right">Balance</th></tr></thead>
        <tbody>
          {ledger.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap text-silver-400">{formatDate(l.createdAt, true)}</td>
              <td>{l.reason}</td>
              <td className="text-xs text-silver-600">{l.refType === "order" ? <Link className="link" href={`/dashboard/orders/${l.refId}`}>order</Link> : l.refType === "subscription" ? <Link className="link" href={`/dashboard/subscriptions/${l.refId}`}>subscription</Link> : l.refType ?? ""}</td>
              <td className={`text-right font-display font-bold ${l.delta > 0 ? "text-emerald-300" : "text-crimson-300"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</td>
              <td className="text-right">{l.balanceAfter}</td>
            </tr>
          ))}
          {!ledger.length && <tr><td colSpan={5} className="py-8 text-center text-silver-400">No credit activity yet.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
