import { asc, eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireReseller } from "@/lib/auth";
import { getPanelsWithPlans } from "@/lib/queries";
import { getAdapter } from "@/lib/provider";
import { PageTitle } from "@/components/AppShell";
import { Notice } from "@/components/ui";
import { NewSubForm } from "./NewSubForm";

export default async function NewSubscription({ searchParams }: { searchParams: Promise<{ customer?: string; renew?: string }> }) {
  const u = await requireReseller();
  const sp = await searchParams;
  const [customers, panels] = await Promise.all([
    db.select({ id: schema.customers.id, name: schema.customers.name }).from(schema.customers).where(eq(schema.customers.resellerId, u.id)).orderBy(asc(schema.customers.name)),
    getPanelsWithPlans(),
  ]);
  let renew: { id: string; customerId: string; planId: string | null; deviceType: string | null; label: string } | null = null;
  if (sp.renew && /^[0-9a-f-]{36}$/.test(sp.renew)) {
    const [r] = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.id, sp.renew), eq(schema.subscriptions.resellerId, u.id)));
    if (r) renew = { id: r.id, customerId: r.customerId, planId: r.planId, deviceType: r.deviceType, label: r.planName };
  }
  const options = panels.filter((p) => p.plans.length).map((p) => ({
    id: p.id, name: p.name, devices: p.devices, instant: !!getAdapter(p),
    plans: p.plans.map((pl) => ({ id: pl.id, name: pl.name, creditCost: pl.creditCost, months: pl.durationMonths, connections: pl.maxConnections })),
  }));
  return (
    <>
      <PageTitle title={renew ? "Renew subscription" : "New subscription"} sub={`Balance: ${u.creditBalance} credits`} />
      {u.status !== "ACTIVE" && <div className="mb-6"><Notice tone="warn">Your account is pending approval — you can prepare the request but submitting is disabled until approval.</Notice></div>}
      <div className="mb-6"><Notice tone="info"><strong>How activation works:</strong> panels with an integrated, authorised provider API activate instantly and deduct credits immediately. All other panels use the <strong>manual workflow</strong> — your request is queued for administrator confirmation and credits are deducted only when it&apos;s approved.</Notice></div>
      <NewSubForm customers={customers} panels={options} balance={u.creditBalance} defaultCustomer={renew?.customerId ?? sp.customer} renew={renew} disabled={u.status !== "ACTIVE"} />
    </>
  );
}
