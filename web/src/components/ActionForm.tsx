"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, className = "btn-primary", pendingText = "Working…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Wraps a server action and shows success/error state. Children receive field errors via `errors` render prop.
 */
export function ActionForm({
  action, children, className, resetOnSuccess = false, confirm, encType,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode | ((errors: Record<string, string>) => React.ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  encType?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      encType={encType}
      onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      noValidate={false}
    >
      {typeof children === "function" ? children(state?.fieldErrors ?? {}) : children}
      {state?.error && <p className={cn("mt-3 rounded-lg border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson-200")} role="alert">{state.error}</p>}
      {state?.ok && state.message && <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200" role="status">{state.message}</p>}
    </form>
  );
}
