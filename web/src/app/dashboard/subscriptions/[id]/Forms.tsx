"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { updateSubscriptionNotes, recordCustomerPayment } from "@/app/actions/reseller";

export function SubNotesForm({ sub }: { sub: { id: string; resellerNotes: string | null; deviceType: string | null; autoRemind: boolean } }) {
  return (
    <ActionForm action={updateSubscriptionNotes} className="space-y-4">
      <input type="hidden" name="id" value={sub.id} />
      <Field label="Device" name="deviceType"><input id="deviceType" name="deviceType" defaultValue={sub.deviceType ?? ""} className="input" /></Field>
      <Field label="Notes" name="resellerNotes"><textarea id="resellerNotes" name="resellerNotes" rows={4} defaultValue={sub.resellerNotes ?? ""} className="input" /></Field>
      <label className="flex items-center gap-2 text-sm text-silver-400"><input type="checkbox" name="autoRemind" defaultChecked={sub.autoRemind} className="accent-crimson" /> Send renewal reminders</label>
      <SubmitButton className="btn-ghost w-full">Save</SubmitButton>
    </ActionForm>
  );
}

export function PaymentForm({ subscriptionId }: { subscriptionId: string }) {
  return (
    <ActionForm action={recordCustomerPayment} resetOnSuccess className="grid gap-3 sm:grid-cols-5">
      {(e) => (<>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <Field label="Amount" name="amount" error={e.amount}><input id="amount" name="amount" inputMode="decimal" placeholder="25.00" required className="input" /></Field>
        <Field label="Currency" name="currency"><select id="currency" name="currency" className="input"><option>USD</option><option>AED</option><option>PHP</option></select></Field>
        <Field label="Method" name="method"><input id="method" name="method" placeholder="Cash, GCash…" className="input" /></Field>
        <Field label="Date" name="paidAt"><input id="paidAt" name="paidAt" type="date" className="input" /></Field>
        <div className="flex items-end"><SubmitButton className="btn-primary w-full">Record</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
