import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { Notice } from "@/components/ui";
import { PanelForm, PlanRow } from "../PanelForm";
import { deletePanel, deletePlan } from "@/app/actions/admin";
import { ADAPTER_OPTIONS, adapterStatus } from "@/lib/provider";

export default async function EditPanel({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [panel] = await db.select().from(schema.panels).where(eq(schema.panels.id, id));
  if (!panel) notFound();
  const plans = await db.select().from(schema.plans).where(eq(schema.plans.panelId, id)).orderBy(asc(schema.plans.sortOrder), asc(schema.plans.durationMonths));
  return (
    <>
      <PageTitle title={panel.name} actions={<Link href={`/panels/${panel.slug}`} className="btn-ghost" target="_blank">View public page</Link>} />
      {created && <div className="mb-6"><Notice tone="ok">Panel created. Add subscription plans below.</Notice></div>}
      <PanelForm panel={panel} adapters={ADAPTER_OPTIONS.map((a) => ({ ...a, status: adapterStatus(a.id) }))} />
      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-bold uppercase">Subscription plans</h2>
        <div className="glass space-y-3 p-5">
          {plans.map((pl) => (
            <div key={pl.id} className="flex items-start gap-2">
              <div className="flex-1"><PlanRow panelId={panel.id} plan={pl} /></div>
              <form action={deletePlan}><input type="hidden" name="id" value={pl.id} /><button className="btn-danger btn-sm mt-4" aria-label={`Delete plan ${pl.name}`}>✕</button></form>
            </div>
          ))}
          <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-silver-400">Add plan</p>
          <PlanRow panelId={panel.id} />
        </div>
      </section>
      <form action={deletePanel} className="glass mt-10 p-6">
        <input type="hidden" name="id" value={panel.id} />
        <p className="text-sm text-silver-400">Delete this panel. Panels with subscription history are hidden instead of deleted.</p>
        <button className="btn-danger btn-sm mt-3">Delete / hide panel</button>
      </form>
    </>
  );
}
