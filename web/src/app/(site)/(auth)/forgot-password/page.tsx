"use client";
import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPage() {
  return (
    <AuthShell title="Reset password" sub="Enter your account email and we'll send a secure reset link.">
      <ActionForm action={forgotPasswordAction} className="space-y-4">
        {(e) => (<>
          <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" required className="input" /></Field>
          <SubmitButton className="btn-primary w-full">Send reset link</SubmitButton>
          <p className="text-center text-sm"><Link href="/login" className="link">Back to sign in</Link></p>
        </>)}
      </ActionForm>
    </AuthShell>
  );
}
