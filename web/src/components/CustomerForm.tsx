"use client";
import { ActionForm, SubmitButton } from "./ActionForm";
import { Field } from "./ui";
import type { ActionState } from "@/lib/forms";
import type { Customer } from "@/db/schema";

export function CustomerForm({ action, customer, submitLabel = "Save customer" }: { action: (p: ActionState, f: FormData) => Promise<ActionState>; customer?: Customer; submitLabel?: string }) {
  return (
    <ActionForm action={action} resetOnSuccess={!customer} className="grid gap-4 sm:grid-cols-2">
      {(e) => (<>
        {customer && <input type="hidden" name="id" value={customer.id} />}
        <Field label="Name" name="name" error={e.name}><input id="name" name="name" required defaultValue={customer?.name} className="input" /></Field>
        <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} className="input" /></Field>
        <Field label="Phone" name="phone" error={e.phone}><input id="phone" name="phone" type="tel" defaultValue={customer?.phone ?? ""} className="input" /></Field>
        <Field label="WhatsApp" name="whatsapp" error={e.whatsapp}><input id="whatsapp" name="whatsapp" type="tel" defaultValue={customer?.whatsapp ?? ""} className="input" /></Field>
        <Field label="Country" name="country"><input id="country" name="country" defaultValue={customer?.country ?? ""} className="input" /></Field>
        <div className="flex flex-col justify-end gap-2 text-sm text-silver-400">
          <label className="flex items-center gap-2"><input type="checkbox" name="remindEmail" defaultChecked={customer?.remindEmail} className="accent-crimson" /> Email renewal reminders</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="remindWhatsapp" defaultChecked={customer?.remindWhatsapp} className="accent-crimson" /> WhatsApp renewal reminders</label>
        </div>
        <div className="sm:col-span-2"><Field label="Notes" name="notes"><textarea id="notes" name="notes" rows={2} defaultValue={customer?.notes ?? ""} className="input" /></Field></div>
        <div className="sm:col-span-2"><SubmitButton>{submitLabel}</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
