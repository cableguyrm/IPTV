"use client";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { resetPasswordAction } from "@/app/actions/auth";

export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPasswordAction} className="space-y-4">
      {(e) => (<>
        <input type="hidden" name="token" value={token} />
        <Field label="New password" name="password" error={e.password}><input id="password" name="password" type="password" autoComplete="new-password" required className="input" /></Field>
        <Field label="Confirm password" name="confirm" error={e.confirm}><input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" /></Field>
        <SubmitButton className="btn-primary w-full">Update password</SubmitButton>
        <p className="text-center text-sm"><Link href="/login" className="link">Go to sign in</Link></p>
      </>)}
    </ActionForm>
  );
}
