import type { Metadata } from "next";
import { CinematicLanding } from "@/components/landing/CinematicLanding";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  // Don't add `openGraph` here: metadata merges shallowly, so it would replace
  // the root layout's whole openGraph object.
  alternates: { canonical: "/" },
};

// Structured data (JSON-LD) telling search engines and AI answer engines what
// the site is. `author` and pricing `offers` are deliberately omitted — see
// SEO_PLAN.md Phase 3 "open decisions" — add them once those are settled
// rather than publishing a guess. Never add `aggregateRating` without real
// reviews; Google treats fabricated ratings as a manual-penalty offense.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "Impromptu Speech Trainer",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Impromptu Speech Trainer",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web browser",
      featureList: [
        "Random impromptu speech topics by difficulty",
        "Timed 1–2 minute speech recording",
        "AI scoring of content and delivery (0–100)",
        "Filler word counting and pace (words per minute)",
        "Progress tracking over time",
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, server-generated JSON — no user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <CinematicLanding />
    </>
  );
}
