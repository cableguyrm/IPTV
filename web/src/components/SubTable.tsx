import Link from "next/link";
import { StatusBadge, SampleBadge } from "./ui";
import { formatDate, daysUntil, subDisplayStatus } from "@/lib/utils";
import type { Subscription } from "@/db/schema";

type Row = { s: Subscription; customerName: string; customerWhatsapp: string | null; panelName: string; resellerName?: string };

export function SubTable({ rows, base = "/dashboard/subscriptions", showReseller = false }: { rows: Row[]; base?: string; showReseller?: boolean }) {
  return (
    <div className="glass overflow-x-auto">
      <table className="table-x min-w-[860px]">
        <thead><tr><th>Customer</th>{showReseller && <th>Reseller</th>}<th>Panel / plan</th><th>Device</th><th>Status</th><th>Activated</th><th>Expires</th><th /></tr></thead>
        <tbody>
          {rows.map(({ s, customerName, customerWhatsapp, panelName, resellerName }) => {
            const d = daysUntil(s.expiresAt);
            return (
              <tr key={s.id}>
                <td><div className="font-semibold">{customerName}</div><div className="text-xs text-silver-600">{customerWhatsapp ?? ""}</div></td>
                {showReseller && <td className="text-silver-400">{resellerName}</td>}
                <td><div>{panelName}</div><div className="text-xs text-silver-600">{s.planName} · {s.creditCost} cr {s.isSample && "· sample"}</div></td>
                <td className="text-silver-400">{s.deviceType ?? "—"}</td>
                <td><div className="flex flex-col items-start gap-1"><StatusBadge status={subDisplayStatus(s)} />{s.provisioning === "MANUAL" && s.status === "PENDING" && <span className="text-[10px] text-silver-600">awaiting admin</span>}</div></td>
                <td className="text-silver-400">{formatDate(s.activatedAt)}</td>
                <td>{formatDate(s.expiresAt)}{d !== null && s.status === "ACTIVE" && <div className={`text-xs ${d <= 7 ? "text-amber-300" : "text-silver-600"}`}>{d}d left</div>}</td>
                <td><Link href={`${base}/${s.id}`} className="btn-ghost btn-sm">Open</Link></td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={showReseller ? 8 : 7} className="py-10 text-center text-silver-400">No subscriptions found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
export { SampleBadge };
