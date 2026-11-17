import { notFound } from "next/navigation";
import { requireReseller } from "@/lib/auth";
import { getAccessibleTicket, getTicketThread, CATEGORY_LABELS } from "@/lib/tickets";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { TicketThread } from "@/components/TicketThread";
import { TicketReplyForm } from "@/components/TicketReplyForm";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireReseller();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const access = await getAccessibleTicket({ id });
  if (!access) notFound();
  const { ticket } = access;
  const thread = await getTicketThread(ticket.id);
  return (
    <div className="max-w-4xl">
      <PageTitle title={`#${ticket.number} · ${ticket.subject}`} sub={CATEGORY_LABELS[ticket.category]} actions={<StatusBadge status={ticket.status} />} />
      <TicketThread messages={thread} />
      {ticket.status !== "CLOSED" && <div className="mt-6"><TicketReplyForm ticketId={ticket.id} /></div>}
    </div>
  );
}
