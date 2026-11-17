"use server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireAdmin, requireStaff, destroyAllSessions } from "@/lib/auth";
import { fd, zodError, reqStr, optStr, optInt, intStr, money, optMoney, checkbox, list, type ActionState } from "@/lib/forms";
import { audit } from "@/lib/audit";
import { adjustCredits } from "@/lib/credits";
import { fulfillOrder } from "@/lib/orders";
import { approveManualSubscription, rejectManualSubscription } from "@/lib/subscriptions";
import { saveSetting } from "@/lib/settings";
import { slugify, addMonths } from "@/lib/utils";
import { sendEmail } from "@/lib/notify";
import { runRenewalReminders } from "@/lib/reminders";

const fail = (e: unknown): ActionState => { unstable_rethrow(e); if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input." }; return { error: e instanceof Error ? e.message : "Something went wrong." }; };
const uuid = z.uuid();
const done = (message: string, path?: string): ActionState => { if (path) revalidatePath(path); else revalidatePath("/", "layout"); return { ok: true, message }; };

/* --------------------------------- Panels --------------------------------- */
const PanelSchema = z.object({
  name: reqStr(2, 80, "Name"), slug: optStr(60), tagline: optStr(140), description: optStr(5000), logoUrl: z.union([z.literal(""), z.url("Enter a full https:// URL")]).optional().transform((v) => v || null),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #DC143C"), panelType: reqStr(2, 40, "Panel type"),
  liveChannels: optInt(), movies: optInt(), series: optInt(), statsVerified: checkbox,
  streamQuality: list, devices: list, features: list, creditSystem: optStr(200),
  creditsPerMonth: intStr(1, 100), minCreditPurchase: intStr(1, 100000), startingPrice: money,
  trialAvailable: checkbox, trialHours: optInt(1, 720), licenseNote: optStr(1000),
  isFeatured: checkbox, isActive: checkbox, isSample: checkbox, sortOrder: intStr(-1000, 1000),
  providerAdapter: z.enum(["manual", "generic"]),
});

export async function savePanel(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const id = formData.get("id") ? String(formData.get("id")) : null;
    const parsed = PanelSchema.safeParse(fd(formData));
    if (!parsed.success) return zodError(parsed.error);
    const { startingPrice, slug, ...d } = parsed.data;
    const values = { ...d, slug: slugify(slug || d.name), startingPriceCents: startingPrice };
    const [clash] = await db.select({ id: schema.panels.id }).from(schema.panels).where(eq(schema.panels.slug, values.slug));
    if (clash && clash.id !== id) return { error: "Another panel already uses that slug.", fieldErrors: { slug: "Slug in use" } };
    if (id) {
      await db.update(schema.panels).set(values).where(eq(schema.panels.id, uuid.parse(id)));
      await audit(admin.id, "panel.updated", "panel", id);
      return done("Panel saved.");
    }
    const [p] = await db.insert(schema.panels).values(values).returning();
    await audit(admin.id, "panel.created", "panel", p.id);
    redirect(`/admin/panels/${p.id}?created=1`);
  } catch (e) { return fail(e); }
}

export async function deletePanel(formData: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.subscriptions).where(eq(schema.subscriptions.panelId, id));
  if (n > 0) {
    await db.update(schema.panels).set({ isActive: false }).where(eq(schema.panels.id, id));
    await audit(admin.id, "panel.deactivated", "panel", id, { reason: "has subscriptions" });
  } else {
    await db.delete(schema.panels).where(eq(schema.panels.id, id));
    await audit(admin.id, "panel.deleted", "panel", id);
  }
  redirect("/admin/panels");
}

const PlanSchema = z.object({
  panelId: uuid, name: reqStr(1, 60, "Name"), durationMonths: intStr(1, 60), creditCost: intStr(1, 1000), maxConnections: intStr(1, 10),
  suggestedRetail: optMoney, isActive: checkbox, sortOrder: intStr(-1000, 1000),
});
export async function savePlan(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const id = formData.get("id") ? uuid.parse(formData.get("id")) : null;
    const parsed = PlanSchema.safeParse(fd(formData));
    if (!parsed.success) return zodError(parsed.error);
    const { suggestedRetail, ...d } = parsed.data;
    const values = { ...d, suggestedRetailCents: suggestedRetail };
    if (id) await db.update(schema.plans).set(values).where(eq(schema.plans.id, id));
    else await db.insert(schema.plans).values(values);
    await audit(admin.id, id ? "plan.updated" : "plan.created", "plan", id ?? undefined, { panelId: d.panelId });
    return done("Plan saved.");
  } catch (e) { return fail(e); }
}
export async function deletePlan(formData: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  await db.delete(schema.plans).where(eq(schema.plans.id, id));
  await audit(admin.id, "plan.deleted", "plan", id);
  revalidatePath("/admin/panels");
}

