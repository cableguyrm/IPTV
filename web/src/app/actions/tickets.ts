"use server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { fd, zodError, reqStr, type ActionState } from "@/lib/forms";
import { getAccessibleTicket } from "@/lib/tickets";
import { parseAttachments } from "@/lib/attachments";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";

const ReplySchema = z.object({
  ticketId: z.uuid(), body: reqStr(2, 5000, "Message"), token: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
});

export async function replyTicket(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("ticket-reply", 30, 60 * 60_000))) return { error: "Too many replies. Please slow down." };
  const parsed = ReplySchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;
  const access = await getAccessibleTicket({ id: d.ticketId }, d.token);
  if (!access) return { error: "Ticket not found." };
  const { files, error } = await parseAttachments(formData);
  if (error) return { error };
  const { ticket, user, staff } = access;
  const nextStatus = staff ? (d.status ?? "AWAITING_CUSTOMER") : ticket.status === "CLOSED" || ticket.status === "RESOLVED" || ticket.status === "AWAITING_CUSTOMER" ? "OPEN" : ticket.status;
  await db.transaction(async (tx) => {
    const [m] = await tx.insert(schema.ticketMessages).values({ ticketId: ticket.id, authorId: user?.id ?? null, isStaff: staff, body: d.body }).returning();
    if (files.length) await tx.insert(schema.ticketAttachments).values(files.map((f) => ({ ...f, ticketId: ticket.id, messageId: m.id })));
    await tx.update(schema.tickets).set({ status: nextStatus }).where(eq(schema.tickets.id, ticket.id));
  });
  if (staff) {
    await audit(user!.id, "ticket.reply", "ticket", ticket.id, { status: nextStatus });
    let to = ticket.guestEmail;
    if (ticket.userId) { const [u] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, ticket.userId)); to = u?.email ?? null; }
    if (to) await sendEmail(to, `Update on ticket #${ticket.number}`, `Our support team replied to "${ticket.subject}":\n\n${d.body}`).catch(() => undefined);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Reply sent." };
}
