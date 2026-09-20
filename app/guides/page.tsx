import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { breadcrumbJsonLd, jsonLdHtml } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Practical guides on impromptu speaking — how to structure an answer, cut filler words, pace yourself, " +
    "and think on your feet under time pressure.",
  alternates: { canonical: "/guides" },
  openGraph: { url: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }])),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-faint">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span aria-hidden>›</span>
        <span className="text-muted">Guides</span>
      </nav>

      <p className="eyebrow">Learn</p>
      <h1 className="mt-1 font-display text-4xl font-light tracking-tight">Guides</h1>
      <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.6] text-muted">
        Practical, specific advice on impromptu speaking — structure, filler words, pace, and thinking on your
        feet — grounded in how the practice tool actually scores a speech.
      </p>

      <ol className="mt-10 flex flex-col gap-1 border-t border-white/[.08]">
        {GUIDES.map((g) => (
          <li key={g.slug} className="border-b border-white/[.08] py-5">
            <Link href={`/guides/${g.slug}`} className="font-display text-xl font-light text-fg hover:text-blush">
              {g.title}
            </Link>
            <p className="mt-1.5 text-sm leading-[1.6] text-muted">{g.description}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
