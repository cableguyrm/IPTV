import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { getActivePanels } from "@/lib/queries";
import { TrialForm } from "./TrialForm";

export const metadata: Metadata = { title: "Request a Trial", description: "Request a short trial line on panels that offer trials." };
export const dynamic = "force-dynamic";

export default async function Trial({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const [{ panel }, panels] = await Promise.all([searchParams, getActivePanels()]);
  const options = panels.filter((p) => p.trialAvailable).map((p) => ({ slug: p.slug, name: p.name, hours: p.trialHours }));
  return (
    <>
      <PageHero eyebrow="Trial" title="Request a trial" sub="Trials are approved manually by our team for panels that offer them." />
      <section className="container-x max-w-3xl py-12"><TrialForm panels={options} defaultPanel={panel} /></section>
    </>
  );
}
