import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Tx } from "@/db";
import { adjustCredits } from "./credits";
import { addMonths } from "./utils";
import { audit } from "./audit";
import { getAdapter } from "./provider";

/** Start date for a (renewal) subscription: the later of now and the previous expiry. */
async function startDateFor(tx: Tx, renewalOfId: string | null) {
  const now = new Date();
  if (!renewalOfId) return now;
  const [prev] = await tx.select({ expiresAt: schema.subscriptions.expiresAt }).from(schema.subscriptions).where(eq(schema.subscriptions.id, renewalOfId));
  return prev?.expiresAt && prev.expiresAt > now ? prev.expiresAt : now;
}

/**
 * Approve a PENDING manual subscription: deduct credits and activate, atomically.
 * Throws InsufficientCreditsError if the reseller cannot cover the cost.
 */
export async function approveManualSubscription(subId: string, actorId: string, note?: string | null) {
  return db.transaction(async (tx) => {
    const [sub] = await tx.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.id, subId), eq(schema.subscriptions.status, "PENDING"))).for("update");
    if (!sub) throw new Error("Subscription is not pending.");
    await adjustCredits(tx, { userId: sub.resellerId, delta: -sub.creditCost, reason: `Activation: ${sub.planName}`, refType: "subscription", refId: sub.id, actorId });
    const start = await startDateFor(tx, sub.renewalOfId);
    const [updated] = await tx.update(schema.subscriptions).set({
      status: "ACTIVE", activatedAt: start, expiresAt: addMonths(start, sub.durationMonths),
      reviewedById: actorId, reviewedAt: new Date(), adminNotes: note ?? sub.adminNotes,
    }).where(eq(schema.subscriptions.id, sub.id)).returning();
    await audit(actorId, "subscription.approved", "subscription", sub.id, { credits: sub.creditCost }, tx);
    return updated;
  });
}

export async function rejectManualSubscription(subId: string, actorId: string, note?: string | null) {
  const [s] = await db.update(schema.subscriptions).set({ status: "REJECTED", reviewedById: actorId, reviewedAt: new Date(), adminNotes: note })
    .where(and(eq(schema.subscriptions.id, subId), eq(schema.subscriptions.status, "PENDING"))).returning();
  if (!s) throw new Error("Subscription is not pending.");
  await audit(actorId, "subscription.rejected", "subscription", subId, { note });
  return s;
}

/**
 * Provision through an authorised provider API. Credits are deducted first inside a transaction;
 * if the provider call fails the deduction is reversed and the request is marked REJECTED.
 */
export async function provisionViaApi(subId: string, actorId: string) {
  const [row] = await db.select({ s: schema.subscriptions, p: schema.panels, c: schema.customers }).from(schema.subscriptions)
    .innerJoin(schema.panels, eq(schema.subscriptions.panelId, schema.panels.id))
    .innerJoin(schema.customers, eq(schema.subscriptions.customerId, schema.customers.id))
    .where(eq(schema.subscriptions.id, subId));
  const adapter = row && getAdapter(row.p);
  if (!row || !adapter) throw new Error("No provider integration configured.");
  await db.transaction(async (tx) => {
    await adjustCredits(tx, { userId: row.s.resellerId, delta: -row.s.creditCost, reason: `Activation (API): ${row.s.planName}`, refType: "subscription", refId: subId, actorId });
  });
  try {
    const result = await adapter.provision({ panel: row.p, subscription: row.s, customer: row.c });
    const start = await db.transaction((tx) => startDateFor(tx, row.s.renewalOfId));
    await db.update(schema.subscriptions).set({
      status: "ACTIVE", provisioning: "API", providerRef: result.providerRef, activatedAt: start,
      expiresAt: result.expiresAt ?? addMonths(start, row.s.durationMonths),
    }).where(eq(schema.subscriptions.id, subId));
    await audit(actorId, "subscription.provisioned_api", "subscription", subId, { adapter: adapter.id });
    return { ok: true as const };
  } catch (e) {
    await db.transaction(async (tx) => {
      await adjustCredits(tx, { userId: row.s.resellerId, delta: row.s.creditCost, reason: `Refund: provider activation failed`, refType: "subscription", refId: subId, actorId: null });
      await tx.update(schema.subscriptions).set({ status: "REJECTED", adminNotes: `Provider error: ${(e as Error).message}`.slice(0, 500) }).where(eq(schema.subscriptions.id, subId));
    });
    await audit(actorId, "subscription.provision_failed", "subscription", subId, { error: (e as Error).message });
    return { ok: false as const, error: "The provider could not activate this subscription. Credits were returned to your balance." };
  }
}
