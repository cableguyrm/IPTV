"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrackForm() {
  const r = useRouter();
  const [n, setN] = useState(""); const [t, setT] = useState("");
  return (
    <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (/^\d+$/.test(n) && t) r.push(`/support/ticket/${n}?t=${encodeURIComponent(t)}`); }}>
      <input className="input" placeholder="Ticket number, e.g. 12" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} aria-label="Ticket number" required />
      <input className="input" placeholder="Access code" value={t} onChange={(e) => setT(e.target.value.trim())} aria-label="Access code" required />
      <button className="btn-ghost w-full">Track status</button>
    </form>
  );
}
