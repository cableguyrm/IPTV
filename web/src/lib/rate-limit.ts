import { headers } from "next/headers";

// Simple fixed-window in-memory limiter. For multi-instance deployments, back this with Redis.
const buckets = new Map<string, { count: number; reset: number }>();

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const ip = await clientIp();
  const k = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.reset < now) {
    buckets.set(k, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [kk, v] of buckets) if (v.reset < now) buckets.delete(kk);
    return true;
  }
  b.count++;
  return b.count <= limit;
}
