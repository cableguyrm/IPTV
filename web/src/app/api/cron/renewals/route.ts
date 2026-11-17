import { timingSafeEqual } from "crypto";
import { runRenewalReminders } from "@/lib/reminders";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Call daily from a scheduler: `curl -H "Authorization: Bearer $CRON_SECRET" https://site/api/cron/renewals` */
export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const got = req.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected)))
    return new Response("Unauthorized", { status: 401 });
  const summary = await runRenewalReminders();
  await audit(null, "cron.renewal_reminders", undefined, undefined, summary);
  return Response.json(summary);
}
