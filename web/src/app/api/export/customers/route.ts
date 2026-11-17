import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { toCsv } from "@/lib/utils";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const all = isStaff(u) && new URL(req.url).searchParams.get("scope") === "all";
  const rows = await db.select({ c: schema.customers, reseller: schema.users.email }).from(schema.customers)
    .innerJoin(schema.users, eq(schema.customers.resellerId, schema.users.id))
    .where(all ? undefined : eq(schema.customers.resellerId, u.id)).orderBy(desc(schema.customers.createdAt));
  const csv = toCsv(rows.map(({ c, reseller }) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, whatsapp: c.whatsapp, country: c.country, notes: c.notes, reseller, created_at: c.createdAt })),
    ["id", "name", "email", "phone", "whatsapp", "country", "notes", "reseller", "created_at"]);
  await audit(u.id, "export.customers", "customer", undefined, { scope: all ? "all" : "own", rows: rows.length });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
