"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { submitInquiry } from "@/app/actions/public";

export function ContactForm({ panel, kind, subject }: { panel?: string; kind?: string; subject?: string }) {
  return (
    <ActionForm action={submitInquiry} resetOnSuccess className="glass grid gap-4 p-6 sm:grid-cols-2">
      {(e) => (<>
        <input type="hidden" name="panel" value={panel ?? ""} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <Field label="Name" name="name" error={e.name}><input id="name" name="name" className="input" required autoComplete="name" /></Field>
        <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" className="input" required autoComplete="email" /></Field>
        <Field label="Phone / WhatsApp" name="phone" error={e.phone}><input id="phone" name="phone" type="tel" className="input" autoComplete="tel" /></Field>
        <Field label="Topic" name="kind" error={e.kind}>
          <select id="kind" name="kind" className="input" defaultValue={kind ?? "GENERAL"}>
            <option value="GENERAL">General question</option><option value="SALES">Sales / panel information</option><option value="WHOLESALE">Custom wholesale quote</option><option value="SUBSCRIPTION">Subscription inquiry</option>
          </select>
        </Field>
        <div className="sm:col-span-2"><Field label="Subject" name="subject" error={e.subject}><input id="subject" name="subject" className="input" defaultValue={subject ?? (panel ? `About panel: ${panel}` : "")} /></Field></div>
        <div className="sm:col-span-2"><Field label="Message" name="message" error={e.message}><textarea id="message" name="message" rows={6} className="input" required /></Field></div>
        <div className="sm:col-span-2"><SubmitButton className="btn-primary w-full" pendingText="Sending…">Send message</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
