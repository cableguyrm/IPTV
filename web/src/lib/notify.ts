import nodemailer from "nodemailer";

export const emailConfigured = () => !!process.env.SMTP_HOST;
export const whatsappConfigured = () => !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

export async function sendEmail(to: string, subject: string, text: string) {
  if (!emailConfigured()) {
    // Development fallback: do not print message bodies (they may contain reset links) in production.
    if (process.env.NODE_ENV !== "production") console.info(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return { ok: false, skipped: true as const, reason: "SMTP not configured" };
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
  return { ok: true as const };
}

/** Sends an approved WhatsApp template message via the Meta Cloud API. */
export async function sendWhatsAppTemplate(toE164: string, params: string[]) {
  if (!whatsappConfigured()) return { ok: false, skipped: true as const, reason: "WhatsApp API not configured" };
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toE164.replace(/[^\d]/g, ""),
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "renewal_reminder",
        language: { code: "en" },
        components: [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p })) }],
      },
    }),
  });
  if (!res.ok) return { ok: false as const, reason: `WhatsApp API ${res.status}` };
  return { ok: true as const };
}
