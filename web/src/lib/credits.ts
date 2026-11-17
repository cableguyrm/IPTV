import { sql, eq } from "drizzle-orm";
import { schema } from "@/db";
import type { Tx } from "@/db";

export class InsufficientCreditsError extends Error {
  constructor() { super("Insufficient credit balance."); }
}

/**
 * Atomically change a user's credit balance and record a ledger entry.
 * Must run inside a transaction. Never allows the balance to go negative.
 */
export async function adjustCredits(
  tx: Tx,
  p: { userId: string; delta: number; reason: string; refType?: string; refId?: string; actorId?: string | null },
) {
  if (!Number.isInteger(p.delta) || p.delta === 0) throw new Error("Credit delta must be a non-zero integer.");
  const updated = await tx
    .update(schema.users)
    .set({ creditBalance: sql`${schema.users.creditBalance} + ${p.delta}` })
    .where(sql`${schema.users.id} = ${p.userId} AND ${schema.users.creditBalance} + ${p.delta} >= 0`)
    .returning({ balance: schema.users.creditBalance });
  if (!updated[0]) {
    const exists = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, p.userId));
    if (!exists[0]) throw new Error("User not found.");
    throw new InsufficientCreditsError();
  }
  await tx.insert(schema.creditLedger).values({
    userId: p.userId, delta: p.delta, balanceAfter: updated[0].balance, reason: p.reason,
    refType: p.refType, refId: p.refId, actorId: p.actorId ?? null,
  });
  return updated[0].balance;
}
