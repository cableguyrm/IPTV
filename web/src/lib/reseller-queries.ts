import { and, desc, eq, sql, gte, lte, ilike, or, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";

export async function resellerStats(resellerId: string) {
  const [r] = await db.select({
    active: sql<number>`count(*) FILTER (WHERE status = 'ACTIVE')::int`,
    expiring: sql<number>`count(*) FILTER (WHERE status = 'ACTIVE' AND expires_at <= now() + interval '7 days')::int`,
    expired: sql<number>`count(*) FILTER (WHERE status = 'EXPIRED')::int`,
    pending: sql<number>`count(*) FILTER (WHERE status = 'PENDING')::int`,
  }).from(schema.subscriptions).where(eq(schema.subscriptions.resellerId, resellerId));
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.customers).where(eq(schema.customers.resellerId, resellerId));
  return { ...r, customers: c.n };
}

export type SubFilter = "all" | "active" | "expiring" | "expired" | "pending" | "renewals";

export function subFilterSql(f: SubFilter): SQL | undefined {
  const s = schema.subscriptions;
  switch (f) {
    case "active": return eq(s.status, "ACTIVE");
    case "expiring": return and(eq(s.status, "ACTIVE"), lte(s.expiresAt, sql`now() + interval '7 days'`));
    case "renewals": return and(eq(s.status, "ACTIVE"), lte(s.expiresAt, sql`now() + interval '30 days'`));
    case "expired": return eq(s.status, "EXPIRED");
    case "pending": return eq(s.status, "PENDING");
    default: return undefined;
  }
}

export async function listSubscriptions(opts: { resellerId?: string; filter: SubFilter; q?: string; limit?: number }) {
  const s = schema.subscriptions;
  const conds = [opts.resellerId ? eq(s.resellerId, opts.resellerId) : undefined, subFilterSql(opts.filter)];
  if (opts.q) conds.push(or(ilike(schema.customers.name, `%${opts.q}%`), ilike(schema.customers.email, `%${opts.q}%`), ilike(schema.customers.whatsapp, `%${opts.q}%`), ilike(schema.panels.name, `%${opts.q}%`)));
  return db.select({ s, customerName: schema.customers.name, customerWhatsapp: schema.customers.whatsapp, customerEmail: schema.customers.email, panelName: schema.panels.name, resellerName: schema.users.name })
    .from(s)
    .innerJoin(schema.customers, eq(s.customerId, schema.customers.id))
    .innerJoin(schema.panels, eq(s.panelId, schema.panels.id))
    .innerJoin(schema.users, eq(s.resellerId, schema.users.id))
    .where(and(...conds.filter(Boolean)))
    .orderBy(opts.filter === "expiring" || opts.filter === "renewals" ? s.expiresAt : desc(s.createdAt))
    .limit(opts.limit ?? 500);
}

export async function recentLedger(userId: string, limit = 10) {
  return db.select().from(schema.creditLedger).where(eq(schema.creditLedger.userId, userId)).orderBy(desc(schema.creditLedger.createdAt)).limit(limit);
}

export async function monthlyReport(resellerId: string) {
  const since = sql`date_trunc('month', now()) - interval '11 months'`;
  const credits = await db.execute<{ month: string; spent: number; bought: number }>(sql`
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COALESCE(-SUM(delta) FILTER (WHERE delta < 0 AND ref_type = 'subscription'), 0)::int AS spent,
      COALESCE(SUM(delta) FILTER (WHERE ref_type = 'order'), 0)::int AS bought
    FROM credit_ledger WHERE user_id = ${resellerId} AND created_at >= ${since}
    GROUP BY 1 ORDER BY 1`);
  const revenue = await db.execute<{ month: string; currency: string; total: number }>(sql`
    SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month, currency, SUM(amount_minor)::int AS total
    FROM customer_payments WHERE reseller_id = ${resellerId} AND paid_at >= ${since}
    GROUP BY 1, 2 ORDER BY 1`);
  const activations = await db.execute<{ month: string; n: number }>(sql`
    SELECT to_char(date_trunc('month', activated_at), 'YYYY-MM') AS month, count(*)::int AS n
    FROM subscriptions WHERE reseller_id = ${resellerId} AND activated_at >= ${since} GROUP BY 1 ORDER BY 1`);
  const byPanel = await db.execute<{ name: string; n: number; credits: number }>(sql`
    SELECT p.name, count(*)::int AS n, SUM(s.credit_cost)::int AS credits FROM subscriptions s JOIN panels p ON p.id = s.panel_id
    WHERE s.reseller_id = ${resellerId} AND s.status IN ('ACTIVE','EXPIRED') GROUP BY p.name ORDER BY n DESC`);
  return { credits: credits.rows, revenue: revenue.rows, activations: activations.rows, byPanel: byPanel.rows };
}

export { gte };
