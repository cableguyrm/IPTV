import type { Panel, Subscription, Customer } from "@/db/schema";

/**
 * IPTV provider integration layer.
 *
 * A panel uses `providerAdapter = "manual"` by default: subscriptions are queued for
 * administrator confirmation and credits are only deducted when an admin approves.
 * Configure an adapter ONLY for a provider you are authorised to resell.
 */
export interface ProvisionResult { providerRef: string; expiresAt?: Date }
export interface ProviderAdapter {
  id: string;
  label: string;
  provision(input: { panel: Panel; subscription: Subscription; customer: Customer }): Promise<ProvisionResult>;
}

/** Generic REST adapter: POST {base}/subscriptions with bearer key. Adapt to your provider's documented API. */
const generic: ProviderAdapter = {
  id: "generic",
  label: "Generic REST provider API",
  async provision({ panel, subscription, customer }) {
    const base = process.env.PROVIDER_GENERIC_BASE_URL!;
    const res = await fetch(`${base.replace(/\/$/, "")}/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PROVIDER_GENERIC_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        package: panel.providerPackageMap?.[subscription.planId ?? ""] ?? subscription.planName,
        months: subscription.durationMonths,
        customer_reference: customer.id,
        note: `BTN subscription ${subscription.id}`,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Provider API responded ${res.status}`);
    const data = (await res.json()) as { id?: string; expires_at?: string };
    if (!data.id) throw new Error("Provider API did not return a subscription id");
    return { providerRef: String(data.id), expiresAt: data.expires_at ? new Date(data.expires_at) : undefined };
  },
};

const ADAPTERS: Record<string, { adapter: ProviderAdapter; configured: () => boolean }> = {
  generic: { adapter: generic, configured: () => !!process.env.PROVIDER_GENERIC_BASE_URL && !!process.env.PROVIDER_GENERIC_API_KEY },
};

export const ADAPTER_OPTIONS = [{ id: "manual", label: "Manual (admin confirmation)" }, ...Object.values(ADAPTERS).map((a) => ({ id: a.adapter.id, label: a.adapter.label }))];

/** Returns a usable adapter, or null when the panel must use the manual workflow. */
export function getAdapter(panel: Panel): ProviderAdapter | null {
  const entry = ADAPTERS[panel.providerAdapter];
  if (!entry || !entry.configured()) return null;
  return entry.adapter;
}

export function adapterStatus(id: string) {
  if (id === "manual") return "manual";
  return ADAPTERS[id]?.configured() ? "configured" : "not-configured";
}
