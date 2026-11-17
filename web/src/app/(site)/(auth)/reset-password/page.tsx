import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      {token ? <ResetForm token={token} /> : <p className="text-sm text-silver-400">Missing reset token. <Link href="/forgot-password" className="link">Request a new link</Link>.</p>}
    </AuthShell>
  );
}
