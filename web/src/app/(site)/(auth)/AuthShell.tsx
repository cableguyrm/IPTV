export function AuthShell({ title, sub, children, wide }: { title: string; sub?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className="relative overflow-hidden py-16">
      <div className="bg-grid absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden="true" />
      <div className={`container-x relative mx-auto ${wide ? "max-w-3xl" : "max-w-md"}`}>
        <div className="glass p-8 shadow-glow">
          <h1 className="h-display text-2xl"><span className="metal">{title}</span></h1>
          {sub && <p className="mt-2 text-sm text-silver-400">{sub}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
