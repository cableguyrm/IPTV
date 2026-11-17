"use client";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { registerAction } from "@/app/actions/auth";

export function RegisterForm() {
  return (
    <ActionForm action={registerAction} className="grid gap-4 sm:grid-cols-2">
      {(e) => (<>
        <Field label="Full name" name="name" error={e.name}><input id="name" name="name" required autoComplete="name" className="input" /></Field>
        <Field label="Business name (optional)" name="businessName" error={e.businessName}><input id="businessName" name="businessName" autoComplete="organization" className="input" /></Field>
        <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" required autoComplete="email" className="input" /></Field>
        <Field label="WhatsApp number" name="whatsapp" error={e.whatsapp} hint="Include country code, e.g. +971…"><input id="whatsapp" name="whatsapp" type="tel" autoComplete="tel" className="input" /></Field>
        <Field label="Password" name="password" error={e.password} hint="10+ characters with a letter and a number"><input id="password" name="password" type="password" required autoComplete="new-password" className="input" /></Field>
        <Field label="Confirm password" name="confirm" error={e.confirm}><input id="confirm" name="confirm" type="password" required autoComplete="new-password" className="input" /></Field>
        <Field label="Country / market" name="country" error={e.country}>
          <select id="country" name="country" className="input" defaultValue=""><option value="" disabled>Select…</option><option value="AE">United Arab Emirates</option><option value="PH">Philippines</option><option value="OTHER">International / other</option></select>
        </Field>
        <Field label="Expected customers" name="expectedVolume" error={e.expectedVolume}>
          <select id="expectedVolume" name="expectedVolume" className="input"><option>Under 20</option><option>20–50</option><option>50–100</option><option>100–500</option><option>500+</option></select>
        </Field>
        <div className="sm:col-span-2"><Field label="Tell us about your business (optional)" name="applicationNote" error={e.applicationNote}><textarea id="applicationNote" name="applicationNote" rows={3} className="input" /></Field></div>
        <label className="flex items-start gap-2 text-sm text-silver-400 sm:col-span-2">
          <input type="checkbox" name="terms" className="mt-1 accent-crimson" required />
          <span>I agree to the <Link href="/terms" className="link">Terms of Service</Link>, <Link href="/privacy" className="link">Privacy Policy</Link> and will only resell services in compliance with applicable laws and licensing.</span>
        </label>
        {e.terms && <p className="text-xs text-crimson-300 sm:col-span-2">{e.terms}</p>}
        <div className="sm:col-span-2"><SubmitButton className="btn-primary w-full" pendingText="Creating account…">Submit application</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
