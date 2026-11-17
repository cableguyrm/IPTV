import { db, schema } from "@/db";
import type { Tx } from "@/db";
import { clientIp } from "./rate-limit";

export async function audit(
  actorId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
  tx?: Tx,
) {
  let ip: string | null = null;
  try { ip = await clientIp(); } catch { /* outside request scope */ }
  await (tx ?? db).insert(schema.auditLogs).values({ actorId, action, entity, entityId, meta, ip });
}
