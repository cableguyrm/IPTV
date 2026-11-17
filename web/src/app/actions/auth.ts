"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, destroySession, destroyAllSessions, hashPassword, verifyPassword, randomToken, sha256 } from "@/lib/auth";
import { fd, zodError, email, password, reqStr, optStr, phone, type ActionState } from "@/lib/forms";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

const RegisterSchema = z.object({
  name: reqStr(2, 100, "Name"),
  email,
  password,
  confirm: z.string(),
  businessName: optStr(120),
  whatsapp: phone,
  country: z.enum(["AE", "PH", "OTHER"], { message: "Select a country" }),
  expectedVolume: optStr(60),
  applicationNote: optStr(1000),
  terms: z.literal("on", { message: "You must accept the terms" }),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("register", 5, 60 * 60_000))) return { error: "Too many attempts. Please try again later." };
  const parsed = RegisterSchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, d.email));
  if (exists) return { error: "An account with this email already exists. Try signing in or resetting your password." };
  const [u] = await db.insert(schema.users).values({
    email: d.email, passwordHash: await hashPassword(d.password), name: d.name, businessName: d.businessName,
    whatsapp: d.whatsapp, country: d.country, expectedVolume: d.expectedVolume, applicationNote: d.applicationNote,
    preferredCurrency: d.country === "AE" ? "AED" : d.country === "PH" ? "PHP" : "USD",
    role: "RESELLER", status: "PENDING",
  }).returning({ id: schema.users.id });
  await audit(u.id, "reseller.registered", "user", u.id);
  await createSession(u.id);
  redirect("/dashboard?welcome=1");
}

const LoginSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(200), next: z.string().optional() });

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("login", 10, 15 * 60_000))) return { error: "Too many login attempts. Wait 15 minutes and try again." };
  const parsed = LoginSchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const { email: em, password: pw, next } = parsed.data;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, em));
  // Always run bcrypt to keep timing consistent
  const ok = await verifyPassword(pw, u?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali");
  if (!u || !ok) {
    await audit(u?.id ?? null, "auth.login_failed", "user", u?.id, { email: em });
    return { error: "Incorrect email or password." };
  }
  if (u.status === "SUSPENDED") return { error: "This account is suspended. Please contact support." };
  if (u.status === "REJECTED") return { error: "This reseller application was not approved. Contact support for details." };
  await createSession(u.id);
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, u.id));
  await audit(u.id, "auth.login", "user", u.id);
  redirect(safeNext(next) ?? (u.role === "RESELLER" ? "/dashboard" : "/admin"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("forgot", 5, 60 * 60_000))) return { error: "Too many requests. Try again later." };
  const parsed = z.object({ email }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email));
  if (u && u.status !== "REJECTED") {
    const token = randomToken();
    await db.insert(schema.passwordResets).values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) });
    const link = `${process.env.APP_URL}/reset-password?token=${token}`;
    await sendEmail(u.email, "Reset your BTN TV STREAMZ password", `Hi ${u.name},\n\nUse this link within 60 minutes to set a new password:\n${link}\n\nIf you didn't request this, you can ignore this email.`);
    await audit(u.id, "auth.reset_requested", "user", u.id);
  }
  return { ok: true, message: "If an account exists for that email, a reset link has been sent. It expires in 60 minutes." };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ token: z.string().min(20), password, confirm: z.string() })
    .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const [row] = await db.select().from(schema.passwordResets).where(and(
    eq(schema.passwordResets.tokenHash, sha256(parsed.data.token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date()),
  ));
  if (!row) return { error: "This reset link is invalid or has expired. Request a new one." };
  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(schema.users.id, row.userId));
    await tx.update(schema.passwordResets).set({ usedAt: new Date() }).where(eq(schema.passwordResets.id, row.id));
  });
  await destroyAllSessions(row.userId);
  await audit(row.userId, "auth.password_reset", "user", row.userId);
  return { ok: true, message: "Password updated. You can now sign in." };
}
