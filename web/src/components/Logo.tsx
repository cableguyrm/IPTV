export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lm-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF6B88" /><stop offset="1" stopColor="#B80F31" /></linearGradient>
        <linearGradient id="lm-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#8E939C" /></linearGradient>
      </defs>
      <rect x="3" y="9" width="42" height="28" rx="6" fill="none" stroke="url(#lm-s)" strokeWidth="2.5" />
      <path d="M20 16.5v13l11-6.5z" fill="url(#lm-r)" />
      <path d="M16 41h16" stroke="url(#lm-s)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 4l7 5 7-5" stroke="url(#lm-r)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ brand, logoUrl }: { brand: string; logoUrl?: string }) {
  const [first, ...rest] = brand.split(" ");
  return (
    <span className="flex items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
      ) : (
        <LogoMark />
      )}
      <span className="font-display text-lg font-black leading-none tracking-tight">
        <span className="red-text">{first}</span> <span className="metal">{rest.join(" ")}</span>
      </span>
    </span>
  );
}
