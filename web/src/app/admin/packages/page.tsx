import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageTitle } from "@/components/AppShell";
import { PackageForm } from "./PackageForm";
import { deletePackage } from "@/app/actions/admin";
import { getSettings } from "@/lib/settings";

export default async function Packages() {
  const [rows, s] = await Promise.all([db.select().from(schema.creditPackages).orderBy(asc(schema.creditPackages.sortOrder)), getSettings()]);
  return (
    <>
      <PageTitle title="Credit packages" sub={`Set USD prices; AED/PHP use your own override or convert at ${s.currency.rates.AED} AED / ${s.currency.rates.PHP} PHP per USD.`} />
      <div className="space-y-4">
        {rows.map((p) => (
          <div key={p.id} className="glass p-5">
            <PackageForm pkg={p} />
            <form action={deletePackage} className="mt-2 text-right"><input type="hidden" name="id" value={p.id} /><button className="text-xs text-crimson-300 hover:underline">Delete (or deactivate if ordered)</button></form>
          </div>
        ))}
        <div className="glass border-dashed p-5"><h2 className="mb-3 font-display font-bold uppercase">New package</h2><PackageForm /></div>
      </div>
    </>
  );
}
