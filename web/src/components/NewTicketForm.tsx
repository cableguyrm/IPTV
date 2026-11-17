"use client";
import { ActionForm, SubmitButton } from "./ActionForm";
import { Field } from "./ui";
import { submitTicket } from "@/app/actions/public";

const CATS: [string, string][] = [["LOGIN", "Login & account issues"], ["PAYMENT", "Payment inquiries"], ["ACTIVATION", "Activation problems"], ["DEVICE", "Device configuration"], ["RENEWAL", "Subscription renewals"], ["TECHNICAL", "Technical issues"], ["OTHER", "Other inquiries"]];

export function NewTicketForm({ guest, defaultCategory }: { guest: boolean; defaultCategory?: string }) {
  return (
    <ActionForm action={submitTicket} className="glass grid gap-4 p-6 sm:grid-cols-2">
      {(e) => (<>
        {guest && (<>
          <Field label="Your name" name="guestName" error={e.guestName}><input id="guestName" name="guestName" className="input" required /></Field>
          <Field label="Email" name="guestEmail" error={e.guestEmail}><input id="guestEmail" name="guestEmail" type="email" className="input" required /></Field>
        </>)}
        <Field label="Category" name="category" error={e.category}>
          <select id="category" name="category" className="input" defaultValue={CATS.some(([k]) => k === defaultCategory) ? defaultCategory : ""} required>
            <option value="" disabled>Select…</option>{CATS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Subject" name="subject" error={e.subject}><input id="subject" name="subject" className="input" required maxLength={150} /></Field>
        <div className="sm:col-span-2"><Field label="Describe the issue" name="body" error={e.body}><textarea id="body" name="body" rows={6} className="input" required /></Field></div>
        <div className="sm:col-span-2"><Field label="Screenshots (PNG/JPEG/WebP/GIF, up to 3 × 3 MB)" name="attachments" error={e.attachments}>
          <input id="attachments" name="attachments" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="text-sm text-silver-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
        </Field></div>
        <div className="sm:col-span-2"><SubmitButton className="btn-primary w-full" pendingText="Submitting…">Submit ticket</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
