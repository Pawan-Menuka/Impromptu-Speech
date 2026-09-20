import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { DIFFICULTY_LEVELS, getIndexableCategories } from "@/lib/topicPages";

// List only public, indexable, canonical URLs — never sign-in or private pages.
// Imports the same helpers the /topics pages use, so this can't drift out of
// sync with which routes actually exist (SEO Phase 6).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/topics`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/topic-generator`, changeFrequency: "monthly", priority: 0.8 },
    ...DIFFICULTY_LEVELS.map((level) => ({
      url: `${SITE_URL}/topics/${level}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...getIndexableCategories().map(({ category }) => ({
      url: `${SITE_URL}/topics/category/${category}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Phase 7 adds /guides pages.
  ];
}
