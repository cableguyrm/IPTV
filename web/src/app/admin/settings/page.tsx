import { PageTitle } from "@/components/AppShell";
import { getSettings } from "@/lib/settings";
import { SettingsForms } from "./SettingsForms";
import { RunRemindersButton } from "../Forms";
import { cardPaymentsEnabled } from "@/lib/stripe";
import { emailConfigured, whatsappConfigured } from "@/lib/notify";
import { adapterStatus } from "@/lib/provider";

export default async function Settings() {
  const s = await getSettings();
  const integ = [
    ["Stripe card & wallet payments", cardPaymentsEnabled(), "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET"],
    ["SMTP email", emailConfigured(), "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM"],
    ["WhatsApp Cloud API", whatsappConfigured(), "WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE"],
    ["Generic IPTV provider API", adapterStatus("generic") === "configured", "PROVIDER_GENERIC_BASE_URL, PROVIDER_GENERIC_API_KEY"],
  ] as const;
  return (
    <>
      <PageTitle title="Site settings" sub="Branding, content, contact details, currency, payments and notifications." actions={<RunRemindersButton />} />
      <SettingsForms s={s} />
      <section className="glass mt-8 p-6">
        <h2 className="font-display text-lg font-bold uppercase">Integrations</h2>
        <p className="mt-1 text-sm text-silver-400">Secrets are configured as server environment variables, never stored in the database.</p>
        <div className="mt-4 overflow-x-auto"><table className="table-x min-w-[560px]"><thead><tr><th>Integration</th><th>Status</th><th>Environment variables</th></tr></thead><tbody>
          {integ.map(([l, ok, env]) => <tr key={l}><td>{l}</td><td className={ok ? "text-emerald-300" : "text-amber-300"}>{ok ? "Configured" : "Not configured"}</td><td className="font-mono text-xs text-silver-400">{env}</td></tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}
