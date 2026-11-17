import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { M3uTool, ExpiryCalc, ProfitCalc, CreditCalc, SpeedTest, DeviceGuide } from "./Tools";
import { getActivePanels } from "@/lib/queries";

export const metadata: Metadata = { title: "IPTV Tools", description: "M3U & Xtream parser, expiration, profit and credit calculators, speed test and device compatibility guide." };
export const dynamic = "force-dynamic";

const TOOLS = [["m3u", "M3U / Xtream parser"], ["expiry", "Expiration calculator"], ["profit", "Profit calculator"], ["credits", "Credit usage"], ["speed", "Speed test"], ["devices", "Device guide"]];

export default async function ToolsPage() {
  const panels = (await getActivePanels()).map((p) => ({ name: p.name, creditsPerMonth: p.creditsPerMonth, priceCents: p.startingPriceCents }));
  return (
    <>
      <PageHero eyebrow="Toolkit" title="IPTV Tools" sub="Practical utilities for resellers. Everything that touches credentials runs locally in your browser and is never sent to our servers.">
        <nav className="flex flex-wrap justify-center gap-2" aria-label="Tools">{TOOLS.map(([id, l]) => <a key={id} href={`#${id}`} className="btn-ghost btn-sm">{l}</a>)}</nav>
      </PageHero>
      <div className="container-x space-y-10 py-14">
        <M3uTool />
        <div className="grid gap-10 lg:grid-cols-2"><ExpiryCalc /><CreditCalc panels={panels} /></div>
        <ProfitCalc />
        <SpeedTest />
        <DeviceGuide />
      </div>
    </>
  );
}
