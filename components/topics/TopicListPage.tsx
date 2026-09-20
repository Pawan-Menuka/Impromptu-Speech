import Link from "next/link";
import type { TopicRow } from "@/lib/topics";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdHtml } from "@/lib/jsonld";
import { PracticeCta } from "@/components/topics/PracticeCta";

// Plain, functional markup reusing the app's existing design tokens
// (font-display, eyebrow, btn-accent, glass, text-muted/faint) — no new
// visual design. See SEO_PLAN.md Phase 6: the user reskins this later.

type Crumb = { name: string; path: string };

export function TopicListPage({
  eyebrow,
  heading,
  intro,
  example,
  topics,
  breadcrumbs,
  relatedLinks,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
  example?: { prompt: string; body: string };
  topics: TopicRow[];
  breadcrumbs: Crumb[];
  relatedLinks: { label: string; href: string }[];
}) {
  const itemListName = `${heading} — topic list`;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(itemListJsonLd(itemListName, topics.map((t) => ({ name: t.text })))),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-faint">
        {breadcrumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="text-muted">{c.name}</span>
            ) : (
              <Link href={c.path} className="hover:text-fg">
                {c.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1 font-display text-4xl font-light tracking-tight">{heading}</h1>
      <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.6] text-muted">{intro}</p>

      {example && (
        <div className="glass mt-6 rounded-[18px] p-5">
          <p className="eyebrow">How to answer one</p>
          <p className="mt-2 font-display text-lg font-light italic text-fg">“{example.prompt}”</p>
          <p className="mt-2 text-sm leading-[1.6] text-muted">{example.body}</p>
        </div>
      )}

      <PracticeCta className="btn-accent mt-8 inline-flex h-12 items-center gap-2 rounded-full px-8 font-label text-xs uppercase tracking-[0.2em]">
        Practice one now
      </PracticeCta>

      <ol className="mt-10 flex flex-col gap-1 border-t border-white/[.08]">
        {topics.map((t, i) => (
          <li
            key={t.id}
            className="flex items-baseline gap-3 border-b border-white/[.08] py-3 text-[15px] leading-[1.5] text-fg/90"
          >
            <span className="font-label text-xs tabular-nums text-faint">{i + 1}</span>
            <span>{t.text}</span>
          </li>
        ))}
      </ol>

      {relatedLinks.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-3">
          {relatedLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="btn-ghost rounded-full px-5 py-2 font-label text-xs uppercase tracking-[0.15em]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
