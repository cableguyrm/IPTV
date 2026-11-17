import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { Notice } from "@/components/ui";
import { getDisplayCurrency, packagePrice, formatMoney, CURRENCIES } from "@/lib/currency";
import { getSettings } from "@/lib/settings";
import { cardPaymentsEnabled } from "@/lib/stripe";
import { CheckoutForm } from "./CheckoutForm";

export default async function Checkout({ params }: { params: Promise<{ packageId: string }> }) {
  const u = await requireReseller();
  const { packageId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(packageId)) notFound();
  const [pkg] = await db.select().from(schema.creditPackages).where(and(eq(schema.creditPackages.id, packageId), eq(schema.creditPackages.isActive, true)));
  if (!pkg || pkg.isCustom) notFound();
  const [s, currency] = await Promise.all([getSettings(), getDisplayCurrency()]);
  const prices = Object.fromEntries(CURRENCIES.map((c) => { const p = packagePrice(pkg, c, s.currency.rates); return [c, { label: formatMoney(p.minor, c), converted: p.converted }]; }));
  return (
    <>
      <PageTitle title="Checkout" sub={`${pkg.name} — ${pkg.credits} credits`} />
      {u.status !== "ACTIVE" && <div className="mb-6"><Notice tone="warn">Purchasing is available once your reseller account is approved.</Notice></div>}
      <CheckoutForm packageId={pkg.id} credits={pkg.credits} terms={pkg.terms} prices={prices} defaultCurrency={currency}
        cardEnabled={cardPaymentsEnabled()} bankEnabled={s.payments.bankTransferEnabled} disabled={u.status !== "ACTIVE"} />
    </>
  );
}
