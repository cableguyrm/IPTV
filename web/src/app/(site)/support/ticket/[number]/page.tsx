import { notFound } from "next/navigation";
import { getAccessibleTicket, getTicketThread, CATEGORY_LABELS } from "@/lib/tickets";
import { TicketThread } from "@/components/TicketThread";
import { TicketReplyForm } from "@/components/TicketReplyForm";
import { StatusBadge, Notice } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Ticket status", robots: { index: false } };

export default async function GuestTicket({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();
  const access = await getAccessibleTicket({ number: n }, t);
  if (!access) notFound();
  const { ticket } = access;
  const thread = await getTicketThread(ticket.id);
  return (
    <section className="container-x max-w-3xl py-12">
      {t && <div className="mb-6"><Notice tone="info">Bookmark this page — it&apos;s your private tracking link. Access code: <code className="break-all font-mono">{t}</code></Notice></div>}
      <div className="glass mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">#{ticket.number} · {ticket.subject}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="mt-2 text-sm text-silver-400">{CATEGORY_LABELS[ticket.category]} · opened {formatDate(ticket.createdAt, true)}</p>
      </div>
      <TicketThread messages={thread} token={t} guestName={ticket.guestName} />
      {ticket.status !== "CLOSED" && <div className="mt-6"><TicketReplyForm ticketId={ticket.id} token={t} /></div>}
    </section>
  );
}
