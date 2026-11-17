import { and, eq, gte, isNotNull, lte, or, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSettings } from "./settings";
import { sendEmail, sendWhatsAppTemplate } from "./notify";
import { formatDate } from "./utils";

/**
 * Sends renewal reminders for ACTIVE subscriptions expiring within the configured windows.
 * Each subscription is reminded at most once per 20h. Only to customers who opted in (per-customer flags).
 */
export async function runRenewalReminders() {
  const s = await getSettings();
  const maxDays = Math.max(...s.notifications.reminderDays, 1);
  await db.execute(sql`UPDATE subscriptions SET status = 'EXPIRED', updated_at = now() WHERE status = 'ACTIVE' AND expires_at < now()`);
  const rows = await db.select({ sub: schema.subscriptions, c: schema.customers, r: schema.users, panel: schema.panels.name })
    .from(schema.subscriptions)
    .innerJoin(schema.customers, eq(schema.subscriptions.customerId, schema.customers.id))
    .innerJoin(schema.users, eq(schema.subscriptions.resellerId, schema.users.id))
    .innerJoin(schema.panels, eq(schema.subscriptions.panelId, schema.panels.id))
    .where(and(
      eq(schema.subscriptions.status, "ACTIVE"), eq(schema.subscriptions.autoRemind, true), isNotNull(schema.subscriptions.expiresAt),
      gte(schema.subscriptions.expiresAt, new Date()), lte(schema.subscriptions.expiresAt, new Date(Date.now() + maxDays * 86_400_000)),
      or(isNull(schema.subscriptions.lastReminderAt), lt(schema.subscriptions.lastReminderAt, new Date(Date.now() - 20 * 3_600_000))),
    ));
  const summary = { checked: rows.length, email: 0, whatsapp: 0, skipped: 0, failed: 0 };
  for (const { sub, c, r, panel } of rows) {
    const days = Math.ceil((sub.expiresAt!.getTime() - Date.now()) / 86_400_000);
    if (!s.notifications.reminderDays.includes(days)) { summary.skipped++; continue; }
    const contact = r.whatsapp ?? r.email;
    const log = async (channel: string, status: string, detail?: string) => db.insert(schema.reminderLogs).values({ subscriptionId: sub.id, channel, status, detail });
    if (s.notifications.emailReminders && c.remindEmail && c.email) {
      try {
        const res = await sendEmail(c.email, `Your ${panel} subscription expires in ${days} day(s)`,
          `Hi ${c.name},\n\nYour ${sub.planName} subscription expires on ${formatDate(sub.expiresAt)}.\nTo renew, contact ${r.businessName ?? r.name}${contact ? ` (${contact})` : ""}.\n\nThank you!`);
        await log("email", res.ok ? "sent" : "skipped", "reason" in res ? res.reason : undefined);
        res.ok ? summary.email++ : summary.skipped++;
      } catch (e) { await log("email", "failed", (e as Error).message); summary.failed++; }
    }
    if (s.notifications.whatsappReminders && c.remindWhatsapp && c.whatsapp) {
      try {
        const res = await sendWhatsAppTemplate(c.whatsapp, [c.name, panel, formatDate(sub.expiresAt), r.businessName ?? r.name]);
        await log("whatsapp", res.ok ? "sent" : "skipped", "reason" in res ? res.reason : undefined);
        res.ok ? summary.whatsapp++ : summary.skipped++;
      } catch (e) { await log("whatsapp", "failed", (e as Error).message); summary.failed++; }
    }
    await db.update(schema.subscriptions).set({ lastReminderAt: new Date() }).where(eq(schema.subscriptions.id, sub.id));
  }
  return summary;
}
