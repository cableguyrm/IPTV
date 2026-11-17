import {
  pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, uuid, serial, index, uniqueIndex, customType,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const roleEnum = pgEnum("role", ["ADMIN", "STAFF", "RESELLER"]);
export const userStatusEnum = pgEnum("user_status", ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]);
export const subStatusEnum = pgEnum("subscription_status", ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "REJECTED"]);
export const provisioningEnum = pgEnum("provisioning", ["MANUAL", "API"]);
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT", "AWAITING_VERIFICATION", "PAID", "FAILED", "CANCELLED", "REFUNDED",
]);
export const payMethodEnum = pgEnum("payment_method", ["CARD", "BANK_TRANSFER", "QUOTE"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED"]);
export const ticketCategoryEnum = pgEnum("ticket_category", [
  "LOGIN", "PAYMENT", "ACTIVATION", "DEVICE", "RENEWAL", "TECHNICAL", "OTHER",
]);
export const leadStatusEnum = pgEnum("lead_status", ["NEW", "CONTACTED", "APPROVED", "DECLINED", "CLOSED"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

/* ------------------------------ Accounts ------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  country: text("country"),
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  role: roleEnum("role").notNull().default("RESELLER"),
  status: userStatusEnum("status").notNull().default("PENDING"),
  creditBalance: integer("credit_balance").notNull().default(0),
  applicationNote: text("application_note"),
  expectedVolume: text("expected_volume"),
  adminNotes: text("admin_notes"),
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifyWhatsapp: boolean("notify_whatsapp").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("password_resets_token_uq").on(t.tokenHash)]);

/* ------------------------------ Catalog ------------------------------ */

export const panels = pgTable("panels", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").default("#DC143C"),
  panelType: text("panel_type").notNull().default("IPTV"), // e.g. IPTV, VOD-only, Hybrid
  liveChannels: integer("live_channels"),
  movies: integer("movies"),
  series: integer("series"),
  statsVerified: boolean("stats_verified").notNull().default(false),
  streamQuality: text("stream_quality").array().notNull().default([]), // SD, HD, FHD, 4K
  devices: text("devices").array().notNull().default([]),
  creditSystem: text("credit_system"), // human description e.g. "1 credit = 1 month"
  creditsPerMonth: integer("credits_per_month").notNull().default(1),
  minCreditPurchase: integer("min_credit_purchase").notNull().default(10),
  startingPriceCents: integer("starting_price_cents").notNull().default(0), // USD cents, reseller price
  trialAvailable: boolean("trial_available").notNull().default(false),
  trialHours: integer("trial_hours"),
  features: text("features").array().notNull().default([]),
  licenseNote: text("license_note"), // authorisation / licensing statement shown on details page
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isSample: boolean("is_sample").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  providerAdapter: text("provider_adapter").notNull().default("manual"), // manual | generic
  providerPackageMap: jsonb("provider_package_map").$type<Record<string, string>>(),
  ...timestamps,
}, (t) => [uniqueIndex("panels_slug_uq").on(t.slug)]);

/** Subscription packages sold to end customers through a panel. */
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  panelId: uuid("panel_id").notNull().references(() => panels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMonths: integer("duration_months").notNull(),
  creditCost: integer("credit_cost").notNull(),
  maxConnections: integer("max_connections").notNull().default(1),
  suggestedRetailCents: integer("suggested_retail_cents"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [index("plans_panel_idx").on(t.panelId)]);

/** Wholesale reseller credit packages. Prices are stored per currency (minor units). */
export const creditPackages = pgTable("credit_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  priceUsdCents: integer("price_usd_cents").notNull(),
  priceAedFils: integer("price_aed_fils"), // optional override; null => converted from USD
  pricePhpCentavos: integer("price_php_centavos"),
  terms: text("terms"),
  isCustom: boolean("is_custom").notNull().default(false), // "contact us" wholesale quote
  highlight: boolean("highlight").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isSample: boolean("is_sample").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/* ------------------------- Customers & subscriptions ------------------------- */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  resellerId: uuid("reseller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  country: text("country"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  remindEmail: boolean("remind_email").notNull().default(false),
  remindWhatsapp: boolean("remind_whatsapp").notNull().default(false),
  isSample: boolean("is_sample").notNull().default(false),
  ...timestamps,
}, (t) => [index("customers_reseller_idx").on(t.resellerId)]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  resellerId: uuid("reseller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  panelId: uuid("panel_id").notNull().references(() => panels.id, { onDelete: "restrict" }),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  planName: text("plan_name").notNull(),
  durationMonths: integer("duration_months").notNull(),
  creditCost: integer("credit_cost").notNull(),
  deviceType: text("device_type"),
  status: subStatusEnum("status").notNull().default("PENDING"),
  provisioning: provisioningEnum("provisioning").notNull().default("MANUAL"),
  providerRef: text("provider_ref"),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  renewalOfId: uuid("renewal_of_id"),
  autoRemind: boolean("auto_remind").notNull().default(true),
  lastReminderAt: timestamp("last_reminder_at", { withTimezone: true }),
  resellerNotes: text("reseller_notes"),
  adminNotes: text("admin_notes"),
  reviewedById: uuid("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  isSample: boolean("is_sample").notNull().default(false),
  ...timestamps,
}, (t) => [
  index("subs_reseller_idx").on(t.resellerId),
  index("subs_customer_idx").on(t.customerId),
  index("subs_status_exp_idx").on(t.status, t.expiresAt),
]);

/** Payments the reseller records from their own end customers. */
export const customerPayments = pgTable("customer_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  resellerId: uuid("reseller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("USD"),
  method: text("method"),
  note: text("note"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("cust_pay_sub_idx").on(t.subscriptionId)]);

export const reminderLogs = pgTable("reminder_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // email | whatsapp | dashboard
  status: text("status").notNull(), // sent | failed | skipped
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------ Orders & credits ------------------------------ */

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: serial("number").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  creditPackageId: uuid("credit_package_id").references(() => creditPackages.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  credits: integer("credits").notNull(),
  currency: text("currency").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  status: orderStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  method: payMethodEnum("method").notNull(),
  providerSessionId: text("provider_session_id"),
  providerPaymentId: text("provider_payment_id"),
  bankReference: text("bank_reference"),
  proofNote: text("proof_note"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  creditedAt: timestamp("credited_at", { withTimezone: true }),
  verifiedById: uuid("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  adminNotes: text("admin_notes"),
  ...timestamps,
}, (t) => [uniqueIndex("orders_number_uq").on(t.number), index("orders_user_idx").on(t.userId)]);

export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason").notNull(),
  refType: text("ref_type"), // order | subscription | admin_adjustment
  refId: text("ref_id"),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ledger_user_idx").on(t.userId)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_created_idx").on(t.createdAt)]);

/* ------------------------------ Leads ------------------------------ */

export const trialRequests = pgTable("trial_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"),
  country: text("country"),
  panelId: uuid("panel_id").references(() => panels.id, { onDelete: "set null" }),
  device: text("device"),
  message: text("message"),
  status: leadStatusEnum("status").notNull().default("NEW"),
  adminNotes: text("admin_notes"),
  ...timestamps,
});

export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull().default("GENERAL"), // GENERAL | SALES | WHOLESALE | SUBSCRIPTION
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  panelId: uuid("panel_id").references(() => panels.id, { onDelete: "set null" }),
  status: leadStatusEnum("status").notNull().default("NEW"),
  adminNotes: text("admin_notes"),
  ...timestamps,
});

/* ------------------------------ Support ------------------------------ */

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: serial("number").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  accessTokenHash: text("access_token_hash"), // for guest tracking links
  category: ticketCategoryEnum("category").notNull(),
  subject: text("subject").notNull(),
  status: ticketStatusEnum("status").notNull().default("OPEN"),
  priority: text("priority").notNull().default("NORMAL"),
  ...timestamps,
}, (t) => [uniqueIndex("tickets_number_uq").on(t.number), index("tickets_user_idx").on(t.userId)]);

export const ticketMessages = pgTable("ticket_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  isStaff: boolean("is_staff").notNull().default(false),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ticket_msgs_ticket_idx").on(t.ticketId)]);

export const ticketAttachments = pgTable("ticket_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => ticketMessages.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------ Content ------------------------------ */

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull().default("General"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Panel = typeof panels.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type CreditPackage = typeof creditPackages.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
