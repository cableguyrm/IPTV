import { asc, eq } from "drizzle-orm";
import { timingSafeEqual } from "crypto";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff, sha256 } from "./auth";

export const CATEGORY_LABELS: Record<string, string> = {
  LOGIN: "Login & account issues", PAYMENT: "Payment inquiries", ACTIVATION: "Activation problems",
  DEVICE: "Device configuration", RENEWAL: "Subscription renewals", TECHNICAL: "Technical issues", OTHER: "Other inquiries",
};

function tokenOk(hash: string | null, token?: string | null) {
  if (!hash || !token) return false;
  const a = Buffer.from(hash), b = Buffer.from(sha256(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns the ticket if the current viewer (staff, owner, or guest with token) may access it. */
export async function getAccessibleTicket(where: { id?: string; number?: number }, guestToken?: string | null) {
  const cond = where.id ? eq(schema.tickets.id, where.id) : eq(schema.tickets.number, where.number!);
  const [t] = await db.select().from(schema.tickets).where(cond);
  if (!t) return null;
  const user = await getCurrentUser();
  const staff = isStaff(user);
  const allowed = staff || (user && t.userId === user.id) || tokenOk(t.accessTokenHash, guestToken);
  if (!allowed) return null;
  return { ticket: t, user, staff };
}

export async function getTicketThread(ticketId: string) {
  const [messages, attachments] = await Promise.all([
    db.select({ m: schema.ticketMessages, authorName: schema.users.name }).from(schema.ticketMessages)
      .leftJoin(schema.users, eq(schema.ticketMessages.authorId, schema.users.id))
      .where(eq(schema.ticketMessages.ticketId, ticketId)).orderBy(asc(schema.ticketMessages.createdAt)),
    db.select({ id: schema.ticketAttachments.id, messageId: schema.ticketAttachments.messageId, filename: schema.ticketAttachments.filename, size: schema.ticketAttachments.size })
      .from(schema.ticketAttachments).where(eq(schema.ticketAttachments.ticketId, ticketId)),
  ]);
  return messages.map(({ m, authorName }) => ({ ...m, authorName, attachments: attachments.filter((a) => a.messageId === m.id) }));
}