/* ----------------------------- Credit packages ----------------------------- */
const PackageSchema = z.object({
  name: reqStr(1, 60, "Name"), credits: intStr(1, 1_000_000), priceUsd: money, priceAed: optMoney, pricePhp: optMoney,
  terms: optStr(1000), isCustom: checkbox, highlight: checkbox, isActive: checkbox, isSample: checkbox, sortOrder: intStr(-1000, 1000),
});
export async function savePackage(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const id = formData.get("id") ? uuid.parse(formData.get("id")) : null;
    const parsed = PackageSchema.safeParse(fd(formData));
    if (!parsed.success) return zodError(parsed.error);
    const { priceUsd, priceAed, pricePhp, ...d } = parsed.data;
    const values = { ...d, priceUsdCents: priceUsd, priceAedFils: priceAed, pricePhpCentavos: pricePhp };
    if (id) await db.update(schema.creditPackages).set(values).where(eq(schema.creditPackages.id, id));
    else await db.insert(schema.creditPackages).values(values);
    await audit(admin.id, id ? "package.updated" : "package.created", "credit_package", id ?? undefined, { priceUsd });
    return done(id ? "Package saved." : "Package created.");
  } catch (e) { return fail(e); }
}
export async function deletePackage(formData: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(eq(schema.orders.creditPackageId, id));
  if (n > 0) await db.update(schema.creditPackages).set({ isActive: false }).where(eq(schema.creditPackages.id, id));
  else await db.delete(schema.creditPackages).where(eq(schema.creditPackages.id, id));
  await audit(admin.id, n ? "package.deactivated" : "package.deleted", "credit_package", id);
  revalidatePath("/admin/packages");
}

/* -------------------------------- Resellers -------------------------------- */
export async function setResellerStatus(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const p = z.object({ id: uuid, status: z.enum(["ACTIVE", "SUSPENDED", "REJECTED", "PENDING"]), note: optStr(500) }).parse(fd(formData));
    if (p.id === admin.id) return { error: "You can't change your own status." };
    const [u] = await db.update(schema.users).set({ status: p.status, ...(p.note ? { adminNotes: p.note } : {}) }).where(eq(schema.users.id, p.id)).returning();
    if (p.status === "SUSPENDED" || p.status === "REJECTED") await destroyAllSessions(p.id);
    await audit(admin.id, `reseller.${p.status.toLowerCase()}`, "user", p.id, { note: p.note });
    if (p.status === "ACTIVE") await sendEmail(u.email, "Your reseller account is approved", `Hi ${u.name},\n\nYour BTN TV STREAMZ reseller account has been approved. Sign in at ${process.env.APP_URL}/login to buy credits and activate subscriptions.`).catch(() => undefined);
    return done(`Status set to ${p.status}.`);
  } catch (e) { return fail(e); }
}

export async function adjustResellerCredits(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const parsed = z.object({
      userId: uuid, direction: z.enum(["add", "deduct"]), amount: intStr(1, 1_000_000), reason: reqStr(5, 300, "Reason"),
    }).safeParse(fd(formData));
    if (!parsed.success) return zodError(parsed.error);
    const d = parsed.data;
    const delta = d.direction === "add" ? d.amount : -d.amount;
    const balance = await db.transaction(async (tx) => {
      const b = await adjustCredits(tx, { userId: d.userId, delta, reason: `Admin adjustment: ${d.reason}`, refType: "admin_adjustment", actorId: admin.id });
      await audit(admin.id, "credits.adjusted", "user", d.userId, { delta, reason: d.reason, balanceAfter: b }, tx);
      return b;
    });
    return done(`Credits ${d.direction === "add" ? "added" : "deducted"}. New balance: ${balance}.`);
  } catch (e) { return fail(e); }
}

export async function updateResellerAdmin(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const p = z.object({ id: uuid, adminNotes: optStr(2000), role: z.enum(["RESELLER", "STAFF", "ADMIN"]) }).parse(fd(formData));
    if (p.id === admin.id && p.role !== "ADMIN") return { error: "You can't remove your own admin role." };
    await db.update(schema.users).set({ adminNotes: p.adminNotes, role: p.role }).where(eq(schema.users.id, p.id));
    await audit(admin.id, "user.updated", "user", p.id, { role: p.role });
    return done("Saved.");
  } catch (e) { return fail(e); }
}

