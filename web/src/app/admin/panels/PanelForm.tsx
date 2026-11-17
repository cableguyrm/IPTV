"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { savePanel, savePlan } from "@/app/actions/admin";
import type { Panel, Plan } from "@/db/schema";

export function PanelForm({ panel, adapters }: { panel?: Panel; adapters: { id: string; label: string; status: string }[] }) {
  const p = panel;
  const T = ({ name, label, def, type = "text", err, hint }: { name: string; label: string; def?: string | number | null; type?: string; err?: string; hint?: string }) => (
    <Field label={label} name={name} error={err} hint={hint}><input id={name} name={name} type={type} defaultValue={def ?? ""} className="input" /></Field>
  );
  const C = ({ name, label, def }: { name: string; label: string; def?: boolean }) => (
    <label className="flex items-center gap-2 text-sm text-silver-200"><input type="checkbox" name={name} defaultChecked={def} className="accent-crimson" />{label}</label>
  );
  return (
    <ActionForm action={savePanel} className="space-y-6">
      {(e) => (<>
        {p && <input type="hidden" name="id" value={p.id} />}
        <div className="glass grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <T name="name" label="Panel name" def={p?.name} err={e.name} />
          <T name="slug" label="URL slug" def={p?.slug} err={e.slug} hint="Leave blank to generate" />
          <T name="panelType" label="Panel type" def={p?.panelType ?? "IPTV"} err={e.panelType} hint="IPTV, VOD, Hybrid…" />
          <div className="sm:col-span-2 lg:col-span-3"><T name="tagline" label="Tagline" def={p?.tagline} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Description" name="description"><textarea id="description" name="description" rows={4} defaultValue={p?.description ?? ""} className="input" /></Field></div>
          <T name="logoUrl" label="Logo URL (https)" def={p?.logoUrl} err={e.logoUrl} hint="Blank = generated monogram" />
          <T name="accentColor" label="Accent colour" def={p?.accentColor ?? "#DC143C"} err={e.accentColor} />
          <T name="sortOrder" label="Sort order" type="number" def={p?.sortOrder ?? 0} />
        </div>
        <div className="glass grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <T name="liveChannels" label="Live channels" type="number" def={p?.liveChannels} err={e.liveChannels} />
          <T name="movies" label="Movies / VOD" type="number" def={p?.movies} err={e.movies} />
          <T name="series" label="TV series" type="number" def={p?.series} err={e.series} />
          <div className="flex items-end pb-2"><C name="statsVerified" label="Counts verified with provider" def={p?.statsVerified} /></div>
          <div className="sm:col-span-2"><T name="streamQuality" label="Stream quality (comma-separated)" def={p?.streamQuality.join(", ") ?? "HD, FHD"} /></div>
          <div className="sm:col-span-2"><T name="devices" label="Supported devices (comma-separated)" def={p?.devices.join(", ")} /></div>
          <div className="sm:col-span-2 lg:col-span-4"><T name="features" label="Features (comma-separated)" def={p?.features.join(", ")} /></div>
          <p className="text-xs text-silver-600 sm:col-span-2 lg:col-span-4">Unverified counts are hidden from visitors and shown as “Unverified”.</p>
        </div>
        <div className="glass grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2"><T name="creditSystem" label="Credit system description" def={p?.creditSystem} hint="e.g. 1 credit = 1 month" /></div>
          <T name="creditsPerMonth" label="Credits per month" type="number" def={p?.creditsPerMonth ?? 1} err={e.creditsPerMonth} />
          <T name="minCreditPurchase" label="Min credit purchase" type="number" def={p?.minCreditPurchase ?? 10} err={e.minCreditPurchase} />
          <T name="startingPrice" label="Starting reseller price / credit (USD)" def={p ? (p.startingPriceCents / 100).toFixed(2) : ""} err={e.startingPrice} />
          <T name="trialHours" label="Trial hours" type="number" def={p?.trialHours} err={e.trialHours} />
          <div className="flex flex-col justify-end gap-2 pb-2 sm:col-span-2"><C name="trialAvailable" label="Trial available" def={p?.trialAvailable} /></div>
        </div>
        <div className="glass grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Provider integration" name="providerAdapter" hint="Only configure an API for providers you are authorised to resell.">
            <select id="providerAdapter" name="providerAdapter" defaultValue={p?.providerAdapter ?? "manual"} className="input">
              {adapters.map((a) => <option key={a.id} value={a.id}>{a.label}{a.status === "not-configured" ? " — credentials missing (falls back to manual)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Licensing / authorisation note" name="licenseNote"><textarea id="licenseNote" name="licenseNote" rows={2} defaultValue={p?.licenseNote ?? ""} className="input" /></Field>
          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <C name="isActive" label="Visible on site" def={p?.isActive ?? true} />
            <C name="isFeatured" label="Featured on homepage" def={p?.isFeatured} />
            <C name="isSample" label="Sample data" def={p?.isSample} />
          </div>
        </div>
        <SubmitButton>{p ? "Save panel" : "Create panel"}</SubmitButton>
      </>)}
    </ActionForm>
  );
}

export function PlanRow({ panelId, plan }: { panelId: string; plan?: Plan }) {
  return (
    <ActionForm action={savePlan} resetOnSuccess={!plan} className="grid items-end gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-4 lg:grid-cols-8">
      {(e) => (<>
        <input type="hidden" name="panelId" value={panelId} />
        {plan && <input type="hidden" name="id" value={plan.id} />}
        <div className="lg:col-span-2"><Field label="Name" name="name" error={e.name}><input name="name" defaultValue={plan?.name} className="input" required /></Field></div>
        <Field label="Months" name="durationMonths" error={e.durationMonths}><input name="durationMonths" type="number" min={1} defaultValue={plan?.durationMonths ?? 1} className="input" /></Field>
        <Field label="Credits" name="creditCost" error={e.creditCost}><input name="creditCost" type="number" min={1} defaultValue={plan?.creditCost ?? 1} className="input" /></Field>
        <Field label="Connections" name="maxConnections"><input name="maxConnections" type="number" min={1} defaultValue={plan?.maxConnections ?? 1} className="input" /></Field>
        <Field label="Retail USD" name="suggestedRetail" error={e.suggestedRetail}><input name="suggestedRetail" defaultValue={plan?.suggestedRetailCents ? (plan.suggestedRetailCents / 100).toFixed(2) : ""} className="input" /></Field>
        <Field label="Order" name="sortOrder"><input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} className="input" /></Field>
        <div className="flex items-center gap-3"><label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} className="accent-crimson" />Active</label><SubmitButton className="btn-primary btn-sm">{plan ? "Save" : "Add"}</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
