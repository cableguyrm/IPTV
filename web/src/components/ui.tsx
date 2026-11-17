import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, sub, center = true }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; center?: boolean }) {
  return (
    <div className={cn("mb-10 max-w-3xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="h-display mt-3 text-3xl sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-silver-400">{sub}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, children }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
      <div className="absolute left-1/2 top-0 h-64 w-[48rem] -translate-x-1/2 rounded-full bg-crimson/20 blur-[120px]" aria-hidden="true" />
      <div className="container-x relative py-16 text-center sm:py-20">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="h-display mt-3 text-4xl sm:text-5xl"><span className="metal">{title}</span></h1>
        {sub && <p className="mx-auto mt-4 max-w-2xl text-silver-400">{sub}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

const TONES: Record<string, string> = {
  ACTIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  PAID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  RESOLVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  APPROVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  EXPIRING: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  PENDING: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  PENDING_PAYMENT: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  AWAITING_VERIFICATION: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  AWAITING_CUSTOMER: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  OPEN: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  NEW: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  IN_PROGRESS: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  CONTACTED: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  EXPIRED: "border-crimson/40 bg-crimson/10 text-crimson-300",
  FAILED: "border-crimson/40 bg-crimson/10 text-crimson-300",
  REJECTED: "border-crimson/40 bg-crimson/10 text-crimson-300",
  DECLINED: "border-crimson/40 bg-crimson/10 text-crimson-300",
  SUSPENDED: "border-crimson/40 bg-crimson/10 text-crimson-300",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("badge", TONES[status] ?? "border-white/15 bg-white/5 text-silver-200")}>{status.replace(/_/g, " ")}</span>;
}

export function SampleBadge() {
  return <span className="badge border-amber-400/40 bg-amber-400/10 text-amber-300" title="Development sample data — replace via the admin dashboard">Sample data</span>;
}

export function StatCard({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className={cn("glass p-5", href && "glass-hover")}>
      <p className="text-xs font-semibold uppercase tracking-wider text-silver-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-black">{value}</p>
      {hint && <p className="mt-1 text-xs text-silver-600">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col items-center p-10 text-center">
      <div className="mb-3 h-10 w-10 rounded-full border border-crimson/40 bg-crimson/10" aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-silver-400">{children}</div>}
    </div>
  );
}

export function Field({ label, name, error, children, hint }: { label: string; name?: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-silver-600">{hint}</p>}
      {error && <p className="mt-1 text-xs text-crimson-300" role="alert">{error}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) {
  const t = { info: "border-sky-400/30 bg-sky-400/5 text-sky-200", warn: "border-amber-400/30 bg-amber-400/5 text-amber-200", error: "border-crimson/40 bg-crimson/10 text-crimson-200", ok: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200" }[tone];
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", t)}>{children}</div>;
}
