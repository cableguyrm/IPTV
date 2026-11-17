import { formatDate } from "@/lib/utils";

type Msg = { id: string; body: string; isStaff: boolean; authorName: string | null; createdAt: Date; attachments: { id: string; filename: string; size: number }[] };

export function TicketThread({ messages, token, guestName }: { messages: Msg[]; token?: string; guestName?: string | null }) {
  return (
    <ol className="space-y-4">
      {messages.map((m) => (
        <li key={m.id} className={`glass p-5 ${m.isStaff ? "border-crimson/40" : ""}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-silver-400">
            <span className="font-semibold text-white">{m.isStaff ? `${m.authorName ?? "Support"} · Staff` : m.authorName ?? guestName ?? "Customer"}</span>
            <time>{formatDate(m.createdAt, true)}</time>
          </div>
          <p className="whitespace-pre-wrap text-sm text-silver-200">{m.body}</p>
          {m.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {m.attachments.map((a) => {
                const href = `/api/attachments/${a.id}${token ? `?t=${encodeURIComponent(token)}` : ""}`;
                return (
                  <a key={a.id} href={href} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-white/10 hover:border-crimson/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={href} alt={a.filename} className="h-24 w-36 object-cover" />
                    <span className="block truncate px-2 py-1 text-[10px] text-silver-400">{a.filename}</span>
                  </a>
                );
              })}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
