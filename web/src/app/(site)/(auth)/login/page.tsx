import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Welcome back" sub={<>New here? <Link href="/register" className="link">Become a reseller</Link></>}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
