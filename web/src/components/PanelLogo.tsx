import type { Panel } from "@/db/schema";

export function PanelLogo({ panel, size = 48 }: { panel: Pick<Panel, "name" | "logoUrl" | "accentColor">; size?: number }) {
  if (panel.logoUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={panel.logoUrl} alt={`${panel.name} logo`} width={size} height={size} className="rounded-xl object-contain" />;
  const initials = panel.name.replace(/sample/i, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const c = panel.accentColor ?? "#DC143C";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`${panel.name} logo`}>
      <defs><linearGradient id={`pl-${initials}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor="#171717" /></linearGradient></defs>
      <rect width="48" height="48" rx="12" fill={`url(#pl-${initials})`} />
      <rect x="1" y="1" width="46" height="46" rx="11" fill="none" stroke="rgba(255,255,255,.18)" />
      <text x="24" y="30" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="16" fill="#fff">{initials}</text>
    </svg>
  );
}
