import type { Metadata } from "next";
import { PageHero, EmptyState } from "@/components/ui";
import { getFaqs } from "@/lib/queries";

export const metadata: Metadata = { title: "FAQs", description: "Frequently asked questions about reseller accounts, credits, payments, trials and support." };
export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = [...new Set(faqs.map((f) => f.category))];
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero eyebrow="FAQ" title="Frequently asked questions" />
      <section className="container-x max-w-3xl space-y-10 py-14">
        {!faqs.length && <EmptyState title="No FAQs published yet" />}
        {groups.map((g) => (
          <div key={g}>
            <h2 className="eyebrow mb-4">{g}</h2>
            <div className="space-y-3">
              {faqs.filter((f) => f.category === g).map((f) => (
                <details key={f.id} className="glass p-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">{f.question}<span className="chev text-xl text-crimson transition">+</span></summary>
                  <p className="mt-3 whitespace-pre-line text-sm text-silver-400">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
