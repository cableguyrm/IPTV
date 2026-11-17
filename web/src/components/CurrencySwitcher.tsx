"use client";
import { useRouter } from "next/navigation";

export function CurrencySwitcher({ current }: { current: string }) {
  const router = useRouter();
  return (
    <label className="relative">
      <span className="sr-only">Display currency</span>
      <select
        value={current}
        onChange={(e) => {
          document.cookie = `currency=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
        className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-silver-200 outline-none hover:border-crimson/60"
      >
        <option value="USD">USD $</option>
        <option value="AED">AED د.إ</option>
        <option value="PHP">PHP ₱</option>
      </select>
    </label>
  );
}
