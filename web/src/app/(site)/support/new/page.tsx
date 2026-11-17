import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { NewTicketForm } from "@/components/NewTicketForm";

export const metadata: Metadata = { title: "Open a Support Ticket" };

export default async function NewTicket({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, user] = await Promise.all([searchParams, getCurrentUser()]);
  return (
    <>
      <PageHero eyebrow="Support" title="Open a ticket" sub="Describe the issue and attach screenshots if helpful. Never include passwords or full streaming URLs." />
      <section className="container-x max-w-3xl py-12"><NewTicketForm guest={!user} defaultCategory={category} /></section>
    </>
  );
}
