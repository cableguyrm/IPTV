"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { updateProfile, changePassword } from "@/app/actions/reseller";

type U = { name: string; email: string; businessName: string | null; phone: string | null; whatsapp: string | null; country: string | null; preferredCurrency: string; notifyEmail: boolean; notifyWhatsapp: boolean };

export function ProfileForm({ u }: { u: U }) {
  return (
    <ActionForm action={updateProfile} className="grid gap-4 sm:grid-cols-2">
      {(e) => (<>
        <Field label="Name" name="name" error={e.name}><input id="name" name="name" defaultValue={u.name} required className="input" /></Field>
        <Field label="Email (contact support to change)" name="email"><input id="email" value={u.email} disabled className="input opacity-60" /></Field>
        <Field label="Business name" name="businessName"><input id="businessName" name="businessName" defaultValue={u.businessName ?? ""} className="input" /></Field>
        <Field label="Country" name="country"><input id="country" name="country" defaultValue={u.country ?? ""} className="input" /></Field>
        <Field label="Phone" name="phone" error={e.phone}><input id="phone" name="phone" defaultValue={u.phone ?? ""} className="input" /></Field>
        <Field label="WhatsApp" name="whatsapp" error={e.whatsapp}><input id="whatsapp" name="whatsapp" defaultValue={u.whatsapp ?? ""} className="input" /></Field>
        <Field label="Preferred currency" name="preferredCurrency"><select id="preferredCurrency" name="preferredCurrency" defaultValue={u.preferredCurrency} className="input"><option>USD</option><option>AED</option><option>PHP</option></select></Field>
        <div className="flex flex-col justify-end gap-2 text-sm text-silver-400">
          <label className="flex items-center gap-2"><input type="checkbox" name="notifyEmail" defaultChecked={u.notifyEmail} className="accent-crimson" /> Email me renewal digests</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="notifyWhatsapp" defaultChecked={u.notifyWhatsapp} className="accent-crimson" /> WhatsApp notifications</label>
        </div>
        <div className="sm:col-span-2"><SubmitButton>Save profile</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} resetOnSuccess className="space-y-4">
      {(e) => (<>
        <Field label="Current password" name="current" error={e.current}><input id="current" name="current" type="password" autoComplete="current-password" required className="input" /></Field>
        <Field label="New password" name="password" error={e.password}><input id="password" name="password" type="password" autoComplete="new-password" required className="input" /></Field>
        <Field label="Confirm new password" name="confirm" error={e.confirm}><input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" /></Field>
        <SubmitButton>Change password</SubmitButton>
      </>)}
    </ActionForm>
  );
}
