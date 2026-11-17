import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";
const CHUNK = randomBytes(1_000_000); // reused random payload (incompressible)

export async function GET(req: Request) {
  const bytes = Math.min(Math.max(Number(new URL(req.url).searchParams.get("bytes")) || 0, 0), 10_000_000);
  const body = new Uint8Array(bytes);
  for (let o = 0; o < bytes; o += CHUNK.length) body.set(CHUNK.subarray(0, Math.min(CHUNK.length, bytes - o)), o);
  return new Response(body, { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store", "Content-Encoding": "identity" } });
}

export async function POST(req: Request) {
  // Read and discard (max ~5MB) — nothing is stored or logged.
  const reader = req.body?.getReader(); let total = 0;
  if (reader) for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > 5_000_000) { await reader.cancel(); break; } }
  return Response.json({ received: total }, { headers: { "Cache-Control": "no-store" } });
}