/* ------------------------------ Subscriptions ------------------------------ */
export async function reviewSubscription(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    const p = z.object({ id: uuid, decision: z.enum(["approve", "reject"]), note: optStr(1000) }).parse(fd(formData));
    if (p.decision === "approve") await approveManualSubscription(p.id, staff.id, p.note);
    else await rejectManualSubscription(p.id, staff.id, p.note);
    return done(p.decision === "approve" ? "Approved — credits deducted and subscription activated." : "Request rejected. No credits were deducted.");
  } catch (e) { return fail(e); }
}

export async function adminEditSubscription(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const parsed = z.object({
      id: uuid, adminNotes: optStr(2000), status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
      expiresAt: z.string().optional(), providerRef: optStr(120), extendMonths: z.string().optional(),
    }).safeParse(fd(formData));
    if (!parsed.success) return zodError(parsed.error);
    const d = parsed.data;
    const [cur] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, d.id));
    if (!cur) return { error: "Not found" };
    if (cur.status === "PENDING" || cur.status === "REJECTED") return { error: "Use approve/reject for pending requests." };
    let expiresAt = d.expiresAt ? new Date(d.expiresAt + "T23:59:59Z") : cur.expiresAt;
    if (d.extendMonths && Number(d.extendMonths) > 0) expiresAt = addMonths(expiresAt ?? new Date(), Number(d.extendMonths));
    if (expiresAt && isNaN(+expiresAt)) return { error: "Invalid date" };
    const status = d.status ?? cur.status;
    await db.update(schema.subscriptions).set({ adminNotes: d.adminNotes, providerRef: d.providerRef, expiresAt, status: status === "EXPIRED" && expiresAt && expiresAt > new Date() ? "ACTIVE" : status }).where(eq(schema.subscriptions.id, d.id));
    await audit(admin.id, "subscription.admin_edit", "subscription", d.id, { from: { status: cur.status, expiresAt: cur.expiresAt }, to: { status, expiresAt } });
    return done("Subscription updated (no credits changed).");
  } catch (e) { return fail(e); }
}

/* --------------------------------- Orders --------------------------------- */
export async function verifyBankOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const p = z.object({ id: uuid, decision: z.enum(["confirm", "reject"]), note: optStr(500) }).parse(fd(formData));
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, p.id));
    if (!o || o.method !== "BANK_TRANSFER") return { error: "Only bank-transfer orders are verified manually. Card orders are confirmed by the payment provider." };
    if (p.decision === "confirm") {
      await fulfillOrder(o.id, { verifiedById: admin.id, source: "admin:bank_verification" });
      if (p.note) await db.update(schema.orders).set({ adminNotes: p.note }).where(eq(schema.orders.id, o.id));
      const [u] = await db.select().from(schema.users).where(eq(schema.users.id, o.userId));
      await sendEmail(u.email, `Payment confirmed — order #${o.number}`, `We've verified your transfer. ${o.credits} credits have been added to your account.`).catch(() => undefined);
      return done(`Payment verified. ${o.credits} credits added.`);
    }
    await db.update(schema.orders).set({ status: "FAILED", adminNotes: p.note, verifiedById: admin.id }).where(and(eq(schema.orders.id, o.id), sql`${schema.orders.creditedAt} IS NULL`));
    await audit(admin.id, "order.rejected", "order", o.id, { note: p.note });
    return done("Order marked as failed.");
  } catch (e) { return fail(e); }
}

export async function refundOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const p = z.object({ id: uuid, note: reqStr(3, 500, "Reason") }).parse(fd(formData));
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, p.id)).for("update");
      if (!o || o.status !== "PAID") throw new Error("Only paid orders can be refunded.");
      await adjustCredits(tx, { userId: o.userId, delta: -o.credits, reason: `Refund of order #${o.number}`, refType: "order", refId: o.id, actorId: admin.id });
      await tx.update(schema.orders).set({ status: "REFUNDED", adminNotes: p.note }).where(eq(schema.orders.id, o.id));
      await audit(admin.id, "order.refunded", "order", o.id, { note: p.note }, tx);
    });
    return done("Order marked refunded and credits reversed. Issue the money refund in your payment provider / bank.");
  } catch (e) { return fail(e); }
}

