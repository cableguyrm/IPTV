"use client";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      {(e) => (<>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" autoComplete="email" required className="input" /></Field>
        <Field label="Password" name="password" error={e.password}><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></Field>
        <div className="flex items-center justify-between text-sm"><Link href="/forgot-password" className="link">Forgot password?</Link></div>
        <SubmitButton className="btn-primary w-full" pendingText="Signing in…">Sign in</SubmitButton>
      </>)}
    </ActionForm>
  );
}
