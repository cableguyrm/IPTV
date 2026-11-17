"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./AppShell";

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const root = items[0]?.href;
  return (
    <nav aria-label="Section" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-40">
      {items.map((i) => {
        const active = i.href === root ? path === root : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition",
              active ? "bg-crimson/15 text-white shadow-[inset_2px_0_0_#DC143C]" : "text-silver-400 hover:bg-white/5 hover:text-white")}>
            {i.label}
            {!!i.badge && <span className="rounded-full bg-crimson px-2 text-[10px] font-bold text-white">{i.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
