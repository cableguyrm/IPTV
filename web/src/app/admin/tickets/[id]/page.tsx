import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAccessibleTicket, getTicketThread, CATEGORY_LABELS } from "@/lib/tickets";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { TicketThread } from "@/components/TicketThread";
import { TicketReplyForm } from "@/components/TicketReplyForm";

export default async function AdminTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const access = await getAccessibleTicket({ id });
  if (!access?.staff) notFound();
  const { ticket } = access;
  const [thread, owner] = await Promise.all([getTicketThread(ticket.id), ticket.userId ? db.select().from(schema.users).where(eq(schema.users.id, ticket.userId)).then((r) => r[0]) : null]);
  return (
    <div className="max-w-4xl">
      <PageTitle title={`#${ticket.number} · ${ticket.subject}`} sub={<>{CATEGORY_LABELS[ticket.category]} · {owner ? <Link href={`/admin/resellers/${owner.id}`} className="link">{owner.name}</Link> : `${ticket.guestName} <${ticket.guestEmail}> (guest)`}</>} actions={<StatusBadge status={ticket.status} />} />
      <TicketThread messages={thread} guestName={ticket.guestName} />
      <div className="mt-6"><TicketReplyForm ticketId={ticket.id} staff /></div>
    </div>
  );
}
