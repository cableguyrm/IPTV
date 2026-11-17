import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { FaqForm } from "../Forms";
import { deleteFaq } from "@/app/actions/admin";

export default async function AdminFaq() {
  const rows = await db.select().from(schema.faqs).orderBy(asc(schema.faqs.category), asc(schema.faqs.sortOrder));
  return (
    <>
      <PageTitle title="FAQ" sub="Shown on the FAQ page and homepage." />
      <div className="space-y-4">
        <div className="glass border-dashed p-5"><h2 className="mb-3 font-display font-bold uppercase">Add FAQ</h2><FaqForm /></div>
        {rows.map((f) => (
          <div key={f.id} className="glass p-5"><FaqForm faq={f} /><form action={deleteFaq} className="mt-2"><input type="hidden" name="id" value={f.id} /><button className="text-xs text-crimson-300 hover:underline">Delete</button></form></div>
        ))}
      </div>
    </>
  );
}
