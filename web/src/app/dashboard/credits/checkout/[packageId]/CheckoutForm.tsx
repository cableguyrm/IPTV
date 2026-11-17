"use client";
import { useState } from "react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { createOrder } from "@/app/actions/reseller";
import { cn } from "@/lib/utils";

export function CheckoutForm({ packageId, credits, terms, prices, defaultCurrency, cardEnabled, bankEnabled, disabled }: {
  packageId: string; credits: number; terms: string | null; prices: Record<string, { label: string; converted: boolean }>;
  defaultCurrency: string; cardEnabled: boolean; bankEnabled: boolean; disabled: boolean;
}) {
  const [currency, setCurrency] = useState(defaultCurrency);
  const [method, setMethod] = useState(cardEnabled ? "CARD" : "BANK_TRANSFER");
  const [agree, setAgree] = useState(false);
  const Opt = ({ value, title, desc, enabled }: { value: string; title: string; desc: string; enabled: boolean }) => (
    <label className={cn("glass flex cursor-pointer gap-3 p-4 transition", method === value && "border-crimson/60 shadow-glow", !enabled && "cursor-not-allowed opacity-40")}>
      <input type="radio" name="method" value={value} checked={method === value} disabled={!enabled} onChange={() => setMethod(value)} className="mt-1 accent-crimson" />
      <span><span className="font-semibold">{title}</span><span className="block text-xs text-silver-400">{enabled ? desc : "Not configured"}</span></span>
    </label>
  );
  return (
    <ActionForm action={createOrder} className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <input type="hidden" name="packageId" value={packageId} />
        <fieldset>
          <legend className="label">Currency</legend>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(prices).map(([c, p]) => (
              <label key={c} className={cn("glass cursor-pointer p-4 text-center transition", currency === c && "border-crimson/60 shadow-glow")}>
                <input type="radio" name="currency" value={c} checked={currency === c} onChange={() => setCurrency(c)} className="sr-only" />
                <span className="block text-xs text-silver-400">{c}</span><span className="font-display text-lg font-bold">{p.label}</span>
                {p.converted && <span className="block text-[10px] text-silver-600">converted</span>}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="label">Payment method</legend>
          <Opt value="CARD" title="Card / Apple Pay / Google Pay" desc="Secure hosted checkout. Credits are added automatically once the payment provider confirms." enabled={cardEnabled} />
          <Opt value="BANK_TRANSFER" title="Bank transfer / local wallet (GCash, Maya)" desc="Pay manually and submit your reference. Credits are added after our team verifies the payment." enabled={bankEnabled} />
        </fieldset>
      </div>
      <aside className="glass h-fit space-y-4 p-6">
        <h2 className="font-display text-lg font-bold uppercase">Order summary</h2>
        <div className="flex justify-between text-sm"><span className="text-silver-400">Credits</span><span>{credits}</span></div>
        <div className="flex justify-between border-t border-white/10 pt-3"><span className="text-silver-400">Total</span><span className="font-display text-2xl font-black red-text">{prices[currency]?.label}</span></div>
        {terms && <p className="text-xs text-silver-400">{terms}</p>}
        <label className="flex items-start gap-2 text-xs text-silver-400"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-crimson" /> I agree to the <Link href="/terms" className="link">Terms</Link> and <Link href="/refund" className="link">Refund Policy</Link>.</label>
        {agree && !disabled ? <SubmitButton className="btn-primary w-full" pendingText="Creating order…">{method === "CARD" ? "Continue to secure payment" : "Place order"}</SubmitButton>
          : <button type="button" className="btn-primary w-full" disabled>{disabled ? "Awaiting account approval" : "Accept terms to continue"}</button>}
        <p className="text-[11px] text-silver-600">Your order is only marked paid after the payment provider confirms the transaction or our team verifies your transfer.</p>
      </aside>
    </ActionForm>
  );
}
