"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { submitBankReference } from "@/app/actions/reseller";

export function BankRefForm({ orderId, existing }: { orderId: string; existing: string | null }) {
  return (
    <ActionForm action={submitBankReference} className="space-y-3 border-t border-white/10 pt-4">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="label" htmlFor="bankReference">Transfer reference / transaction ID</label>
      <input id="bankReference" name="bankReference" defaultValue={existing ?? ""} required className="input" />
      <label className="label" htmlFor="proofNote">Note (optional)</label>
      <textarea id="proofNote" name="proofNote" rows={2} className="input" placeholder="Sender name, bank, time of transfer…" />
      <SubmitButton className="btn-primary w-full">{existing ? "Update reference" : "I've paid — submit for verification"}</SubmitButton>
    </ActionForm>
  );
}

export function PrintButton() {
  return <button className="btn-ghost" onClick={() => window.print()}>Print / Save PDF</button>;
}
