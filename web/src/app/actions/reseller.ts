"use server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser, requireActiveReseller, hashPassword, verifyPassword, destroyAllSessions, createSession } from "@/lib/auth";
import { fd, zodError, reqStr, optStr, phone, password, checkbox, money, type ActionState } from "@/lib/forms";
import { audit } from "@/lib/audit";
import { getAdapter } from "@/lib/provider";
import { provisionViaApi } from "@/lib/subscriptions";
import { packagePrice, isCurrency, CURRENCIES } from "@/lib/currency";
import { getSettings } from "@/lib/settings";
import { getStripe, cardPaymentsEnabled } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";

const fail = (e: unknown): ActionState => {
  unstable_rethrow(e);
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input." };
  return { error: e instanceof Error ? e.message : "Something went wrong." };
};

/* ------------------------------- Customers ------------------------------- */
const CustomerSchema = z.object({
  name: reqStr(2, 120, "Name"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]).optional().transform((v) => (v ? v.toLowerCase() : null)),
  phone, whatsapp: phone, country: optStr(60), notes: optStr(2000),
  remindEmail: checkbox, remindWhatsapp: checkbox,
});

async function ownCustomer(resellerId: string, id: string) {
  const [c] = await db.select().from(schema.customers).where(and(eq(schema.customers.id, id), eq(schema.customers.resellerId, resellerId)));
  if (!c) throw new Error("Customer not found.");
  return c;
}

export async function createCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  const u = await requireUser();
  const parsed = CustomerSchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const [c] = await db.insert(schema.customers).values({ ...parsed.data, resellerId: u.id }).returning();
  await audit(u.id, "customer.created", "customer", c.id);
  revalidatePath("/dashboard/customers");
  return { ok: true, message: `${c.name} added.` };
}

export async function updateCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  const u = await requireUser();
  const id = String(formData.get("id"));
  try { await ownCustomer(u.id, id); } catch (e) { return fail(e); }
  const parsed = CustomerSchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  await db.update(schema.customers).set(parsed.data).where(eq(schema.customers.id, id));
  revalidatePath(`/dashboard/customers/${id}`);
  return { ok: true, message: "Customer saved." };
}

export async function deleteCustomer(formData: FormData) {
  const u = await requireUser();
  const id = String(formData.get("id"));
  await ownCustomer(u.id, id);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.subscriptions)
    .where(and(eq(schema.subscriptions.customerId, id), sql`${schema.subscriptions.status} IN ('ACTIVE','PENDING')`));
  if (n > 0) throw new Error("This customer has active or pending subscriptions.");
  await db.delete(schema.customers).where(eq(schema.customers.id, id));
  await audit(u.id, "customer.deleted", "customer", id);
  redirect("/dashboard/customers");
}

/* ----------------------------- Subscriptions ----------------------------- */
const NewSubSchema = z.object({
  customerId: z.string().optional(),
  newCustomerName: optStr(120), newCustomerWhatsapp: phone, newCustomerEmail: z.string().optional(),
  planId: z.uuid("Choose a plan"),
  deviceType: optStr(60), resellerNotes: optStr(1000), renewalOfId: z.string().optional(),
});

