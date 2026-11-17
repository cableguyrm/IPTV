/** Original illustrative UI composition (not real data). */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-float" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-crimson/20 blur-3xl" />
      <div className="glass relative overflow-hidden rounded-3xl border-white/15 p-5 shadow-glow-lg">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-crimson" /><span className="h-2.5 w-2.5 rounded-full bg-silver-600" /><span className="h-2.5 w-2.5 rounded-full bg-silver-600" /></div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-silver-600">Reseller console</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {["Credits", "Active", "Renewals"].map((l, i) => (
            <div key={l} className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-[9px] uppercase tracking-wider text-silver-600">{l}</p>
              <div className="mt-2 h-3 rounded bg-gradient-to-r from-white/70 to-white/10" style={{ width: `${70 - i * 15}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
          <svg viewBox="0 0 300 90" className="h-24 w-full">
            <defs><linearGradient id="hv-a" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#DC143C" stopOpacity=".5" /><stop offset="1" stopColor="#DC143C" stopOpacity="0" /></linearGradient></defs>
            <path d="M0 70 L30 60 L60 64 L90 45 L120 50 L150 30 L180 38 L210 22 L240 28 L270 12 L300 18 L300 90 L0 90Z" fill="url(#hv-a)" />
            <path d="M0 70 L30 60 L60 64 L90 45 L120 50 L150 30 L180 38 L210 22 L240 28 L270 12 L300 18" fill="none" stroke="#F0375C" strokeWidth="2" />
          </svg>
        </div>
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2"><span className="h-6 w-6 rounded-md bg-gradient-to-br from-crimson to-charcoal" /><span className="h-2 w-24 rounded bg-white/30" /></div>
              <span className={`h-4 w-14 rounded-full ${i === 1 ? "bg-amber-400/30" : "bg-emerald-400/30"}`} />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-crimson/10 to-transparent" />
      </div>
      <div className="glass absolute -bottom-6 -left-6 hidden rounded-2xl p-3 sm:block">
        <p className="text-[9px] uppercase tracking-wider text-silver-600">Multi-currency</p>
        <p className="font-display text-sm font-bold">AED · PHP · USD</p>
      </div>
    </div>
  );
}
