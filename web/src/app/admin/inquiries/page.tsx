import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { LeadForm } from "../Forms";

export default async function Inquiries() {
  const rows = await db.select({ i: schema.inquiries, panel: schema.panels.name }).from(schema.inquiries).leftJoin(schema.panels, eq(schema.inquiries.panelId, schema.panels.id)).orderBy(desc(schema.inquiries.createdAt)).limit(300);
  return (
    <>
      <PageTitle title="Inquiries" sub="Contact form, sales and wholesale quote requests." />
      <div className="space-y-3">{rows.map(({ i, panel }) => (
        <div key={i.id} className="glass flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0 max-w-2xl">
            <p className="font-semibold"><span className="badge mr-2 border-white/15 text-silver-200">{i.kind}</span>{i.subject ?? "(no subject)"} <StatusBadge status={i.status} /></p>
            <p className="text-xs text-silver-400">{i.name} · <a className="link" href={`mailto:${i.email}`}>{i.email}</a> · {i.phone ?? ""} · {formatDate(i.createdAt, true)}{panel ? ` · ${panel}` : ""}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-silver-200">{i.message}</p>
          </div>
          <LeadForm id={i.id} type="inquiry" status={i.status} notes={i.adminNotes} />
        </div>
      ))}{!rows.length && <p className="glass p-10 text-center text-silver-400">No inquiries.</p>}</div>
    </>
  );
}
