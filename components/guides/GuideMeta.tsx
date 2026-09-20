import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";
import { breadcrumbJsonLd, jsonLdHtml } from "@/lib/jsonld";

/**
 * Renders the breadcrumb nav, eyebrow/byline/date, and Article + BreadcrumbList
 * JSON-LD for one guide. Placed at the top of each app/guides/<slug>/page.mdx,
 * before the markdown `# Title` (which is the page's real, visible <h1>).
 */
export function GuideMeta({ slug }: { slug: string }) {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    url: `${SITE_URL}/guides/${guide.slug}`,
    ...(guide.author ? { author: { "@type": "Person", name: guide.author } } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Guides", path: "/guides" },
              { name: guide.title, path: `/guides/${guide.slug}` },
            ])
          ),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(articleJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-faint">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span aria-hidden>›</span>
        <Link href="/guides" className="hover:text-fg">
          Guides
        </Link>
        <span aria-hidden>›</span>
        <span className="text-muted">{guide.title}</span>
      </nav>

      <p className="eyebrow">Guide{guide.author ? ` · ${guide.author}` : ""}</p>
      <p className="mt-1 font-label text-xs text-faint">
        Published {guide.datePublished}
        {guide.dateModified !== guide.datePublished ? ` · updated ${guide.dateModified}` : ""}
      </p>
    </>
  );
}
