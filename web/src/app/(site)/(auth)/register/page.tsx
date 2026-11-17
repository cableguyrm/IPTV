import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Become a Reseller", description: "Apply for a BTN TV STREAMZ reseller account." };

export default function RegisterPage() {
  return (
    <AuthShell wide title="Become a reseller" sub={<>Already registered? <Link href="/login" className="link">Sign in</Link>. Applications are reviewed by our team — you can explore your dashboard while you wait.</>}>
      <RegisterForm />
    </AuthShell>
  );
}
