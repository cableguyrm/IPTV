import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { LeadForm } from "../Forms";
import { waLink } from "@/lib/settings";

export default async function Trials() {
  const rows = await db.select({ t: schema.trialRequests, panel: schema.panels.name }).from(schema.trialRequests).leftJoin(schema.panels, eq(schema.trialRequests.panelId, schema.panels.id)).orderBy(desc(schema.trialRequests.createdAt)).limit(300);
  return (
    <>
      <PageTitle title="Trial requests" sub="Trials are issued manually on the provider panel; track follow-up here." />
      <div className="space-y-3">{rows.map(({ t, panel }) => (
        <div key={t.id} className="glass flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="font-semibold">{t.name} <StatusBadge status={t.status} /></p>
            <p className="text-xs text-silver-400">{t.email} · {t.whatsapp ?? "no WhatsApp"} · {t.country ?? ""} · {formatDate(t.createdAt, true)}</p>
            <p className="mt-1 text-sm">Panel: {panel ?? "any"} · Device: {t.device ?? "—"}</p>
            {t.message && <p className="mt-1 text-sm text-silver-400">“{t.message}”</p>}
            <div className="mt-2 flex gap-2">{t.whatsapp && <a className="btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={waLink(t.whatsapp, `Hi ${t.name}, regarding your trial request…`)}>WhatsApp</a>}<a className="btn-ghost btn-sm" href={`mailto:${t.email}`}>Email</a></div>
          </div>
          <LeadForm id={t.id} type="trial" status={t.status} notes={t.adminNotes} />
        </div>
      ))}{!rows.length && <p className="glass p-10 text-center text-silver-400">No trial requests.</p>}</div>
    </>
  );
}