export async function createSubscription(_: ActionState, formData: FormData): Promise<ActionState> {
  let u;
  try { u = await requireActiveReseller(); } catch (e) { return fail(e); }
  const parsed = NewSubSchema.safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  const [plan] = await db.select({ pl: schema.plans, p: schema.panels }).from(schema.plans)
    .innerJoin(schema.panels, eq(schema.plans.panelId, schema.panels.id))
    .where(and(eq(schema.plans.id, d.planId), eq(schema.plans.isActive, true), eq(schema.panels.isActive, true)));
  if (!plan) return { error: "That plan is no longer available." };
  if (u.creditBalance < plan.pl.creditCost) return { error: `Not enough credits: this plan needs ${plan.pl.creditCost}, you have ${u.creditBalance}.` };

  let customerId = d.customerId || null;
  if (customerId) {
    try { await ownCustomer(u.id, customerId); } catch (e) { return fail(e); }
  } else {
    if (!d.newCustomerName) return { error: "Select a customer or enter a new customer name.", fieldErrors: { newCustomerName: "Required" } };
    const em = d.newCustomerEmail ? z.email().safeParse(d.newCustomerEmail) : null;
    if (em && !em.success) return { error: "Enter a valid customer email.", fieldErrors: { newCustomerEmail: "Invalid email" } };
    const [c] = await db.insert(schema.customers).values({ resellerId: u.id, name: d.newCustomerName, whatsapp: d.newCustomerWhatsapp, email: em?.data?.toLowerCase() ?? null }).returning();
    customerId = c.id;
  }
  let renewalOfId: string | null = null;
  if (d.renewalOfId) {
    const [prev] = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.id, d.renewalOfId), eq(schema.subscriptions.resellerId, u.id)));
    if (!prev) return { error: "Original subscription not found." };
    renewalOfId = prev.id;
  }

  const adapter = getAdapter(plan.p);
  const [sub] = await db.insert(schema.subscriptions).values({
    customerId: customerId!, resellerId: u.id, panelId: plan.p.id, planId: plan.pl.id, planName: plan.pl.name,
    durationMonths: plan.pl.durationMonths, creditCost: plan.pl.creditCost, deviceType: d.deviceType,
    resellerNotes: d.resellerNotes, renewalOfId, status: "PENDING", provisioning: adapter ? "API" : "MANUAL",
  }).returning();
  await audit(u.id, renewalOfId ? "subscription.renewal_requested" : "subscription.requested", "subscription", sub.id, { plan: plan.pl.name, mode: adapter ? "api" : "manual" });

  if (adapter) {
    const r = await provisionViaApi(sub.id, u.id).catch((e) => ({ ok: false as const, error: (e as Error).message }));
    if (!r.ok) return { error: r.error };
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/subscriptions/${sub.id}?created=1`);
}

async function ownSub(resellerId: string, id: string) {
  const [s] = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.resellerId, resellerId)));
  if (!s) throw new Error("Subscription not found.");
  return s;
}

export async function cancelPendingSubscription(formData: FormData) {
  const u = await requireUser();
  const id = String(formData.get("id"));
  const s = await ownSub(u.id, id);
  if (s.status !== "PENDING") throw new Error("Only pending requests can be cancelled.");
  await db.update(schema.subscriptions).set({ status: "CANCELLED" }).where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.status, "PENDING")));
  await audit(u.id, "subscription.cancelled", "subscription", id);
  revalidatePath(`/dashboard/subscriptions/${id}`);
}

export async function updateSubscriptionNotes(_: ActionState, formData: FormData): Promise<ActionState> {
  const u = await requireUser();
  const parsed = z.object({ id: z.uuid(), resellerNotes: optStr(2000), deviceType: optStr(60), autoRemind: checkbox }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  try { await ownSub(u.id, parsed.data.id); } catch (e) { return fail(e); }
  const { id, ...rest } = parsed.data;
  await db.update(schema.subscriptions).set(rest).where(eq(schema.subscriptions.id, id));
  revalidatePath(`/dashboard/subscriptions/${id}`);
  return { ok: true, message: "Saved." };
}

export async function recordCustomerPayment(_: ActionState, formData: FormData): Promise<ActionState> {
  const u = await requireUser();
  const parsed = z.object({
    subscriptionId: z.uuid(), amount: money, currency: z.enum(CURRENCIES), method: optStr(60), note: optStr(500),
    paidAt: z.string().optional().transform((v) => (v ? new Date(v + "T12:00:00Z") : new Date())),
  }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;
  try { await ownSub(u.id, d.subscriptionId); } catch (e) { return fail(e); }
  if (isNaN(+d.paidAt)) return { error: "Invalid date" };
  await db.insert(schema.customerPayments).values({ subscriptionId: d.subscriptionId, resellerId: u.id, amountMinor: d.amount, currency: d.currency, method: d.method, note: d.note, paidAt: d.paidAt });
  revalidatePath(`/dashboard/subscriptions/${d.subscriptionId}`);
  return { ok: true, message: "Payment recorded." };
}

/* --------------------------------- Orders -------------------------------- */
export async function createOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  let u;
  try { u = await requireActiveReseller(); } catch (e) { return fail(e); }
  if (!(await rateLimit("order", 20, 60 * 60_000))) return { error: "Too many orders created. Please wait." };
  const parsed = z.object({ packageId: z.uuid(), currency: z.string(), method: z.enum(["CARD", "BANK_TRANSFER"]) }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const { packageId, currency, method } = parsed.data;
  if (!isCurrency(currency)) return { error: "Unsupported currency." };
  const [pkg] = await db.select().from(schema.creditPackages).where(and(eq(schema.creditPackages.id, packageId), eq(schema.creditPackages.isActive, true)));
  if (!pkg || pkg.isCustom) return { error: "This package can't be purchased online." };
  const s = await getSettings();
  const price = packagePrice(pkg, currency, s.currency.rates);
  if (method === "BANK_TRANSFER" && !s.payments.bankTransferEnabled) return { error: "Bank transfer is currently unavailable." };
  if (method === "CARD" && !cardPaymentsEnabled()) return { error: "Card payments are not configured yet. Please choose bank transfer." };

  const [order] = await db.insert(schema.orders).values({
    userId: u.id, creditPackageId: pkg.id, description: `${pkg.name} — ${pkg.credits} credits`, credits: pkg.credits,
    currency, amountMinor: price.minor, method, status: "PENDING_PAYMENT",
  }).returning();
  await audit(u.id, "order.created", "order", order.id, { method, currency, amount: price.minor });

  if (method === "CARD") {
    const stripe = getStripe()!;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: u.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      line_items: [{ quantity: 1, price_data: { currency: currency.toLowerCase(), unit_amount: price.minor, product_data: { name: `${pkg.credits} reseller credits (${pkg.name})` } } }],
      success_url: `${process.env.APP_URL}/dashboard/orders/${order.id}?checkout=success`,
      cancel_url: `${process.env.APP_URL}/dashboard/orders/${order.id}?checkout=cancelled`,
    });
    await db.update(schema.orders).set({ providerSessionId: session.id }).where(eq(schema.orders.id, order.id));
    redirect(session.url!);
  }
  redirect(`/dashboard/orders/${order.id}`);
}

export async function submitBankReference(_: ActionState, formData: FormData): Promise<ActionState> {
  const u = await requireUser();
  const parsed = z.object({ orderId: z.uuid(), bankReference: reqStr(3, 120, "Reference"), proofNote: optStr(1000) }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;
  const [o] = await db.update(schema.orders).set({ bankReference: d.bankReference, proofNote: d.proofNote, status: "AWAITING_VERIFICATION" })
    .where(and(eq(schema.orders.id, d.orderId), eq(schema.orders.userId, u.id), eq(schema.orders.method, "BANK_TRANSFER"),
      sql`${schema.orders.status} IN ('PENDING_PAYMENT','AWAITING_VERIFICATION')`)).returning();
  if (!o) return { error: "This order can't be updated." };
  await audit(u.id, "order.bank_reference_submitted", "order", o.id);
  revalidatePath(`/dashboard/orders/${o.id}`);
  return { ok: true, message: "Thanks — our team will verify the transfer and add your credits." };
}

export async function cancelOrder(formData: FormData) {
  const u = await requireUser();
  const id = String(formData.get("id"));
  await db.update(schema.orders).set({ status: "CANCELLED" })
    .where(and(eq(schema.orders.id, id), eq(schema.orders.userId, u.id), eq(schema.orders.status, "PENDING_PAYMENT")));
  await audit(u.id, "order.cancelled", "order", id);
  revalidatePath(`/dashboard/orders/${id}`);
}

/* -------------------------------- Account -------------------------------- */
export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const u = await requireUser();
  const parsed = z.object({
    name: reqStr(2, 100, "Name"), businessName: optStr(120), phone, whatsapp: phone, country: optStr(60),
    preferredCurrency: z.enum(CURRENCIES), notifyEmail: checkbox, notifyWhatsapp: checkbox,
  }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  await db.update(schema.users).set(parsed.data).where(eq(schema.users.id, u.id));
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Profile updated." };
}

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const u = await requireUser();
  const parsed = z.object({ current: z.string().min(1, "Required"), password, confirm: z.string() })
    .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" }).safeParse(fd(formData));
  if (!parsed.success) return zodError(parsed.error);
  const [row] = await db.select({ h: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, u.id));
  if (!(await verifyPassword(parsed.data.current, row.h))) return { error: "Current password is incorrect.", fieldErrors: { current: "Incorrect" } };
  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(schema.users.id, u.id));
  await destroyAllSessions(u.id);
  await createSession(u.id);
  await audit(u.id, "auth.password_changed", "user", u.id);
  return { ok: true, message: "Password changed. Other sessions were signed out." };
}
