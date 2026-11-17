export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="bg-grid absolute inset-0 animate-gridMove opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] [transform:perspective(900px)_rotateX(55deg)_translateY(10%)_scale(1.6)]" />
      <div className="absolute left-1/2 top-[-10%] h-[36rem] w-[60rem] -translate-x-1/2 animate-pulseGlow rounded-full bg-crimson/25 blur-[140px]" />
      <div className="absolute bottom-0 right-[-10%] h-80 w-80 rounded-full bg-silver/10 blur-[120px]" />
      <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hb-l" x1="0" x2="1"><stop offset="0" stopColor="#DC143C" stopOpacity="0" /><stop offset=".5" stopColor="#DC143C" /><stop offset="1" stopColor="#DC143C" stopOpacity="0" /></linearGradient>
        </defs>
        {[120, 220, 480, 560].map((y, i) => (
          <path key={y} d={`M-50 ${y} C 300 ${y - 80}, 900 ${y + 80}, 1250 ${y - 20}`} stroke="url(#hb-l)" strokeWidth={i % 2 ? 1 : 1.5} fill="none">
            <animate attributeName="stroke-dasharray" values="0 1600;1600 0" dur={`${6 + i * 2}s`} repeatCount="indefinite" />
          </path>
        ))}
        {Array.from({ length: 28 }).map((_, i) => (
          <circle key={i} cx={(i * 137) % 1200} cy={(i * 241) % 700} r={i % 4 === 0 ? 2 : 1} fill={i % 3 ? "#E5E7EB" : "#DC143C"}>
            <animate attributeName="opacity" values="0.1;0.9;0.1" dur={`${3 + (i % 5)}s`} begin={`${i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-jet to-transparent" />
    </div>
  );
}
