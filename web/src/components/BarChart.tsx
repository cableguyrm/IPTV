/** Minimal accessible bar chart (single series). Values are shown as text for screen readers and hover. */
export function BarChart({ data, label, format = (n: number) => String(n) }: { data: { k: string; v: number }[]; label: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  if (!data.length) return <p className="py-8 text-center text-sm text-silver-400">No data yet.</p>;
  return (
    <figure>
      <div className="flex h-48 items-end gap-2" role="img" aria-label={`${label}: ${data.map((d) => `${d.k} ${format(d.v)}`).join(", ")}`}>
        {data.map((d) => (
          <div key={d.k} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-silver-400 opacity-0 transition group-hover:opacity-100">{format(d.v)}</span>
            <div className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-crimson-600 to-crimson-400 transition group-hover:shadow-glow" style={{ height: `${Math.max(2, (d.v / max) * 100)}%` }} />
            <span className="text-[10px] text-silver-600">{d.k.slice(5)}/{d.k.slice(2, 4)}</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