/* ---------------------------------- Leads ---------------------------------- */
export async function updateLead(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    const p = z.object({ id: uuid, type: z.enum(["trial", "inquiry"]), status: z.enum(["NEW", "CONTACTED", "APPROVED", "DECLINED", "CLOSED"]), adminNotes: optStr(2000) }).parse(fd(formData));
    const table = p.type === "trial" ? schema.trialRequests : schema.inquiries;
    await db.update(table).set({ status: p.status, adminNotes: p.adminNotes }).where(eq(table.id, p.id));
    await audit(staff.id, `${p.type}.updated`, p.type, p.id, { status: p.status });
    return done("Updated.");
  } catch (e) { return fail(e); }
}

/* ----------------------------------- FAQ ----------------------------------- */
export async function saveFaq(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const id = formData.get("id") ? uuid.parse(formData.get("id")) : null;
    const parsed = z.object({ category: reqStr(1, 60, "Category"), question: reqStr(5, 300, "Question"), answer: reqStr(5, 5000, "Answer"), isPublished: checkbox, sortOrder: intStr(-1000, 1000) }).safeParse(fd(formData));
    if (!parsed.success) return zodError(parsed.error);
    if (id) await db.update(schema.faqs).set(parsed.data).where(eq(schema.faqs.id, id));
    else await db.insert(schema.faqs).values(parsed.data);
    await audit(admin.id, id ? "faq.updated" : "faq.created", "faq", id ?? undefined);
    return done("FAQ saved.");
  } catch (e) { return fail(e); }
}
export async function deleteFaq(formData: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  await db.delete(schema.faqs).where(eq(schema.faqs.id, id));
  await audit(admin.id, "faq.deleted", "faq", id);
  revalidatePath("/admin/faq");
}

/* --------------------------------- Settings -------------------------------- */
const s = (max = 300) => z.string().max(max).optional().transform((v) => v ?? "");
const SettingsSchemas = {
  site: z.object({ brandName: reqStr(2, 40, "Brand name"), logoUrl: z.union([z.literal(""), z.url()]).optional().transform((v) => v ?? ""), tagline: s(140), heroHeadline: s(140), heroSub: s(300), aboutTitle: s(140), aboutBody: s(6000), complianceNote: s(600) }),
  contact: z.object({ whatsapp: z.string().regex(/^\+?[\d\s()-]{6,20}$/, "Use an international number like +9715…"), telegram: z.string().regex(/^[A-Za-z0-9_]{3,40}$/, "Telegram username without @"), email: z.email(), salesEmail: z.email(), phone: s(40), hours: s(120), address: s(200) }),
  currency: z.object({ AED: z.coerce.number().positive().max(1000), PHP: z.coerce.number().positive().max(10000), defaultCurrency: z.enum(["USD", "AED", "PHP"]) }),
  payments: z.object({ bankTransferEnabled: checkbox, bankName: s(120), accountName: s(120), accountNumber: s(60), iban: s(60), swift: s(20), localWalletInstructions: s(500), instructions: s(800) }),
  notifications: z.object({ reminderDays: z.string().transform((v) => [...new Set(v.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => n > 0 && n <= 60))]), emailReminders: checkbox, whatsappReminders: checkbox, adminNotifyEmail: z.union([z.literal(""), z.email()]).optional().transform((v) => v ?? "") }),
};

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const group = String(formData.get("group")) as keyof typeof SettingsSchemas;
    const schemaFor = SettingsSchemas[group];
    if (!schemaFor) return { error: "Unknown settings group" };
    const parsed = schemaFor.safeParse(fd(formData));
    if (!parsed.success) return zodError(parsed.error);
    if (group === "currency") {
      const d = parsed.data as z.infer<typeof SettingsSchemas.currency>;
      await saveSetting("currency", { rates: { USD: 1, AED: d.AED, PHP: d.PHP }, defaultCurrency: d.defaultCurrency, ratesUpdatedAt: new Date().toISOString().slice(0, 10) });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveSetting(group, parsed.data as any);
    }
    await audit(admin.id, "settings.updated", "settings", group);
    return done("Settings saved.");
  } catch (e) { return fail(e); }
}

export async function runRemindersNow(_: ActionState): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const r = await runRenewalReminders();
    await audit(admin.id, "reminders.manual_run", undefined, undefined, r);
    return { ok: true, message: `Checked ${r.checked}: ${r.email} email, ${r.whatsapp} WhatsApp sent, ${r.skipped} skipped, ${r.failed} failed.` };
  } catch (e) { return fail(e); }
}
