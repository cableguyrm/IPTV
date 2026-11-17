"use client";
import { ActionForm, SubmitButton } from "./ActionForm";
import { replyTicket } from "@/app/actions/tickets";

export function TicketReplyForm({ ticketId, token, staff }: { ticketId: string; token?: string; staff?: boolean }) {
  return (
    <ActionForm action={replyTicket} resetOnSuccess className="glass space-y-3 p-5">
      <input type="hidden" name="ticketId" value={ticketId} />
      {token && <input type="hidden" name="token" value={token} />}
      <label className="label" htmlFor="reply-body">Your reply</label>
      <textarea id="reply-body" name="body" rows={4} required className="input" />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="reply-files">Screenshots (optional, max 3 × 3 MB)</label>
          <input id="reply-files" name="attachments" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="text-xs text-silver-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" />
        </div>
        {staff && (
          <div>
            <label className="label" htmlFor="reply-status">Set status</label>
            <select id="reply-status" name="status" className="input" defaultValue="AWAITING_CUSTOMER">
              <option value="IN_PROGRESS">In progress</option><option value="AWAITING_CUSTOMER">Awaiting customer</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option>
            </select>
          </div>
        )}
        <SubmitButton className="btn-primary ml-auto">Send reply</SubmitButton>
      </div>
    </ActionForm>
  );
}
