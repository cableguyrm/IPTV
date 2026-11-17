import { PageHero } from "./ui";
import { getSettings } from "@/lib/settings";

export async function Legal({ title, updated, sections }: { title: string; updated: string; sections: [string, React.ReactNode][] }) {
  const s = await getSettings();
  return (
    <>
      <PageHero eyebrow="Legal" title={title} sub={`Last updated ${updated}`} />
      <article className="container-x prose-x max-w-3xl py-14">
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">Template text — have it reviewed by qualified legal counsel for the UAE, the Philippines and every market you sell into before going live.</p>
        {sections.map(([h, body]) => (<section key={h}><h2>{h}</h2>{body}</section>))}
        <h2>Contact</h2>
        <p>{s.site.brandName} · {s.contact.address} · <a className="link" href={`mailto:${s.contact.email}`}>{s.contact.email}</a></p>
      </article>
    </>
  );
}
