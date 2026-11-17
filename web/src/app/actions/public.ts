"use server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { fd, zodError, email, reqStr, optStr, phone, type ActionState } from "@/lib/forms";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser, randomToken, sha256 } from "@/lib/auth";
import { parseAttachments } from "@/lib/attachments";
import { sendEmail } from "@/lib/notify";
import { getSettings } from "@/lib/settings";

async function panelIdFromSlug(slug?: string | null) {
  if (!slug) return null;
  const [p] = await db.select({ id: schema.panels.id }).from(schema.panels).where(eq(schema.panels.slug, slug));
  return p?.id ?? null;
}

async function notifyAdmin(subject: string, body: string) {
  const s = await getSettings();
  const to = s.notifications.adminNotifyEmail;
  if (to) await sendEmail(to, subject, body).catch(() => undefined);
}

const InquirySchema = z.object({
  kind: z.enum(["GENERAL", "SALES", "WHOLESALE", "SUBSCRIPTION"]).default("GENERAL"),
  name: reqStr(2, 100, "Name"), email, phone, subject: optStr(150),
  message: reqStr(10, 3000, "Message"), panel: optStr(80),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitInquiry(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("inquiry", 5, 60 * 60_000))) return { error: "Too many messages. Please try again later or reach us on WhatsApp." };
  const parsed = InquirySchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;
  await db.insert(schema.inquiries).values({ kind: d.kind, name: d.name, email: d.email, phone: d.phone, subject: d.subject, message: d.message, panelId: await panelIdFromSlug(d.panel) });
  await notifyAdmin(`New ${d.kind.toLowerCase()} inquiry from ${d.name}`, `${d.subject ?? ""}\n\n${d.message}\n\nReply to: ${d.email}`);
  return { ok: true, message: "Thanks! Our team will get back to you shortly (usually within a few hours)." };
}

const TrialSchema = z.object({
  name: reqStr(2, 100, "Name"), email, whatsapp: phone, country: optStr(60),
  panel: optStr(80), device: optStr(60), message: optStr(1000), website: z.string().max(0).optional(),
});

export async function submitTrial(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("trial", 3, 24 * 60 * 60_000))) return { error: "You've already submitted trial requests today. We'll be in touch." };
  const parsed = TrialSchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;
  await db.insert(schema.trialRequests).values({ name: d.name, email: d.email, whatsapp: d.whatsapp, country: d.country, device: d.device, message: d.message, panelId: await panelIdFromSlug(d.panel) });
  await notifyAdmin(`New trial request from ${d.name}`, `Panel: ${d.panel ?? "any"}\nDevice: ${d.device ?? "-"}\n${d.message ?? ""}`);
  return { ok: true, message: "Trial request received. Trials are reviewed manually — we'll contact you by email or WhatsApp." };
}

const CATEGORIES = ["LOGIN", "PAYMENT", "ACTIVATION", "DEVICE", "RENEWAL", "TECHNICAL", "OTHER"] as const;
const TicketSchema = z.object({
  category: z.enum(CATEGORIES, { message: "Choose a category" }),
  subject: reqStr(4, 150, "Subject"), body: reqStr(10, 5000, "Description"),
  guestName: optStr(100), guestEmail: z.string().optional(),
});

export async function submitTicket(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("ticket", 8, 60 * 60_000))) return { error: "Too many tickets submitted. Please wait before opening another." };
  const parsed = TicketSchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;
  const user = await getCurrentUser();
  let guestEmail: string | null = null;
  if (!user) {
    const e = email.safeParse(d.guestEmail ?? "");
    if (!e.success || !d.guestName) return { error: "Please enter your name and a valid email.", fieldErrors: { guestEmail: "Valid email required", guestName: d.guestName ? "" : "Name required" } };
    guestEmail = e.data;
  }
  const { files, error } = await parseAttachments(formData);
  if (error) return { error, fieldErrors: { attachments: error } };

  const token = user ? null : randomToken(24);
  const ticket = await db.transaction(async (tx) => {
    const [t] = await tx.insert(schema.tickets).values({
      userId: user?.id ?? null, guestName: user ? null : d.guestName, guestEmail,
      accessTokenHash: token ? sha256(token) : null, category: d.category, subject: d.subject,
    }).returning();
    const [m] = await tx.insert(schema.ticketMessages).values({ ticketId: t.id, authorId: user?.id ?? null, body: d.body }).returning();
    if (files.length) await tx.insert(schema.ticketAttachments).values(files.map((f) => ({ ...f, ticketId: t.id, messageId: m.id })));
    return t;
  });
  await notifyAdmin(`New support ticket #${ticket.number}: ${d.subject}`, d.body);
  if (user) redirect(`/dashboard/tickets/${ticket.id}`);
  const link = `/support/ticket/${ticket.number}?t=${token}`;
  await sendEmail(guestEmail!, `Ticket #${ticket.number} received`, `We've received your ticket "${d.subject}".\nTrack it here: ${process.env.APP_URL}${link}\nKeep this link private.`);
  redirect(link);
}
