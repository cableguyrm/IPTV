"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { submitTrial } from "@/app/actions/public";

export function TrialForm({ panels, defaultPanel }: { panels: { slug: string; name: string; hours: number | null }[]; defaultPanel?: string }) {
  return (
    <ActionForm action={submitTrial} resetOnSuccess className="glass grid gap-4 p-6 sm:grid-cols-2">
      {(e) => (<>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <Field label="Name" name="name" error={e.name}><input id="name" name="name" className="input" required /></Field>
        <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" className="input" required /></Field>
        <Field label="WhatsApp" name="whatsapp" error={e.whatsapp}><input id="whatsapp" name="whatsapp" type="tel" className="input" /></Field>
        <Field label="Country" name="country"><select id="country" name="country" className="input"><option>United Arab Emirates</option><option>Philippines</option><option>Other</option></select></Field>
        <Field label="Panel" name="panel"><select id="panel" name="panel" className="input" defaultValue={defaultPanel ?? ""}><option value="">No preference</option>{panels.map((p) => <option key={p.slug} value={p.slug}>{p.name}{p.hours ? ` (${p.hours}h)` : ""}</option>)}</select></Field>
        <Field label="Device" name="device"><select id="device" name="device" className="input"><option>Android TV / Box</option><option>Amazon Fire TV</option><option>Smart TV (Samsung/LG)</option><option>Apple TV / iOS</option><option>Android phone</option><option>MAG / Enigma2</option><option>Windows / macOS</option></select></Field>
        <div className="sm:col-span-2"><Field label="Notes (optional)" name="message"><textarea id="message" name="message" rows={3} className="input" /></Field></div>
        <div className="sm:col-span-2"><SubmitButton className="btn-primary w-full">Request trial</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
