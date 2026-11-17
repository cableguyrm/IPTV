import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export async function getActivePanels() {
  return db.select().from(schema.panels).where(eq(schema.panels.isActive, true))
    .orderBy(asc(schema.panels.sortOrder), asc(schema.panels.name));
}

export async function getPanelsWithPlans() {
  const [panels, plans] = await Promise.all([
    getActivePanels(),
    db.select().from(schema.plans).where(eq(schema.plans.isActive, true)).orderBy(asc(schema.plans.sortOrder), asc(schema.plans.durationMonths)),
  ]);
  return panels.map((p) => ({ ...p, plans: plans.filter((pl) => pl.panelId === p.id) }));
}

export async function getPanelBySlug(slug: string) {
  const [panel] = await db.select().from(schema.panels).where(and(eq(schema.panels.slug, slug), eq(schema.panels.isActive, true)));
  if (!panel) return null;
  const plans = await db.select().from(schema.plans)
    .where(and(eq(schema.plans.panelId, panel.id), eq(schema.plans.isActive, true)))
    .orderBy(asc(schema.plans.sortOrder), asc(schema.plans.durationMonths));
  return { ...panel, plans };
}

export async function getCreditPackages() {
  return db.select().from(schema.creditPackages).where(eq(schema.creditPackages.isActive, true))
    .orderBy(asc(schema.creditPackages.sortOrder), asc(schema.creditPackages.credits));
}

export async function getFaqs() {
  return db.select().from(schema.faqs).where(eq(schema.faqs.isPublished, true))
    .orderBy(asc(schema.faqs.category), asc(schema.faqs.sortOrder));
}

/** Flip ACTIVE subscriptions whose expiry has passed to EXPIRED. Cheap and idempotent. */
export async function syncExpiredSubscriptions() {
  await db.execute(sql`UPDATE subscriptions SET status = 'EXPIRED', updated_at = now() WHERE status = 'ACTIVE' AND expires_at < now()`);
}
