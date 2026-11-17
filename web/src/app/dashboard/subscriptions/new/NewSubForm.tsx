"use client";
import { useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { createSubscription } from "@/app/actions/reseller";

type PanelOpt = { id: string; name: string; devices: string[]; instant: boolean; plans: { id: string; name: string; creditCost: number; months: number; connections: number }[] };

export function NewSubForm({ customers, panels, balance, defaultCustomer, renew, disabled }: {
  customers: { id: string; name: string }[]; panels: PanelOpt[]; balance: number; defaultCustomer?: string; disabled?: boolean;
  renew: { id: string; customerId: string; planId: string | null; deviceType: string | null; label: string } | null;
}) {
  const initialPanel = renew?.planId ? panels.find((p) => p.plans.some((pl) => pl.id === renew.planId))?.id : panels[0]?.id;
  const [customer, setCustomer] = useState(defaultCustomer && customers.some((c) => c.id === defaultCustomer) ? defaultCustomer : customers.length ? customers[0].id : "");
  const [panelId, setPanelId] = useState(initialPanel ?? "");
  const panel = panels.find((p) => p.id === panelId);
  const [planId, setPlanId] = useState(renew?.planId ?? panel?.plans[0]?.id ?? "");
  const plan = useMemo(() => panel?.plans.find((p) => p.id === planId), [panel, planId]);
  const short = plan ? plan.creditCost > balance : false;

  return (
    <ActionForm action={createSubscription} className="grid gap-8 lg:grid-cols-3">
      {(e) => (<>
        <div className="glass space-y-5 p-6 lg:col-span-2">
          {renew && <input type="hidden" name="renewalOfId" value={renew.id} />}
          <Field label="Customer" name="customerId" error={e.customerId}>
            <select id="customerId" name="customerId" className="input" value={customer} onChange={(ev) => setCustomer(ev.target.value)} disabled={!!renew}>
              <option value="">+ New customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {renew && <input type="hidden" name="customerId" value={customer} />}
          </Field>
          {!customer && (
            <div className="grid gap-4 rounded-xl border border-white/10 p-4 sm:grid-cols-3">
              <Field label="New customer name" name="newCustomerName" error={e.newCustomerName}><input id="newCustomerName" name="newCustomerName" className="input" required /></Field>
              <Field label="WhatsApp" name="newCustomerWhatsapp" error={e.newCustomerWhatsapp}><input id="newCustomerWhatsapp" name="newCustomerWhatsapp" className="input" type="tel" /></Field>
              <Field label="Email" name="newCustomerEmail" error={e.newCustomerEmail}><input id="newCustomerEmail" name="newCustomerEmail" className="input" type="email" /></Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Panel" name="panel">
              <select id="panel" className="input" value={panelId} onChange={(ev) => { setPanelId(ev.target.value); setPlanId(panels.find((p) => p.id === ev.target.value)?.plans[0]?.id ?? ""); }}>
                {panels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Plan" name="planId" error={e.planId}>
              <select id="planId" name="planId" className="input" value={planId} onChange={(ev) => setPlanId(ev.target.value)}>
                {panel?.plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.creditCost} credits</option>)}
              </select>
            </Field>
            <Field label="Device" name="deviceType">
              <select id="deviceType" name="deviceType" className="input" defaultValue={renew?.deviceType ?? ""}>
                <option value="">Not specified</option>
                {(panel?.devices ?? []).map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes (visible to you and admins)" name="resellerNotes"><textarea id="resellerNotes" name="resellerNotes" rows={3} className="input" /></Field>
        </div>
        <aside className="glass h-fit space-y-4 p-6">
          <h2 className="font-display text-lg font-bold uppercase">Summary</h2>
          {renew && <p className="text-sm text-silver-400">Renewing <strong className="text-white">{renew.label}</strong>. The new term starts when the current one ends.</p>}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-silver-400">Plan</dt><dd>{plan?.name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-silver-400">Connections</dt><dd>{plan?.connections ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-silver-400">Credit cost</dt><dd className="font-bold">{plan?.creditCost ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-silver-400">Your balance</dt><dd>{balance}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-2"><dt className="text-silver-400">After activation</dt><dd className={short ? "text-crimson-300" : ""}>{plan ? balance - plan.creditCost : "—"}</dd></div>
          </dl>
          <p className={`rounded-lg border px-3 py-2 text-xs ${panel?.instant ? "border-emerald-400/30 text-emerald-200" : "border-amber-400/30 text-amber-200"}`}>
            {panel?.instant ? "Instant activation via provider API." : "Manual workflow — requires administrator confirmation. Credits are deducted on approval."}
          </p>
          {short && <p className="text-xs text-crimson-300">Not enough credits. <a href="/pricing" className="underline">Buy credits</a>.</p>}
          <SubmitButton className="btn-primary w-full" pendingText="Submitting…">{panel?.instant ? "Activate now" : "Submit for approval"}</SubmitButton>
          {disabled && <p className="text-xs text-amber-200">Submitting is disabled until your account is approved.</p>}
        </aside>
      </>)}
    </ActionForm>
  );
}
