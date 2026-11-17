import { cookies } from "next/headers";
import type { CreditPackage } from "@/db/schema";
import { getSettings } from "./settings";

export const CURRENCIES = ["USD", "AED", "PHP"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const isCurrency = (c: unknown): c is Currency => CURRENCIES.includes(c as Currency);

export function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 100);
}

/** Convert USD cents to `currency` minor units using admin-configured rates, rounding to whole minor units. */
export function convertFromUsd(usdCents: number, currency: string, rates: Record<string, number>) {
  const rate = rates[currency];
  if (!rate || rate <= 0) throw new Error(`No exchange rate configured for ${currency}`);
  return Math.round(usdCents * rate);
}

export function packagePrice(pkg: CreditPackage, currency: Currency, rates: Record<string, number>) {
  if (currency === "USD") return { minor: pkg.priceUsdCents, converted: false };
  const override = currency === "AED" ? pkg.priceAedFils : pkg.pricePhpCentavos;
  if (override !== null && override !== undefined) return { minor: override, converted: false };
  return { minor: convertFromUsd(pkg.priceUsdCents, currency, rates), converted: true };
}

export async function getDisplayCurrency(): Promise<Currency> {
  const c = (await cookies()).get("currency")?.value;
  if (isCurrency(c)) return c;
  const s = await getSettings();
  return isCurrency(s.currency.defaultCurrency) ? s.currency.defaultCurrency : "USD";
}

export async function getRates() {
  return (await getSettings()).currency.rates;
}

export function priceIn(usdCents: number, currency: string, rates: Record<string, number>) {
  return currency === "USD" ? usdCents : convertFromUsd(usdCents, currency, rates);
}
