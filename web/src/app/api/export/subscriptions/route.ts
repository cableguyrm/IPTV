import { getCurrentUser, isStaff } from "@/lib/auth";
import { listSubscriptions, type SubFilter } from "@/lib/reseller-queries";
import { toCsv } from "@/lib/utils";
import { audit } from "@/lib/audit";

const FILTERS: SubFilter[] = ["all", "active", "expiring", "expired", "pending", "renewals"];

export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const filter = (FILTERS.includes(sp.get("filter") as SubFilter) ? sp.get("filter") : "all") as SubFilter;
  const all = isStaff(u) && sp.get("scope") === "all";
  const rows = await listSubscriptions({ resellerId: all ? undefined : u.id, filter, limit: 50_000 });
  const csv = toCsv(rows.map((r) => ({
    id: r.s.id, customer: r.customerName, customer_email: r.customerEmail, customer_whatsapp: r.customerWhatsapp, reseller: r.resellerName,
    panel: r.panelName, plan: r.s.planName, credits: r.s.creditCost, device: r.s.deviceType, status: r.s.status, provisioning: r.s.provisioning,
    activated_at: r.s.activatedAt, expires_at: r.s.expiresAt, notes: r.s.resellerNotes,
  })), ["id", "customer", "customer_email", "customer_whatsapp", "reseller", "panel", "plan", "credits", "device", "status", "provisioning", "activated_at", "expires_at", "notes"]);
  await audit(u.id, "export.subscriptions", "subscription", undefined, { filter, scope: all ? "all" : "own", rows: rows.length });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="subscriptions-${filter}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
