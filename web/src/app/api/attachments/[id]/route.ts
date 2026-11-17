import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAccessibleTicket } from "@/lib/tickets";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const [a] = await db.select().from(schema.ticketAttachments).where(eq(schema.ticketAttachments.id, id));
  if (!a) return new Response("Not found", { status: 404 });
  const token = new URL(req.url).searchParams.get("t");
  if (!(await getAccessibleTicket({ id: a.ticketId }, token))) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(a.data), {
    headers: {
      "Content-Type": a.mime, "Content-Length": String(a.size), "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${a.filename.replace(/"/g, "")}"`,
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'", "X-Content-Type-Options": "nosniff",
    },
  });
}
