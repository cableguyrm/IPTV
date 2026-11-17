"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { saveSettings } from "@/app/actions/admin";
import type { Settings } from "@/lib/settings";

function Group({ id, title, children }: { id: string; title: string; children: (e: Record<string, string>) => React.ReactNode }) {
  return (
    <section className="glass p-6">
      <h2 className="mb-4 font-display text-lg font-bold uppercase">{title}</h2>
      <ActionForm action={saveSettings} className="grid gap-4 sm:grid-cols-2">
        {(e) => (<><input type="hidden" name="group" value={id} />{children(e)}<div className="sm:col-span-2"><SubmitButton>Save {title.toLowerCase()}</SubmitButton></div></>)}
      </ActionForm>
    </section>
  );
}
const I = ({ n, l, d, e, wide, type = "text" }: { n: string; l: string; d: string | number; e: Record<string, string>; wide?: boolean; type?: string }) => (
  <div className={wide ? "sm:col-span-2" : ""}><Field label={l} name={n} error={e[n]}><input id={n} name={n} type={type} step="any" defaultValue={d} className="input" /></Field></div>
);
const TA = ({ n, l, d, e, rows = 3 }: { n: string; l: string; d: string; e: Record<string, string>; rows?: number }) => (
  <div className="sm:col-span-2"><Field label={l} name={n} error={e[n]}><textarea id={n} name={n} rows={rows} defaultValue={d} className="input" /></Field></div>
);

export function SettingsForms({ s }: { s: Settings }) {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <Group id="site" title="Branding & content">{(e) => (<>
        <I n="brandName" l="Brand name" d={s.site.brandName} e={e} /><I n="logoUrl" l="Logo URL (https, blank = default)" d={s.site.logoUrl} e={e} />
        <I n="tagline" l="Tagline" d={s.site.tagline} e={e} wide /><I n="heroHeadline" l="Hero headline" d={s.site.heroHeadline} e={e} wide />
        <TA n="heroSub" l="Hero subheading" d={s.site.heroSub} e={e} rows={2} /><I n="aboutTitle" l="About page title" d={s.site.aboutTitle} e={e} wide />
        <TA n="aboutBody" l="About page body (blank line = new paragraph)" d={s.site.aboutBody} e={e} rows={6} />
        <TA n="complianceNote" l="Footer compliance note" d={s.site.complianceNote} e={e} rows={2} />
      </>)}</Group>
      <div className="space-y-8">
        <Group id="contact" title="Contact details">{(e) => (<>
          <I n="whatsapp" l="WhatsApp number" d={s.contact.whatsapp} e={e} /><I n="telegram" l="Telegram username" d={s.contact.telegram} e={e} />
          <I n="email" l="Support email" d={s.contact.email} e={e} /><I n="salesEmail" l="Sales email" d={s.contact.salesEmail} e={e} />
          <I n="phone" l="Phone" d={s.contact.phone} e={e} /><I n="hours" l="Support hours" d={s.contact.hours} e={e} /><I n="address" l="Address" d={s.contact.address} e={e} wide />
        </>)}</Group>
        <Group id="currency" title="Currency">{(e) => (<>
          <I n="AED" l="AED per 1 USD" d={s.currency.rates.AED} e={e} type="number" /><I n="PHP" l="PHP per 1 USD" d={s.currency.rates.PHP} e={e} type="number" />
          <Field label="Default display currency" name="defaultCurrency"><select id="defaultCurrency" name="defaultCurrency" defaultValue={s.currency.defaultCurrency} className="input"><option>USD</option><option>AED</option><option>PHP</option></select></Field>
          <p className="self-end text-xs text-silver-600">Last updated {s.currency.ratesUpdatedAt}. Package-level AED/PHP overrides take precedence.</p>
        </>)}</Group>
      </div>
      <Group id="payments" title="Bank transfer">{(e) => (<>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="bankTransferEnabled" defaultChecked={s.payments.bankTransferEnabled} className="accent-crimson" />Enable bank transfer / local wallet payments</label>
        <I n="bankName" l="Bank name" d={s.payments.bankName} e={e} /><I n="accountName" l="Account name" d={s.payments.accountName} e={e} />
        <I n="accountNumber" l="Account number" d={s.payments.accountNumber} e={e} /><I n="iban" l="IBAN" d={s.payments.iban} e={e} /><I n="swift" l="SWIFT/BIC" d={s.payments.swift} e={e} />
        <TA n="localWalletInstructions" l="Local wallet instructions (GCash/Maya…)" d={s.payments.localWalletInstructions} e={e} rows={2} />
        <TA n="instructions" l="General instructions" d={s.payments.instructions} e={e} rows={2} />
      </>)}</Group>
      <Group id="notifications" title="Notifications">{(e) => (<>
        <I n="reminderDays" l="Reminder days before expiry (comma-separated)" d={s.notifications.reminderDays.join(", ")} e={e} wide />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="emailReminders" defaultChecked={s.notifications.emailReminders} className="accent-crimson" />Email reminders</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="whatsappReminders" defaultChecked={s.notifications.whatsappReminders} className="accent-crimson" />WhatsApp reminders (approved template)</label>
        <I n="adminNotifyEmail" l="Admin alert email (new tickets, trials, inquiries)" d={s.notifications.adminNotifyEmail} e={e} wide />
      </>)}</Group>
    </div>
  );
}
