import { cache } from "react";
import { db, schema } from "@/db";
import { inArray } from "drizzle-orm";

export const DEFAULT_SETTINGS = {
  site: {
    brandName: "BTN TV STREAMZ",
    logoUrl: "",
    tagline: "Premium IPTV Reseller Platform",
    heroHeadline: "Your Ultimate IPTV Reseller Platform",
    heroSub: "Explore Premium Reseller Panels, Flexible Plans and Powerful Subscription Management Tools.",
    aboutTitle: "Built for resellers who run a real business",
    aboutBody:
      "BTN TV STREAMZ is a reseller marketplace and subscription management platform serving the UAE, the Philippines and international markets. We list reseller panels from providers we are authorised to work with, sell wholesale credits, and give every reseller the tools to manage customers, renewals and support in one place.\n\nWe only advertise and distribute services for which the necessary licensing or authorisation is in place. If you believe a listing infringes your rights, contact us and we will review it promptly.",
    complianceNote:
      "We only list services for which the business holds the necessary licensing or distribution authorisation. Channel and content availability is set by each provider and may vary by region.",
  },
  contact: {
    whatsapp: "+971500000000",
    telegram: "btntvstreamz",
    email: "support@example.com",
    salesEmail: "sales@example.com",
    phone: "+971 50 000 0000",
    hours: "Every day, 10:00–22:00 GST (UTC+4)",
    address: "Dubai, United Arab Emirates",
  },
  currency: {
    // Units of currency per 1 USD. Edit in Admin › Settings.
    rates: { USD: 1, AED: 3.6725, PHP: 58.5 } as Record<string, number>,
    defaultCurrency: "USD",
    ratesUpdatedAt: "2026-11-01",
  },
  payments: {
    bankTransferEnabled: true,
    bankName: "Sample Bank PJSC (replace in Admin › Settings)",
    accountName: "BTN TV STREAMZ (sample)",
    accountNumber: "0000000000",
    iban: "AE00 0000 0000 0000 0000 000",
    swift: "SAMPAEAD",
    localWalletInstructions: "GCash / Maya (Philippines): send to 09XX XXX XXXX (sample). Include your order number as reference.",
    instructions: "Use your order number as the payment reference. Credits are added after our team verifies the transfer (usually within 2–12 hours).",
  },
  notifications: {
    reminderDays: [7, 3, 1] as number[],
    emailReminders: true,
    whatsappReminders: false,
    adminNotifyEmail: "",
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingsKey = keyof Settings;
const KEYS = Object.keys(DEFAULT_SETTINGS) as SettingsKey[];

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, KEYS));
    const out = structuredClone(DEFAULT_SETTINGS) as Settings;
    for (const r of rows) {
      const k = r.key as SettingsKey;
      (out as Record<string, unknown>)[k] = { ...DEFAULT_SETTINGS[k], ...(r.value as object) };
    }
    return out;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveSetting<K extends SettingsKey>(key: K, value: Partial<Settings[K]>) {
  const current = (await getSettings())[key];
  const merged = { ...current, ...value };
  await db.insert(schema.settings).values({ key, value: merged })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: merged, updatedAt: new Date() } });
}

export function waLink(number: string, text?: string) {
  const n = number.replace(/[^\d]/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
