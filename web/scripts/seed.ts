import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

/**
 * Development seed. Everything created here is clearly flagged as SAMPLE data
 * (is_sample = true / "Sample" in names) and can be edited or deleted from the admin dashboard.
 * Run: npm run db:seed   (add --reset to wipe sample rows first)
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

async function main() {
  if (process.argv.includes("--reset")) {
    await db.execute(sql`DELETE FROM users WHERE email LIKE '%@sample.btntv.test'`);
    await db.execute(sql`DELETE FROM panels WHERE is_sample = true`);
    await db.execute(sql`DELETE FROM credit_packages WHERE is_sample = true`);
    await db.execute(sql`DELETE FROM faqs`);
    await db.execute(sql`DELETE FROM trial_requests WHERE email LIKE '%@sample.btntv.test'`);
    await db.execute(sql`DELETE FROM inquiries WHERE email LIKE '%@sample.btntv.test'`);
  }
  const existing = await db.execute(sql`SELECT count(*)::int AS n FROM panels WHERE is_sample = true`);
  if ((existing.rows[0] as { n: number }).n > 0) { console.log("Sample data already present (use --reset to recreate)."); return pool.end(); }

  // Admin
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await db.insert(schema.users).values({
      email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      name: "Administrator", role: "ADMIN", status: "ACTIVE",
    }).onConflictDoNothing();
  }

  const P = (o: Partial<typeof schema.panels.$inferInsert> & { slug: string; name: string }) => o as typeof schema.panels.$inferInsert;
  const panelRows = await db.insert(schema.panels).values([
    P({ slug: "sample-aurora", name: "Sample Panel Aurora", tagline: "Hybrid live + VOD panel", panelType: "Hybrid", accentColor: "#DC143C",
      description: "SAMPLE LISTING for development. Replace with an authorised provider's panel from Admin › Panels.",
      liveChannels: 1200, movies: 8000, series: 1500, statsVerified: true, streamQuality: ["HD", "FHD", "4K"],
      devices: ["Android TV", "Fire TV", "Smart TV (Samsung/LG)", "iOS", "Android", "Windows", "MAG"], creditSystem: "1 credit = 1 month",
      creditsPerMonth: 1, minCreditPurchase: 10, startingPriceCents: 450, trialAvailable: true, trialHours: 24, isFeatured: true, sortOrder: 1,
      features: ["Reseller sub-panel", "Multi-connection plans", "EPG support"], isSample: true,
      licenseNote: "Sample listing — no real licensing claim. Add the provider's authorisation details here." }),
    P({ slug: "sample-nebula", name: "Sample Panel Nebula", tagline: "Regional sports & entertainment focus", panelType: "IPTV", accentColor: "#8B5CF6",
      description: "SAMPLE LISTING for development.", liveChannels: 650, movies: 3000, series: 600, statsVerified: true,
      streamQuality: ["HD", "FHD"], devices: ["Android TV", "Fire TV", "Android", "iOS", "Web player"], creditSystem: "1 credit = 1 month; 12 months = 10 credits",
      creditsPerMonth: 1, minCreditPurchase: 25, startingPriceCents: 380, trialAvailable: true, trialHours: 12, isFeatured: true, sortOrder: 2, isSample: true,
      features: ["Bulk activation", "Customer self-service portal"] }),
    P({ slug: "sample-vertex", name: "Sample Panel Vertex", tagline: "VOD library panel", panelType: "VOD", accentColor: "#0EA5E9",
      description: "SAMPLE LISTING for development. Content counts not verified.", statsVerified: false,
      streamQuality: ["FHD", "4K"], devices: ["Smart TV (Samsung/LG)", "Apple TV", "iOS", "Android", "Windows", "macOS"], creditSystem: "2 credits = 1 month",
      creditsPerMonth: 2, minCreditPurchase: 10, startingPriceCents: 300, trialAvailable: false, isFeatured: true, sortOrder: 3, isSample: true }),
    P({ slug: "sample-orbit", name: "Sample Panel Orbit", tagline: "Budget starter panel", panelType: "IPTV", accentColor: "#F59E0B",
      description: "SAMPLE LISTING for development. Content counts not verified.", statsVerified: false, streamQuality: ["SD", "HD"],
      devices: ["Android", "Android TV", "MAG", "Enigma2"], creditSystem: "1 credit = 1 month", creditsPerMonth: 1, minCreditPurchase: 10,
      startingPriceCents: 250, trialAvailable: true, trialHours: 6, sortOrder: 4, isSample: true }),
  ]).returning();

  const planRows = [];
  for (const p of panelRows) {
    const per = p.creditsPerMonth;
    planRows.push(...(await db.insert(schema.plans).values([
      { panelId: p.id, name: "1 Month", durationMonths: 1, creditCost: 1 * per, suggestedRetailCents: 1500, sortOrder: 1 },
      { panelId: p.id, name: "3 Months", durationMonths: 3, creditCost: 3 * per, suggestedRetailCents: 4000, sortOrder: 2 },
      { panelId: p.id, name: "6 Months", durationMonths: 6, creditCost: 6 * per, suggestedRetailCents: 7000, sortOrder: 3 },
      { panelId: p.id, name: "12 Months", durationMonths: 12, creditCost: p.slug === "sample-nebula" ? 10 : 12 * per, suggestedRetailCents: 12000, sortOrder: 4 },
    ]).returning()));
  }

  await db.insert(schema.creditPackages).values([
    { name: "Starter", credits: 10, priceUsdCents: 4500, terms: "Credits never expire. Non-refundable once used.", sortOrder: 1, isSample: true },
    { name: "Growth", credits: 25, priceUsdCents: 10500, terms: "Credits never expire.", sortOrder: 2, isSample: true },
    { name: "Pro", credits: 50, priceUsdCents: 19500, priceAedFils: 71500, pricePhpCentavos: 1130000, terms: "Credits never expire. Priority support.", highlight: true, sortOrder: 3, isSample: true },
    { name: "Business", credits: 100, priceUsdCents: 36000, terms: "Credits never expire. Priority support.", sortOrder: 4, isSample: true },
    { name: "Enterprise", credits: 250, priceUsdCents: 82500, terms: "Dedicated account manager.", sortOrder: 5, isSample: true },
    { name: "Custom Wholesale", credits: 500, priceUsdCents: 0, isCustom: true, terms: "500+ credits, white-label options and volume pricing. Contact sales for a quote.", sortOrder: 6, isSample: true },
  ]);

  await db.insert(schema.faqs).values([
    { category: "Getting started", question: "How do I become a reseller?", answer: "Register a reseller account, tell us about your business, and our team will review your application — usually within 24 hours. Once approved you can buy credits and activate subscriptions.", sortOrder: 1 },
    { category: "Getting started", question: "Which countries do you support?", answer: "We serve resellers in the United Arab Emirates, the Philippines and internationally. Prices can be displayed in AED, PHP and USD.", sortOrder: 2 },
    { category: "Credits", question: "What is a credit?", answer: "Credits are the wholesale unit used to activate customer subscriptions. Each panel defines how many credits a plan costs (for example 1 credit = 1 month). Your balance and every deduction are visible in your dashboard ledger.", sortOrder: 1 },
    { category: "Credits", question: "Do credits expire?", answer: "Credit expiry is defined per package — see the terms on each pricing card.", sortOrder: 2 },
    { category: "Credits", question: "When are credits deducted?", answer: "Only when a subscription is actually activated — either instantly through an integrated provider API or after an administrator confirms a manual activation request. Rejected requests never cost credits.", sortOrder: 3 },
    { category: "Payments", question: "Which payment methods are accepted?", answer: "Card payments (including Apple Pay and Google Pay where available) via our secure payment provider, and bank transfer / local wallet transfer with manual verification. An order is only marked paid after the payment provider confirms it or our team verifies the transfer.", sortOrder: 1 },
    { category: "Payments", question: "Can I get a refund?", answer: "Unused credits may be eligible for a refund within the window described in our Refund Policy. Used credits are non-refundable.", sortOrder: 2 },
    { category: "Trials", question: "Do you offer trials?", answer: "Panels marked “Trial” offer a short test line. Submit a trial request and our team will contact you.", sortOrder: 1 },
    { category: "Content", question: "Is the content licensed?", answer: "We only list services for which the business holds the necessary licensing or distribution authorisation. If you are a rights holder with a concern, please contact us.", sortOrder: 1 },
    { category: "Support", question: "How do I get help?", answer: "Open a ticket in the Support Center (you can attach screenshots), or contact us on WhatsApp, Telegram or email. Ticket status can be tracked at any time.", sortOrder: 1 },
  ]);

  // Sample reseller accounts
  const pw = await bcrypt.hash("SampleReseller1", 12);
  const [reseller] = await db.insert(schema.users).values({
    email: "reseller@sample.btntv.test", passwordHash: pw, name: "Sample Reseller", businessName: "Sample Streams Trading",
    country: "AE", whatsapp: "+971500000001", role: "RESELLER", status: "ACTIVE", creditBalance: 0,
  }).returning();
  await db.insert(schema.users).values({
    email: "applicant@sample.btntv.test", passwordHash: pw, name: "Sample Applicant", businessName: "Sample Manila Media",
    country: "PH", whatsapp: "+639170000000", role: "RESELLER", status: "PENDING", expectedVolume: "50–100 customers",
    applicationNote: "SAMPLE application — approve or reject from Admin › Resellers.",
  });
  // credit grant through the ledger (sample)
  await db.execute(sql`UPDATE users SET credit_balance = 60 WHERE id = ${reseller.id}`);
  await db.insert(schema.creditLedger).values({ userId: reseller.id, delta: 60, balanceAfter: 60, reason: "SAMPLE opening balance", refType: "admin_adjustment" });

  const custData = [
    ["Sample Customer — Ahmed", "AE", 25], ["Sample Customer — Maria", "PH", 5], ["Sample Customer — John", "GB", -3],
    ["Sample Customer — Fatima", "AE", 2], ["Sample Customer — Paolo", "PH", 120], ["Sample Customer — Liam", "US", null],
  ] as const;
  for (const [i, [name, country, exp]] of custData.entries()) {
    const [c] = await db.insert(schema.customers).values({
      resellerId: reseller.id, name, country, email: `customer${i + 1}@sample.btntv.test`, whatsapp: `+97150000010${i}`, isSample: true, remindEmail: true,
    }).returning();
    const panel = panelRows[i % 2];
    const months = i % 3 === 0 || (exp !== null && exp > 30) ? 12 : 1;
    const plan = planRows.find((pl) => pl.panelId === panel.id && pl.durationMonths === months)!;
    const pending = exp === null;
    const [sub] = await db.insert(schema.subscriptions).values({
      customerId: c.id, resellerId: reseller.id, panelId: panel.id, planId: plan.id, planName: plan.name, durationMonths: plan.durationMonths,
      creditCost: plan.creditCost, deviceType: ["Android TV", "Fire TV", "Smart TV", "iOS", "MAG", "Android"][i],
      status: pending ? "PENDING" : exp < 0 ? "EXPIRED" : "ACTIVE",
      activatedAt: pending ? null : days((exp as number) - plan.durationMonths * 30), expiresAt: pending ? null : days(exp as number),
      isSample: true, resellerNotes: "Sample subscription",
    }).returning();
    if (!pending) await db.insert(schema.customerPayments).values({ subscriptionId: sub.id, resellerId: reseller.id, amountMinor: plan.suggestedRetailCents ?? 1500, currency: "USD", method: "Cash (sample)" });
  }

  await db.insert(schema.trialRequests).values({ name: "Sample Trial Lead", email: "lead@sample.btntv.test", whatsapp: "+639171234567", country: "PH", panelId: panelRows[0].id, device: "Fire TV", message: "SAMPLE trial request" });
  await db.insert(schema.inquiries).values({ kind: "WHOLESALE", name: "Sample Wholesale Lead", email: "wholesale@sample.btntv.test", subject: "500 credits quote", message: "SAMPLE inquiry about custom wholesale pricing." });
  const [t] = await db.insert(schema.tickets).values({ userId: reseller.id, category: "ACTIVATION", subject: "Sample ticket: activation taking long" }).returning();
  await db.insert(schema.ticketMessages).values({ ticketId: t.id, authorId: reseller.id, body: "SAMPLE ticket body. Customer is waiting for activation." });

  console.log("✔ sample data seeded");
  console.log("  Sample reseller login: reseller@sample.btntv.test / SampleReseller1");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
