import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { adjustCredits } from "./credits";
import { audit } from "./audit";

/**
 * Mark an order paid and credit the reseller. Idempotent: safe to call repeatedly
 * (e.g. Stripe webhook retries). Only call after the payment provider has confirmed
 * the payment, or after an administrator has verified a bank transfer.
 */
export async function fulfillOrder(orderId: string, opts: { providerPaymentId?: string; verifiedById?: string | null; source: string }) {
  return db.transaction(async (tx) => {
    const rows = await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    if (!rows.rows.length) throw new Error("Order not found");
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (order.creditedAt) return { alreadyFulfilled: true, order };
    if (order.status === "CANCELLED" || order.status === "REFUNDED") throw new Error(`Order is ${order.status}`);

    await adjustCredits(tx, {
      userId: order.userId, delta: order.credits, reason: `Credit purchase — order #${order.number}`,
      refType: "order", refId: order.id, actorId: opts.verifiedById ?? null,
    });
    const now = new Date();
    const [updated] = await tx.update(schema.orders).set({
      status: "PAID", paidAt: order.paidAt ?? now, creditedAt: now,
      providerPaymentId: opts.providerPaymentId ?? order.providerPaymentId,
      verifiedById: opts.verifiedById ?? order.verifiedById,
    }).where(eq(schema.orders.id, orderId)).returning();
    await audit(opts.verifiedById ?? null, "order.paid", "order", orderId, { source: opts.source, credits: order.credits }, tx);
    return { alreadyFulfilled: false, order: updated };
  });
}
