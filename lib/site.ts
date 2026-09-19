// Single source of truth for the public URL and brand strings used in SEO
// metadata, robots.txt, the sitemap and JSON-LD.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://impromptu.pawanmenuka.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Impromptu";
export const SITE_TITLE = "Impromptu — AI Impromptu Speech Practice & Feedback";
export const SITE_DESCRIPTION =
  "Practice impromptu speaking: get a random topic, record a 1–2 minute speech, " +
  "and get AI feedback on pace, filler words, structure and vocabulary.";
