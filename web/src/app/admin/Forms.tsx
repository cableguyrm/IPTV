"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import * as A from "@/app/actions/admin";

export function StatusForm({ id, current }: { id: string; current: string }) {
  const options = [
    current !== "ACTIVE" && ["ACTIVE", "Approve / activate"],
    current === "PENDING" && ["REJECTED", "Reject application"],
    current === "ACTIVE" && ["SUSPENDED", "Suspend account"],
  ].filter(Boolean) as [string, string][];
  return (
    <ActionForm action={A.setResellerStatus} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Action" name="status"><select name="status" className="input">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="Note (optional, stored in admin notes)" name="note"><input name="note" className="input" /></Field>
      <SubmitButton className="btn-primary btn-sm">Apply</SubmitButton>
    </ActionForm>
  );
}

export function CreditAdjustForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={A.adjustResellerCredits} resetOnSuccess confirm="Apply this credit adjustment? It will be recorded in the audit log." className="space-y-3">
      {(e) => (<>
        <input type="hidden" name="userId" value={userId} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Action" name="direction"><select name="direction" className="input"><option value="add">Add credits</option><option value="deduct">Deduct credits</option></select></Field>
          <Field label="Amount" name="amount" error={e.amount}><input name="amount" type="number" min={1} required className="input" /></Field>
        </div>
        <Field label="Reason (required, audited)" name="reason" error={e.reason}><input name="reason" required minLength={5} className="input" /></Field>
        <SubmitButton className="btn-primary w-full">Apply adjustment</SubmitButton>
      </>)}
    </ActionForm>
  );
}

export function UserAdminForm({ id, adminNotes, role }: { id: string; adminNotes: string | null; role: string }) {
  return (
    <ActionForm action={A.updateResellerAdmin} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Role" name="role"><select name="role" defaultValue={role} className="input"><option value="RESELLER">Reseller</option><option value="STAFF">Staff (support)</option><option value="ADMIN">Administrator</option></select></Field>
      <Field label="Admin notes (private)" name="adminNotes"><textarea name="adminNotes" rows={3} defaultValue={adminNotes ?? ""} className="input" /></Field>
      <SubmitButton className="btn-ghost w-full">Save</SubmitButton>
    </ActionForm>
  );
}

function DecisionForm({ action, id, options, compact, confirm, notePlaceholder = "Note (optional)" }: {
  action: typeof A.reviewSubscription; id: string; options: [string, string, string][]; compact?: boolean; confirm?: string; notePlaceholder?: string;
}) {
  // One small form per decision so the decision never depends on which submit button was pressed.
  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
      {options.map(([value, label, cls]) => (
        <ActionForm key={value} action={action} confirm={confirm} className="flex items-center gap-2">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value={value} />
          <input name="note" placeholder={notePlaceholder} className={`input py-1.5 text-xs ${compact ? "max-w-[150px]" : ""}`} aria-label={`${label} note`} />
          <SubmitButton className={`${cls} btn-sm whitespace-nowrap`}>{label}</SubmitButton>
        </ActionForm>
      ))}
    </div>
  );
}

export function ReviewForm({ id, compact }: { id: string; compact?: boolean }) {
  return <DecisionForm action={A.reviewSubscription} id={id} compact={compact} options={[["approve", "Approve & deduct", "btn-primary"], ["reject", "Reject", "btn-danger"]]} />;
}

export function SubAdminForm({ s }: { s: { id: string; adminNotes: string | null; expiresAt: string | null; providerRef: string | null; status: string } }) {
  return (
    <ActionForm action={A.adminEditSubscription} className="space-y-3">
      <input type="hidden" name="id" value={s.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" name="status"><select name="status" defaultValue={s.status} className="input"><option>ACTIVE</option><option>EXPIRED</option><option>CANCELLED</option></select></Field>
        <Field label="Expiry date" name="expiresAt"><input type="date" name="expiresAt" defaultValue={s.expiresAt ?? ""} className="input" /></Field>
        <Field label="Extend by months" name="extendMonths"><select name="extendMonths" className="input"><option value="">—</option>{[1, 2, 3, 6, 12].map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Provider ref" name="providerRef"><input name="providerRef" defaultValue={s.providerRef ?? ""} className="input" /></Field>
      </div>
      <Field label="Admin notes" name="adminNotes"><textarea name="adminNotes" rows={3} defaultValue={s.adminNotes ?? ""} className="input" /></Field>
      <p className="text-xs text-silver-600">Manual corrections do not change credit balances. Use credit adjustments for that.</p>
      <SubmitButton className="btn-ghost w-full">Save changes</SubmitButton>
    </ActionForm>
  );
}

export function VerifyOrderForm({ id }: { id: string }) {
  return <DecisionForm action={A.verifyBankOrder} id={id} compact confirm="Confirm you have checked this payment in the bank account?" options={[["confirm", "Verify & credit", "btn-primary"], ["reject", "Reject", "btn-danger"]]} />;
}

export function RefundForm({ id }: { id: string }) {
  return (
    <ActionForm action={A.refundOrder} confirm="Reverse the credits for this order and mark it refunded?" className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="note" placeholder="Refund reason" required className="input max-w-[160px] py-1.5 text-xs" aria-label="Refund reason" />
      <button className="btn-ghost btn-sm">Refund</button>
    </ActionForm>
  );
}

export function LeadForm({ id, type, status, notes }: { id: string; type: "trial" | "inquiry"; status: string; notes: string | null }) {
  return (
    <ActionForm action={A.updateLead} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="type" value={type} />
      <select name="status" defaultValue={status} className="input w-auto py-1.5 text-xs" aria-label="Status">{["NEW", "CONTACTED", "APPROVED", "DECLINED", "CLOSED"].map((s) => <option key={s}>{s}</option>)}</select>
      <input name="adminNotes" defaultValue={notes ?? ""} placeholder="Notes" className="input max-w-[220px] py-1.5 text-xs" aria-label="Notes" />
      <SubmitButton className="btn-ghost btn-sm">Save</SubmitButton>
    </ActionForm>
  );
}

export function FaqForm({ faq }: { faq?: { id: string; category: string; question: string; answer: string; isPublished: boolean; sortOrder: number } }) {
  return (
    <ActionForm action={A.saveFaq} resetOnSuccess={!faq} className="grid gap-3 sm:grid-cols-4">
      {(e) => (<>
        {faq && <input type="hidden" name="id" value={faq.id} />}
        <Field label="Category" name="category" error={e.category}><input name="category" defaultValue={faq?.category ?? "General"} className="input" /></Field>
        <div className="sm:col-span-2"><Field label="Question" name="question" error={e.question}><input name="question" defaultValue={faq?.question} className="input" required /></Field></div>
        <Field label="Order" name="sortOrder"><input name="sortOrder" type="number" defaultValue={faq?.sortOrder ?? 0} className="input" /></Field>
        <div className="sm:col-span-4"><Field label="Answer" name="answer" error={e.answer}><textarea name="answer" rows={3} defaultValue={faq?.answer} className="input" required /></Field></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={faq?.isPublished ?? true} className="accent-crimson" />Published</label>
        <div className="sm:col-span-3 text-right"><SubmitButton className="btn-primary btn-sm">{faq ? "Save" : "Add FAQ"}</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}

export function RunRemindersButton() {
  return (
    <ActionForm action={A.runRemindersNow}>
      <SubmitButton className="btn-ghost" pendingText="Running…">Run renewal reminders now</SubmitButton>
    </ActionForm>
  );
}
