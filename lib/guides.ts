// Manually maintained registry of published guides — used by the /guides
// index page, app/sitemap.ts, and each guide's Article JSON-LD. There's no
// filesystem scan: add an entry here whenever a new app/guides/<slug>/page.mdx
// ships (same "invariant" pattern as data/topics.json + lib/topics.ts).
//
// `author` is deliberately optional and unset for now — see SEO_PLAN.md
// Part F's open decision on a public author name. Add it here (and to each
// guide's Article JSON-LD) once that's settled, rather than publishing a
// guessed name.
export type Guide = {
  slug: string;
  title: string;
  description: string;
  datePublished: string; // ISO date, e.g. "2026-09-20"
  dateModified: string;
  author?: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "how-to-give-an-impromptu-speech",
    title: "How to Give an Impromptu Speech (Step by Step)",
    description:
      "A step-by-step method for giving an impromptu speech under time pressure — thinking time, a simple " +
      "structure, and how to close strong, with practice steps to get better at it.",
    datePublished: "2026-09-20",
    dateModified: "2026-09-20",
  },
];
